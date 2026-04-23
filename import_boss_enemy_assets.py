from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageOps


Image.MAX_IMAGE_PIXELS = None

ROOT_DIR = Path(__file__).resolve().parent
DEFAULT_SOURCE_DIR = ROOT_DIR / "boss" / "boss"
DEFAULT_AUDIT_DIR = ROOT_DIR / "output" / "boss-enemy-import-report"
ENEMY_TARGET_DIR = ROOT_DIR / "game" / "public" / "assets" / "cards_enemy"

CARD_THRESHOLD = 400 * 1024
COLOR_STEPS = [224, 192, 160, 128, 96]
LONG_EDGE_STEPS = [1536, 1280, 1024, 900, 840, 768, 640]

TARGETS = {
    "89风寒客": ("wind_cold_guest", "89.png"),
    "90风热袭": ("wind_heat_attack", "90.png"),
    "91湿浊缠": ("damp_turbidity", "91.png"),
    "外感合病": ("external_combination", "92.png"),
    "脾虚湿盛者": ("spleen_dampness", "96.png"),
    "痰瘀互结": ("phlegm_stasis", "98.png"),
    "阴阳离决者": ("yin_yang_split", "100.png"),
    "厥阴复杂症": ("jueyin_complex", "102.png"),
    "五行失调": ("boss_five_elements", "103.png"),
}

CHARACTER_NORMALIZATION = str.maketrans(
    {
        "淤": "瘀",
        "決": "决",
    }
)


@dataclass(frozen=True)
class ImportRecord:
    source_file: str
    target_enemy_id: str
    target_file: str
    source_size: tuple[int, int]
    output_size: tuple[int, int]
    source_bytes: int
    output_bytes: int
    threshold_bytes: int
    colors: int | None
    long_edge: int


@dataclass(frozen=True)
class Candidate:
    data: bytes
    size: tuple[int, int]
    colors: int | None
    long_edge: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import and compress boss enemy portrait assets.")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE_DIR, help="Directory containing boss enemy PNGs.")
    parser.add_argument("--audit", type=Path, default=DEFAULT_AUDIT_DIR, help="Directory for import manifests.")
    return parser.parse_args()


def normalize_stem(path: Path) -> str:
    stem = path.stem.translate(CHARACTER_NORMALIZATION)
    stem = re.sub(r"\s+", "", stem)
    stem = stem.replace(".", "")
    stem = stem.replace("（", "(").replace("）", ")")
    return stem


def load_image(path: Path) -> Image.Image:
    with Image.open(path) as source:
        image = ImageOps.exif_transpose(source)
        return image.copy()


def encode_png(image: Image.Image, colors: int | None) -> bytes:
    working = image.convert("RGBA")
    if colors is not None:
        working = working.quantize(
            colors=colors,
            method=Image.Quantize.FASTOCTREE,
            dither=Image.Dither.FLOYDSTEINBERG,
        )

    from io import BytesIO

    buffer = BytesIO()
    working.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


def resize_to_long_edge(image: Image.Image, target_long_edge: int) -> Image.Image:
    current_long_edge = max(image.size)
    if current_long_edge <= target_long_edge:
        return image.copy()

    scale = target_long_edge / current_long_edge
    new_size = (
        max(1, int(round(image.width * scale))),
        max(1, int(round(image.height * scale))),
    )
    return image.resize(new_size, Image.Resampling.LANCZOS)


def build_candidates(image: Image.Image) -> list[Candidate]:
    candidates: list[Candidate] = []
    seen: set[tuple[tuple[int, int], int | None]] = set()

    def add_candidate(candidate_image: Image.Image, colors: int | None) -> None:
        key = (candidate_image.size, colors)
        if key in seen:
            return
        seen.add(key)
        candidates.append(
            Candidate(
                data=encode_png(candidate_image, colors),
                size=candidate_image.size,
                colors=colors,
                long_edge=max(candidate_image.size),
            )
        )

    add_candidate(image, None)
    for colors in COLOR_STEPS:
        add_candidate(image, colors)

    for target_long_edge in LONG_EDGE_STEPS:
        resized = resize_to_long_edge(image, target_long_edge)
        if resized.size == image.size:
            continue
        add_candidate(resized, None)
        for colors in COLOR_STEPS:
            add_candidate(resized, colors)

    return candidates


def pick_best_candidate(image: Image.Image) -> Candidate:
    original = Candidate(
        data=encode_png(image, None),
        size=image.size,
        colors=None,
        long_edge=max(image.size),
    )
    best_any = original
    best_under_threshold: Candidate | None = original if len(original.data) <= CARD_THRESHOLD else None

    for candidate in build_candidates(image):
        if len(candidate.data) < len(best_any.data):
            best_any = candidate
        if len(candidate.data) <= CARD_THRESHOLD and (
            best_under_threshold is None or len(candidate.data) < len(best_under_threshold.data)
        ):
            best_under_threshold = candidate

    chosen = best_under_threshold or best_any
    if len(chosen.data) > CARD_THRESHOLD:
        raise RuntimeError(
            f"Could not compress image below {CARD_THRESHOLD} bytes; best result was {len(chosen.data)} bytes."
        )
    return chosen


def collect_sources(source_dir: Path) -> dict[str, Path]:
    normalized_sources: dict[str, Path] = {}
    for source_path in sorted(source_dir.glob("*.png")):
        if not source_path.is_file():
            continue
        normalized = normalize_stem(source_path)
        normalized_sources[normalized] = source_path
    return normalized_sources


def import_enemy_portraits(source_dir: Path) -> list[ImportRecord]:
    ENEMY_TARGET_DIR.mkdir(parents=True, exist_ok=True)
    normalized_sources = collect_sources(source_dir)
    missing = sorted(set(TARGETS) - set(normalized_sources))
    if missing:
        raise FileNotFoundError(f"Missing source images for normalized keys: {missing}")

    records: list[ImportRecord] = []
    for source_key, (enemy_id, target_name) in TARGETS.items():
        source_path = normalized_sources[source_key]
        image = load_image(source_path)
        candidate = pick_best_candidate(image)
        target_path = ENEMY_TARGET_DIR / target_name
        target_path.write_bytes(candidate.data)
        records.append(
            ImportRecord(
                source_file=source_path.name,
                target_enemy_id=enemy_id,
                target_file=target_path.name,
                source_size=image.size,
                output_size=candidate.size,
                source_bytes=source_path.stat().st_size,
                output_bytes=len(candidate.data),
                threshold_bytes=CARD_THRESHOLD,
                colors=candidate.colors,
                long_edge=candidate.long_edge,
            )
        )

    return records


def write_audit(records: list[ImportRecord], audit_dir: Path, source_dir: Path) -> None:
    audit_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "sourceDirectory": str(source_dir),
        "thresholdBytes": CARD_THRESHOLD,
        "records": [asdict(record) for record in records],
    }
    (audit_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    args = parse_args()
    if not args.source.exists():
        raise FileNotFoundError(f"Source directory does not exist: {args.source}")

    records = import_enemy_portraits(args.source)
    write_audit(records, args.audit, args.source)
    print(f"Imported {len(records)} boss enemy portraits from {args.source}.")


if __name__ == "__main__":
    main()
