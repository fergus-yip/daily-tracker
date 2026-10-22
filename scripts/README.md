# Updater notes

There is no automated script in v1 yet.

## Daily (morning)

1. **Merge** YouTube Tracker and/or X Tracker digests into  
   `data/days/YYYY-MM-DD.json`  
   - `date_hkt` = **morning scan day** (calendar day of the digest); content is the previous HKT day  
   - Optionally set `youtube.content_date_hkt` / keep `x.window_since` for the content window  
   - Omit empty `youtube` / `x` objects when that source has no picks (stay consistent with seeded files)
2. **Refresh** `data/index.json`:
   - set `updated_at` (ISO, prefer HKT offset)
   - keep `retention_days: 30`
   - set `days` to retained dates, **newest first**
3. **Prune** day files (and index entries) older than 30 days
4. Commit + push to `main` so GitHub Pages picks it up

Do not invent picks for quiet days.

## Weekly (Launch Video Tracker)

1. **Merge** launch digests into `data/weekly/weeks/YYYY-MM-DD.json`  
   - `week_start_hkt` / `week_end_hkt` / `scanned_at_hkt`  
   - `sources.launches.videos[]` with `channel`, `title`, `summary`, `url`, `published_hkt`, and `video_id` (derive from watch URL if missing)
2. **Refresh** `data/weekly/index.json`:
   - set `updated_at` (ISO, prefer HKT offset) — bumping this surfaces the Weekly unread dot until the lane is opened
   - keep `retention_weeks: 26`
   - set `weeks` to retained `week_start_hkt` values, **newest first**
3. **Prune** week files older than 26 weeks
4. Commit + push to `main`

Keep `data/sources.json` in sync if new weekly sources are added.

The daily morning routine does **not** yet merge weekly data — wire Launch Video Tracker separately.
