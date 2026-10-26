/** /restaurant-billing-software: "restaurant billing software". */

import { features, prose, shot, SHOT, steps, table } from '../../main-pages/_build';
import type { RomanSpec } from '../_roman';

const spec: RomanSpec = {
  slug: 'restaurant-billing-software',
  title: 'Restaurant Billing Software',
  summary:
    'What a restaurant, cafe or dhaba in Pakistan needs from billing software, in simple Roman Urdu: table and running bills, kitchen order tickets (KOT), takeaway and delivery with riders, add-ons, split bills, and dish cost from recipes. Includes the leaks to close first and how Nafaa runs each part.',
  seoTitle: 'Restaurant Billing Software: Tables, KOT aur Delivery',
  seoDescription:
    'Restaurant billing software: table ka running bill, kitchen KOT, takeaway aur delivery, add-ons, split bill aur recipe se dish ki Cost. Dhaba, cafe ke liye.',
  focusKeyword: 'restaurant billing software',
  hero: {
    eyebrow: 'Restaurant, cafe aur dhaba',
    heading: 'Restaurant billing software: table se kitchen tak, bina parchi gum huay',
    sub: 'Waiter table kholta hai aur order seedha kitchen ke printer ya screen par. Dine-in, takeaway aur delivery ek jagah, bill cash, card, wallet ya split me, aur har dish ki asal Cost recipe se.',
    media: { id: SHOT.tables, url: 'app.nafaa.pk/restaurant/tables' },
  },
  facts: [
    ['Sab se zaroori', 'Har order ka KOT, taake kitchen me bina bill ke kuch na bane'],
    ['Order ki qism', 'Dine-in (table), takeaway aur delivery, ek hi screen'],
    ['Bill', 'Cash, card, JazzCash, Easypaisa, split ya khata'],
    ['Kitchen', 'Har station (grill, karahi, chai) ka apna printer ya screen'],
    ['Cost', 'Recipe se har plate ki Cost aur food cost'],
  ],
  romanLine: 'Restaurant me paisa wahan nikalta hai jahan order likha nahi jata. Nafaa har order ko KOT bana kar kitchen bhejta hai aur bill usi se banta hai.',
  body: [
    prose(`## Restaurant me paisa kahan se nikalta hai

Restaurant ka hisaab kiryana se mushkil hai, kyunki yahan maal bik kar nahi, ban kar jata hai. Chaar jagah aksar nuqsan hota hai:

- **Bina parchi ka order.** Waiter zubani kitchen ko keh deta hai, plate jati hai, bill me nahi aati.
- **Table ka bill ghalat.** Beech me add hui chai ya roti bhool jati hai, ya do tables ke bill mil jate hain.
- **Delivery ka hisaab.** Rider ke paas kitna cash hai aur kaun sa order kahan gaya, shaam tak saaf nahi hota.
- **Plate ki Cost ka pata nahi.** Qeemat andaze se rakhi, aur ghee, gosht ki qeemat barh gayi to Profit chupke se kam.

Achha billing software in charon ko band karta hai: har order KOT ke zariye kitchen jaye, har table ka running bill ho, rider ka hisaab alag ho, aur recipe se plate ki Cost nikle.`),
    shot({
      heading: 'Poora hall ek nazar me',
      body: 'Tables ki screen par har table ka running bill, mehman aur waqt dikhta hai, sections jaise family hall ya rooftop ke saath. Booking wali table alag nishan ke saath.',
      id: SHOT.tables,
      url: 'app.nafaa.pk/restaurant/tables',
      layout: 'full',
      callouts: [
        { x: 25, y: 19, label: 'Hall me chalte bill' },
        { x: 31, y: 39, label: 'Family, hall, rooftop' },
        { x: 24, y: 55, label: 'Mehman, waqt aur bill' },
        { x: 65, y: 92, label: 'Booking ke liye rakhi table' },
      ],
    }),
    steps('Nafaa me ek order ka safar', [
      ['Table kholein', 'Waiter tablet ya counter se table kholta hai aur dishes add-ons ke saath daalta hai, jaise extra cheese ya kam mirch.'],
      ['KOT kitchen ko', 'Order khud har station ke printer ya screen par chala jata hai: karahi wala karahi dekhe, chai wala chai.'],
      ['Kitchen ready kare', 'Kitchen screen par dikhta hai kitne minute hue; dish ready hote hi ek tap.'],
      ['Bill aur payment', 'Running bill se final bill: cash, card, wallet, ya mehmanon me split.'],
    ], undefined, true),
    shot({
      heading: 'Kitchen ki screen',
      body: 'Naye, pakte hue, ready aur 20 minute se purane order alag. Har ticket par waqt aur order ki qism: dine-in, takeaway ya delivery.',
      id: SHOT.kot,
      url: 'app.nafaa.pk/restaurant/kot',
      layout: 'split-right',
      callouts: [
        { x: 30, y: 18, label: 'Naya, pak raha, ready' },
        { x: 41, y: 31, label: 'Kitne minute hue' },
        { x: 67, y: 52, label: 'Ready par ek tap' },
      ],
    }),
    features('Restaurant ke liye aur kya', [
      ['utensils-crossed', 'Add-ons', 'Dish ke saath extra cheezein aur un ki qeemat, menu me ek dafa.'],
      ['bike', 'Riders aur delivery', 'Delivery order rider ko, aur har rider ke paas kitna cash baqi hai, alag.'],
      ['chef-hat', 'Recipe aur Cost', 'Har dish ki recipe se plate ki Cost aur food cost.'],
      ['clock', 'Happy hour', 'Khaas waqt par khaas qeemat, khud lagti hai.'],
      ['split', 'Split bill', 'Ek table ka bill mehmanon me barabar baant dein, ya do tareeqon se payment.'],
      ['wifi-off', 'Internet ke baghair', 'Bill aur parchi chalti rehti hain, baad me sync.'],
    ]),
    shot({
      heading: 'Kaun si dish kama rahi hai',
      body: 'Menu ki screen har dish ki plate Cost aur food cost dikhati hai, aur ye bhi ke Stock kitni plates ke liye kaafi hai. Jo dish Profit nahi de rahi woh upar aa jati hai.',
      id: SHOT.restaurantMenu,
      url: 'app.nafaa.pk/restaurant/menu',
      layout: 'split-left',
      callouts: [
        { x: 66, y: 30, label: 'Dhyan wali dishes' },
        { x: 64, y: 67, label: 'Plate Cost aur food cost' },
        { x: 70, y: 67, label: 'Stock kitni plates ka' },
      ],
    }),
    table('Dhaba, cafe ya bara restaurant?', 'Nafaa sab par chalta hai; farq sirf is me hai ke kya kya istemal karein.', [
      { key: 'use', label: 'Kya istemal karein' },
      { key: 'kit', label: 'Saman' },
    ], [
      ['Dhaba ya takeaway', 'Counter aur menu ke quick keys', 'Phone ya computer, ek 80 mm printer'],
      ['Cafe', 'Counter, tables aur add-ons', 'Counter ka computer, kitchen ki ek screen'],
      ['Family restaurant', 'Tables, sections aur har station ka KOT', 'Waiter tablets, har station ka printer'],
      ['Delivery wala kitchen', 'Delivery orders aur riders', 'Counter aur kitchen screen'],
    ]),
    prose(`## Free madad aur aage parhein

Dish ki qeemat rakhne se pehle us ki Cost nikaalein: free [food cost calculator](/tools/food-cost-calculator) me ingredients ki qeemat daal kar plate Cost aur food cost percentage mil jata hai. KOT ka poora nizaam English me [restaurant KOT system guide](/blog/restaurant-kot-system-guide) me hai, aur menu ki qeemat aur jagah ka hisaab [restaurant menu engineering](/blog/restaurant-menu-engineering) me.

Nafaa restaurant ke liye kya kya karta hai, poori tafseel [restaurant software](/industries/restaurant) aur [restaurants solution](/solutions/restaurants) par. Bakery ya mithai ki dukaan ho to [bakery ka hisaab](/bakery-ka-hisaab) dekhein, aur bijli jane par billing ke liye [offline billing software](/offline-billing-software).`),
  ],
  faqs: [
    ['Restaurant ke liye kaun sa billing software achha hai?', 'Woh jo har order ko KOT bana kar kitchen bheje, table ka running bill rakhe, takeaway aur delivery saath chalaye aur dish ki Cost bataye. Nafaa ye sab karta hai, aur internet ke baghair bhi bill banata hai. 7 din Free Trial me apna menu daal kar dekhein.'],
    ['KOT kya hota hai aur kyun zaroori hai?', 'KOT yaani Kitchen Order Ticket: har order ki parchi jo kitchen ko jati hai. Is ke baghair kitchen zubani order par khana banata hai aur kuch plates bill me nahi aatin. Nafaa me har order khud KOT ban kar sahi station ke printer ya screen par jata hai.'],
    ['Kya waiter mobile ya tablet se order le sakta hai?', 'Ji haan. Waiter tablet ya phone par table khol kar dishes add-ons ke saath daalta hai aur order bhej deta hai, counter tak chalne ki zaroorat nahi. Order seedha kitchen jata hai aur table ka running bill update ho jata hai.'],
    ['Ek table ka bill alag alag kaise karein?', 'Nafaa me running bill ko mehmanon me barabar baant sakte hain, ya ek bill ki payment do tareeqon se le sakte hain, jaise kuch cash aur kuch card ya JazzCash. Har hissa bill me saaf likha jata hai aur din ki report me sahi jagah jata hai.'],
    ['Dhabe ke liye bhi ye software theek hai?', 'Haan. Dhabe par tables ki zaroorat na ho to sirf counter chalayein: menu ke quick keys, ek tap me bill, aur 80 mm parchi. Baad me tables, kitchen printer ya delivery chahiye to wahi software me chalu kar lein. Phone ya ek sasta computer kaafi hai.'],
  ],
  cta: { heading: 'Apna menu daalein, pehla KOT bhejein', body: '7 din Free Trial: tables, kitchen aur bill ek din me chalu.' },
  relations: [
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'SOLUTION:restaurants', kind: 'RELATED' },
    { ref: 'BLOG_POST:restaurant-kot-system-guide', kind: 'RELATED' },
    { ref: 'BLOG_POST:restaurant-menu-engineering', kind: 'RELATED' },
    { ref: 'TOOL:food-cost-calculator', kind: 'RELATED' },
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
    { ref: 'PAGE:bakery-ka-hisaab', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/industries/restaurant/RestaurantPack.tsx',
    'apps/web/src/industries/restaurant/pages/TablesLayoutPage.tsx',
    'apps/web/src/industries/restaurant/pages/StationsPage.tsx',
    'apps/web/src/industries/restaurant/pages/KotDisplayPage.tsx',
    'apps/web/src/industries/restaurant/pages/ModifiersPage.tsx',
    'apps/web/src/industries/restaurant/pages/RecipesPage.tsx',
    'apps/web/src/industries/restaurant/pages/RidersPage.tsx',
    'apps/web/src/industries/restaurant/pages/HappyHoursPage.tsx',
    'apps/web/src/industries/restaurant/hooks/useOrderPayment.tsx',
  ],
  sortOrder: 10,
};

export default spec;
