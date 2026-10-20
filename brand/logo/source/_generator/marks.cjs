// Mark geometry for every concept. All coordinates live on a 512 x 512 tile
// with a 32 px construction grid; the live area for marks is 128..384.
// Each mark is a function of a palette: { fg, acc }.

const P = (n) => Math.round(n * 10) / 10;

// Rhombus (Naskh-style dot) centred on cx, cy with half-diagonal h.
const rhombus = (cx, cy, h) =>
  `M${P(cx)} ${P(cy - h)}L${P(cx + h)} ${P(cy)}L${P(cx)} ${P(cy + h)}L${P(cx - h)} ${P(cy)}Z`;

// Union of grid rectangles in module units -> one path (same winding, nonzero fill).
const rects = (list, m, ox, oy) =>
  list
    .map(([x0, y0, x1, y1]) =>
      `M${ox + x0 * m} ${oy + y0 * m}H${ox + x1 * m}V${oy + y1 * m}H${ox + x0 * m}Z`)
    .join('');

const round = (color, w) =>
  `fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

module.exports = [
  {
    id: '00-original-refined',
    baseline: true,
    name: 'Current mark, refined',
    idea: 'Comparison baseline only: today\'s N-and-dot, redrawn so the N reads the right way.',
    urdu: 'Sirf muqable ke liye: purana nishan, bas saaf aur durust.',
    rationale:
      'This is not a new direction. It is here so the new concepts can be judged against what Nafaa uses today. The current icon draws its diagonal from bottom-left to top-right, so the letter is a mirrored N (it reads as "И"). This version keeps the green tile, the white rounded strokes and the amber dot, fixes the letter and lets the right stem rise slightly. It is cleaner than today\'s mark, but it is still a letter with a dot, which is not distinctive enough to carry a global brand.',
    lockup: 'tile',
    word: 'Nafaa',
    gradient: true,
    mark: ({ fg, acc }) =>
      `<path d="M140 380V222L312 380V188" ${round(fg, 52)}/>` +
      `<circle cx="380" cy="132" r="30" fill="${acc}"/>`,
  },
  {
    id: '01-ascend-n',
    name: 'Ascend N',
    idea: 'A solid geometric N whose right stem climbs higher than the left, so the name itself moves upward.',
    urdu: 'N jo khud upar ki taraf barhta hai: naam bhi, rukh bhi.',
    rationale:
      'One closed shape on a 32 px grid. The left stem is short, the right stem is tall, and both tops are cut on the same rising 1:2 angle, so the N climbs up and to the right as you read it. That is the whole idea: Nafaa means profit, and the letter itself rises. It has no curves and no extra parts, so it stays sharp from a 16 px favicon to a sign on a factory gate, and it embosses, engraves and stitches cleanly. Like Notion\'s N or Stripe\'s S, it is a monogram the brand can own.',
    lockup: 'tile',
    word: 'Nafaa',
    mark: ({ fg }) =>
      `<path d="M128 384V256L192 224L320 304V160L384 128V384H320L192 304V384Z" fill="${fg}"/>`,
  },
  {
    id: '02-noon',
    name: 'Noon',
    idea: 'The letter ن, the first letter of نفع: an open vessel with the dot of gain held above it.',
    urdu: 'نفع ka pehla harf "noon": khula bartan, aur upar uska nafa.',
    rationale:
      'ن is a bowl with one dot above it. Read as a symbol, the bowl is any business, open and ready to receive, and the amber dot is what it gains. The bowl is drawn from two offset circles, so it is heavy at the base and thins towards the tips the way a reed pen draws it, and the left tip is cut on the pen\'s angle. Urdu and Arabic readers see "noon" straight away, and everyone else sees a simple, friendly abstract form. No business app owns this letter yet. It pairs with a lowercase "nafaa", whose n is the same arch turned over.',
    lockup: 'bare',
    word: 'nafaa',
    mark: ({ fg, acc }) =>
      `<path d="M128 214L170.3 190V256A88 88 0 0 0 341.7 256H384A128 128 0 0 1 128 256Z" fill="${fg}"/>` +
      `<path d="${rhombus(260, 182, 40)}" fill="${acc}"/>`,
  },
  {
    id: '03-lift',
    name: 'Lift',
    idea: 'A circle split in two with its right half raised: the whole business, with its gain lifted.',
    urdu: 'Ek poora daira, jiska ek hissa upar uth gaya: yahi nafa hai.',
    rationale:
      'A circle stands for the whole: one business, one system. Split it down the middle and raise the right half, and you have the simplest possible picture of growth, built from two perfect semicircles and nothing else. The step between the halves gives it movement, and the amber half makes the gain visible. It is the most abstract concept here, so it suits a bakery, a garment exporter and a software agency equally well. It is also easy to animate: the right half rises as the app loads.',
    lockup: 'bare',
    word: 'Nafaa',
    mark: ({ fg, acc }) =>
      `<path d="M244 156V412A128 128 0 0 1 244 156Z" fill="${fg}"/>` +
      `<path d="M268 100V356A128 128 0 0 0 268 100Z" fill="${acc}"/>`,
  },
  {
    id: '04-kufic-nafaa',
    name: 'Kufic نفع',
    idea: 'The whole word نفع set in square Kufic on a 9 x 6 module grid, like a firm\'s seal (mohr).',
    urdu: 'Poora lafz نفع, chokor Kufi khat me, jaise kisi firm ki mohar.',
    rationale:
      'Square Kufic is a centuries-old way of writing Arabic script with pure squares. Trading houses, workshops and firms across the region have always stamped their name with a seal, and this mark is that seal made modern. Here ن, ف and ع sit on one baseline built from equal square modules, and the two amber diamonds are the letters\' dots (the nuqte). It has the strongest local identity of the set and looks excellent on invoices, packaging and signage. The trade-off is that at 16 px it becomes a texture rather than a word, so it would need a simpler favicon.',
    lockup: 'tile',
    word: 'Nafaa',
    mark: ({ fg, acc }) => {
      // 9 x 6 modules, read right to left: noon (col 8), fa (cols 4-6), ain (cols 0-2).
      const m = 34, ox = 103, oy = 146;
      const body = rects(
        [
          [0, 5, 9, 6], // baseline
          [8, 3, 9, 5], // noon tooth
          [4, 2, 7, 3], // fa loop, top
          [4, 2, 5, 5], // fa loop, left
          [6, 2, 7, 5], // fa loop, right
          [0, 1, 1, 5], // ain, left arm down to the baseline
          [0, 3, 3, 4], // ain, cup floor
          [2, 2, 3, 4], // ain, right arm
        ],
        m, ox, oy);
      return (
        `<path d="${body}" fill="${fg}"/>` +
        `<path d="${rhombus(ox + 8.5 * m, oy + 2.0 * m, 0.56 * m)}${rhombus(ox + 5.5 * m, oy + 1.0 * m, 0.56 * m)}" fill="${acc}"/>`
      );
    },
  },
  {
    id: '05-exchange',
    name: 'Exchange',
    idea: 'An N made of two identical strokes that reach towards each other: every business is two sides meeting.',
    urdu: 'Do barabar hisse jo beech me milte hain: har karobar len-den hai.',
    rationale:
      'Buyer and seller, supplier and maker, business and customer: every kind of business is two sides meeting. This N is built from two identical hooked strokes, one turned 180 degrees, which run towards each other along the diagonal and stop just short of touching. The small gap in the centre is the moment of exchange. Because the mark is rotationally symmetric, it feels balanced and engineered, and the amber half shows the side that gains. A monogram built this way is unusual, which makes it memorable, and it still reads as N at every size.',
    lockup: 'tile',
    word: 'Nafaa',
    mark: ({ fg, acc }) =>
      `<path d="M160 364V148L232 229" ${round(fg, 56)}/>` +
      `<path d="M352 148V364L280 283" ${round(acc, 56)}/>`,
  },
  {
    id: '06-flow',
    name: 'Flow',
    idea: 'One unbroken line that draws an n, dips, and ends higher than it began: one system, always moving up.',
    urdu: 'Ek hi lakeer: n banati hai, neeche aati hai, aur shuru se zyada upar nikal jati hai.',
    rationale:
      'Nafaa is one system for the whole business: purchasing, stock, production, sales and accounts. This mark is a single continuous stroke that never lifts. It draws the arch of a lowercase n, dips into a curve, and finishes above the point where it started. In one gesture it shows flow (everything connected) and growth (the end is higher than the start). Like Wise\'s flag or Airbnb\'s Bélo, it is a line you could draw from memory with a finger. It works equally well as a solid tile or as a bare line on a dark screen.',
    lockup: 'tile',
    word: 'Nafaa',
    mark: ({ fg }) =>
      `<path d="M148 380V256A54 54 0 0 1 256 256V292A54 54 0 0 0 364 292V132" ${round(fg, 52)}/>`,
  },
];
