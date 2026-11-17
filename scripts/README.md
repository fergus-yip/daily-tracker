# Updater notes

There is no automated script in v1 yet.

## Daily (morning)

1. **Merge** YouTube Tracker and/or X Tracker digests into  
   `data/days/YYYY-MM-DD.json`  
   - `date_hkt` = **morning scan day** (calendar day of the digest); content is the previous HKT day  
   - Optionally set `youtube.content_date_hkt` / keep `x.window_since` for the content window  
   - Omit empty `youtube` / `x` objects when that source has no picks (stay consistent with seeded files)
   - After merging YouTube items, tag Shorts: `python3 scripts/tag-vertical.py data/days/YYYY-MM-DD.json`
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
   - After merging launch videos, tag Shorts: `python3 scripts/tag-vertical.py data/weekly/weeks/YYYY-MM-DD.json`
2. **Refresh** `data/weekly/index.json`:
   - set `updated_at` (ISO, prefer HKT offset) — bumping this surfaces the Weekly unread dot until the lane is opened
   - keep `retention_weeks: 26`
   - set `weeks` to retained `week_start_hkt` values, **newest first**
3. **Prune** week files older than 26 weeks
4. Commit + push to `main`

Keep `data/sources.json` in sync if new weekly sources are added.

The daily morning routine does **not** yet merge weekly data — wire Launch Video Tracker separately.

## Tag Shorts (`vertical`)

After merging YouTube or launch items, tag each video so the site can use a 9:16 portrait thumb on first paint:

```
python3 scripts/tag-vertical.py data/days/YYYY-MM-DD.json
python3 scripts/tag-vertical.py data/weekly/weeks/YYYY-MM-DD.json
```

The script follows `https://www.youtube.com/shorts/{video_id}` and writes `"vertical": true` if the final URL stays on `/shorts/`, or `"vertical": false` if it redirects to `/watch`. That is the source of truth. Do **not** trust `oar2.jpg` alone: some landscape launch films serve a 1920×1080 `oar2` still (HTTP 200). Real Shorts portrait stills are `https://i.ytimg.com/vi/{id}/oar2.jpg` (typically 1080×1920).

The frontend uses `vertical: true` to render the 9:16 layout and the `oar2.jpg` still immediately. If the flag is missing (older cache), it probes `oar2.jpg` in the browser and only switches to the Shorts layout when that image loads as portrait (height > width).

Do not require a YouTube Tracker or Launch Video Tracker contract change; the Tracker Website tags this at ingest. Leave X items alone. Keep Unicode as real characters when you author new files (the tagger is surgical and will not rewrite existing `\uXXXX` escapes).
