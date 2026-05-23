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
  const lines = content.split('\n').map(l => l.trim());
  let i = 0;

  // Parse metadata (Quiz: ..., Klasse: ..., etc.)
  const metadata: Record<string, string> = {};
  let title = '';

  while (i < lines.length && lines[i]) {
    const line = lines[i];
    if (line.startsWith('Quiz:')) {
      title = line.replace(/^Quiz:\s*/, '').trim();
      metadata['title'] = title;
    } else if (line.includes(':')) {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        metadata[key.toLowerCase()] = value;
      }
    } else if (line.startsWith('---')) {
      break;
    }
    i++;
  }

  if (!title) {
    throw new Error('Quiz-Titel erforderlich (Quiz: ...)');
  }

  const questions: Question[] = [];
  let questionId = 1;

  // Parse questions
  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines and section dividers
    if (!line || line.startsWith('---')) {
      i++;
      continue;
    }

    // Start of a new question
    if (line.startsWith('---') || (i === 0 || lines[i - 1].startsWith('---'))) {
      i++;
      if (i >= lines.length) break;

      // Read question text
      let questionText = '';
      while (i < lines.length && lines[i] && !lines[i].match(/^(A\)|B\)|C\)|D\)|ANTWORT:|Wahr|Falsch)/)) {
        questionText += (questionText ? ' ' : '') + lines[i];
        i++;
      }

      if (!questionText) {
        i++;
        continue;
      }

      questionText = questionText.trim();

      // Check if it's multiple choice or true/false
      const options: string[] = [];
      while (i < lines.length && lines[i].match(/^[A-D]\)/)) {
        const option = lines[i].replace(/^[A-D]\)\s*/, '').trim();
        options.push(option);
        i++;
      }

      // Read ANTWORT
      let correctAnswer: string | boolean | undefined;
      if (i < lines.length && lines[i].startsWith('ANTWORT:')) {
        const answer = lines[i].replace(/^ANTWORT:\s*/, '').trim();
        if (options.length > 0) {
          // Multiple choice: map A, B, C, D to options
          const answerMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
          const idx = answerMap[answer.toUpperCase().replace(/\).*/, '')];
          correctAnswer = idx !== undefined ? options[idx] : answer;
        } else {
          // True/False
          correctAnswer = answer.toLowerCase() === 'wahr' || answer.toLowerCase() === 'true';
        }
        i++;
      }

      // Skip ERKLÄRUNG if present
      if (i < lines.length && lines[i].startsWith('ERKLÄRUNG:')) {
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
