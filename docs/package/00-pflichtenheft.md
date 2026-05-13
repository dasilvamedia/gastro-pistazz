# Pflichten- und Lastenheft
## Gastro Pistazz
### Gastro-Marketing-Plattform für die Gastronomie
*Version 1.0 · Erstellt für: Gastronomen & Restaurantbesitzer · Erstellt von: Marcio da Silva, pistazz.io · Stand: 2026*

---

> **An Gastronomen & Restaurantbesitzer:**
>
> Dieses Dokument beschreibt vollständig, was gebaut wird, in welcher Reihenfolge und mit welchem Aufwand.
> Es schützt Sie vor Überraschungen und sorgt dafür, dass jeder Entwickler damit weiterarbeiten könnte —
> denn der Code und diese Dokumentation gehören Ihnen.
>
> *— Marcio da Silva, pistazz.io*

---

## Inhalt

1. Worum geht es bei diesem Projekt
2. Technischer Überblick
3. Der Prozess aus Nutzerperspektive
4. Funktionale Anforderungen
5. Qualitäts- und Sicherheitsanforderungen
6. Zeitplan
7. Was nicht enthalten ist
8. Abnahme und Garantie

---

## 1. Worum geht es bei diesem Projekt

### 1.1 Die Idee in einem Satz
Gastronomen erhalten eine einzige Plattform, die ihr Online-Marketing automatisiert — von der Google-Bewertung über Instagram-Posts bis hin zum Newsletter — damit sie sich aufs Kochen konzentrieren können.

### 1.2 Projektbeschreibung
Eine digitale Marketing-Plattform speziell für die Gastronomie, die Bewertungsmanagement, Google My Business Optimierung und automatisierten Social-Media-Content in einem System vereint.

### 1.3 Zielgruppe
Restaurants, Cafés, Bars und Gastronomie-Betriebe in Deutschland und Österreich

### 1.4 Was Gastronomen & Restaurantbesitzer gewinnt
- Automatisiertes Bewertungsmanagement (Google, TripAdvisor)
- KI-generierter Social-Media-Content im Stil des Betriebs
- Newsletter-Automation für Stammgäste
- Analytics-Dashboard für Online-Sichtbarkeit

---

## 2. Technischer Überblick

### 2.1 Tech-Stack
```
Next.js 14, TypeScript, TailwindCSS, PostgreSQL, Supabase
```

### 2.2 Architektur-Prinzipien
- **Mobile-First**: Alle Oberflächen werden zuerst für Smartphone optimiert
- **Performance**: Ladezeiten < 2 Sekunden, Core Web Vitals > 90
- **Sicherheit**: HTTPS, Input-Validierung, DSGVO-konforme Datenspeicherung in Deutschland
- **Wartbarkeit**: Sauberer, dokumentierter Code — jeder Entwickler kann einsteigen
- **Open Source Basis**: Keine proprietären Sperren, volle Code-Eigentümerschaft

### 2.3 Hosting & Betrieb
- Server: pistazz.io VPS bei Hetzner (Deutschland, DSGVO-konform)
- Deployment: Docker Compose, automatisiert via GitHub Actions
- Monitoring: Uptime-Checks, Error-Tracking, tägliche Backups
- Domain: https://gastro.pistazz.io

---

## 3. Der Prozess aus Nutzerperspektive

Gastronomen erhalten eine einzige Plattform, die ihr Online-Marketing automatisiert — von der Google-Bewertung über Instagram-Posts bis hin zum Newsletter — damit sie sich aufs Kochen konzentrieren können.

**Typischer Ablauf:**
1. Nutzer entdeckt Gastro Pistazz über Online-Kanal
2. Erste Interaktion: sofortiger Mehrwert ohne Registrierungshürde
3. Konvertierung zur Kernfunktion nach Wertnachweis
4. Wiederkehrende Nutzung durch nahtlose UX und Benachrichtigungen

---

## 4. Funktionale Anforderungen

Jede Funktion hat eine eindeutige ID für präzise Kommunikation.
Die Stundenschätzung zeigt den Implementierungsaufwand.

| ID | Funktion | Beschreibung | Aufwand |
|----|----------|--------------|---------|
| F1.1 | Landing-Page & Onboarding | Hero, Preismodell, Registrierung für Gastronomen | 8h |
| F1.2 | Google My Business API | Automatische Synchronisation von Öffnungszeiten, Fotos, Posts | 16h |
| F1.3 | Bewertungsmanagement | Zentrale Inbox, Antwort-Vorlagen, KI-gestützte Antworten | 12h |
| F1.4 | KI Content-Generator | Social-Media-Posts, Tagesspecials, Events im Stil des Betriebs | 10h |
| F1.5 | Newsletter-Modul | Kundenliste aufbauen, Kampagnen versenden, Öffnungsraten tracken | 8h |
| F1.6 | Analytics-Dashboard | Sichtbarkeits-Score, Bewertungs-Trend, Follower-Entwicklung | 10h |
| F1.7 | Abonnement & Abrechnung | Stripe-Integration, Monats-/Jahresabo, Rechnungsversand | 8h |
| — | **Gesamt** | Alle Features, Tests, Deployment | **82h** |

> *Die Gesamtstunden enthalten 15% Puffer für Tests, Bug-Fixing und Deployment.*

---

## 5. Qualitäts- und Sicherheitsanforderungen

### 5.1 Performance
- Seitenladezeit: < 2 Sekunden (First Contentful Paint)
- Core Web Vitals: Lighthouse Score > 90
- Mobile-Optimierung: vollständig responsive ab 320px Breite

### 5.2 Sicherheit
- Alle Verbindungen verschlüsselt (HTTPS, TLS 1.3)
- Passwörter: bcrypt-Verschlüsselung, niemals Klartext
- Schutz gegen SQL-Injection, XSS, CSRF
- API-Schlüssel in verschlüsseltem Vault, nicht im Code
- Brute-Force-Schutz auf allen Login-Endpunkten

### 5.3 DSGVO
- Hosting in Deutschland (Hetzner)
- Daten verlassen die EU nur wenn nötig (mit AVV)
- Datenschutzerklärung und Impressum: Pflicht vor Launch
- Auskunfts- und Löschrecht für Nutzer implementiert

### 5.4 Verfügbarkeit
- Ziel: 99,5% monatliche Verfügbarkeit
- Tägliche verschlüsselte Backups, 30 Tage Vorhaltezeit
- Monitoring alle 5 Minuten, Alarmierung bei Ausfall

---

## 6. Zeitplan

| Phase | Inhalt |
|-------|--------|
| Woche 1-2 | Infrastruktur, Auth, Onboarding-Flow |
| Woche 3-4 | Google My Business API Integration |
| Woche 5-6 | Bewertungsmanagement & KI-Antworten |
| Woche 7-8 | Content-Generator & Newsletter-Modul |
| Woche 9-10 | Analytics, Abrechnung, Tests, Launch |

---

## 7. Was nicht enthalten ist

Der aktuelle Scope ist bewusst fokussiert. Folgende Punkte sind **nicht** Teil dieser Version:

- Tischreservierungssystem
- Kassensystem-Integration
- Lieferdienst-Anbindung (Lieferando, Uber Eats)
- Multi-Location-Management für Ketten

Diese können in einer nachfolgenden Phase ergänzt werden.

---

## 8. Abnahme und Garantie

### 8.1 Wöchentliche Reviews
Jede Woche gibt es einen kurzen Status-Termin. Feedback wird in der Folgewoche eingearbeitet.

### 8.2 Meilenstein-Abnahmen
Jeder Meilenstein wird formal abgenommen. Mängel werden dokumentiert und in der Folgewoche behoben.

### 8.3 Garantie
6 Monate Garantie auf reproduzierbare Bugs nach Endabnahme — kostenlose Behebung garantiert.

### 8.4 Code-Eigentümerschaft
Mit vollständiger Bezahlung geht der gesamte Code in das Eigentum von **Gastronomen & Restaurantbesitzer** über.
Inklusive: Quellcode im Git-Repository, Dokumentation, Deployment-Runbook und alle Zugangsdaten.

---

*Erstellt von Marcio da Silva · pistazz.io · https://gastro.pistazz.io*
