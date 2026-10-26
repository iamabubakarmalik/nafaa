/** /khata-app: "khata app". */

import { prose, shot, SHOT, steps, table } from '../../main-pages/_build';
import type { RomanSpec } from '../_roman';

const spec: RomanSpec = {
  slug: 'khata-app',
  title: 'Khata App: Paper ka Khata Chhorein',
  summary:
    'A Roman Urdu guide to moving from a paper khata register to a khata app: the problems with paper, the difference between a standalone khata app and a khata connected to billing, how to move your balances over in one evening, and how the Nafaa digital khata keeps statements, limits and reminders.',
  seoTitle: 'Khata App: Paper ka Khata Chhorein, Digital Khata Rakhein',
  seoDescription:
    'Khata app kaise chunein: paper register ke masle, sirf khata app aur billing wale khate ka farq, ek shaam me purana khata app me dalein. Nafaa digital khata.',
  focusKeyword: 'khata app',
  hero: {
    eyebrow: 'Digital khata',
    heading: 'Khata app: register ka har safha, phone me aur hamesha sahi',
    sub: 'Paper ka khata gum ho sakta hai, bheeg sakta hai, aur khud jama nahi karta. Nafaa ka khata har udhaar bill se khud bharta hai, har customer ka statement deta hai, aur WhatsApp par yaad-dihani bhejta hai.',
    media: { id: SHOT.khataPhone, frame: 'phone' },
  },
  facts: [
    ['Khata kya hai', 'Har customer ka alag hisaab: kya liya, kya diya, kitna baqi'],
    ['Do qism ki apps', 'Sirf khata likhne wali, ya bill ke saath khud khata bharne wali'],
    ['Shift karna', 'Ek shaam: har customer ka aaj ka balance "Purana khata" me'],
    ['Nafaa me', 'Bill se khata, statement PDF, credit limit, WhatsApp reminder, supplier khata'],
  ],
  romanLine: 'Khata app tab faida deti hai jab khata bill ke saath khud bhare. Nafaa me har udhaar bill seedha customer ke khate me jata hai.',
  body: [
    prose(`## Paper ke khate ke asal masle

Paper ka khata sadiyon se chal raha hai aur bura nahi. Lekin chaar masle har dukaandar ne dekhe hain:

- **Total khud nahi banta.** Har safhe ka jor haath se, aur ek galti poore mahine ka hisaab bigaar deti hai.
- **Purana udhaar chhup jata hai.** Naye safhon ke neeche teen mahine purana balance nazar hi nahi aata.
- **Customer ko dikhana mushkil.** Customer kehta hai "itna kaise ho gaya", aur aap safhe palatte reh jate hain.
- **Ek hi copy.** Register bheeg gaya, jal gaya ya kho gaya, to saara udhaar bhi gaya.

Digital khata in charon ko hal karta hai, bashart ke us me entry roz ho.`),
    table('Kaun sa khata aap ke liye?', 'Teen raaste hain. Farq ye hai ke entry kaun karta hai aur kya bhool sakta hai.', [
      { key: 'paper', label: 'Paper register' },
      { key: 'app', label: 'Sirf khata app' },
      { key: 'nafaa', label: 'Nafaa (bill ke saath khata)', highlight: true },
    ], [
      ['Entry kaun karta hai', 'Aap, haath se', 'Aap, alag se type kar ke', 'Counter ka bill khud'],
      ['Rush me entry bhoolna', 'Aksar', 'Aksar', 'Nahi, bill ke saath hi'],
      ['Stock aur Sale', 'Alag register', 'Nahi', 'Saath saath update'],
      ['Purana udhaar alag', 'Nahi', 'Kuch apps me', '7, 30, 90 din ke hisse'],
      ['Reminder', 'Phone kar ke', 'WhatsApp', 'WhatsApp, udhaar ki umar ke hisaab se lehja'],
      ['Had (limit)', 'Yaad se', 'Kuch apps me', 'Had par manager PIN'],
    ]),
    steps('Ek shaam me khata app par kaise aayein', [
      ['Customer list banayein', 'Register se har udhaar wale customer ka naam aur phone number app me daalein.'],
      ['Aaj ka balance daalein', 'Har customer ka sirf aaj ka baqi balance "Purana khata" entry se daalein. Purani har entry dobara likhne ki zaroorat nahi.'],
      ['Register sambhal kar rakhein', 'Purana register phenkein nahi. Koi purani behas ho to wahi saboot hai.'],
      ['Kal se bill se udhaar', 'Ab har udhaar counter ke bill se khate me jayega. Register me likhna band.'],
      ['Pehla reminder', 'Hafte ke aakhir me purane balance walon ko narm WhatsApp message bhejein.'],
    ], 'Sab se bari galti ye hai ke log poora purana register type karne baith jate hain aur kabhi khatam nahi karte.', true),
    shot({
      heading: 'Har customer ka khata, ek nazar me',
      body: 'Nafaa ka khata kul udhaar, is mahine aayi wapsi, aur udhaar ki umar dikhata hai. Har customer ke saath Payment, WhatsApp reminder aur statement ka button hai. "Purana khata" se register ke balance aate hain.',
      id: SHOT.khata,
      url: 'app.nafaa.pk/khata',
      layout: 'full',
      callouts: [
        { x: 25, y: 19, label: 'Kul udhaar' },
        { x: 48, y: 30, label: 'Udhaar ki umar' },
        { x: 88, y: 12, label: 'Purana khata yahan se' },
        { x: 94, y: 55, label: 'Reminder aur statement' },
      ],
    }),
    shot({
      heading: 'Qist aur bare udhaar bhi isi khate me',
      body: 'Mobile shop ki misaal: qist par diya gaya phone bhi customer ke khate me hai, har qist ki payment ke saath. Yahi khata kiryana, hardware, dawai aur doodh ki dukaan par bhi chalta hai.',
      id: SHOT.mobileKhata,
      url: 'app.nafaa.pk/khata',
      layout: 'split-right',
      callouts: [
        { x: 25, y: 19.5, label: 'Kul baqi' },
        { x: 25.5, y: 55, label: 'Qist wala customer' },
        { x: 86.5, y: 62, label: 'Payment ya WhatsApp' },
      ],
    }),
    prose(`## Achhi khata app me ye cheezein zaroor hon

- **Statement jo customer parh sake.** Har bill aur payment tareekh ke saath. Nafaa me statement print ya PDF hota hai.
- **Aadhi payment aur advance.** Customer jitna de, utna likha jaye; zyada de to advance rahe.
- **Parda.** Counter par customer screen dekh raha ho to raqamein chhup sakein. Nafaa me ek tap se saari raqamein chhup jati hain aur khata app PIN ke peeche hai.
- **Supplier ka khata.** Jo aap ne dena hai woh bhi saath ho, warna aadha hisaab register me reh jata hai.
- **Internet ke baghair.** Payment aur udhaar ki entry offline bhi ho aur baad me sync ho.

Khata apps ka tafseeli muqabla English me [khata apps compared](/best/khata-apps-compared) par hai, aur register ke muqable me [paper khata alternative](/alternatives/paper-khata-register). Khata lafz ka matlab aur pas-e-manzar [glossary](/glossary/khata) me hai. Nafaa ke khate ki poori tafseel [digital khata](/product/khata) par, aur udhaar likhne ke usool [udhaar likhne wali app](/udhaar-likhne-wali-app) par.

Agar abhi app nahi lena to hamara free [khata udhaar register](/templates/khata-udhaar-register) print kar lein. Kam az kam har entry ka format sahi hoga.`),
  ],
  faqs: [
    ['Khata app aur register me kya farq hai?', 'Register me total, purana udhaar aur yaad-dihani sab aap ko khud karna padta hai. Khata app khud jor lagati hai, purane udhaar ko alag dikhati hai aur WhatsApp par message bhejti hai. Nafaa me khata bill ke saath khud bhar jata hai, is liye rush me bhi koi entry reh nahi jati.'],
    ['Kya khata app me data mehfooz hai?', 'Nafaa ka data aap ke account me mehfooz rehta hai, phone kho jaye to bhi naye phone par login kar ke khata wapas mil jata hai. Khata app PIN ke peeche hai, aur counter par ek tap se saari raqamein chhup jati hain taake saamne khara customer doosron ka hisaab na dekhe.'],
    ['Customer ko us ka khata kaise dikhayein?', 'Nafaa me customer ka statement banta hai jis me har bill aur har payment tareekh ke saath hai. Ise print kar ke de sakte hain ya PDF bana kar bhej sakte hain. Reminder ke message me bhi customer ka baqi balance likha hota hai.'],
    ['Kya ek khata app do dukaanon par chal sakti hai?', 'Ji haan. Nafaa me kai branches ek account me chal sakti hain, aur customer ka khata account me hai, kisi ek phone me nahi. Malik ghar baithe bhi har branch ka udhaar dekh sakta hai. Branches ki tafseel ke liye multi-shop wala English safha dekhein.'],
    ['Free khata app aur Nafaa me kya farq hai?', 'Free khata apps aam taur par sirf udhaar likhti hain; bill, Stock aur Profit alag rehte hain. Nafaa poori dukaan ka software hai jis me khata counter ke bill se juda hai. Is ki qeemat {{price:min.monthly}} mahana se hai, aur pehle 7 din Free Trial hai.'],
  ],
  cta: { heading: 'Register ka aakhri safha, aaj', body: 'Aaj shaam apne customers ke balance daalein aur kal se khata khud bharne dein.' },
  relations: [
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
    { ref: 'BEST_OF:khata-apps-compared', kind: 'RELATED' },
    { ref: 'ALTERNATIVE:paper-khata-register', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:khata', kind: 'RELATED' },
    { ref: 'BLOG_POST:digital-khata-vs-paper-ledger', kind: 'RELATED' },
    { ref: 'TEMPLATE:khata-udhaar-register', kind: 'RELATED' },
    { ref: 'PAGE:udhaar-likhne-wali-app', kind: 'RELATED' },
    { ref: 'PAGE:whatsapp-udhaar-reminder', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/customers/directory/messages.ts',
    'apps/web/src/core/security/AppLockGate.tsx',
    'apps/web/src/core/lib/offline/offlineKhata.ts',
    'apps/web/src/modules/purchasing/suppliers/components/SupplierMoneyModal.tsx',
    'apps/web/src/industries/mobile/pages/EmiPlansPage.tsx',
  ],
  sortOrder: 3,
};

export default spec;
