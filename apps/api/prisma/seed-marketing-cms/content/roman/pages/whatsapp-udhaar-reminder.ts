/** /whatsapp-udhaar-reminder: "WhatsApp par udhaar reminder". */

import { diagram, features, prose, shot, SHOT, steps, table } from '../../main-pages/_build';
import { flow, type RomanSpec } from '../_roman';

const spec: RomanSpec = {
  slug: 'whatsapp-udhaar-reminder',
  title: 'WhatsApp par Udhaar Reminder Kaise Bhejein',
  summary:
    'How to remind customers about udhaar on WhatsApp without losing them, in simple Roman Urdu: when to send, three sample messages from polite to final, what never to do, and how Nafaa writes the reminder with the customer\'s exact balance and sends it from your own WhatsApp in one tap, with no WhatsApp Business API.',
  seoTitle: 'WhatsApp par Udhaar Reminder: Message aur Tareeqa',
  seoDescription:
    'WhatsApp par udhaar reminder kaise bhejein: kab bhejein, narm se aakhri tak teen message, kya na karein, aur Nafaa jo balance ke saath message khud likhe.',
  focusKeyword: 'whatsapp par udhaar reminder',
  hero: {
    eyebrow: 'Udhaar ki yaad-dihani',
    heading: 'WhatsApp par udhaar reminder: izzat se maangein, paisa wapas layein',
    sub: 'Zyada tar customer bhool jate hain, bhagte nahi. Sahi waqt par, sahi lehje me, saaf raqam ke saath ek message aksar kaafi hota hai. Nafaa ye message customer ke naam aur baqi raqam ke saath khud likhta hai; aap sirf send dabate hain.',
    media: { id: SHOT.khataPhone, frame: 'phone' },
  },
  facts: [
    ['Kab', 'Mahine ki tankhwah ke aas paas, din ke waqt; raat ko nahi'],
    ['Lehja', 'Pehle narm, phir saaf tareekh, aakhir me seedha'],
    ['Message me', 'Naam, baqi raqam, aakhri bill ki tareekh aur payment ka tareeqa'],
    ['Nafaa me', 'Ek click, udhaar ki umar ke hisaab se lehja, aap ke apne WhatsApp se'],
    ['API', 'WhatsApp Business API ki zaroorat nahi'],
  ],
  romanLine: 'Udhaar ka reminder chhota, izzat wala aur saaf raqam ke saath ho. Nafaa udhaar ki umar dekh kar sahi lehja chunta hai aur message khud likhta hai.',
  body: [
    prose(`## Reminder kab bhejein

Waqt sab kuch hai. Ye chand aasaan usool hain:

- **Tankhwah ke din.** Mahine ki pehli se dasween tareekh tak aksar log paisa dete hain. Pehla reminder isi waqt.
- **Din ke waqt.** Subah das se shaam saat tak. Raat ko ya Jumma ki namaz ke waqt message bura lagta hai.
- **Ek hafte me ek dafa se zyada nahi.** Roz ka message customer ko door kar deta hai.
- **Bari khareed ke foran baad nahi.** Pehle customer ko ghar pohnchne dein.

Sab se zaroori: reminder hamesha akele customer ko, kabhi group me ya status par nahi. Kisi ka udhaar sab ke saamne lana rishta aur customer dono khatam kar deta hai.`),
    table('Teen message: narm se aakhri tak', 'Ye misaalein apne lafzon me badal lein. Raqam aur tareekh hamesha saaf likhein.', [
      { key: 'msg', label: 'Message ki misaal' },
      { key: 'aim', label: 'Maqsad' },
    ], [
      ['Narm (7 din se kam)', 'Assalam o alaikum Bilal bhai! Ummeed hai khairiyat se hain. Aap ka hisaab 3,450 rupay hai. Jab mauqa mile, de dijiye. Shukriya!', 'Yaad dilana; zyada tar log bas bhool jate hain'],
      ['Saaf (7 se 30 din)', 'Assalam o alaikum Bilal bhai, aap ka 3,450 rupay ka hisaab teen hafte se baqi hai. Bata dein kis tareekh tak de sakenge? JazzCash par bhi bhej sakte hain.', 'Ek pakki tareekh lena'],
      ['Aakhri (30 din se zyada)', 'Bilal bhai, 3,450 rupay ka hisaab ek mahine se zyada purana ho gaya hai. Is hafte ada kar dein, warna naya udhaar band karna parega. Shukriya.', 'Saaf faisla; naya udhaar band'],
    ]),
    diagram('Nafaa me reminder ka safar: khata kholein, customer chunein, WhatsApp khule, aap send dabayein, payment aaye to balance khud update.', flow([
      ['Khata kholein', 'notebook-pen'],
      ['Customer chunein', 'user'],
      ['WhatsApp khule, message likha hua', 'message-circle'],
      ['Aap send dabayein', 'send'],
      ['Payment likhein, balance update', 'circle-check'],
    ]), 'Ek click ka reminder'),
    features('Nafaa ka WhatsApp reminder', [
      ['bell-ring', 'Lehja khud', 'Udhaar 7 din se kam ho to narm, 7 se 30 din saaf, 30 se zyada aakhri message.'],
      ['message-square', 'Aap ke lafz', 'Teeno message ek dafa apne andaaz me likh lein; naam aur raqam Nafaa bharta hai.'],
      ['user', 'Bhai ya baji', 'Customer ke hisaab se sahi lafz, jaise bhai ya baji, khud lagta hai.'],
      ['users', 'Kai customer, ek ek kar ke', 'Udhaar walon ki list se har ek ko message, aur pata rehta hai kis ko bhej diya.'],
      ['smartphone', 'Apna number', 'Message aap ke apne WhatsApp se jata hai, customer aap ko pehchanta hai.'],
      ['shield-check', 'Koi API nahi', 'WhatsApp Business API ya mahana message kharcha nahi.'],
    ]),
    shot({
      heading: 'Kis ko reminder chahiye, ek nazar me',
      body: 'Khata udhaar ko umar ke hisaab se baant deta hai. Har customer ke saath WhatsApp ka button hai jo baqi raqam ke saath message tayyar kar deta hai, aur customer ka statement bhi ek tap par hai.',
      id: SHOT.khata,
      url: 'app.nafaa.pk/khata',
      layout: 'full',
      callouts: [
        { x: 48, y: 30, label: 'Udhaar kitna purana' },
        { x: 87, y: 55, label: 'Payment likhein' },
        { x: 94, y: 55, label: 'WhatsApp reminder aur statement' },
      ],
    }),
    steps('Bina app ke WhatsApp reminder kaise bhejein', [
      ['Number save karein', 'Customer ka number apne phone me us ke poore naam se save karein.'],
      ['Raqam pakki karein', 'Register se baqi raqam aur aakhri bill ki tareekh dobara jor kar dekhein. Ghalat raqam sab se bura reminder hai.'],
      ['Message likhein', 'Upar wali misaal se, naam aur raqam badal kar. JazzCash ya Easypaisa number bhi likh dein.'],
      ['Jawab ka intezar', 'Ek hafta. Jawab na aaye to agla, thora saaf message.'],
    ], 'Das customer tak ye haath se ho jata hai. Pachaas hon to app ke baghair mushkil hai.'),
    prose(`## Ye ghaltiyan na karein

- **Group ya status par udhaar ka zikr.** Kabhi nahi.
- **Andaze ki raqam.** "Kuch 3,000 ke qareeb" se behas shuru hoti hai. Saaf raqam likhein.
- **Gussa ya dhamki.** Aakhri message bhi seedha ho, bad-tameez nahi.
- **Payment ke baad shukriya na kehna.** Paisa aaye to chhota sa "shukriya" agle udhaar ko aasaan banata hai.

Udhaar ka poora nizaam [udhaar likhne wali app](/udhaar-likhne-wali-app) par hai, aur kitna udhaar purana ho chuka hai, ye free [khata ageing calculator](/tools/khata-ageing-calculator) batata hai. Nafaa ke WhatsApp features English me [WhatsApp & SMS](/product/whatsapp-sms) par hain, aur customers ko WhatsApp par wapas lane ke tareeqe [WhatsApp customer retention](/blog/whatsapp-customer-retention) aur [WhatsApp Business for shops](/blog/whatsapp-business-for-shops) me.`),
  ],
  faqs: [
    ['Udhaar maangne ke liye WhatsApp par kya likhein?', 'Salaam ke baad customer ka naam, baqi raqam aur ek narm guzarish, jaise "jab mauqa mile de dijiye". Der zyada ho to tareekh poochein. Message chhota rakhein aur raqam bilkul saaf. Nafaa ye message naam, raqam aur sahi lehje ke saath khud likh deta hai.'],
    ['Kya Nafaa khud WhatsApp message bhej deta hai?', 'Nahi, aur ye jaan boojh kar hai. Nafaa aap ka apna WhatsApp kholta hai jis me message likha hota hai, aur aap send dabate hain. Is liye message aap ke number se jata hai jise customer pehchanta hai, aur WhatsApp Business API ki zaroorat nahi.'],
    ['Ek saath bohat se customers ko udhaar reminder kaise bhejein?', 'Nafaa me udhaar walon ki list se WhatsApp list kholein. Har customer ke liye us ka apna message tayyar hota hai; ek bhejein to agla khul jata hai, aur list me nishan lag jata hai ke kis ko bhej diya. Ek ek kar ke, lekin minuton me.'],
    ['Customer reminder se naraaz ho jaye to?', 'Aksar naraazgi lehje se hoti hai, raqam se nahi. Pehla message hamesha narm rakhein, din ke waqt bhejein, aur kabhi group me nahi. Statement saath dein taake customer khud dekh le. Nafaa udhaar ki umar ke hisaab se lehja chunta hai, is liye naya udhaar wala customer sakht message nahi paata.'],
    ['Kya reminder ka message apni marzi ka likh sakte hain?', 'Ji haan. Nafaa me teeno reminder, narm, saaf aur aakhri, apne lafzon me ek dafa likh lein. Customer ka naam, baqi raqam aur bhai ya baji jaisa lafz har message me khud bhar jata hai. Dukaan ka naam bhi message me aata hai.'],
  ],
  cta: { heading: 'Is hafte ka pehla reminder Nafaa se', body: 'Udhaar walon ke balance daalein aur ek click me pehla narm reminder bhejein.' },
  relations: [
    { ref: 'PRODUCT:whatsapp-sms', kind: 'RELATED' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
    { ref: 'TOOL:khata-ageing-calculator', kind: 'RELATED' },
    { ref: 'BLOG_POST:whatsapp-customer-retention', kind: 'RELATED' },
    { ref: 'BLOG_POST:whatsapp-business-for-shops', kind: 'RELATED' },
    { ref: 'BLOG_POST:how-to-reduce-udhaar', kind: 'RELATED' },
    { ref: 'PAGE:udhaar-likhne-wali-app', kind: 'RELATED' },
    { ref: 'PAGE:khata-app', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/modules/customers/directory/messages.ts',
    'apps/web/src/modules/reports/customers-report/components/WhatsAppList.tsx',
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/core/lib/whatsapp/templates.ts',
  ],
  sortOrder: 14,
};

export default spec;
