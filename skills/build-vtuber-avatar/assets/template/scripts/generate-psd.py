"""実行先に依存せず、準備済みSee-through環境から新規出力へPSDを生成する。"""
import argparse
import hashlib
import json
import subprocess
import time
from pathlib import Path

COMMIT = "a25a5498e031dc7fe01232d05dadaf67736277fb"


def generate(python: Path, checkout: Path, image: Path, output: Path, timeout: int = 1800) -> None:
    python, checkout, image, output = (path.resolve() for path in (python, checkout, image, output))
    if output.exists():
        raise FileExistsError(f"既存出力は上書きしません: {output}")
    if not 1 <= timeout <= 3600:
        raise ValueError("実行枠は1〜3600秒で指定してください")
    actual = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=checkout, text=True).strip()
    if actual != COMMIT:
        raise ValueError("See-throughが固定版と異なります。変更せず停止します")
    validator = (
        "from PIL import Image; import sys; "
        "im=Image.open(sys.argv[1]); "
        "assert im.format=='PNG' and im.mode=='RGBA', 'RGBA PNGが必要です'; "
        "assert 128<=min(im.size)<=max(im.size)<=4096, '画像寸法が範囲外です'; "
        "a=im.getchannel('A'); assert a.getextrema()[0]==0 and a.getbbox(), '透過した空でない絵が必要です'"
    )
    subprocess.run([str(python), "-c", validator, str(image)], check=True)
    output.mkdir(parents=True)
    psd_output = output / "psd"
    psd_output.mkdir()
    command = [str(python), "inference/scripts/inference_psd.py", "--srcp", str(image),
               "--save_dir", str(psd_output), "--save_to_psd", "--tblr_split", "--group_offload"]
    metadata: dict[str, object] = {"status": "running", "source_commit": actual,
                                   "input_sha256": hashlib.sha256(image.read_bytes()).hexdigest(),
                                   "timeout_seconds": timeout}
    metrics = output / "generation.json"
    metrics.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    start = time.monotonic()
    try:
        with (output / "inference.log").open("w", encoding="utf-8") as log:
            process = subprocess.Popen(command, cwd=checkout, stdout=log, stderr=subprocess.STDOUT, text=True)
            try:
                while process.poll() is None:
                    remaining = timeout - (time.monotonic() - start)
                    if remaining <= 0:
                        raise TimeoutError("実行枠を超過しました。出力とログを保持して停止します")
                    try:
                        process.wait(timeout=min(20, remaining))
                    except subprocess.TimeoutExpired:
                        print(f"PSD生成中: {round(time.monotonic() - start)}秒", flush=True)
            finally:
                if process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=10)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait(timeout=10)
            if process.returncode != 0:
                raise subprocess.CalledProcessError(process.returncode or 1, command)
        files = sorted(psd_output.rglob("*.psd"))
        if not files or any(path.stat().st_size == 0 for path in files):
            raise ValueError("PSDが生成されていません。inference.logを確認してください")
        metadata["status"] = "generated"
        metadata["psd_files"] = [str(path.relative_to(output)) for path in files]
        print(f"素材の生成完了: {output}。PSD画素・動き・配信は別途検査してください")
    finally:
        if metadata["status"] == "running":
            metadata["status"] = "failed"
        metadata["elapsed_seconds"] = round(time.monotonic() - start, 2)
        metrics.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--python", type=Path, required=True)
    parser.add_argument("--checkout", type=Path, required=True)
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--timeout", type=int, default=1800)
    args = parser.parse_args()
    generate(args.python, args.checkout, args.image, args.output, args.timeout)


if __name__ == "__main__":
    main()
