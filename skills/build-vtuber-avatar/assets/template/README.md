# 画像から作成するVTuberアバター

この一式は `build-vtuber-avatar` スキルの汎用テンプレートです。完成したPSDと設定JSONを `avatars/` に置いて利用します。生成途中かどうかは `run.json` と `evidence/validation.md` を確認してください。

## 素材を作る実行先

GPU生成はColabでも、準備済みの自宅・別GPUホストでも行えます。Colab用ノートは一例です。既存PSDからなら生成を省けます。実行先に関係なく、最終PSD・同じPSDの設定JSON・画像別マスク・検査・引継ぎを同じ組で渡します。

準備済みSee-through環境には `scripts/generate-psd.py --python <GPU環境Python> --checkout <固定版ソース> --image input/source.png --output <新規出力>` を使います。公式READMEの依存関係を満たす必要があり、全OS・GPUの互換性を保証するものではありません。

## 自宅で起動

Windows、Git、Python 3、WebGL対応Chrome / Edgeを前提に、プロジェクトのフォルダで実行します。会社PCでは環境を作らず、PSD生成は許可されたColab等で実施します。

```powershell
./scripts/setup-anime25d.ps1
./scripts/start-anime25d.ps1
```

通常ブラウザの `http://127.0.0.1:8000/` は `avatars/avatar.psd` と `avatars/avatar.rig.json` を自動読込します。設定JSONがまだない場合は初期リグを表示するため、調整して書き出してください。カメラ・マイクは自分でオンにし、正面を向いて「正面を記録」を押します。

OBSはブラウザソース `http://127.0.0.1:8000/?obs=1` に設定します。幅・高さをPSDに合わせ、まず30fpsで確認します。通常ブラウザで動かすカメラ入力・モデル・設定をローカル中継がOBSへ渡します。GitHub Pagesだけでは別プロセスのOBSへ中継できません。

TikTok LIVE StudioではOBS仮想カメラをカメラソースに指定できるかプレビューで確認します。配信マイクは別途設定してください。止めるときはサーバーのPowerShellで `Ctrl+C`。OSの実行ポリシー・ファイアウォールを全体で緩めません。

## 素材と動きの組合せ

- `input/source.png`: 元画像。保持します。
- `avatars/avatar.psd` + `avatar.rig.json`: 最終素材と同じmodelIdの設定。
- `patches/motion-v5.json`: 上半身・首・毛束・瞳の調整と画像別マスクの呼出し。
- `patches/face-tracking-v5.json`: 独立ウィンク、眉・上下向きの追跡。
- `avatars/occlusion.json` + `lib/avatar-profile.js`: 必要な場合だけ作る、その画像専用の前後マスク。
- `notebooks/seethrough-colab.ipynb`: GPUで元絵をパーツ分けする手順。モデル重みはGitへ入れません。
- `evidence/`: 正負ポーズ・検査結果・動画・既知の制限。

元画像とPSDの画素を保持すること、顔を左右上下に動かせること、カメラで追跡できること、配信アプリへ表示できることは、それぞれ分けて確認します。コードと素材の組を最新版として配布してください。

## 再検査

Nodeがある開発環境で実行します。自宅用サーバーの起動だけならNodeは不要です。

```powershell
node tests/motion-profile.test.cjs vendor/Anime2.5DRig/lib/app.js vendor/Anime2.5DRig/lib/face-features.js
node tests/torso-motion.test.cjs vendor/Anime2.5DRig/lib/app.js
node tests/eye-hair-motion.test.cjs vendor/Anime2.5DRig/lib/app.js vendor/Anime2.5DRig/lib/runtime.js
node tests/face-tracking.test.cjs vendor/Anime2.5DRig/lib/face-features.js
node tests/occlusion.test.cjs lib/avatar-occlusion.js
node tests/occlusion-render.test.cjs vendor/Anime2.5DRig/lib/app.js
node tests/obs-startup.test.cjs vendor/Anime2.5DRig/lib/app.js vendor/Anime2.5DRig/lib/runtime.js avatar
```

これは合成入力の回帰検査です。本人の実カメラとOBS・TikTokの結果、FPS・RAM・VRAMは別途記録します。
