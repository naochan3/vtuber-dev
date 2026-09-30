param([string]$Python = 'python')

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$vendorRoot = Join-Path $projectRoot 'vendor'
$checkout = Join-Path $vendorRoot 'Anime2.5DRig'
$expectedCommit = '7ddbd9943ea3152561b3dc8348fd752c850f3e95'
$environment = Join-Path $projectRoot '.venv-anime25d'

# 自宅PCで手動実行する。既存環境やシステム設定は書き換えない。
Get-Command git -ErrorAction Stop | Out-Null
Get-Command $Python -ErrorAction Stop | Out-Null
New-Item -ItemType Directory -Path $vendorRoot -Force | Out-Null
if (-not (Test-Path -LiteralPath $checkout)) {
    & git clone --no-checkout 'https://github.com/852wa/Anime2.5DRig.git' $checkout
    if ($LASTEXITCODE -ne 0) { throw 'Anime2.5DRigの取得に失敗しました。' }
    & git -C $checkout checkout $expectedCommit
    if ($LASTEXITCODE -ne 0) { throw '指定バージョンへの切り替えに失敗しました。' }
}
$actualCommit = & git -C $checkout rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $actualCommit -ne $expectedCommit) {
    throw 'vendorのバージョンが異なります。既存フォルダは変更せず、内容を確認してください。'
}
Get-Content -LiteralPath (Join-Path $checkout 'LICENSE')
if (-not (Test-Path -LiteralPath $environment)) {
    & $Python -m venv $environment
    if ($LASTEXITCODE -ne 0) { throw '専用Python環境の作成に失敗しました。' }
}
$pythonExe = Join-Path $environment 'Scripts/python.exe'
& $pythonExe --version
if ($LASTEXITCODE -ne 0) { throw '専用Python環境を起動できません。' }
& $pythonExe (Join-Path $PSScriptRoot 'apply-rig-tuning.py') --source (Join-Path $checkout 'lib/app.js') --manifest (Join-Path $projectRoot 'patches/motion-v2.json')
if ($LASTEXITCODE -ne 0) { throw '動きの調整に失敗しました。元のソースは保管されています。' }
Write-Output '準備完了。start-anime25d.ps1を実行してください。'
