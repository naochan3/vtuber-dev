"""See-throughの左右別レイヤー名をAnime2.5DRigの番号付き規約へ変換する。"""

import argparse
import json
import re
from pathlib import Path

from psd_tools import PSDImage


def normalize(source: Path, destination: Path) -> None:
    if destination.exists():
        raise FileExistsError(f"既存PSDは上書きしません: {destination}")
    psd = PSDImage.open(source)
    changed: list[dict[str, str]] = []
    for layer in psd.descendants():
        match = re.fullmatch(r"(handwear|ears|eyebrow|eyewhite|irides|eyelash)-(l|r)", layer.name)
        if match:
            suffix = "1" if match.group(2) == "r" else "2"
            new_name = f"{match.group(1)}_{suffix}"
            changed.append({"before": layer.name, "after": new_name})
            layer.name = new_name
    if not changed:
        raise ValueError("変換対象の左右別レイヤーがありません")
    destination.parent.mkdir(parents=True, exist_ok=True)
    psd.save(destination)
    print(json.dumps({"output": str(destination), "changed": changed}, ensure_ascii=False))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    normalize(args.input, args.output)


if __name__ == "__main__":
    main()

