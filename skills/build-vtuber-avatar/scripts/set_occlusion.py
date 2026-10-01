"""検証済み画像別マスクをJSデータとして保存。原稿は変更しない。"""
import argparse
import json
import math
from pathlib import Path
import re


def install(source: Path, project: Path) -> None:
    profile: object = json.loads(source.read_text(encoding="utf-8"))
    if not isinstance(profile, dict):
        raise ValueError("画像別マスクはオブジェクトが必要です")
    model_id = profile.get("model_id")
    if type(profile.get("version")) is not int or profile.get("version") != 1 or not isinstance(model_id, str) or not re.fullmatch(
            r"[0-9a-f]{1,16}-[0-9a-f]{1,8}-[0-9a-f]{1,8}", model_id) or profile.get("layer") != "topwear":
        raise ValueError("画像別マスクの識別情報が不正です")
    settings: object = json.loads((project / "avatars/avatar.rig.json").read_text(encoding="utf-8"))
    if not isinstance(settings, dict) or settings.get("modelId") != model_id:
        raise ValueError("マスクとPSD設定のmodelIdが一致しません")
    for key in ("collar_front", "rear_cloth"):
        polygons = profile.get(key)
        if not isinstance(polygons, list) or len(polygons) > 32:
            raise ValueError("マスク領域数が不正です")
        for polygon in polygons:
            if not isinstance(polygon, list) or not 3 <= len(polygon) <= 256:
                raise ValueError("マスク頂点数が不正です")
            for point in polygon:
                if not isinstance(point, list) or len(point) != 2 or any(
                    type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v <= 1 for v in point
                ):
                    raise ValueError("頂点は画像全体の0〜1の座標にしてください")
    clean = {key: profile[key] for key in ("version", "model_id", "layer", "collar_front", "rear_cloth")}
    destination = project / "lib/avatar-profile.js"
    destination.write_text("window.AvatarProfile=" + json.dumps(clean, separators=(",", ":")) + ";\n", encoding="utf-8")
    (project / "avatars/occlusion.json").write_text(json.dumps(clean, indent=2), encoding="utf-8")
    print("画像別マスクを設定しました。元PSDの画素は変更していません。")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", required=True, type=Path)
    parser.add_argument("--project", required=True, type=Path)
    args = parser.parse_args()
    install(args.profile, args.project)


if __name__ == "__main__":
    main()
