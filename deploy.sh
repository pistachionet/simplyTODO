#!/usr/bin/env bash
set -euo pipefail

# ── MindTodo Fly.io Deploy Script ──────────────────────────────────────
# Usage:
#   ./deploy.sh              # standard deploy
#   ./deploy.sh --skip-build # skip local build verification
#   ./deploy.sh --dry-run    # build Docker image locally but don't push

APP_NAME="mindtodo"
APP_URL="https://${APP_NAME}.fly.dev"

# ── Defaults ───────────────────────────────────────────────────────────
SKIP_BUILD=false
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    --dry-run)    DRY_RUN=true ;;
    -h|--help)
      echo "Usage: ./deploy.sh [--skip-build] [--dry-run]"
      echo ""
      echo "  --skip-build   Skip local Vite build verification"
      echo "  --dry-run      Build the Docker image locally without deploying"
      echo "  -h, --help     Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg"
      exit 1
      ;;
  esac
done

# ── Helpers ────────────────────────────────────────────────────────────
info()  { printf "\033[1;34m▸ %s\033[0m\n" "$1"; }
ok()    { printf "\033[1;32m✔ %s\033[0m\n" "$1"; }
warn()  { printf "\033[1;33m⚠ %s\033[0m\n" "$1"; }
fail()  { printf "\033[1;31m✖ %s\033[0m\n" "$1"; exit 1; }

# ── 1. Pre-flight checks ──────────────────────────────────────────────
info "Running pre-flight checks..."

# Verify fly CLI is installed
if ! command -v fly &>/dev/null; then
  fail "Fly CLI (flyctl) is not installed. Install it: https://fly.io/docs/flyctl/install/"
fi
ok "Fly CLI found: $(fly version 2>/dev/null || echo 'unknown')"

# Verify fly.toml exists
if [[ ! -f fly.toml ]]; then
  fail "fly.toml not found. Run this script from the project root."
fi
ok "fly.toml found"

# Verify authenticated with Fly
if ! fly auth whoami &>/dev/null; then
  fail "Not authenticated with Fly.io. Run: fly auth login"
fi
ok "Authenticated as: $(fly auth whoami 2>/dev/null)"

# Verify the app exists on Fly.io
if ! fly status --app "$APP_NAME" &>/dev/null; then
  fail "App '$APP_NAME' not found on Fly.io. Create it first: fly apps create $APP_NAME"
fi
ok "App '$APP_NAME' exists on Fly.io"

# Check for uncommitted changes
if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
  warn "You have uncommitted changes. Consider committing before deploying."
  read -rp "   Continue anyway? [y/N] " confirm
  if [[ "$confirm" != [yY] ]]; then
    echo "Aborted."
    exit 1
  fi
else
  ok "Working tree is clean"
fi

# Show the current git ref being deployed
GIT_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
info "Deploying commit $GIT_REF ($GIT_BRANCH)"

# ── 2. Local build verification ───────────────────────────────────────
if [[ "$SKIP_BUILD" == false ]]; then
  info "Verifying local Vite build..."
  if npm run build; then
    ok "Client build succeeded"
  else
    fail "Client build failed. Fix errors before deploying."
  fi
else
  warn "Skipping local build verification (--skip-build)"
fi

# ── 3. Deploy ─────────────────────────────────────────────────────────
if [[ "$DRY_RUN" == true ]]; then
  info "Dry run: building Docker image locally..."
  fly deploy --build-only --app "$APP_NAME"
  ok "Docker image built successfully (dry run, not deployed)"
  exit 0
fi

info "Deploying to Fly.io..."
fly deploy --app "$APP_NAME"
ok "Deployment complete"

# ── 4. Post-deploy health check ───────────────────────────────────────
info "Running post-deploy health check..."

# Wait a moment for the machine to start
sleep 5

RETRIES=6
DELAY=5
HEALTHY=false

for i in $(seq 1 $RETRIES); do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$APP_URL/api/health" 2>/dev/null || echo "000")
  if [[ "$HTTP_STATUS" -ge 200 && "$HTTP_STATUS" -lt 400 ]]; then
    HEALTHY=true
    break
  fi
  warn "Attempt $i/$RETRIES: got HTTP $HTTP_STATUS, retrying in ${DELAY}s..."
  sleep "$DELAY"
done

if [[ "$HEALTHY" == true ]]; then
  ok "Health check passed (HTTP $HTTP_STATUS)"
else
  warn "Health check failed after $RETRIES attempts. The app may still be starting."
  warn "Check logs: fly logs --app $APP_NAME"
fi

# ── 5. Summary ─────────────────────────────────────────────────────────
echo ""
echo "┌────────────────────────────────────────┐"
echo "│  Deploy Summary                        │"
echo "├────────────────────────────────────────┤"
printf "│  App:     %-28s│\n" "$APP_NAME"
printf "│  Commit:  %-28s│\n" "$GIT_REF ($GIT_BRANCH)"
printf "│  URL:     %-28s│\n" "$APP_URL"
echo "│                                        │"
echo "│  Useful commands:                      │"
echo "│    fly logs     - view logs            │"
echo "│    fly status   - check app status     │"
echo "│    fly ssh console - SSH into machine  │"
echo "└────────────────────────────────────────┘"
