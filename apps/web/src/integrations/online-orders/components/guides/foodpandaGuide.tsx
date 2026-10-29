/**
 * Foodpanda setup guide. Follows the Delivery Hero POS integration in
 * apps/api/src/integrations/online-orders/foodpanda*.ts: the shop gives its
 * chain code and vendor codes, Nafaa creates a Remote ID per branch, and the
 * Foodpanda team links each vendor to that Remote ID.
 */

import type { GuideData } from './Guide';

export function foodpandaGuide(opts: { remoteIds?: number; ordersSeen?: boolean } = {}): GuideData {
  return {
    brand: 'foodpanda',
    title: 'Foodpanda jorne ka tareeqa',
    intro: 'Foodpanda ke orders seedha Nafaa me aate hain. Aap ko sirf apne codes dene hain — baqi jor Foodpanda ki team aur Nafaa karte hain.',
    steps: [
      {
        title: 'Foodpanda se apne codes lein',
        path: ['Foodpanda account manager', 'POS integration'],
        body: <>Account manager ko likhein ke aap <b>Nafaa POS</b> se jorna chahte hain. Woh aap ko <b>chain code</b> (sab branches ka ek, jaise <code>yummy-pk</code>) aur har branch ka <b>vendor code</b> (jaise <code>s1ab</code>) dega. Ye Foodpanda partner portal par restaurant ki details me bhi likha hota hai.</>,
      },
      {
        title: 'Nafaa me codes daal kar Mehfooz karein',
        path: ['Nafaa', 'Integrations', 'Foodpanda'],
        body: <>Chain code likhein, har branch ka vendor code aur us ki Nafaa branch chunein, phir <b>Mehfooz karein</b>. Har branch ka ek <b>Remote ID</b> ban jayega — ye kabhi nahi badalta.</>,
        done: (opts.remoteIds ?? 0) > 0,
      },
      {
        title: 'Remote ID Foodpanda ko bhejein',
        body: <><b>Foodpanda ke liye details copy</b> dabayein aur message account manager ko WhatsApp / email karein. Us me chain code, har vendor ka Remote ID aur Nafaa ka plugin URL hota hai. Foodpanda ki team apni taraf integration chalu karti hai (aam tor par 1-3 din).</>,
      },
      {
        title: 'Menu Foodpanda portal se hi chalta hai',
        body: <>Qeemat, items aur band / khula Foodpanda partner portal se badalte hain. Order aane par har item ek dafa Nafaa product se jorna hota hai — Accept par jorne ka safha khud khulta hai, aage se khud jurta hai.</>,
      },
      {
        title: 'Order aaye to Accept, phir Ready',
        path: ['Nafaa', 'Online orders', 'Naye'],
        body: <><b>Accept</b> par bill banta hai aur Foodpanda ko tayyari ka waqt jata hai. Foodpanda ka rider ho to <b>Ready</b> dabane par rider ko khabar jati hai. Apni delivery ho to <b>Raste me</b> dabane par Foodpanda ko "picked up" jata hai. Reject ki wajah bhi Foodpanda tak jati hai.</>,
        done: opts.ordersSeen,
      },
    ],
    test: [
      'Foodpanda ki team se ek test order bhejne ko kahein — Online orders me TEST ke nishan ke saath aayega aur ghanti bajegi.',
      'Test order Accept karein: Foodpanda ke tablet / portal par order "accepted" dikhna chahiye.',
      'Phir Reject ya Cancel karke dekhein — Foodpanda par "rejected" ho jaye.',
    ],
    errors: [
      { q: '"Chain code sahi likhein" aata hai', a: <>Chain code me sirf English harf, number, - aur _ hote hain, space nahi (jaise <code>yummy-pk</code>). Foodpanda wala code bilkul waisa hi likhein.</> },
      { q: '"Vendor code sahi likhein" ya "Ek vendor code do dafa"', a: <>Har branch ka vendor code alag hota hai, 2-40 harf, space ke baghair. Ek hi code do branches me na likhein.</> },
      { q: 'Foodpanda par order hua, Nafaa me nahi aaya', a: <>Dekhein channel <b>Chalu</b> hai (upar switch). Remote ID Foodpanda ko bheja tha? Foodpanda ki team se poochein ke vendor par yahi Remote ID laga hai. Upar peeli patti dikhe to Foodpanda abhi Nafaa ke liye chalu nahi hua.</> },
      { q: 'Order khud cancel ho gaya', a: <>Foodpanda kuch minute me accept na ho to order cancel kar deta hai. <b>Order khud accept</b> chalu karein, ya counter par ghanti sun kar foran Accept karein.</> },
      { q: 'Accept par "product nahi mila"', a: <>Foodpanda ke item ka Nafaa product se jor baqi hai. Khulne wale safhe par sahi product chun lein — agli dafa khud jur jayega.</> },
      { q: 'Order ghalat branch me aaya', a: <>Us vendor code ke saamne sahi <b>Nafaa branch</b> chun kar Mehfooz karein. Abhi wala order: order kholein → Branch badlein.</> },
    ],
  };
}
