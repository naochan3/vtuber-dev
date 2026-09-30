"""生成した開き口をPSDの独立レイヤーへ配置し、元レイヤーを検証する。"""

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image
from psd_tools import PSDImage
from psd_tools.api.layers import Layer, PixelLayer


def layer_digest(layer: Layer) -> str:
    image = layer.topil()
    if image is None:
        raise ValueError(f"レイヤー画像がありません: {layer.name}")
    return hashlib.sha256(image.tobytes()).hexdigest()


def assemble(source: Path, sprite_path: Path, destination: Path) -> None:
    if destination.exists():
        raise FileExistsError(f"既存PSDは上書きしません: {destination}")
    psd = PSDImage.open(source)
    mouths = [layer for layer in psd if layer.name == "mouth"]
    if len(mouths) != 1:
        raise ValueError("元のmouthレイヤーが一意に見つかりません")
    closed = mouths[0]
    original = {layer.name: layer_digest(layer) for layer in psd}
    with Image.open(sprite_path) as image:
        sprite = image.convert("RGBA")
    alpha = sprite.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None or alpha.getextrema()[0] != 0:
        raise ValueError("透過した開き口素材が必要です")
    # 素材の描画はimagegenで実施済み。ここではPSDへの配置だけを行う。
    sprite = sprite.crop(bounds).resize((60, 30), Image.Resampling.LANCZOS)
    left = round((closed.left + closed.right) / 2 - sprite.width / 2)
    top = closed.top
    closed.name = "mouth_close"
    closed.visible = True
    opened = PixelLayer.frompil(sprite, psd, name="mouth_open", top=top, left=left)
    closed_index = list(psd).index(closed)
    psd.insert(closed_index + 1, opened)
    destination.parent.mkdir(parents=True, exist_ok=True)
    psd.save(destination)
    result = PSDImage.open(destination)
    preserved = 0
    for layer in result:
        if layer.name == "mouth_open":
            continue
        original_name = "mouth" if layer.name == "mouth_close" else layer.name
        if layer_digest(layer) != original[original_name]:
            raise ValueError(f"元の画素が変化しました: {original_name}")
        preserved += 1
    if preserved != len(original) or len(result) != len(original) + 1:
        raise ValueError("レイヤー数が一致しません")
    preview = result.composite(force=True)
    if preview is None:
        raise ValueError("合成画像を生成できません")
    preview.save(destination.with_suffix(".png"))
    print(json.dumps({"output": str(destination), "preserved_layers": preserved,
                      "layers": len(result), "mouth_bbox": list(opened.bbox),
                      "sha256": hashlib.sha256(destination.read_bytes()).hexdigest()},
                     ensure_ascii=False))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--sprite", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    assemble(args.input, args.sprite, args.output)


if __name__ == "__main__":
    main()
