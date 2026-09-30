# 検証記録: 2026-09-30

## 現在の成果物

| ファイル | 確認内容 |
|---|---|
| `input/base.png` | 1254×1254 RGBAの元立ち絵 |
| `avatars/base-rig.psd` | 1280×1280、元の20レイヤー |
| `avatars/base-speaking-v2.psd` | 21レイヤー、元の20レイヤーの画素をすべて保持 |
| `avatars/base-speaking-v2.rig.json` | 改良PSDから書き出し、読み戻し成功。modelId `a6068e-293dc8a5-5f5ed455` |
| `preview/speaking-v2.webm` | VP9、1280×1280、108フレーム、最終時刻4.705秒。カメラ・マイクなし |
| `preview/speaking-neck-mask.webm` | 首マスク修正後。VP9、1280×1280、103フレーム、最終時刻4.663秒。カメラ・マイクなし |

SHA256:

```text
input/base.png
103075e95db8d65f01581edde5e1b2f3d823c3fa2ce08d4cc8afa16e696f3da7
avatars/base-rig.psd
385fc62f099d5c81adb2e5739dce2f634c852014fc1b3e8ee2012043a8dd4374
avatars/base-speaking-v2.psd
a95f7d47883ce1f6071e470e2b440c2067dba57324f8bb57d8f64a58f9e0d84f
preview/speaking-neck-mask.webm
d3d39eb7fac1ca9421196500fd778d1252be058181f0ebca4aa574de8a9bbe5b
```

## 合格・観察済み

- Colab L4 / Python 3.12でSee-throughによる初版PSD生成成功。741.05秒は初回ダウンロード・20秒間隔の完了確認を含む。
- 左右12パーツの名前変換前後で合成画像が同一。
- v2の口追加で元の20レイヤーそれぞれの画素ハッシュ一致。開き口の配置範囲は `[618, 435, 678, 465]`。
- `prepare-tha3.py`、`normalize-psd.py`、`add-speaking-mouth.py`、`apply-rig-tuning.py` はColabでruff・mypy strict合格。
- ローカルの固定版調整確認で、初回適用・再適用・元ソース保管・未知ソースや別編集の拒否に合格。
- PowerShellの構文検査、改良JavaScriptのNode構文検査に合格。
- [コード公開コミット](https://github.com/naochan3/vtuber-dev/commit/07282c1f12b79bedcfc772dfc27c3b870cfd74d5) の [GitHub Actions](https://github.com/naochan3/vtuber-dev/actions/runs/36692956843) で公式NodeテストとPages公開が成功。
- [首マスク修正コミット](https://github.com/naochan3/vtuber-dev/commit/efd36f314ca60a0b552aed133bdf916e282a32a3) の [GitHub Actions](https://github.com/naochan3/vtuber-dev/actions/runs/36716876865) も成功。襟元を下げる試案を取り下げ、首の上側だけを衣装の前へ追加描画する方式に置き換え。
- 改良プレビューで専用開き口・元の閉じ口を認識。手動のX/Z=`+0.6/+0.8`、`−0.6/−0.8`で首・肩・胴体のつながりを画面確認。
- 首マスク追加後、正面、X/Z=`−0.6/−0.8`、X/Y/Z=`+0.6/+0.5/+0.8`、Y=`−0.5`で首の上側が見え、襟・衣装が下側を隠す状態を画面確認。実カメラではなく手動スライダーの検証。
- 公式サンプルAへの切り替え後、v2のPSDとJSONを再読み込みし、描画・首マスク・口設定が復元されることを確認。GPUメモリ量の計測はしていません。
- 改良動画を既存FFmpegでデコードし、1秒間隔のフレームで開口と閉口・上半身の動きを確認。

正面の首マスク修正結果:

![首の上側が見え、下側を襟が隠す正面](../preview/neck-mask-neutral.png)

傾き・上向きの手動ポーズ:

![首と上半身の手動ポーズ確認](../preview/neck-mask-right-up.png)

会社PCでは軽いファイル保存・構文検査・動画読み取り・ブラウザ操作のみ実施しました。Python依存環境・モデル・ドライバ・配信プラグインのインストールやOS設定変更は行っていません。ブラウザ描画の負荷はゼロではありません。

## 未確認・次の実機検証

- 自宅RTX 4070でのFPS、VRAM、RAM、長時間の安定性。
- 実カメラ追従の性能、強い上下動に対する首・襟・髪の破綻。
- 発声と口の同期、カメラ口パクとマイク口パクの競合。
- OBS・TikTok LIVE Studioの透過出力と配信プレビュー。
- 統合したColabノートブック全体の新規ランタイムからの再実行。
- 音素別の口差分は未実装。EasyVtuber / THA3の自宅実行は未検証。

以上を確認するまで、配信までの全工程が完成したとは扱いません。
