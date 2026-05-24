'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';

/**
 * Rendert HTML-Inhalt (aus Quiz-JSON) und ersetzt LaTeX-Math-Delimiter durch
 * KaTeX-gerenderte Formeln.
 *
 * Unterstützte Delimiter:
 *   $$ … $$    → display math
 *   \[ … \]    → display math
 *   \( … \)    → inline math
 *
 * (Wir vermeiden bewusst $-only, weil "Kostet 5$ pro Stück" sonst aus Versehen
 * als Math interpretiert würde.)
 */
export default function RichContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    renderMathIn(ref.current);
  }, [html]);

  return (
    <div
      ref={ref}
      className={`quiz-content ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function renderMathIn(root: HTMLElement) {
  // Whitelist: nur Text-Knoten verarbeiten, KaTeX-Output (.katex) überspringen
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let p: Node | null = node.parentNode;
      while (p) {
        if (p instanceof Element) {
          const tag = p.tagName;
          if (
            tag === 'SCRIPT' ||
            tag === 'STYLE' ||
            tag === 'CODE' ||
            tag === 'PRE' ||
            p.classList.contains('katex')
          ) {
            return NodeFilter.FILTER_REJECT;
          }
        }
        p = p.parentNode;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  let cur: Node | null = walker.nextNode();
  while (cur) {
    textNodes.push(cur as Text);
    cur = walker.nextNode();
  }

  // Math-Pattern: $$…$$, \[…\], \(…\)
  // Reihenfolge wichtig: erst $$, dann \[ \], dann \( \)
  const pattern = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g;

  for (const tn of textNodes) {
    const text = tn.nodeValue ?? '';
    if (!text.includes('$') && !text.includes('\\(') && !text.includes('\\[')) {
      continue;
    }

    pattern.lastIndex = 0;
    let lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let match: RegExpExecArray | null;
    let matched = false;

    while ((match = pattern.exec(text)) !== null) {
      matched = true;
      const [full, dd, br, par] = match;
      const start = match.index;
      if (start > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, start))
        );
      }

      const isDisplay = dd !== undefined || br !== undefined;
      const expr = (dd ?? br ?? par ?? '').trim();
      const span = document.createElement('span');
      try {
        katex.render(expr, span, {
          displayMode: isDisplay,
          throwOnError: false,
          strict: 'ignore',
          output: 'html',
        });
      } catch {
        span.textContent = full;
      }
      fragment.appendChild(span);
      lastIndex = start + full.length;
    }

    if (!matched) continue;
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    tn.parentNode?.replaceChild(fragment, tn);
  }
}
