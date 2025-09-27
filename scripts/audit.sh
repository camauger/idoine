#!/usr/bin/env bash
set -euo pipefail

echo "[Node] Running npm audit..."
npm run audit || true

echo "[Python] Running pip-audit..."
pip-audit || true

echo "Audits completed."

