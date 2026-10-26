/** /stock-ka-hisaab-app: "stock ka hisaab app". */

import { features, prose, shot, SHOT, steps } from '../../main-pages/_build';
import type { RomanSpec } from '../_roman';

const spec: RomanSpec = {
  slug: 'stock-ka-hisaab-app',
  title: 'Stock ka Hisaab Rakhne Wali App',
  summary:
    'How to keep stock records in a Pakistani shop, explained in simple Roman Urdu: opening stock, recording everything that comes in and goes out, a monthly count, the reorder-level formula and spotting dead stock. Includes free count sheets and calculators, and how Nafaa moves stock with every sale and purchase.',
  seoTitle: 'Stock ka Hisaab App: Kam Stock aur Ginti Aasaan',
  seoDescription:
    'Stock ka hisaab kaise rakhein: opening Stock, aamad-o-kharch, mahana ginti, reorder level aur pada hua maal. Free sheets aur Nafaa jo har bill se Stock kam kare.',
  focusKeyword: 'stock ka hisaab app',
  hero: {
    eyebrow: 'Stock ka hisaab',
    heading: 'Stock ka hisaab app: kya bacha hai, kya mangwana hai, kahan paisa phansa hai',
    sub: 'Har bill se Stock khud kam ho, har khareed se khud barhe, aur kam hone se pehle list ban jaye. Saath me har cheez ki Cost, Stock ki kul value, aur kaun sa maal mahinon se pada hai.',
    media: { id: SHOT.inventory, url: 'app.nafaa.pk/products' },
  },
  facts: [
    ['Bunyadi usool', 'Opening Stock + jo aaya - jo gaya = jo hona chahiye'],
    ['Ginti', 'Mahine me ek dafa poori, aur tez bikne wali cheezein hafte me'],
    ['Free madad', '[Stock take sheet](/templates/stock-take-sheet) aur [reorder level calculator](/tools/reorder-level-calculator)'],
    ['Nafaa me', 'Sale, khareed, wapsi, damage aur transfer se Stock khud update'],
  ],
  romanLine: 'Stock ka hisaab tab sahi rehta hai jab har aamad aur har kharch likha jaye. Nafaa me ye bill aur khareed ke saath khud hota hai.',
  body: [
    prose(`## Stock ka hisaab kaise rakhein

Stock ka hisaab ek seedha jor hai: **shuru ka Stock + jo maal aaya - jo maal gaya = jo shelf par hona chahiye.** Mushkil jor me nahi, likhne me hai. Maal teen chaar raaston se aata jata hai:

- **Aata hai:** supplier se khareed, customer ki wapsi, doosri branch se transfer.
- **Jata hai:** bikri, supplier ko wapsi, toota phoota ya expire maal (damage), ghar le jaya gaya saman.

In me se ek raasta bhi na likha jaye to ginti aur register kabhi nahi milenge. Sab se zyada jo bhoolta hai woh damage aur ghar ka saman hai. Ise "chori" samajhne se pehle dekhein ke likha gaya ya nahi.

## Kitna mangwayein: reorder level

Har cheez ki ek had rakhein jis par order dena hai. Aasaan formula:

**Reorder level = rozana ki average bikri x supplier ke maal laane ke din + thora safety Stock.**

Misaal: cooking oil roz 8 packet bikta hai, supplier 3 din me maal deta hai, aur 10 packet safety rakhte hain. To 8 x 3 + 10 = 34. Jab 34 packet reh jayein, order dein. Ye hisaab free [reorder level calculator](/tools/reorder-level-calculator) me khud ho jata hai.`),
    steps('Mahana Stock ginti ka tareeqa', [
      ['Din tay karein', 'Mahine ka ek din, dukaan khulne se pehle ya band hone ke baad, jab bikri na ho rahi ho.'],
      ['Shelf ke hisaab se ginein', 'Ek ek shelf, ek ek line. Free [stock take sheet](/templates/stock-take-sheet) print kar ke us par likhein.'],
      ['Farq dekhein', 'Ginti aur register ka farq har cheez par nikaalein. Chhota farq aam hai, bara farq ki wajah dhoondein.'],
      ['Wajah ke saath theek karein', 'Damage, ghar ka saman ya ghalat entry, jo bhi ho, wajah likh kar Stock theek karein.'],
      ['Pada maal alag karein', 'Jo cheez 90 din se nahi biki, us par Discount ya supplier se wapsi ki baat karein.'],
    ], undefined, true),
    shot({
      heading: 'Har cheez ka Stock, Cost aur margin',
      body: 'Nafaa ki products list Stock ki kul value Cost par, kam hone wali cheezon ki ginti, aur har cheez ki qeemat, Cost, margin aur bacha Stock dikhati hai. Kam Stock wali cheez par nishan lag jata hai.',
      id: SHOT.inventory,
      url: 'app.nafaa.pk/products',
      layout: 'full',
      callouts: [
        { x: 26, y: 19, label: 'Stock ki value Cost par' },
        { x: 45, y: 33, label: 'Kam hone wali cheezein' },
        { x: 27, y: 82, label: 'Qeemat, Cost aur margin' },
        { x: 96, y: 80, label: 'Bacha Stock, kam ho to nishan' },
      ],
    }),
    features('Nafaa me Stock kaise chalta hai', [
      ['receipt', 'Bill se kam', 'Har bikri Stock ko us ki unit ke hisaab se kam karti hai: piece, darjan, carton ya kilo.'],
      ['truck', 'Khareed se zyada', 'Supplier ka maal purchase me daalein, Stock aur Cost dono update.'],
      ['triangle-alert', 'Damage wajah ke saath', 'Toota, expire ya kharab maal wajah likh kar nikalein, taake ginti mile.'],
      ['arrow-left-right', 'Branch se branch', 'Ek dukaan se doosri ko maal bhejein; dono taraf Stock sahi.'],
      ['clipboard-list', 'Poori history', 'Har cheez ka har aana jana, tareekh aur wajah ke saath.'],
      ['file-spreadsheet', 'Ginti ek saath', 'Bulk editor me sau cheezon ki ginti ya qeemat ek saath badlein.'],
    ]),
    shot({
      heading: 'Khatam hone se pehle order',
      body: 'Kam Stock ki list batati hai ke har cheez kitne din chalegi, kitna mangwana chahiye aur us ki Cost kya hogi. Supplier ke hisaab se list ban jati hai aur order ya WhatsApp seedha yahan se.',
      id: SHOT.lowStock,
      url: 'app.nafaa.pk/low-stock',
      layout: 'split-left',
      callouts: [
        { x: 25, y: 19, label: 'Poore order ki Cost' },
        { x: 70, y: 60, label: 'Kitna mangwayein' },
        { x: 92, y: 12, label: 'Order banayein' },
      ],
    }),
    prose(`## Aage parhein

Stock ka poora nizaam English me [inventory management guide](/guides/inventory-management-small-business) me hai, aur ginti ka tafseeli tareeqa [stock taking guide](/blog/stock-taking-guide) me. Supplier ko order bhejne ka free [purchase order template](/templates/purchase-order-template) bhi hai.

Nafaa ka Stock wala hissa [inventory](/product/inventory) aur khareed wala [purchasing](/product/purchasing) kehlata hai. Hazaron cheezon wali dukaan ke liye [hardware store inventory](/blog/hardware-store-inventory-many-skus) parhein, aur dawai ki expiry ke liye [medical store software](/medical-store-software). Stock ka paisa Profit me kaise badalta hai, ye [dukaan ka munafa kaise nikalein](/dukaan-ka-munafa-kaise-nikalein) par hai.`),
  ],
  faqs: [
    ['Stock ka hisaab rakhne ki sab se aasaan app kaun si hai?', 'Aasaan woh hai jis me Stock alag se likhna na pade. Nafaa me bill banate hi Stock kam hota hai aur supplier ka maal purchase me daalte hi barh jata hai. Aap ko sirf mahine me ek dafa ginti karni hai. 7 din Free Trial me apni dukaan ki 100 cheezein daal kar dekhein.'],
    ['Stock aur galle ka hisaab kyun nahi milta?', 'Aksar wajah ye hoti hai ke kuch maal bina bill ke gaya: ghar ka saman, toota phoota, ya rush me bill nahi bana. Har aisi cheez wajah ke saath likhein. Nafaa me damage aur adjustment wajah ke saath hote hain, aur har cheez ki history se pata chalta hai ke farq kab aaya.'],
    ['Kitna Stock rakhna chahiye?', 'Itna ke supplier ka agla maal aane tak khatam na ho, aur itna zyada na ho ke paisa phansa rahe. Rozana bikri ko supplier ke dinon se zarb karein aur thora safety Stock jor dein. Nafaa ki kam Stock list ye hisaab khud kar ke batati hai kitna mangwana hai.'],
    ['Kya Excel se Stock ki list app me aa sakti hai?', 'Ji haan. Nafaa me poori list Excel ya CSV file se, ya spreadsheet se copy-paste kar ke aa jati hai. Save se pehle har line check hoti hai aur ghalti dikhai jati hai. Free product import template me columns pehle se bane hain.'],
    ['Do dukaanon ka Stock ek app me dekh sakte hain?', 'Haan. Nafaa me har branch ka Stock alag rehta hai lekin ek hi account me dikhta hai. Ek branch se doosri ko maal transfer karein to dono taraf Stock sahi ho jata hai. Malik har branch ki Stock value aur kam Stock ek jagah dekh sakta hai.'],
  ],
  cta: { heading: 'Stock ko khud chalne dein', body: 'Apni list Excel se daalein aur ek hafte me dekhein ke kya bik raha hai aur kya pada hai.' },
  relations: [
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
    { ref: 'PRODUCT:purchasing', kind: 'RELATED' },
    { ref: 'GUIDE:inventory-management-small-business', kind: 'RELATED' },
    { ref: 'TOOL:reorder-level-calculator', kind: 'RELATED' },
    { ref: 'TEMPLATE:stock-take-sheet', kind: 'RELATED' },
    { ref: 'TEMPLATE:purchase-order-template', kind: 'RELATED' },
    { ref: 'BLOG_POST:stock-taking-guide', kind: 'RELATED' },
    { ref: 'PAGE:dukaan-ka-munafa-kaise-nikalein', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/modules/inventory/products',
    'apps/web/src/modules/inventory/low-stock/components/ReorderView.tsx',
    'apps/web/src/modules/inventory/damage/components/DecideModal.tsx',
    'apps/web/src/modules/inventory/transfers/components/ReceiveModal.tsx',
    'apps/web/src/modules/inventory/stock-report/pages/StockReportPage.tsx',
    'apps/web/src/modules/inventory/products/pages/ProductBulkEditPage.tsx',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/web/src/modules/purchasing/purchases/editor/PurchaseEditorPage.tsx',
  ],
  sortOrder: 6,
};

export default spec;
