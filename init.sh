#!/bin/bash
set -e

echo "=== Folio & Co. verification ==="

echo "=== Inventory, routing and catalog tests ==="
node tests/run.mjs

echo "=== Served-route smoke test ==="
node tests/smoke.mjs

echo "=== Syntax checks ==="
node --check assets/app.mjs
node --check assets/engine.mjs
node --check assets/data.mjs
node --check dev-server.mjs

echo ""
echo "=== Verification Complete ==="
echo "Start locally: node dev-server.mjs"
echo "Then open: http://127.0.0.1:4197"
