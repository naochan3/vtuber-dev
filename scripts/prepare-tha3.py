"""THA3の入力仕様へ変換する。元画像の顔や衣装は描き換えない。"""

import argparse
import json
from pathlib import Path

from PIL import Image


def prepare(source: Path, destination: Path, head_box: tuple[int, int, int, int]) -> None:
    if destination.exists():
        raise FileExistsError(f"既存出力は上書きしません: {destination}")
    with Image.open(source) as opened:
        if opened.mode != "RGBA":
            raise ValueError("入力はRGBAの透過PNGにしてください")
        image = opened.copy()
    left, top, right, bottom = head_box
    if not (0 <= left < right <= image.width and 0 <= top < bottom <= image.height):
        raise ValueError("頭部の範囲が入力画像の中に収まっていません")
    if image.getchannel("A").getextrema()[0] != 0:
        raise ValueError("背景が透明になっていません")
    scale = 128 / max(right - left, bottom - top)
    dimensions = (round(image.width * scale), round(image.height * scale))
    offset = (round(256 - (left + right) * scale / 2), round(128 - (top + bottom) * scale / 2))
    if min(offset) < 0 or offset[0] + dimensions[0] > 512 or offset[1] + dimensions[1] > 512:
        raise ValueError("全体が512×512に収まりません。頭部の範囲を確認してください")
    canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    canvas.alpha_composite(image.resize(dimensions, Image.Resampling.LANCZOS), offset)
    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination, format="PNG")
    print(json.dumps({"output": str(destination), "size": [512, 512], "mode": "RGBA", "head_box": head_box, "scale": scale, "offset": offset}, ensure_ascii=False))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--head-box", type=int, nargs=4, required=True, metavar=("LEFT", "TOP", "RIGHT", "BOTTOM"))
    args = parser.parse_args()
    prepare(args.input, args.output, (args.head_box[0], args.head_box[1], args.head_box[2], args.head_box[3]))


if __name__ == "__main__":
    main()

