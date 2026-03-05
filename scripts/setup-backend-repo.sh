#!/bin/bash
###############################################################################
# setup-backend-repo.sh
#
# Creates a standalone xbworld-server git repo from xbworld-backend/.
#
# Usage:
#   ./scripts/setup-backend-repo.sh [target-dir]
#
# Default target: ../xbworld-server
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET="${1:-$MONO_ROOT/../xbworld-server}"

if [ -d "$TARGET/.git" ]; then
  echo "Error: $TARGET already exists and is a git repo."
  exit 1
fi

echo "==> Creating standalone backend repo at $TARGET"
mkdir -p "$TARGET"
cd "$TARGET"
git init -b main

# Copy backend source files
echo "==> Copying backend files..."
cp "$MONO_ROOT/xbworld-backend"/*.py "$TARGET/"
cp "$MONO_ROOT/xbworld-backend/requirements.txt" "$TARGET/"
cp "$MONO_ROOT/xbworld-backend/Dockerfile" "$TARGET/"
cp "$MONO_ROOT/xbworld-backend/docker-compose.yml" "$TARGET/"
cp "$MONO_ROOT/xbworld-backend/railway.toml" "$TARGET/"
cp "$MONO_ROOT/xbworld-backend/README.md" "$TARGET/"
cp "$MONO_ROOT/xbworld-backend/.gitignore" "$TARGET/"
cp "$MONO_ROOT/xbworld-backend/.dockerignore" "$TARGET/"

# Copy directories
cp -r "$MONO_ROOT/xbworld-backend/data" "$TARGET/"
cp -r "$MONO_ROOT/xbworld-backend/static" "$TARGET/"

# Copy freeciv wrapper (without the submodule content)
mkdir -p "$TARGET/freeciv"
cp "$MONO_ROOT/xbworld-backend/freeciv"/*.md "$TARGET/freeciv/" 2>/dev/null || true
cp "$MONO_ROOT/xbworld-backend/freeciv"/*.fcproj "$TARGET/freeciv/" 2>/dev/null || true
cp "$MONO_ROOT/xbworld-backend/freeciv"/*.sh "$TARGET/freeciv/" 2>/dev/null || true
cp "$MONO_ROOT/xbworld-backend/freeciv"/*.txt "$TARGET/freeciv/" 2>/dev/null || true
cp "$MONO_ROOT/xbworld-backend/freeciv"/*.lst "$TARGET/freeciv/" 2>/dev/null || true
cp "$MONO_ROOT/xbworld-backend/freeciv/.gitignore" "$TARGET/freeciv/" 2>/dev/null || true

# Add freeciv as submodule
echo "==> Adding freeciv submodule..."
git submodule add --branch xbworld \
  https://github.com/xingbo778/freeciv.git freeciv/freeciv

# Stage and commit
git add -A
git commit -m "Initial commit: standalone xbworld-server backend

Extracted backend code from xbworld monorepo into independent repository.
Includes FastAPI server, freeciv C engine (submodule), AI agent system,
WebSocket proxy, and Railway deployment configuration."

echo ""
echo "==> Done! Standalone backend repo created at: $TARGET"
echo ""
echo "Next steps:"
echo "  1. Create a new repo on GitHub: https://github.com/new"
echo "     Name: xbworld-server"
echo ""
echo "  2. Push to GitHub:"
echo "     cd $TARGET"
echo "     git remote add origin https://github.com/xingbo778/xbworld-server.git"
echo "     git push -u origin main"
echo ""
echo "  3. Connect to Railway:"
echo "     - Go to Railway dashboard"
echo "     - Create new project → Deploy from GitHub repo"
echo "     - Select xingbo778/xbworld-server"
echo "     - Set environment variables (LLM_API_KEY, etc.)"
