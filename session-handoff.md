# Session Handoff — Prototype: book-shop-022121007134254731280

## Last Updated

- 2026-11-13 — build complete, verified, and handed over for local review.

## Current Objective

Online bookstore with an inventory engine, ISBN scanner, supplier catalog importer and order router
that fulfils purchases from physical stock or supplier stock, plus a storefront and operations console
on seeded demo data.

## Current State

- Folio & Co. storefront and operations desk are implemented as static HTML/CSS/ES modules.
- Local review build: http://127.0.0.1:4197 (`node dev-server.mjs`).
- Verification: 12 engine tests, 2 served-route checks, 4 syntax checks, and a DOM interaction smoke
  all passing. Workspace gate green; prototype score 100/100.
- Nothing has been pushed or deployed. The user has not yet shared a repository URL.

## Recommended Next Step

1. Wait for the user to review http://127.0.0.1:4197.
2. If approved, collect the GitHub repository URL, confirm it is
   `book-shop-022121007134254731280`, add it to `github.json` approved remotes, and push.
3. Deploy with `node .harness/deploy.mjs book-shop-022121007134254731280` from the workspace root.
4. Update `DEMO.md` with the live URL and verified timestamp.
5. Write a proposal only if the user explicitly asks for one.

## Files

- `index.html` — storefront, operations desk, bag, book detail, and confirmation shells.
- `assets/styles.css` — editorial light retail system, responsive layout, covers, panels, dialogs.
- `assets/data.mjs` — seeded catalog, suppliers, orders, and sample supplier CSV.
- `assets/engine.mjs` — ISBN validation, availability, routing, allocation, totals, CSV import, filters.
- `assets/app.mjs` — rendering and interaction layer for the storefront and operations desk.
- `dev-server.mjs` — local static server on port 4197; excluded from deployment.
- `tests/run.mjs` — engine and catalog tests.
- `tests/smoke.mjs` — served-route smoke test.
- `init.ps1` / `init.sh` — verification entrypoints.

## Blockers

- None.

## Next Session

- Do not create a second directory; continue in this one.
- Do not deploy before the user approves the local build and provides the repository URL.
- Retirement, if ever needed, goes through the workspace `retire-prototype.ps1`.
