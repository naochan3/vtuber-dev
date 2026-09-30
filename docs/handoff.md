# 開発引継ぎ: 別PC・フォークから再開する

更新日: 2026-09-30。現在の基準は **女性VTuberの口パク・首と上半身の追従を改良したv2** です。自宅PCのカメラ・音声・配信検証はこれからです。

## 最初に読むもの

- [README](../README.md): 起動方法と全体の進め方。
- [調整ナレッジ](knowledge.md): なぜ調整したか、どこを直したか。
- [検証記録](validation-2026-09-30.md): 確認済み・未確認と成果物のハッシュ。
- [AGENTS.md](../AGENTS.md): エージェントが維持する制約。
- [ライセンス](licenses.md): ソフト・モデル・素材の出典。

## 今すぐ見た目を確認する

[改良プレビュー](https://naochan3.github.io/vtuber-dev/?preview=2) はPSDと設定を自動で読み込みます。カメラ・マイクは初期状態ではオフです。「角度 X / Z」で首と上半身、「ランダム口パク」で口の開閉を確認できます。

このページは既存GitHub Pagesへの公開です。専用のCodex Cloud環境は作っていません。重い画像分解はColabで実施しました。

## 自宅PCで同じリポジトリを使う

Windows 11、Git、Python 3を前提とします。既存フォルダを上書きせず、新しい作業フォルダで個人GitHubアカウントを使います。

```powershell
git clone https://github.com/naochan3/vtuber-dev.git
Set-Location vtuber-dev
git switch -c avatar-next
./scripts/setup-anime25d.ps1
./scripts/start-anime25d.ps1
```

`http://127.0.0.1:8000/` で次の **2ファイルをセット** で読み込みます。ローカル起動では手動読み込みです。

- `avatars/base-speaking-v2.psd`
- `avatars/base-speaking-v2.rig.json`

顔・肩・首をスライダーで確認した後、カメラ追従を許可し、正面で「正面を記録」を押します。声の同期を試すときはランダム口パクをオフにし、マイク口パクを有効にします。カメラとマイク両方による口の制御も比較してください。

サーバー停止はPowerShellで `Ctrl+C`。待ち受けは `127.0.0.1` です。実行ポリシー・ファイアウォールを全体で緩める必要はありません。ポリシーで実行できない場合は、そのエラーを記録して止めてください。

## 自分のフォークで開発する

GitHubで元リポジトリを自分のアカウントへForkしてから、そのフォークをcloneします。以下の最初のURLは実際のフォークURLに置き換えます。

```powershell
git clone https://github.com/YOUR_ACCOUNT/vtuber-dev.git
Set-Location vtuber-dev
git remote add upstream https://github.com/naochan3/vtuber-dev.git
git switch -c avatar-next
```

以降のセットアップは上記と同じです。変更はフォークの作業ブランチへ保存し、必要なら元リポジトリへPRを作ります。会社のGitHubアカウントやトークンを混ぜないでください。

Pagesを自分のフォークで公開する場合は、フォーク側でActionsの実行を有効にし、Settings → PagesのSourceをGitHub Actionsに設定します。`.github/workflows/preview-pages.yml` は `main` へのpushまたは手動実行でビルドします。公開先は元の `naochan3` とは別です。READMEなどのプレビューリンクも自分のURLへ更新してください。ローカル開発だけならPages設定は不要です。

## コードと成果物の位置

| 場所 | 内容・編集する場面 |
|---|---|
| `input/base.png` | 女性キャラの元の透過立ち絵。上書きせず新しい名前で派生を保存 |
| `avatars/base-rig.psd` / `.rig.json` | 比較用の初版。元の20レイヤー |
| `avatars/base-speaking-v2.psd` / `.rig.json` | 現在の配布基準。専用の開き口を追加した21レイヤー |
| `assets/expressions/` | 開き口素材と生成プロンプト |
| `patches/motion-v2.json` | 固定版ビューアに対する最小の動作調整 |
| `tests/motion-profile.test.cjs` | 左右独立の目・小さな動きの増幅・追従時間・既存設定移行の合成入力テスト |
| `scripts/apply-rig-tuning.py` | ソース照合・調整・元ソース保管。標準ライブラリのみ |
| `scripts/add-speaking-mouth.py` | 元PSDへ生成した口を配置。画像の描き直しはしない |
| `scripts/setup-anime25d.ps1` | 自宅用の固定版取得・専用環境作成・調整適用 |
| `scripts/start-anime25d.ps1` | 自宅用のローカル起動 |
| `notebooks/seethrough-colab.ipynb` | 初版の画像分解と変換を再実行するコード。v2の口追加は別スクリプト |
| `preview/` | 比較動画とローカルで開ける動画ページ |
| `.github/workflows/preview-pages.yml` | 固定版取得 → 調整 → Node検査 → Pages公開 |

`vendor/`・`.venv*/`・モデル重み・`output/` はGitに含めません。日時付き出力を別PCへ引き継ぐ場合は必要な成果物とログを別途コピーします。仮想環境やGPUキャッシュはコピーせず、移動先で再構築します。

## ビューアの調整を変更するとき

固定版は `7ddbd9943ea3152561b3dc8348fd752c850f3e95`。調整は `patches/motion-v2.json` を編集します。口感度・上半身・首の追従に加え、襟の前後を分けて首を内側へ描くマスクもここに含みます。`vendor/Anime2.5DRig/lib/app.js` だけの手編集はGitHubへ残らないので、正式な変更方法にしないでください。

適用済みのファイルへ別の調整を重ねると、適用スクリプトは上書きを拒否します。既存作業を保管したまま、固定版を別の新規ディレクトリへ取得して新しいmanifestを適用してください。バックアップを削除して無理に通す方法は使いません。上流バージョンを変える場合は、コミット・ソースSHA256・置換対象を再確認する必要があります。

PSDを再生成すると、同じファイル名でも内部IDが変わる場合があります。PSDをビューアで開き、割り当て確認後に設定JSONを再書き出しして同じ版として保存してください。

襟の前後マスクはv2のmodelIdに限定しています。PSDを再生成すると外れる場合があるため、新しいIDへ適用すべきか見た目で判断し、manifestを更新してください。マスクは金色の襟の縁に沿って列ごとに境界を検出します。色の判定と探索範囲は [調整ナレッジ](knowledge.md) を参照してください。旧版の水平マスクへ戻すと、首が浮いて見える問題が再発します。

現在は追従改良も同じmanifestへ含めています。頭感度1.6、平滑化0.65、左右目の連動オフが標準です。旧標準値と目の連動はブラウザ内で一度だけ移行し、独自の感度・正面の記録は保持します。これらのブラウザ設定はPSD用JSONには含まれないため、コードごと移動してください。ファイル名のv2はPSD世代で、追従設定の世代とは別です。

固定版取得・適用後、`node tests/motion-profile.test.cjs vendor/Anime2.5DRig/lib/app.js vendor/Anime2.5DRig/lib/face-features.js` で合成入力の検査を実行できます。GitHub Actionsでも公式Nodeテストと併せて実行します。実カメラでは普通の小さな動きと左右のウィンクを別途確認してください。

## 次に行う検証と優先順位

1. 自宅の実カメラで正面・左右・上下・首の傾きを確認。襟と首の境界、髪、耳の破綻を録画する。
2. 実際に話して口の開閉を確認。カメラ口パクとマイク口パクを比較し、感度・閉じやすさを調整して新しいJSONへ保存する。
3. OBSとTikTok LIVE Studioのプレビュー、10分安定性、FPS・VRAM・RAMを記録する。公開配信の開始は含まない。
4. 必要なら音素別口形、手作業のレイヤー修正、THA3との比較へ進む。

測定表は [自宅での検証手順](home-validation.md) にあります。ブラウザの録画設定やColab L4の結果を、自宅RTX 4070の性能として記録しないでください。

## 新しいエージェントへ渡す文面

> AGENTS.md、README.md、docs/handoff.md、docs/knowledge.md、docs/validation-2026-09-30.mdを読んで続けてください。女性VTuberのv2が現在の基準です。元画像と初版を保持し、まず実カメラで首・襟の境界と発話時の口を確認してください。未検証項目を成功扱いにせず、結果を日時付き出力とdocsへ記録してください。会社PCへのインストール、THA4・InsightFace、3D化、認証情報の保存、新規課金は今回の範囲に含めません。
