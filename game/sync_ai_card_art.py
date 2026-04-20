from __future__ import annotations

import argparse
import csv
import json
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable

from PIL import Image


SOURCE_DIR = Path("C:/Users/C2H6O/Desktop/wechatgame/ai卡牌")
TARGET_DIR = Path("C:/Users/C2H6O/Desktop/wechatgame/game/public/assets/cards_player")
AUDIT_DIR = Path("C:/Users/C2H6O/Desktop/wechatgame/output/ai-card-sync")

TARGET_SIZE = (450, 600)
EXTENSION = ".png"
PREFERRED_VARIANTS = {
    1: "01陈皮2.png",
    16: "16百合2.png",
}


@dataclass(frozen=True)
class SyncRecord:
    slot: int
    source_file: str
    target_file: str
    source_size: tuple[int, int]
    output_size: tuple[int, int]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Resize AI card art into runtime assets.")
    parser.add_argument("--source", type=Path, default=SOURCE_DIR, help="Directory containing the AI-generated PNGs.")
    parser.add_argument("--target", type=Path, default=TARGET_DIR, help="Directory to receive runtime card art PNGs.")
    parser.add_argument("--audit", type=Path, default=AUDIT_DIR, help="Directory for audit manifests.")
    return parser.parse_args()


def slot_from_name(name: str) -> int | None:
    prefix = name[:2]
    if not prefix.isdigit():
        return None
    return int(prefix)


def collect_source_groups(source_dir: Path) -> dict[int, list[Path]]:
    grouped: dict[int, list[Path]] = {}
    for path in sorted(source_dir.glob(f"*{EXTENSION}")):
        slot = slot_from_name(path.name)
        if slot is None:
            continue
        grouped.setdefault(slot, []).append(path)

    return dict(sorted(grouped.items()))


def discover_sources(source_dir: Path) -> dict[int, Path]:
    grouped = collect_source_groups(source_dir)

    chosen: dict[int, Path] = {}
    for slot, paths in grouped.items():
        preferred_name = PREFERRED_VARIANTS.get(slot)
        if preferred_name:
            preferred_path = next((path for path in paths if path.name == preferred_name), None)
            if preferred_path is None:
                raise FileNotFoundError(f"Preferred variant {preferred_name} was not found for slot {slot}.")
            chosen[slot] = preferred_path
            continue

        chosen[slot] = paths[-1]

    return dict(sorted(chosen.items()))


def contain_on_canvas(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    image = image.convert("RGBA")
    contained = image.copy()
    contained.thumbnail(size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    offset = ((size[0] - contained.width) // 2, (size[1] - contained.height) // 2)
    canvas.paste(contained, offset, contained)
    return canvas


def export_assets(source_map: dict[int, Path], target_dir: Path) -> list[SyncRecord]:
    target_dir.mkdir(parents=True, exist_ok=True)
    records: list[SyncRecord] = []

    for slot, source_path in source_map.items():
        with Image.open(source_path) as image:
            source_size = image.size
            rendered = contain_on_canvas(image, TARGET_SIZE)
            target_path = target_dir / f"{slot}{EXTENSION}"
            rendered.save(target_path, format="PNG")
            records.append(
                SyncRecord(
                    slot=slot,
                    source_file=source_path.name,
                    target_file=target_path.name,
                    source_size=source_size,
                    output_size=rendered.size,
                )
            )

    return records


def write_audit(records: Iterable[SyncRecord], audit_dir: Path, source_groups: dict[int, list[Path]]) -> None:
    audit_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().isoformat(timespec="seconds")
    record_list = list(records)
    duplicate_slots = {
        slot: [path.name for path in paths]
        for slot, paths in source_groups.items()
        if len(paths) > 1
    }

    manifest = {
        "generatedAt": timestamp,
        "sourceDirectory": str(SOURCE_DIR),
        "targetDirectory": str(TARGET_DIR),
        "targetSize": list(TARGET_SIZE),
        "sourceFileCount": sum(len(paths) for paths in source_groups.values()),
        "uniqueSlotCount": len(source_groups),
        "outputSlotCount": len(record_list),
        "duplicateSlots": duplicate_slots,
        "records": [asdict(record) for record in record_list],
    }
    (audit_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    with (audit_dir / "manifest.csv").open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.writer(handle)
        writer.writerow(["slot", "source_file", "target_file", "source_width", "source_height", "output_width", "output_height"])
        for record in record_list:
            writer.writerow(
                [
                    record.slot,
                    record.source_file,
                    record.target_file,
                    record.source_size[0],
                    record.source_size[1],
                    record.output_size[0],
                    record.output_size[1],
                ]
            )


def main() -> None:
    args = parse_args()
    source_groups = collect_source_groups(args.source)
    source_map = discover_sources(args.source)
    records = export_assets(source_map, args.target)
    write_audit(records, args.audit, source_groups)
    print(
        f"Synced {sum(len(paths) for paths in source_groups.values())} source files "
        f"into {len(records)} runtime slots at {args.target}"
    )


if __name__ == "__main__":
    main()
