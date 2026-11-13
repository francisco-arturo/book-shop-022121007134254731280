# Progress — Prototype: book-shop-022121007134254731280

## Current State

- **Classic rebuild complete, pushed and deployed on 2026-11-13.** The proposal is drafted but not
  sent. Remaining: final documentation commit.
- Live URL: https://book-shop-022121007134254731280.vercel.app
- Repository: https://github.com/francisco-arturo/book-shop-022121007134254731280 (main at `3956ffc`).
- Folio & Co. is a seeded independent-bookshop storefront plus an operations desk, built as static
  HTML, CSS and ES modules.
- The catalog now carries 14 public-domain classics: Austen, Melville, Brontë, Fitzgerald, Shelley,
  Stoker, Wilde, Carroll, Baum, Doyle, Wells, Alcott and Thoreau.
- All 14 covers are local public-domain scans or photographs of early editions from Wikimedia
  Commons. Each book detail carries a source credit; `COVERS.md` holds the full table.
- Storefront: search, category filters, sort, book detail, bag, shipping choice, and a simulated
  checkout.
- Inventory engine: per-title shelf stock, low-stock threshold, supplier lead time, and automatic
  split allocation when a bag quantity exceeds shelf stock.
- ISBN scanner: keyboard-wedge or typed ISBN-13, checksum validation, shelf/supplier lookup, and an
  import handoff for unknown barcodes.
- Catalog importer: pasted CSV, quoted-comma parsing, ISBN checksum validation, duplicate skipping,
  supplier validation, and immediate shelf updates. Four public-domain classics are loaded as the
  sample file.
- Order router: seeded queue plus new checkouts, grouped by shelf, supplier, or split route, with
  stock deduction after a routed order.
- Local review URL: http://127.0.0.1:4197. The preview server is running as managed job
  `pwsh-b1ca93ac49664f8b`.

## Current Objective

The build is live, the repository is pushed, the highlighted projects entry is in place and the
proposal is drafted. Only the final documentation commit remains.

## Last Updated

- **Last Updated**: 2026-11-13
- **Recommended Next Step**: commit the live-record documentation update.

## What Ran

| Command | Result |
|---|---|
| `node tests/run.mjs` | 13 passed, 0 failed: ISBN checks, all 14 cover files and credits present, availability, three route types, allocation, totals, CSV parsing/import, seed totals, filters, lead dates |
| `node tests/smoke.mjs` | ok 13: entry route, CSS, app module and a JPEG cover served with the right MIME; ok 14: unknown route returns 404 |
| `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1` | all checks passed; 4 syntax checks clean |
| `node .qa/dom-check.mjs` (local QA only) | classic catalog, 14 image covers, cover credit, bag, checkout, confirmation, router, scanner and 4-title import all responded; no client errors |
| `Invoke-WebRequest http://127.0.0.1:4197/` | status 200, 19,622 bytes |
| `Invoke-WebRequest .../assets/covers/great-gatsby.jpg` | status 200, `image/jpeg`, 357,587 bytes |
| `node ..\.harness\validate.mjs --target . --min-score 70` | 100/100, threshold 70 |
| `node .harness/deploy.mjs book-shop-022121007134254731280` | READY in 5s, 19 files, 2,031.9 kB, `dpl_8GJUdnQEpfaSKtktT1HzzxY1JBaR` |
| Node fetch against the live alias | `/` 200 19,622 bytes, CSS 200 55,474 bytes, app module 200 34,360 bytes, Gatsby cover 200 `image/jpeg` 141,709 bytes, Pride cover 200 `image/jpeg` 292,123 bytes |

## Verification Evidence

- 13 engine, catalog and cover-file tests passed, 0 failed.
- Served-route smoke passed for the app shell, CSS, browser module and a cover image, with a 404 for
  an unknown route.
- Every seeded classic was checked for a valid ISBN-13, an existing local cover file, a cover credit,
  and a Wikimedia Commons source URL.
- DOM smoke walked the exact demo path and confirmed 14 image covers in the grid, the Gatsby hero,
  the cover credit, add-to-bag, order `FS-1043`, router, Jane Eyre scan and 4-title import.
- Headless Chrome and Edge cannot start inside this sandbox (crashpad and mojo pipe access denied),
  so visual QA is the rendered-DOM smoke, direct inspection of all 14 cover images, and CSS review.

## Next

1. Commit this documentation update.
2. The proposal is at `upwork-kit/drafts/book-shop-022121007134254731280.md`; it passed the kit
   checks and is not sent.
3. If the user later asks for revisions, update that draft and re-run the checklist.

## Blockers

- None.
