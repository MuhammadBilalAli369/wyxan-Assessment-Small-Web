# Code audit — bugs found and fixes

## Highest-severity defects

### 1. Iframe scroll restoration broken (opaque origin)
**Bug:** `PageViewer` called `iframe.contentWindow.scrollTo()` after `ready`. With `sandbox="allow-scripts"` and **no** `allow-same-origin`, that call cannot reliably scroll the document.

**Fix:** Parent sends `{ source: "small-web-parent", type: "restore-scroll", entryId, scrollY }` to the iframe. Trusted bootstrap scrolls locally, suppresses feedback (`restoring` flag), then acknowledges. Messages are entry-scoped; forged parent-window messages without matching `event.source` / `entryId` are ignored.

**Files:** `lib/viewer-document.ts`, `components/browser/PageViewer.tsx`

### 2. Async navigation races
**Bug:** `replaceCurrent()` applied late responses to whichever entry was active. Back/Forward did not invalidate in-flight fetches. Visit refresh could land under the wrong person.

**Fix:** Pre-allocate `entryId`, patch with `replaceEntryById`, bump `navGeneration` + AbortController on navigate/Back/Forward/person switch, bind updates to the personId captured at request start, gate visit fetches with `visitGeneration`.

**Files:** `hooks/useBrowser.ts`, `lib/navigation.ts`, `lib/api.ts`

### 3. Search results not restorable for the demo
**Bug:** `SearchPanel` held query/results in local state; unmounting the tab wiped them.

**Fix:** Lift query/results into `BrowserApp`. Search is **chrome UI**, not part of the Back/Forward stack — returning to the Search tab restores results.

**Files:** `BrowserApp.tsx`, `SearchPanel.tsx`

### 4. CORS / localhost vs 127.0.0.1
**Bug:** `CORS_ORIGIN=http://localhost:3847` rejected Playwright/browser origins on `127.0.0.1` → “Failed to fetch”.

**Fix:** Allow both origins; align `NEXT_PUBLIC_API_URL` with `127.0.0.1`.

**Files:** `.env.example`, runtime `.env`

### 5. Tooling inconsistencies
**Bug:** `next lint` deprecated/unsupported path; obsolete create-next-app / Nest READMEs; seed assumed shared already built; engines loosely documented.

**Fix:** `eslint .`, short workspace READMEs, `npm run seed` builds shared first, `engines: ">=20 <23"`.

## Build / test results (executed)

```text
npm test                 → shared + frontend unit + backend integration PASS
npm run build            → shared + Nest + Next PASS
npm run lint -w frontend → PASS
npm run seed (×2)        → people=5, seed sites=10, seed visits=37 (stable)
npx playwright test      → 9/9 PASS
```

## Still note
- Do not push to **GitHub** without your approval (this environment uses the Cursor Origin remote).
- Playwright expects API+UI already running (`npm run dev`).
