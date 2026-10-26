/** /offline-billing-software: "offline billing software". */

import { diagram, prose, shot, SHOT, steps, table } from '../../main-pages/_build';
import type { RomanSpec } from '../_roman';

const spec: RomanSpec = {
  slug: 'offline-billing-software',
  title: 'Offline Billing Software',
  summary:
    'What offline billing really means for a Pakistani shop, in simple Roman Urdu: the difference between desktop-only, online-only and offline-first software, what must keep working when the internet or power goes, a simple power-backup setup for the counter, and how Nafaa keeps bills, receipts and khata entries on the device and syncs them later.',
  seoTitle: 'Offline Billing Software: Internet Jaye, Bill Na Ruke',
  seoDescription:
    'Offline billing software: internet ya bijli jaye to bhi bill, parchi aur udhaar chalte rahein, phir khud sync. Desktop, online aur offline-first ka farq. Nafaa.',
  focusKeyword: 'offline billing software',
  hero: {
    eyebrow: 'Bina internet billing',
    heading: 'Offline billing software: internet jaye, counter na ruke',
    sub: 'Load-shedding, kamzor signal ya router band: Nafaa me bill bante rehte hain, parchi chhapti hai aur udhaar likha jata hai. Internet wapas aate hi sab khud account me chala jata hai.',
    diagram: {
      kind: 'offline-sync',
      labels: { device: 'Aap ka counter', queue: 'Device par line', cloud: 'Nafaa account', branch: 'Doosri branch', offline: 'Offline', synced: 'Sync ho gaya' },
    },
  },
  facts: [
    ['Offline chalta hai', 'Bill, parchi, udhaar aur wapsi ki payment, naye customer, Expense'],
    ['Device par', 'Products, qeematein, customers aur settings ki copy'],
    ['Sync', 'Internet aate hi khud; jo nahi gaya woh kabhi delete nahi hota'],
    ['Internet chahiye', 'Manager PIN wale kaam, jaise refund, internet ka intezar karte hain'],
    ['Chalta hai', 'Phone, tablet, computer browser aur Windows desktop app'],
  ],
  romanLine: 'Offline billing ka matlab hai ke internet jane par bhi bill, parchi aur udhaar chalte rahein. Nafaa ye sab device par rakhta hai aur baad me khud sync karta hai.',
  body: [
    prose(`## Teen qism ke billing software

Pakistan me internet din me kai dafa jata hai: load-shedding, market me kamzor signal, ya router ka restart. Is liye billing software chunte waqt sab se pehla sawal ye hona chahiye ke internet jane par kya hota hai. Software teen qism ke hote hain:

1. **Sirf desktop (computer par install).** Internet ke baghair chalta hai, lekin data usi ek computer me hai. Computer kharab ho to hisaab gaya, aur ghar se dekhna ya doosri branch se jorna mushkil.
2. **Sirf online (cloud).** Har jagah se dikhta hai, lekin internet gaya to counter band. Rush ke waqt ye sab se mehnga padta hai.
3. **Offline-first.** Counter device se chalta hai aur jab internet ho, account se baat karta hai. Dono ka faida: counter nahi rukta, aur data account me mehfooz.

Nafaa teesri qism ka hai.`),
    steps('Internet jane par Nafaa me kya hota hai', [
      ['Counter par kuch nahi badalta', 'Cashier scan aur bill karta rehta hai; upar ek chhota nishan batata hai ke aap offline hain.'],
      ['Bill mehfooz', 'Har bill apne number ke saath device par save hota hai, aur parchi aam tarah chhapti hai.'],
      ['Internet wapas', 'Ruke hue bill aur tabdeeliyan tarteeb se khud account me jati hain. Koi button nahi dabana.'],
      ['Sab barabar', 'Sync ke baad reports, Stock aur doosri branches update ho jati hain.'],
    ]),
    shot({
      heading: 'Wahi counter, online ho ya offline',
      body: 'Search, scan, quick keys, units, Discount, split payment aur parchi, sab device ki copy se chalte hain. Upar dikhta hai ke aap online hain ya nahi, aur kitne bill sync ke intezar me hain.',
      id: SHOT.pos,
      url: 'app.nafaa.pk/pos',
      layout: 'full',
      callouts: [
        { x: 30, y: 12, label: 'Online ya offline ka nishan' },
        { x: 82, y: 3, label: 'Sync ka haal' },
        { x: 30, y: 21, label: 'Device se search aur scan' },
        { x: 85, y: 86, label: 'Bill aur parchi chalte rahein' },
      ],
    }),
    table('Bina internet kya chalta hai', 'Counter ka zyada tar kaam device se hota hai. Kuch kaam jaan boojh kar server par check hote hain, is liye internet ka intezar karte hain.', [
      { key: 'offline', label: 'Bina internet', highlight: true },
      { key: 'note', label: 'Note' },
    ], [
      ['Bill aur parchi', 'Haan', 'Device par save, baad me sync'],
      ['Udhaar aur wapsi ki payment', 'Haan', 'Customer ka balance device par foran update'],
      ['Naye customer aur product tabdeeli', 'Haan', 'Internet aate hi tarteeb se jati hain'],
      ['Expense', 'Haan', 'Din ke hisaab me aam tarah'],
      ['Refund aur PIN wale kaam', 'Intezar', 'Manager PIN server check karta hai'],
      ['Doosri branch ko bikri dikhna', 'Sync ke baad', 'Bill account me pohnchte hi'],
    ]),
    prose(`## Bijli ke liye counter ka chhota sa intezam

Offline software internet ka masla hal karta hai, bijli ka nahi. Counter ko chalta rakhne ke liye ye kaafi hai:

- **Laptop ya phone** jis ki battery ho. Desktop computer ho to chhota UPS.
- **Thermal printer** ko UPS par lagayein, ya zaroorat ho to bill WhatsApp par bhej dein.
- **Router** bhi UPS par ho, taake bijli jane par internet bhi kuch der chale. Na chale to Nafaa offline chalta rahega.
- **Mobile hotspot** backup ke taur par, jab router band ho.

Load-shedding me billing ka tafseeli tareeqa English me [load-shedding proof billing](/blog/load-shedding-proof-billing) par hai.`),
    shot({
      heading: 'Phone par bhi offline',
      body: 'Nafaa phone par bhi wahi kaam karta hai. Ek dafa login ho chuka device bina internet counter khol leta hai, aur din bhar ke bill phone par mehfooz rehte hain.',
      id: SHOT.posPhone,
      frame: 'phone',
      layout: 'split-left',
    }),
    prose(`## Offline software chunte waqt ye poochein

- Kya internet ke baghair **naya bill aur parchi** dono bante hain?
- Kya **udhaar ki entry** offline hoti hai, ya sirf cash bill?
- Do counter ek waqt offline hon to **bill number takrate** to nahi? Nafaa me har device ka apna code hota hai.
- Offline bikri ke waqt Stock khatam ho chuka ho to kya hota hai? Nafaa aisa bill **Sync Center** me rok kar dikhata hai, phenkta nahi.
- Kya device ka **backup** liya ja sakta hai? Nafaa har hafte yaad dilata hai.

Poori tafseel English me [offline POS](/product/offline-pos) par hai. Purana data laane ka tareeqa [data migration](/services/data-migration) par, aur bill ki tafseel [bill banane wali app](/bill-banane-wali-app) par.`),
  ],
  faqs: [
    ['Kya Nafaa bina internet ke chalta hai?', 'Haan. Internet jane par bhi bill bante hain, parchi chhapti hai, udhaar aur payment likhi jati hai, aur Expense bhi. Ye sab device par mehfooz rehta hai aur internet aate hi khud account me chala jata hai. Sirf refund jaise PIN wale kaam internet ka intezar karte hain.'],
    ['Offline bill internet aane ke baad kahan jate hain?', 'Device par line me khare bill tarteeb se aap ke Nafaa account me chale jate hain, khud, bina koi button dabaye. Sync Center me dikhta hai ke kaun se bill pohnch gaye aur kaun se baqi hain. Jo bill nahi gaya woh kabhi delete nahi hota.'],
    ['Kya pehli dafa login ke liye internet chahiye?', 'Haan, pehli dafa device par login internet se hota hai, taake products aur customers ki copy device par aa jaye. Us ke baad woh device bina internet bhi counter khol leta hai. Isi liye naya phone ya computer internet hone par hi tayyar karein.'],
    ['Load-shedding me computer band ho jaye to bill ka kya?', 'Jo bill ban chuke woh device par save hain, bijli wapas aane par wahin milenge aur internet se sync ho jayenge. Behtar hai counter laptop ya phone par ho jis ki battery ho, ya computer ke saath chhota UPS lagayein, taake bill banta rahe.'],
    ['Desktop software aur offline Nafaa me kya farq hai?', 'Desktop software ka data ek computer me hota hai; woh kharab hua to data gaya, aur ghar se dekh nahi sakte. Nafaa offline bhi chalta hai lekin data aap ke account me bhi jata hai, is liye phone se bhi dikhta hai aur kai branches jur sakti hain.'],
  ],
  cta: { heading: 'Aazma kar dekhein: Wi-Fi band karein aur bill banayein', body: '7 din Free Trial me apne counter par offline billing khud check karein.' },
  relations: [
    { ref: 'PRODUCT:offline-pos', kind: 'RELATED' },
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
    { ref: 'BLOG_POST:load-shedding-proof-billing', kind: 'RELATED' },
    { ref: 'ALTERNATIVE:desktop-pos-alternative', kind: 'RELATED' },
    { ref: 'PAGE:bill-banane-wali-app', kind: 'RELATED' },
    { ref: 'PAGE:free-pos-software-pakistan', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/core/lib/offline/offlineKhata.ts',
    'apps/web/src/core/lib/offline/offlineAuth.ts',
    'apps/web/src/core/lib/offline/offlineDevice.ts',
    'apps/web/src/core/lib/offline/syncEngine.ts',
    'apps/web/src/core/lib/offline/ui/SyncCenterPage.tsx',
    'apps/web/src/core/lib/offline/offlineAutoBackup.ts',
    'apps/web/src/modules/finance/expenses/api/expenses.api.ts',
  ],
  sortOrder: 13,
};

export default spec;
