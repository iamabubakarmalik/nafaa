/**
 * Markdown helpers for checks and word counts (API-CONTRACT 3.3). The site
 * renders Markdown with its own pipeline; nothing here produces HTML.
 */
import { MARKDOWN_ALLOWED_HEADING_LEVELS } from '../contract/cms-contract';

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;

/** Splits Markdown into lines with a flag for lines inside fenced code. */
function linesWithFences(md: string): { text: string; inCode: boolean }[] {
  const out: { text: string; inCode: boolean }[] = [];
  let fence: string | null = null;
  for (const text of md.split(/\r?\n/)) {
    const m = FENCE.exec(text);
    if (fence === null && m && m[1]) {
      fence = m[1][0] as string;
      out.push({ text, inCode: true });
      continue;
    }
    if (fence !== null) {
      out.push({ text, inCode: true });
      if (m && m[1] && m[1][0] === fence) fence = null;
      continue;
    }
    out.push({ text, inCode: false });
  }
  return out;
}

/**
 * Markdown to plain text for word counts and similarity: drops code blocks,
 * images, HTML tags and table rules; keeps link text; removes heading, list,
 * quote and emphasis markers. Tokens count as one word each.
 */
export function markdownToPlainText(md: string): string {
  const kept = linesWithFences(md)
    .filter((l) => !l.inCode)
    .map((l) => l.text)
    .filter((line) => !/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)) // table rule
    .join('\n');
  return kept
    .replace(/\{\{[^{}]*\}\}/g, ' token ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, '')
    .replace(/^\s*(?:[-*_]\s*){3,}$/gm, ' ')
    .replace(/[*_~]+/g, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type HeadingProblemReason = 'h1' | 'too_deep' | 'skipped';

export interface HeadingProblem {
  /** 1-based line number inside the Markdown string. */
  line: number;
  level: number;
  reason: HeadingProblemReason;
}

/**
 * Heading rules for content Markdown: only H2 and H3; no H1 (the hero or
 * template owns it); an H3 needs an H2 before it in the same text.
 * Headings inside fenced code are ignored. Setext headings count too.
 */
export function markdownHeadingProblems(md: string): HeadingProblem[] {
  const allowed = MARKDOWN_ALLOWED_HEADING_LEVELS as readonly number[];
  const maxLevel = Math.max(...allowed);
  const problems: HeadingProblem[] = [];
  const lines = linesWithFences(md);
  let seenH2 = false;

  lines.forEach((line, i) => {
    if (line.inCode) return;
    let level = 0;
    const atx = /^\s{0,3}(#{1,6})(?:\s|$)/.exec(line.text);
    if (atx && atx[1]) {
      level = atx[1].length;
    } else if (i > 0) {
      const prev = lines[i - 1];
      const prevIsText = prev !== undefined && !prev.inCode && prev.text.trim() !== '' && !/^\s{0,3}(#|>|[-*+]\s|\d+[.)]\s)/.test(prev.text);
      if (prevIsText && /^\s{0,3}=+\s*$/.test(line.text)) level = 1;
      else if (prevIsText && /^\s{0,3}-+\s*$/.test(line.text)) level = 2;
    }
    if (level === 0) return;
    const lineNo = i + 1;
    if (level === 1) problems.push({ line: lineNo, level, reason: 'h1' });
    else if (level > maxLevel) problems.push({ line: lineNo, level, reason: 'too_deep' });
    else if (level === 3 && !seenH2) problems.push({ line: lineNo, level, reason: 'skipped' });
    if (level === 2) seenH2 = true;
  });
  return problems;
}

/** Roman Urdu message for a heading problem (HEADING_LEVEL issue). */
export function headingProblemMessage(problem: HeadingProblem): string {
  switch (problem.reason) {
    case 'h1':
      return `Line ${problem.line}: H1 mana hai, page ka H1 hero ya template deta hai. H2 istemal karein`;
    case 'too_deep':
      return `Line ${problem.line}: sirf H2 aur H3 allowed hain (H${problem.level} mila)`;
    case 'skipped':
      return `Line ${problem.line}: H3 se pehle isi text me H2 hona chahiye`;
  }
}
