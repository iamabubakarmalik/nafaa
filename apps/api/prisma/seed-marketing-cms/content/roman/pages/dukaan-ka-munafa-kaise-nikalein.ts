/** /dukaan-ka-munafa-kaise-nikalein: "dukaan ka munafa kaise nikalein". */

import { prose, shot, SHOT, steps, table } from '../../main-pages/_build';
import type { RomanSpec } from '../_roman';

const spec: RomanSpec = {
  slug: 'dukaan-ka-munafa-kaise-nikalein',
  title: 'Dukaan ka Munafa Kaise Nikalein',
  summary:
    'How to work out a shop\'s real profit, in simple Roman Urdu: the difference between sale, gross profit and net profit, a full worked month with cost of goods and expenses, the common mistakes that hide losses, margin versus markup, and how Nafaa shows profit per product and a monthly P&L from every bill.',
  seoTitle: 'Dukaan ka Munafa Kaise Nikalein: Aasaan Hisaab',
  seoDescription:
    'Dukaan ka munafa kaise nikalein: Sale, Cost aur Expense se asal Profit, poore mahine ki misaal, margin aur markup ka farq, aur aam ghaltiyan. Free calculator.',
  focusKeyword: 'dukaan ka munafa kaise nikalein',
  hero: {
    eyebrow: 'Profit ka hisaab',
    heading: 'Dukaan ka munafa kaise nikalein: Sale se asal Profit tak',
    sub: 'Galla bhara hona aur Profit hona alag baatein hain. Is safhe par seedha formula, ek poore mahine ki misaal, aur woh ghaltiyan jo nuqsan ko chhupa deti hain. Aakhir me dekhein ke Nafaa har bill se ye hisaab khud kaise karta hai.',
    media: { id: SHOT.profitByProduct, url: 'app.nafaa.pk/reports/profit' },
  },
  facts: [
    ['Gross Profit', 'Sale - bike hue maal ki Cost'],
    ['Net Profit', 'Gross Profit - saare Expense (kiraya, bijli, tankhwah, waghaira)'],
    ['Margin', 'Profit ÷ Sale x 100; markup Profit ÷ Cost x 100'],
    ['Free madad', '[Profit margin calculator](/tools/profit-margin-calculator) aur [break-even calculator](/tools/break-even-calculator)'],
  ],
  romanLine: 'Asal Profit = Sale - bike hue maal ki Cost - saare Expense. Nafaa har bill par Cost ke saath ye hisaab khud karta hai.',
  body: [
    prose(`## Teen lafz, teen alag cheezein

Bohat se dukaandar mahine ke aakhir me galla gin kar keh dete hain "is mahine itna bacha". Lekin us galle me supplier ka paisa bhi hai, udhaar ki wapsi bhi, aur shayad agle mahine ka kiraya bhi. Asal Profit samajhne ke liye teen lafz alag samjhein:

- **Sale:** jitne ka maal bika, cash aur udhaar dono.
- **Gross Profit:** Sale me se sirf bike hue maal ki Cost nikaal dein. Ye batata hai ke maal bechne se kitna bacha.
- **Net Profit:** Gross Profit me se dukaan ke saare Expense nikaal dein: kiraya, bijli, staff ki tankhwah, chai, transport, mobile package. Yahi asal munafa hai.

Ek aham baat: Cost sirf us maal ki ginein jo **bika**, poore mahine ki khareed ki nahi. Agar aap ne 5 lakh ka maal khareeda aur 4 lakh ki Cost ka bika, to baqi 1 lakh shelf par Stock hai, nuqsan nahi.`),
    table('Misaal: ek kiryana store ka ek mahina', 'Ye raqamein sirf tareeqa samjhane ke liye hain. Apni dukaan ki raqamein daal kar yahi hisaab karein.', [
      { key: 'amount', label: 'Raqam (rupay)' },
      { key: 'note', label: 'Note' },
    ], [
      ['Kul Sale', '6,00,000', 'Cash + JazzCash/Easypaisa + udhaar'],
      ['Bike hue maal ki Cost', '5,10,000', 'Sirf jo bika, us ki khareed qeemat'],
      ['Gross Profit', '90,000', 'Sale - Cost (margin 15%)'],
      ['Kiraya', '25,000', 'Expense'],
      ['Bijli', '9,000', 'Expense'],
      ['Ek helper ki tankhwah', '30,000', 'Expense'],
      ['Chai, transport, mobile', '6,000', 'Expense'],
      ['Net Profit', '20,000', 'Gross Profit - Expense'],
    ]),
    prose(`Is misaal me Sale 6 lakh hai lekin asal munafa sirf 20 hazar. Agar is mahine 15,000 ka maal expire ya zaaya hua, ya 10,000 ka udhaar wapas na aaya, to munafa aadha reh jata hai. Isi liye sirf Sale dekh kar khush hona khatarnak hai.

## Margin aur markup ka farq

Agar ek cheez 80 rupay me khareedi aur 100 me bechi, to 20 rupay Profit hai:

- **Markup** (Cost par): 20 ÷ 80 = 25%
- **Margin** (Sale par): 20 ÷ 100 = 20%

Dukaandar aksar "25% laga kar bechta hoon" kehte hain aur samajhte hain ke 25% munafa hai, jab ke Sale par ye 20% hai. Qeemat rakhte waqt ye farq yaad rakhein. [Profit margin calculator](/tools/profit-margin-calculator) dono khud nikaal deta hai.`),
    steps('Munafa chhupane wali paanch ghaltiyan', [
      ['Galle se ghar ka kharcha', 'Ghar ke liye nikla paisa Expense me nahi likha, aur galla hamesha kam lagta hai.'],
      ['Purani Cost', 'Supplier ne qeemat barha di, lekin aap ki qeemat wahi. Margin chupke se kam ho gaya.'],
      ['Udhaar ko Profit samajhna', 'Udhaar par bika maal Sale me hai lekin paisa abhi nahi aaya. Purana udhaar kabhi kabhi aata hi nahi.'],
      ['Zaaya maal na likhna', 'Toota, expire ya chori hua maal Cost me nahi gaya, to Profit asal se zyada dikhta hai.'],
      ['Apni tankhwah na ginna', 'Malik ka apna waqt bhi kharcha hai. Net Profit apni mehnat se kam ho to sochna padega.'],
    ]),
    shot({
      heading: 'Har cheez ka Profit, Nafaa me',
      body: 'Nafaa har bill par us cheez ki Cost saath rakhta hai, is liye Profit report har product ka Profit aur margin dikhati hai, category, brand, supplier ya staff ke hisaab se, aur upar Expense ke baad asal Profit.',
      id: SHOT.profitByProduct,
      url: 'app.nafaa.pk/reports/profit',
      layout: 'full',
      callouts: [
        { x: 55, y: 20, label: 'Expense ke baad Profit' },
        { x: 45, y: 48, label: 'Category, brand, supplier, staff' },
        { x: 85, y: 59, label: 'Har cheez ka Profit' },
        { x: 95, y: 59, label: 'Margin' },
      ],
    }),
    shot({
      heading: 'Poore mahine ka P&L',
      body: 'Sale, bike maal ki Cost, Gross Profit, Expense aur Net Profit: din, mahine ya saal ka, pichhle mahine ke muqable me. A4 par print ya CSV me download.',
      id: SHOT.profitLoss,
      url: 'app.nafaa.pk/reports/pnl',
      layout: 'split-left',
    }),
    prose(`## Aage parhein

Profit ka formula aur misaalein English me [how to calculate profit margin](/blog/how-to-calculate-profit-margin) aur P&L parhne ka tareeqa [how to read a profit and loss report](/blog/how-to-read-profit-and-loss-report) me hain. Qeemat rakhne ke usool [pricing strategy for a small shop](/blog/pricing-strategy-small-shop) me, aur kitni Sale par kharcha poora hota hai, ye free [break-even calculator](/tools/break-even-calculator) batata hai.

Nafaa ki saari reports [reports](/product/reports) par hain. Rozana hisaab rakhne ka tareeqa [dukaan ka hisaab rakhne wali app](/dukaan-ka-hisaab-app) par, aur Stock me phansa paisa kaise dekhein, ye [stock ka hisaab app](/stock-ka-hisaab-app) par.`),
  ],
  faqs: [
    ['Dukaan ka munafa nikaalne ka formula kya hai?', 'Net Profit = Sale - bike hue maal ki Cost - saare Expense. Pehle Sale me se sirf bike maal ki khareed qeemat nikaalein, ye Gross Profit hai. Phir kiraya, bijli, tankhwah aur baqi kharche nikaalein. Jo bache woh asal munafa hai. Nafaa ye hisaab har bill se khud karta hai.'],
    ['Kiryana store me kitna munafa hota hai?', 'Har dukaan ka alag hota hai; ye maal ki qism, ilaqe aur kharchon par hai. Aam taur par roz ki cheezon par margin kam aur kuch cheezon par zyada hota hai. Andaze ke bajaye apni har cheez ka margin dekhein. Nafaa ki Profit report har cheez ka margin alag dikhati hai.'],
    ['Galla bhara hai phir bhi munafa kyun nahi?', 'Galle me supplier ka paisa, udhaar ki wapsi aur agle kharchon ka paisa bhi hota hai. Munafa tab hai jab bike maal ki Cost aur saare Expense nikaalne ke baad kuch bache. Ghar ka kharcha bhi galle se jata hai to woh bhi likhein, warna hisaab kabhi nahi milta.'],
    ['Margin aur markup me kya farq hai?', 'Markup Cost par hota hai, margin Sale par. 80 ki cheez 100 me bechi to Profit 20 hai: markup 25% aur margin 20%. Qeemat rakhte waqt log markup ginte hain aur margin samajhte hain. Free profit margin calculator dono khud nikaal deta hai.'],
    ['Har cheez ka alag Profit kaise pata chale?', 'Is ke liye har cheez ki Cost aur har bikri ka record chahiye, jo haath se bohat mushkil hai. Nafaa me product ke saath Cost save hoti hai, is liye har bill ke saath Profit banta hai, aur report har cheez, category ya supplier ka Profit aur margin dikhati hai.'],
  ],
  cta: { heading: 'Is mahine ka asal Profit dekhein', body: 'Products Cost ke saath daalein, ek hafta bill banayein, aur Profit report khud dekhein.' },
  relations: [
    { ref: 'PRODUCT:reports', kind: 'RELATED' },
    { ref: 'TOOL:profit-margin-calculator', kind: 'RELATED' },
    { ref: 'TOOL:break-even-calculator', kind: 'RELATED' },
    { ref: 'BLOG_POST:how-to-calculate-profit-margin', kind: 'RELATED' },
    { ref: 'BLOG_POST:how-to-read-profit-and-loss-report', kind: 'RELATED' },
    { ref: 'BLOG_POST:pricing-strategy-small-shop', kind: 'RELATED' },
    { ref: 'PAGE:dukaan-ka-hisaab-app', kind: 'RELATED' },
    { ref: 'PAGE:stock-ka-hisaab-app', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/modules/reports/pnl',
    'apps/web/src/modules/reports/center',
    'apps/web/src/modules/finance/expenses',
    'apps/web/src/modules/inventory/damage/components/DecideModal.tsx',
    'apps/web/src/modules/organization/settings/sections/ReportsSection.tsx',
  ],
  sortOrder: 15,
};

export default spec;
