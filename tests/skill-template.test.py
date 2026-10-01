"""スキルの実ファイルを使い、作成・保護・PSD画素保存を検査する。"""
import ast
import hashlib
import json
import runpy
import subprocess
import sys
import tempfile
import unittest
from collections.abc import Callable
from pathlib import Path
from typing import cast
from unittest.mock import patch

from PIL import Image
from psd_tools import PSDImage
from psd_tools.api.layers import PixelLayer

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skills/build-vtuber-avatar"
TEMPLATE = SKILL / "assets/template"


def run(script: Path, *arguments: object, success: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run([sys.executable, str(script), *(str(a) for a in arguments)],
                            capture_output=True, text=True, encoding="utf-8", check=False)
    if success and result.returncode:
        raise AssertionError(result.stdout + result.stderr)
    if not success and not result.returncode:
        raise AssertionError("失敗すべき入力が受理されました")
    return result


class SkillTemplateTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.work = Path(self.temporary.name)
        self.image = self.work / "source.png"
        Image.new("RGBA", (256, 256), (1, 2, 3, 0)).save(self.image)
        self.project = self.work / "project"

    def create(self) -> None:
        run(SKILL / "scripts/create_project.py", "--image", self.image, "--output", self.project)

    def test_create_and_refuse_overwrite(self) -> None:
        self.create()
        metadata = json.loads((self.project / "run.json").read_text(encoding="utf-8"))
        self.assertEqual(metadata["input_sha256"], hashlib.sha256(self.image.read_bytes()).hexdigest())
        self.assertFalse(metadata["camera_tested"])
        self.assertFalse(metadata["obs_tested"])
        self.assertEqual((self.project / "input/source.png").read_bytes(), self.image.read_bytes())
        marker = self.project / "preserve.txt"
        marker.write_text("保持", encoding="utf-8")
        run(SKILL / "scripts/create_project.py", "--image", self.image, "--output", self.project, success=False)
        self.assertEqual(marker.read_text(encoding="utf-8"), "保持")

    def test_invalid_image_creates_nothing(self) -> None:
        self.image.write_text("PNGではない", encoding="utf-8")
        run(SKILL / "scripts/create_project.py", "--image", self.image, "--output", self.project, success=False)
        self.assertFalse(self.project.exists())

    def test_masks_and_rejection_preserve_previous(self) -> None:
        self.create()
        settings = self.project / "avatars/avatar.rig.json"
        settings.write_text('{"modelId":"abcdef-1234-5678"}', encoding="utf-8")
        profile = {"version": 1, "model_id": "abcdef-1234-5678", "layer": "topwear",
                   "collar_front": [[[0.1, 0.3], [0.9, 0.3], [0.5, 0.7]]], "rear_cloth": []}
        source = self.work / "profile.json"
        source.write_text(json.dumps(profile), encoding="utf-8")
        command = SKILL / "scripts/set_occlusion.py"
        run(command, "--profile", source, "--project", self.project)
        installed = (self.project / "lib/avatar-profile.js").read_bytes()
        for invalid in (
            {**profile, "model_id": "fedcba-1234-5678"},
            {**profile, "collar_front": [[[0.1, 2], [0.5, 0.5], [0.7, 0.7]]]},
            {**profile, "rear_cloth": [[[True, 0], [0, 0.1], [0.1, 0.1]]]},
        ):
            source.write_text(json.dumps(invalid), encoding="utf-8")
            run(command, "--profile", source, "--project", self.project, success=False)
            self.assertEqual((self.project / "lib/avatar-profile.js").read_bytes(), installed)

    def test_notebook_has_no_outputs_and_valid_python(self) -> None:
        notebook = json.loads((TEMPLATE / "notebooks/seethrough-colab.ipynb").read_text(encoding="utf-8"))
        for cell in notebook["cells"]:
            if cell["cell_type"] == "code":
                self.assertEqual(cell["outputs"], [])
                self.assertIsNone(cell["execution_count"])
                ast.parse("".join(cell["source"]))
        for path in SKILL.rglob("*.py"):
            ast.parse(path.read_text(encoding="utf-8"))

    def test_generation_entry_success_timeout_and_wrong_version(self) -> None:
        engine = self.work / "engine"
        scripts = engine / "inference/scripts"
        scripts.mkdir(parents=True)
        inference = scripts / "inference_psd.py"
        inference.write_text(
            "import argparse, json\nfrom pathlib import Path\nfrom psd_tools import PSDImage\n"
            "p=argparse.ArgumentParser();p.add_argument('--srcp');p.add_argument('--save_dir');"
            "p.add_argument('--save_to_psd',action='store_true');p.add_argument('--tblr_split',action='store_true');"
            "p.add_argument('--group_offload',action='store_true');a=p.parse_args();"
            "d=Path(a.save_dir);PSDImage.new('RGB',(128,128)).save(d/'sample.psd');"
            "(d/'arguments.json').write_text(json.dumps(vars(a)))\n", encoding="utf-8")
        module = runpy.run_path(str(TEMPLATE / "scripts/generate-psd.py"))
        generate = cast(Callable[[Path, Path, Path, Path, int], None], module["generate"])
        valid = self.work / "generated"
        # GPU推論だけを小さな別プロセスに置換し、入口・ログ・上限は実処理を検査する。
        with patch("subprocess.check_output", return_value=module["COMMIT"]):
            # 空の絵は生成開始前に拒否される。
            with self.assertRaises(subprocess.CalledProcessError):
                generate(Path(sys.executable), engine, self.image, valid, 10)
            self.assertFalse(valid.exists())
            image = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
            image.paste((10, 20, 30, 255), (20, 20, 180, 220))
            image.save(self.image)
            generate(Path(sys.executable), engine, self.image, valid, 10)
            metrics = json.loads((valid / "generation.json").read_text(encoding="utf-8"))
            self.assertEqual(metrics["status"], "generated")
            self.assertEqual(metrics["input_sha256"], hashlib.sha256(self.image.read_bytes()).hexdigest())
            self.assertEqual(PSDImage.open(valid / "psd/sample.psd").size, (128, 128))
            arguments = json.loads((valid / "psd/arguments.json").read_text(encoding="utf-8"))
            self.assertTrue(arguments["save_to_psd"] and arguments["tblr_split"] and arguments["group_offload"])
            with self.assertRaises(FileExistsError):
                generate(Path(sys.executable), engine, self.image, valid, 10)
            inference.write_text("import time; time.sleep(30)\n", encoding="utf-8")
            timeout = self.work / "timed-out"
            with self.assertRaises(TimeoutError):
                generate(Path(sys.executable), engine, self.image, timeout, 1)
            self.assertEqual(json.loads((timeout / "generation.json").read_text(encoding="utf-8"))["status"], "failed")
            self.assertTrue((timeout / "inference.log").exists())
        with patch("subprocess.check_output", return_value="unknown"):
            unknown = self.work / "wrong-version"
            with self.assertRaises(ValueError):
                generate(Path(sys.executable), engine, self.image, unknown, 10)
            self.assertFalse(unknown.exists())

    def test_normalize_and_mouth_scale_preserve_pixels(self) -> None:
        psd = PSDImage.new("RGBA", (256, 256))
        PixelLayer.frompil(Image.new("RGBA", (40, 8), (50, 10, 20, 255)), psd, name="mouth", left=100, top=80)
        PixelLayer.frompil(Image.new("RGBA", (24, 4), (20, 10, 10, 255)), psd, name="eyebrow-r", left=60, top=30)
        original = self.work / "original.psd"
        psd.save(original)
        normalized = self.work / "normalized.psd"
        run(TEMPLATE / "scripts/normalize-psd.py", "--input", original, "--output", normalized)
        result = PSDImage.open(normalized)
        self.assertEqual([layer.name for layer in result], ["mouth", "eyebrow_1"])
        before = PSDImage.open(original).composite(force=True)
        after = result.composite(force=True)
        assert before is not None and after is not None
        self.assertEqual(before.tobytes(), after.tobytes())
        sprite = Image.new("RGBA", (60, 30), (0, 0, 0, 0))
        sprite.paste((80, 20, 40, 255), (5, 5, 55, 25))
        sprite_path = self.work / "mouth.png"
        sprite.save(sprite_path)
        speaking = self.work / "speaking.psd"
        run(TEMPLATE / "scripts/add-speaking-mouth.py", "--input", normalized, "--sprite", sprite_path, "--output", speaking)
        layers = {layer.name: layer for layer in PSDImage.open(speaking)}
        self.assertEqual(len(layers), 3)
        self.assertEqual(layers["mouth_open"].size, (44, 22))
        for layer in result:
            new_name = "mouth_close" if layer.name == "mouth" else layer.name
            old_image, new_image = layer.topil(), layers[new_name].topil()
            assert old_image is not None and new_image is not None
            self.assertEqual(old_image.tobytes(), new_image.tobytes())
        digest = hashlib.sha256(speaking.read_bytes()).hexdigest()
        run(TEMPLATE / "scripts/add-speaking-mouth.py", "--input", normalized, "--sprite", sprite_path,
            "--output", speaking, success=False)
        self.assertEqual(hashlib.sha256(speaking.read_bytes()).hexdigest(), digest)


if __name__ == "__main__":
    unittest.main()
