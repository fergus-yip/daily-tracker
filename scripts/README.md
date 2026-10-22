# Morning updater notes

There is no automated script in v1 yet. The morning pass should:

1. **Merge** YouTube Tracker and/or X Tracker digests into  
   `data/days/YYYY-MM-DD.json`  
   - YouTube: use the **content** day as `date_hkt`  
   - X: use the **digest** day as `date_hkt`  
   - Omit empty `youtube` / `x` objects when that source has no picks (stay consistent with seeded files)
2. **Refresh** `data/index.json`:
   - set `updated_at` (ISO, prefer HKT offset)
   - keep `retention_days: 30`
   - set `days` to retained dates, **newest first**
3. **Prune** day files (and index entries) older than 30 days
4. Commit + push to `main` so GitHub Pages picks it up

Do not invent picks for quiet days.
