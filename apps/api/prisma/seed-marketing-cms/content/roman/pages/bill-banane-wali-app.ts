/** /bill-banane-wali-app: "bill banane wali app". */

import { features, prose, shot, SHOT, steps, table } from '../../main-pages/_build';
import type { RomanSpec } from '../_roman';

const spec: RomanSpec = {
  slug: 'bill-banane-wali-app',
  title: 'Bill Banane Wali App',
  summary:
    'How to make a proper shop bill, in simple Roman Urdu: what every bill should show, thermal receipt or A4 invoice, which printer to buy, and sending the bill on WhatsApp instead of paper. Includes the free receipt maker and invoice template, and how Nafaa makes the bill while it updates stock and udhaar.',
  seoTitle: 'Bill Banane Wali App: Printed aur WhatsApp Bill',
  seoDescription:
    'Bill banane wali app: bill par kya likha ho, 58/80 mm parchi ya A4 invoice, printer kaun sa, aur WhatsApp par bill. Free receipt maker aur Nafaa POS.',
  focusKeyword: 'bill banane wali app',
  hero: {
    eyebrow: 'Bill aur receipt',
    heading: 'Bill banane wali app: seconds me bill, print ya WhatsApp par',
    sub: 'Scan karein ya tap karein, Discount lagayein, cash, card, JazzCash, Easypaisa ya udhaar me paise lein, aur parchi print karein ya customer ke WhatsApp par bhej dein. Saath hi Stock aur hisaab khud update.',
    media: { id: SHOT.receipt, frame: 'receipt' },
  },
  facts: [
    ['Bill par zaroori', 'Dukaan ka naam, tareekh, bill number, cheezein, qeemat, Discount, total aur payment ka tareeqa'],
    ['Paper', '58 mm ya 80 mm thermal parchi, ya A4 invoice / PDF'],
    ['Free tools', '[Receipt maker](/tools/receipt-maker) aur [simple invoice template](/templates/simple-invoice-template)'],
    ['Nafaa me', 'Bill ke saath Stock kam, udhaar khate me, Sale report me'],
    ['Printer', 'Zaroori nahi; bill WhatsApp par bhi ja sakta hai'],
  ],
  romanLine: 'Achha bill saaf ho, number wala ho, aur customer ko mil jaye, chahe kaghaz par ho ya WhatsApp par. Nafaa bill ke saath poora hisaab bhi likhta hai.',
  body: [
    prose(`## Ek sahi bill par kya hona chahiye?

Bill sirf raqam ki parchi nahi. Yahi customer ke liye saboot hai, wapsi (return) ki bunyaad hai, aur aap ke hisaab ka pehla qadam hai. Ek achhe bill par ye cheezein hon:

- **Dukaan ka naam, pata aur phone.** Customer dobara rabta kar sake.
- **Tareekh, waqt aur bill number.** Har bill ka alag number, taake koi bill gum ho to pata chale.
- **Har cheez ki line.** Naam, kitni (quantity), qeemat aur line ka total.
- **Discount alag likha ho.** Customer ko nazar aaye ke kitni bachat hui.
- **Kul raqam aur payment ka tareeqa.** Cash, card, JazzCash, Easypaisa ya udhaar, aur kitna wapas diya.
- **Wapsi ki policy.** Ek line kaafi hai, jaise "saman 7 din me tabdeel ho sakta hai".

Haath se likha bill bhi ye sab kar sakta hai, lekin us ka number aur hisaab khud nahi banta, aur copy aksar gum ho jati hai.`),
    table('Parchi, A4 ya WhatsApp?', 'Teeno ka apna kaam hai. Nafaa me teeno ek hi bill se bante hain.', [
      { key: 'use', label: 'Kab' },
      { key: 'note', label: 'Note' },
    ], [
      ['58 mm thermal parchi', 'Chhota counter, kiryana, medical', 'Sasta printer, chhoti parchi'],
      ['80 mm thermal parchi', 'Zyada cheezon wale bill, restaurant', 'Parhne me saaf, logo aur footer ke liye jagah'],
      ['A4 invoice ya PDF', 'Wholesale, company ko bill, quotation', 'Party ka naam, signature ki jagah'],
      ['WhatsApp bill', 'Har jagah', 'Kaghaz ka kharcha nahi, customer ke paas hamesha'],
    ]),
    shot({
      heading: 'Nafaa ki parchi',
      body: 'Dukaan ka naam aur logo, bill number, har line, Discount, kul raqam, payment ka tareeqa aur aap ka apna footer. Yahi bill 58 mm, 80 mm ya A4 par chhapta hai, ya WhatsApp par jata hai.',
      id: SHOT.receipt,
      frame: 'receipt',
      layout: 'split-right',
    }),
    steps('Nafaa me bill kaise banta hai', [
      ['Cheez daalein', 'Barcode scan karein, quick key dabayein ya naam likh kar search karein. Unit chunein: piece, darjan, carton ya kilo.'],
      ['Discount aur customer', 'Line ya poore bill par Discount, aur udhaar ho to customer chunein.'],
      ['Paise lein', 'Cash, card, JazzCash, Easypaisa, bank ya udhaar; ek bill me do tareeqe bhi.'],
      ['Bill dein', 'Parchi print karein ya customer ke number par WhatsApp karein. Bill number khud lagta hai.'],
    ], 'Keyboard se chalne wale counter par poora bill bina mouse ke ban jata hai.', true),
    shot({
      heading: 'Counter jo rush me tez chale',
      body: 'Bill ki screen par search, categories, quick keys aur payment sab ek jagah. Bill bante hi Stock kam ho jata hai, udhaar khate me jata hai, aur aaj ki Sale me jud jata hai.',
      id: SHOT.pos,
      url: 'app.nafaa.pk/pos',
      layout: 'full',
      callouts: [
        { x: 30, y: 21, label: 'Search ya scan' },
        { x: 30, y: 47, label: 'Bacha hua Stock' },
        { x: 85, y: 86, label: 'Bill aur parchi' },
      ],
    }),
    features('Bill ke saath aur kya hota hai', [
      ['boxes', 'Stock khud kam', 'Har bill se cheez ka Stock us ki unit ke hisaab se kam.'],
      ['notebook-pen', 'Udhaar khate me', 'Baqi raqam customer ke khate me, tareekh aur bill number ke saath.'],
      ['rotate-ccw', 'Wapsi (return)', 'Purana bill dhoond kar wapsi; refund par manager PIN.'],
      ['message-circle', 'WhatsApp bill', 'Customer ke number par poora bill, aap ke apne WhatsApp se.'],
      ['printer', 'Printer marzi ka', '58 ya 80 mm thermal, ya A4. Cash drawer bhi jur jata hai.'],
      ['wifi-off', 'Bina internet', 'Bill device par save, receipt chhapti hai, baad me sync.'],
    ]),
    prose(`## App ke baghair bill chahiye?

Kabhi kabhar ek do bill chahiye hon to hamara free [receipt maker](/tools/receipt-maker) browser me bill bana kar 58 ya 80 mm printer par print kar deta hai, sign-up ke baghair. Wholesale ya company ke liye [simple invoice template](/templates/simple-invoice-template) aur rate list ke liye [price list template](/templates/price-list-template) bhi free hain. Discount ki sahi raqam nikaalni ho to [discount calculator](/tools/discount-calculator) dekhein.

Roz ke darjanon bill hon to app hi behtar hai, kyunki har bill ke saath Stock, udhaar aur Profit ka hisaab bhi chahiye. Nafaa ke counter ki poori tafseel [POS & billing](/product/pos) par, printer chunne ka tareeqa [choosing a POS printer](/blog/choosing-a-pos-printer) par, aur WhatsApp bill ki tafseel [WhatsApp & SMS](/product/whatsapp-sms) par. Bijli jane par bill kaise bante hain, ye [offline billing software](/offline-billing-software) wala safha batata hai.`),
  ],
  faqs: [
    ['Mobile se bill kaise banayein?', 'Nafaa phone ke browser me chalta hai. Cheez search ya scan karein, paise ka tareeqa chunein aur bill customer ke WhatsApp par bhej dein. Printer chahiye to Bluetooth ya USB thermal printer bhi jor sakte hain. Is tarah phone hi poora counter ban jata hai.'],
    ['Bill banane ke liye kaun sa printer lein?', 'Chhote counter ke liye 58 mm thermal printer kaafi hai; zyada lines wale bill aur restaurant ke liye 80 mm behtar hai. A4 invoice ke liye aam printer. Shuru me printer na lein to bhi chalega, bill WhatsApp par chala jata hai.'],
    ['Kya bill par apni dukaan ka naam aur logo aa sakta hai?', 'Ji haan. Nafaa me dukaan ka naam, pata, phone, logo aur neeche ka footer message settings me ek dafa likhte hain, aur har bill par khud aata hai. A4 invoice ka design bhi chuna ja sakta hai. Wapsi ki policy footer me likh dein.'],
    ['WhatsApp par bill bhejne ke liye WhatsApp Business API chahiye?', 'Nahi. Nafaa aap ka apna WhatsApp kholta hai jis me bill ka message likha hota hai; aap send dabate hain. Koi alag API ya mahana WhatsApp kharcha nahi. Customer ka number bill par ya us ke khate me hona chahiye.'],
    ['Bill ka number khud lagta hai?', 'Haan. Har bill ko khud agla number milta hai. Internet ke baghair bane bill par device ka apna code hota hai, taake do counter ek waqt me offline hon to bhi number na takrayein. Gum hua bill number se dhoonda ja sakta hai.'],
  ],
  cta: { heading: 'Pehla bill aaj banayein', body: 'Apni dukaan ka naam daalein, das cheezein add karein, aur pehli parchi print ya WhatsApp karein.' },
  relations: [
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'RELATED' },
    { ref: 'TOOL:receipt-maker', kind: 'RELATED' },
    { ref: 'TEMPLATE:simple-invoice-template', kind: 'RELATED' },
    { ref: 'TOOL:discount-calculator', kind: 'RELATED' },
    { ref: 'BLOG_POST:choosing-a-pos-printer', kind: 'RELATED' },
    { ref: 'PAGE:offline-billing-software', kind: 'RELATED' },
    { ref: 'PAGE:dukaan-ka-hisaab-app', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/core/receipt/types.ts',
    'apps/web/src/core/receipt/print.ts',
    'apps/web/src/core/lib/whatsapp/templates.ts',
    'apps/web/src/modules/pos/engine/PosScreen.tsx',
    'apps/web/src/modules/pos/components/PosSplitTender.tsx',
    'apps/web/src/modules/sales/returns',
    'apps/web/src/core/hardware/escpos.ts',
    'apps/web/src/core/lib/offline/offlineDevice.ts',
  ],
  sortOrder: 5,
};

export default spec;
