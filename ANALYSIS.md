# The Small Web — Assessment Analysis & Design

Authoritative source: `Wyxan-FullStack-Technical-Assessment.html`.

## 1. Required functional features

| Feature | Meaning |
|--------|---------|
| Browse | Address bar + follow links to DB-backed one-page sites |
| Retrace | Back, Forward (truncatable), restore prior page state |
| History | Per-person chronological visits, scrollable, jumpable |
| Search | Full-content search across all published HTML bodies |
| Publish | Anyone (selected person) publishes address + HTML |
| Broken addresses | Not-found UI; stack/history still well-defined |
| Person identity | Name picker only — no auth |

## 2. Mandatory technologies

Next.js (App Router) · React · TypeScript (strict) · Tailwind · NestJS · Mongoose · MongoDB · monorepo · ESLint · env config · Jest (+ Supertest) · Playwright if practical.

## 3. Navigation & history (non-negotiable)

- Session stack: `entries[]` + `currentIndex` (in-memory per person).
- New navigate while not at tip → truncate forward branch.
- Back/Forward move index only; restore snapshot/scroll; do **not** append.
- Chronological **visits** are persisted separately from the session stack.
- History jump = **new** navigation entry (like typing an address), truncates forward.
- Person switch → independent session stacks; load that person's visit log.

## 4. HTML security

- Sanitize with DOMPurify (strict allowlist) on publish **and** before render.
- Render in sandboxed iframe (`sandbox=""` — no scripts, no same-origin).
- Link navigation via `srcdoc` + parent `message` bridge from a trusted click handler injected only in the *viewer* wrapper, OR rewrite anchors to `data-address` and listen via iframe load + postMessage from a minimal trusted shim. **Chosen:** sanitize + sandbox iframe with `sandbox="allow-scripts"` disabled; use `srcdoc` and parent-side capture is impossible across sandbox — instead rewrite `<a href>` to `javascript:void(0)` is unsafe; **use** click interception by transforming links to `#smallweb:<address>` and listening to `iframe` `load` + hash... Better: **no scripts in content**; inject a tiny trusted script only if sandbox allows scripts — assessment says avoid unnecessary script execution.

**Chosen approach:**

1. Backend + frontend sanitize with DOMPurify (JSDOM on server).
2. Strip scripts, event handlers, forms, iframes, objects, dangerous URLs.
3. Rewrite internal `href` to `data-sw-href` + keep visible text; wrap content so parent listens via `sandbox` **without** `allow-same-origin` and **without** scripts — parent cannot read iframe DOM.
4. Therefore: render sanitized HTML in iframe with `sandbox=""` (fully restricted). For links: preprocess HTML replacing `<a href="addr">` with `<a href="#" data-sw-nav="addr">` and use `srcdoc` + **sandbox allow-scripts WITHOUT allow-same-origin** plus a tiny injected bootstrap that only posts `{type:'navigate', address}` on click. Content cannot touch parent; bootstrap cannot access parent DOM beyond `postMessage`.

Tradeoff: authors cannot use custom JS (intentional). Forms/iframes/external resources blocked.

## 5. Database seeding

~10 interconnected sites, several people (multi-site authors), ~1 hour deterministic visit history, idempotent upserts.

## 6. Explicit exclusions

No auth, passwords, roles, bookmarks, tabs, extensions, Electron, downloads, asset hosting, real-internet crawl/render, Redis/K8s/GraphQL unless necessary.

## 7. Deliverables

Incremental git history · seed command · narrated 4–5 min script · runnable README commands.

## 8. Engineering judgments

| Ambiguity | Decision |
|-----------|----------|
| Address shape | Lowercase host-like `label.zz` (optional path `/…`); strip whitespace, drop `#fragment`; case-insensitive |
| Session vs visits | Session stack client-side; visits API-persisted |
| Person sessions | Independent stacks keyed by `personId` |
| Edit after visit | Back/Forward restore **snapshot** from visit time; fresh load fetches current |
| History jump | New forward navigation (records visit) |
| Title | Derived from `<title>` / first `<h1>` if omitted |
| Search | Store `textContent` field; case-insensitive regex / `$text` |

## Architecture

```
apps/frontend  → Next.js UI + navigation engine + safe viewer
apps/backend   → NestJS REST + Mongoose + sanitize-on-write
scripts/seed.ts
```

## Implementation order

1. Monorepo scaffold  
2. Schemas + people/sites/visits/search APIs  
3. Seed  
4. Browser chrome + navigation engine  
5. Secure HTML viewer  
6. History / search / publish panels  
7. Tests + README + demo script  

## Major risks

- Iframe link bridging without XSS  
- Navigation race conditions  
- Seed idempotency vs user data  
- Forward truncation edge cases  
