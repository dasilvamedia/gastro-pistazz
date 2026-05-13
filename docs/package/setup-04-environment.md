# Environment & Konfiguration — Gastro Pistazz

## Umgebungsvariablen
```env
NEXT_PUBLIC_GOOGLE_MAPS_KEY=...
GOOGLE_MY_BUSINESS_CLIENT_ID=...
GOOGLE_MY_BUSINESS_CLIENT_SECRET=...
DATABASE_URL=postgresql://...
SMTP_HOST=...
SMTP_PORT=587
```

## Vorgehen
- `.env` niemals in Git commiten
- Secrets in 1Password oder Vault speichern
- Staging-Umgebung: separate Keys
- Rotation: alle 6 Monate

## Checkliste
- [ ] `.env.example` aktuell halten
- [ ] Alle Secrets in 1Password hinterlegt
- [ ] Staging-Keys von Production getrennt
- [ ] API-Keys mit minimalen Berechtigungen
- [ ] Webhook-Secrets rotiert
