# Setup-Anleitung – Nachhilfe App

## Voraussetzungen

- Node.js 18+
- npm
- Vercel Account (für Postgres & Blob)

## 1. Vercel Postgres Einrichten

1. Gehe zu [Vercel Console](https://vercel.com)
2. Erstelle eine neue Postgres Database oder verbinde eine bestehende
3. Kopiere die `POSTGRES_URLPWD` Verbindungszeichenkette

## 2. Vercel Blob Einrichten

1. In der Vercel Console → Storage → Blob
2. Erstelle einen neuen Blob Storage
3. Generiere einen Token
4. Kopiere den `VERCEL_BLOB_TOKEN`

## 3. Umgebungsvariablen Konfigurieren

Erstelle `.env.local`:

```env
POSTGRES_URLPWD=postgresql://user:password@host/nachhilfe
VERCEL_BLOB_TOKEN=your_token_here
TEACHER_PASSWORD=lehrer123
JWT_SECRET=generate_strong_random_string_min_32_chars
```

**JWT_SECRET generieren (macOS/Linux):**
```bash
openssl rand -base64 32
```

**JWT_SECRET generieren (Windows PowerShell):**
```powershell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((1..32 | ForEach-Object { [char](Get-Random -Minimum 33 -Maximum 126) }) -join ''))
```

## 4. Datenbank Initialisieren

```bash
npm run dev
```

Die Datenbank-Tabellen werden beim ersten API-Aufruf automatisch erstellt.

Falls nicht automatisch:
```typescript
// In der Browser-Console oder einer init-API aufrufen:
import { initializeDB } from '@/lib/db';
await initializeDB();
```

## 5. Test-Daten Hinzufügen

### Schüler Registrieren
1. Gehe zu `http://localhost:3000`
2. Gebe einen Namen ein (z.B. "Max Mustermann")
3. Gebe eine PIN ein (z.B. "1234")
4. Klick "Registrieren"

### Lehrer Login
1. Gehe zu `http://localhost:3000/lehrer`
2. Gebe das Passwort aus `TEACHER_PASSWORD` ein
3. Klick "Anmelden"

## 6. Quiz Beispiel Hochladen

1. Als Lehrer angemeldet zum Dashboard gehen
2. Titel eingeben (z.B. "Mathematik Grundlagen")
3. Datei auswählen: `public/example-quiz.json`
4. Lehrer/Schüler selektieren (optional)
5. "Quiz hochladen" klicken

## 7. Quiz Absolvieren (Schüler)

1. Als Schüler angemeldet
2. Verfügbares Quiz im Dashboard anklicken
3. Fragen beantworten
4. Ergebnis anschauen

## Deployment auf Vercel

### Git Repository
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

### Vercel Deployment
1. Gehe zu [Vercel Console](https://vercel.com/new)
2. Verbinde dein GitHub Repository
3. Wähle `nachhilfe-v2` Projekt
4. Konfiguriere Environment Variables:
   - POSTGRES_URLPWD
   - VERCEL_BLOB_TOKEN
   - TEACHER_PASSWORD
   - JWT_SECRET
5. Deploy

## Troubleshooting

### "POSTGRES_URLPWD ist nicht definiert"
- Überprüfe `.env.local` existiert
- Format sollte `postgresql://user:password@host/db` sein

### "Blob Upload schlägt fehl"
- VERCEL_BLOB_TOKEN überprüfen
- Token hat Schreibberechtigung?

### "Quiz JSON wird nicht gelesen"
- Überprüfe JSON-Format (siehe `example-quiz.json`)
- Alle Felder der Fragen überprüfen
- `id`, `text`, `type`, `correctAnswer` obligatorisch

### "Login funktioniert nicht"
- JWT_SECRET mindestens 32 Zeichen
- Cookies aktiviert im Browser?
- httpOnly Cookies unterstützt?

## Entwicklungs-Tipps

### Datenbank Inspizieren (Vercel)
1. Vercel Console → Postgres
2. "Query" Tab → SQL Queries ausführen

### Blob Dateien Anschauen
1. Vercel Console → Blob
2. Alle hochgeladenen Dateien sehen

### Debug Mode
In `.env.local`:
```env
DEBUG=nachhilfe:*
```

## Features Roadmap

- [ ] Quiz-Versioning
- [ ] Schüler-Gruppen
- [ ] Automatisierte Bewertungsschemas
- [ ] Eltern-Benachrichtigungen
- [ ] Quiz-Analytics/Statistiken
- [ ] Mobile-optimierte Views
- [ ] Dark Mode

## Support

Für Fehler oder Fragen:
1. Siehe README.md
2. Überprüfe SETUP.md (dieses Dokument)
3. Logs in Vercel Console anschauen
