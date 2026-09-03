#!/usr/bin/env bash
# Deploy von gastro-pistazz auf diesem Server (pm2, Port 3003).
#
# Ablauf: optional Branch fast-forward mergen, Nebenapps stoppen (der Build
# braucht ~3 GB RAM), alte .next als Rollback sichern, bauen, BUILD_ID
# pruefen, pm2 neu starten, Nebenapps wieder starten.
#
# Nutzung:
#   scripts/deploy.sh                       # baut den aktuellen Stand
#   BRANCH=claude/xyz scripts/deploy.sh     # merged Branch per --ff-only vorher
set -euo pipefail

APP_DIR="${APP_DIR:-/home/marcio/gastro-pistazz}"
PM2_APP="${PM2_APP:-gastro-pistazz}"
# Apps, die waehrend des Builds pausieren. edit-pistazz steckt in einer
# Fehler-Schleife und wird bewusst NICHT wieder gestartet.
SIDE_APPS_STOP="${SIDE_APPS_STOP:-xpert-crm edit-pistazz}"
SIDE_APPS_START="${SIDE_APPS_START:-xpert-crm}"

cd "$APP_DIR"

if [ -n "${BRANCH:-}" ]; then
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo "Arbeitsverzeichnis nicht sauber, Merge abgebrochen." >&2
    exit 1
  fi
  git merge --ff-only "$BRANCH"
fi

for a in $SIDE_APPS_STOP; do pm2 stop "$a" >/dev/null 2>&1 || true; done
pkill -f jest-worker >/dev/null 2>&1 || true

rollback() {
  echo "Build fehlgeschlagen, stelle vorherige .next wieder her." >&2
  if [ -d .next.prev ]; then rm -rf .next && mv .next.prev .next; fi
  for a in $SIDE_APPS_START; do pm2 start "$a" >/dev/null 2>&1 || true; done
}

rm -rf .next.prev
[ -d .next ] && cp -r .next .next.prev

if ! NODE_OPTIONS=--max-old-space-size=3072 npm run build; then rollback; exit 1; fi
if [ ! -f .next/BUILD_ID ]; then rollback; exit 1; fi

echo "BUILD_ID: $(cat .next/BUILD_ID)"
# Cluster-Modus aus ecosystem.config.js; ein noch im Fork-Modus laufender
# Prozess (alter start.sh) wird einmalig ersetzt, danach reicht reload.
if pm2 describe "$PM2_APP" 2>/dev/null | grep -q "exec mode.*fork"; then
  pm2 delete "$PM2_APP" >/dev/null 2>&1 || true
  pm2 start ecosystem.config.js --only "$PM2_APP"
else
  pm2 startOrReload ecosystem.config.js --only "$PM2_APP" --update-env
fi
pm2 save >/dev/null 2>&1 || true
for a in $SIDE_APPS_START; do pm2 start "$a" >/dev/null 2>&1 || true; done
rm -rf .next.prev
pm2 list
echo "Deploy fertig: $(git log --oneline -1)"
