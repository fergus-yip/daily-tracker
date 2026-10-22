(() => {
  "use strict";

  const state = {
    index: null,
    days: new Map(),
    view: "today",
    selectedDay: null,
    searchQuery: "",
    ytChannel: "all",
    xSection: "all",
    xHandle: "all",
  };

  const main = document.getElementById("main");
  const updatedMeta = document.getElementById("updated-meta");

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /** Calendar today as YYYY-MM-DD in Asia/Hong_Kong. */
  function getTodayHkt() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Hong_Kong",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  function formatDateLabel(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.toLocaleDateString("en-HK", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }

  /** Short skim label like "21 Oct" or "Wed 21 Oct" (no year unless needed). */
  function formatShortDate(iso, withWeekday = false) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const opts = withWeekday
      ? { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }
      : { day: "numeric", month: "short", timeZone: "UTC" };
    return dt.toLocaleDateString("en-HK", opts);
  }

  /** Format ISO timestamp as "HH:MM HKT" for header meta. */
  function formatUpdatedHkt(iso) {
    if (!iso) return "";
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return String(iso);
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Hong_Kong",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(dt);
    const hour = parts.find((p) => p.type === "hour")?.value ?? "";
    const minute = parts.find((p) => p.type === "minute")?.value ?? "";
    return `${hour}:${minute} HKT`;
  }

  function ytItems(day) {
    return day?.youtube?.items || [];
  }

  function xWatch(day) {
    return day?.x?.sections?.watch_list || [];
  }

  function xTrendy(day) {
    return day?.x?.sections?.trendy || [];
  }

  function xAll(day) {
    return [...xWatch(day), ...xTrendy(day)];
  }

  function dayHasContent(day) {
    return ytItems(day).length > 0 || xAll(day).length > 0;
  }

  async function loadIndex() {
    const res = await fetch("data/index.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load index (${res.status})`);
    return res.json();
  }

  async function loadDay(date) {
    if (state.days.has(date)) return state.days.get(date);
    const res = await fetch(`data/days/${date}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load ${date} (${res.status})`);
    const json = await res.json();
    state.days.set(date, json);
    return json;
  }

  async function loadAllDays() {
    const dates = state.index?.days || [];
    await Promise.all(dates.map((d) => loadDay(d).catch(() => null)));
  }

  function setView(view) {
    state.view = view;
    document.querySelectorAll(".tab").forEach((btn) => {
      const on = btn.dataset.view === view;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    render();
  }

  function goToDayDetail(date) {
    state.view = "by-day";
    state.selectedDay = date;
    document.querySelectorAll(".tab").forEach((btn) => {
      const on = btn.dataset.view === "by-day";
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    render();
  }

  function ytVideoId(item) {
    if (item.video_id) return String(item.video_id).replace(/[^a-zA-Z0-9_-]/g, "");
    const url = String(item.url || "");
    const m = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/) || url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
    return m ? m[1] : "";
  }

  function ytCard(item, date, opts = {}) {
    const dateSpan = opts.omitDate ? "" : `<span>${esc(formatShortDate(date))}</span>`;
    const vid = ytVideoId(item);
    const thumb = vid
      ? `<img class="card-thumb" src="https://i.ytimg.com/vi/${esc(vid)}/hqdefault.jpg" alt="" loading="lazy" decoding="async" width="160" height="90" />`
      : "";
    return `
      <a class="card source-yt${vid ? " has-thumb" : ""}" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">
        ${thumb}
        <div class="card-body">
          <h3 class="card-title">${esc(item.title)}</h3>
          <p class="card-summary">${esc(item.summary || "")}</p>
          <div class="card-meta">
            <span class="source-chip yt">YT</span>
            <span class="tag">${esc(item.channel || "YouTube")}</span>
            ${dateSpan}
          </div>
        </div>
      </a>`;
  }

  function xCard(item, date, section, opts = {}) {
    const handle = item.handle ? `@${item.handle.replace(/^@/, "")}` : "X";
    const trendyClass = opts.trendy ? " trendy" : "";
    const dateSpan = opts.omitDate ? "" : `<span>${esc(formatShortDate(date))}</span>`;
    return `
      <a class="card source-x${trendyClass}" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">
        <h3 class="card-title">${esc(item.short_title || item.title || "")}</h3>
        <p class="card-summary">${esc(item.summary || "")}</p>
        <div class="card-meta">
          <span class="source-chip x">X</span>
          <span class="tag">${esc(handle)}</span>
          ${section ? `<span>${esc(section)}</span>` : ""}
          ${dateSpan}
        </div>
      </a>`;
  }

  function emptyBlock(msg) {
    return `<p class="empty">${esc(msg)}</p>`;
  }

  function findLatestWith(predicate) {
    for (const date of state.index.days) {
      const day = state.days.get(date);
      if (day && predicate(day)) return { date, day };
    }
    return null;
  }

  function renderXGroups(day, date, { omitSection = true, omitDate = false } = {}) {
    const watch = xWatch(day);
    const trendy = xTrendy(day);
    let html = "";
    if (watch.length) {
      const section = omitSection ? null : "Watch list";
      html += `<p class="group-label">Watch list · ${watch.length}</p>
        <div class="card-list">${watch.map((i) => xCard(i, date, section, { omitDate })).join("")}</div>`;
    }
    if (trendy.length) {
      const section = omitSection ? null : "Trendy";
      const cards = trendy.map((i) => xCard(i, date, section, { trendy: true, omitDate })).join("");
      html += `<details class="trendy-disclosure">
        <summary class="group-label trendy-summary">Trendy (${trendy.length})</summary>
        <div class="card-list trendy">${cards}</div>
      </details>`;
    }
    return html;
  }

  function renderToday() {
    const today = getTodayHkt();
    const hasIndex = (state.index?.days || []).length > 0;
    const day = state.days.get(today) || null;
    const ytToday = day ? ytItems(day) : [];
    const xToday = day ? xAll(day) : [];
    const shortToday = formatShortDate(today);

    const lastYt = findLatestWith((d) => ytItems(d).length > 0);
    const lastX = findLatestWith((d) => xAll(d).length > 0);

    let html = `<div class="section-head">
      <h2>Today</h2>
      <span class="pill">${esc(hasIndex ? formatDateLabel(today) : "No digests yet")}</span>
    </div>
    <p class="meta skim-line">Morning digests · yesterday’s updates</p>
    <div class="today-grid">`;

    // YouTube column — calendar today only
    html += `<section class="panel">
      <div class="section-head">
        <h2>YouTube</h2>
        <span class="pill yt">${ytToday.length} picks</span>
      </div>
      <p class="meta skim-date">${esc(shortToday)}</p>`;
    if (ytToday.length) {
      html += `<div class="card-list">${ytToday.map((i) => ytCard(i, today, { omitDate: true })).join("")}</div>`;
    } else {
      html += emptyBlock("No YouTube picks for today.");
      if (lastYt && lastYt.date !== today) {
        html += `<p class="empty-link"><button type="button" class="text-link" data-goto-day="${esc(lastYt.date)}">Last YT: ${esc(formatShortDate(lastYt.date, true))}</button></p>`;
      }
    }
    html += `</section>`;

    // X column — calendar today only
    const watchToday = day ? xWatch(day) : [];
    const trendyToday = day ? xTrendy(day) : [];
    let xPillLabel;
    if (watchToday.length && trendyToday.length) {
      xPillLabel = `${watchToday.length} watch · ${trendyToday.length} trendy`;
    } else {
      const xCount = day?.x?.pick_count_total ?? xToday.length;
      xPillLabel = `${xCount} picks`;
    }
    html += `<section class="panel">
      <div class="section-head">
        <h2>X</h2>
        <span class="pill x">${esc(xPillLabel)}</span>
      </div>
      <p class="meta skim-date">${esc(shortToday)}</p>`;
    if (xToday.length) {
      html += renderXGroups(day, today, { omitSection: true, omitDate: true });
    } else {
      html += emptyBlock("No X picks for today.");
      if (lastX && lastX.date !== today) {
        html += `<p class="empty-link"><button type="button" class="text-link" data-goto-day="${esc(lastX.date)}">Last X: ${esc(formatShortDate(lastX.date, true))}</button></p>`;
      }
    }
    html += `</section></div>`;
    return html;
  }

  function renderByDayList() {
    const rows = state.index.days.map((date) => {
      const day = state.days.get(date);
      if (!day || !dayHasContent(day)) {
        return `<div class="day-row quiet" aria-disabled="true">
          <span class="date">${esc(formatDateLabel(date))}</span>
          <span class="counts"><span class="pill">quiet</span></span>
        </div>`;
      }
      const yCount = day.youtube?.pick_count ?? ytItems(day).length;
      const xCount = day.x?.pick_count_total ?? xAll(day).length;
      const pills = [];
      if (yCount) pills.push(`<span class="pill yt">YT ${yCount}</span>`);
      if (xCount) pills.push(`<span class="pill x">X ${xCount}</span>`);
      return `<button class="day-row" data-day="${esc(date)}" type="button">
        <span class="date">${esc(formatDateLabel(date))}</span>
        <span class="counts">${pills.join("")}</span>
      </button>`;
    }).join("");

    const n = state.index.days.length;
    const dayLabel = n === 1 ? "1 day" : `${n} days`;
    return `<div class="section-head"><h2>By day</h2><span class="pill">${dayLabel}</span></div>
      <div class="day-list">${rows || emptyBlock("No days retained yet.")}</div>`;
  }

  function renderDayDetail(date) {
    const day = state.days.get(date);
    if (!day) return emptyBlock(`Missing data for ${date}.`);
    const omitDate = date === getTodayHkt();

    let html = `<button class="back-link" type="button" data-action="back-days">← All days</button>
      <div class="section-head">
        <h2>${esc(formatDateLabel(date))}</h2>
      </div>
      <div class="day-detail">`;

    if (ytItems(day).length) {
      html += `<section class="panel">
        <div class="section-head"><h2>YouTube</h2><span class="pill yt">${day.youtube.pick_count} picks</span></div>`;
      html += `<div class="card-list">${ytItems(day).map((i) => ytCard(i, date, { omitDate })).join("")}</div></section>`;
    }

    if (xAll(day).length) {
      html += `<section class="panel">
        <div class="section-head"><h2>X</h2><span class="pill x">${day.x.pick_count_total} picks</span></div>`;
      html += renderXGroups(day, date, { omitSection: true, omitDate });
      html += `</section>`;
    }

    if (!dayHasContent(day)) {
      html += emptyBlock("Quiet day — no picks recorded.");
    }

    html += `</div>`;
    return html;
  }

  function collectSearchable() {
    const rows = [];
    for (const date of state.index.days) {
      const day = state.days.get(date);
      if (!day) continue;
      for (const item of ytItems(day)) {
        rows.push({
          kind: "youtube",
          date,
          title: item.title,
          summary: item.summary,
          meta: item.channel,
          url: item.url,
          video_id: item.video_id,
          hay: `${item.title} ${item.summary} ${item.channel}`.toLowerCase(),
        });
      }
      for (const item of xWatch(day)) {
        rows.push({
          kind: "x",
          section: "Watch list",
          date,
          title: item.short_title,
          summary: item.summary,
          meta: `@${(item.handle || "").replace(/^@/, "")}`,
          url: item.url,
          hay: `${item.short_title} ${item.summary} ${item.handle}`.toLowerCase(),
        });
      }
      for (const item of xTrendy(day)) {
        rows.push({
          kind: "x",
          section: "Trendy",
          trendy: true,
          date,
          title: item.short_title,
          summary: item.summary,
          meta: `@${(item.handle || "").replace(/^@/, "")}`,
          url: item.url,
          hay: `${item.short_title} ${item.summary} ${item.handle}`.toLowerCase(),
        });
      }
    }
    return rows;
  }

  function renderSearch() {
    const q = state.searchQuery.trim().toLowerCase();
    const all = collectSearchable();
    const hits = q ? all.filter((r) => r.hay.includes(q)) : [];

    let html = `<div class="section-head"><h2>Search</h2><span class="pill">${q ? hits.length + " hits" : "all days"}</span></div>
      <div class="toolbar">
        <div class="field">
          <label for="search-q">Title, summary, channel, or @handle</label>
          <input id="search-q" type="search" placeholder="e.g. Higgsfield, Pages, kiaraplds" value="${esc(state.searchQuery)}" autocomplete="off" />
        </div>
      </div>`;

    if (!q) {
      html += emptyBlock("Type to filter across retained days.");
      return html;
    }
    if (!hits.length) {
      html += emptyBlock("No matches.");
      return html;
    }

    html += `<div class="card-list">${hits.map((r) => {
      if (r.kind === "youtube") {
        return ytCard({ title: r.title, summary: r.summary, channel: r.meta, url: r.url, video_id: r.video_id }, r.date);
      }
      return xCard(
        { short_title: r.title, summary: r.summary, handle: r.meta.replace(/^@/, ""), url: r.url },
        r.date,
        r.section,
        { trendy: !!r.trendy }
      );
    }).join("")}</div>`;
    return html;
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function renderYouTube() {
    const channels = uniqueSorted(
      state.index.days.flatMap((date) => ytItems(state.days.get(date)).map((i) => i.channel))
    );
    const filter = state.ytChannel;
    const cards = [];
    for (const date of state.index.days) {
      for (const item of ytItems(state.days.get(date))) {
        if (filter !== "all" && item.channel !== filter) continue;
        cards.push(ytCard(item, date));
      }
    }

    return `<div class="section-head"><h2>YouTube</h2><span class="pill yt">${cards.length}</span></div>
      <div class="toolbar">
        <div class="field">
          <label for="yt-channel">Channel</label>
          <select id="yt-channel">
            <option value="all"${filter === "all" ? " selected" : ""}>All channels</option>
            ${channels.map((c) => `<option value="${esc(c)}"${filter === c ? " selected" : ""}>${esc(c)}</option>`).join("")}
          </select>
        </div>
      </div>
      ${cards.length ? `<div class="card-list">${cards.join("")}</div>` : emptyBlock("No YouTube picks.")}`;
  }

  function renderX() {
    const handles = uniqueSorted(
      state.index.days.flatMap((date) => {
        const day = state.days.get(date);
        return xAll(day).map((i) => (i.handle || "").replace(/^@/, ""));
      })
    );
    const section = state.xSection;
    const handle = state.xHandle;
    const cards = [];

    for (const date of state.index.days) {
      const day = state.days.get(date);
      const push = (items, label, trendy) => {
        for (const item of items) {
          const h = (item.handle || "").replace(/^@/, "");
          if (handle !== "all" && h !== handle) continue;
          cards.push(xCard(item, date, label, { trendy }));
        }
      };
      if (section === "all" || section === "watch_list") push(xWatch(day), "Watch list", false);
      if (section === "all" || section === "trendy") push(xTrendy(day), "Trendy", true);
    }

    return `<div class="section-head"><h2>X</h2><span class="pill x">${cards.length}</span></div>
      <div class="toolbar">
        <div class="field">
          <label for="x-section">Section</label>
          <select id="x-section">
            <option value="all"${section === "all" ? " selected" : ""}>Watch list + Trendy</option>
            <option value="watch_list"${section === "watch_list" ? " selected" : ""}>Watch list</option>
            <option value="trendy"${section === "trendy" ? " selected" : ""}>Trendy</option>
          </select>
        </div>
        <div class="field">
          <label for="x-handle">Handle</label>
          <select id="x-handle">
            <option value="all"${handle === "all" ? " selected" : ""}>All handles</option>
            ${handles.map((h) => `<option value="${esc(h)}"${handle === h ? " selected" : ""}>@${esc(h)}</option>`).join("")}
          </select>
        </div>
      </div>
      ${cards.length ? `<div class="card-list">${cards.join("")}</div>` : emptyBlock("No X picks.")}`;
  }

  function openTrendyOnDesktop() {
    if (!window.matchMedia("(min-width: 641px)").matches) return;
    main.querySelectorAll(".trendy-disclosure").forEach((el) => {
      el.open = true;
    });
  }

  function render() {
    let html = "";
    if (state.view === "today") html = renderToday();
    else if (state.view === "by-day") {
      html = state.selectedDay ? renderDayDetail(state.selectedDay) : renderByDayList();
    } else if (state.view === "search") html = renderSearch();
    else if (state.view === "youtube") html = renderYouTube();
    else if (state.view === "x") html = renderX();
    main.innerHTML = html;
    openTrendyOnDesktop();
  }

  document.querySelector(".tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    state.selectedDay = null;
    setView(btn.dataset.view);
    // Keep focus on the activated tab after re-render of main
    requestAnimationFrame(() => btn.focus({ preventScroll: true }));
  });

  main.addEventListener("click", (e) => {
    const goto = e.target.closest("[data-goto-day]");
    if (goto) {
      goToDayDetail(goto.dataset.gotoDay);
      return;
    }
    const back = e.target.closest("[data-action='back-days']");
    if (back) {
      state.selectedDay = null;
      render();
      return;
    }
    const row = e.target.closest("[data-day]");
    if (row) {
      state.selectedDay = row.dataset.day;
      render();
    }
  });

  main.addEventListener("input", (e) => {
    if (e.target.id === "search-q") {
      state.searchQuery = e.target.value;
      render();
      const input = document.getElementById("search-q");
      if (input) {
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    }
  });

  main.addEventListener("change", (e) => {
    if (e.target.id === "yt-channel") {
      state.ytChannel = e.target.value;
      render();
    } else if (e.target.id === "x-section") {
      state.xSection = e.target.value;
      render();
    } else if (e.target.id === "x-handle") {
      state.xHandle = e.target.value;
      render();
    }
  });

  async function boot() {
    try {
      state.index = await loadIndex();
      if (state.index.updated_at) {
        updatedMeta.hidden = false;
        const when = formatUpdatedHkt(state.index.updated_at);
        updatedMeta.textContent = `Updated ${when} · keep ${state.index.retention_days} days`;
      }
      await loadAllDays();
      render();
    } catch (err) {
      main.innerHTML = `<p class="error">${esc(err.message || String(err))}</p>`;
    }
  }

  boot();
})();
