/**
 * Parses the note attached to a SaleItem when it was created from a
 * carpet roll or a cut piece. This is the canonical format:
 *
 *   Roll:      "Cut from R-001: 12ft × 8ft 6in = 102 sqft @ Rs 250/sqft"
 *   Cut piece: "Cut piece CP-2026-001 • 6ft × 4ft"
 *
 * Returns null if the note doesn\'t match a known carpet pattern.
 */
export type CarpetNoteInfo = {
  type: 'roll' | 'cut-piece';
  reference: string;
  dimensions?: string;
  area?: string;
  customRate?: string;
} | null;

export function parseCarpetNote(note?: string | null): CarpetNoteInfo {
  if (!note) return null;

  const rollMatch = note.match(
    /Cut from ([\w-]+):\s*([\d.]+\s*ft(?:\s+\d+in)?\s*[xX×]\s*[\d.]+\s*ft(?:\s+\d+in)?)(?:\s*=\s*([\d.]+\s*\w+))?(?:\s*@\s*(Rs\s*[\d.]+\/sqft.*))?/,
  );
  if (rollMatch) {
    return {
      type: 'roll',
      reference: rollMatch[1],
      dimensions: rollMatch[2],
      area: rollMatch[3],
      customRate: rollMatch[4],
    };
  }

  const cutMatch = note.match(/Cut piece ([\w-]+)(?:\s*[•·]\s*([\d.]+\s*ft\s*[xX×]\s*[\d.]+\s*ft))?/);
  if (cutMatch) {
    return {
      type: 'cut-piece',
      reference: cutMatch[1],
      dimensions: cutMatch[2],
    };
  }

  return null;
}
