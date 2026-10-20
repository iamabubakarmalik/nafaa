/**
 * Text measuring and wrapping for SVG labels.
 *
 * SVG text does not wrap, and diagrams render on the server with no layout
 * engine, so widths are estimated from Inter's average glyph widths. The
 * estimate errs on the wide side so labels never spill out of their box.
 */

const NARROW = new Set(Array.from("il.,:;'|!()[]{}/ ·"));
const SEMI_NARROW = new Set(Array.from('frtjI1-'));
const WIDE = new Set(Array.from('mwMW@%'));

/** Estimated rendered width of `text` in user units. */
export function textWidth(text: string, size: number, weight = 600): number {
  let units = 0;
  for (const ch of text) {
    if (NARROW.has(ch)) units += 0.28;
    else if (SEMI_NARROW.has(ch)) units += 0.38;
    else if (WIDE.has(ch)) units += 0.86;
    else if (ch >= 'A' && ch <= 'Z') units += 0.68;
    else if (ch >= '0' && ch <= '9') units += 0.6;
    else units += 0.56;
  }
  return units * size * (weight >= 600 ? 1.04 : 1);
}

function clip(line: string, maxWidth: number, size: number, weight: number): string {
  if (textWidth(line, size, weight) <= maxWidth) return line;
  let out = line;
  while (out.length > 1 && textWidth(`${out}…`, size, weight) > maxWidth) out = out.slice(0, -1);
  return `${out.trimEnd()}…`;
}

/**
 * Greedy word wrap into at most `maxLines` lines. Overflow is cut with an
 * ellipsis; the full text is always present in the SVG <desc>.
 */
export function wrapText(text: string, maxWidth: number, size: number, maxLines = 2, weight = 600): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (!current || textWidth(next, size, weight) <= maxWidth) current = next;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines - 1).map((line) => clip(line, maxWidth, size, weight));
    kept.push(clipLast(lines[maxLines - 1] ?? '', maxWidth, size, weight));
    return kept;
  }
  return lines.map((line) => clip(line, maxWidth, size, weight));
}

/** The last kept line always ends in an ellipsis when text was dropped. */
function clipLast(line: string, maxWidth: number, size: number, weight: number): string {
  let out = line;
  while (out.length > 1 && textWidth(`${out}…`, size, weight) > maxWidth) out = out.slice(0, -1);
  return `${out.trimEnd()}…`;
}

/** Joins labels into a readable sequence for screen readers: "A, then B, then C". */
export function sequence(labels: string[]): string {
  return labels.filter(Boolean).join(', then ');
}
