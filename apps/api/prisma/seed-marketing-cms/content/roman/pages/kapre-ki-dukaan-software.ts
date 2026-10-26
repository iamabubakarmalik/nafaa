/** /kapre-ki-dukaan-software: "kapre ki dukaan ka software". */

import { features, prose, shot, SHOT, steps, table } from '../../main-pages/_build';
import type { RomanSpec } from '../_roman';

const spec: RomanSpec = {
  slug: 'kapre-ki-dukaan-software',
  title: 'Kapre ki Dukaan ka Software',
  summary:
    'What a clothing shop or boutique in Pakistan needs from software, in simple Roman Urdu: stock by size and colour, stitching (silai) orders with saved measurements, alterations, exchanges, holding items for customers, season and Eid planning, and profit per article. Includes a setup plan and how Nafaa handles each part.',
  seoTitle: 'Kapre ki Dukaan ka Software: Size, Rang aur Silai',
  seoDescription:
    'Kapre ki dukaan ka software: size aur rang ka Stock, silai ke order aur naap, alteration, exchange, Eid ki tayyari aur har article ka Profit. Nafaa.',
  focusKeyword: 'kapre ki dukaan ka software',
  hero: {
    eyebrow: 'Kapre ki dukaan aur boutique',
    heading: 'Kapre ki dukaan ka software: har size, har rang, har silai ka order',
    sub: 'Ek article, paanch size, teen rang: Nafaa har jore ka Stock alag rakhta hai. Silai ke order naap ke saath, alteration aur exchange ka hisaab, aur season ke aakhir me pata ke kaun sa maal pada reh gaya.',
    media: { id: SHOT.garmentsProducts, url: 'app.nafaa.pk/garments/products' },
  },
  facts: [
    ['Sab se zaroori', 'Size aur rang ke hisaab se Stock, warna "hai ya nahi" ka pata nahi chalta'],
    ['Silai', 'Order, customer ka naap, advance aur tayyari ki tareekh'],
    ['Exchange', 'Size badalna aam hai; purana bill dhoond kar badlein'],
    ['Season', 'Eid aur shaadiyon se pehle kya mangwayein, pichhli bikri dekh kar'],
  ],
  romanLine: 'Kapre ki dukaan me ek article ke kai size aur rang hote hain. Nafaa har size aur rang ka Stock alag rakhta hai aur silai ke order naap ke saath.',
  body: [
    prose(`## Kapre ki dukaan ka hisaab kahan bigarta hai

Kapre ki dukaan par "lawn suit 3 piece: 40" likhna kaafi nahi. Customer medium size ka neela suit maangta hai, aur aap ko pata nahi ke woh hai ya nahi, jab tak poori shelf na dekh lein. Ghalti yahan se shuru hoti hai:

- **Size aur rang ka Stock nahi.** Small bik jate hain, XL bach jate hain, aur agla order phir sab size barabar ka.
- **Silai ka order kaghaz par.** Naap ki parchi gum, tareekh yaad nahi, advance kitna liya pata nahi.
- **Exchange ka hisaab nahi.** Size badla, lekin Stock me purana wapas aur naya nikla, ye likha nahi.
- **Season ka pada maal.** Eid ke baad bacha maal agle saal tak paisa rokta hai.

Is liye kapre ki dukaan ko woh software chahiye jo har article ko size aur rang me tod kar rakhe.`),
    steps('Kapre ki dukaan par software lagane ka tareeqa', [
      ['Article banayein', 'Har design ek article: naam, Cost aur qeemat. Phir us ke size aur rang chunein; har jora (variant) khud ban jata hai.'],
      ['Stock size ke hisaab se', 'Har size aur rang ka Stock alag daalein. Ek dafa ki mehnat, phir har bikri se khud kam.'],
      ['Barcode label', 'Har variant ka apna barcode label print karein, taake counter par ghalat size na bike.'],
      ['Silai aur naap', 'Regular customers ka naap ek dafa save karein; agla order usi se.'],
      ['Season ke aakhir me report', 'Kaun sa size aur rang bacha, dekhein, aur agla order usi hisaab se.'],
    ], undefined, true),
    features('Nafaa kapre ki dukaan ke liye kya karta hai', [
      ['shirt', 'Size aur rang', 'Har article ke size aur rang ka alag Stock, barcode aur qeemat.'],
      ['scissors', 'Silai ke order', 'Order, naap, advance aur tayyari ki tareekh, aur status.'],
      ['clipboard-list', 'Naap mehfooz', 'Customer ka naap ek dafa save, har naye order me wahi.'],
      ['repeat', 'Exchange', 'Purane bill se size ya rang badlein; Stock dono taraf sahi.'],
      ['clock', 'Hold aur qist', 'Customer ke liye jora rok kar rakhein, ya qist par dein.'],
      ['layers', 'Collections aur size chart', 'Season ki collection aur har brand ka size chart.'],
    ]),
    shot({
      heading: 'Har article ka Profit',
      body: 'Nafaa ki Profit report product, category, brand ya supplier ke hisaab se Profit aur margin dikhati hai. Season ke aakhir me pata chalta hai ke kaun se article ne kamaya aur kaun sa sirf jagah gher raha tha.',
      id: SHOT.garmentsProfit,
      url: 'app.nafaa.pk/reports/profit',
      layout: 'full',
      callouts: [
        { x: 32.5, y: 48.3, label: 'Product, brand ya supplier' },
        { x: 84.5, y: 58.4, label: 'Har article ka Profit aur margin' },
      ],
    }),
    table('Season ki tayyari: kya dekhein', 'Eid, shaadiyon aur garmi-sardi ke season se pehle ye sawal pichhli bikri se hal karein.', [
      { key: 'where', label: 'Kahan se pata chalega' },
      { key: 'why', label: 'Faida' },
    ], [
      ['Kaun sa size pehle khatam hua', 'Size reorder: kaun sa size khatam, kitna mangwayein', 'Agla order sirf chalne wale size ka'],
      ['Kaun sa rang bacha reh gaya', 'Har article ke card par har size aur rang ka Stock', 'Bacha rang pehle Discount par nikalein'],
      ['Kis supplier ka maal chala', 'Supplier ke hisaab se Profit', 'Achhe supplier se zyada maal'],
      ['Kitna paisa pada maal me hai', 'Stock ki value Cost par', 'Naya maal utna jitna paisa ijazat de'],
    ]),
    shot({
      heading: 'Kai branches? Sab ek jagah',
      body: 'Do teen shops hon to har branch ki Sale, Profit, Expense aur wapsi ek saath dikhti hai, aur jo size ek branch me pada hai woh doosri me bhej sakte hain.',
      id: SHOT.branches,
      url: 'app.nafaa.pk/branches',
      layout: 'split-left',
      callouts: [
        { x: 34.5, y: 19.5, label: 'Sale, Profit aur average bill' },
        { x: 35.6, y: 75, label: 'Branches ka muqabla' },
      ],
    }),
    prose(`## Aage parhein

Size ke hisaab se Stock rakhne ka tafseeli tareeqa English me [clothing size inventory guide](/blog/clothing-size-inventory-guide) me hai, aur season ki planning [garment shop seasonal stock planning](/blog/garment-shop-seasonal-stock-planning) me. Ramzan aur Eid ki tayyari ke liye [Ramadan and Eid retail strategy](/blog/ramadan-eid-retail-strategy) dekhein.

Nafaa kapre ki dukaan aur boutique ke liye kya kya karta hai, poori tafseel [garments software](/industries/garments) par. Season ke aakhir ki sale par sahi Discount nikaalne ke liye free [discount calculator](/tools/discount-calculator) hai, aur Stock ginti ke liye [stock ka hisaab app](/stock-ka-hisaab-app) parhein.`),
  ],
  faqs: [
    ['Kapre ki dukaan ke liye kaun sa software achha hai?', 'Woh jo har article ke size aur rang ka Stock alag rakhe, silai ke order naap ke saath sambhale, exchange aasaan kare aur season ke baad bata de ke kya bacha. Nafaa ye sab karta hai, saath me counter, khata aur reports. 7 din Free Trial me apne article daal kar dekhein.'],
    ['Size aur rang ka Stock software me kaise rakhein?', 'Nafaa me ek article banta hai, phir us ke size aur rang chunte hain. Har size aur rang ka jora (variant) apna Stock, barcode aur zaroorat ho to apni qeemat rakhta hai. Counter par variant scan hota hai aur wahi Stock se kam hota hai.'],
    ['Silai ka order aur naap kaise yaad rakhein?', 'Nafaa me silai ka order customer, naap, kapra, advance aur tayyari ki tareekh ke saath banta hai, aur status dikhata hai ke kaam kahan pohncha. Customer ka naap ek dafa save ho jata hai, is liye agle order par dobara lena nahi padta.'],
    ['Customer size badalne aaye to kya karein?', 'Nafaa me purana bill dhoond kar exchange karein. Wapas aaya size Stock me jata hai aur naya size nikalta hai, aur qeemat ka farq ho to wahi le ya de dein. Is tarah exchange ke baad bhi size ka Stock sahi rehta hai.'],
    ['Eid ke liye kitna maal mangwayein?', 'Pichhli Eid dekhein: kaun se size aur rang bike aur kaun se bache. Nafaa me har article ke card par har size aur rang ka Stock likha hai, Size reorder batata hai kaun sa size khatam hua aur kitna mangwana hai, aur Profit report brand aur supplier ke hisaab se hai. Pehle bacha maal nikalein.'],
  ],
  cta: { heading: 'Har size ka hisaab, pehle din se', body: 'Apne best selling article size aur rang ke saath daalein aur ek hafta chala kar dekhein.' },
  relations: [
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'BLOG_POST:clothing-size-inventory-guide', kind: 'RELATED' },
    { ref: 'BLOG_POST:garment-shop-seasonal-stock-planning', kind: 'RELATED' },
    { ref: 'BLOG_POST:ramadan-eid-retail-strategy', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
    { ref: 'TOOL:discount-calculator', kind: 'RELATED' },
    { ref: 'PAGE:stock-ka-hisaab-app', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/industries/garments/GarmentsPack.tsx',
    'apps/web/src/industries/garments/pages/GarmentProductWizardPage.tsx',
    'apps/web/src/industries/garments/pages/NewTailoringOrderPage.tsx',
    'apps/web/src/industries/garments/pages/MeasurementsPage.tsx',
    'apps/web/src/industries/garments/pages/ExchangePage.tsx',
    'apps/web/src/industries/garments/pages/ReservationsPage.tsx',
    'apps/web/src/industries/garments/pages/LayawayPage.tsx',
    'apps/web/src/industries/garments/pages/CollectionsPage.tsx',
    'apps/web/src/industries/garments/pages/SizeChartsPage.tsx',
  ],
  sortOrder: 9,
};

export default spec;
