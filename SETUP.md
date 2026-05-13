# Setup – Gastro Pistazz

## Voraussetzungen
- Node.js 20+
- npm / bun
- Git

## Lokale Entwicklung

```bash
# Repository klonen
cd /home/marcio/gastro-pistazz

# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev
# → http://localhost:5173
```

## Umgebungsvariablen
Erstelle `.env.local` aus `.env.example`:

```bash
cp .env.example .env.local
```

## Deployment
```bash
# Production Build
npm run build

# Deploy to server
# URL: https://gastro.pistazz.io
```

## Projektstruktur
```
src/
├── components/   # UI-Komponenten
├── pages/        # Seiten/Routes
├── lib/          # Utilities
└── assets/       # Bilder, Icons
```
