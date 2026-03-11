# Gera o instalador .exe para distribuição
Set-Location $PSScriptRoot

$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$vsPath = & $vswhere -latest -property installationPath
$vcvarsall = "$vsPath\VC\Auxiliary\Build\vcvarsall.bat"

if (-not (Test-Path $vcvarsall)) {
    Write-Error "vcvarsall.bat não encontrado. Instale 'Desktop development with C++' no Visual Studio Installer."
    exit 1
}

# Salva o PATH original (inclui Node.js) antes do vcvarsall sobrescrevê-lo
$originalPath = $env:PATH
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCmd) { Split-Path $nodeCmd.Source } else { $null }

$envFile = [System.IO.Path]::GetTempFileName()
cmd.exe /c "`"$vcvarsall`" x64 > nul 2>&1 && set" | Out-File $envFile -Encoding ASCII
Get-Content $envFile | ForEach-Object {
    if ($_ -match "^([^=]+)=(.*)$") {
        [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
    }
}
Remove-Item $envFile -ErrorAction SilentlyContinue

# Restaura Node.js e PATH original
$env:PATH = "$env:PATH;$originalPath"
if ($nodePath -and $env:PATH -notlike "*$nodePath*") {
    $env:PATH = "$nodePath;$env:PATH"
}

$rustupBin = "$env:USERPROFILE\.rustup\toolchains\stable-x86_64-pc-windows-msvc\bin"
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    $env:PATH = "$rustupBin;$env:PATH"
}

Write-Host "Ambiente MSVC configurado" -ForegroundColor Green
cargo --version

# Build do frontend (chama binários locais direto para evitar problemas de PATH)
Write-Host "Compilando frontend..." -ForegroundColor Cyan
node ".\node_modules\typescript\bin\tsc"
if ($LASTEXITCODE -ne 0) { Write-Error "TypeScript check falhou"; exit 1 }
node ".\node_modules\vite\bin\vite.js" build
if ($LASTEXITCODE -ne 0) { Write-Error "Vite build falhou"; exit 1 }

& ".\node_modules\.bin\tauri.ps1" build

Write-Host ""
Write-Host "Instalador em: src-tauri\target\release\bundle\nsis\" -ForegroundColor Green
