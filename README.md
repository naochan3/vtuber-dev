# 女性VTuberアバター検証

オリジナルの女性アニメキャラクターを、顔・まばたき・口の動きに連動させる検証用プロジェクトです。

## 進め方

1. ColabでSee-throughを使い、透過立ち絵からレイヤーPSDを作る。
2. 自宅Windows PCでAnime2.5DRigを起動し、PSDを読み込んで顔・目・口の割り当てを確認する。
3. OBSのブラウザソースから取り込み、OBS仮想カメラをTikTok LIVE Studioで選ぶ。
4. 同じ立ち絵を512×512 RGBA PNGにして、EasyVtuberのTHA3と比較する。

会社PCにはPython環境・モデル・OBSプラグインをインストールしません。画像分解はColab、自宅のカメラ・マイク・OBS連携は自宅で検証します。

## Colab

[作業中のノートブック](https://colab.research.google.com/drive/1GSvOAsp0aUO9pjlqoruypDwqvhJikEEl)

ノートブックの閲覧には所有者のGoogleアカウントが必要です。Drive全体のマウントやGitHubトークンの保存は不要です。GPUはL4、Pythonは3.12のランタイムを使います。

`notebooks/` に再実行用ノートブックを保存します。Colabの一時ディスクは永続保存ではないため、結果ZIPをダウンロードして保管してください。

## 自宅で起動する

前提: Windows 11、Git、Python 3、Webカメラ・マイク、OBSが自宅PCにあること。リポジトリをダウンロードしたフォルダでPowerShellを開きます。

```powershell
./scripts/setup-anime25d.ps1
./scripts/start-anime25d.ps1
```

ブラウザで `http://127.0.0.1:8000/` を開き、PSDと設定JSONを読み込みます。カメラ・マイクは自宅で必要なときに許可します。

OBSにブラウザソースを追加し、URLを `http://127.0.0.1:8000/?obs=1` にします。取り込みを確認してからOBS仮想カメラを開始し、TikTok LIVE Studio側で選択します。

詳しい測定項目とEasyVtuberの準備は [自宅での検証手順](docs/home-validation.md) を参照してください。

## 検証状態

画像制作・Colab環境準備を進行中です。自宅のRTX 4070でのFPS、顔追跡、口同期、OBS・TikTokへの出力は未測定です。静止画の品質と、動かしたときの品質は別々に確認します。

## ライセンス

[使用ソフトとモデル](docs/licenses.md) を参照してください。公開コードのライセンスとモデル重みの条件は分けて扱います。THA4・`v4_student`・InsightFaceモデルは使用しません。
