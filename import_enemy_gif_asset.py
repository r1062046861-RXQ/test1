from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps, ImageSequence


Image.MAX_IMAGE_PIXELS = None

ROOT_DIR = Path(__file__).resolve().parent
DEFAULT_SOURCE_DIR = ROOT_DIR / "gif"
DEFAULT_TARGET_GIF = ROOT_DIR / "game" / "public" / "assets" / "cards_enemy" / "93.gif"
DEFAULT_TARGET_POSTER = ROOT_DIR / "game" / "public" / "assets" / "cards_enemy" / "93-poster.png"
DEFAULT_AUDIT_DIR = ROOT_DIR / "output" / "gif-import-report"
DEFAULT_MAX_BYTES = 10_000_000

FRAME_SKIP_STEPS = [1, 2, 3, 4]
WIDTH_STEPS = [600, 540, 480, 420, 360, 300]
COLOR_STEPS = [128, 96, 64, 48, 32]
POSTER_COLOR_STEPS = [None, 256, 192, 128, 96, 64]
POSTER_MAX_BYTES = 400 * 1024

GIF_IMPORT_SPECS = [
    ("热入营血者", "reruyingxue", 79),
    ("肾不纳气者", "shenbunaqi", 80),
    ("痰蒙心窍者", "tanmengxinqiao", 83),
    ("阳明腑实者", "yangmingfushi", 84),
    ("风寒客", "wind_cold_guest", 89),
    ("风热袭", "wind_heat_attack", 90),
    ("湿浊缠", "damp_turbidity", 91),
    ("外感合病", "external_combination", 92),
    ("风寒束表", "boss_wind_cold", 93),
    ("肝火炽盛", "boss_liver_fire", 94),
    ("气滞血瘀者", "qi_blood_stasis", 95),
    ("脾虚湿盛者", "spleen_dampness", 96),
    ("心神不交者", "heart_kidney_gap", 97),
    ("痰瘀互结", "phlegm_stasis", 98),
    ("脾虚湿困", "boss_spleen_damp", 99),
    ("冲任不固者", "chong_ren_instability", 101),
    ("厥阴复杂症", "jueyin_complex", 102),
    ("五行失调", "boss_five_elements", 103),
]

GIF_IMPORT_MAP = {name: {"enemyId": enemy_id, "slot": slot} for name, enemy_id, slot in GIF_IMPORT_SPECS}


@dataclass(frozen=True)
class GifCandidate:
    data: bytes
    size: tuple[int, int]
    width: int
    height: int
    colors: int
    frame_skip: int
    frame_count: int
    total_duration_ms: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import enemy GIF assets under a size budget and emit poster frames.",
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE_DIR,
        help="Source GIF file, or a directory containing one or more mapped GIF files.",
    )
    parser.add_argument("--target-gif", type=Path, default=DEFAULT_TARGET_GIF, help="Output GIF path for single-file mode.")
    parser.add_argument(
        "--target-poster",
        type=Path,
        default=DEFAULT_TARGET_POSTER,
        help="Output poster PNG path for single-file mode.",
    )
    parser.add_argument("--audit-dir", type=Path, default=DEFAULT_AUDIT_DIR, help="Manifest output directory.")
    parser.add_argument("--max-bytes", type=int, default=DEFAULT_MAX_BYTES, help="Maximum GIF size in bytes.")
    return parser.parse_args()


def resolve_single_source(source: Path) -> Path:
    if source.is_file():
        return source

    gif_files = sorted(path for path in source.glob("*.gif") if path.is_file())
    if len(gif_files) != 1:
        raise FileNotFoundError(f"Expected exactly one GIF in {source}, found {len(gif_files)}.")
    return gif_files[0]


def resolve_batch_sources(source: Path) -> list[tuple[str, Path, str, int]]:
    if not source.is_dir():
        raise FileNotFoundError(f"Batch mode requires a directory source, got {source}.")

    gif_files = {path.stem: path for path in source.glob("*.gif") if path.is_file()}
    unexpected = sorted(name for name in gif_files if name not in GIF_IMPORT_MAP)
    if unexpected:
        raise RuntimeError(f"Found unexpected GIF files with no slot mapping: {unexpected}")

    missing = sorted(name for name in GIF_IMPORT_MAP if name not in gif_files)
    if missing:
        raise RuntimeError(f"Missing expected mapped GIF files: {missing}")

    return [
        (name, gif_files[name], GIF_IMPORT_MAP[name]["enemyId"], GIF_IMPORT_MAP[name]["slot"])
        for name, _, _ in GIF_IMPORT_SPECS
    ]


def load_frames(source: Path) -> tuple[list[Image.Image], list[int], tuple[int, int]]:
    with Image.open(source) as image:
        size = image.size
        frames = [ImageOps.exif_transpose(frame).convert("RGBA").copy() for frame in ImageSequence.Iterator(image)]
        durations = [frame.info.get("duration", 40) or 40 for frame in ImageSequence.Iterator(image)]
    return frames, durations, size


def resize_frame(frame: Image.Image, width: int) -> Image.Image:
    if frame.width <= width:
        return frame.copy()
    target_height = max(1, int(round(frame.height * (width / frame.width))))
    return frame.resize((width, target_height), Image.Resampling.LANCZOS)


def encode_gif(frames: list[Image.Image], durations: list[int], colors: int) -> bytes:
    quantized_frames = [frame.convert("P", palette=Image.Palette.ADAPTIVE, colors=colors) for frame in frames]
    buffer = BytesIO()
    quantized_frames[0].save(
        buffer,
        format="GIF",
        save_all=True,
        append_images=quantized_frames[1:],
        duration=durations,
        loop=0,
        optimize=True,
        disposal=2,
    )
    return buffer.getvalue()


def encode_png(image: Image.Image, colors: int | None) -> bytes:
    working = image.convert("RGBA")
    if colors is not None:
        working = working.quantize(
            colors=colors,
            method=Image.Quantize.FASTOCTREE,
            dither=Image.Dither.FLOYDSTEINBERG,
        )
    buffer = BytesIO()
    working.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


def build_candidate(frames: list[Image.Image], durations: list[int], width: int, colors: int, frame_skip: int) -> GifCandidate:
    sampled_frames: list[Image.Image] = []
    sampled_durations: list[int] = []

    for index in range(0, len(frames), frame_skip):
        sampled_frames.append(resize_frame(frames[index], width))
        sampled_durations.append(sum(durations[index : index + frame_skip]))

    data = encode_gif(sampled_frames, sampled_durations, colors)
    size = sampled_frames[0].size
    return GifCandidate(
        data=data,
        size=size,
        width=size[0],
        height=size[1],
        colors=colors,
        frame_skip=frame_skip,
        frame_count=len(sampled_frames),
        total_duration_ms=sum(sampled_durations),
    )


def pick_candidate(frames: list[Image.Image], durations: list[int], max_bytes: int) -> GifCandidate:
    for width in WIDTH_STEPS:
        for colors in COLOR_STEPS:
            for frame_skip in FRAME_SKIP_STEPS:
                candidate = build_candidate(frames, durations, width, colors, frame_skip)
                if len(candidate.data) <= max_bytes:
                    return candidate

    raise RuntimeError(f"Could not compress GIF below {max_bytes} bytes.")


def pick_poster_bytes(frame: Image.Image, target_width: int, max_bytes: int) -> tuple[bytes, tuple[int, int], int | None]:
    resized = resize_frame(frame, target_width)
    best_bytes: bytes | None = None
    best_colors: int | None = None

    for colors in POSTER_COLOR_STEPS:
        data = encode_png(resized, colors)
        if len(data) <= max_bytes:
            best_bytes = data
            best_colors = colors
            break

    if best_bytes is None:
        best_bytes = encode_png(resized, 64)
        best_colors = 64

    return best_bytes, resized.size, best_colors


def target_gif_path(slot: int) -> Path:
    return ROOT_DIR / "game" / "public" / "assets" / "cards_enemy" / f"{slot}.gif"


def target_poster_path(slot: int) -> Path:
    return ROOT_DIR / "game" / "public" / "assets" / "cards_enemy" / f"{slot}-poster.png"


def write_manifest(
    *,
    source_path: Path,
    target_gif: Path,
    target_poster: Path,
    audit_dir: Path,
    max_bytes: int,
    source_size: tuple[int, int],
    candidate: GifCandidate,
    poster_bytes: bytes,
    poster_size: tuple[int, int],
    poster_colors: int | None,
    enemy_id: str | None = None,
    slot: int | None = None,
) -> tuple[dict[str, object], Path]:
    manifest = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "sourceFile": str(source_path),
        "targetGif": str(target_gif),
        "targetPoster": str(target_poster),
        "sourceBytes": source_path.stat().st_size,
        "gifBytes": len(candidate.data),
        "posterBytes": len(poster_bytes),
        "sourceSize": {"width": source_size[0], "height": source_size[1]},
        "gifSize": {"width": candidate.width, "height": candidate.height},
        "posterSize": {"width": poster_size[0], "height": poster_size[1]},
        "gifCandidate": {
            "size": {"width": candidate.width, "height": candidate.height},
            "colors": candidate.colors,
            "frameSkip": candidate.frame_skip,
            "frameCount": candidate.frame_count,
            "totalDurationMs": candidate.total_duration_ms,
            "gifBytes": len(candidate.data),
        },
        "posterColors": poster_colors,
        "maxGifBytes": max_bytes,
    }
    if enemy_id is not None:
        manifest["enemyId"] = enemy_id
    if slot is not None:
        manifest["slot"] = slot

    manifest_path = audit_dir / f"{target_gif.stem}.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest, manifest_path


def import_one(
    *,
    source_path: Path,
    target_gif: Path,
    target_poster: Path,
    audit_dir: Path,
    max_bytes: int,
    enemy_id: str | None = None,
    slot: int | None = None,
) -> dict[str, object]:
    frames, durations, source_size = load_frames(source_path)
    candidate = pick_candidate(frames, durations, max_bytes)
    poster_bytes, poster_size, poster_colors = pick_poster_bytes(frames[0], candidate.width, POSTER_MAX_BYTES)

    target_gif.parent.mkdir(parents=True, exist_ok=True)
    target_poster.parent.mkdir(parents=True, exist_ok=True)
    audit_dir.mkdir(parents=True, exist_ok=True)

    target_gif.write_bytes(candidate.data)
    target_poster.write_bytes(poster_bytes)

    manifest, manifest_path = write_manifest(
        source_path=source_path,
        target_gif=target_gif,
        target_poster=target_poster,
        audit_dir=audit_dir,
        max_bytes=max_bytes,
        source_size=source_size,
        candidate=candidate,
        poster_bytes=poster_bytes,
        poster_size=poster_size,
        poster_colors=poster_colors,
        enemy_id=enemy_id,
        slot=slot,
    )

    return {
        "source": str(source_path),
        "enemyId": enemy_id,
        "slot": slot,
        "targetGif": str(target_gif),
        "targetPoster": str(target_poster),
        "gifBytes": len(candidate.data),
        "posterBytes": len(poster_bytes),
        "gifSize": {"width": candidate.width, "height": candidate.height},
        "frameSkip": candidate.frame_skip,
        "colors": candidate.colors,
        "frameCount": candidate.frame_count,
        "manifest": str(manifest_path),
        "sourceBytes": manifest["sourceBytes"],
    }


def run_single(args: argparse.Namespace) -> None:
    source_path = resolve_single_source(args.source)
    result = import_one(
        source_path=source_path,
        target_gif=args.target_gif,
        target_poster=args.target_poster,
        audit_dir=args.audit_dir,
        max_bytes=args.max_bytes,
    )
    print(json.dumps(result, ensure_ascii=False))


def run_batch(args: argparse.Namespace) -> None:
    specs = resolve_batch_sources(args.source)
    args.audit_dir.mkdir(parents=True, exist_ok=True)

    results = []
    for source_name, source_path, enemy_id, slot in specs:
        results.append(
            import_one(
                source_path=source_path,
                target_gif=target_gif_path(slot),
                target_poster=target_poster_path(slot),
                audit_dir=args.audit_dir,
                max_bytes=args.max_bytes,
                enemy_id=enemy_id,
                slot=slot,
            )
        )

    batch_manifest = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "sourceDirectory": str(args.source),
        "maxGifBytes": args.max_bytes,
        "count": len(results),
        "items": results,
    }
    batch_manifest_path = args.audit_dir / "batch-summary.json"
    batch_manifest_path.write_text(json.dumps(batch_manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        json.dumps(
            {
                "count": len(results),
                "sourceDirectory": str(args.source),
                "summaryManifest": str(batch_manifest_path),
                "items": results,
            },
            ensure_ascii=False,
        )
    )


def main() -> None:
    args = parse_args()

    if args.source.is_dir():
        gif_files = sorted(path for path in args.source.glob("*.gif") if path.is_file())
        if len(gif_files) > 1:
            run_batch(args)
            return

    run_single(args)


if __name__ == "__main__":
    main()
