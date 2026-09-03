# Umzug gastro.pistazz.io auf einen eigenen Hetzner-Server

Warum: Der bisherige Server teilt 7,7 GB RAM mit mehreren Apps und
Entwickler-Sitzungen. Ein Build braucht ~3 GB und wurde am 03.09.2026 vom
Kernel gekillt. Ein eigener Server (CX32: 4 vCPU, 8 GB, ~8 EUR/Monat) trennt
Live-App und Bauen sauber und bringt pm2-Cluster ohne Downtime-Deploys.

## Teil A: Marcio (5 Minuten)

1. console.hetzner.cloud, Projekt oeffnen (oder neues Projekt "pistazz").
2. **Server hinzufuegen**
   - Standort: Nuernberg oder Falkenstein
   - Image: Ubuntu 24.04
   - Typ: Shared vCPU x86, **CX32** (4 vCPU, 8 GB, 80 GB). Bei Budget egal: CX42.
   - Netzwerk: IPv4 + IPv6 an
   - SSH-Key: "SSH-Key hinzufuegen" und diesen Public Key einfuegen:
     ```
     ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG+T2YfT1DnD4IGyZHWBleDrgfjy2++H9n7f7Z52vFBO deploy@gastro.pistazz.io
     ```
   - Name: gastro-pistazz-1
   - Erstellen. Die IPv4 kopieren und Claude nennen.
3. All-Inkl KAS oeffnen (DNS fuer pistazz.io liegt bei kasserver): beim
   A-Record `gastro` die TTL auf 300 setzen (noch NICHT die IP aendern).

## Teil B: Claude (automatisch, ca. 15 Minuten)

Vom alten Server aus:
```
scripts/migrate-to-server.sh <NEUE_IP>
```
Das Skript richtet den Server ein (Node 22, pm2, nginx, ufw, Swap, fail2ban),
kopiert Repo + `.env.local` + TLS-Zertifikat, baut, startet pm2 im Cluster
(2 Instanzen), setzt die Crontab und testet `/home`, `/entdecken`,
`/api/public/health` ueber die neue IP mit korrektem Host-Header.

## Teil C: Umschalten (Marcio 1 Minute, Claude prueft)

1. KAS: A-Record `gastro.pistazz.io` auf die neue IP.
2. Nach 5 bis 10 Minuten: `dig +short gastro.pistazz.io` zeigt die neue IP,
   `https://gastro.pistazz.io/api/public/health` antwortet mit `ok: true`.
3. App auf dem iPhone oeffnen: Home, Entdecken, Deal einloesen, NFC.
4. Alte Instanz 48 Stunden als Fallback laufen lassen, dann auf dem alten
   Server `pm2 stop gastro-pistazz` und `pm2 save`.

Rollback: A-Record zurueck auf 204.168.199.234, alter Prozess laeuft noch.

## Danach

- Supabase-Migration **029** (Preise v2) ausfuehren, sobald der neue Code live ist.
- APNs-Env auf dem neuen Server in `.env.local` ergaenzen (siehe unten), dann
  `pm2 reload gastro-pistazz --update-env`.
- Zertifikat-Erneuerung: acme.sh auf dem neuen Server einrichten
  (`acme.sh --issue -d gastro.pistazz.io -w /var/www/acme`), bis dahin gilt das
  kopierte Zertifikat (Laufzeit pruefen mit `openssl x509 -enddate -noout -in /etc/nginx/ssl/fullchain.cer`).
- Uptime-Monitor auf `/api/public/health`.
- Supabase: Compute auf Small fuer den Launch-Monat, Realtime-Limit im Dashboard pruefen.

## APNs (Push in der iOS-App), Marcios Schritte im Apple Developer Portal

1. developer.apple.com, Certificates, Identifiers & Profiles, **Identifiers**,
   `io.pistazz.gastro` oeffnen, Capability **Push Notifications** anhaken, Save.
2. **Keys**, Plus, Name "Pistazz APNs", **Apple Push Notifications service (APNs)**
   anhaken, Continue, Register, **Download** (AuthKey_XXXXXXXXXX.p8, nur einmal
   moeglich, im Passwort-Manager sichern). Die **Key ID** notieren.
3. Auf dem Server in `/home/marcio/gastro-pistazz/.env.local` ergaenzen (Marcio
   traegt die Werte selbst ein, Claude sieht sie nicht):
   ```
   APNS_KEY_ID=<Key ID>
   APNS_TEAM_ID=33SPWG2R8C
   APNS_BUNDLE_ID=io.pistazz.gastro
   APNS_ENV=production
   APNS_KEY_P8=<Inhalt der .p8-Datei als eine Zeile base64: base64 -w0 AuthKey_XXXX.p8>
   ```
   dann `pm2 reload gastro-pistazz --update-env`.
4. Erst danach `git push origin master`: Codemagic baut Build 20 (Push-Plugin,
   Entitlement aps-environment). Scheitert die Signierung wegen fehlendem
   Entitlement: im Portal das alte App-Store-Provisioning-Profil loeschen und
   den Build neu starten, Codemagic erzeugt es neu.
5. TestFlight installieren, in der App Profil, Einstellungen, Push einschalten,
   dann im Admin unter Push & Nachrichten "Test an mich".
