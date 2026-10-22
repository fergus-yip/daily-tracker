# Daily Tracker

Skim-friendly digest board for Fergus and the team.

**Live site:** https://fergus-yip.github.io/daily-tracker/

## Cadence

Top switch: **Daily** | **Weekly**.

### Daily sources

- **YouTube Tracker** digests
- **X Tracker** digests

Retained for **30 days**. No bookmarks / watch-later — just the day’s picks.

### Weekly sources

- **Launch Video Tracker** (Launches)

Retained for **26 weeks**.

## Daily views

| View | What it shows |
|------|----------------|
| **Today** | Calendar today (HKT scan day) — morning digests of yesterday’s updates, YT + X side by side |
| **By day** | Day list, newest first; open a day for both sources |
| **Search** | Filter retained days by title / summary / channel / @handle |
| **YouTube** | Filter by channel |
| **X** | Filter Watch list vs Trendy, or by handle |

## Weekly views

| View | What it shows |
|------|----------------|
| **This week** | Newest `week_start_hkt` in the weekly index (or empty state) |
| **By week** | Week list, newest first; open one week |
| **Search** | Filter retained weeks by title / summary / channel |
| **Launches** | Filter launch videos by channel across weeks |

Launch cards reuse the YouTube card pattern (square thumb from `video_id`, full summary, channel chip) and group by channel within a week.

## Unread / new dots

`localStorage` key `dt-last-seen` stores `{ dailyUpdatedAt, weeklyUpdatedAt }` (ISO strings from each index).

- Compare to `data/index.json` `updated_at` (daily) and `data/weekly/index.json` `updated_at` (weekly).
- A small accent dot appears on the **Daily** and/or **Weekly** cadence label when that lane’s index is newer than last-seen.
- Opening a lane (switching to it) marks it seen and clears its dot.

## Data

Committed under `/data`:

### Registry

- `data/sources.json` — daily / weekly source registry

### Daily

- `data/index.json` — `{ updated_at, retention_days, days[] }` (newest first)
- `data/days/YYYY-MM-DD.json` — that day’s YouTube and/or X picks

`date_hkt` on day files is the **morning scan day** (calendar day you open the board); content is the previous HKT day. Optional `youtube.content_date_hkt` / `x.window_since` record the content window.

### Weekly

- `data/weekly/index.json` — `{ updated_at, retention_weeks: 26, weeks: ["YYYY-MM-DD", ...] }` (`weeks` = `week_start_hkt`, newest first)
- `data/weekly/weeks/YYYY-MM-DD.json` — week file with `week_start_hkt`, `week_end_hkt`, `scanned_at_hkt`, and `sources.launches.videos[]`

Site is a static SPA (`index.html` + `assets/`) that `fetch`es those JSON files. Works on GitHub Pages (see `.nojekyll`).

## Morning / weekly updates

- **Daily:** each morning, merge bot digest pushes into `data/days/YYYY-MM-DD.json`, refresh `data/index.json`, prune older than 30 days.
- **Weekly:** merge Launch Video Tracker digests into `data/weekly/weeks/YYYY-MM-DD.json`, refresh `data/weekly/index.json`, prune older than 26 weeks.

See [`scripts/README.md`](scripts/README.md). The morning routine does not yet merge weekly — Launch Video Tracker wiring is separate.

## Enable GitHub Pages (one-time)

If the site is not live yet:

1. Repo **Settings** → **Pages**
2. **Build and deployment** → **Source:** Deploy from a branch
3. **Branch:** `main` → folder `/ (root)` → Save

Expected URL: https://fergus-yip.github.io/daily-tracker/

## Theme

Light-hybrid default (Guides-ish surface: flat white, hairline borders, 8px radius, soft-black active pills). Dark mode is a secondary `prefers-color-scheme: dark` map. Source chroma (YT / X / Launch left rails + chips) and unread sunset dots are preserved. Tracker skim IA is unchanged.

## Stack

Vanilla HTML / CSS / JS. No build step, no npm.
