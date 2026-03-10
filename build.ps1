# Gera o instalador .exe para distribuição
Set-Location $PSScriptRoot

$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$vsPath = & $vswhere -latest -property installationPath
$vcvarsall = "$vsPath\VC\Auxiliary\Build\vcvarsall.bat"

if (-not (Test-Path $vcvarsall)) {
    Write-Error "vcvarsall.bat não encontrado. Instale 'Desktop development with C++' no Visual Studio Installer."
    exit 1
}

$originalPath = $env:PATH

$envFile = [System.IO.Path]::GetTempFileName()
cmd.exe /c "`"$vcvarsall`" x64 > nul 2>&1 && set" | Out-File $envFile -Encoding ASCII
Get-Content $envFile | ForEach-Object {
    if ($_ -match "^([^=]+)=(.*)$") {
        [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
    }
}
Remove-Item $envFile -ErrorAction SilentlyContinue

$env:PATH = "$env:PATH;$originalPath"

$rustupBin = "$env:USERPROFILE\.rustup\toolchains\stable-x86_64-pc-windows-msvc\bin"
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    $env:PATH = "$rustupBin;$env:PATH"
}

Write-Host "Ambiente MSVC configurado" -ForegroundColor Green

cargo --version
& ".\node_modules\.bin\tauri.ps1" build

Write-Host ""
Write-Host "Instalador em: src-tauri\target\release\bundle\nsis\" -ForegroundColor Green
