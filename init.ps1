# init.ps1 - Windows verification entrypoint for Folio & Co.
#
# Runs the inventory/order-router tests, the served-route smoke test, and a
# syntax check on every browser module. Fails fast on the first bad check.
# Keep in sync with ./init.sh.

$ErrorActionPreference = 'Stop'

function Invoke-Checked {
    param([string]$Label, [scriptblock]$Command)
    Write-Host "=== $Label ==="
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "Check failed ($Label) with exit code $LASTEXITCODE"
    }
}

Write-Host '=== Folio & Co. verification ==='

Invoke-Checked -Label 'Inventory, routing and catalog tests' -Command { node tests/run.mjs }
Invoke-Checked -Label 'Served-route smoke test' -Command { node tests/smoke.mjs }
Invoke-Checked -Label 'Syntax: browser app' -Command { node --check assets/app.mjs }
Invoke-Checked -Label 'Syntax: inventory engine' -Command { node --check assets/engine.mjs }
Invoke-Checked -Label 'Syntax: seed data' -Command { node --check assets/data.mjs }
Invoke-Checked -Label 'Syntax: local server' -Command { node --check dev-server.mjs }

Write-Host ''
Write-Host '=== Verification Complete ==='
Write-Host 'Start locally: node dev-server.mjs'
Write-Host 'Then open: http://127.0.0.1:4197'
