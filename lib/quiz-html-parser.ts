interface QuizOption {
  letter: string;
  html: string;
}

interface Question {
  id: string;
  type: 'multiple' | 'true-false';
  text: string;          // HTML
  options?: QuizOption[];
  correctAnswer?: string | boolean;
  explanation?: string;  // HTML
}

interface ParsedQuiz {
  title: string;
  questions: Question[];
}

/**
 * Parst eine Quiz-HTML-Datei. Format: HTML mit einem
 * <script id="quiz-data" type="application/json">…</script> Block.
 *
 * Erwartetes JSON-Schema:
 * {
 *   "title": string,
 *   "questions": [
 *     {
 *       "type": "multiple" | "true-false",
 *       "text": HTML-String (mit LaTeX in \(...\) oder $$...$$),
 *       "options": [{ "letter": "A", "html": HTML-String }, ...],   // nur multiple
 *       "correct": "A" | "B" | "C" | "D" | true | false,
 *       "explanation": HTML-String (optional)
 *     }
 *   ]
 * }
 */
export function parseQuizHtml(content: string): ParsedQuiz {
  // Robust gegen Attribute-Reihenfolge und Whitespace
  const match = content.match(
    /<script[^>]*\bid=["']quiz-data["'][^>]*>([\s\S]*?)<\/script>/i
  );

  if (!match) {
    throw new Error(
      'Quiz-Daten nicht gefunden. Die HTML-Datei muss einen ' +
      '<script id="quiz-data" type="application/json">…</script>-Block enthalten.'
    );
  }

  const jsonText = match[1].trim();
  let data: any;
  try {
    data = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(
      'Quiz-JSON konnte nicht geparst werden: ' +
      (e instanceof Error ? e.message : String(e))
    );
  }

  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (!title) throw new Error('Quiz-Titel fehlt (Feld "title").');

  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error('Keine Fragen gefunden (Feld "questions" leer).');
  }

  const questions: Question[] = data.questions.map((raw: any, idx: number) => {
    const id = String(idx + 1);
    const type = raw.type === 'true-false' ? 'true-false' : 'multiple';
    const text = typeof raw.text === 'string' ? raw.text : '';
    if (!text.trim()) throw new Error(`Frage ${id}: "text" fehlt.`);

    const q: Question = { id, type, text };

    if (typeof raw.explanation === 'string' && raw.explanation.trim()) {
      q.explanation = raw.explanation;
    }

    if (type === 'multiple') {
      if (!Array.isArray(raw.options) || raw.options.length < 2) {
        throw new Error(`Frage ${id}: Mindestens 2 Optionen erforderlich.`);
      }
      const opts: QuizOption[] = raw.options.map((o: any, oi: number) => {
        const letter =
          typeof o.letter === 'string' && o.letter.trim()
            ? o.letter.trim().toUpperCase()
            : String.fromCharCode(65 + oi); // A, B, C, D fallback
        const html = typeof o.html === 'string' ? o.html : String(o);
        return { letter, html };
      });
      q.options = opts;

      const correctLetter =
        typeof raw.correct === 'string' ? raw.correct.trim().toUpperCase() : '';
      const found = opts.find((o) => o.letter === correctLetter);
      if (!found) {
        throw new Error(
          `Frage ${id}: "correct" muss einer der Optionen-Buchstaben sein (war: "${raw.correct}").`
        );
      }
      q.correctAnswer = correctLetter;
    } else {
      // true-false
      if (typeof raw.correct === 'boolean') {
        q.correctAnswer = raw.correct;
      } else if (typeof raw.correct === 'string') {
        const v = raw.correct.toLowerCase().trim();
        q.correctAnswer =
          v === 'true' || v === 'wahr' || v === 'ja' || v === 'yes';
      } else {
        throw new Error(`Frage ${id}: "correct" muss true/false sein.`);
      }
    }

    return q;
  });

  return { title, questions };
}
