# Deployment-Prozess — Gastro Pistazz

## Schritte
```bash
# Build
cd /home/marcio/gastro-pistazz
npm run build

# Deploy (Nginx)
cp -r .next/static /var/www/gastro-pistazz/
systemctl restart nginx
```

## Deployment-Checkliste
- [ ] Tests lokal bestanden
- [ ] Build erfolgreich
- [ ] Umgebungsvariablen aktuell
- [ ] Datenbank-Migration durchgeführt (falls nötig)
- [ ] Smoke-Test nach Deploy
- [ ] Monitoring zeigt grün

## Rollback
Bei Problemen:
```bash
# Vorherige Version wiederherstellen
git stash / git checkout <vorheriger-commit>
# Rebuild & Redeploy
```
