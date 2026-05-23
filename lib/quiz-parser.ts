interface Question {
  id: string;
  text: string;
  type: 'multiple' | 'true-false';
  options?: string[];
  correctAnswer?: string | boolean;
}

interface ParsedQuiz {
  title: string;
  metadata: Record<string, string>;
  questions: Question[];
}

export function parseQuizTxt(content: string): ParsedQuiz {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l !== '');
  let i = 0;

  // Parse metadata (Quiz: ..., Klasse: ..., etc.)
  const metadata: Record<string, string> = {};
  let title = '';

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('---')) break; // End of metadata

    if (line.startsWith('Quiz:')) {
      title = line.replace(/^Quiz:\s*/, '').trim();
      metadata['title'] = title;
    } else if (line.includes(':') && !line.startsWith('ANTWORT:') && !line.startsWith('ERKLÄRUNG:')) {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        metadata[key.toLowerCase()] = value;
      }
    }
    i++;
  }

  if (!title) {
    throw new Error('Quiz-Titel erforderlich (Quiz: ...)');
  }

  const questions: Question[] = [];
  let questionId = 1;

  // Parse questions - look for --- markers
  while (i < lines.length) {
    const line = lines[i];

    // Found a question divider
    if (line.startsWith('---')) {
      i++;
      if (i >= lines.length) break;

      // Read question text (continues until we see A), B), etc. or ANTWORT:)
      let questionText = '';
      while (i < lines.length && !lines[i].match(/^(A\)|B\)|C\)|D\)|ANTWORT:|Wahr|Falsch)/i)) {
        const textLine = lines[i];
        if (textLine && !textLine.startsWith('---')) {
          questionText += (questionText ? ' ' : '') + textLine;
        }
        i++;
      }

      if (!questionText.trim()) {
        continue;
      }

      questionText = questionText.trim();

      // Read options (A), B), C), D))
      const options: string[] = [];
      while (i < lines.length && lines[i].match(/^[A-D]\)/i)) {
        const option = lines[i].replace(/^[A-D]\)\s*/i, '').trim();
        options.push(option);
        i++;
      }

      // Read ANTWORT
      let correctAnswer: string | boolean | undefined;
      if (i < lines.length && lines[i].match(/^ANTWORT:/i)) {
        const answerLine = lines[i].replace(/^ANTWORT:\s*/i, '').trim();

        if (options.length > 0) {
          // Multiple choice: map A, B, C, D to options
          const answerMatch = answerLine.match(/^([A-D])/i);
          if (answerMatch) {
            const answerMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
            const idx = answerMap[answerMatch[1].toUpperCase()];
            if (idx !== undefined) {
              correctAnswer = options[idx];
            }
          }
        } else {
          // True/False
          const normalized = answerLine.toLowerCase();
          correctAnswer = normalized === 'wahr' || normalized === 'true' || normalized === 'ja' || normalized === 'yes';
        }
        i++;
      }

      // Skip ERKLÄRUNG
      if (i < lines.length && lines[i].match(/^ERKLÄRUNG:/i)) {
        i++;
      }

      // Create question
      const question: Question = {
        id: String(questionId++),
        text: questionText,
        type: options.length > 0 ? 'multiple' : 'true-false',
      };

      if (options.length > 0) {
        question.options = options;
      }

      if (correctAnswer !== undefined) {
        question.correctAnswer = correctAnswer;
      }

      questions.push(question);
    } else {
      i++;
    }
  }

  if (questions.length === 0) {
    throw new Error('Keine gültigen Fragen gefunden. Format: --- Frage 1 --- Text A) Option B) Option ANTWORT: A');
  }

  return { title, metadata, questions };
}
