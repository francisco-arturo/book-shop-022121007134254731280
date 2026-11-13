# Session Handoff — Prototype: book-shop-022121007134254731280

## Last Updated

- 2026-11-13 — classic rebuild pushed, deployed, highlighted and proposal drafted.

## Current Objective

Online bookstore with an inventory engine, ISBN scanner, supplier catalog importer and order router
that fulfils purchases from physical stock or supplier stock. The shelf carries 14 public-domain
classics with public-domain cover images.

## Current State

- **Live:** https://book-shop-022121007134254731280.vercel.app
- **Repository:** https://github.com/francisco-arturo/book-shop-022121007134254731280 (main at
  `3956ffc`).
- **Deployment:** `dpl_8GJUdnQEpfaSKtktT1HzzxY1JBaR`, READY in 5s, 19 files, 2,031.9 kB.
- Local review: http://127.0.0.1:4197 (`node dev-server.mjs`), managed job
  `pwsh-b1ca93ac49664f8b`.
- Verification: 13 engine/catalog tests, 2 served-route checks, 4 syntax checks, DOM interaction
  smoke, prototype 100/100.
- The build is in `project-highlights.md` as entry 2.
- The proposal is drafted at `upwork-kit/drafts/book-shop-022121007134254731280.md` and is not
  sent. It passed the kit checks.

## Recommended Next Step

1. Commit this live-record documentation update.
2. If the user sends feedback, update the draft or the build and re-run the relevant checks.
3. No further work is required unless the user asks for it.

## Files

- `index.html` — storefront, operations desk, bag, book detail, and confirmation shells.
- `assets/styles.css` — editorial light retail system, image-cover presentation, responsive layout.
- `assets/data.mjs` — 14 public-domain classics, cover credits, suppliers, orders, sample CSV.
- `assets/engine.mjs` — ISBN validation, availability, routing, allocation, totals, CSV import, filters.
- `assets/app.mjs` — rendering and interaction layer for the storefront and operations desk.
- `assets/covers/` — 14 compressed local public-domain cover images.
- `COVERS.md` — cover source and rights table.
- `dev-server.mjs` — local static server on port 4197, with JPEG MIME support; excluded from deployment.
- `tests/run.mjs` — engine, catalog and cover-file tests.
- `tests/smoke.mjs` — served-route smoke test.
- `init.ps1` / `init.sh` — verification entrypoints.

## Blockers

- None.

## Next Session

- Do not create a second directory; continue in this one.
- The approval gate has been passed, the repository is pushed and the deployment is live.
- Retirement, if ever needed, goes through the workspace `retire-prototype.ps1`.
