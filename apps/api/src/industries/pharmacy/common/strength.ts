/**
 * Medicine strength and salt names in one comparable form, so "1g", "1 gm"
 * and "1000mg" are the same strength and "ceftriaxone" matches "Ceftriaxone".
 */

const MASS = /^(\d+(?:\.\d+)?)(mg|milligrams?|g|gm|gms|grams?|mcg|µg|ug|micrograms?)(?![a-z])(.*)$/;

/** Milligrams per unit of each mass spelling. */
function mgFactor(unit: string): number {
  if (unit.startsWith('mg') || unit.startsWith('milli')) return 1;
  if (unit === 'mcg' || unit === 'µg' || unit === 'ug' || unit.startsWith('micro')) return 0.001;
  return 1000;
}

const trimNumber = (n: number) => String(Math.round(n * 10_000) / 10_000);

/**
 * Parsed strength: the numeric value in mg when the strength starts with a
 * mass ("1g/5ml" gives 1000 mg and the rest "/5ml"), else the first number
 * with its unit as written ("40IU" gives 40 and "iu").
 */
export function parseStrength(raw: string | null | undefined): { value: number | null; unit: string | null; rest: string } {
  const s = (raw ?? '').toLowerCase().replace(/\s+/g, '');
  const mass = MASS.exec(s);
  if (mass) return { value: Number(mass[1]) * mgFactor(mass[2]), unit: 'mg', rest: mass[3] };
  const other = /^(\d+(?:\.\d+)?)([a-z%]*)(.*)$/.exec(s);
  if (other) return { value: Number(other[1]), unit: other[2] || null, rest: other[3] };
  return { value: null, unit: null, rest: s };
}

/** One comparable spelling of a strength: "1 Gm" and "1000MG" both give "1000mg". */
export function normStrength(raw: string | null | undefined): string {
  const p = parseStrength(raw);
  if (p.value == null) return p.rest;
  return `${trimNumber(p.value)}${p.unit ?? ''}${p.rest}`;
}

/** Salt names compare without case or extra spaces. */
export const normSaltName = (name: string | null | undefined) => (name ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Some registers write the strength inside the salt name ("Azithromycin
 * 500mgUSP", "Azithromycin 200") with no strength of its own. Move it out and
 * drop pharmacopoeia tags, so those rows group with the clean ones. A bare
 * number is read as mg.
 */
function splitNameStrength(s: { name: string; strength?: string | null }): { name: string; strength?: string | null } {
  const name = (s.name ?? '').replace(/\b(usp|bp|ph\.?\s*eur\.?)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  if (s.strength && String(s.strength).trim()) return { name, strength: s.strength };
  const m = /^(.*?[a-z)])\s+(\d+(?:\.\d+)?)\s*(mg|mcg|g|gm|ml|iu|%)?[a-z]*$/i.exec(name);
  if (!m) return { name, strength: s.strength };
  return { name: m[1], strength: `${m[2]}${m[3] ?? 'mg'}` };
}

/** One key for a set of salts with strengths; medicines with the same key are substitutes. */
export function formulaKey(salts: Array<{ name: string; strength?: string | null }>): string | null {
  const parts = salts
    .map(splitNameStrength)
    .filter((s) => normSaltName(s.name))
    .map((s) => `${normSaltName(s.name)}@${normStrength(s.strength)}`)
    .sort();
  return parts.length ? parts.join('+') : null;
}

/** Formula key from a generic label such as "Paracetamol 500mg + Caffeine 65mg". */
export function formulaKeyFromLabel(label: string): string | null {
  const salts = label.split('+').map((part) => {
    const m = /^(.*?)\s+(\d[\w./%-]*)$/.exec(part.trim());
    return m ? { name: m[1], strength: m[2] } : { name: part.trim(), strength: null };
  });
  return formulaKey(salts);
}
