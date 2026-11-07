# The Small Web

Wyxan full-stack assessment: a miniature internet and browser simulator.

Browse fictional one-page sites in MongoDB, follow links, use Back/Forward with correct truncation and restore-on-return, keep per-person history, search page bodies, and publish new HTML safely.

## Stack

- **Frontend:** Next.js (App Router) · React · TypeScript · Tailwind CSS — port `3847`
- **Backend:** NestJS · Mongoose · TypeScript — port `3848`
- **Database:** MongoDB
- **Monorepo:** npm workspaces
- **Node.js:** `>=22.22.2 <23` (required by locked `jsdom@31` / isomorphic-dompurify)

## Prerequisites

- Node.js **22.22.2+** (Node 22 LTS; Node 20 is not supported by the locked jsdom engines)
- npm 10+
- MongoDB running locally **or** a MongoDB Atlas URI

### Start MongoDB locally (example)

```bash
mongod --dbpath /data/db --bind_ip 127.0.0.1 --port 27017
```

## Setup (first time)

```bash
cd wyxan-small-web
cp .env.example .env
cp .env.example apps/frontend/.env.local
npm install
npm run seed
```

`npm run seed` builds `@small-web/shared` first, then upserts people/sites/visits. No other manual compile step is required.

## Run

```bash
npm run dev
```

- UI: **http://localhost:3847**
- API: **http://localhost:3848/api**

Or separately:

```bash
npm run dev:backend
npm run dev:frontend
```

## Tests

```bash
npm test                 # unit + API integration
npm run test:e2e         # Playwright (API + UI must already be running)
npm run lint
npm run build
```

## Engineering notes

- **Session stack vs visits:** Back/Forward use an in-memory stack per person. Chronological history is MongoDB `visits`.
- **Search UI** is chrome state (query + results), not part of the navigation stack — switch back to the Search tab to return to results.
- **Scroll restore** uses parent→iframe `postMessage` (`restore-scroll`); the parent never calls `contentWindow.scrollTo` on the opaque-origin sandbox.
- **Async safety:** navigations are tied to entry ids + a generation counter; Back/Forward/person switches abort and ignore stale responses.
- **HTML security:** DOMPurify on publish; sandboxed iframe without `allow-same-origin`; trusted bootstrap only.

See `ANALYSIS.md`, `DEMO_SCRIPT.md`, and `CHECKLIST.md`.
