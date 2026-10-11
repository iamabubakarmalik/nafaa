/**
 * Matching spoken words to product names.
 *
 * Speech recognition in Urdu returns Urdu script ("چینی"), product names are
 * usually Roman or English ("Cheeni / Sugar"). Both are reduced to a
 * consonant skeleton after transliteration: چینی → chini → "chn", Cheeni →
 * "chn". Vowels are where Roman spellings disagree (doodh/dudh/dodh), so
 * dropping them makes the match robust.
 */

const URDU_TO_ROMAN: Record<string, string> = {
  'ا': 'a', 'آ': 'aa', 'أ': 'a', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ٹ': 't', 'ث': 's', 'ج': 'j', 'چ': 'ch', 'ح': 'h', 'خ': 'kh',
  'د': 'd', 'ڈ': 'd', 'ذ': 'z', 'ر': 'r', 'ڑ': 'r', 'ز': 'z', 'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'z', 'ط': 't',
  'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ک': 'k', 'ك': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ں': 'n',
  'و': 'o', 'ہ': 'h', 'ه': 'h', 'ھ': 'h', 'ۃ': 'h', 'ء': '', 'ی': 'i', 'ي': 'i', 'ے': 'e', 'ئ': 'i', 'ۓ': 'e', 'ؤ': 'o',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

/** Urdu script → rough Roman; Latin text passes through lowercased. */
export function transliterate(text: string): string {
  let out = '';
  for (const ch of text) out += URDU_TO_ROMAN[ch] ?? ch;
  return out.toLowerCase().normalize('NFKD').replace(/[̀-ًͯ-ٟ]/g, '');
}

/** Consonant skeleton of one word: "cheeni" → "chn", "anday" → "nd". */
export function skeleton(word: string): string {
  const w = transliterate(word).replace(/[^a-z0-9]/g, '')
    .replace(/kh/g, 'K').replace(/gh/g, 'G').replace(/sh/g, 'S').replace(/ch/g, 'C')
    .replace(/dh/g, 'D').replace(/th/g, 'T').replace(/bh/g, 'B').replace(/ph/g, 'F').replace(/jh/g, 'J')
    .replace(/ck/g, 'k').replace(/c/g, 'k').replace(/q/g, 'k').replace(/z/g, 'j').replace(/w/g, 'v').replace(/[aeiouy]/g, '').replace(/h(?=[^aeiou]|$)/g, '')
    .replace(/(.)\1+/g, '$1');
  return w || transliterate(word).slice(0, 2);
}

/** Words of a name or phrase, transliterated, without filler. */
export function words(text: string): string[] {
  return transliterate(text).split(/[^a-z0-9]+/).filter((w) => w.length > 1);
}

/**
 * How well a spoken phrase matches a product name (0 = no match).
 * Exact and prefix matches score highest, then words whose skeletons agree.
 */
export function matchScore(spoken: string, name: string, extra = ''): number {
  const q = transliterate(spoken).trim();
  const n = transliterate(name);
  if (!q) return 0;
  let score = n === q ? 100 : n.startsWith(q) ? 60 : n.includes(q) ? 45 : 0;
  const qWords = words(spoken);
  const nWords = words(`${name} ${extra}`);
  const nSkel = nWords.map(skeleton);
  for (const w of qWords) {
    if (nWords.includes(w)) score += 20;
    else if (nWords.some((x) => x.startsWith(w) || w.startsWith(x))) score += 12;
    else if (nSkel.includes(skeleton(w))) score += 14;
  }
  return score;
}
