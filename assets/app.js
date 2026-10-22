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

  function ytCard(item, date) {
    return `
      <a class="card" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">
        <h3 class="card-title">${esc(item.title)}</h3>
        <p class="card-summary">${esc(item.summary || "")}</p>
        <div class="card-meta">
          <span class="tag">${esc(item.channel || "YouTube")}</span>
          <span>${esc(date)}</span>
        </div>
      </a>`;
  }

  function xCard(item, date, section) {
    const handle = item.handle ? `@${item.handle.replace(/^@/, "")}` : "X";
    return `
      <a class="card" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">
        <h3 class="card-title">${esc(item.short_title || item.title || "")}</h3>
        <p class="card-summary">${esc(item.summary || "")}</p>
        <div class="card-meta">
          <span class="tag">${esc(handle)}</span>
          ${section ? `<span>${esc(section)}</span>` : ""}
          <span>${esc(date)}</span>
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

  function renderToday() {
    const yt = findLatestWith((d) => ytItems(d).length > 0);
    const x = findLatestWith((d) => xAll(d).length > 0);
    const headline = state.index.days[0] || null;

    let html = `<div class="section-head">
      <h2>Today</h2>
      <span class="pill">${esc(headline ? formatDateLabel(headline) : "No days yet")}</span>
    </div>
    <p class="meta" style="margin:-0.35rem 0 1rem">Latest available picks from each source (quiet sources stay empty).</p>
    <div class="today-grid">`;

    // YouTube column
    html += `<section class="panel">
      <div class="section-head">
        <h2>YouTube</h2>
        <span class="pill yt">${yt ? yt.day.youtube.pick_count : 0} picks</span>
      </div>`;
    if (yt) {
      html += `<p class="meta" style="margin:0 0 0.75rem">Content day · ${esc(yt.date)}</p>`;
      html += `<div class="card-list">${ytItems(yt.day).map((i) => ytCard(i, yt.date)).join("")}</div>`;
    } else {
      html += emptyBlock("No YouTube picks in retained days.");
    }
    html += `</section>`;

    // X column
    html += `<section class="panel">
      <div class="section-head">
        <h2>X</h2>
        <span class="pill x">${x ? x.day.x.pick_count_total : 0} picks</span>
      </div>`;
    if (x) {
      html += `<p class="meta" style="margin:0 0 0.75rem">Digest day · ${esc(x.date)}</p>`;
      const watch = xWatch(x.day);
      const trendy = xTrendy(x.day);
      if (watch.length) {
        html += `<p class="group-label">Watch list · ${watch.length}</p>
          <div class="card-list">${watch.map((i) => xCard(i, x.date, "Watch list")).join("")}</div>`;
      }
      if (trendy.length) {
        html += `<p class="group-label" style="margin-top:1rem">Trendy · ${trendy.length}</p>
          <div class="card-list">${trendy.map((i) => xCard(i, x.date, "Trendy")).join("")}</div>`;
      }
    } else {
      html += emptyBlock("No X picks in retained days.");
    }
    html += `</section></div>`;
    return html;
  }

  function renderByDayList() {
    const rows = state.index.days.map((date) => {
      const day = state.days.get(date);
      if (!day || !dayHasContent(day)) {
        return `<button class="day-row quiet" data-day="${esc(date)}" type="button">
          <span class="date">${esc(formatDateLabel(date))}</span>
          <span class="counts"><span class="pill">quiet</span></span>
        </button>`;
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

    return `<div class="section-head"><h2>By day</h2><span class="pill">${state.index.days.length} days</span></div>
      <div class="day-list">${rows || emptyBlock("No days retained yet.")}</div>`;
  }

  function renderDayDetail(date) {
    const day = state.days.get(date);
    if (!day) return emptyBlock(`Missing data for ${date}.`);

    let html = `<button class="back-link" type="button" data-action="back-days">← All days</button>
      <div class="section-head">
        <h2>${esc(formatDateLabel(date))}</h2>
      </div>
      <div class="day-detail">`;

    if (ytItems(day).length) {
      html += `<section class="panel">
        <div class="section-head"><h2>YouTube</h2><span class="pill yt">${day.youtube.pick_count} picks</span></div>`;
      html += `<div class="card-list">${ytItems(day).map((i) => ytCard(i, date)).join("")}</div></section>`;
    }

    if (xAll(day).length) {
      html += `<section class="panel">
        <div class="section-head"><h2>X</h2><span class="pill x">${day.x.pick_count_total} picks</span></div>`;
      const watch = xWatch(day);
      const trendy = xTrendy(day);
      if (watch.length) {
        html += `<p class="group-label">Watch list · ${watch.length}</p>
          <div class="card-list">${watch.map((i) => xCard(i, date, "Watch list")).join("")}</div>`;
      }
      if (trendy.length) {
        html += `<p class="group-label" style="margin-top:1rem">Trendy · ${trendy.length}</p>
          <div class="card-list">${trendy.map((i) => xCard(i, date, "Trendy")).join("")}</div>`;
      }
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
        return ytCard({ title: r.title, summary: r.summary, channel: r.meta, url: r.url }, r.date);
      }
      return xCard({ short_title: r.title, summary: r.summary, handle: r.meta.replace(/^@/, ""), url: r.url }, r.date, r.section);
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
      const push = (items, label) => {
        for (const item of items) {
          const h = (item.handle || "").replace(/^@/, "");
          if (handle !== "all" && h !== handle) continue;
          cards.push(xCard(item, date, label));
        }
      };
      if (section === "all" || section === "watch_list") push(xWatch(day), "Watch list");
      if (section === "all" || section === "trendy") push(xTrendy(day), "Trendy");
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

  function render() {
    let html = "";
    if (state.view === "today") html = renderToday();
    else if (state.view === "by-day") {
      html = state.selectedDay ? renderDayDetail(state.selectedDay) : renderByDayList();
    } else if (state.view === "search") html = renderSearch();
    else if (state.view === "youtube") html = renderYouTube();
    else if (state.view === "x") html = renderX();
    main.innerHTML = html;
  }

  document.querySelector(".tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    state.selectedDay = null;
    setView(btn.dataset.view);
  });

  main.addEventListener("click", (e) => {
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
        updatedMeta.textContent = `Updated ${state.index.updated_at} · keep ${state.index.retention_days} days`;
      }
      await loadAllDays();
      render();
    } catch (err) {
      main.innerHTML = `<p class="error">${esc(err.message || String(err))}</p>`;
    }
  }

  boot();
})();
