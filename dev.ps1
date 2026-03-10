# Inicia o app em modo desenvolvimento
Set-Location $PSScriptRoot

# Localiza o vcvarsall.bat do Visual Studio
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$vsPath = & $vswhere -latest -property installationPath
$vcvarsall = "$vsPath\VC\Auxiliary\Build\vcvarsall.bat"

if (-not (Test-Path $vcvarsall)) {
    Write-Error "vcvarsall.bat não encontrado em: $vcvarsall"
    Write-Host "Instale 'Desktop development with C++' no Visual Studio Installer." -ForegroundColor Red
    exit 1
}

# Salva PATH original e caminhos críticos antes do vcvarsall sobrescrevê-los
$originalPath = $env:PATH
$nodeDir = Split-Path (Get-Command node -ErrorAction SilentlyContinue).Source
$npmDir  = Split-Path (Get-Command npm  -ErrorAction SilentlyContinue).Source

# Captura as variáveis MSVC (LIB, INCLUDE, PATH do VS) via vcvarsall.bat
$envFile = [System.IO.Path]::GetTempFileName()
cmd.exe /c "`"$vcvarsall`" x64 > nul 2>&1 && set" | Out-File $envFile -Encoding ASCII
Get-Content $envFile | ForEach-Object {
    if ($_ -match "^([^=]+)=(.*)$") {
        [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
    }
}
Remove-Item $envFile -ErrorAction SilentlyContinue

# Restaura o PATH original NA FRENTE para garantir que node/npm/cargo sejam encontrados
# (vcvarsall capturado fica no final — apenas adiciona ferramentas MSVC)
$env:PATH = "$originalPath;$env:PATH"

# Garante que os diretórios de node e npm estejam explicitamente no PATH
if ($nodeDir -and $env:PATH -notlike "*$nodeDir*") { $env:PATH = "$nodeDir;$env:PATH" }
if ($npmDir  -and $env:PATH -notlike "*$npmDir*")  { $env:PATH = "$npmDir;$env:PATH"  }


Write-Host "Ambiente MSVC configurado via vcvarsall.bat x64" -ForegroundColor Green

cargo --version

# Inicia o Vite em background (node está disponível no PowerShell, ao contrário do cmd.exe)
Start-Process -FilePath node -ArgumentList ".\node_modules\vite\bin\vite.js" -NoNewWindow
Start-Sleep -Seconds 2

node .\node_modules\@tauri-apps\cli\tauri.js dev
