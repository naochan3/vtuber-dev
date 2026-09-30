# 女性VTuberアバター検証

オリジナルの女性アニメキャラクターを、顔・まばたき・口の動きに連動させる検証用プロジェクトです。

## まず動きを見る

- [5秒の動作サンプル（WebM）](preview/demo.webm): カメラなしの自動まばたき・顔の動き・髪の揺れ。保存してChrome / Edgeで再生できます。
- [ブラウザで確認する手順](docs/motion-preview.md): `avatars/base-rig.psd` と `avatars/base-rig.rig.json` を公式デモへ読み込みます。
- 口の専用差分は未制作のため、保存した設定は自動口パクを無効にしています。

## 進め方

1. ColabでSee-throughを使い、透過立ち絵からレイヤーPSDを作る。
2. 自宅Windows PCでAnime2.5DRigを起動し、PSDを読み込んで顔・目・口の割り当てを確認する。
3. OBSのブラウザソースから取り込み、OBS仮想カメラをTikTok LIVE Studioで選ぶ。
4. 同じ立ち絵を512×512 RGBA PNGにして、EasyVtuberのTHA3と比較する。

会社PCにはPython環境・モデル・OBSプラグインをインストールしません。画像分解はColab、自宅のカメラ・マイク・OBS連携は自宅で検証します。

## Colab

[作業中のノートブック](https://colab.research.google.com/drive/1GSvOAsp0aUO9pjlqoruypDwqvhJikEEl)

ノートブックの閲覧には所有者のGoogleアカウントが必要です。Drive全体のマウントやGitHubトークンの保存は不要です。GPUはL4、Pythonは3.12のランタイムを使います。

[再実行用ノートブックをColabで開く](https://colab.research.google.com/github/naochan3/vtuber-dev/blob/main/notebooks/seethrough-colab.ipynb)。コードのみを保存しており、ログイン情報・実行出力は含みません。Colabの一時ディスクは永続保存ではないため、結果ZIPをダウンロードして保管してください。

## 自宅で起動する

前提: Windows 11、Git、Python 3、Webカメラ・マイク、OBSが自宅PCにあること。リポジトリをダウンロードしたフォルダでPowerShellを開きます。

```powershell
./scripts/setup-anime25d.ps1
./scripts/start-anime25d.ps1
```

ブラウザで `http://127.0.0.1:8000/` を開き、`avatars/base-rig.psd` と `avatars/base-rig.rig.json` を読み込みます。カメラ・マイクは自宅で必要なときに許可します。

OBSにブラウザソースを追加し、URLを `http://127.0.0.1:8000/?obs=1` にします。取り込みを確認してからOBS仮想カメラを開始し、TikTok LIVE Studio側で選択します。

詳しい測定項目とEasyVtuberの準備は [自宅での検証手順](docs/home-validation.md) を参照してください。

## 検証状態

2026-09-30にColab L4 / Python 3.12でSee-throughのPSD生成に成功しました。所要時間741.05秒（モデルの初回ダウンロード・20秒間隔の完了確認を含む）。20レイヤーのPSDを生成し、左右パーツ12件の名前だけをAnime2.5DRig互換に変更しています。変更前後の合成画像が同一であることを確認しました。

公式ブラウザデモで白目・瞳・まつ毛・眉・髪の認識と自動動作を確認し、1280×1280 / 30fps設定の150フレームをWebMへ保存しました。動画の設定値を自宅での動作FPSとはみなしません。閉じ目・閉じ口はデモが自動生成した汎用差分です。

`prepare-tha3.py` と `normalize-psd.py` はColabでruff・mypy strictに合格。PowerShellスクリプトは構文検査済みです。自宅のRTX 4070でのFPS、顔追跡、口同期、OBS・TikTokへの出力は未測定です。Codex Cloudの専用環境はまだ作成していません。

## ライセンス

[使用ソフトとモデル](docs/licenses.md) を参照してください。公開コードのライセンスとモデル重みの条件は分けて扱います。THA4・`v4_student`・InsightFaceモデルは使用しません。
