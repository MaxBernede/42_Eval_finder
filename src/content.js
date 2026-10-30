// Compares the logins shown on the cluster map with the cached lists
// and colors the bubbles: yellow = advanced, purple = rank 6.

(() => {
  const COLORS = { advanced: "#f2c200", rank6: "#9b4dff" };
  const LABELS = { advanced: "Advanced", rank6: "Rank 6" };
  const ORDER = { advanced: 0, rank6: 1 };

  let lists = null; // { map, t }
  let me = "";
  let hideOthers = false;
  let panel, listEl, statusEl;

  // Supports both map formats:
  //  - intra: <image id="f0r2s9" data-tooltip-login="login">
  //  - other: <a class="user-container" data-login="login" data-host="f0r2s12"> … <circle class="user-circle">
  function seats() {
    const out = [];
    document.querySelectorAll("image[data-tooltip-login]").forEach((img) =>
      out.push({ login: img.getAttribute("data-tooltip-login"), host: img.id, el: img, kind: "intra" })
    );
    document.querySelectorAll("[data-login]").forEach((el) =>
      out.push({ login: el.getAttribute("data-login"), host: el.getAttribute("data-host") || "", el, kind: "container" })
    );
    return out.filter((s) => s.login && s.login.toLowerCase() !== me);
  }

  function ring(circle, color) {
    circle.style.stroke = color || "";
    circle.style.strokeWidth = color ? "8px" : "";
  }

  function paint() {
    if (!lists) return;
    for (const s of seats()) {
      const info = lists.map[s.login];
      const color = info ? COLORS[info.type] : null;

      if (s.kind === "intra") {
        document.querySelectorAll(`[id="${CSS.escape(s.host)}"]`).forEach((el) => {
          if (el.tagName.toLowerCase() === "circle") ring(el, color);
          el.style.opacity = hideOthers && !info ? "0.15" : "";
        });
      } else {
        const circle = s.el.querySelector(".user-circle, circle");
        if (circle) ring(circle, color);
        s.el.style.opacity = hideOthers && !info ? "0.15" : "";
      }
    }
  }

  function ensurePanel() {
    if (panel) return;
    panel = document.createElement("div");
    panel.id = "ef-panel";
    panel.innerHTML = `
      <div class="ef-head"><strong>Available evaluators</strong>
        <button class="ef-btn" data-a="min" title="Minimize">–</button></div>
      <div class="ef-body">
        <div class="ef-legend">
          <span><i style="background:${COLORS.advanced}"></i>Advanced</span>
          <span><i style="background:${COLORS.rank6}"></i>Rank 6</span>
        </div>
        <div class="ef-status">Loading…</div>
        <div class="ef-actions">
          <button class="ef-btn" data-a="hide">Hide others</button>
          <button class="ef-btn" data-a="refresh">Refresh</button>
        </div>
        <ul class="ef-list"></ul>
      </div>`;
    document.body.appendChild(panel);
    listEl = panel.querySelector(".ef-list");
    statusEl = panel.querySelector(".ef-status");
    panel.addEventListener("click", (e) => {
      const a = e.target.dataset && e.target.dataset.a;
      if (a === "min") panel.classList.toggle("ef-min");
      if (a === "hide") {
        hideOthers = !hideOthers;
        e.target.textContent = hideOthers ? "Show all" : "Hide others";
        paint();
      }
      if (a === "refresh") load(true);
    });
  }

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function render() {
    if (!lists) return;
    const all = seats();
    const found = all
      .filter((s) => lists.map[s.login])
      .sort((x, y) => ORDER[lists.map[x.login].type] - ORDER[lists.map[y.login].type] || x.login.localeCompare(y.login));
    const nAdv = found.filter((s) => lists.map[s.login].type === "advanced").length;
    const age = Math.round((Date.now() - lists.t) / 60000);
    statusEl.textContent = `${nAdv} advanced · ${found.length - nAdv} rank 6 · out of ${all.length} online (list is ${age} min old)`;
    listEl.innerHTML = found.length
      ? found
          .map((s) => {
            const i = lists.map[s.login];
            return `<li>
              <i style="background:${COLORS[i.type]}"></i>
              <a href="https://profile.intra.42.fr/users/${encodeURIComponent(s.login)}" target="_blank" rel="noopener">${esc(s.login)}</a>
              <span class="ef-host">${esc(s.host)}</span>
              <span class="ef-meta">${LABELS[i.type]}</span>
            </li>`;
          })
          .join("")
      : `<li class="ef-empty">No advanced or rank 6 students online.</li>`;
  }

  async function load(force = false) {
    if (!document.querySelector("image[data-tooltip-login], [data-login]")) return;
    ensurePanel();
    me = ((await chrome.storage.local.get("myLogin")).myLogin || "").trim().toLowerCase();
    statusEl.textContent = "Loading list…";
    chrome.runtime.sendMessage({ type: "lists", force }, (res) => {
      if (!res || !res.ok) {
        const e = res ? res.error : "no response";
        statusEl.textContent =
          e === "NO_CREDENTIALS" ? "⚠️ Click the extension icon and enter your API UID and SECRET."
          : e.startsWith("TOKEN_") ? "⚠️ API UID/SECRET rejected (" + e + "). The secret rotates monthly: paste the new one in the extension options."
          : e === "NO_CAMPUS" ? "⚠️ Campus not found: set your login or campus ID in the options."
          : "Error: " + e;
        return;
      }
      lists = res.data;
      paint();
      render();
    });
  }

  // The map changes (cluster switch, refresh): repaint without new requests.
  let timer;
  new MutationObserver((muts) => {
    if (panel && muts.every((m) => panel.contains(m.target))) return;
    clearTimeout(timer);
    timer = setTimeout(() => (lists ? (paint(), render()) : load()), 400);
  }).observe(document.body, { childList: true, subtree: true });

  chrome.storage.onChanged.addListener((c, area) => {
    if (area === "local" && (c.campusId || c.myLogin || c.uid || c.secret)) load(true);
  });

  load();
})();
