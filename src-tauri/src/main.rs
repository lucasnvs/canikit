// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use tauri::Emitter;
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
async fn pick_download_folder(app: tauri::AppHandle) -> Option<String> {
    use tauri_plugin_dialog::DialogExt;
    app.dialog().file().blocking_pick_folder().map(|p| p.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![start_download, pick_download_folder])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
