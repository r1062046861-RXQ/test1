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
DEFAULT_MAX_BYTES = 5_000_000

FRAME_SKIP_STEPS = [1, 2, 3, 4]
WIDTH_STEPS = [600, 540, 480, 420, 360, 300]
COLOR_STEPS = [128, 96, 64, 48, 32]
POSTER_COLOR_STEPS = [None, 256, 192, 128, 96, 64]
POSTER_MAX_BYTES = 400 * 1024


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
    parser = argparse.ArgumentParser(description="Import one enemy GIF under a size budget and emit a poster frame.")
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE_DIR,
        help="Source GIF file, or a directory containing exactly one GIF.",
    )
    parser.add_argument("--target-gif", type=Path, default=DEFAULT_TARGET_GIF, help="Output GIF path.")
    parser.add_argument("--target-poster", type=Path, default=DEFAULT_TARGET_POSTER, help="Output poster PNG path.")
    parser.add_argument("--audit-dir", type=Path, default=DEFAULT_AUDIT_DIR, help="Manifest output directory.")
    parser.add_argument("--max-bytes", type=int, default=DEFAULT_MAX_BYTES, help="Maximum GIF size in bytes.")
    return parser.parse_args()


def resolve_source(source: Path) -> Path:
    if source.is_file():
        return source
    gif_files = sorted(path for path in source.glob("*.gif") if path.is_file())
    if len(gif_files) != 1:
        raise FileNotFoundError(f"Expected exactly one GIF in {source}, found {len(gif_files)}.")
    return gif_files[0]


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
        sampled_durations.append(sum(durations[index:index + frame_skip]))

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


def candidate_rank(candidate: GifCandidate) -> tuple[int, int, int, int, int]:
    return (
        candidate.width,
        candidate.height,
        candidate.colors,
        -candidate.frame_skip,
        candidate.frame_count,
    )


def pick_candidate(frames: list[Image.Image], durations: list[int], max_bytes: int) -> GifCandidate:
    viable_candidates: list[GifCandidate] = []

    for frame_skip in FRAME_SKIP_STEPS:
        for width in WIDTH_STEPS:
            for colors in COLOR_STEPS:
                candidate = build_candidate(frames, durations, width, colors, frame_skip)
                if len(candidate.data) <= max_bytes:
                    viable_candidates.append(candidate)

    if not viable_candidates:
        raise RuntimeError(f"Could not compress GIF below {max_bytes} bytes.")

    return max(viable_candidates, key=candidate_rank)


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


def main() -> None:
    args = parse_args()
    source_path = resolve_source(args.source)
    frames, durations, source_size = load_frames(source_path)
    candidate = pick_candidate(frames, durations, args.max_bytes)
    poster_bytes, poster_size, poster_colors = pick_poster_bytes(frames[0], candidate.width, POSTER_MAX_BYTES)

    args.target_gif.parent.mkdir(parents=True, exist_ok=True)
    args.target_poster.parent.mkdir(parents=True, exist_ok=True)
    args.audit_dir.mkdir(parents=True, exist_ok=True)

    args.target_gif.write_bytes(candidate.data)
    args.target_poster.write_bytes(poster_bytes)

    manifest = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "sourceFile": str(source_path),
        "targetGif": str(args.target_gif),
        "targetPoster": str(args.target_poster),
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
        "maxGifBytes": args.max_bytes,
    }

    manifest_path = args.audit_dir / f"{args.target_gif.stem}.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        json.dumps(
            {
                "source": str(source_path),
                "targetGif": str(args.target_gif),
                "targetPoster": str(args.target_poster),
                "gifBytes": len(candidate.data),
                "posterBytes": len(poster_bytes),
                "gifSize": candidate.size,
                "frameSkip": candidate.frame_skip,
                "colors": candidate.colors,
                "frameCount": candidate.frame_count,
                "manifest": str(manifest_path),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
