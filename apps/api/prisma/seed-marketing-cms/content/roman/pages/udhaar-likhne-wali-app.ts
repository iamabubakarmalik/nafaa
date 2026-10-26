/** /udhaar-likhne-wali-app: "udhaar likhne wali app". */

import { diagram, features, prose, shot, SHOT, steps } from '../../main-pages/_build';
import type { RomanSpec } from '../_roman';

const spec: RomanSpec = {
  slug: 'udhaar-likhne-wali-app',
  title: 'Udhaar Likhne Wali App',
  summary:
    'How to record customer credit (udhaar) so that it comes back, in simple Roman Urdu: what every entry needs, setting a credit limit, watching how old each balance is, and asking for payment politely. Includes a free register template, an ageing calculator, and how Nafaa writes udhaar straight from the bill.',
  seoTitle: 'Udhaar Likhne Wali App: Udhaar Wapas Kaise Layein',
  seoDescription:
    'Udhaar likhne wali app: har entry me kya likhein, credit limit, purana udhaar kaise pakrein aur WhatsApp reminder. Free register aur Nafaa digital khata.',
  focusKeyword: 'udhaar likhne wali app',
  hero: {
    eyebrow: 'Udhaar ka hisaab',
    heading: 'Udhaar likhne wali app jo udhaar wapas bhi laye',
    sub: 'Udhaar likhna aasaan hai, wapas lena mushkil. Nafaa me udhaar bill se seedha customer ke khate me jata hai, had (limit) se upar nahi jata, aur purana hote hi WhatsApp par yaad-dihani ek click me chali jati hai.',
    media: { id: SHOT.khata, url: 'app.nafaa.pk/khata' },
  },
  facts: [
    ['Har entry me', 'Tareekh, customer ka naam aur number, bill ki raqam, kitna diya aur kitna baqi'],
    ['Zaroori usool', 'Har customer ki had (credit limit) aur har hafte purane udhaar ki list'],
    ['Free madad', '[Khata udhaar register](/templates/khata-udhaar-register) aur [khata ageing calculator](/tools/khata-ageing-calculator)'],
    ['Nafaa me', 'Bill ka udhaar khud khate me, limit par manager PIN, WhatsApp reminder'],
    ['Internet', 'Udhaar aur wapsi ki entry offline bhi hoti hai, baad me sync'],
  ],
  romanLine: 'Udhaar tab wapas aata hai jab saaf likha ho, had me ho aur waqt par yaad dilaya jaye. Nafaa ye teeno kaam khud karta hai.',
  body: [
    prose(`## Udhaar sahi tareeqe se kaise likhein

Har mohalle ki dukaan udhaar par chalti hai. Masla udhaar dena nahi, masla ye hai ke likha hua adhoora hota hai. "Ahmed bhai 2,000" likh diya, lekin kab, kis cheez ka, aur kya kuch wapas diya tha, ye nahi likha. Phir mahine baad behas hoti hai aur aksar dukaandar hi chup ho jata hai.

Har udhaar entry me ye cheezein honi chahiye:

- **Tareekh.** Is se pata chalta hai ke udhaar kitna purana hai.
- **Customer ka poora naam aur phone number.** Do "Bilal" hon to galti na ho, aur yaad-dihani bhej sakein.
- **Bill ki raqam aur kya liya.** Customer poochhe to line by line dikha sakein.
- **Kitna abhi diya, kitna baqi.** Aadhi payment bhi likhein, warna total ghalat ho jata hai.
- **Wapsi ki tareekh aur tareeqa.** Cash, JazzCash, Easypaisa ya bank, aur kis ne wasool kiya.

Ye sab register me bhi likha ja sakta hai. Hamara free [khata udhaar register](/templates/khata-udhaar-register) isi format me hai.`),
    steps('Udhaar ko qaboo me rakhne ke chaar usool', [
      ['Had (limit) tay karein', 'Har customer ke liye ek had rakhein, jaise ek mahine ka saudaa. Had poori ho to pehle purana udhaar, phir naya.'],
      ['Umar dekhein, sirf total nahi', 'Ek hafte ka udhaar aur Eid se pehle ka udhaar ek jaisa nahi. Udhaar ko 7, 30 aur 90 din ke hisse me dekhein.'],
      ['Waqt par yaad dilayein', 'Pehle narm message, phir saaf tareekh maangein. Der se maangna sab se mehnga padta hai.'],
      ['Wapsi foran likhein', 'Jo paisa aaye usi waqt likhein, aur sab se purane bill se kaatein, taake hisaab saaf rahe.'],
    ], 'Ye usool kisi bhi dukaan par chalte hain, app ho ya register.', true),
    diagram('Nafaa me udhaar ka poora chakkar: udhaar bill, WhatsApp reminder, payment, aur balance khud update.', {
      kind: 'khata-cycle',
      labels: { sale: 'Udhaar ka bill', reminder: 'WhatsApp reminder', payment: 'Payment aayi', balance: 'Balance khud update' },
    }, 'Udhaar ka chakkar'),
    shot({
      heading: 'Kis ne kitna dena hai, aur kab se',
      body: 'Nafaa ka khata kul udhaar se shuru hota hai, phir udhaar ko umar ke hisab se baant deta hai: 7 din se kam, 7 se 30, 30 se 90 aur 90 se zyada. Sab se zyada udhaar wale upar aate hain, har ek ke saath Payment ka button, WhatsApp reminder aur statement.',
      id: SHOT.khata,
      url: 'app.nafaa.pk/khata',
      layout: 'full',
      callouts: [
        { x: 25, y: 19, label: 'Kul udhaar' },
        { x: 48, y: 30, label: 'Udhaar kitna purana' },
        { x: 87, y: 55, label: 'Payment likhein' },
        { x: 94, y: 55, label: 'WhatsApp aur statement' },
        { x: 88, y: 12, label: 'Purana khata aur naya udhaar' },
      ],
    }),
    features('Nafaa me udhaar kaise likha jata hai', [
      ['receipt', 'Bill se seedha', 'Counter par customer chunein aur poora bill ya baqi raqam us ke khate me daal dein. Alag se likhna nahi padta.'],
      ['shield', 'Credit limit', 'Har customer ki had rakhein. Had se upar udhaar ke liye manager ka PIN chahiye.'],
      ['hand-coins', 'Aadhi payment aur advance', 'Jitna aaj de sakta hai le lein; zyada diya to advance ke taur par rehta hai.'],
      ['notebook-pen', 'Poori history', 'Har bill aur payment tareekh aur bill number ke saath; statement print ya PDF.'],
      ['handshake', 'Supplier ka udhaar bhi', 'Jo aap ne suppliers ko dena hai woh bhi saath hi likha jata hai.'],
      ['lock', 'Parda', 'Khata app PIN ke peeche hai, aur ek tap se saari raqamein chhup jati hain.'],
    ]),
    shot({
      heading: 'Bazaar me bhi hisaab jeb me',
      body: 'Khata phone par bhi khulta hai. Customer raste me poochhe "kitna banta hai?" to wahin bata dein. Bina internet li gayi payment phone par mehfooz rehti hai aur baad me sync hoti hai.',
      id: SHOT.khataPhone,
      frame: 'phone',
      layout: 'split-left',
    }),
    prose(`## Apna udhaar abhi naapein

Agar aap ka udhaar register me hai, to [khata ageing calculator](/tools/khata-ageing-calculator) me har customer ka balance aur din daal kar dekhein ke kitna paisa 30 din se zyada purana hai. Aksar yahi hissa sab se mushkil se wapas aata hai. Udhaar kam karne ke aur tareeqe [how to reduce udhaar](/blog/how-to-reduce-udhaar) aur [udhaar aur khata guide](/guides/managing-udhaar-and-khata) me hain.

Nafaa ka udhaar wala hissa [digital khata](/product/khata) kehlata hai. Yaad-dihani ka message kaisa ho, ye [WhatsApp par udhaar reminder](/whatsapp-udhaar-reminder) wale safhe par hai, aur paper khate se app par aane ka tareeqa [khata app](/khata-app) par.`),
  ],
  faqs: [
    ['Udhaar likhne ke liye kaun si app achhi hai?', 'Achhi app woh hai jo bill ke saath hi udhaar likh de, had (limit) rakhne de aur purana udhaar alag dikhaye. Sirf note rakhne wali app me entry bhool jati hai. Nafaa me udhaar counter se khud khate me jata hai aur WhatsApp reminder ek click me jata hai.'],
    ['Udhaar wapas na kare to kya karein?', 'Pehle narm yaad-dihani bhejein, phir saaf tareekh maangein, aur 30 din ke baad naya udhaar band karke had kam kar dein. Har baat likhi hui ho to behas kam hoti hai. Nafaa me statement customer ko dikha sakte hain jis me har bill aur payment tareekh ke saath hai.'],
    ['Customer kahe maine paise de diye the, to kaise saabit karein?', 'Isi liye har payment usi waqt likhni chahiye, tareekh aur tareeqe ke saath. Nafaa me har payment ki entry, bill number aur tareekh mehfooz hai, aur customer ka poora statement print ya PDF ho sakta hai. Saaf likha hisaab dikha dein, zyada tar masle wahin khatam ho jate hain.'],
    ['Kya har customer ki udhaar ki had (limit) rakh sakte hain?', 'Ji haan. Nafaa me har customer ki credit limit alag rakhi ja sakti hai. Counter par bill us had se upar jaye to manager ka PIN maanga jata hai, is liye cashier chupke se had paar nahi kar sakta. Had customer ki purani payment dekh kar badal bhi sakte hain.'],
    ['Purane register ka udhaar app me kaise dalein?', 'Har customer ka aaj ka baqi balance "Purana khata" entry se daal dein. Puri purani entries dalne ki zaroorat nahi. Is ke baad naya udhaar bill se khud judta rahega. Pehle sab se bare udhaar wale customer dalein, taake reminder foran shuru ho sakein.'],
  ],
  cta: { heading: 'Udhaar likhein bhi, wapas bhi layein', body: 'Apne purane balance daal kar 7 din Free Trial me khata chala kar dekhein.' },
  relations: [
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'RELATED' },
    { ref: 'GUIDE:managing-udhaar-and-khata', kind: 'RELATED' },
    { ref: 'TEMPLATE:khata-udhaar-register', kind: 'RELATED' },
    { ref: 'TOOL:khata-ageing-calculator', kind: 'RELATED' },
    { ref: 'BLOG_POST:how-to-reduce-udhaar', kind: 'RELATED' },
    { ref: 'PAGE:khata-app', kind: 'RELATED' },
    { ref: 'PAGE:whatsapp-udhaar-reminder', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/customers/directory/messages.ts',
    'apps/web/src/modules/customers/directory/offlineKhataActions.ts',
    'apps/web/src/core/security/ManagerPin.tsx',
    'apps/web/src/core/security/AppLockGate.tsx',
    'apps/web/src/modules/purchasing/suppliers/components/SupplierMoneyModal.tsx',
  ],
  sortOrder: 2,
};

export default spec;
