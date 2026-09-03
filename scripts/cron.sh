#!/usr/bin/env bash
# Cron-Wrapper fuer die internen Jobs. Liest CRON_SECRET zur Laufzeit aus der
# Env-Datei des Live-Servers (vercel.json-Crons laufen auf pm2 nie).
#
# Crontab (crontab -e):
#   0 * * * *   /home/marcio/gastro-pistazz/scripts/cron.sh expire-redemptions
#   5 11 * * *  /home/marcio/gastro-pistazz/scripts/cron.sh sync-google-ratings
#   15 3 * * *  /home/marcio/gastro-pistazz/scripts/cron.sh expire-trials
set -euo pipefail
JOB="${1:?Job-Name fehlt (z.B. expire-redemptions)}"
APP_DIR="${APP_DIR:-/home/marcio/gastro-pistazz}"
BASE_URL="${BASE_URL:-https://gastro.pistazz.io}"

SECRET="$(grep -E '^CRON_SECRET=' "$APP_DIR/.env.local" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
if [ -z "$SECRET" ]; then
  echo "CRON_SECRET nicht in $APP_DIR/.env.local gefunden" >&2
  exit 1
fi

curl -fsS -m 120 -H "Authorization: Bearer $SECRET" "$BASE_URL/api/cron/$JOB" \
  | sed "s/^/[$(date '+%Y-%m-%d %H:%M')] $JOB: /"
