# Final submission checklist

| Requirement | Implemented | Verified |
|-------------|-------------|----------|
| Next.js frontend | Yes | Yes — `next build` + Playwright |
| NestJS backend | Yes | Yes — integration + live API |
| MongoDB | Yes | Yes — seed + queries |
| Address bar | Yes | Playwright |
| Internal links (iframe) | Yes | Playwright |
| Back / Forward | Yes | Playwright |
| Forward truncation | Yes | Playwright |
| Scroll + HTML restore | Yes | Playwright (`postMessage` restore) |
| Per-person history | Yes | Playwright |
| History jump | Yes | Playwright |
| Body-text search | Yes | Playwright |
| Return to search results | Yes | Playwright (chrome UI state) |
| Publish | Yes | Playwright |
| Duplicate address reject | Yes | API integration |
| Broken addresses | Yes | Playwright |
| Malicious HTML contained | Yes | Playwright + sanitize checks |
| Seed ~10 sites / people / ~1h history | Yes | Seed twice → 5 / 10 / 37 seedKeys |
| Seed idempotent | Yes | Counts unchanged |
| Async race safety | Yes | Playwright delayed forest.zz |
| Node engines documented | Yes | `>=20 <23` |
| ESLint via `eslint .` | Yes | Ran |
| Production build | Yes | Ran |
| Playwright suite | Yes | **10/10 passed** (incl. cancelled-nav recovery) |
| Node engines align with jsdom | Yes | `>=22.22.2 <23` + `npm ci` |
| Pure Back/Forward updaters | Yes | `applyBack` / `applyForward` |
| Cancelled loading recovery | Yes | finalize + recoverEntry + e2e |
| Incremental git history | Yes | Multiple milestone commits |
| No secrets in git | Yes | `.env` gitignored |
| Narration script | Yes | `DEMO_SCRIPT.md` |

### Intentionally out of scope
Auth, bookmarks, tabs, Electron, downloads, asset hosting, real-network crawl.
