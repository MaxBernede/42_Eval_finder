const KEYS = ["uid", "secret", "myLogin", "campusId"];
const $ = (id) => document.getElementById(id);
const msg = (t) => { $("msg").textContent = t; setTimeout(() => ($("msg").textContent = ""), 2500); };

chrome.storage.local.get(KEYS).then((s) => {
  for (const k of KEYS) $(k).value = s[k] || "";
});

$("save").addEventListener("click", async () => {
  const out = {};
  for (const k of KEYS) out[k] = $(k).value.trim();
  await chrome.storage.local.set(out);
  await chrome.runtime.sendMessage({ type: "clearCache" });
  msg("Saved ✔ — the map will update.");
});

$("clear").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "clearCache" });
  msg("Cache cleared. Reload the cluster page.");
});
