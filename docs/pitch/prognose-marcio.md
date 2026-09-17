# Pistazz Umsatzprognose (internes Arbeitspapier)

Stand: 17.09.2026. Alle Zahlen netto, nur Deutschland, nur Restaurant-Abos plus Setup. Add-ons, Reseller und DACH sind NICHT eingerechnet, sie sind Upside.

## Annahmen

| Annahme | Wert | Begruendung |
|---|---|---|
| Preise (Monat) | 49 / 109 / 169 Euro | Professional / Premium / Enterprise |
| Setup (einmalig) | 849 / 1.500 / 2.349 Euro | wird im Abschlussmonat kassiert |
| Paket-Mix | 60 % / 30 % / 10 % | Premium ist Bestseller im Pitch, konservativ gemischt |
| Durchschnitt MRR je Kunde | 79 Euro | gewichteter Mix |
| Durchschnitt Setup je Kunde | 1.194 Euro | gewichteter Mix |
| Trial | 30 Tage kostenlos | zahlend ab Monat 2 |
| Konversion Trial zu zahlend | 75 % | Basisannahme, Sensitivitaet unten |
| Neukunden (zahlend) pro Monat | 11 (Basis), 6 (solide), 3 (vorsichtig) | Marcios Vertriebsziel als Basis |
| Churn | Jahr 1: 0 %, ab Jahr 2: 2 % pro Monat | Jahresvertraege im ersten Jahr |
| Laufende Kosten | ca. 150 Euro/Monat | Server, KI, Tools; ohne Personal |

## Basis-Szenario: 11 zahlende Neukunden pro Monat

| Monat | Kunden | MRR | ARR-Run-Rate | Setup-Erloes im Monat | Umsatz kumuliert |
|---|---|---|---|---|---|
| 1 | 0 | 0 | 0 | 0 | 0 |
| 2 | 11 | 869 | 10.428 | 13.134 | 14.003 |
| 3 | 22 | 1.738 | 20.856 | 13.134 | 28.875 |
| 6 | 55 | 4.345 | 52.140 | 13.134 | 78.705 |
| 9 | 88 | 6.952 | 83.424 | 13.134 | 140.266 |
| 12 | 121 | 9.559 | 114.708 | 13.134 | 201.828 |
| 18 | ca. 178 | ca. 14.100 | ca. 169.000 | 13.134 | ca. 350.000 |
| 24 | ca. 231 | ca. 18.200 | ca. 219.000 | 13.134 | ca. 540.000 |
| 36 | ca. 320 | ca. 25.300 | ca. 304.000 | 13.134 | ca. 1.030.000 |

Ab Monat 13 mit 2 % Monats-Churn gerechnet, Neukundenrate konstant 11. Fuer 1 Mio ARR in Monat 36 braucht es die Vertriebsskalierung (2. und 3. Verkaeufer, Reseller): Ziel 25 Neukunden/Monat ab Monat 6, dann ca. 1.050 Kunden in Monat 36.

## Szenarien im Vergleich (nach 12 Monaten)

| | 3 / Monat | 6 / Monat | 11 / Monat (Basis) |
|---|---|---|---|
| Zahlende Kunden | 33 | 66 | 121 |
| MRR | 2.607 | 5.214 | 9.559 |
| ARR-Run-Rate | 31.284 | 62.568 | 114.708 |
| Umsatz kumuliert | 55.044 | 110.088 | 201.828 |

## Meilensteine (Basis)

- 50 zahlende Kunden: Monat 5 bis 6
- 200.000 Euro kumuliert: Monat 12
- 200.000 Euro ARR: ca. Monat 20 (ca. 210 Kunden)
- 500.000 Euro kumuliert: ca. Monat 23
- 1.000.000 Euro kumuliert: ca. Monat 36
- 1.000.000 Euro ARR: ca. Monat 36 NUR mit Skalierung auf ca. 25 Neukunden/Monat (ca. 1.050 Kunden). Mit konstant 11/Monat erst deutlich spaeter, siehe Tabelle.

## Sensitivitaet

### Konversion (Basis 75 %), MRR nach 12 Monaten bei 15 Tests/Monat

| Konversion | Neukunden/Monat | MRR Monat 12 |
|---|---|---|
| 60 % | 9 | 7.821 |
| 75 % | 11 | 9.559 |
| 90 % | 13 | 11.297 |

### Churn ab Jahr 2, Kundenbestand nach 24 Monaten (Basis 11/Monat)

| Monats-Churn | Kunden Monat 24 | MRR Monat 24 |
|---|---|---|
| 0 % | 253 | 19.987 |
| 2 % | ca. 231 | ca. 18.200 |
| 4 % | ca. 211 | ca. 16.700 |

### Was die Kurve wirklich bewegt (Prioritaet)

1. Neukundenrate: jeder zusaetzliche Verkaeufer = ca. +11 Kunden/Monat = ca. +10.400 Euro MRR nach 12 Monaten seiner Arbeit.
2. Konversion: jeder Punkt Prozent Konversion ist fast gratis (besseres Onboarding, Erinnerungen im Trial).
3. Churn: unter 2 % halten durch NFC-Hardware im Laden (physischer Anker) und Jahresvertraege.

## Kosten und Break-even

- Fixkosten heute: ca. 150 Euro/Monat (Server Hetzner, Supabase Pro, Codemagic, KI-Pruefung, Domains).
- KI-Kosten je Kassenbon-Pruefung: unter 1 Cent (Claude Sonnet). Selbst 500 Pruefungen je Restaurant/Monat kosten unter 5 Euro und sind durch das 1-Story-pro-Tag-Limit gedeckelt.
- Break-even der Plattform (ohne Gruendergehalt): ab 2 zahlenden Kunden. Mit einem Verkaeufer (ca. 4.500 Euro Vollkosten): ab ca. 60 Kunden, erreicht in Monat 6 bis 7 im Basis-Szenario.

## Offene Entscheidungen fuer den Pitch

1. Ask (Summe und Anteile) ist im Deck bewusst offen gelassen ("im Gespraech"). Vorschlag zur Diskussion: 200.000 Euro fuer 15 %, Verwendung 50 % Vertrieb, 25 % Produkt (Android, Kassen-API), 25 % Stadt-Launches.
2. Referenz-Restaurants mit echten Zahlen (Stories, Wiederkehrrate) sammeln, sobald 2 bis 3 Piloten 8 Wochen laufen. Eine echte Kundenkurve schlaegt jede Prognose.
