# Diagnóstico do ambiente de compilação Rust/MSVC
Set-Location $PSScriptRoot

Write-Host "=== DIAGNÓSTICO ===" -ForegroundColor Cyan

# 1. Verifica Visual Studio
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$vsPath = & $vswhere -latest -property installationPath
Write-Host "VS Path: $vsPath"

# 2. Verifica vcvarsall.bat
$vcvarsall = "$vsPath\VC\Auxiliary\Build\vcvarsall.bat"
Write-Host "vcvarsall.bat existe: $(Test-Path $vcvarsall)"

# 3. Roda vcvarsall e captura LIB
$envFile = [System.IO.Path]::GetTempFileName()
cmd.exe /c "`"$vcvarsall`" x64 > nul 2>&1 && set" | Out-File $envFile -Encoding ASCII
$vsEnv = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match "^([^=]+)=(.*)$") {
        $vsEnv[$Matches[1]] = $Matches[2]
    }
}
Remove-Item $envFile

Write-Host ""
Write-Host "=== LIB (após vcvarsall) ===" -ForegroundColor Cyan
$lib = $vsEnv["LIB"]
if ($lib) {
    $lib.Split(";") | Where-Object { $_ } | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "  LIB está VAZIA - vcvarsall não configurou o Windows SDK!" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== kernel32.lib existe? ===" -ForegroundColor Cyan
if ($lib) {
    $found = $false
    $lib.Split(";") | Where-Object { $_ } | ForEach-Object {
        $candidate = Join-Path $_ "kernel32.lib"
        if (Test-Path $candidate) {
            Write-Host "  ENCONTRADO: $candidate" -ForegroundColor Green
            $found = $true
        }
    }
    if (-not $found) {
        Write-Host "  NÃO ENCONTRADO em nenhum caminho do LIB" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Windows Kits (SDK) ===" -ForegroundColor Cyan
$kitsPath = "${env:ProgramFiles(x86)}\Windows Kits\10\Lib"
if (Test-Path $kitsPath) {
    Write-Host "  Encontrado: $kitsPath" -ForegroundColor Green
    Get-ChildItem $kitsPath | ForEach-Object { Write-Host "  - $($_.Name)" }
} else {
    Write-Host "  NÃO ENCONTRADO: $kitsPath" -ForegroundColor Red
    Write-Host "  → Windows SDK provavelmente não está instalado!" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== SOLUÇÃO SUGERIDA ===" -ForegroundColor Cyan
Write-Host "Abra o Visual Studio Installer e verifique se o workload"
Write-Host "'Desenvolvimento para desktop com C++' está instalado."
Write-Host "Ele inclui o Windows SDK necessário para compilar com Rust/MSVC."
