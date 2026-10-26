/** /medical-store-software: "medical store software". */

import { prose, shot, SHOT, steps, table } from '../../main-pages/_build';
import type { RomanSpec } from '../_roman';

const spec: RomanSpec = {
  slug: 'medical-store-software',
  title: 'Medical Store Software',
  summary:
    'What a medical store or pharmacy in Pakistan should look for in software, in simple Roman Urdu: finding medicines by salt and offering substitutes, batch and expiry tracking, selling by tablet, strip or box, prescriptions, the controlled-medicine register and family accounts. Includes a daily routine and how Nafaa handles each part.',
  seoTitle: 'Medical Store Software: Expiry, Salt aur Udhaar',
  seoDescription:
    'Medical store software kaise chunein: salt se dawai aur substitute, batch aur expiry, goli-patta-dabba, nuskhe, narcotic register aur family udhaar. Nafaa.',
  focusKeyword: 'medical store software',
  hero: {
    eyebrow: 'Medical store aur pharmacy',
    heading: 'Medical store software: expiry se pehle khabar, salt se substitute',
    sub: 'Dawai brand ya formula (salt) se dhoondein aur jo brand shelf par hai woh pesh karein. Goli, patta ya dabba me bechein, har batch ki expiry dekhein, aur narcotic register bill ke saath khud bharein.',
    media: { id: SHOT.pharmacyExpiry, url: 'app.nafaa.pk/pharmacy/expiring' },
  },
  facts: [
    ['Sab se zaroori', 'Expiry ka hisaab, salt se search, aur tez bill'],
    ['Units', 'Goli, patta (strip) aur dabba, har ek ki apni qeemat'],
    ['Register', 'Controlled dawai ka register patient aur doctor ke saath'],
    ['Udhaar', 'Mahana dawai wale ghar ka khata, WhatsApp reminder ke saath'],
    ['Qeemat', '7 din Free Trial, phir {{price:min.monthly}} mahana se'],
  ],
  romanLine: 'Medical store ka asal nuqsan expire dawai aur "nahi hai" kehne me hota hai. Nafaa expiry pehle batata hai aur same salt ka doosra brand dikhata hai.',
  body: [
    prose(`## Medical store ka software baqi dukaanon se alag kyun?

Kiryana ka software medical store par chal to jata hai, lekin teen jagah haar jata hai:

- **Expiry.** Dawai ki shelf life hoti hai. Har batch ki expiry na likhi ho to maal shelf par hi zaaya hota hai, aur expire dawai bik jaye to us se bhi bura.
- **Salt aur substitute.** Customer ek brand maangta hai jo khatam hai. Agar software same formula ke doosre brand dikha de to bikri bhi bachti hai aur customer bhi.
- **Goli, patta, dabba.** Ek hi dawai teen tarah bikti hai. Stock goli ke hisaab se sahi kam hona chahiye.

Is ke ilawa nuskhe (prescription), doctor ka record, controlled dawai ka register aur fridge ka temperature bhi medical store ka roz ka kaam hai.`),
    shot({
      heading: 'Kya khatam ho raha hai, kya expire hone wala hai',
      body: 'Nafaa ki kam Stock list expire hone wale maal ko khatam hone wali dawai ke saath dikhati hai: kitne din ka Stock bacha, aur kis distributor se kitna mangwana hai. Pharmacy ki expiry list har batch ko tareekh ke hisaab se, Cost aur sale value ke saath dikhati hai.',
      id: SHOT.pharmacyLowStock,
      url: 'app.nafaa.pk/low-stock',
      layout: 'full',
      callouts: [
        { x: 74, y: 30, label: 'Agle 30 din me expire' },
        { x: 57.5, y: 62, label: 'Kitne din ka Stock' },
        { x: 69.5, y: 70.5, label: 'Kya mangwayein, Cost ke saath' },
      ],
    }),
    steps('Medical store ka ek din, Nafaa ke saath', [
      ['Subah', 'Fridge ka temperature log me likhein aur expiry list kholein. 30 din ke andar wale batch distributor ko wapas ya jaldi bikri ke liye alag.'],
      ['Nuskha aaya', 'Patient aur doctor likhein, dawai dose aur quantity ke saath. Do salts aapas me takrayein to Nafaa khabar deta hai.'],
      ['Brand khatam', 'Salt search karein. Same formula ke doosre brand qeemat aur shelf Stock ke saath aa jate hain.'],
      ['Controlled dawai', 'Bill ke liye patient aur doctor zaroori; register ki line bill se khud likhi jati hai.'],
      ['Shaam', 'Fridge ka doosra reading, baqi nuskhe dekhein, aur galla milayein.'],
    ]),
    shot({
      heading: 'Family ka mahana khata',
      body: 'Bohat se ghar mahine ke aakhir me dawai ka hisaab dete hain. Nuskha patient ke khate par diya ja sakta hai, aur baqi raqam, us ki umar aur WhatsApp reminder ek tap par.',
      id: SHOT.pharmacyKhata,
      url: 'app.nafaa.pk/khata',
      layout: 'split-right',
      callouts: [
        { x: 25, y: 19.5, label: 'Kul udhaar' },
        { x: 89.5, y: 55.5, label: 'Payment ya reminder' },
      ],
    }),
    table('Register ya Nafaa?', 'Medical store ke bare kaam, kaghaz par aur Nafaa me.', [
      { key: 'paper', label: 'Kaghaz ke register' },
      { key: 'nafaa', label: 'Nafaa', highlight: true },
    ], [
      ['Substitute dhoondna', 'Pharmacist ki yaad-dasht', 'Same salt ke brand, qeemat aur Stock ke saath'],
      ['Expiry', 'Shelf dekh kar, kabhi kabhar', 'Har batch ki tareekh, 30 din pehle list me'],
      ['Narcotic register', 'Haath se, baad me', 'Bill ke saath khud, opening aur closing balance'],
      ['Fridge ka temperature', 'Kaghaz ki sheet', 'Din me do reading, record mehfooz'],
      ['Family udhaar', 'Alag register', 'Patient ka khata, WhatsApp reminder'],
    ]),
    prose(`## Software chunte waqt ye poochein

- Kya dawai **salt (formula)** se dhoondi ja sakti hai, aur substitute **shelf Stock** ke saath dikhta hai?
- Kya har **batch ki expiry** alag rakhi ja sakti hai, aur expiry se pehle list banti hai?
- Kya **goli, patta aur dabba** ki alag qeemat ho sakti hai?
- Kya **controlled dawai** ka record bill ke saath banta hai?
- Kya **internet ke baghair** bill banta hai? Raat ki duty aur load-shedding me ye zaroori hai.

Nafaa in sab ka jawab haan me deta hai; tafseel English me [pharmacy software](/industries/pharmacy) par hai. Expiry kam karne ke tareeqe [pharmacy expiry management](/blog/pharmacy-expiry-management) me hain, aur medical store kholne ka poora tareeqa [how to start a pharmacy](/blog/how-to-start-a-pharmacy-pakistan) me. Qawaid aur license ki baat ke liye hamara English safha [DRAP kya hai](/glossary/drap) dekhein, aur aakhri baat hamesha apne drug inspector ya DRAP se poochein.

Udhaar ke usool [udhaar likhne wali app](/udhaar-likhne-wali-app) par, aur Stock ginti ka tareeqa [stock ka hisaab app](/stock-ka-hisaab-app) par hai.`),
  ],
  faqs: [
    ['Medical store ke liye kaun sa software achha hai?', 'Woh jo expiry ka hisaab rakhe, dawai salt se dhoonde, goli-patta-dabba me beche aur controlled dawai ka register bill ke saath bhare. Nafaa ye sab karta hai, aur udhaar ka khata aur offline bill bhi saath hai. 7 din Free Trial me apne store par aazma lein.'],
    ['Software me dawai ki expiry kaise pata chalti hai?', 'Maal aate waqt har batch ki expiry tareekh likhi jati hai. Nafaa expiry list me har batch tareekh ke hisaab se aata hai, aur 30 din ke andar wale alag dikhte hain, Cost aur sale value ke saath. Is se distributor ko waqt par wapas kar sakte hain.'],
    ['Kya salt ka naam likh kar dawai mil jati hai?', 'Ji haan. Nafaa me dawai brand ke naam se bhi aur formula (salt) se bhi dhoondi ja sakti hai. Mangi hui dawai khatam ho to same salt ke doosre brand un ki qeemat aur shelf par Stock ke saath dikh jate hain, taake aap customer ko wahi de sakein jo maujood hai.'],
    ['Goli aur patta alag alag kaise bechein?', 'Har dawai ki units banayein: goli, patta aur dabba, aur har ek ki apni qeemat. Counter par jo unit bike woh chunein; Stock goli ke hisaab se sahi kam hota hai. Is tarah do goliyan ya aadha patta bechne par bhi Stock aur hisaab nahi bigarta.'],
    ['Kya Nafaa narcotic register rakhta hai?', 'Nafaa me controlled aur narcotic dawai ki bikri par patient aur doctor ki tafseel zaroori hai, aur register ki line bill se khud banti hai, opening aur closing balance ke saath. Qanooni taur par kya zaroori hai, woh apne drug inspector ya DRAP se tasdeeq karein.'],
  ],
  cta: { heading: 'Expiry ka nuqsan is mahine se band', body: 'Apni dawaiyan batch aur expiry ke saath daalein aur pehli expiry list dekhein.' },
  relations: [
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
    { ref: 'BLOG_POST:pharmacy-expiry-management', kind: 'RELATED' },
    { ref: 'BLOG_POST:how-to-start-a-pharmacy-pakistan', kind: 'RELATED' },
    { ref: 'COMPLIANCE:drap-pharmacy', kind: 'RELATED' },
    { ref: 'PAGE:stock-ka-hisaab-app', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/industries/pharmacy/PharmacyPack.tsx',
    'apps/web/src/industries/pharmacy/pages/ExpiringPage.tsx',
    'apps/web/src/industries/pharmacy/api/substitutes.api.ts',
    'apps/web/src/industries/pharmacy/pages/SaltsPage.tsx',
    'apps/web/src/industries/pharmacy/api/interactions.api.ts',
    'apps/web/src/industries/pharmacy/pages/NewPrescriptionPage.tsx',
    'apps/web/src/industries/pharmacy/pages/ControlledLogPage.tsx',
    'apps/web/src/industries/pharmacy/pages/TemperatureLogPage.tsx',
    'apps/web/src/industries/pharmacy/pos/config.ts',
  ],
  sortOrder: 7,
};

export default spec;
