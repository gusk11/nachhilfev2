# Nachhilfe – Next Level

Ein modernes Nachhilfe-Management-System mit Quizzes, Schüler-Verwaltung und Ergebnisverfolgung.

## Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS
- **Datenbank:** Vercel Postgres
- **Dateienspeicher:** Vercel Blob
- **Authentifizierung:** JWT (Cookies)

## Features

### Schüler
- **Registrierung & Login:** Mit Benutzername und PIN
- **Dashboard:** Übersicht verfügbarer Quizzes und Ergebnisse
- **Quiz-System:** 
  - Multiple Choice Fragen
  - True/False Fragen
  - Freie Textantworten
  - Automatische Punktebewertung

### Lehrer
- **Passwort-geschützter Login**
- **Quiz-Verwaltung:**
  - Quizzes als JSON-Dateien hochladen
  - Für einzelne Schüler oder alle Schüler verfügbar machen
- **Schüler-Verwaltung:** Übersicht aller registrierten Schüler
- **Ergebnisse:** Vollständige Übersicht aller Quiz-Ergebnisse

## Installation

```bash
npm install
```

## Umgebungsvariablen

Erstellen Sie eine `.env.local` Datei (siehe `.env.example`):

```env
POSTGRES_URLPWD=postgresql://user:password@host/nachhilfe
VERCEL_BLOB_TOKEN=your_token
TEACHER_PASSWORD=lehrer123
JWT_SECRET=your_secret_key_min_32_chars
```

## Datenbank-Setup

Die Datenbank wird automatisch initialisiert. Sie können dies manuell triggern:

```typescript
import { initializeDB } from '@/lib/db';
await initializeDB();
```

### Tabellen-Schema

**students**
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR)
- `pin_hash` (VARCHAR)
- `pin_salt` (VARCHAR)
- `created_at` (TIMESTAMP)

**quizzes**
- `id` (SERIAL PRIMARY KEY)
- `title` (VARCHAR)
- `file_key` (VARCHAR) - Vercel Blob key
- `student_id` (INTEGER, optional)
- `uploaded_at` (TIMESTAMP)

**results**
- `id` (SERIAL PRIMARY KEY)
- `student_id` (INTEGER)
- `quiz_id` (INTEGER)
- `score` (DECIMAL)
- `completed_at` (TIMESTAMP)

## Quiz-JSON Format

Beispiel `example-quiz.json`:

```json
{
  "title": "Mathematik - Kapitel 3",
  "questions": [
    {
      "id": "q1",
      "text": "Frage text?",
      "type": "multiple",
      "options": ["A", "B", "C"],
      "correctAnswer": "A"
    },
    {
      "id": "q2",
      "text": "Wahr oder falsch?",
      "type": "true-false",
      "correctAnswer": true
    },
    {
      "id": "q3",
      "text": "Freie Antwort?",
      "type": "text",
      "correctAnswer": "Lösung"
    }
  ]
}
```

## Development

```bash
npm run dev
```

Server läuft auf `http://localhost:3000`

## Routen

### Öffentlich
- `/` - Schüler-Login
- `/lehrer` - Lehrer-Login

### Schüler-Bereich (authentifiziert)
- `/student/[id]` - Dashboard
- `/student/[id]/quiz/[quizId]` - Quiz absolvieren

### Lehrer-Bereich (authentifiziert)
- `/lehrer/dashboard` - Verwaltungs-Dashboard

### API-Routen
- `POST /api/auth/student/login` - Schüler-Authentifizierung
- `POST /api/auth/teacher/login` - Lehrer-Authentifizierung
- `POST /api/auth/logout` - Abmelden
- `POST /api/quizzes/upload` - Quiz hochladen (Lehrer)
- `GET /api/quizzes/[quizId]` - Quiz-Daten abrufen
- `GET /api/quizzes/student/[studentId]` - Schüler-Quizzes
- `POST /api/results` - Ergebnis speichern
- `GET /api/results` - Schüler-Ergebnisse
- `GET /api/results/all` - Alle Ergebnisse (Lehrer)
- `GET /api/students` - Schüler-Liste (Lehrer)

## Authentication

### Schüler
- PIN wird mit SHA-256 + Salt gehasht
- JWT-Token in httpOnly Cookie gespeichert
- 24h Gültigkeitsdauer

### Lehrer
- Passwort aus `TEACHER_PASSWORD` Env-Variable
- JWT-Token in httpOnly Cookie
- 24h Gültigkeitsdauer

## File Storage

Quizzes werden als JSON-Dateien in Vercel Blob gespeichert:
- Pfad: `quizzes/[timestamp]-[filename]`
- Private (nicht öffentlich zugänglich)

## Sicherheit

- Sensitive Daten in HTTP-only Cookies
- JWT-basierte Authentifizierung
- Passwort-Hashing für Lehrer
- PIN-Hashing für Schüler mit individuellen Salts
- Middleware-basierte Route-Protection

## Deployment

Die App ist optimiert für Vercel-Deployment mit integrierten Services:
- Vercel Postgres für DB
- Vercel Blob für Dateispeicher
- Serverless Functions für APIs

## License

MIT
