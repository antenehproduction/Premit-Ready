#!/bin/bash
# SessionStart hook — bootstrap claude-mem for Claude Code on the web.
#
# On a developer machine claude-mem is installed once at user scope (~/.claude)
# and covers every project. Web sessions get a fresh, ephemeral container each
# time, so that install is absent on every start and has to be redone here.
#
# This script fails open on purpose: every failure path logs and exits 0, so a
# broken install or a slow registry can never stop a session from starting.

set -uo pipefail

# Local machines are already covered by the user-scope install; only the
# throwaway web containers need bootstrapping.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Pinned to the version validated against this repo. Bump deliberately after
# re-running the hook, or override per-session with CLAUDE_MEM_VERSION.
CM_VERSION="${CLAUDE_MEM_VERSION:-13.15.2}"
CM_SYNC_HOST="${CLAUDE_MEM_SYNC_HOST:-cmem.ai}"
CM_DATA_DIR="${CLAUDE_MEM_DATA_DIR:-$HOME/.claude-mem}"
LOG_FILE="${TMPDIR:-/tmp}/claude-mem-bootstrap.log"

log() { printf '[claude-mem] %s\n' "$*" >>"$LOG_FILE" 2>/dev/null; }

: >"$LOG_FILE" 2>/dev/null
log "bootstrap start (claude-mem@${CM_VERSION})"

if ! command -v npx >/dev/null 2>&1; then
  log "npx not on PATH; nothing to do"
  exit 0
fi

# Cloud sync is the only thing that carries memory past this container. Without
# a reachable sync host every web session necessarily starts from an empty
# database, so say so plainly in the log rather than failing silently.
configure_cloud_sync() {
  if [ -z "${CLAUDE_MEM_SERVER_API_KEY:-}" ]; then
    log "cloud sync OFF — CLAUDE_MEM_SERVER_API_KEY is not set; memory will be session-scoped only"
    return
  fi

  if ! curl -fsS -o /dev/null --max-time 15 "https://${CM_SYNC_HOST}" 2>>"$LOG_FILE"; then
    log "cloud sync UNAVAILABLE — https://${CM_SYNC_HOST} is not reachable from this container"
    log "  allowlist ${CM_SYNC_HOST} in the environment's network egress policy to enable it"
    return
  fi

  mkdir -p "$CM_DATA_DIR" 2>/dev/null
  CM_SETTINGS="${CM_DATA_DIR}/settings.json" \
  CM_URL="${CLAUDE_MEM_SERVER_URL:-https://${CM_SYNC_HOST}}" \
  node -e '
    const fs = require("fs");
    const path = process.env.CM_SETTINGS;
    let current = {};
    try { current = JSON.parse(fs.readFileSync(path, "utf8")); } catch {}
    current.CLAUDE_MEM_SERVER_API_KEY = process.env.CLAUDE_MEM_SERVER_API_KEY;
    current.CLAUDE_MEM_SERVER_URL = process.env.CM_URL;
    if (process.env.CLAUDE_MEM_SERVER_PROJECT_ID) {
      current.CLAUDE_MEM_SERVER_PROJECT_ID = process.env.CLAUDE_MEM_SERVER_PROJECT_ID;
    }
    fs.writeFileSync(path, JSON.stringify(current, null, 2) + "\n", { mode: 0o600 });
  ' >>"$LOG_FILE" 2>&1 || { log "cloud sync config failed; continuing without it"; return; }

  chmod 600 "${CM_DATA_DIR}/settings.json" 2>/dev/null
  log "cloud sync ON — syncing to ${CLAUDE_MEM_SERVER_URL:-https://${CM_SYNC_HOST}}"
}

# The installer registers the plugin under ~/.claude and is safe to re-run, but
# skipping the reinstall keeps warm containers (resume, clear, compact) fast.
if [ -f "$HOME/.claude/plugins/installed_plugins.json" ] \
   && grep -q 'claude-mem' "$HOME/.claude/plugins/installed_plugins.json" 2>/dev/null; then
  log "already installed; skipping reinstall"
else
  log "installing claude-mem@${CM_VERSION} ..."
  if npx -y "claude-mem@${CM_VERSION}" install >>"$LOG_FILE" 2>&1; then
    log "install OK"
  else
    log "install FAILED (see $LOG_FILE) — continuing without memory"
    exit 0
  fi
fi

configure_cloud_sync

# The worker does the compression and serves the search tools; without it the
# plugin is registered but inert.
if npx -y "claude-mem@${CM_VERSION}" start >>"$LOG_FILE" 2>&1; then
  log "worker started"
else
  log "worker failed to start (see $LOG_FILE) — continuing without memory"
fi

log "bootstrap done"
exit 0
