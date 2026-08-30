#!/usr/bin/env bash
set -euo pipefail

export DEPLOY_HOST="${DEPLOY_HOST:-138.68.79.138}"
export DEPLOY_USER="${DEPLOY_USER:-donvit}"
export DEPLOY_PORT="${DEPLOY_PORT:-22}"
export DEPLOY_DIR="${DEPLOY_DIR:-/var/www/qrscanner}"
export DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/id_ed25519}"
export DEPLOY_SERVER_NAME="${DEPLOY_SERVER_NAME:-apps.doni.md}"
export DEPLOY_FRONTEND_URL="${DEPLOY_FRONTEND_URL:-https://apps.doni.md}"

npm run deploy:remote -- --remote --host "$DEPLOY_HOST" --user "$DEPLOY_USER" --port "$DEPLOY_PORT" --deploy-dir "$DEPLOY_DIR" --ssh-key "$DEPLOY_SSH_KEY" --server-name "$DEPLOY_SERVER_NAME" --frontend-url "$DEPLOY_FRONTEND_URL"
