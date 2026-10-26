/** /kiryana-store-software: "kiryana store ka software". */

import { features, prose, shot, SHOT, steps, table } from '../../main-pages/_build';
import type { RomanSpec } from '../_roman';

const spec: RomanSpec = {
  slug: 'kiryana-store-software',
  title: 'Kiryana Store ka Software',
  summary:
    'What a kiryana or general store in Pakistan needs from software, in simple Roman Urdu: fast billing for packed and loose goods, sale by piece, dozen, carton or kilo, monthly udhaar accounts, low-stock reorders and billing through load-shedding. Includes a setup plan, a hardware list and free templates.',
  seoTitle: 'Kiryana Store ka Software: Billing, Udhaar aur Stock',
  seoDescription:
    'Kiryana store ka software kaise chunein: barcode billing, darjan-carton-kilo, mahana udhaar, kam Stock ka alert aur offline bill. Setup plan aur free templates.',
  focusKeyword: 'kiryana store ka software',
  hero: {
    eyebrow: 'Kiryana aur general store',
    heading: 'Kiryana store ka software: rush me tez bill, mahine ka udhaar saaf',
    sub: 'Barcode wala saman scan karein, khula saman quick key se, aur cheeni kilo me ya sabun carton me becho. Udhaar customer ke khate me, kam Stock ki list order ke liye tayyar, aur bijli jaye to bhi bill bante rahein.',
    media: { id: SHOT.pos, url: 'app.nafaa.pk/pos' },
  },
  facts: [
    ['Sab se zaroori', 'Tez bill, udhaar ka khata, Stock ka hisaab, aur internet ke baghair chalna'],
    ['Units', 'Piece, darjan, carton, kilo ya gram, har unit ki apni qeemat aur barcode'],
    ['Setup', 'Products Excel se, ya [product import template](/templates/product-import-template) bhar kar'],
    ['Saman', 'Phone ya computer kaafi; barcode scanner aur thermal printer marzi se'],
    ['Qeemat', '7 din Free Trial, phir {{price:min.monthly}} mahana se'],
  ],
  romanLine: 'Kiryana ka software rush me tez ho, udhaar sambhale aur bijli jane par na ruke. Nafaa ye teeno karta hai.',
  body: [
    prose(`## Kiryana store ko software se kya chahiye?

Kiryana store ka din alag hota hai. Subah doodh aur double roti, dopahar me bachon ki toffee, shaam ko mahine ka saudaa, aur beech me supplier ki gaari. Is liye software bhi aisa chahiye jo is din ke saath chale:

- **Tez bill.** Shaam ke rush me ek bill par aadha minute bhi zyada lage to line lag jati hai. Barcode scan ya ek tap se cheez bill me aaye.
- **Har unit me bechna.** Sabun piece me bhi aur carton me bhi, cheeni kilo me, anday darjan me. Har unit ki apni qeemat ho, aur carton bike to Stock piece ke hisaab se sahi kam ho.
- **Mahana udhaar.** Mohalle ke ghar mahine ke aakhir me dete hain. Udhaar bill se seedha khate me jaye.
- **Kam Stock ka pata.** Atta, ghee aur cheeni khatam hon to customer doosri dukaan chala jata hai.
- **Bijli aur internet ke baghair.** Load-shedding me counter band nahi ho sakta.

Agar koi software in paanch me se ek bhi kaam nahi karta, to kuch hafton baad aap wapas register par honge.`),
    shot({
      heading: 'Kiryana ka counter, Nafaa me',
      body: 'Categories jaise Atta, Rice aur Daal, har cheez ke saath bacha hua Stock, aur aakhir me cash, JazzCash, Easypaisa ya udhaar. Barcode wali cheez scan karein, khuli cheez quick key ya search se.',
      id: SHOT.pos,
      url: 'app.nafaa.pk/pos',
      layout: 'full',
      callouts: [
        { x: 40, y: 26, label: 'Atta, Rice, Daal jaisi categories' },
        { x: 30, y: 47, label: 'Har cheez ka bacha Stock' },
        { x: 85, y: 93, label: 'Cash, JazzCash, Easypaisa ya udhaar' },
      ],
    }),
    steps('Kiryana store par software lagane ka plan', [
      ['Pehle 100 cheezein', 'Sab se zyada bikne wali 100 cheezein daalein, qeemat aur Cost ke saath. Baqi saman aahista aahista, jab bike.'],
      ['Excel se list', 'Distributor ki price list ya apni list [product import template](/templates/product-import-template) me bhar kar ek dafa me upload karein.'],
      ['Khuli cheezon ke quick keys', 'Cheeni, daal, chawal jaisi khuli cheezon ke button bana lein, taake search na karna pade.'],
      ['Udhaar wale customer', 'Har udhaar wale ghar ka naam, number aur aaj ka balance "Purana khata" me daalein.'],
      ['Ek hafta saath saath', 'Pehla hafta register bhi rakhein. Hafte baad dono milayein, phir register band.'],
    ], undefined, true),
    features('Nafaa kiryana ke liye kya karta hai', [
      ['scan-barcode', 'Barcode aur quick keys', 'Packed saman scan, khula saman ek tap se. Barcode na ho to label bhi print ho jata hai.'],
      ['package', 'Piece, darjan, carton, kilo', 'Har unit ki apni qeemat aur barcode; Stock ek hi base unit me sahi rehta hai.'],
      ['notebook-pen', 'Mahana khata', 'Udhaar bill se khate me, credit limit, aur WhatsApp par yaad-dihani.'],
      ['triangle-alert', 'Kam Stock ki list', 'Kitne din ka Stock bacha, kitna mangwana hai, aur supplier ko WhatsApp.'],
      ['wifi-off', 'Offline bill', 'Internet jaye to bill device par save, wapas aaye to khud sync.'],
      ['file-spreadsheet', 'Excel import', 'Poori list Excel ya copy-paste se, save se pehle har line check.'],
    ]),
    shot({
      heading: 'Kya khatam hone wala hai, aur kitna mangwana hai',
      body: 'Kam Stock ki list batati hai ke har cheez kitne din aur chalegi, kitna order karna chahiye, aur supplier ko seedha order ya WhatsApp bhej sakte hain.',
      id: SHOT.lowStock,
      url: 'app.nafaa.pk/low-stock',
      layout: 'split-left',
      callouts: [
        { x: 59, y: 63, label: 'Kitne din ka Stock' },
        { x: 70, y: 60, label: 'Kitna mangwayein' },
        { x: 93, y: 61, label: 'Supplier ko order ya WhatsApp' },
      ],
    }),
    table('Kiryana ke liye kya saman chahiye?', 'Shuru sirf phone se ho sakta hai. Baqi saman tab lein jab zaroorat ho.', [
      { key: 'need', label: 'Zaroori?' },
      { key: 'why', label: 'Kyun' },
    ], [
      ['Phone, tablet ya computer', 'Haan', 'Nafaa browser me chalta hai; Windows ke liye desktop app bhi hai'],
      ['Barcode scanner', 'Faidemand', 'Packed saman ka bill bohat tez hota hai'],
      ['Thermal printer (58 ya 80 mm)', 'Marzi', 'Printed parchi; warna bill WhatsApp par bhi ja sakta hai'],
      ['Cash drawer', 'Marzi', 'Galla band rehta hai aur sirf bill par khulta hai'],
    ]),
    prose(`## Free madad aur aage parhein

Kiryana kholne ka poora tareeqa English me [how to start a kiryana store in Pakistan](/blog/how-to-start-kiryana-store-pakistan) par hai, aur software ka muqabla [best POS for kiryana](/blog/best-pos-kiryana-2026) par. Barcode lagana chahiye ya nahi, ye [barcode vs no barcode](/blog/barcode-vs-no-barcode-store) batata hai, aur barcode labels free me [barcode generator](/tools/barcode-generator) se ban jate hain. Kaun sa printer aur scanner lein, [POS hardware kit guide](/blog/pos-hardware-kit-guide) me hai.

Nafaa kiryana ke liye kya kya karta hai, poori tafseel [kiryana industry page](/industries/kiryana) par. Udhaar ke usool [udhaar likhne wali app](/udhaar-likhne-wali-app) par, aur asal Profit nikaalne ka tareeqa [dukaan ka munafa kaise nikalein](/dukaan-ka-munafa-kaise-nikalein) par.`),
  ],
  faqs: [
    ['Kiryana store ke liye sab se achha software kaun sa hai?', 'Jo aap ki dukaan ke din ke saath chale: rush me tez bill, piece se carton aur kilo tak bechna, mahana udhaar, kam Stock ki list, aur bijli jane par bhi bill. Nafaa ye sab karta hai. Faisla karne se pehle 7 din Free Trial me apni dukaan par chala kar dekhein.'],
    ['Kiryana me hazaron cheezein hain, sab kaise daalein?', 'Sab ek din me daalne ki zaroorat nahi. Sab se zyada bikne wali 100 cheezon se shuru karein, baqi jab bikein tab daalein. Poori list Excel me ho to ek dafa me import ho jati hai, aur distributor ki price list bhi template me bhar kar daal sakte hain.'],
    ['Khula saman, jaise cheeni aur daal, software me kaise bechein?', 'Khuli cheez ko kilo ya gram ki unit me rakhein aur quick key bana lein. Counter par button dabayein, wazan likhein, aur qeemat khud ban jati hai. Isi cheez ki bori ya packet ki alag unit bhi ho sakti hai, aur Stock sahi kam hota hai.'],
    ['Kya kiryana software ke liye barcode scanner zaroori hai?', 'Zaroori nahi. Nafaa search aur quick keys se bhi tez chalta hai. Lekin agar zyada saman packed hai to scanner se bill bohat tez banta hai. Jin cheezon par barcode nahi, un ke labels Nafaa se ya free barcode generator se print kar sakte hain.'],
    ['Bijli chali jaye to kiryana ka software chalega?', 'Agar phone ya laptop ki battery hai to haan. Nafaa internet ke baghair bhi bill banata hai aur receipt print karta hai. Bill device par save rehte hain aur internet wapas aate hi khud account me chale jate hain. Udhaar ki entry bhi offline hoti hai.'],
  ],
  cta: { heading: 'Apni kiryana par ek hafta chala kar dekhein', body: '100 cheezein daalein, ek hafta bill banayein, phir faisla karein.' },
  relations: [
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
    { ref: 'BLOG_POST:how-to-start-kiryana-store-pakistan', kind: 'RELATED' },
    { ref: 'BLOG_POST:best-pos-kiryana-2026', kind: 'RELATED' },
    { ref: 'TEMPLATE:product-import-template', kind: 'RELATED' },
    { ref: 'TOOL:barcode-generator', kind: 'RELATED' },
    { ref: 'PAGE:udhaar-likhne-wali-app', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/industries/retail/RetailPack.tsx',
    'apps/web/src/modules/pos/lib/posUnits.ts',
    'apps/web/src/modules/pos/quick-keys',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/web/src/modules/inventory/low-stock/components/ReorderView.tsx',
    'apps/web/src/modules/inventory/barcodes/pages/BarcodeLabelsPage.tsx',
    'apps/web/src/core/lib/offline/offlineSales.ts',
  ],
  sortOrder: 4,
};

export default spec;
