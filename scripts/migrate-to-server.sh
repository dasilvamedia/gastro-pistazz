#!/usr/bin/env bash
# Umzug von diesem (alten) Server auf einen frischen Hetzner-Server.
# Ausfuehren AUF DEM ALTEN SERVER als marcio:
#   scripts/migrate-to-server.sh <NEUE_IP>
#
# 1. server-setup.sh remote als root ausfuehren (Node, pm2, nginx, ufw, Swap)
# 2. Repo (.git, Code, .env.local, ohne node_modules/.next) + TLS-Zertifikat rsyncen
# 3. Remote: npm ci, Build, pm2 start (Cluster), Crontab
# 4. Smoke-Test ueber die neue IP (Host-Header), DNS wird NICHT automatisch umgestellt
set -euo pipefail

NEW_IP="${1:?Neue Server-IP fehlt}"
KEY="${KEY:-$HOME/.ssh/pistazz_hetzner}"
APP_DIR="${APP_DIR:-/home/marcio/gastro-pistazz}"
DOMAIN="${DOMAIN:-gastro.pistazz.io}"
SSH_ROOT="ssh -i $KEY -o StrictHostKeyChecking=accept-new root@$NEW_IP"
SSH_APP="ssh -i $KEY -o StrictHostKeyChecking=accept-new marcio@$NEW_IP"

echo "== 1/5 Server-Setup (root)"
$SSH_ROOT "DOMAIN=$DOMAIN bash -s" < "$(dirname "$0")/server-setup.sh"

echo "== 2/5 Zertifikat + Repo kopieren"
rsync -az -e "ssh -i $KEY" /etc/nginx/ssl/fullchain.cer /etc/nginx/ssl/pistazz.io.key root@"$NEW_IP":/etc/nginx/ssl/
$SSH_ROOT "chmod 600 /etc/nginx/ssl/pistazz.io.key && nginx -t && systemctl reload nginx"
rsync -az --delete -e "ssh -i $KEY" \
  --exclude node_modules --exclude .next --exclude .next.prev --exclude .claude/worktrees --exclude uploads \
  "$APP_DIR/" marcio@"$NEW_IP":"$APP_DIR/"

echo "== 3/5 Build + pm2 (Cluster) auf dem neuen Server"
$SSH_APP "cd $APP_DIR && npm ci --no-audit --no-fund && NODE_OPTIONS=--max-old-space-size=3072 npm run build && test -f .next/BUILD_ID && (pm2 delete gastro-pistazz >/dev/null 2>&1 || true) && pm2 start ecosystem.config.js --only gastro-pistazz && pm2 save && pm2 list"

echo "== 4/5 Crontab"
$SSH_APP "( crontab -l 2>/dev/null | grep -v 'gastro-pistazz/scripts/cron.sh'; echo '0 * * * * $APP_DIR/scripts/cron.sh expire-redemptions >> /home/marcio/gastro-cron.log 2>&1'; echo '5 11 * * * $APP_DIR/scripts/cron.sh sync-google-ratings >> /home/marcio/gastro-cron.log 2>&1'; echo '15 3 * * * $APP_DIR/scripts/cron.sh expire-trials >> /home/marcio/gastro-cron.log 2>&1' ) | crontab -"

echo "== 5/5 Smoke-Test ueber die neue IP"
for path in /home /entdecken /api/public/health; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' --resolve "$DOMAIN:443:$NEW_IP" "https://$DOMAIN$path" || true)
  echo "  $path -> $code"
done
echo
echo "Wenn /home 200 liefert: DNS-A-Record von $DOMAIN auf $NEW_IP stellen (All-Inkl KAS, TTL vorher 300)."
echo "Danach hier pruefen: curl -sI https://$DOMAIN/home | head -1   und   dig +short $DOMAIN"
echo "Alten Prozess erst 48 h spaeter stoppen: pm2 stop gastro-pistazz (auf dem alten Server)."
