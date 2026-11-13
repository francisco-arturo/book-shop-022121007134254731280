# Demo — Folio & Co. (book-shop-022121007134254731280)

A working bookstore prototype built from the Upwork brief for an online bookstore with an
inventory engine, ISBN scanner, catalog importer, and order router.

- **Live URL:** not deployed yet. This is the local review build, waiting for approval and a
  repository URL.
- **Local review:** [http://127.0.0.1:4197](http://127.0.0.1:4197)
- **Run it:** `node dev-server.mjs` from this directory
- **Deploy after approval:** `node .harness/deploy.mjs book-shop-022121007134254731280` from the
  workspace root
- **Last verified:** 2026-11-13

## The 60-second path

| # | Do this | What you should see |
|---|---|---|
| 1 | Open the local URL | A seeded shopfront with 14 titles, a featured book, live stock badges, and a working bag. No login. |
| 2 | Add **The Overstory** (in stock) and **Piranesi** (supplier) | Badge count moves to 2. The cards show the shelf copies separately from supplier copies. |
| 3 | Open **Bag** | Two route notes: one from the shelf, one from Bookazine. Choose pickup or shipping and place the demo order. |
| 4 | Read the confirmation | Order `FS-1043` shows one copy pulled today from the shelf and one supplier copy with an estimated date. |
| 5 | Click **See it in the order router** | The operations desk opens with the new order in the queue, stock reduced, and route filters. |
| 6 | Click **Try a sample scan** | ISBN `9781635575637` resolves to *Piranesi*: zero on hand, Bookazine lead time, and an order-in action. |
| 7 | Click **Validate & import** | Four supplier titles are checksum-verified and added to the catalog; the inventory grows from 14 to 18 and the storefront gains them. |

## The one sentence to say about it

> "Every title tells the customer where the copy comes from before they buy, and the same inventory
> logic routes the order behind the scenes."

## What is deliberately fake

- The shop, stock counts, prices, suppliers, customers, and order history are seeded demo data in
  `assets/data.mjs`. The book titles and ISBN-13s are real; the inventory is not.
- Checkout is simulated. No payment is taken and no order leaves the browser.
- The "scanner" accepts keyboard-wedge or typed ISBN-13s. It does not open a camera.
- The catalog importer accepts pasted CSV. It validates ISBN-13 checksums, duplicates, prices, and
  supplier names, but it is not connected to a supplier API.
- State lives in memory. A refresh resets stock, imported titles, the bag, and new orders.
- Accounts and authentication are deliberately absent. The operations desk is a one-click view.

## If something fails while they look

- Refresh the page to return to the seeded state.
- If the local port is busy: `$env:PORT=4198; node dev-server.mjs` then open
  `http://127.0.0.1:4198`.
- Verification: `powershell -ExecutionPolicy Bypass -File .\init.ps1` (12 engine tests, 2 route
  checks, 4 syntax checks).

## Not built (next, if the user wants it)

- Persistent database and real inventory writes.
- Camera-based barcode scanning.
- Live supplier catalog feeds and purchase orders.
- Real payment, customer accounts, and fulfilment notifications.
- Per-copy reservations and expiry holds during checkout.
