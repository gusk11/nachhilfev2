'use client';

import { useMemo } from 'react';
import katex from 'katex';

/**
 * Rendert HTML-Inhalt und ersetzt LaTeX-Math-Delimiter durch
 * KaTeX-gerenderte HTML-Snippets.
 *
 * Wichtig: KaTeX wird beim ersten Render direkt in einen HTML-String
 * gerendert (via katex.renderToString). Das prozessierte Ergebnis wird
 * per useMemo gecacht und via dangerouslySetInnerHTML gesetzt — so
 * überlebt es Re-Renders durch State-Changes im Parent (z.B. Auswahl
 * einer Antwort) ohne die Mathe zu zerschießen.
 *
 * Unterstützte Delimiter:
 *   $$ … $$    → display math
 *   \[ … \]    → display math
 *   \( … \)    → inline math
 */
export default function RichContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const processed = useMemo(() => processMath(html), [html]);

  return (
    <div
      className={`quiz-content ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  );
}

/**
 * Geht HTML Token-weise durch und ersetzt Math-Delimiter nur in Text-Knoten.
 * Innerhalb von <code>, <pre>, <script>, <style> wird NICHT umgewandelt.
 */
function processMath(input: string): string {
  const skipTags = new Set(['code', 'pre', 'script', 'style']);
  let skipDepth = 0;
  let out = '';
  let i = 0;

  while (i < input.length) {
    if (input[i] === '<') {
      const end = input.indexOf('>', i);
      if (end === -1) {
        // Unclosed tag — Rest als Text behandeln
        const rest = input.slice(i);
        out += skipDepth > 0 ? rest : renderMathInText(rest);
        break;
      }
      const tag = input.slice(i, end + 1);
      const m = tag.match(/^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)/);
      if (m) {
        const isClosing = m[1] === '/';
        const tagName = m[2].toLowerCase();
        if (skipTags.has(tagName)) {
          if (isClosing) {
            skipDepth = Math.max(0, skipDepth - 1);
          } else if (!tag.endsWith('/>')) {
            skipDepth += 1;
          }
        }
      }
      out += tag;
      i = end + 1;
    } else {
      const next = input.indexOf('<', i);
      const end = next === -1 ? input.length : next;
      const text = input.slice(i, end);
      out += skipDepth > 0 ? text : renderMathInText(text);
      i = end;
    }
  }

  return out;
}

function renderMathInText(text: string): string {
  if (
    !text.includes('$') &&
    !text.includes('\\(') &&
    !text.includes('\\[')
  ) {
    return text;
  }

  // Reihenfolge wichtig: erst $$, dann \[ \], dann \( \)
  const pattern = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g;

  return text.replace(pattern, (full, dd, br, par) => {
    const isDisplay = dd !== undefined || br !== undefined;
    const expr = (dd ?? br ?? par ?? '').trim();
    try {
      return katex.renderToString(expr, {
        displayMode: isDisplay,
        throwOnError: false,
        strict: 'ignore',
        output: 'html',
      });
    } catch {
      return escapeHtml(full);
    }
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => {
    if (c === '&') return '&amp;';
    if (c === '<') return '&lt;';
    return '&gt;';
  });
}
