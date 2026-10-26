/** /dukaan-ka-hisaab-app: "dukaan ka hisaab rakhne wali app". */

import { prose, shot, SHOT, steps, table } from '../../main-pages/_build';
import type { RomanSpec } from '../_roman';

const spec: RomanSpec = {
  slug: 'dukaan-ka-hisaab-app',
  title: 'Dukaan ka Hisaab Rakhne Wali App',
  summary:
    'How to keep a shop\'s accounts in Pakistan, explained in simple Roman Urdu: the five things to record every day (sale, expense, purchase, udhaar and stock), how to do it on paper, the free sheets and calculators that help, and how Nafaa records all of it from each bill.',
  seoTitle: 'Dukaan ka Hisaab Rakhne Wali App (Roman Urdu Guide)',
  seoDescription:
    'Dukaan ka hisaab kaise rakhein: Sale, Expense, udhaar aur Stock likhne ka aasaan tareeqa, free sheets aur Nafaa app jo har bill se khud hisaab rakhti hai.',
  focusKeyword: 'dukaan ka hisaab rakhne wali app',
  hero: {
    eyebrow: 'Dukaan ka hisaab',
    heading: 'Dukaan ka hisaab rakhne wali app: Sale, Stock aur udhaar ek jagah',
    sub: 'Register, galla aur calculator ki jagah ek app jo har bill ke saath khud hisaab likhti hai: aaj ki Sale, asal Profit, Stock kitna bacha aur kis ne kitna udhaar dena hai. Phone, tablet ya computer, jo aap ke paas hai.',
    media: { id: SHOT.dashboard, url: 'app.nafaa.pk/dashboard' },
  },
  facts: [
    ['Kya likhna hai', 'Paanch cheezein: Sale, Expense, khareed (purchase), udhaar aur Stock'],
    ['Haath se', 'Rozana register aur shaam ko galla ginna; free [cash closing sheet](/templates/daily-cash-closing-sheet) is me madad karti hai'],
    ['Nafaa me', 'Bill banate hi Sale, Stock, Profit aur khata khud update ho jate hain'],
    ['Kahan chalti hai', 'Phone, tablet ya computer ke browser me, aur Windows desktop app'],
    ['Qeemat', '7 din Free Trial, phir paid plan {{price:min.monthly}} mahana se'],
  ],
  romanLine: 'Dukaan ka poora hisaab paanch cheezon ka hai: Sale, Expense, khareed, udhaar aur Stock. Nafaa ye sab har bill ke saath khud likhta hai.',
  body: [
    prose(`## Dukaan ka hisaab asal me kya hai?

Bahut se dukaandar sirf galla ginte hain aur samajhte hain ke hisaab ho gaya. Lekin galle me jo paisa hai woh poori kahani nahi batata. Kuch maal udhaar par gaya, kuch paisa supplier ko gaya, bijli ka bill bhi isi galle se diya, aur shelf par kitna maal bacha woh kisi ko yaad nahi. Asal hisaab paanch cheezon ka hai:

1. **Sale:** aaj kitna maal bika, cash me bhi aur udhaar par bhi.
2. **Expense:** kiraya, bijli, tankhwah, chai-pani, rickshaw ka kiraya.
3. **Khareed (purchase):** supplier se kitna maal aaya aur us ka kitna paisa diya ya baqi hai.
4. **Udhaar:** kis customer ne kitna dena hai, aur kab se.
5. **Stock:** kaun si cheez kitni bachi hai aur us ki Cost kitni hai.

Jab ye paanch cheezein roz likhi jayein, tab hi pata chalta hai ke dukaan asal me Profit de rahi hai ya nahi. Sale zyada hona aur Profit hona do alag baatein hain. Agar aap ne 50,000 rupay ka maal becha aur us ki Cost 44,000 rupay thi, to Profit 6,000 rupay hai, aur us me se din ka Expense bhi nikalna hai.`),
    steps('Register me hisaab rakhne ka aasaan tareeqa', [
      ['Har bikri likhein', 'Har bill ki raqam likhein aur saath likhein ke cash mila, JazzCash/Easypaisa aaya ya udhaar gaya. Udhaar wali line par customer ka naam zaroor likhein.'],
      ['Har kharcha alag likhein', 'Galle se jo bhi paisa nikle, chahe chai ka ho ya ghar ke liye, us ki ek line banayein. Yahi line aksar bhool jati hai aur hisaab nahi milta.'],
      ['Khareed ki parchi sambhalein', 'Supplier ki har bilty ya parchi ek file me rakhein aur register me likhein ke kitna diya aur kitna baqi hai.'],
      ['Shaam ko galla milayein', 'Subah ka cash + aaj ki cash Sale - aaj ke Expense = galle me hona chahiye. Farq ho to usi din dhoondein, kal yaad nahi rahega.'],
      ['Mahine me ek dafa Stock ginein', 'Shelf ka maal gin kar Cost se zarb dein. Is se pata chalta hai ke paisa kahan phansa hua hai.'],
    ], 'Agar abhi app nahi lena chahte to ye paanch kaam register me bhi ho sakte hain. Bas roz karne hain.', true),
    shot({
      heading: 'Nafaa me ye sab ek screen par',
      body: 'Nafaa ka dashboard dukaan khulte hi batata hai: aaj ki Sale, Cost aur Expense nikaal kar Profit, galle me kitna cash hona chahiye, aur bazaar me kitna udhaar phansa hua hai. Ye sab bill banate hi khud update hota hai, alag se kuch likhna nahi padta.',
      id: SHOT.dashboard,
      url: 'app.nafaa.pk/dashboard',
      layout: 'full',
      callouts: [
        { x: 30, y: 26, label: 'Aaj ki Sale' },
        { x: 24, y: 52, label: 'Cost aur Expense ke baad Profit' },
        { x: 51, y: 52, label: 'Galle me kitna cash' },
        { x: 92, y: 52, label: 'Kitna udhaar lena hai' },
      ],
    }),
    table('Register, Excel ya app: kya farq hai?', 'Teeno se hisaab rakha ja sakta hai. Farq ye hai ke kitna kaam aap ko khud karna padta hai.', [
      { key: 'register', label: 'Register' },
      { key: 'excel', label: 'Excel' },
      { key: 'nafaa', label: 'Nafaa app', highlight: true },
    ], [
      ['Sale likhna', 'Haath se, har bill', 'Shaam ko type karna', 'Bill banate hi khud'],
      ['Stock kam hona', 'Shelf dekh kar andaza', 'Formula lagana padta hai', 'Har bikri par khud kam'],
      ['Profit', 'Mahine ke aakhir me andaza', 'Cost alag se dalni padti hai', 'Har cheez ka Profit report me'],
      ['Udhaar', 'Safhe palatna', 'Alag sheet', 'Customer ka khata, WhatsApp reminder ke saath'],
      ['Bijli ya internet chala jaye', 'Register chalta rehta hai', 'Computer band', 'Bill bante rehte hain, baad me sync'],
    ]),
    shot({
      heading: 'Udhaar ka hisaab bhi saath saath',
      body: 'Jo bill udhaar par gaya woh khud customer ke khate me chala jata hai. Kis ne kitna dena hai aur kitne din se, sab saamne hai, aur ek click me WhatsApp par yaad-dihani chali jati hai.',
      id: SHOT.khata,
      url: 'app.nafaa.pk/khata',
      layout: 'split-left',
      callouts: [
        { x: 25, y: 19, label: 'Kul udhaar' },
        { x: 48, y: 30, label: 'Kitne din purana' },
        { x: 94, y: 55, label: 'WhatsApp reminder' },
      ],
    }),
    prose(`## Pehle free cheezon se shuru karein

Agar aap abhi app ke liye tayyar nahi, to ye free cheezein foran kaam aati hain:

- [Daily cash closing sheet](/templates/daily-cash-closing-sheet): shaam ko galla milane ka printable form.
- [Khata udhaar register](/templates/khata-udhaar-register): udhaar likhne ka saaf format.
- [Stock take sheet](/templates/stock-take-sheet): mahine ki Stock ginti ke liye.
- [Profit margin calculator](/tools/profit-margin-calculator): kisi bhi cheez ka Profit aur margin nikaalne ke liye.

Poori tafseel English me chahiye to [running a retail shop in Pakistan](/guides/running-a-retail-shop-pakistan) guide aur [daily cash closing routine](/blog/daily-cash-closing-routine) parhein.

## App chunte waqt ye cheezein dekhein

- **Bill aur hisaab ek hi jagah ho.** Agar bill ek jagah banta hai aur hisaab doosri jagah, to roz kuch na kuch reh jata hai.
- **Internet ke baghair chale.** Load-shedding me counter nahi rukna chahiye. Nafaa [offline](/product/offline-pos) bhi bill banata hai.
- **Profit Cost ke saath dikhaye.** Sirf Sale ka total kaafi nahi. Nafaa ki [reports](/product/reports) har cheez ka Profit aur poora P&L dikhati hain.
- **Udhaar ka khata saath ho.** Nafaa ka [digital khata](/product/khata) har udhaar bill se khud bharta hai.
- **Purana data aa sake.** Products ki list Excel se ek dafa me aa jati hai, [inventory](/product/inventory) dekhein.

Kisi bhi qism ki dukaan ho, kiryana se le kar kapre aur medical store tak, ye hisaab ek jaisa hai. Apni dukaan ke hisaab se dekhna ho to [kiryana](/kiryana-store-software), [medical store](/medical-store-software) ya [mobile shop](/mobile-shop-software) wale safhe parhein.`),
  ],
  faqs: [
    ['Dukaan ka hisaab rakhne ke liye sab se aasaan app kaun si hai?', 'Aasaan woh app hai jis me alag se kuch likhna na pade. Nafaa me aap sirf bill banate hain, aur Sale, Stock, Profit aur udhaar khud update ho jate hain. Screens par aasaan labels hain aur ye phone ke browser me bhi chalti hai. 7 din Free Trial me apni dukaan par aazma kar dekhein.'],
    ['Kya mobile par dukaan ka poora hisaab rakh sakte hain?', 'Ji haan. Nafaa phone ke browser me chalti hai, is liye counter par bill bhi phone se ban sakta hai aur ghar baithe aaj ki Sale, Profit aur udhaar bhi dekh sakte hain. Bari dukaan ke liye tablet ya computer behtar hai, lekin hisaab dono jagah ek hi rehta hai.'],
    ['Hisaab rakhne ke liye computer chalana aana zaroori hai?', 'Nahi. Agar aap WhatsApp chala lete hain to Nafaa bhi chala lenge. Bill banana, udhaar likhna aur aaj ki Sale dekhna kuch taps ka kaam hai. Shuru me products ki list dalni hoti hai, jo Excel se ek dafa me aa jati hai, aur hamari team WhatsApp par madad karti hai.'],
    ['Galla roz kam kyun nikalta hai?', 'Aksar teen wajah hoti hain: galle se nikla kharcha likha nahi gaya, udhaar wala bill cash me gin liya, ya bill hi nahi bana. Har kharcha alag likhein aur shaam ko galla milayein. Nafaa me Expense aur galle ka hisaab din ke hisaab ke saath hota hai, is liye farq usi din pakda jata hai.'],
    ['Kya purana register app me daal sakte hain?', 'Haan. Products ki list Excel ya copy-paste se aa jati hai, aur har customer ka purana udhaar "Purana khata" entry se opening balance ke taur par daal dein. Puri purani entries dalne ki zaroorat nahi; aaj ke balance se shuru karein aur aage ka hisaab app khud rakhegi.'],
  ],
  cta: { heading: 'Register band karein, hisaab khud bane', body: '7 din Free Trial me apni dukaan ka ek hafta Nafaa par chala kar dekhein.' },
  relations: [
    { ref: 'PRODUCT:reports', kind: 'RELATED' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
    { ref: 'SOLUTION:single-shop', kind: 'RELATED' },
    { ref: 'TEMPLATE:daily-cash-closing-sheet', kind: 'RELATED' },
    { ref: 'GUIDE:running-a-retail-shop-pakistan', kind: 'RELATED' },
    { ref: 'PAGE:dukaan-ka-munafa-kaise-nikalein', kind: 'RELATED' },
    { ref: 'PAGE:stock-ka-hisaab-app', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/modules/reports/pnl',
    'apps/web/src/modules/reports/day-book/DayBookPage.tsx',
    'apps/web/src/modules/finance/expenses',
    'apps/web/src/modules/finance/cash-register',
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/web/src/core/lib/offline/offlineSales.ts',
  ],
  sortOrder: 1,
};

export default spec;
