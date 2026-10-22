# Daily Tracker

Skim-friendly daily update board for Fergus and the team.

**Live site:** https://fergus-yip.github.io/daily-tracker/

Sources:

- **YouTube Tracker** digests
- **X Tracker** digests

No bookmarks / watch-later — just the day’s picks, retained for **30 days**.

## Views

| View | What it shows |
|------|----------------|
| **Today** | Calendar today (HKT scan day) — morning digests of yesterday’s updates, YT + X side by side |
| **By day** | Day list, newest first; open a day for both sources |
| **Search** | Filter retained days by title / summary / channel / @handle |
| **YouTube** | Filter by channel |
| **X** | Filter Watch list vs Trendy, or by handle |

Cards show title (link), one-line summary, source meta, and date. Quiet days stay empty — nothing is invented.

## Data

Committed under `/data`:

- `data/index.json` — `{ updated_at, retention_days, days[] }` (newest first)
- `data/days/YYYY-MM-DD.json` — that day’s YouTube and/or X picks

`date_hkt` on day files is the **morning scan day** (calendar day you open the board); content is the previous HKT day. Optional `youtube.content_date_hkt` / `x.window_since` record the content window.

Site is a static SPA (`index.html` + `assets/`) that `fetch`es those JSON files. Works on GitHub Pages (see `.nojekyll`).

## Morning updates

Each morning, merge bot digest pushes into `data/days/YYYY-MM-DD.json`, refresh `data/index.json` (`updated_at` + `days` newest-first), and prune files older than 30 days. See [`scripts/README.md`](scripts/README.md).

## Enable GitHub Pages (one-time)

If the site is not live yet:

1. Repo **Settings** → **Pages**
2. **Build and deployment** → **Source:** Deploy from a branch
3. **Branch:** `main` → folder `/ (root)` → Save

Expected URL: https://fergus-yip.github.io/daily-tracker/

## Stack

Vanilla HTML / CSS / JS. No build step, no npm.
