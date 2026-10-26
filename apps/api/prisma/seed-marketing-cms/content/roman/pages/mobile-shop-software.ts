/** /mobile-shop-software: "mobile shop ka software". */

import { features, prose, shot, SHOT, steps } from '../../main-pages/_build';
import type { RomanSpec } from '../_roman';

const spec: RomanSpec = {
  slug: 'mobile-shop-software',
  title: 'Mobile Shop ka Software',
  summary:
    'What a mobile phone shop in Pakistan needs from software, in simple Roman Urdu: stock by IMEI, PTA status for each set, buying used phones and trade-ins with proper records, repair job cards, instalment (qist) sales and profit per set. Includes a checklist for buying a used phone and how Nafaa handles each step.',
  seoTitle: 'Mobile Shop ka Software: IMEI, Repair aur Qist',
  seoDescription:
    'Mobile shop ka software: IMEI se Stock, PTA status, purane phone ki khareed, repair job card, qist par phone aur har set ka Profit. Checklist aur Nafaa.',
  focusKeyword: 'mobile shop ka software',
  hero: {
    eyebrow: 'Mobile phone shop',
    heading: 'Mobile shop ka software: har set IMEI se, har qist khate me',
    sub: 'Naya ho ya purana, har phone us ke IMEI aur PTA status ke saath Stock me. Purana phone khareedein ya badle me lein, repair ka job card banayein, qist par bechein, aur dekhein ke har set par kitna Profit hua.',
    media: { id: SHOT.mobileImei, url: 'app.nafaa.pk/imei-inventory' },
  },
  facts: [
    ['Sab se zaroori', 'Har set ka IMEI, PTA status aur khareed ki Cost'],
    ['Purane phone', 'Bechne wale ka CNIC, number aur IMEI ke saath record'],
    ['Repair', 'Job card: masla, parts, qeemat aur wapsi ki tareekh'],
    ['Qist', 'Qist plan customer ke khate me, har payment ke saath'],
    ['Accessories', 'Cover, charger, handsfree aam counter ki tarah'],
  ],
  romanLine: 'Mobile shop me har set ki apni pehchaan IMEI hai. Nafaa har phone ko IMEI se bechta hai, is liye Profit bhi har set ka alag milta hai.',
  body: [
    prose(`## Mobile shop ka hisaab mushkil kyun hai?

Mobile shop par ek hi model ke das phone hote hain, lekin har phone alag hai: alag IMEI, kisi ka PTA approved, kisi ka nahi, kisi ki Cost 1,000 rupay zyada kyunki woh doosre din aaya. Agar sirf "Model X: 10 pieces" likha ho to na pata chalta hai ke kaun sa set bika, na us ka asal Profit.

Phir purane phone ka kaam hai. Bina record ke chori ka phone khareedna sab se bara khatra hai. Har purane phone ke saath bechne wale ka naam, CNIC, number aur IMEI likha hona chahiye.

Teesra, repair aur qist. Repair ke liye aaye phone gum na hon aur waqt par wapas jayein, aur qist par diye phone ki har qist ka hisaab ho.`),
    steps('Purana phone khareedne se pehle ye check karein', [
      ['IMEI milayein', 'Phone par *#06# dial karein aur dabbe ya bill wale IMEI se milayein.'],
      ['PTA status', 'IMEI ka PTA status check karein aur record me likhein. Non-PTA set ki qeemat aur bechne ka tareeqa alag hota hai.'],
      ['Bechne wale ki pehchaan', 'Naam, CNIC aur phone number likhein. Shak ho to na khareedein.'],
      ['Haalat likhein', 'Screen, battery, body aur accessories ki haalat record me, taake baad me behas na ho.'],
      ['Record mehfooz', 'Ye sab ek jagah mehfooz rakhein; Nafaa me purane phone ka form isi ke liye hai.'],
    ], 'Ye check har mobile shop ke liye hain, software ho ya na ho.'),
    features('Nafaa mobile shop ke liye kya karta hai', [
      ['smartphone', 'IMEI se Stock', 'Har set apne IMEI ke saath; bikri par wahi set Stock se nikalta hai.'],
      ['shield-check', 'PTA status', 'Har phone ka PTA status record me, bechte waqt saamne.'],
      ['repeat', 'Purane phone aur trade-in', 'Purana phone khareedein ya naye ke badle lein, poore record ke saath.'],
      ['wrench', 'Repair job card', 'Masla, parts, qeemat aur status; customer ko waqt par khabar.'],
      ['calendar-clock', 'Qist plan', 'Qist par phone, har qist ki tareekh aur payment khate me.'],
      ['chart-column', 'Har set ka Profit', 'IMEI ke hisaab se Profit, aur har model ka margin.'],
    ]),
    shot({
      heading: 'Har IMEI ka Profit',
      body: 'Nafaa ki Profit report Expense ke baad asal Profit dikhati hai, aur har IMEI aur har model ka Profit aur margin alag. Pata chalta hai ke kaun sa model asal me kama raha hai.',
      id: SHOT.mobileProfit,
      url: 'app.nafaa.pk/reports/profit',
      layout: 'full',
      callouts: [
        { x: 46.5, y: 20, label: 'Expense ke baad Profit' },
        { x: 74, y: 56, label: 'Har IMEI ka Profit' },
        { x: 84.5, y: 66, label: 'Har model ka margin' },
      ],
    }),
    shot({
      heading: 'Qist wale customer ka khata',
      body: 'Qist par diya gaya phone customer ke khate me hai. Kul baqi, kitne din purana, aur har payment ya WhatsApp reminder ek tap par.',
      id: SHOT.mobileKhata,
      url: 'app.nafaa.pk/khata',
      layout: 'split-left',
      callouts: [
        { x: 25, y: 19.5, label: 'Kul baqi' },
        { x: 48, y: 30, label: 'Kitne din se' },
        { x: 25.5, y: 55, label: 'Qist wala customer' },
        { x: 86.5, y: 62, label: 'Payment ya reminder' },
      ],
    }),
    prose(`## Mobile shop software me ye zaroor dekhein

- **IMEI har jagah.** Khareed, Stock, bikri, wapsi aur repair, sab IMEI se jure hon.
- **Purane phone ka form.** Bechne wale ki pehchaan aur phone ki haalat ke bina khareed na ho sake.
- **Repair ka hisaab.** Kaun sa phone kis haal me hai, kis ne lena hai, kitna paisa baqi hai.
- **Qist.** Qist ki tareekhein aur baqi raqam customer ke khate me.
- **Accessories ka tez counter.** Cover aur charger ke liye IMEI nahi chahiye, aam barcode bill kaafi hai.

IMEI ka record kyun aur kaise rakhein, English me [mobile shop IMEI records](/blog/mobile-shop-imei-records) par hai. Nafaa mobile shop ke liye kya kya karta hai, poori tafseel [mobile shop software](/industries/mobile-shop) par. Kai shops hon to Stock ek se doosri me transfer bhi hota hai, dekhein [multi-shop](/product/multi-shop).

Qist aur udhaar ke usool [udhaar likhne wali app](/udhaar-likhne-wali-app) par, aur har set ka asal Profit nikaalne ka tareeqa [dukaan ka munafa kaise nikalein](/dukaan-ka-munafa-kaise-nikalein) par hai.`),
  ],
  faqs: [
    ['Mobile shop ke liye kaun sa software achha hai?', 'Woh jo har phone ko IMEI se rakhe, PTA status likhe, purane phone ki khareed ka record rakhe, repair aur qist sambhale, aur har set ka Profit dikhaye. Nafaa ye sab karta hai, saath me aam counter, khata aur reports. 7 din Free Trial me apne sets daal kar dekhein.'],
    ['IMEI se Stock rakhne ka kya faida hai?', 'Har set ki Cost alag hoti hai aur har set ki zimmedari bhi. IMEI se pata hota hai ke kaun sa set kab aaya, kis ko bika aur kitna Profit diya. Wapsi ya warranty par bhi wahi set pehchana jata hai, aur chori ke shak me record saamne hota hai.'],
    ['Purana phone khareedte waqt kya likhna zaroori hai?', 'Bechne wale ka naam, CNIC, phone number, phone ka IMEI, PTA status aur phone ki haalat. Nafaa ke purane phone wale form me ye sab likha jata hai aur phone IMEI ke saath Stock me aa jata hai. Shak ho to khareedari na karein.'],
    ['Qist par phone bechne ka hisaab software me kaise rakhein?', 'Nafaa me qist plan banta hai: kul qeemat, pehli payment aur baqi qiston ki tareekhein. Baqi raqam customer ke khate me jati hai, har qist ki payment likhi jati hai, aur der ho to WhatsApp par yaad-dihani ek tap me chali jati hai.'],
    ['Repair wale phone ka record kaise rakhein?', 'Har repair ka job card banayein: customer ka naam aur number, phone aur IMEI, masla, lagne wale parts, qeemat aur wapsi ki tareekh. Nafaa me job cards ki list status ke saath hai, taake koi phone bhool na jaye aur paisa poora wasool ho.'],
  ],
  cta: { heading: 'Har set ka hisaab, IMEI ke saath', body: 'Apne phone IMEI ke saath daalein aur pehle din se har set ka Profit dekhein.' },
  relations: [
    { ref: 'INDUSTRY:mobile-shop', kind: 'TAG' },
    { ref: 'BLOG_POST:mobile-shop-imei-records', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
    { ref: 'PRODUCT:multi-shop', kind: 'RELATED' },
    { ref: 'PAGE:dukaan-ka-munafa-kaise-nikalein', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/industries/mobile/MobilePack.tsx',
    'apps/web/src/industries/mobile/pages/GlobalImeiInventoryPage.tsx',
    'apps/web/src/industries/mobile/pages/UsedPhoneFormPage.tsx',
    'apps/web/src/industries/mobile/pages/RepairTicketFormPage.tsx',
    'apps/web/src/industries/mobile/pages/EmiPlansPage.tsx',
    'apps/web/src/industries/mobile/pages/MobileSalesPage.tsx',
    'apps/web/src/modules/inventory/transfers/pages/TransfersPage.tsx',
  ],
  sortOrder: 8,
};

export default spec;
