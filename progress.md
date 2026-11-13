# Progress — Prototype: book-shop-022121007134254731280

## Current State

- **Built and verified locally on 2026-11-13.** No deployment yet: the workflow requires the user's
  review and a repository URL before push and deploy.
- Folio & Co. is a seeded independent-bookshop storefront plus an operations desk.
- Storefront: 14 seeded titles with real ISBN-13s, stock badges, search, category filters, sort,
  book detail, bag, shipping choice, and a simulated checkout.
- Inventory engine: per-title shelf stock, low-stock threshold, supplier lead time, and automatic
  split allocation when a bag quantity exceeds shelf stock.
- ISBN scanner: keyboard-wedge or typed ISBN-13, checksum validation, shelf/supplier lookup, and an
  import handoff for unknown barcodes.
- Catalog importer: pasted CSV, quoted-comma parsing, ISBN checksum validation, duplicate skipping,
  supplier validation, and immediate shelf updates.
- Order router: seeded queue plus new checkouts, grouped by shelf, supplier, or split route, with
  stock deduction after a routed order.
- Local review URL: http://127.0.0.1:4197. The preview server is running as a managed job.

## Current Objective

Deliver the first complete slice of the bookstore brief, verify it, and hand it over for local review
without deploying.

## Last Updated

- **Last Updated**: 2026-11-13
- **Recommended Next Step**: the user reviews http://127.0.0.1:4197. On approval, collect the
  repository URL, add it to `github.json` approved remotes, push, then deploy.

## What Ran

| Command | Result |
|---|---|
| `node tests/run.mjs` | 12 passed, 0 failed (ISBN checksums, availability, three route types, allocation, totals, CSV parsing/import, seed totals, filters, lead dates) |
| `node tests/smoke.mjs` | ok 13: entry route, CSS and app module served; ok 14: unknown route returns 404 |
| `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1` | all 4 syntax checks clean; verification completed |
| `Invoke-WebRequest http://127.0.0.1:4197/` | status 200, 19,455 bytes |
| DOM interaction smoke (jsdom, local QA only) | catalog, add to bag, second title, checkout, confirmation, router, scanner, and 4-title import all responded; no browser errors |
| `node .harness/gate.mjs` (workspace root) | PASS, 165 prototypes verified, `book-shop-022121007134254731280` scored 100/100, registry drift clean |

## Verification Evidence

The prototype entrypoint output:

- 12 inventory/routing tests passed, 0 failed.
- Served-route smoke: entry, CSS, and browser module return 200; missing route returns 404.
- `node --check` passed for `assets/app.mjs`, `assets/engine.mjs`, `assets/data.mjs`, and
  `dev-server.mjs`.
- Workspace gate green; the new prototype scored 100/100 against the 70 structural threshold.

The DOM smoke exercised the exact demo path: add *The Overstory*, add *Piranesi*, open the bag,
place order `FS-1043`, open the router, scan *Piranesi*, and import the four-row supplier sample.
It confirmed the catalog grew from 14 to 18 titles and no client errors fired.

Headless Chrome and Edge cannot start inside this sandbox (crashpad and mojo pipe access denied), so
visual QA is the rendered-DOM smoke plus a CSS review rather than a screenshot. The served JS, CSS and
entry route were all checked over HTTP, and the layout was reviewed at desktop and mobile breakpoints
in source.

## Next

1. User reviews the local build and confirms it is the right direction.
2. If approved: create the GitHub repository `book-shop-022121007134254731280`, share the URL, then
   push and run `node .harness/deploy.mjs book-shop-022121007134254731280`.
3. Update `DEMO.md` with the live URL after deployment.
4. Only if the user asks: write the proposal using `upwork-kit/`.

## Blockers

- None. Deployment is intentionally gated on user approval and the repository URL.
