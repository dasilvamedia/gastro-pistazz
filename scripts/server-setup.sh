#!/usr/bin/env bash
# Einmalige Einrichtung eines frischen Ubuntu-24.04-Servers (Hetzner) fuer
# gastro-pistazz. Laeuft als root. Idempotent: mehrfach ausfuehrbar.
#
# Ergebnis: Nutzer marcio mit /home/marcio/gastro-pistazz (gleicher Pfad wie
# bisher, damit ecosystem.config.js und scripts/deploy.sh unveraendert
# funktionieren), Node 22 LTS, pm2 (Autostart), nginx mit Reverse-Proxy auf
# Port 3003, ufw (22/80/443), Swap 4 GB, unattended-upgrades.
set -euo pipefail

APP_USER="marcio"
APP_DIR="/home/${APP_USER}/gastro-pistazz"
DOMAIN="${DOMAIN:-gastro.pistazz.io}"

echo "== Pakete"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git nginx ufw unattended-upgrades ca-certificates gnupg rsync fail2ban >/dev/null

echo "== Node 22 LTS"
if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
node -v && npm -v

echo "== Nutzer ${APP_USER}"
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$APP_USER"
fi
mkdir -p "/home/${APP_USER}/.ssh"
if [ -f /root/.ssh/authorized_keys ]; then
  cat /root/.ssh/authorized_keys >> "/home/${APP_USER}/.ssh/authorized_keys"
  sort -u "/home/${APP_USER}/.ssh/authorized_keys" -o "/home/${APP_USER}/.ssh/authorized_keys"
fi
chown -R "${APP_USER}:${APP_USER}" "/home/${APP_USER}/.ssh"
chmod 700 "/home/${APP_USER}/.ssh"; chmod 600 "/home/${APP_USER}/.ssh/authorized_keys" 2>/dev/null || true
mkdir -p "$APP_DIR"; chown -R "${APP_USER}:${APP_USER}" "$APP_DIR"

echo "== pm2 (global, Autostart fuer ${APP_USER})"
npm install -g pm2 >/dev/null 2>&1 || true
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$APP_USER" --hp "/home/${APP_USER}" >/dev/null 2>&1 || true

echo "== Swap 4 GB"
if ! swapon --show | grep -q swapfile; then
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
sysctl -w vm.swappiness=10 >/dev/null
grep -q 'vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf

echo "== Firewall"
ufw --force default deny incoming >/dev/null
ufw --force default allow outgoing >/dev/null
ufw allow 22/tcp >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
systemctl enable --now fail2ban >/dev/null 2>&1 || true

echo "== nginx"
mkdir -p /etc/nginx/ssl /etc/nginx/snippets /var/www/acme
cat > /etc/nginx/snippets/acme-challenge.conf <<'EOF'
location ^~ /.well-known/acme-challenge/ {
  root /var/www/acme;
  default_type text/plain;
}
EOF
cat > "/etc/nginx/sites-available/${DOMAIN}" <<EOF
server {
  listen 80;
  listen [::]:80;
  server_name ${DOMAIN};
  include /etc/nginx/snippets/acme-challenge.conf;
  location / { return 301 https://\$host\$request_uri; }
}
server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name ${DOMAIN};
  ssl_certificate     /etc/nginx/ssl/fullchain.cer;
  ssl_certificate_key /etc/nginx/ssl/pistazz.io.key;
  ssl_protocols       TLSv1.2 TLSv1.3;
  ssl_ciphers         HIGH:!aNULL:!MD5;
  client_max_body_size 300M;
  client_body_timeout 1800s;
  proxy_request_buffering off;
  proxy_read_timeout 1800s;
  proxy_send_timeout 1800s;
  gzip on;
  gzip_types text/plain text/css application/json application/javascript image/svg+xml;
  location /_next/static/ {
    proxy_pass http://127.0.0.1:3003;
    proxy_set_header Host \$host;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }
  location / {
    proxy_pass         http://127.0.0.1:3003;
    proxy_set_header   Host \$host;
    proxy_set_header   X-Real-IP \$remote_addr;
    proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto \$scheme;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade \$http_upgrade;
    proxy_set_header   Connection "upgrade";
    proxy_read_timeout 300;
    proxy_send_timeout 300;
    proxy_buffering    off;
    proxy_buffer_size       64k;
    proxy_buffers           8 64k;
    proxy_busy_buffers_size 128k;
  }
}
EOF
ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
rm -f /etc/nginx/sites-enabled/default
# nginx erst neu laden, wenn das Zertifikat da ist (kommt per rsync vom alten Server)
if [ -f /etc/nginx/ssl/fullchain.cer ]; then nginx -t && systemctl reload nginx; fi
systemctl enable nginx >/dev/null 2>&1 || true

echo "== unattended-upgrades"
dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null 2>&1 || true

echo "== fertig. Naechster Schritt: scripts/migrate-to-server.sh <IP> vom alten Server aus."
