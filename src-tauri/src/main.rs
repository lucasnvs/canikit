// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
use tauri_plugin_shell::ShellExt;

#[derive(Clone, Serialize)]
struct DlProgress {
    id: String,
    percent: f32,
    eta: String,
    speed: String,
}

#[derive(Clone, Serialize)]
struct DlDone {
    id: String,
}

#[derive(Clone, Serialize)]
struct DlError {
    id: String,
    error: String,
}

/// Verifica se yt-dlp está disponível no PATH.
fn find_ytdlp() -> Option<String> {
    let candidates = ["yt-dlp", "yt-dlp.exe"];
    for name in candidates {
        if which_simple(name) {
            return Some(name.to_string());
        }
    }
    None
}

fn which_simple(cmd: &str) -> bool {
    std::process::Command::new(if cfg!(windows) { "where" } else { "which" })
        .arg(cmd)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[tauri::command]
async fn start_download(
    app: tauri::AppHandle,
    id: String,
    url: String,
    format: String,
    quality: String,
    output_dir: String,
) -> Result<(), String> {
    let ytdlp = find_ytdlp().ok_or_else(|| {
        "yt-dlp não encontrado. Instale com: winget install yt-dlp".to_string()
    })?;

    // Build yt-dlp arguments
    let progress_template = "%(progress._percent_str)s|%(progress._eta_str)s|%(progress._speed_str)s";

    let mut args: Vec<String> = vec![
        "--newline".into(),
        "--progress-template".into(),
        progress_template.into(),
        "-o".into(),
        format!("{}/%(title)s.%(ext)s", output_dir.trim_end_matches(['/', '\\'])),
    ];

    if quality == "audio" || format == "mp3" || format == "wav" {
        args.push("-x".into());
        args.push("--audio-format".into());
        args.push(format.clone());
    } else {
        let height = match quality.as_str() {
            "best" => "2160".to_string(),
            q => q.to_string(),
        };
        args.push("-f".into());
        args.push(format!(
            "bestvideo[height<={}]+bestaudio/best[height<={}]",
            height, height
        ));
        args.push("--merge-output-format".into());
        args.push(format.clone());
    }

    args.push(url.clone());

    let shell = app.shell();
    let (mut rx, _child) = shell
        .command(&ytdlp)
        .args(&args)
        .spawn()
        .map_err(|e| format!("Falha ao iniciar yt-dlp: {e}"))?;

    let app_clone = app.clone();
    let id_clone = id.clone();

    tauri::async_runtime::spawn(async move {
        use tauri_plugin_shell::process::CommandEvent;

        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) | CommandEvent::Stderr(line) => {
                    let text = String::from_utf8_lossy(&line);
                    // Parse progress lines: "  42.0%|00:12|2.30MiB/s"
                    let trimmed = text.trim();
                    let parts: Vec<&str> = trimmed.splitn(3, '|').collect();
                    if parts.len() == 3 {
                        let percent_str = parts[0].trim().trim_end_matches('%');
                        if let Ok(percent) = percent_str.parse::<f32>() {
                            let _ = app_clone.emit(
                                "dl-progress",
                                DlProgress {
                                    id: id_clone.clone(),
                                    percent,
                                    eta: parts[1].trim().to_string(),
                                    speed: parts[2].trim().to_string(),
                                },
                            );
                        }
                    }
                }
                CommandEvent::Terminated(status) => {
                    if status.code == Some(0) {
                        let _ = app_clone.emit("dl-done", DlDone { id: id_clone.clone() });
                    } else {
                        let _ = app_clone.emit(
                            "dl-error",
                            DlError {
                                id: id_clone.clone(),
                                error: format!("yt-dlp saiu com código {:?}", status.code),
                            },
                        );
                    }
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(())
}

#[tauri::command]
fn toggle_overlay(app: tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("overlay") {
        if win.is_visible().unwrap_or(false) {
            let _ = win.hide();
        } else {
            let _ = win.show();
        }
    }
}

/// Returns the Windows work area (usable screen excluding taskbar) in physical pixels.
/// Falls back to (0, 0, 1920, 1080) on non-Windows.
#[tauri::command]
fn get_work_area() -> (i32, i32, i32, i32) {
    #[cfg(target_os = "windows")]
    {
        #[repr(C)]
        #[derive(Default)]
        struct Rect { left: i32, top: i32, right: i32, bottom: i32 }

        extern "system" {
            fn SystemParametersInfoW(
                action: u32, param: u32,
                pv: *mut std::ffi::c_void, ini: u32,
            ) -> i32;
        }

        let mut r = Rect::default();
        unsafe { SystemParametersInfoW(0x0030, 0, &mut r as *mut Rect as _, 0); }
        (r.left, r.top, r.right - r.left, r.bottom - r.top)
    }
    #[cfg(not(target_os = "windows"))]
    { (0, 0, 1920, 1080) }
}

#[tauri::command]
fn get_cursor_pos(app: tauri::AppHandle) -> (f64, f64) {
    if let Some(win) = app.get_webview_window("overlay") {
        if let Ok(pos) = win.cursor_position() {
            return (pos.x, pos.y);
        }
    }
    (0.0, 0.0)
}

#[tauri::command]
fn open_tool_in_main(app: tauri::AppHandle, route: String) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.set_focus();
        let _ = win.emit("navigate-to", route);
    }
}

#[tauri::command]
fn create_postit(app: tauri::AppHandle, label: String) -> Result<(), String> {
    use tauri::{WebviewUrl, WebviewWindowBuilder};

    if let Some(w) = app.get_webview_window(&label) {
        let _ = w.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, &label, WebviewUrl::App("/#/postit".into()))
        .title("")
        .inner_size(300.0, 220.0)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .resizable(false)
        .skip_taskbar(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn pick_download_folder(app: tauri::AppHandle) -> Option<String> {
    use tauri_plugin_dialog::DialogExt;
    app.dialog().file().blocking_pick_folder().map(|p| p.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            start_download, pick_download_folder,
            toggle_overlay, open_tool_in_main, get_cursor_pos,
            get_work_area, create_postit,
        ])
        .on_window_event(|window, event| {
            // Hide main window instead of destroying it so the overlay can reopen it
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .setup(|app| {
            // System tray
            let open_item = MenuItem::with_id(app, "open", "Abrir CaniKit", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_item, &quit_item])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("CaniKit")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Ctrl+Shift+O — toggle overlay visibility
            let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyO);
            app.global_shortcut().on_shortcut(shortcut, move |app, _shortcut, _event| {
                if let Some(win) = app.get_webview_window("overlay") {
                    if win.is_visible().unwrap_or(false) {
                        let _ = win.hide();
                    } else {
                        let _ = win.show();
                        let _ = win.set_focus();
                    }
                }
            })?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
