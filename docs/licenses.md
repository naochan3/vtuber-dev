# 出典とライセンス

確認日: 2026-09-30。コードとモデル重みは別の条件です。

| 対象 | 固定するソース | 確認内容 |
|---|---|---|
| [See-through](https://github.com/shitagaki-lab/see-through) | `a25a5498e031dc7fe01232d05dadaf67736277fb` | コードはApache-2.0。モデルカードはOpenRAIL++表記。利用制限と基盤モデルの条件も確認が必要 |
| [Anime2.5DRig](https://github.com/852wa/Anime2.5DRig) | `7ddbd9943ea3152561b3dc8348fd752c850f3e95` | コードはMIT。サンプル絵の権利は作者にあり、オリジナル素材として再配布しない |
| [EasyVtuber](https://github.com/yuyuyzl/EasyVtuber) | `f7dd2de4df93c878b0171f47346ff66414a863e6` | コードはMIT。THA4を含むため、使用するモデルをTHA3に限定 |
| [Talking Head Anime 3](https://github.com/pkhungurn/talking-head-anime-3-demo) | 公式配布元から取得 | コードはMIT、モデル重みはCC BY 4.0。利用時のクレジットを保持 |

See-throughの初期設定モデル:

- [layerdifforg/seethroughv0.0.2_layerdiff3d](https://huggingface.co/layerdifforg/seethroughv0.0.2_layerdiff3d): モデルカードにOpenRAIL++、基盤モデルにAnimagine XL 4.0を記載。
- [layerdifforg/seethroughv0.0.1_marigold](https://huggingface.co/layerdifforg/seethroughv0.0.1_marigold): モデルカードにOpenRAIL++、基盤モデルにMarigold depth v1-1を記載。

モデル重みをこのリポジトリで再配布しません。商用で多数のクリエイターへ提供する段階では、実際に使う重み・派生モデル・素材の条件を記録して判断します。「コードがMITだから重みも制限なし」とは扱いません。

THA3のクレジット例: Talking Head Anime 3 — Pramook Khungurn / CC BY 4.0 / https://github.com/pkhungurn/talking-head-anime-3-demo

改良プレビューはAnime2.5DRigの上記固定版を改変し、MITのLICENSEとアプリ名を保持しています。ビューア内のサンプルボタンは公式のサンプル素材です。このプロジェクトの女性キャラと開き口はimagegenで生成した素材です。開き口の最終プロンプトは `assets/expressions/mouth-open-v2.prompt.txt` に保存しています。
