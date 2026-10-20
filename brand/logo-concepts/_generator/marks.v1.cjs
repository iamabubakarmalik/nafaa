// Mark geometry for every concept. All coordinates live on a 512 x 512 tile
// with a 32 px construction grid; the live area for marks is 128..384.
// Each mark is a function of a palette: { fg, acc, ghost }, where ghost is the opacity of
// unused grid positions (null in one-colour versions).

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

module.exports = [
  {
    id: '00-original-refined',
    name: 'Original, refined',
    idea: 'The current N-and-dot mark, redrawn so the N reads the right way and the growth lives in the rising right stem.',
    urdu: 'Wohi purana nishan, bas saaf aur durust: N ab seedha parhta hai aur daayan dandaa upar uthta hai.',
    rationale:
      'The current icon draws its diagonal from bottom-left to top-right, so the letter is a mirrored N (it reads as "И"). This version keeps everything people already know: the green tile, the white rounded strokes and the amber dot. It fixes the letter and moves the growth idea into the right stem, which now rises above the left one, with the amber dot just above and to the right of it as the next step up. The stroke weight now matches the tile size, and the cramped arrowhead is gone.',
    lockup: 'tile',
    word: 'Nafaa',
    gradient: true,
    mark: ({ fg, acc }) =>
      `<path d="M140 380V222L312 380V188" fill="none" stroke="${fg}" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<circle cx="380" cy="132" r="30" fill="${acc}"/>`,
  },
  {
    id: '01-ascend-n',
    name: 'Ascend N',
    idea: 'A solid geometric N whose stems step up like a bar chart, with tops cut on the same rising angle.',
    urdu: 'N jo khud ek chart hai: har danda pichle se ooncha.',
    rationale:
      'One closed shape on a 32 px grid. The left stem is short, the right stem is tall, and both tops are cut on the same 1:2 rising slope, so the letter reads as N and as a two-bar growth chart at the same time. It has no curves or extra parts, so it holds up from a 16 px favicon to a shop sign. This is the most "product-grade" direction, close in spirit to Linear or Stripe.',
    lockup: 'tile',
    word: 'Nafaa',
    mark: ({ fg }) =>
      `<path d="M128 384V256L192 224L320 304V160L384 128V384H320L192 304V384Z" fill="${fg}"/>`,
  },
  {
    id: '02-noon',
    name: 'Noon',
    idea: 'The Urdu letter ن (the first letter of نفع): a bowl catching a coin.',
    urdu: 'نفع ka pehla harf "noon": ek piyala jis me sikka gir raha hai.',
    rationale:
      'ن is a bowl with a dot above it. In this mark the bowl is the shop counter or galla (the cash box), and the amber dot is the coin falling into it. The bowl is drawn from two offset circles, so it is thicker at the bottom and thins towards the tips, the way a calligrapher\'s pen draws it. Urdu readers see "noon" straight away, and everyone else sees a simple, friendly vessel-and-coin. It is rooted in Pakistan but works anywhere, and it pairs with a lowercase "nafaa" whose n mirrors the bowl.',
    lockup: 'bare',
    word: 'nafaa',
    mark: ({ fg, acc }) =>
      `<path d="M128 214L170.3 190V256A88 88 0 0 0 341.7 256H384A128 128 0 0 1 128 256Z" fill="${fg}"/>` +
      `<path d="${rhombus(260, 182, 40)}" fill="${acc}"/>`,
  },
  {
    id: '03-split-coin',
    name: 'Split coin',
    idea: 'A coin cut along the N diagonal; the upper half lifts, which is the profit.',
    urdu: 'Ek sikka, jiska upar wala hissa upar uth gaya: yahi nafa hai.',
    rationale:
      'A circle (the coin, the rupee) is cut along the same diagonal as an N, and the upper half has lifted. The cut shows the gain, and the step it makes is the growth. The two halves are perfect semicircles, so the mark is very fast to draw and to recognise, in the way Revolut or Wise marks are. It is abstract enough to grow beyond retail into any business while still saying "money that grows".',
    lockup: 'bare',
    word: 'Nafaa',
    mark: ({ fg, acc }) =>
      `<path d="M244 156V412A128 128 0 0 1 244 156Z" fill="${fg}"/>` +
      `<path d="M268 100V356A128 128 0 0 0 268 100Z" fill="${acc}"/>`,
  },
  {
    id: '04-kufic-nafaa',
    name: 'Kufic نفع',
    idea: 'The word نفع set in square Kufic on a 9 x 6 module grid, like a shop\'s mohr (seal).',
    urdu: 'Poora lafz نفع, chokor Kufi khat me, jaise dukaan ki mohar.',
    rationale:
      'Square Kufic is a centuries-old way of writing Arabic script with pure squares, and it is what gives tile work on mosques and old shopfronts its look. Here ن, ف and ع sit on one baseline built from equal square modules, and the two amber diamonds are the letters\' dots (the nuqte). It has the strongest local identity of all the concepts and looks like a seal or stamp, which suits receipts and printed bills. The trade-off is that at 16 px it becomes a texture rather than a word, so it needs a simpler favicon companion.',
    lockup: 'tile',
    word: 'Nafaa',
    mark: ({ fg, acc }) => {
      // 9 x 6 modules, read right to left: noon (cols 8-9), fa (4-7), ain (0-3).
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
    id: '05-dukaan',
    name: 'Dukaan',
    idea: 'A shop awning over three rising bars: your shop, growing.',
    urdu: 'Dukaan ka shamiana, neeche barhti hui bikri.',
    rationale:
      'The scalloped awning is the most recognisable sign of a shop anywhere in Pakistan, from a kiryana store to a pharmacy. Under it, three bars rise and the tallest one is amber, so the picture reads as "my shop, and it is growing". It is the most literal concept and the easiest to explain to a first-time shopkeeper. The downside is that it ties the brand to retail, while Nafaa\'s ambition is wider than that.',
    lockup: 'tile',
    word: 'Nafaa',
    mark: ({ fg, acc }) =>
      `<path d="M128 156Q128 136 148 136H364Q384 136 384 156V184A32 32 0 0 1 320 184A32 32 0 0 1 256 184A32 32 0 0 1 192 184A32 32 0 0 1 128 184Z" fill="${fg}"/>` +
      `<rect x="144" y="312" width="56" height="64" rx="8" fill="${fg}"/>` +
      `<rect x="228" y="276" width="56" height="100" rx="8" fill="${fg}"/>` +
      `<rect x="312" y="240" width="56" height="136" rx="8" fill="${acc}"/>`,
  },
  {
    id: '06-sikkay',
    name: 'Sikkay',
    idea: 'Three coins, seen side-on, stacked so that each one steps up and to the right.',
    urdu: 'Teen sikkay, har ek pichle se aage aur upar: hisaab bhi, barhat bhi.',
    rationale:
      'Three stadium shapes stand for coins seen from the side, and also for rows in a ledger (the khata). Each coin steps up and to the right, so the stack reads as a staircase of growth, and the top coin is amber because it is the profit. It is quiet and confident, has nothing to decode, and its strong horizontal rhythm sits well beside a wordmark. It can be animated easily, with the coins landing one by one.',
    lockup: 'tile',
    word: 'Nafaa',
    mark: ({ fg, acc }) =>
      `<rect x="104" y="300" width="208" height="56" rx="28" fill="${fg}"/>` +
      `<rect x="152" y="228" width="208" height="56" rx="28" fill="${fg}"/>` +
      `<rect x="200" y="156" width="208" height="56" rx="28" fill="${acc}"/>`,
  },
  {
    id: '07-dot-matrix-n',
    name: 'Dot-matrix N',
    idea: 'An N drawn as a receipt printer draws it, on a 4 x 4 grid of dots; one dot is amber.',
    urdu: 'Receipt printer ke dots se bana N: har bill par Nafaa.',
    rationale:
      'Every Nafaa sale ends in a printed receipt, and thermal printers draw letters out of dots. This N is set on a precise 4 x 4 dot grid. The ten dots that form the letter are solid, and the six unused positions stay faint so the grid can be felt. The top-right dot is amber: the last point of the climb. It looks technical and precise like a product, it animates naturally (dots lighting up), and the grid idea extends into patterns and loaders for the app.',
    lockup: 'tile',
    word: 'Nafaa',
    mark: ({ fg, acc, ghost }) => {
      const pos = [160, 224, 288, 352];
      const on = new Set(['0,0', '0,1', '0,2', '0,3', '3,0', '3,1', '3,2', '3,3', '1,1', '2,2']);
      let solid = '', faint = '';
      for (let c = 0; c < 4; c++)
        for (let r = 0; r < 4; r++) {
          if (c === 3 && r === 0) continue;
          const d = `M${pos[c] - 26} ${pos[r]}a26 26 0 1 0 52 0a26 26 0 1 0 -52 0Z`;
          if (on.has(`${c},${r}`)) solid += d; else faint += d;
        }
      return (
        (ghost ? `<path d="${faint}" fill="${fg}" fill-opacity="${ghost}"/>` : '') +
        `<path d="${solid}" fill="${fg}"/>` +
        `<circle cx="352" cy="160" r="26" fill="${acc}"/>`
      );
    },
  },
];
