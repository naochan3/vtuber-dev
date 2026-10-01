"""スキル同梱の汎用テンプレートと入力PNGから、新規プロジェクトを作る。"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import struct


def create(image: Path, output: Path) -> None:
    if output.exists():
        raise FileExistsError(f"出力先は新規フォルダを指定してください: {output}")
    raw = image.read_bytes()
    if len(raw) < 33 or raw[:8] != b"\x89PNG\r\n\x1a\n" or raw[12:16] != b"IHDR":
        raise ValueError("入力には透過PNGを用意してください")
    width, height, depth, color = struct.unpack(">IIBB", raw[16:26])
    if not 128 <= min(width, height) <= max(width, height) <= 4096 or depth != 8 or color not in (4, 6):
        raise ValueError("128〜4096px、8bit、アルファ付きPNGを用意してください")
    skill = Path(__file__).resolve().parents[1]
    template = skill / "assets/template"
    shutil.copytree(template, output)
    (output / "input").mkdir()
    (output / "avatars").mkdir()
    (output / "evidence").mkdir()
    shutil.copyfile(image, output / "input/source.png")
    metadata = {"skill": "build-vtuber-avatar", "skill_version": 1,
                "input_sha256": hashlib.sha256(raw).hexdigest(), "input_size": [width, height],
                "status": "input-prepared", "camera_tested": False, "obs_tested": False}
    (output / "run.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"新規プロジェクトを作成しました: {output}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    create(args.image, args.output)


if __name__ == "__main__":
    main()
