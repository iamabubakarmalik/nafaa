import { parseCarpetNote } from '../utils/parseCarpetNote';

/**
 * Extra WhatsApp lines contributed by the Carpet pack.
 * Adds a section listing every roll / cut piece referenced by the
 * sale so the customer receives a clear paper trail.
 */
export function carpetWhatsappLines(sale: any): string[] {
  const items = Array.isArray(sale?.items) ? sale.items : [];
  const carpetLines: string[] = [];

  for (const it of items) {
    const info = parseCarpetNote(it?.note);
    if (!info) continue;

    if (info.type === 'roll') {
      carpetLines.push(`   🧶 Roll: \`${info.reference}\``);
      if (info.dimensions) carpetLines.push(`   📐 ${info.dimensions}`);
      if (info.area) carpetLines.push(`   📏 Total: ${info.area}`);
      if (info.customRate) carpetLines.push(`   💰 ${info.customRate}`);
    } else {
      carpetLines.push(`   ✂️ Piece: \`${info.reference}\``);
      if (info.dimensions) carpetLines.push(`   📐 ${info.dimensions}`);
    }
  }

  if (carpetLines.length === 0) return [];

  return [
    '',
    '┌─────────────────────────┐',
    '│   🧶 *CARPET DETAILS*   │',
    '└─────────────────────────┘',
    ...carpetLines,
  ];
}
