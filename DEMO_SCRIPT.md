# Narrated walkthrough script (≈4–5 minutes)

Speak naturally; this is a guide, not a teleprompter.

---

### Part 1 — Introduction (~40s)

“This is **The Small Web** — a miniature internet of one-page fictional sites stored in MongoDB, and a browser UI that runs in a normal tab.

I used **Next.js** for the interactive browser chrome and navigation state, **NestJS** for a small validated REST API, and **MongoDB** for sites, people, and visit history.

The frontend owns Back/Forward session state. The backend owns persistence, publish validation, sanitization, and search.”

---

### Part 2 — Four-site trail (~60s)

1. Select **Mira Chen** (or any person).
2. Address bar → `tidepool.zz` → Go.
3. Click the link to **forest.zz**, then **mountain.zz**, then **astronomy.zz**.

“That’s a four-deep trail via the address bar and internal links. History on the right is chronological visits for Mira — separate from the session stack.”

Press **Back** twice, then **Forward** once.

“Back and Forward only move the active index. They don’t append duplicates.”

---

### Part 3 — Truncation + restore (~50s)

From a deep trail, go **Back** twice so Forward is available. Then type `garden.zz` and Go.

“The old Forward branch is gone — classic browser truncation. If I Back to an earlier page, its HTML snapshot and scroll position come back from the session entry, not a fresh network fetch. If the site were republished later, Back still shows what I left, while a new navigate loads the current version.”

---

### Part 4 — Search (~40s)

Open **Search**, query `lavender` (body text from garden.zz). Open the result.

“Search matches extracted body text, not HTML tags. Opening a result is a new navigation — like typing the address. Search results live in the side chrome, not the Back/Forward stack — I switch back to the Search tab and the query and hits are still here.”

---

### Part 5 — Publish (~40s)

Open **Publish**. Keep the selected publisher. Address: `myfirstsite.zz`. Use the sample HTML (or paste a short page linking to `forest.zz`). Publish, then confirm the address bar opens it and the forest link works.

“Duplicate addresses are rejected by the API with a clear error.”

---

### Part 6 — Broken address (~25s)

Go to `coralruins.zz` or click a broken seed link.

“Not-found is a first-class entry: history records it, Back still works, and the browser chrome stays usable.”

---

### Part 7 — Engineering close (~45s)

“Three decisions I’d defend:

1. **Navigation model** — stack + index in the client; visits are an append-only log per person. History jump creates a *new* stack entry.
2. **Person switching** — each person has an independent session stack; switching only swaps which stack and which visit list you see.
3. **HTML containment** — sanitize on write with DOMPurify, rewrite links to `data-sw-nav`, render in a sandbox iframe without same-origin, and only a trusted bootstrap may `postMessage` navigations. Authors can’t run scripts or touch the parent app. Cost: no custom JS, forms, or remote images — intentional for this scope.

I intentionally left out auth, bookmarks, tabs, downloads, and real-network rendering — the brief asked for depth on Back/Forward, history, and containment instead.”
