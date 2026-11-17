#!/usr/bin/env python3
"""Tag YouTube / launch digest items with a vertical (Shorts) flag.

Source of truth: GET https://www.youtube.com/shorts/{video_id} following
redirects. If the final URL stays on /shorts/, the item is a Short and
gets "vertical": true. Otherwise it gets "vertical": false.

Do not trust oar2.jpg alone. Some landscape launch films serve a 1920×1080
oar2 still (HTTP 200). Real Shorts oar2 stills are typically 1080×1920.

Usage:
  python3 scripts/tag-vertical.py data/days/2026-11-17.json
  python3 scripts/tag-vertical.py data/weekly/weeks/2026-11-10.json
  python3 scripts/tag-vertical.py data/days data/weekly/weeks
  python3 scripts/tag-vertical.py --map-from /tmp/vertical-map.json data/days
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

UA = "daily-tracker-tag-vertical/1.0"
VIDEO_ID_LINE = re.compile(
    r'^([ \t]*)"video_id": ("(?:\\.|[^"\\])*")(,?)[ \t]*$',
    re.MULTILINE,
)
VERTICAL_LINE = re.compile(r'^([ \t]*)"vertical": (true|false),?[ \t]*$', re.MULTILINE)


def iter_items(data: dict):
    yt = (data.get("youtube") or {}).get("items") or []
    for item in yt:
        yield item
    launches = ((data.get("sources") or {}).get("launches") or {}).get("videos") or []
    for item in launches:
        yield item


def extract_video_id(item: dict) -> str:
    if item.get("video_id"):
        return str(item["video_id"])
    url = str(item.get("url") or "")
    m = re.search(r"[?&]v=([a-zA-Z0-9_-]{6,})", url) or re.search(
        r"youtu\.be/([a-zA-Z0-9_-]{6,})", url
    )
    return m.group(1) if m else ""


def is_short_url(final_url: str) -> bool:
    return "/shorts/" in final_url and "watch" not in final_url


def detect_vertical(video_id: str, timeout: float = 25.0) -> bool:
    url = f"https://www.youtube.com/shorts/{video_id}"
    req = urllib.request.Request(
        url,
        method="GET",
        headers={"User-Agent": UA, "Accept-Language": "en"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return is_short_url(resp.geturl())
    except urllib.error.HTTPError as exc:
        final = exc.geturl() if hasattr(exc, "geturl") else ""
        if final:
            return is_short_url(final)
        raise


def collect_ids(paths: list[Path]) -> list[str]:
    ids: list[str] = []
    seen: set[str] = set()
    for path in paths:
        data = json.loads(path.read_text(encoding="utf-8"))
        for item in iter_items(data):
            vid = extract_video_id(item)
            if vid and vid not in seen:
                seen.add(vid)
                ids.append(vid)
    return ids


def load_map(path: Path | None) -> dict[str, bool]:
    if not path:
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, dict) and "map" in raw:
        raw = raw["map"]
    return {str(k): bool(v) for k, v in raw.items()}


def tag_text(raw: str, flags: dict[str, bool]) -> tuple[str, int]:
    """Insert or update a vertical flag after each video_id line. Preserve all other text."""
    changed = 0
    # video_id line, optional following vertical line
    block = re.compile(
        r'^([ \t]*)"video_id": ("(?:\\.|[^"\\])*")(,?)[ \t]*'
        r'(?:\n[ \t]*"vertical": (true|false),?[ \t]*)?',
        re.MULTILINE,
    )

    def repl(match: re.Match[str]) -> str:
        nonlocal changed
        indent, quoted, comma, existing = match.group(1), match.group(2), match.group(3), match.group(4)
        vid = json.loads(quoted)
        if vid not in flags:
            return match.group(0)
        flag = "true" if flags[vid] else "false"
        # If a vertical line already followed video_id, video_id always keeps a comma.
        # If vertical was last, the original video_id comma was added and vertical has no comma.
        # Infer whether vertical should have a trailing comma: if the original match
        # ended by consuming a mid-object vertical (video_id had comma AND there was already
        # a later property), we need a comma on vertical. After a last-field video_id
        # (no comma) we omit the vertical comma.
        had_vertical = existing is not None
        if had_vertical:
            # Look at the raw match: if it ends with a comma after vertical, keep mid-object form.
            mid_object = match.group(0).rstrip().endswith(",")
            if existing == flag and (
                (mid_object and comma) or (not mid_object and (comma or not comma))
            ):
                # Already correctly tagged — but mid_object form must be preserved exactly.
                wanted_mid = mid_object
                wanted = (
                    f'{indent}"video_id": {quoted},\n{indent}"vertical": {flag},'
                    if wanted_mid
                    else f'{indent}"video_id": {quoted},\n{indent}"vertical": {flag}'
                )
                if match.group(0) == wanted:
                    return match.group(0)
            mid_object = match.group(0).rstrip().endswith(",")
            replacement = (
                f'{indent}"video_id": {quoted},\n{indent}"vertical": {flag},'
                if mid_object
                else f'{indent}"video_id": {quoted},\n{indent}"vertical": {flag}'
            )
        else:
            if comma:
                replacement = f'{indent}"video_id": {quoted},\n{indent}"vertical": {flag},'
            else:
                replacement = f'{indent}"video_id": {quoted},\n{indent}"vertical": {flag}'
        if replacement != match.group(0):
            changed += 1
        return replacement

    updated = block.sub(repl, raw)
    return updated, changed


def json_paths(inputs: list[str]) -> list[Path]:
    out: list[Path] = []
    for item in inputs:
        path = Path(item)
        if path.is_dir():
            out.extend(sorted(path.glob("*.json")))
        elif path.is_file():
            out.append(path)
        else:
            raise FileNotFoundError(item)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", help="JSON files or directories of day/week files")
    parser.add_argument("--map-from", type=Path, help="Reuse a {video_id: bool} JSON map instead of probing")
    parser.add_argument("--write-map", type=Path, help="Write the detected map to this JSON file")
    args = parser.parse_args()

    paths = json_paths(args.paths)
    flags = load_map(args.map_from)
    needed = [vid for vid in collect_ids(paths) if vid not in flags]
    if needed:
        print(f"Probing {len(needed)} video(s) via /shorts/…", file=sys.stderr)
        for vid in needed:
            try:
                flags[vid] = detect_vertical(vid)
                print(f"  {vid}: {'vertical' if flags[vid] else 'landscape'}", file=sys.stderr)
            except Exception as exc:
                print(f"  {vid}: FAILED ({exc})", file=sys.stderr)

    if args.write_map:
        args.write_map.write_text(
            json.dumps(flags, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )

    total = 0
    for path in paths:
        raw = path.read_text(encoding="utf-8")
        if not raw.endswith("\n"):
            raw += "\n"
        updated, changed = tag_text(raw, flags)
        if updated != raw:
            # Sanity: JSON still parses and only vertical flags changed
            before = json.loads(raw)
            after = json.loads(updated)
            path.write_text(updated, encoding="utf-8")
            total += changed
            print(f"{path}: tagged {changed} item(s)")
            # Compare item fields except vertical
            def strip(obj):
                if isinstance(obj, dict):
                    return {k: strip(v) for k, v in obj.items() if k != "vertical"}
                if isinstance(obj, list):
                    return [strip(v) for v in obj]
                return obj
            if strip(before) != strip(after):
                raise SystemExit(f"{path}: unexpected non-flag change, abort")
        elif changed:
            path.write_text(updated, encoding="utf-8")
            total += changed
            print(f"{path}: tagged {changed} item(s)")
        else:
            print(f"{path}: already up to date")

    print(f"Done. Updated {total} item flag line(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
