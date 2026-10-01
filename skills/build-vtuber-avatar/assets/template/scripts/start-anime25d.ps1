param([int]$Port = 8000)

$ErrorActionPreference = 'Stop'
if ($Port -lt 1 -or $Port -gt 65535) { throw 'Portは1〜65535で指定してください。' }
$projectRoot = Split-Path -Parent $PSScriptRoot
$checkout = Join-Path $projectRoot 'vendor/Anime2.5DRig'
$pythonExe = Join-Path $projectRoot '.venv-anime25d/Scripts/python.exe'
$server = Join-Path $checkout 'obs_server.py'
if (-not (Test-Path -LiteralPath $pythonExe) -or -not (Test-Path -LiteralPath $server)) {
    throw '先にsetup-anime25d.ps1を実行してください。'
}
$actualCommit = & git -C $checkout rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $actualCommit -ne '7ddbd9943ea3152561b3dc8348fd752c850f3e95') {
    throw 'Anime2.5DRigのバージョンが想定と異なります。'
}
# 公式サーバーは127.0.0.1にだけ待ち受ける。カメラの自動起動はしない。
& $pythonExe $server --port $Port --open-browser
if ($LASTEXITCODE -ne 0) { throw 'Anime2.5DRigの起動に失敗しました。' }
