param([string]$Python = 'python')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$checkout = Join-Path $projectRoot 'vendor/Anime2.5DRig'
$environment = Join-Path $projectRoot '.venv-anime25d'
$expectedCommit = '7ddbd9943ea3152561b3dc8348fd752c850f3e95'
Get-Command git -ErrorAction Stop | Out-Null
Get-Command $Python -ErrorAction Stop | Out-Null
if (-not (Test-Path -LiteralPath $checkout)) {
    New-Item -ItemType Directory -Path (Split-Path -Parent $checkout) -Force | Out-Null
    & git clone --no-checkout 'https://github.com/852wa/Anime2.5DRig.git' $checkout
    if ($LASTEXITCODE -ne 0) {throw '公式ビューアの取得に失敗しました。'}
    & git -C $checkout checkout $expectedCommit
    if ($LASTEXITCODE -ne 0) {throw '固定版への切り替えに失敗しました。'}
}
$actualCommit = & git -C $checkout rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $actualCommit -ne $expectedCommit) {throw '既存の版が異なるため変更しません。'}
if (-not (Test-Path -LiteralPath $environment)) {
    & $Python -m venv $environment
    if ($LASTEXITCODE -ne 0) {throw '専用環境の作成に失敗しました。'}
}
$pythonExe = Join-Path $environment 'Scripts/python.exe'
foreach ($entry in @(@('app.js','motion-v5.json'),@('face-features.js','face-tracking-v5.json'))) {
    & $pythonExe (Join-Path $PSScriptRoot 'apply-rig-tuning.py') --source (Join-Path $checkout ('lib/'+$entry[0])) --manifest (Join-Path $projectRoot ('patches/'+$entry[1]))
    if ($LASTEXITCODE -ne 0) {throw '既存の変更を保持して停止します。新しいフォルダで準備してください。'}
}
Copy-Item -LiteralPath (Join-Path $projectRoot 'lib/avatar-occlusion.js') -Destination (Join-Path $checkout 'lib/avatar-occlusion.js')
Copy-Item -LiteralPath (Join-Path $projectRoot 'lib/avatar-profile.js') -Destination (Join-Path $checkout 'lib/avatar-profile.js')
$index = Join-Path $checkout 'index.html'
$html = [IO.File]::ReadAllText($index)
if (-not $html.Contains('src="lib/avatar-occlusion.js"')) {
    $marker = '<script src="lib/app.js"></script>'
    if (-not $html.Contains($marker)) {throw '公式HTMLの構造が想定と異なります。'}
    $replacement = '<script src="lib/avatar-occlusion.js"></script><script src="lib/avatar-profile.js"></script>'+ $marker
    [IO.File]::WriteAllText($index,$html.Replace($marker,$replacement),[Text.UTF8Encoding]::new($false))
}
$avatarTarget = Join-Path $checkout 'avatars'
New-Item -ItemType Directory -Path $avatarTarget -Force | Out-Null
Get-ChildItem -LiteralPath (Join-Path $projectRoot 'avatars') -File | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $avatarTarget $_.Name)
}
Write-Output '準備完了。start-anime25d.ps1で起動し、正面を記録してください。'
