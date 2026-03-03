#!/bin/bash
# Local frontend development against remote backend.
#
# Usage:
#   ./scripts/dev.sh                          # uses production backend
#   BACKEND_URL=http://localhost:8080 ./scripts/dev.sh  # uses local backend
#
# This starts Vite dev server on http://localhost:3000 with:
#   - Hot Module Replacement for TS changes
#   - WebSocket/API proxy to the remote backend
#   - No need to rebuild Docker or redeploy
#
# Prerequisites:
#   cd xbworld-web && npm install

set -euo pipefail
cd "$(dirname "$0")/.."

export BACKEND_URL="${BACKEND_URL:-https://xbworld-production.up.railway.app}"

echo "=== XBWorld Frontend Dev Server ==="
echo "Backend: $BACKEND_URL"
echo "Local:   http://localhost:3000/webclient/index.html?action=new&type=singleplayer"
echo ""

npx vite --config vite.config.dev.ts
