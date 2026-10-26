/**
 * Roman Urdu search pages and their hub (/hisaab-kitaab). One file per page
 * under `pages/`, built by `_roman.ts`. Registered in content/index.ts.
 */

import type { SeedEntry, SeedFaq } from '../../lib/types';
import { features, prose, SHOT } from '../main-pages/_build';
import { HUB_SLUG, romanFaqs, romanPage, type RomanSpec } from './_roman';
import bakery from './pages/bakery-ka-hisaab';
import bill from './pages/bill-banane-wali-app';
import dukaanKaHisaab from './pages/dukaan-ka-hisaab-app';
import munafa from './pages/dukaan-ka-munafa-kaise-nikalein';
import freePos from './pages/free-pos-software-pakistan';
import kapre from './pages/kapre-ki-dukaan-software';
import khata from './pages/khata-app';
import kiryana from './pages/kiryana-store-software';
import medical from './pages/medical-store-software';
import mobile from './pages/mobile-shop-software';
import offline from './pages/offline-billing-software';
import restaurant from './pages/restaurant-billing-software';
import stock from './pages/stock-ka-hisaab-app';
import udhaar from './pages/udhaar-likhne-wali-app';
import whatsapp from './pages/whatsapp-udhaar-reminder';

/** Display order. */
const PAGES: RomanSpec[] = [
  dukaanKaHisaab, udhaar, khata, kiryana, bill, stock, medical, mobile,
  kapre, restaurant, bakery, freePos, offline, whatsapp, munafa,
];

const hub: RomanSpec = {
  slug: HUB_SLUG,
  title: 'Hisaab Kitaab: Dukaan ke Sawal, Aasaan Jawab',
  summary:
    'Practical answers in simple Roman Urdu to the questions Pakistani shop owners search for: keeping accounts, writing udhaar, making bills, counting stock and working out profit, plus what to look for in software for kiryana stores, medical stores, mobile shops, clothing shops, restaurants and bakeries.',
  seoTitle: 'Hisaab Kitaab: Dukaan ke Sawal, Roman Urdu me Jawab',
  seoDescription:
    'Dukaan ka hisaab, udhaar, bill, Stock aur Profit ke sawalon ke aasaan Roman Urdu jawab, aur kiryana, medical, mobile, kapre, restaurant aur bakery ke software.',
  focusKeyword: 'dukaan ka hisaab',
  hero: {
    eyebrow: 'Roman Urdu me',
    heading: 'Hisaab kitaab: dukaan ke har roz ke sawal, aasaan jawab',
    sub: 'Udhaar kaise likhein, bill kaise banayein, Stock ka hisaab kaise rakhein aur asal Profit kaise nikalein. Har safha pehle tareeqa samjhata hai, phir free tools batata hai, aur aakhir me dikhata hai ke Nafaa ye kaam kaise karta hai.',
    media: { id: SHOT.khataPhone, frame: 'phone' },
  },
  facts: [
    ['Kis ke liye', 'Har dukaandar aur chhote business wale jo apni zubaan me seedha jawab chahte hain'],
    ['Kya milega', 'Tareeqa, free tools aur templates, aur software chunne ki checklist'],
    ['English me', 'Tafseeli English pages ke links har safhe par hain'],
  ],
  romanLine: 'Yahan har sawal ka jawab aasaan Roman Urdu me hai. Business ke lafz jaise Sale, Profit, Cost aur Stock English me hi rakhe gaye hain.',
  body: [
    features('Hisaab, udhaar aur Profit', [
      ['notebook-pen', 'Dukaan ka hisaab rakhne wali app', 'Sale, Expense, khareed, udhaar aur Stock roz kaise likhein.', undefined, '/dukaan-ka-hisaab-app'],
      ['hand-coins', 'Udhaar likhne wali app', 'Udhaar likhne ke usool, had (limit) aur wapsi ka tareeqa.', undefined, '/udhaar-likhne-wali-app'],
      ['book-open', 'Khata app', 'Paper ka khata chhor kar digital khata par kaise aayein.', undefined, '/khata-app'],
      ['message-circle', 'WhatsApp par udhaar reminder', 'Yaad-dihani ka message kaisa ho aur kab bhejein.', undefined, '/whatsapp-udhaar-reminder'],
      ['receipt', 'Bill banane wali app', 'Bill par kya likha ho, printer kaun sa, aur WhatsApp bill.', undefined, '/bill-banane-wali-app'],
      ['boxes', 'Stock ka hisaab app', 'Stock ginti, kam Stock ka alert aur order kab dein.', undefined, '/stock-ka-hisaab-app'],
      ['trending-up', 'Dukaan ka munafa kaise nikalein', 'Sale, Cost aur Expense se asal Profit ka hisaab.', undefined, '/dukaan-ka-munafa-kaise-nikalein'],
      ['wifi-off', 'Offline billing software', 'Internet ya bijli jaye to bhi bill kaise bante rahein.', undefined, '/offline-billing-software'],
      ['badge-percent', 'Free POS software Pakistan', 'Free me kya milta hai, aur asal kharcha kahan hota hai.', undefined, '/free-pos-software-pakistan'],
    ]),
    features('Apne kaam ka software', [
      ['shopping-basket', 'Kiryana store ka software', 'Barcode, darjan-carton, udhaar aur Excel se products.', undefined, '/kiryana-store-software'],
      ['pill', 'Medical store software', 'Salt se dawai, batch aur expiry, aur nuskhe.', undefined, '/medical-store-software'],
      ['smartphone', 'Mobile shop ka software', 'IMEI, PTA status, purane phone, repair aur qist.', undefined, '/mobile-shop-software'],
      ['shirt', 'Kapre ki dukaan ka software', 'Size aur rang ka Stock, silai ke order aur exchange.', undefined, '/kapre-ki-dukaan-software'],
      ['utensils-crossed', 'Restaurant billing software', 'Tables, kitchen ki parchi (KOT), delivery aur split bill.', undefined, '/restaurant-billing-software'],
      ['cake-slice', 'Bakery ka hisaab', 'Cake orders, raw maal ki Cost, recipe aur waste.', undefined, '/bakery-ka-hisaab'],
    ]),
    prose(`## Ye safhe kyun?

Pakistan me zyada tar dukaandar Google par Roman Urdu me likhte hain: "udhaar likhne wali app", "bill banane wali app", "dukaan ka munafa kaise nikalein". In sawalon ke jawab aksar English me hote hain ya sirf kisi app ka ishtihaar hote hain. Yahan har safha pehle aap ka sawal hal karta hai, chahe aap koi app lein ya na lein: register me kaise likhein, kya ghalti na karein, aur kaun se [free tools](/tools) aur [templates](/templates) foran kaam aate hain.

Us ke baad har safha dikhata hai ke [Nafaa](/product/pos) wahi kaam kaise karta hai, asal screenshots ke saath. Tafseel English me chahiye to [guides](/guides), [FAQ](/faq) aur [industries](/industries) ke safhe dekhein.`),
  ],
  faqs: [],
  cta: { heading: 'Apni dukaan par aazma kar dekhein', body: '7 din Free Trial: apne products, apne customers, apna hisaab.' },
  relations: [
    { ref: 'PAGE:tools', kind: 'RELATED' },
    { ref: 'PAGE:templates', kind: 'RELATED' },
    { ref: 'PAGE:guides', kind: 'RELATED' },
  ],
  evidence: ['apps/web/src/modules/customers/directory/KhataBookPage.tsx', 'apps/web/src/modules/pos/engine/PosScreen.tsx'],
  sortOrder: 0,
};

export const romanEntries: SeedEntry[] = [romanPage(hub), ...PAGES.map(romanPage)];
export const romanFaqList: SeedFaq[] = PAGES.flatMap(romanFaqs);
