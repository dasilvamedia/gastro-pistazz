# Hosting & Domain — Gastro Pistazz

## Infrastruktur
Hetzner VPS (shared), cockpit.pistazz.io
- Domain: gastro.pistazz.io
- DNS: Cloudflare, A-Record auf Server-IP
- SSL: Let's Encrypt via Caddy/nginx

## Checkliste
- [ ] DNS-Einträge korrekt gesetzt
- [ ] SSL-Zertifikat aktiv und auto-renew konfiguriert
- [ ] Firewall: nur Ports 80/443 offen (+ SSH 22 via Tailscale)
- [ ] Nginx-Config getestet (`nginx -t`)
- [ ] Monitoring aktiv (Uptime-Check)

## Technologie
Next.js 14
