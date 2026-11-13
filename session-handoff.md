# Session Handoff — Prototype: book-shop-022121007134254731280

## Last Updated

- 2026-11-13 — classic-edition rebuild verified locally; push, deploy, highlight entry and proposal
  are the remaining steps.

## Current Objective

Online bookstore with an inventory engine, ISBN scanner, supplier catalog importer and order router
that fulfils purchases from physical stock or supplier stock, plus a storefront and operations console
on seeded demo data. The shelf now uses 14 public-domain classics with public-domain cover images.

## Current State

- Folio & Co. storefront and operations desk are implemented as static HTML/CSS/ES modules.
- Local review build: http://127.0.0.1:4197 (`node dev-server.mjs`), managed job
  `pwsh-b1ca93ac49664f8b`.
- Verification: 13 engine/catalog tests, 2 served-route checks, 4 syntax checks, and a DOM
  interaction smoke all passing. Prototype score 100/100.
- The repository is local at commit `88fab9e` plus uncommitted classic-rebuild work. The approved
  remote is `https://github.com/francisco-arturo/book-shop-022121007134254731280.git`.
- Not yet pushed or deployed at the time of this handoff.

## Recommended Next Step

1. Commit the classic rebuild.
2. Push to the approved remote with a one-shot `danger-full-access` approval.
3. Deploy with `node .harness/deploy.mjs book-shop-022121007134254731280`.
4. Verify the live URL returns 200 and the cover images load with `image/jpeg`.
5. Update `DEMO.md`, `progress.md` and `feature_list.json` with the live URL.
6. Add the entry to `project-highlights.md`.
7. Draft the proposal from the original listing and run the kit checklist.

## Files

- `index.html` — storefront, operations desk, bag, book detail, and confirmation shells.
- `assets/styles.css` — editorial light retail system, image-cover presentation, responsive layout.
- `assets/data.mjs` — 14 public-domain classics, cover credits, suppliers, orders, sample CSV.
- `assets/engine.mjs` — ISBN validation, availability, routing, allocation, totals, CSV import, filters.
- `assets/app.mjs` — rendering and interaction layer for the storefront and operations desk.
- `assets/covers/` — 14 local public-domain cover images.
- `COVERS.md` — cover source and rights table.
- `dev-server.mjs` — local static server on port 4197, with JPEG MIME support; excluded from deployment.
- `tests/run.mjs` — engine, catalog and cover-file tests.
- `tests/smoke.mjs` — served-route smoke test.
- `init.ps1` / `init.sh` — verification entrypoints.

## Blockers

- None.

## Next Session

- Do not create a second directory; continue in this one.
- The approval gate has been passed by the user for this build. The repository URL is supplied.
- Retirement, if ever needed, goes through the workspace `retire-prototype.ps1`.
