# Persoenliche Prognose gastro.pistazz.io (Stand September 2026)

Diese Rechnung ist absichtlich nuechtern. Sie zeigt, was mit den neuen
Preisen realistisch drin ist, wo die Grenzen eines Einzelgruenders liegen
und was passieren muss, damit 500k und 1 Mio erreichbar werden.

## Annahmen

| Groesse | Wert | Herleitung |
|---|---|---|
| Pakete | Professional 49 €, Premium 109 €, Enterprise 169 € pro Monat | lib/plans.ts |
| Setup | 849 / 1.500 / 2.349 € einmalig | lib/plans.ts |
| Mix | 60 % Professional, 30 % Premium, 10 % Enterprise | Bestseller ist Premium, Einstieg ist Professional |
| Ø Monatsumsatz je Restaurant | 79 € | 0,6 x 49 + 0,3 x 109 + 0,1 x 169 |
| Ø Setup je Restaurant | 1.194 € | 0,6 x 849 + 0,3 x 1.500 + 0,1 x 2.349 |
| Testphase | 30 Tage | Zahlend ab Monat 2 |
| Konversion Test zu zahlend | 75 % | Setup-Gebuehr + eingerichtete NFC-Tags binden |
| Churn Jahr 1 | 0 % | Vertrag + Setup, ab Jahr 2 mit 2 % pro Monat gerechnet |
| Laufende Kosten | ~150 €/Monat | Supabase Pro, Server, Apple, Claude-API, Domain |
| Marge | > 90 % | Umsatz ist praktisch Ergebnis vor Marcios Gehalt und Steuern |

## Drei Tempi

Zahlende Neukunden pro Monat, netto:

- **Konservativ: 3** (nebenbei, ohne Vertrieb)
- **Realistisch: 6** (Marcio allein, ca. 30 Restaurantbesuche pro Monat)
- **Basis: 11** (Marcios Ziel, ab Monat 4 mit zweitem Verkaeufer oder Partner)

## MRR, ARR, kumulierter Umsatz

| Monat | 3 pro Monat | 6 pro Monat | 11 pro Monat (Basis) |
|---|---|---|---|
| 1 | 0 zahlend, 0 € | 0 zahlend, 0 € | 0 zahlend, 0 € |
| 3 | 6 Kunden, MRR 474 €, ARR 5.688 €, kum. 7.875 € | 12 Kunden, MRR 948 €, ARR 11.376 €, kum. 15.750 € | 22 Kunden, MRR 1.738 €, ARR 20.856 €, kum. 28.875 € |
| 6 | 15 Kunden, MRR 1.185 €, ARR 14.220 €, kum. 21.465 € | 30 Kunden, MRR 2.370 €, ARR 28.440 €, kum. 42.930 € | 55 Kunden, MRR 4.345 €, ARR 52.140 €, kum. 78.705 € |
| 12 | 33 Kunden, MRR 2.607 €, ARR 31.284 €, kum. 55.044 € | 66 Kunden, MRR 5.214 €, ARR 62.568 €, kum. 110.088 € | 121 Kunden, MRR 9.559 €, ARR 114.708 €, kum. 201.828 € |

Kumuliert = Setup-Gebuehren aller bisherigen Kunden + Summe aller Monatsbeitraege.

## Meilensteine (Basis 11 pro Monat)

| Ziel | Wann | Was es bedeutet |
|---|---|---|
| 50 zahlende Kunden (Hoehle-der-Loewen-Schwelle) | Monat 5 bis 6 | Bewerbung kann vorher laufen, Drehtermin liegt Monate spaeter |
| 200.000 € kumulierter Umsatz | Monat 12 | Erstes volles Jahr |
| 500.000 € kumuliert | Monat ~23 | Ende Jahr 2 |
| 1.000.000 € kumuliert | Monat ~36 | Ende Jahr 3 |
| 200.000 € ARR (Jahres-Run-Rate) | Monat ~20 | ca. 210 zahlende Restaurants |
| 500.000 € ARR | ca. 530 Restaurants | Nicht mehr im Direktvertrieb einer Person |
| 1.000.000 € ARR | ca. 1.050 Restaurants | Braucht Vertriebsnetz oder hoehere Erloese pro Restaurant |

Zum Vergleich realistisch (6 pro Monat): 50 Kunden Monat 9 bis 10, 200k kumuliert Monat 18 bis 19, 500k Monat ~34, 1 Mio Monat ~52.

## Sensitivitaet

Kumulierter Umsatz nach 12 Monaten bei Basis 11 pro Monat:

| Konversion | Churn 0 % | Churn 2 %/Monat | Churn 4 %/Monat |
|---|---|---|---|
| 60 % | 161.000 € | 156.000 € | 151.000 € |
| 75 % | 202.000 € | 195.000 € | 189.000 € |
| 90 % | 242.000 € | 234.000 € | 227.000 € |

Die Konversion wiegt schwerer als der Churn. Deshalb: Onboarding-Termin in
der ersten Woche, NFC-Tags am ersten Tag anbringen, erste Belohnung in der
ersten Woche einloesen lassen. Wer einmal eine volle Stempelkarte gesehen hat,
kuendigt nicht.

## Was 1 Mio moeglich macht

1. **Reseller**: Kassensystem-Anbieter, Brauereien, Getraende-Grosshaendler
   haben den Zugang zu hunderten Betrieben. 20 % Provision auf Setup + Jahr 1.
2. **Loewen-Deal mit Vertriebsnetz**: Reichweite statt nur Kapital.
3. **Mehr Erloes pro Restaurant**: Push-Kampagnen-Kontingente, Ads-Slot in
   Entdecken (gesponsertes Restaurant der Woche), Druck-Nachbestellung,
   Enterprise-Anteil erhoehen. Schon 20 € mehr pro Restaurant und Monat sind
   bei 500 Restaurants 120.000 € pro Jahr.
4. **Zweite Vertikale**: Friseure, Fitness, Einzelhandel nutzen exakt dieselbe
   Mechanik (Story, Stempel, Belohnung). Die Plattform ist bereits als
   pistazz-Familie angelegt.

## Vertriebsrealitaet fuer 11 pro Monat

- 11 Abschluesse bei 75 % Konversion = 15 Tests pro Monat
- 15 Tests bei 25 % Testquote = 60 Restaurantbesuche pro Monat = 3 pro Arbeitstag
- Allein machbar fuer 2 bis 3 Monate, danach zweiter Verkaeufer (Provision) oder Partner
- Jede Referenz-Story eines Restaurants ist der beste Tuersoeffner fuer den naechsten Betrieb in derselben Strasse
