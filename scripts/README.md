# Morning updater notes

There is no automated script in v1 yet. The morning pass should:

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
