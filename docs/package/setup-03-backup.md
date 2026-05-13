# Backup-Strategie — Gastro Pistazz

## Backup-Plan
- Tägliches Backup via Cron um 03:00
- Backup-Ziel: `/backups/gastro-pistazz/`
- Datenbank: `pg_dump gastro_db > backup_$(date +%F).sql`
- Aufbewahrung: 14 Tage

## Restore-Prozess
```bash
# Datenbank wiederherstellen
pg_restore -d <dbname> /backups/gastro-pistazz/latest.sql

# Files wiederherstellen
rsync -av /backups/gastro-pistazz/files/ /var/www/gastro-pistazz/
```

## Backup-Checkliste
- [ ] Automatisches Backup konfiguriert
- [ ] Restore-Test durchgeführt
- [ ] Backup-Benachrichtigung bei Fehler
- [ ] Aufbewahrungsdauer definiert
- [ ] Offsite-Backup (optional)
