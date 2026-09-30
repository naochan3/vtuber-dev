# 女性VTuberアバター検証

オリジナルの女性アニメキャラクターを、顔・まばたき・口の動きに連動させる検証用プロジェクトです。

## まず動きを見る

- [改良版のブラウザプレビュー](https://naochan3.github.io/vtuber-dev/?preview=2): 女性キャラを自動読み込み。小さな頭の動きの増幅・顔の可動幅・なめらかな追従・左右独立のウィンクを調整済みです。
- [最新の5秒サンプル](preview/motion-v3.webm): 可動幅・なめらかな追従・呼吸と横揺れの改良後。カメラなしの自動動作です。
- [首と襟の接続修正時点](preview/speaking-collar-fit.webm): 今回の可動幅・呼吸改良前の比較動画です。
- [水平マスク時点の比較動画](preview/speaking-neck-mask.webm): 首が浮いて見える問題が残っていた旧版です。
- [口パク改良時点の比較動画](preview/speaking-v2.webm): 首マスク追加前のv2です。
- [5秒の動作サンプル（WebM）](preview/demo.webm): カメラなしの自動まばたき・顔の動き・髪の揺れ。保存してChrome / Edgeで再生できます。
- [ブラウザで確認する手順](docs/motion-preview.md): 改良版ではファイルを選ぶ操作が不要です。元のPSD・動画も残しています。

## 進め方

別PCで再開する場合は [開発引継ぎ](docs/handoff.md) を最初に読んでください。[調整ナレッジ](docs/knowledge.md) に原因・調整箇所・再発時の確認方法を、[検証記録](docs/validation-2026-09-30.md) に証跡と未検証事項を保存しています。

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

ブラウザで `http://127.0.0.1:8000/` を開き、`avatars/base-speaking-v2.psd` と `avatars/base-speaking-v2.rig.json` を読み込みます。セットアップは固定版のビューアに `patches/motion-v2.json` の調整を適用し、元の `app.js` を保管します。既存の別変更は上書きしません。カメラ・マイクは必要なときに許可します。

OBSにブラウザソースを追加し、URLを `http://127.0.0.1:8000/?obs=1` にします。取り込みを確認してからOBS仮想カメラを開始し、TikTok LIVE Studio側で選択します。

詳しい測定項目とEasyVtuberの準備は [自宅での検証手順](docs/home-validation.md) を参照してください。

## 検証状態

改良版ではimagegenで開き口を制作し、Colabで独立レイヤーに配置しました。元の20レイヤーの画素を保持した21レイヤーPSDです。頭感度は標準1.6へ、顔の左右の描画量は約1.9倍、上下は約1.6倍、傾きは2倍へ広げました。呼吸に合わせた肩・頭の上下動と横揺れも加えています（本人の呼吸を測る機能ではなく自動演出）。顔・体にはなめらかな追従を加え、目・口は別の速さで反応します。左右の目の連動を標準でオフにし、ウィンクに対応します。首は上側を顔、下側を肩へ追従させ、金色の襟縁に沿って衣装を前後へ分け、筒状の襟の内側へ入るよう修正しました。衣装の位置と元画像・PSDの画素は変更していません。

改良プレビューで開き口・閉じ口を認識し、左右の手動ポーズを確認しました。生成スクリプトと適用スクリプトはColabでruff・mypy strictに合格。固定版のソース検証・再適用・別変更の拒否・JavaScript構文検査に合格し、GitHub Actionsで公式NodeテストとPagesへの公開が成功しています。音素別の口形、カメラ・実音声での同期、OBS・TikTok出力は未検証です。

2026-09-30にColab L4 / Python 3.12でSee-throughのPSD生成に成功しました。所要時間741.05秒（モデルの初回ダウンロード・20秒間隔の完了確認を含む）。20レイヤーのPSDを生成し、左右パーツ12件の名前だけをAnime2.5DRig互換に変更しています。変更前後の合成画像が同一であることを確認しました。

初版では公式ブラウザデモで白目・瞳・まつ毛・眉・髪の認識と自動動作を確認し、1280×1280 / 30fps設定の150フレームをWebMへ保存しました。動画の設定値を自宅での動作FPSとはみなしません。初版の閉じ目・閉じ口はデモが自動生成した汎用差分です。

`prepare-tha3.py` と `normalize-psd.py` はColabでruff・mypy strictに合格。PowerShellスクリプトは構文検査済みです。自宅のRTX 4070でのFPS、顔追跡、口同期、OBS・TikTokへの出力は未測定です。Codex Cloudの専用環境はまだ作成していません。

## ライセンス

[使用ソフトとモデル](docs/licenses.md) を参照してください。公開コードのライセンスとモデル重みの条件は分けて扱います。THA4・`v4_student`・InsightFaceモデルは使用しません。
