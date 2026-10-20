// Round 2 mark geometry. Coordinates live on a 512 x 512 tile; live area 112..400.
// Palette keys: fg (main shape), acc (amber accent on the tile or page),
// inner (colour of shapes drawn on top of fg), accOn (amber drawn on top of fg).
const fontkit = require('/Users/abubakarmalik/Projects/nafaa/node_modules/.pnpm/fontkit@2.0.4/node_modules/fontkit');
const INTER = '/Users/abubakarmalik/Projects/nafaa/node_modules/.pnpm/@fontsource+inter@5.3.0/node_modules/@fontsource/inter/files/';

const P = (n) => Math.round(n * 10) / 10;
const rhombus = (cx, cy, h) =>
  `M${P(cx)} ${P(cy - h)}L${P(cx + h)} ${P(cy)}L${P(cx)} ${P(cy + h)}L${P(cx - h)} ${P(cy)}Z`;
const round = (color, w) =>
  `fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

// The bold noon bowl: two offset circles, cut level at y = 250, left tip on the pen angle.
// Outer circle (256,250) r132, inner circle (256,226) r78.
const NOON_BOWL = 'M124 214L181.8 196V250A78 78 0 0 0 330.2 250H388A132 132 0 0 1 124 250Z';

// Lowercase n from Inter ExtraBold, placed on the tile (x-height 208 px, centred at x = 256).
function interN() {
  const f = fontkit.openSync(`${INTER}inter-latin-800-normal.woff`);
  const g = f.glyphForCodePoint(0x6e);
  const s = 208 / f.xHeight;
  const b = g.bbox;
  const tx = 256 - ((b.minX + b.maxX) / 2) * s;
  const ty = 404;
  const d = g.path.scale(s, -s).translate(tx, ty).toSVG()
    .replace(/-?\d+\.\d+/g, (m) => String(P(+m)));
  return { d, top: ty - f.xHeight * s, left: tx + b.minX * s, right: tx + b.maxX * s };
}

// Scalloped seal: 12 lobes around (256, 256).
function seal(rv, rb, n = 12) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a = ((k + 0.5) * 2 * Math.PI) / n - Math.PI / 2;
    pts.push([256 + rv * Math.cos(a), 256 + rv * Math.sin(a)]);
  }
  let d = `M${P(pts[0][0])} ${P(pts[0][1])}`;
  for (let k = 1; k <= n; k++) {
    const [x, y] = pts[k % n];
    d += `A${rb} ${rb} 0 0 1 ${P(x)} ${P(y)}`;
  }
  return d + 'Z';
}

const N = interN();

module.exports = [
  // ---------- A: Noon developments ----------
  {
    id: 'A1-noon-bold',
    group: 'A',
    name: 'Noon, bold',
    idea: 'The ن you liked, made heavier and simpler, with a much larger amber dot above the bowl.',
    urdu: 'Wohi ن, ab zyada mazboot: bartan aur us me gira hua nafa.',
    rationale:
      'This is the Noon from round 1 with everything unnecessary removed. The bowl is about 30% heavier, so it holds up at 16 px, and the diamond-shaped dot (the nuqta, as a pen draws it) is nearly twice as big, so the amber reads from across a room. The meaning is plain: the bowl is your business and the dot is what it earns. It is calm, friendly and very easy to recognise on a crowded home screen.',
    lockup: 'bare',
    word: 'nafaa',
    mark: ({ fg, acc }) =>
      `<path d="${NOON_BOWL}" fill="${fg}"/>` +
      `<path d="${rhombus(256, 166, 56)}" fill="${acc}"/>`,
  },
  {
    id: 'A2-noon-n',
    group: 'A',
    name: 'n + ن',
    idea: 'One line that writes a Latin n and then an Urdu ن: the same sound in both scripts.',
    urdu: 'Ek hi lakeer: pehle English ka n, phir Urdu ka ن, dono ki awaaz ek.',
    rationale:
      'Global users read the first half as a lowercase n, the first letter of Nafaa. Pakistani users read the second half, the bowl with its dot, as ن, the first letter of نفع. Both letters make the same "n" sound, and one stroke joins them, which shows a brand that speaks both languages. The amber dot keeps the idea of gain from the original Noon.',
    lockup: 'tile',
    word: 'Nafaa',
    mark: ({ fg, acc }) =>
      `<path d="M134 336V226A50 50 0 0 1 234 226V264A72 72 0 0 0 378 264V228" ${round(fg, 48)}/>` +
      `<circle cx="306" cy="208" r="28" fill="${acc}"/>`,
  },
  {
    id: 'A3-noon-smile',
    group: 'A',
    name: 'Noon smile',
    idea: 'The ن bowl drawn as a crescent smile with a dot above it: profit that makes people happy.',
    urdu: 'ن ka piyala ek muskurahat ban gaya: nafa jo khushi deta hai.',
    rationale:
      'The bowl becomes a crescent: thick in the middle and pointed at both tips, like a smile, with the amber dot resting above it. It reads in one second as "happy" and "gain", and Pakistani users will also see the crescent from the national flag. It is the warmest and most consumer-friendly direction. Its one weakness is that the pointed tips thin out at 16 px, although the shape still reads.',
    lockup: 'tile',
    word: 'Nafaa',
    mark: ({ fg, acc }) =>
      `<path d="M131.1 196A128 128 0 1 0 380.9 196A128 128 0 0 1 131.1 196Z" fill="${fg}"/>` +
      `<circle cx="256" cy="196" r="40" fill="${acc}"/>`,
  },
  {
    id: 'A4-noon-seal',
    group: 'A',
    name: 'Noon seal',
    idea: 'The Noon inside a scalloped seal, the shape people already read as "verified".',
    urdu: 'ن ek mohar ke andar: bharosa, tasdeeq shuda.',
    rationale:
      'A scalloped badge is understood everywhere as "verified" or "approved", from social media ticks to quality stamps. Putting the Noon inside it says "a business you can trust, and that grows". The seal also gives the mark a strong outline, so it stands out as an app icon and works well as a sticker, on invoices and on packaging. Inside the seal the bowl is green and the dot is amber.',
    lockup: 'tile',
    word: 'Nafaa',
    mark: ({ fg, inner, accOn }) =>
      `<path d="${seal(134, 40)}" fill="${fg}"/>` +
      `<g transform="translate(256 262) scale(0.6) translate(-256 -256)"><path d="${NOON_BOWL}" fill="${inner}"/><path d="${rhombus(256, 166, 56)}" fill="${accOn}"/></g>`,
  },
  {
    id: 'A5-noon-bilingual',
    group: 'A',
    name: 'Noon, bilingual lockup',
    idea: 'The bold Noon followed by "Nafaa" and نفع, so both audiences read the name at once.',
    urdu: 'Nishan ke saath "Nafaa" aur نفع dono: har koi apni zabaan me parhe.',
    rationale:
      'This direction is about the full logo rather than a new symbol. The bold Noon sits on a green tile, followed by "Nafaa" in Inter and نفع in Noto Nastaliq Urdu, the brand\'s Urdu typeface, divided by a thin rule. Customers in Lahore and in London read the name in their own script, and the symbol ties the two together. On small screens the tile works on its own.',
    lockup: 'tile',
    word: 'Nafaa',
    bilingual: true,
    mark: ({ fg, acc }) =>
      `<path d="${NOON_BOWL}" fill="${fg}"/>` +
      `<path d="${rhombus(256, 166, 56)}" fill="${acc}"/>`,
  },
  // ---------- B: new marks ----------
  {
    id: 'B1-nafa-urdu-word',
    group: 'B',
    name: 'نفع, modern',
    idea: 'The word نفع itself, drawn as a clean modern monoline with two amber dots.',
    urdu: 'Seedha lafz نفع, saaf aur jadeed andaaz me.',
    rationale:
      'There is nothing to explain: anyone who reads Urdu sees the word "profit" straight away. Unlike the round 1 Kufic version, this one is drawn as a single even-weight line with round ends, the way modern Urdu signage and apps are lettered, so it feels friendly and current rather than historic. The two dots, of ن and ف, are amber. To people who do not read Urdu, it is a distinctive, flowing green symbol.',
    lockup: 'tile',
    word: 'Nafaa',
    mark: ({ fg, acc }) =>
      `<g transform="translate(256 256) scale(1.25) translate(-285 -297)">` +
      `<path d="M380 250V284A16 16 0 0 1 364 300H232M251.8 252.2A28 28 0 1 0 232 300A42 42 0 0 0 232 384H284" ${round(fg, 34)}/>` +
      `<circle cx="300" cy="266" r="34" ${round(fg, 34)}/>` +
      `<circle cx="380" cy="212" r="19" fill="${acc}"/><circle cx="300" cy="196" r="19" fill="${acc}"/>` +
      `</g>`,
  },
  {
    id: 'B2-dotted-nafaa',
    group: 'B',
    name: 'Dotted nafaa',
    idea: 'A bold lowercase "nafaa" whose n carries the amber dot of ن; the icon is that dotted n.',
    urdu: '"nafaa" ka n, ن wala nuqta pehne hue.',
    rationale:
      'This is a wordmark-led brand, like Google or FedEx: the name is the logo. The n of "nafaa" wears the amber dot of ن, so the English word quietly carries its Urdu origin and its idea of gain. The app icon is simply that dotted n on green, which is instantly readable as "n for Nafaa". It is the most direct option, with nothing to decode. The horizontal logo is the wordmark on its own, without a separate icon.',
    lockup: 'tile',
    word: 'nafaa',
    dotted: true,
    mark: ({ fg, acc }) =>
      `<path d="${N.d}" fill="${fg}"/>` +
      `<circle cx="256" cy="${P(N.top - 62)}" r="36" fill="${acc}"/>`,
  },
  {
    id: 'B3-noon-arrow',
    group: 'B',
    name: 'Noon rising',
    idea: 'The ن bowl with its dot turned into an amber arrowhead pointing up: business, and its gain rising.',
    urdu: 'ن ka nuqta ab upar jata teer hai: karobar aur uska barhta nafa.',
    rationale:
      'This keeps the Noon that made sense, and makes the gain explicit. The dot above the bowl becomes a rounded amber triangle pointing straight up. A green up-triangle is how every price screen in the world shows "up", so the meaning lands in one second: this business is going up. It is still clearly ن to Urdu readers, because the arrowhead sits exactly where the dot belongs.',
    lockup: 'tile',
    word: 'Nafaa',
    mark: ({ fg, acc }) =>
      `<path d="${NOON_BOWL}" fill="${fg}"/>` +
      `<path d="M256 108L306 192H206Z" fill="${acc}" stroke="${acc}" stroke-width="20" stroke-linejoin="round"/>`,
  },
  {
    id: 'B4-n-up',
    group: 'B',
    name: 'N-Up',
    idea: 'A bold N whose right stem ends in an amber arrowhead: Nafaa, going up.',
    urdu: 'Mota N jiska daayan hissa upar jata teer hai: Nafaa, upar ki taraf.',
    rationale:
      'This is the most literal of the new marks. A heavy, correctly drawn N with its right stem finished in an amber arrowhead. It takes the growth idea from today\'s logo and makes it clean, solid and impossible to misread: one letter and one arrow. It is the strongest option at 16 px and in one colour. The trade-off is that arrow marks are common in finance, so it is less unique than the Noon family.',
    lockup: 'tile',
    word: 'Nafaa',
    mark: ({ fg, acc }) =>
      `<path d="M120 380V180H184L296 288V224H360V380H296L184 272V380Z" fill="${fg}"/>` +
      `<path d="M262 204L328 124L394 204Z" fill="${acc}" stroke="${acc}" stroke-width="8" stroke-linejoin="round"/>`,
  },
];
