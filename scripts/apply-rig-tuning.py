"""固定版Anime2.5DRigに口・上半身の追従調整を適用する。"""

import argparse
import hashlib
import json
from pathlib import Path
from typing import TypedDict, cast


class Replacement(TypedDict):
    before: str
    after: str


class Manifest(TypedDict):
    upstream_commit: str
    source_sha256: str
    replacements: list[Replacement]


def tuned_source(source: str, manifest: Manifest) -> str:
    if hashlib.sha256(source.encode("utf-8")).hexdigest() != manifest["source_sha256"]:
        raise ValueError("元ソースが固定版と異なります。変更しません。")
    for replacement in manifest["replacements"]:
        if source.count(replacement["before"]) != 1:
            raise ValueError("調整対象が一意に見つかりません。変更しません。")
        source = source.replace(replacement["before"], replacement["after"])
    return source


def apply(source_path: Path, manifest_path: Path) -> None:
    manifest = cast(Manifest, json.loads(manifest_path.read_text(encoding="utf-8")))
    source = source_path.read_text(encoding="utf-8")
    backup = source_path.with_name(source_path.name + ".original-v2")
    if backup.exists():
        original = backup.read_text(encoding="utf-8")
        if source == tuned_source(original, manifest):
            print("調整済みです。再適用は不要です。")
            return
        raise ValueError("調整後のソースに別の変更があります。上書きしません。")
    adjusted = tuned_source(source, manifest)
    backup.write_text(source, encoding="utf-8", newline="\n")
    source_path.write_text(adjusted, encoding="utf-8", newline="\n")
    print("上半身追従・口感度の調整を適用しました。元ソースは保存済みです。")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    args = parser.parse_args()
    apply(args.source, args.manifest)


if __name__ == "__main__":
    main()
