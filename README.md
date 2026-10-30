# 42 Eval Finder

See at a glance who on the cluster map can evaluate you.

- 🟡 **Yellow ring**: advanced (common core finished, `ft_transcendence` validated)
- 🟣 **Purple ring**: rank 6 (registered on `ft_transcendence`, not validated yet)
- A small panel (bottom right) lists them with their seat. **Hide others** dims everyone else.

Works on Brave / Chrome and Firefox.

---

## 1. Create your 42 API app (2 minutes, once)

1. Go to https://profile.intra.42.fr/oauth/applications/new
2. Fill in:
   - **Name**: anything (e.g. `eval-finder`)
   - **Redirect URI**: `http://localhost` (required by the form, not used)
   - **Scopes**: leave `public`
3. Click **Submit**. Keep the page open: you need the **UID** and the **SECRET**.

## 2. Install the extension

**[⬇ Download the latest release](../../releases/latest)** and pick the zip for your browser.

**Brave / Chrome**
1. Unzip `42-eval-finder-chrome.zip`.
2. Open `brave://extensions` (or `chrome://extensions`).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the unzipped folder.

**Firefox**
1. Unzip `42-eval-finder-firefox.zip`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select `manifest.json` in the folder.
4. Firefox removes temporary add-ons when it closes. To keep it, get it signed for free as an *unlisted* add-on on addons.mozilla.org.

## 3. Set it up

Click the extension icon (pin it from the 🧩 menu if you don't see it) and fill in:

| Field | What to put |
|---|---|
| API UID | the **UID** from your app page (`u-s4t2ud-…`) |
| API SECRET | the **SECRET** from your app page (`s-s4t2ud-…`) |
| Your 42 login | your login, used to detect your campus |
| Campus ID | leave empty, it is detected automatically |

Click **Save**, then open the cluster map. The rings appear after a second or two.

## Every month: new secret

42 rotates your app's SECRET every month. When the panel says the secret was rejected:

1. Open your app on https://profile.intra.42.fr/oauth/applications
2. Copy the new SECRET.
3. Paste it in the extension popup and click **Save**.

## How many API requests?

Very few. The extension downloads the list of `ft_transcendence` students of your campus once (a handful of requests), caches it for **24 h**, and then only compares it with the logins on the map. Switching clusters or reloading costs nothing. The **Refresh** button forces an update.

## For maintainers: publishing a new version

```bash
git tag v2.2.0
git push origin v2.2.0
```

GitHub Actions builds both zips and publishes the release automatically (version in the manifests is set from the tag). To build locally: `./build.sh`, zips land in `dist/`.

## Privacy

Your UID and SECRET are stored only in your browser (`storage.local`) and are only sent to `api.intra.42.fr`. Never share them or commit them anywhere: each person uses their own app.
