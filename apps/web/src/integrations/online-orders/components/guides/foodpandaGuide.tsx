/**
 * Foodpanda setup guide. Follows the Delivery Hero POS integration in
 * apps/api/src/integrations/online-orders/foodpanda*.ts: the shop gives its
 * chain code and vendor codes, Nafaa creates a Remote ID per branch, and the
 * Foodpanda team links each vendor to that Remote ID.
 */

import type { GuideData } from './Guide';
import { t, Trans } from '@core/i18n';

export function foodpandaGuide(opts: { remoteIds?: number; ordersSeen?: boolean } = {}): GuideData {
  return {
    brand: 'foodpanda',
    title: t('Foodpanda jorne ka tareeqa'),
    intro: t('Foodpanda ke orders seedha Nafaa me aate hain. Aap ko sirf apne codes dene hain — baqi jor Foodpanda ki team aur Nafaa karte hain.'),
    steps: [
      {
        title: t('Foodpanda se apne codes lein'),
        path: ['Foodpanda account manager', 'POS integration'],
        body: <Trans text="Account manager ko likhein ke aap {{pos}} se jorna chahte hain. Woh aap ko {{chain}} (sab branches ka ek, jaise {{chainEx}}) aur har branch ka {{vendor}} (jaise {{vendorEx}}) dega. Ye Foodpanda partner portal par restaurant ki details me bhi likha hota hai." values={{ pos: <b>Nafaa POS</b>, chain: <b>chain code</b>, chainEx: <code>yummy-pk</code>, vendor: <b>vendor code</b>, vendorEx: <code>s1ab</code> }} />,
      },
      {
        title: t('Nafaa me codes daal kar Mehfooz karein'),
        path: ['Nafaa', 'Integrations', 'Foodpanda'],
        body: <Trans text="Chain code likhein, har branch ka vendor code aur us ki Nafaa branch chunein, phir {{button}}. Har branch ka ek {{rid}} ban jayega — ye kabhi nahi badalta." values={{ button: <b>{t('Mehfooz karein')}</b>, rid: <b>Remote ID</b> }} />,
        done: (opts.remoteIds ?? 0) > 0,
      },
      {
        title: t('Remote ID Foodpanda ko bhejein'),
        body: <Trans text="{{button}} dabayein aur message account manager ko WhatsApp / email karein. Us me chain code, har vendor ka Remote ID aur Nafaa ka plugin URL hota hai. Foodpanda ki team apni taraf integration chalu karti hai (aam tor par 1-3 din)." values={{ button: <b>{t('Foodpanda ke liye details copy')}</b> }} />,
      },
      {
        title: t('Menu Foodpanda portal se hi chalta hai'),
        body: <>{t('Qeemat, items aur band / khula Foodpanda partner portal se badalte hain. Order aane par har item ek dafa Nafaa product se jorna hota hai — Accept par jorne ka safha khud khulta hai, aage se khud jurta hai.')}</>,
      },
      {
        title: t('Order aaye to Accept, phir Ready'),
        path: ['Nafaa', 'Online orders', 'Naye'],
        body: <Trans text={'{{accept}} par bill banta hai aur Foodpanda ko tayyari ka waqt jata hai. Foodpanda ka rider ho to {{ready}} dabane par rider ko khabar jati hai. Apni delivery ho to {{onway}} dabane par Foodpanda ko "picked up" jata hai. Reject ki wajah bhi Foodpanda tak jati hai.'} values={{ accept: <b>{t('Accept')}</b>, ready: <b>{t('Ready')}</b>, onway: <b>{t('Raste me')}</b> }} />,
        done: opts.ordersSeen,
      },
    ],
    test: [
      t('Foodpanda ki team se ek test order bhejne ko kahein — Online orders me TEST ke nishan ke saath aayega aur ghanti bajegi.'),
      t('Test order Accept karein: Foodpanda ke tablet / portal par order "accepted" dikhna chahiye.'),
      t('Phir Reject ya Cancel karke dekhein — Foodpanda par "rejected" ho jaye.'),
    ],
    errors: [
      { q: t('"Chain code sahi likhein" aata hai'), a: <Trans text="Chain code me sirf English harf, number, - aur _ hote hain, space nahi (jaise {{example}}). Foodpanda wala code bilkul waisa hi likhein." values={{ example: <code>yummy-pk</code> }} /> },
      { q: t('"Vendor code sahi likhein" ya "Ek vendor code do dafa"'), a: <>{t('Har branch ka vendor code alag hota hai, 2-40 harf, space ke baghair. Ek hi code do branches me na likhein.')}</> },
      { q: t('Foodpanda par order hua, Nafaa me nahi aaya'), a: <Trans text="Dekhein channel {{on}} hai (upar switch). Remote ID Foodpanda ko bheja tha? Foodpanda ki team se poochein ke vendor par yahi Remote ID laga hai. Upar peeli patti dikhe to Foodpanda abhi Nafaa ke liye chalu nahi hua." values={{ on: <b>{t('Chalu')}</b> }} /> },
      { q: t('Order khud cancel ho gaya'), a: <Trans text="Foodpanda kuch minute me accept na ho to order cancel kar deta hai. {{option}} chalu karein, ya counter par ghanti sun kar foran Accept karein." values={{ option: <b>{t('Order khud accept')}</b> }} /> },
      { q: t('Accept par "product nahi mila"'), a: <>{t('Foodpanda ke item ka Nafaa product se jor baqi hai. Khulne wale safhe par sahi product chun lein — agli dafa khud jur jayega.')}</> },
      { q: t('Order ghalat branch me aaya'), a: <Trans text="Us vendor code ke saamne sahi {{branch}} chun kar Mehfooz karein. Abhi wala order: order kholein → Branch badlein." values={{ branch: <b>{t('Nafaa branch')}</b> }} /> },
    ],
  };
}
