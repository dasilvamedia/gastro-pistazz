# Architektur – Gastro Pistazz

## Tech-Stack
| Schicht | Technologie |
|---------|-------------|
| Frontend | React + Vite + TypeScript |
| Styling  | TailwindCSS |
| Backend  | FastAPI / Next.js |
| Datenbank | PostgreSQL / Supabase |
| Deployment | Nginx + Docker |

## System-Überblick
```
Browser → Nginx → App-Server → Datenbank
```

## Verzeichnisstruktur
```
gastro-pistazz/
├── src/          # Quellcode
├── public/       # Statische Assets
├── docs/         # Dokumentation
└── scripts/      # Hilfsskripte
```

## Deployment
- URL: https://gastro.pistazz.io
- Server: pistazz.io VPS
- CI/CD: manuelles Deployment via rsync/Docker

## Abhängigkeiten
_Externe Dienste und APIs hier eintragen._
