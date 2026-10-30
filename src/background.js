// Each user enters their own 42 API app (UID + SECRET) in the extension
// options. Nothing is hardcoded and nothing leaves the browser except the
// calls to api.intra.42.fr.

// Single source: ft_transcendence registrations on your campus.
//  - transcendence validated -> advanced (yellow): common core finished
//  - registered, not validated -> rank 6 (purple)
// A few requests in total, cached for 24 h.

const API = "https://api.intra.42.fr";
const RANK6_PROJECT = "ft_transcendence";
const CACHE_MS = 24 * 3600_000;

let token = null;
let tokenExp = 0;
let tokenSecret = null;
let inflight = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function settings() {
  const s = await chrome.storage.local.get(["uid", "secret", "myLogin", "campusId"]);
  return {
    uid: (s.uid || "").trim(),
    secret: (s.secret || "").trim(),
    myLogin: (s.myLogin || "").trim(),
    campusId: (s.campusId || "").toString().trim(),
  };
}

async function getToken() {
  const { uid, secret } = await settings();
  if (!uid || !secret) throw new Error("NO_CREDENTIALS");
  if (token && tokenSecret === uid + secret && Date.now() < tokenExp - 60_000) return token;
  const r = await fetch(API + "/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: uid, client_secret: secret }),
  });
  if (!r.ok) throw new Error("TOKEN_" + r.status);
  const j = await r.json();
  token = j.access_token;
  tokenSecret = uid + secret;
  tokenExp = Date.now() + j.expires_in * 1000;
  return token;
}

async function apiGet(path, retry = 3) {
  const r = await fetch(API + path, { headers: { Authorization: "Bearer " + (await getToken()) } });
  if (r.status === 429 && retry > 0) { await sleep(2000); return apiGet(path, retry - 1); }
  if (r.status === 401 && retry > 0) { token = null; return apiGet(path, retry - 1); }
  if (!r.ok) throw new Error("HTTP_" + r.status + " " + path.split("?")[0]);
  return r.json();
}

async function allPages(path) {
  const out = [];
  const sep = path.includes("?") ? "&" : "?";
  for (let page = 1; page <= 30; page++) {
    const rows = await apiGet(`${path}${sep}page[size]=100&page[number]=${page}`);
    out.push(...rows);
    if (rows.length < 100) break;
    await sleep(500); // API limit: 2 req/s
  }
  return out;
}

// Campus: the one set in the options, else the primary campus of the login (1 request, remembered).
async function resolveCampus(s) {
  if (s.campusId) return s.campusId;
  if (!s.myLogin) throw new Error("NO_CAMPUS");
  const u = await apiGet("/v2/users/" + encodeURIComponent(s.myLogin));
  const cu = (u.campus_users || []).find((c) => c.is_primary) || (u.campus_users || [])[0];
  const id = cu ? cu.campus_id : u.campus && u.campus[0] && u.campus[0].id;
  if (!id) throw new Error("NO_CAMPUS");
  await chrome.storage.local.set({ campusId: String(id) });
  return String(id);
}

async function fetchLists() {
  const s = await settings();
  const campus = await resolveCampus(s);

  const cached = (await chrome.storage.local.get("lists")).lists;
  if (cached && cached.campus === campus && Date.now() - cached.t < CACHE_MS) return cached;

  const map = {}; // login -> { type: "advanced" | "rank6" }
  const pus = await allPages(`/v2/projects/${RANK6_PROJECT}/projects_users?filter[campus]=${campus}`);
  for (const pu of pus) {
    const login = pu.user && pu.user.login;
    if (!login) continue;
    const type = pu["validated?"] === true ? "advanced" : "rank6";
    // never downgrade an "advanced" if there are several rows
    if (map[login]?.type !== "advanced") map[login] = { type };
  }

  const out = { t: Date.now(), campus, map };
  await chrome.storage.local.set({ lists: out });
  return out;
}

chrome.runtime.onMessage.addListener((msg, _sender, send) => {
  if (msg.type === "lists") {
    const go = async () => {
      if (msg.force) await chrome.storage.local.remove("lists");
      inflight = inflight || fetchLists().finally(() => (inflight = null));
      return inflight;
    };
    go().then((d) => send({ ok: true, data: d })).catch((e) => send({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === "clearCache") {
    token = null;
    chrome.storage.local.remove("lists").then(() => send({ ok: true }));
    return true;
  }
});
