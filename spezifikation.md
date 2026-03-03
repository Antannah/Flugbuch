# Spezifikation: Flugbuch-App (Web)

> **Version:** 0.1 – Entwurf  
> **Datum:** 2026-03-03  
> **Autor:** Projekt Flugbuch  
> **Referenz:** MFSD-Flugbuch-App V.4.0.0.0, Handbuch Stand 05.02.2025

---

## 1. Ausgangslage & Motivation

### 1.1 Bestehende MFSD-App — Was funktioniert

Die MFSD-Flugbuch-App erfüllt die Dokumentationspflicht gemäß StRfF (Ziff. 8.1.7) und bietet:

| Feature | Beschreibung |
|---|---|
| **Stammdaten** | Piloten, Modelle, Gelände mit QR-Code-Import |
| **Flugerfassung** | An-/Abmeldung, Einzelflüge, Multi-Modellauswahl, Timer |
| **Flugleiter** | Separate Erfassung des Flugleiterdienstes |
| **Export** | FBD (XML), CSV, PDF |
| **Betriebsmodi** | Zentral (ein Gerät), dezentral (mehrere Geräte FTP) |
| **Plattformen** | Windows, Android, iOS 16 |

### 1.2 Kritik an der bestehenden Lösung

| Problem | Details |
|---|---|
| **UI veraltet** | Windows-App wirkt optisch nicht zeitgemäß |
| **Datenaustausch umständlich** | FTP-Upload manuell oder per E-Mail — fehleranfällig, kein Echtzeit-Sync |
| **Kein zentrales Backend** | Daten liegen als Dateien auf einem FTP-Server, keine echte Datenbank |
| **Keine Echtzeit-Zusammenarbeit** | Flugbuch-Konsolidierung erfordert manuelle Import-Schritte |
| **Fehlerkorrektur aufwändig** | Exportierte Datensätze können nur vom Server-Admin gelöscht werden |

### 1.3 Ziel

Eine **moderne Web-App** als Ersatz, die:

1. Optisch ansprechend und responsiv ist (Desktop + Smartphone)
2. Daten **sofort zentral** in einer Datenbank speichert — kein FTP, kein E-Mail
3. Alle Vereinsmitglieder in **Echtzeit** dasselbe Flugbuch sehen
4. Benutzer- und Modellverwaltung integriert
5. Die funktionalen Anforderungen der StRfF (Dokumentationspflicht) erfüllt

---

## 2. Architektur-Vorschlag

### 2.1 Übersicht

```
┌─────────────────────┐
│   Browser / PWA     │  ← Responsives Web-Frontend
│   (HTML/JS/CSS)     │
└────────┬────────────┘
         │ HTTPS (REST API)
┌────────▼────────────┐
│   Backend (Python)  │  ← FastAPI o.ä.
│   + Auth (JWT)      │
└────────┬────────────┘
         │
┌────────▼────────────┐
│ PostgreSQL / SQLite │  ← Zentrale Datenbank
└─────────────────────┘
```

### 2.2 Warum Web statt Desktop/FTP

| Aspekt | MFSD (alt) | Web-App (neu) |
|---|---|---|
| Datenspeicherung | Lokal + FTP-Dateien | Zentrale DB |
| Synchronisation | Manueller Export/Import | Automatisch, Echtzeit |
| Zugriff | App installieren | Browser öffnen |
| Mehrbenutzerbetrieb | FTP-Konflikte möglich | DB-Transaktionen, konsistent |
| Fehlerkorrektur | Nur Server-Admin | Berechtigte User direkt |
| Gastzugang | QR-Code mit FTP-Daten | Link + Tages-Token |

### 2.3 Technologie-Stack (Vorschlag)

| Schicht | Technologie | Begründung |
|---|---|---|
| **Frontend** | HTML + Vanilla JS + CSS (oder Vite/Vue) | Leichtgewichtig, PWA-fähig |
| **Backend** | Python / FastAPI | Passt zu Deinen Kenntnissen, async-fähig |
| **Datenbank** | PostgreSQL (Produktion) / SQLite (Entwicklung) | Robust, erweiterbar |
| **Auth** | JWT (JSON Web Tokens) | Stateless, einfach integrierbar |
| **Hosting** | zum testen Docker auf bestehendem Server (`antannah.blausee.eu`) | Infrastruktur vorhanden |
| **Reverse Proxy** | Traefik (bereits vorhanden) | TLS-Terminierung |

---

## 3. Datenmodell

### 3.1 Entity-Relationship-Diagramm

```
┌──────────┐       ┌──────────────┐       ┌──────────────┐
│  Verein  │1────n│    User      │1────n│   Modell     │
│          │       │  (Pilot)     │       │              │
└──────────┘       └──────┬───────┘       └──────────────┘
                          │ 1
                          │
                          │ n
                   ┌──────▼───────┐
                   │  Flugeintrag │
                   │              │──n───1─┬──────────────┐
                   └──────┬───────┘       │   Gelände    │
                          │               └──────────────┘
                          │ 0..1
                   ┌──────▼───────┐
                   │  Flugleiter- │
                   │  dienst      │
                   └──────────────┘
```

### 3.2 Tabellen-Definition

#### `verein` — Vereinsverwaltung

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | UUID, PK | Eindeutige ID |
| `name` | VARCHAR(100), NOT NULL | Vereinsname |
| `created_at` | TIMESTAMP | Erstelldatum |

#### `user` — Piloten / Benutzer

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | UUID, PK | Eindeutige ID |
| `verein_id` | UUID, FK → verein | Zugehöriger Verein |
| `vorname` | VARCHAR(50), NOT NULL | Vorname |
| `nachname` | VARCHAR(50), NOT NULL | Nachname |
| `email` | VARCHAR(100), UNIQUE | Login-E-Mail |
| `passwort_hash` | VARCHAR(255) | Bcrypt-Hash |
| `hat_schulungsnachweis` | BOOLEAN, DEFAULT FALSE | Schulungsnachweis vorhanden |
| `rolle` | ENUM('pilot', 'flugleiter', 'admin') | Berechtigungsrolle |
| `unterschrift_pfad` | VARCHAR(255), NULLABLE | Pfad zur gespeicherten Unterschrift |
| `ist_gast` | BOOLEAN, DEFAULT FALSE | Gastzugang (zeitlich begrenzt) |
| `gast_gueltig_bis` | DATE, NULLABLE | Ablaufdatum für Gäste |
| `created_at` | TIMESTAMP | Erstelldatum |
| `updated_at` | TIMESTAMP | Letzte Änderung |

#### `modell` — Flugmodelle

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | UUID, PK | Eindeutige ID |
| `user_id` | UUID, FK → user | Besitzer des Modells |
| `bezeichnung` | VARCHAR(100), NOT NULL | Name / Bezeichnung des Modells |
| `modell_typ` | ENUM('motorflugzeug', 'segelflugzeug', 'hubschrauber', 'multikopter', 'sonstige') | Modelltyp |
| `antrieb` | ENUM('elektro', 'verbrenner', 'turbine', 'ohne', 'sonstige') | Antriebsart |
| `gewichtsklasse` | ENUM('bis_250g', 'bis_2kg', 'bis_4kg', 'bis_12kg', 'bis_25kg', 'ueber_25kg') | Gewichtsklasse |
| `frequenz` | VARCHAR(20), NULLABLE | Frequenz/Kanal (optional, für Alt-Systeme) |
| `registriernummer` | VARCHAR(50), NULLABLE | UAS-Registriernummer |
| `aktiv` | BOOLEAN, DEFAULT TRUE | Modell ist aktiv / nicht gelöscht |
| `created_at` | TIMESTAMP | Erstelldatum |
| `updated_at` | TIMESTAMP | Letzte Änderung |

> **Hinweis:** In der MFSD-App werden Modelle auch als Gruppen-Eintrag genutzt (z.B. „alle E-Flieger bis 12 kg"). Diese Flexibilität bleibt erhalten — ein Modell-Eintrag kann ein Einzelmodell oder eine Gruppe repräsentieren.

#### `gelaende` — Fluggelände

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | UUID, PK | Eindeutige ID |
| `verein_id` | UUID, FK → verein | Zugehöriger Verein |
| `bezeichnung` | VARCHAR(100), NOT NULL | Geländename (z.B. „MFG Uetze") |
| `strasse` | VARCHAR(100), NULLABLE | Adresse |
| `plz` | VARCHAR(10), NULLABLE | PLZ |
| `ort` | VARCHAR(100), NULLABLE | Ort |
| `koordinaten_lat` | DECIMAL(10,7), NULLABLE | Breitengrad (optional) |
| `koordinaten_lon` | DECIMAL(10,7), NULLABLE | Längengrad (optional) |
| `created_at` | TIMESTAMP | Erstelldatum |

#### `flugeintrag` — Haupttabelle: Flugbucheinträge

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | UUID, PK | Eindeutige ID |
| `user_id` | UUID, FK → user, NOT NULL | Pilot |
| `modell_id` | UUID, FK → modell, NULLABLE | Verwendetes Modell (NULL bei Flugleiterdienst) |
| `gelaende_id` | UUID, FK → gelaende, NOT NULL | Gelände |
| `datum` | DATE, NOT NULL | Flugtag |
| `startzeit` | TIME, NOT NULL | Beginn |
| `endzeit` | TIME, NULLABLE | Ende (NULL = noch aktiv) |
| `ist_flugleiter` | BOOLEAN, DEFAULT FALSE | Eintrag ist Flugleiterdienst |
| `bemerkungen` | TEXT, NULLABLE | Freitextfeld |
| `created_at` | TIMESTAMP | Erstellzeitpunkt |
| `updated_at` | TIMESTAMP | Letzte Änderung |

---

## 4. Formular-Design: Flugeintrag

### 4.1 Hauptansicht — Tagesübersicht

```
┌─────────────────────────────────────────────────┐
│  🛩  FLUGBUCH         [Datum: 03.03.2026 ▼]      │
│─────────────────────────────────────────────────│
│                                                 │
│  Pilot:    [Max Mustermann          ▼]          │
│  Gelände:  [MFG Uetze               ▼]          │
│                                                 │
│  ┌─── Neuer Eintrag ──────────────────────┐    │
│  │                                         │    │
│  │  ○ Modellflug   ○ Flugleiterdienst     │    │
│  │                                         │    │
│  │  Modell:  [Zephyr F5J              ▼]  │    │
│  │  Start:   [10:30]   Ende: [──:──]      │    │
│  │  Bemerkung: [________________________] │    │
│  │                                         │    │
│  │       [ ✈ Anmelden ]                   │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ── Heutige Einträge ──────────────────────     │
│  ┌──────┬────────┬───────┬───────┬────────┐    │
│  │Pilot │Modell  │Start  │Ende   │Status  │    │
│  ├──────┼────────┼───────┼───────┼────────┤    │
│  │Max M.│Zephyr  │10:30  │──:──  │🟢 aktiv│    │
│  │Anna K│ASH 31  │09:15  │11:45  │⚪ fertig│    │
│  │Peter │⛑ FL   │08:00  │10:00  │⚪ fertig│    │
│  └──────┴────────┴───────┴───────┴────────┘    │
│                                                 │
│       [ 🛑 Alle abmelden ]  [ 📄 Export ]       │
└─────────────────────────────────────────────────┘
```

### 4.2 Formular-Felder im Detail

| Feld | Typ | Pflicht | Quelle | Bemerkung |
|---|---|---|---|---|
| **Pilot** | Dropdown | ✅ | user-Tabelle (gefiltert nach Verein) | Vorauswahl: eingeloggter User |
| **Gelände** | Dropdown | ✅ | gelaende-Tabelle | Vorauswahl: Vereinsgelände |
| **Datum** | Date-Picker | ✅ | Default: heute | Rückdatierung möglich |
| **Typ** | Radio | ✅ | „Modellflug" / „Flugleiterdienst" | Blendet Modell-Felder bei FL aus |
| **Modell** | Dropdown + Multi-Select | ✅ (bei Modellflug) | modell-Tabelle des Piloten | Multi-Select analog MFSD |
| **Startzeit** | Time-Picker | ✅ | Default: aktuelle Uhrzeit | |
| **Endzeit** | Time-Picker | ❌ | Leer bei Anmeldung | Wird bei Abmeldung gesetzt |
| **Bemerkungen** | Textarea | ❌ | Freitext + vordefinierte Textbausteine | |

### 4.3 Workflow

```mermaid
stateDiagram-v2
    [*] --> Anmelden : Pilot wählt Modell + klickt "Anmelden"
    Anmelden --> Aktiv : Eintrag gespeichert (Endzeit = NULL)
    Aktiv --> Abgemeldet : Pilot klickt "Abmelden" → Endzeit wird gesetzt
    Aktiv --> Editieren : Long-tap / Klick auf Eintrag
    Editieren --> Aktiv : Änderungen gespeichert
    Abgemeldet --> [*]
```

---

## 5. Benutzerverwaltung

### 5.1 Rollen & Berechtigungen

| Rolle | Beschreibung | Berechtigungen |
|---|---|---|
| **Admin** | Vereinsadministrator | Alles: User anlegen/löschen, Gelände verwalten, alle Einträge editieren/löschen, Export |
| **Flugleiter** | Pilot mit Flugleiter-Berechtigung | Eigene Einträge + Flugleiterdienst erfassen, alle Einträge des Tages sehen |
| **Pilot** | Normales Vereinsmitglied | Eigene Einträge erfassen, eigene Modelle verwalten, Tages-Flugbuch einsehen |
| **Gast** | Tagesgast | Eigene Einträge erfassen (nur Tageszugang), keine Modellverwaltung |

### 5.2 Gastzugang

Statt QR-Code mit FTP-Daten → **Einladungslink** mit Tages-Token:

```
https://flugbuch.mfg-uetze.de/gast?token=abc123&datum=2026-03-03
```

- Der Admin generiert den Link (gültig für einen Tag)
- Gast gibt Name + Modelltyp ein → kann Flüge loggen
- Nach 23:59 Uhr verfällt der Zugang automatisch

---

## 6. Modellverwaltung

### 6.1 Modell-Editor (Formular)

| Feld | Beschreibung | MFSD-Äquivalent |
|---|---|---|
| **Bezeichnung** | Freitext, z.B. „Zephyr F5J" | Bezeichnung |
| **Modelltyp** | Dropdown: Motorflugzeug, Segelflugzeug, Hubschrauber, Multikopter, Sonstige | ModellTypCodes |
| **Antrieb** | Dropdown: Elektro, Verbrenner, Turbine, Ohne, Sonstige | MotorTypCodes |
| **Gewichtsklasse** | Dropdown: ≤250g, ≤2kg, ≤4kg, ≤12kg, ≤25kg, >25kg | GewichtsKlasse |
| **Registriernummer** | Optional, UAS-Betreiber-Nummer | Registriernummer |
| **Aktiv** | Toggle — deaktivierte Modelle erscheinen nicht in der Auswahl | (neu) |

### 6.2 Modell-Gruppen

Analog zur MFSD-App kann ein Modell-Eintrag als **Sammel-Eintrag** dienen:
- Bezeichnung: z.B. „E-Segler bis 4 kg"
- Antrieb: Mehrfachauswahl möglich (über Array/JSON in der DB)
- So reicht ein Eintrag pro Tag gemäß StRfF-Mindestanforderung

---

## 7. API-Endpunkte (REST)

### 7.1 Authentifizierung

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/api/auth/login` | Login → JWT |
| POST | `/api/auth/gast` | Gastzugang mit Tages-Token |
| POST | `/api/auth/refresh` | Token erneuern |

### 7.2 User

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/users` | Alle Piloten des Vereins |
| POST | `/api/users` | Neuen Piloten anlegen (Admin) |
| PUT | `/api/users/{id}` | Pilotendaten bearbeiten |
| DELETE | `/api/users/{id}` | Piloten deaktivieren (Admin) |

### 7.3 Modelle

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/users/{id}/modelle` | Modelle eines Piloten |
| POST | `/api/modelle` | Neues Modell anlegen |
| PUT | `/api/modelle/{id}` | Modell bearbeiten |
| DELETE | `/api/modelle/{id}` | Modell deaktivieren |

### 7.4 Flugeinträge

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/flugbuch?datum=2026-03-03&gelaende_id=...` | Tages-Flugbuch |
| POST | `/api/flugbuch` | Neuen Eintrag (Anmeldung) |
| PUT | `/api/flugbuch/{id}` | Eintrag bearbeiten (Abmeldung, Korrektur) |
| DELETE | `/api/flugbuch/{id}` | Eintrag löschen (Admin) |
| POST | `/api/flugbuch/abmelden` | Alle offenen Einträge eines Piloten abmelden |

### 7.5 Export

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/export/pdf?von=...&bis=...` | PDF-Export |
| GET | `/api/export/csv?von=...&bis=...` | CSV-Export |

### 7.6 Gelände

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/gelaende` | Alle Gelände des Vereins |
| POST | `/api/gelaende` | Neues Gelände anlegen (Admin) |
| PUT | `/api/gelaende/{id}` | Gelände bearbeiten (Admin) |

---

## 8. Export & Kompatibilität

### 8.1 Unterstützte Exportformate

| Format | Zweck |
|---|---|
| **PDF** | Druckbares Flugbuch, analog zum MFSD-PDF-Export |
| **CSV** | Maschinenlesbar, zur Weiterverarbeitung |


### 8.2 FBD-Import (optional, Phase 2)

Für die Migration bestehender Daten aus der MFSD-App:
- Import-Endpunkt für `.fbd`-Dateien (XML)
- Stammdaten-Import aus `.fbs`-Dateien (CSV)

---

## 9. Verbesserungen gegenüber MFSD

| Feature | MFSD | Neu |
|---|---|---|
| **Datenspeicherung** | Lokal + FTP-Dateien | Zentrale PostgreSQL-DB |
| **Synchronisation** | Manueller FTP-Upload | Sofort bei Speichern (REST API) |
| **UI** | Native Windows/Android-App | Responsives Web (PWA-fähig) |
| **Gastzugang** | QR-Code mit FTP-Credentials | Einladungslink mit Tages-Token |
| **Fehlerkorrektur** | Nur Server-Admin | Berechtigte User direkt im Web |
| **Mehrbenutzer** | FTP-Dateikonflikte | DB-Transaktionen, Race-Condition-frei |
| **Offline-Fähigkeit** | Vorhanden (lokal) | PWA mit Service Worker (Phase 2) |
| **Statistiken** | Nicht vorhanden | Dashboard: Flugstunden/Pilot, Modelle, etc. |

---

## 10. Nicht-funktionale Anforderungen

| Anforderung | Spezifikation |
|---|---|
| **Verfügbarkeit** | 99 % (Hobby-Projekt, Docker-Restart-Policy) |
| **Datenschutz** | DSGVO-konform, Daten nur innerhalb des Vereins |
| **Backup** | Tägliches DB-Dump (Cron-Job im Docker-Container) |
| **Performance** | < 500 ms Antwortzeit für API-Calls |
| **Responsive** | Nutzbar auf Smartphone, Tablet, Desktop |
| **Sicherheit** | HTTPS (Traefik), Passwort-Hashing (bcrypt), JWT mit Expiry |

---

## 11. Phasenplanung

| Phase | Inhalt | Geschätzter Aufwand |
|---|---|---|
| **Phase 1** | Backend (FastAPI + DB), Auth, Flugeintrag-CRUD, einfaches Web-Frontend | 2–3 Wochen |
| **Phase 2** | Modellverwaltung, Benutzerverwaltung, PDF/CSV-Export | 1–2 Wochen |
| **Phase 3** | Dashboard / Statistiken, PWA, Offline-Fähigkeit | 1–2 Wochen |
| **Phase 4** |  Gastzugang, QR-Code-Scan | 1 Woche |
| **Phase 5** | FBD-Import (MFSD-Migration) | 1 Woche |
---

## 12. Offene Fragen

1. **Vereinsübergreifend?** Soll die App von Anfang an mehrere Vereine unterstützen oder zunächst nur für euren Verein?
Nur unser Verein, er heißt Modellfluggemeinschaft Kitzingen e.V. (MFGKT), wir haben auch eine Webseite unter: https://www.mfgkitzingen.de/
2. **Offline-Modos?** Wie wichtig ist Offline-Fähigkeit (kein Empfang auf dem Flugplatz)?
lassen wir erstmal weg
3. **MFSD-Kompatibilität?** Soll ein FBD-Import/Export für Migration beibehalten werden?
nein
4. **Dashboard?** Welche Statistiken sind gewünscht (Flugstunden/Monat, Modell-Ranking, etc.)?
Flugstunden, Besucherstunden, Modellstunden, Anzahl der Flüge
Häufigkeitsverteilung der Flüge unter der Woche, am Wochenende

5. **Unterschrift?** Die MFSD-App unterstützt Piloten-Unterschriften. Ist das weiterhin relevant?
Welche Alternativen gibt es? Digital signiert wäre gut, aber wie umständlich in der handhabung?
6. **QR-Code?** Die MFSD-App unterstützt QR-Code-Scan. Ist das weiterhin relevant?
Kennen wir den Aufbau des QR codes, wozu dien dieser? Falls es das Fluggelände kennzeichnet und wir ihn identisch zu dem des MFSD hin bekommen, dann ja.
7. **DSGVO?** Ist es zulässig, das namen und Modelle der User in der Liste für alle sichtbar sind?


## 13. Testplan
1. **Testumgebung**
   - Docker-Container mit PostgreSQL
   - FastAPI-Server
   - Test-Datenbank
   - Test-User
2. **Tests**
   - Userverwaltung
   - Authentifizierung
   - Modellverwaltung
   - Flugeintragverwaltung
   - PDF/CSV-Export
   - Gasgastzugang
   - QR-Code-Scan
   - Dashboard
   - Backup
   - Performance
   - Responsive
   - Sicherheit
   



