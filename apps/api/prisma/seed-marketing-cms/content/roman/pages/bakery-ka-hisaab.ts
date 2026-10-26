/** /bakery-ka-hisaab: "bakery ka hisaab". */

import { features, prose, shot, SHOT, steps, table } from '../../main-pages/_build';
import type { RomanSpec } from '../_roman';

const spec: RomanSpec = {
  slug: 'bakery-ka-hisaab',
  title: 'Bakery ka Hisaab Kaise Rakhein',
  summary:
    'How to keep a bakery\'s accounts, in simple Roman Urdu: working out the real cost of a cake or a dozen rusks from the recipe, taking custom cake orders with an advance, planning the day\'s baking, and measuring waste. Includes a worked cost example, free calculators and how Nafaa tracks each part.',
  seoTitle: 'Bakery ka Hisaab: Recipe Cost, Cake Order aur Waste',
  seoDescription:
    'Bakery ka hisaab kaise rakhein: recipe se cake ki asal Cost, cake order aur advance, rozana baking ka plan aur waste ka hisaab. Free calculator aur Nafaa.',
  focusKeyword: 'bakery ka hisaab',
  hero: {
    eyebrow: 'Bakery aur mithai',
    heading: 'Bakery ka hisaab: har cake ki asal Cost, har order ka advance',
    sub: 'Maida, cheeni, ghee aur anday ki qeemat badalti rehti hai, aur cake ki qeemat wahi rehti hai. Nafaa recipe se har cheez ki taaza Cost nikaalta hai, cake ke order advance ke saath rakhta hai, aur batata hai roz kitna maal zaaya hua.',
    media: { id: SHOT.bakeryCakeOrders, url: 'app.nafaa.pk/bakery/cake-orders' },
  },
  facts: [
    ['Asal Cost', 'Recipe ka har raw maal + packing + gas/bijli ka hissa'],
    ['Cake order', 'Design, wazan, tareekh, advance aur baqi raqam'],
    ['Waste', 'Roz ka bacha aur zaaya maal likhein, warna Profit andaza hi rehta hai'],
    ['Free madad', '[Food cost calculator](/tools/food-cost-calculator) aur [profit margin calculator](/tools/profit-margin-calculator)'],
  ],
  romanLine: 'Bakery ka Profit recipe ki Cost aur waste me chhupa hota hai. Nafaa recipe se taaza Cost aur roz ka waste dono dikhata hai.',
  body: [
    prose(`## Bakery ka hisaab baqi dukaanon se alag kyun?

Kiryana wala maal khareed kar bechta hai; bakery maal bana kar bechti hai. Is liye yahan Cost seedhi nahi milti. Ek pound cake me maida, cheeni, anday, makhan, essence, box aur oven ki gas sab lagte hain. Jab inme se kisi ki qeemat barhti hai, cake ki Cost barh jati hai, lekin counter par qeemat wahi rehti hai. Kuch mahine baad Sale wahi hai aur Profit gayab.

Doosra masla waste hai. Bread, bun aur pastry ki umar ek do din hai. Jo shaam tak na bika woh ya to sasta jata hai ya phenkna padta hai. Agar ye roz likha na jaye to pata hi nahi chalta ke kaun si cheez zyada ban rahi hai.

Teesra, custom cake ke order. Design, wazan, likhai, tareekh, advance aur delivery: ek parchi gum hui to customer bhi gaya aur advance ka hisaab bhi.`),
    table('Misaal: ek cake ki Cost kaise nikaalein', 'Ye sirf tareeqa samjhane ke liye misaal hai. Apni qeematein daal kar hisaab karein.', [
      { key: 'qty', label: 'Kitna laga' },
      { key: 'cost', label: 'Cost (rupay)' },
    ], [
      ['Maida', '500 gram', '90'],
      ['Cheeni', '400 gram', '80'],
      ['Anday', '6', '180'],
      ['Makhan ya ghee', '250 gram', '250'],
      ['Cream, essence, rang', 'Andazan', '120'],
      ['Box aur packing', '1', '60'],
      ['Gas/bijli ka hissa', 'Andazan', '40'],
      ['Kul Cost', 'Sab mila kar', '820'],
    ]),
    prose(`Agar ye cake 1,400 rupay me bikta hai to Profit 580 rupay hai, aur margin lagbhag 41%. Ab agar makhan aur anday 20% mehnge ho jayein to Cost lagbhag 906 ho jati hai aur margin 35% reh jata hai. Isi liye har mahine Cost dobara nikaalni chahiye. Ye hisaab free [food cost calculator](/tools/food-cost-calculator) me khud ho jata hai, aur qeemat ka margin [profit margin calculator](/tools/profit-margin-calculator) se.`),
    steps('Bakery ka rozana hisaab', [
      ['Subah: aaj kya banana hai', 'Pichhle dinon ki bikri dekh kar har cheez ki tadaad tay karein, aur aaj ke cake order dekhein.'],
      ['Raw maal nikalein', 'Jo maida, cheeni aur ghee istemal hua, Stock se kam karein.'],
      ['Din bhar bikri', 'Har cheez bill se bike, taake pata ho kya kitna bika.'],
      ['Shaam: bacha aur zaaya', 'Jo bacha aur jo phenka, dono likhein. Kal ki tadaad isi se badlein.'],
    ], undefined, true),
    features('Nafaa bakery ke liye kya karta hai', [
      ['cake-slice', 'Cake orders', 'Design, wazan, likhai, tareekh, advance aur delivery, ek jagah.'],
      ['calendar-check', 'Baking ka plan', 'Aaj kya aur kitna banana hai, pichhli bikri dekh kar.'],
      ['wheat', 'Raw maal ki Cost', 'Maida, cheeni, ghee jaisa raw maal Cost ke saath Stock me.'],
      ['calculator', 'Recipe ki taaza Cost', 'Raw maal ki qeemat badle to recipe ki Cost khud badle.'],
      ['hourglass', 'Freshness aur waste', 'Kya kab bana, kya purana ho raha hai, aur kitna zaaya hua.'],
      ['users', 'Shaadi aur event ke order', 'Bare order alag, advance aur tayyari ke saath.'],
    ]),
    shot({
      heading: 'Recipe ki Cost aur asal Profit saath saath',
      body: 'Nafaa ki Profit report har product ka Profit aur margin dikhati hai, recipe ki Cost ke saath, aur Expense ke baad asal Profit. Pata chalta hai ke kaun sa item mehnat ke qabil hai.',
      id: SHOT.bakeryProfit,
      url: 'app.nafaa.pk/reports/profit',
      layout: 'full',
      callouts: [
        { x: 45, y: 20, label: 'Expense ke baad Profit' },
        { x: 74.5, y: 48.3, label: 'Recipe Cost aur asal Profit' },
        { x: 84.5, y: 59, label: 'Har item ka margin' },
      ],
    }),
    shot({
      heading: 'Advance aur udhaar ka khata',
      body: 'Cake ka advance customer ke khate me jama rehta hai, aur order dete waqt baqi raqam wahi se. Dukaanon aur daftaron ka mahana udhaar bhi isi khate me, WhatsApp reminder ke saath.',
      id: SHOT.bakeryKhata,
      url: 'app.nafaa.pk/khata',
      layout: 'split-left',
      callouts: [
        { x: 25, y: 19.5, label: 'Kul baqi' },
        { x: 72.5, y: 20, label: 'Customers ke advance' },
        { x: 89.5, y: 55.5, label: 'Payment ya reminder' },
      ],
    }),
    prose(`## Aage parhein

Bakery kholne ka poora tareeqa English me [how to start a bakery in Pakistan](/blog/how-to-start-a-bakery-pakistan) me hai, aur waste kam karne ke tareeqe [reduce bakery wastage](/blog/reduce-bakery-wastage) me. Nafaa bakery aur mithai ki dukaan ke liye kya kya karta hai, poori tafseel [bakery software](/industries/bakery) par.

Dukaan ka kul Profit nikaalne ka tareeqa [dukaan ka munafa kaise nikalein](/dukaan-ka-munafa-kaise-nikalein) par hai, aur agar aap ke paas baithne ki jagah aur kitchen bhi hai to [restaurant billing software](/restaurant-billing-software) dekhein.`),
  ],
  faqs: [
    ['Bakery ka hisaab rakhne ke liye kaun si app achhi hai?', 'Woh jo sirf bill na banaye, balke recipe se Cost nikaale, cake orders advance ke saath rakhe aur waste ka hisaab rakhe. Nafaa ye sab karta hai, saath me counter, Stock aur khata. 7 din Free Trial me apne top items ki recipe daal kar dekhein.'],
    ['Cake ki qeemat kaise tay karein?', 'Pehle recipe ki poori Cost nikaalein: har raw maal, packing aur gas ka hissa. Phir jitna margin chahiye woh jorein, aur bazaar ki qeemat se milayein. Raw maal mehnga ho to Cost dobara nikaalein. Nafaa me raw maal ki qeemat badalte hi recipe ki Cost khud badal jati hai.'],
    ['Bakery me waste kaise kam karein?', 'Roz likhein ke kya bacha aur kya phenka. Do hafte me pata chal jata hai ke kaun si cheez zyada ban rahi hai. Phir usi hisaab se kal ki tadaad kam karein. Nafaa ka freshness wala hissa batata hai ke kya purana ho raha hai, taake pehle wahi bike.'],
    ['Cake ke order aur advance ka hisaab kaise rakhein?', 'Har order par design, wazan, likhai, tareekh, advance aur baqi raqam likhein. Nafaa me cake order ek form me banta hai, advance customer ke khate me jama hota hai, aur delivery par baqi raqam usi order se li jati hai. Koi parchi gum nahi hoti.'],
    ['Mithai ki dukaan ke liye bhi ye theek hai?', 'Ji haan. Mithai kilo ke hisaab se bikti hai, aur Nafaa me kilo aur gram ki unit hoti hai. Shaadi aur event ke bare order advance ke saath alag rakhe jate hain, aur raw maal ki Cost se har mithai ka Profit nikalta hai.'],
  ],
  cta: { heading: 'Har item ki asal Cost, is hafte', body: 'Apne paanch sab se zyada bikne wale items ki recipe daalein aur un ka asal Profit dekhein.' },
  relations: [
    { ref: 'INDUSTRY:bakery', kind: 'TAG' },
    { ref: 'BLOG_POST:how-to-start-a-bakery-pakistan', kind: 'RELATED' },
    { ref: 'BLOG_POST:reduce-bakery-wastage', kind: 'RELATED' },
    { ref: 'TOOL:food-cost-calculator', kind: 'RELATED' },
    { ref: 'TOOL:profit-margin-calculator', kind: 'RELATED' },
    { ref: 'PRODUCT:reports', kind: 'RELATED' },
    { ref: 'PAGE:restaurant-billing-software', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/industries/bakery/BakeryPack.tsx',
    'apps/web/src/industries/bakery/pages/CakeCustomizerPage.tsx',
    'apps/web/src/industries/bakery/pages/ProductionPage.tsx',
    'apps/web/src/industries/bakery/components/production/SuggestPanel.tsx',
    'apps/web/src/industries/bakery/pages/IngredientsPage.tsx',
    'apps/web/src/industries/bakery/pages/FreshnessPage.tsx',
    'apps/web/src/industries/bakery/products/BakeryRawMaterials.tsx',
    'apps/web/src/industries/bakery/components/bulk/BulkViews.tsx',
    'apps/web/src/modules/pos/lib/posUnits.ts',
  ],
  sortOrder: 11,
};

export default spec;
