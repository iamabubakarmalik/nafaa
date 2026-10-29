/**
 * Setup guides for the payment gateways, written from the gateway adapters
 * (apps/api/src/integrations/online-orders/pay-api) and payment-links.service:
 * the details each gateway asks for, the sandbox → live path, how the
 * customer pays and the errors the adapters return.
 */

import { brandForPayment } from '@/assets/brands/BrandLogo';
import type { PayGatewayAccount } from '../../api/online-orders.api';
import type { GuideData, GuideFix, GuideStep } from './Guide';

type Gateway = Pick<PayGatewayAccount, 'code' | 'name' | 'connected' | 'env' | 'portalUrl' | 'sandboxUrl'>;

const LINK_STEP = (name: string): GuideStep => ({
  title: 'Order par payment link',
  path: ['Online orders', 'Order', 'Online payment'],
  body: <>Poori amount, sirf delivery charges ya apni amount chunein → <b>link banayein ({name})</b> → WhatsApp par bhejein. Link 3 din chalta hai.</>,
});

const COMMON: GuideFix[] = [
  { q: 'Customer ne pay kar diya, order par "Intezar" hai', a: <>Nafaa wapas aate hi aur har 10 minute gateway se pakki tasdeeq karta hai. Thori der baad order dobara kholein.</> },
  { q: '"Link ki period khatam"', a: <>Link 3 din baad band ho jata hai — order se naya link banayein.</> },
  { q: '"Baqi sirf Rs … hai"', a: <>Advance pehle mil chuka ho to link sirf baqi amount ka ban sakta hai.</> },
];

const GUIDES: Record<string, (g: Gateway) => Omit<GuideData, 'brand'>> = {
  SAFEPAY: (g) => ({
    title: 'Safepay jorein',
    intro: 'Customer card, wallet ya Raast se Safepay ke safhe par pay karta hai. Paisa aap ke Safepay account me jata hai.',
    steps: [
      { title: 'Safepay account banayein', path: ['getsafepay.pk', 'Sign up'], body: <>Live ke liye KYC zaroori hai. Test ke liye pehle sandbox account banayein (muft, foran) — sandbox aur live ki keys alag hoti hain.</> },
      { title: 'Keys copy karein', path: ['Safepay dashboard', 'Developers'], body: <><b>Public API key</b> (&quot;sec_&quot; se shuru) aur <b>Secret key</b>.</> },
      { title: 'Nafaa me jorein', path: ['Online payments', 'Safepay'], body: <>Pehle <b>Test (sandbox)</b> chunein, dono keys paste karein → <b>Check karke jorein</b>. Nafaa usi waqt Safepay se keys check karta hai.</>, done: g.connected },
      LINK_STEP('Safepay'),
      { title: 'Live par jayein', body: <>Test theek ho to <b>Nayi key</b> → <b>Live (asli paisa)</b> → live keys paste karein.</>, done: g.connected && g.env === 'live' },
    ],
    test: [
      <>Sandbox me ek order par Rs 10 ka link banayein, khud kholein aur Safepay ke test card se pay karein.</>,
      <>Order par link &quot;Mil gaya&quot; ho jaye aur courier ka COD utna kam dikhe.</>,
    ],
    errors: [
      { q: '"Safepay ne keys nahi maani"', a: <>Keys dashboard → Developers se dobara copy karein. Sandbox keys ke saath &quot;Test&quot;, live keys ke saath &quot;Live&quot; chunein.</> },
      { q: '"Public key sec_ se shuru hoti hai"', a: <>Public aur Secret key ki jagah ulat gayi hai — Public key wale khane me &quot;sec_…&quot; wali key daalein.</> },
      ...COMMON,
    ],
  }),
  JAZZCASH: (g) => ({
    title: 'JazzCash jorein',
    intro: 'Customer link khol kar apna JazzCash number aur CNIC ke aakhri 6 hindse likhta hai, phir phone par MPIN se approve karta hai.',
    steps: [
      { title: 'JazzCash merchant account lein', path: ['JazzCash business / account manager'], body: <>&quot;Online Payment Gateway&quot; merchant account maangein.</> },
      { title: 'Details copy karein', path: ['JazzCash merchant portal', 'Integration'], body: <><b>Merchant ID</b>, <b>Password</b> aur <b>Integrity Salt</b>.</> },
      { title: 'Nafaa me jorein', path: ['Online payments', 'JazzCash'], body: <>Pehle <b>Test (sandbox)</b> ki details se jorein → <b>Check karke jorein</b>.</>, done: g.connected },
      LINK_STEP('JazzCash'),
      { title: 'Live par jayein', body: <>Test theek ho to live details ke saath <b>Nayi key</b> → <b>Live</b>.</>, done: g.connected && g.env === 'live' },
    ],
    test: [
      <>Sandbox me Rs 10 ka link banayein, JazzCash ka test number daal kar approve karein.</>,
      <>Customer ke phone par approve hone me 1 minute tak lag sakta hai — safha band na karein.</>,
    ],
    errors: [
      { q: '"JazzCash ne keys nahi maani"', a: <>Merchant ID, Password aur Integrity Salt portal se dobara copy karein — sandbox aur live ki alag hoti hain.</> },
      { q: '"CNIC ke aakhri 6 hindse likhein"', a: <>Customer ko batayein: JazzCash account wale CNIC ke aakhri 6 hindse.</> },
      { q: '"JazzCash ne waqt par jawab nahi diya"', a: <>Customer ne approve kar diya ho to thori der me order par khud &quot;Mil gaya&quot; ho jayega.</> },
      ...COMMON,
    ],
  }),
  EASYPAISA: (g) => ({
    title: 'Easypaisa jorein',
    intro: 'Customer link khol kar apna Easypaisa number likhta hai aur phone par approve karta hai.',
    steps: [
      { title: 'Easypay merchant account lein', path: ['Easypaisa / Telenor Microfinance Bank'], body: <>&quot;Easypay&quot; merchant account maangein. <b>Mobile Account (MA)</b> payment method aap ke store par chalu ho — na ho to Easypaisa se chalu karwayein.</> },
      { title: 'Store ID aur account number', path: ['Easypay portal', 'Profile'], body: <><b>Store ID</b> aur <b>Merchant account number</b>.</> },
      { title: 'Partner user banayein', path: ['Easypay portal', 'Manage Partner Accounts'], body: <>Naya partner username aur password banayein.</> },
      { title: 'Nafaa me jorein', path: ['Online payments', 'Easypaisa'], body: <>Pehle <b>Test (sandbox)</b> chunein, chaaron cheezein daalein → <b>Check karke jorein</b>.</>, done: g.connected },
      LINK_STEP('Easypaisa'),
      { title: 'Live par jayein', body: <>Test theek ho to live details ke saath <b>Nayi key</b> → <b>Live</b>.</>, done: g.connected && g.env === 'live' },
    ],
    test: [<>Sandbox me Rs 10 ka link banayein, Easypaisa ka test number daal kar approve karein.</>],
    errors: [
      { q: '"Easypaisa ne details nahi maani"', a: <>Store ID, account number aur Partner username/password dobara dekhein. Partner password portal ke login password se alag hai.</> },
      { q: 'Customer ko approve ka message nahi aaya', a: <>Store par Mobile Account (MA) method chalu hai? Easypaisa se confirm karein.</> },
      ...COMMON,
    ],
  }),
};

/** Guide for one gateway; a short generic one for gateways without a written guide. */
export function paymentGuide(g: Gateway): GuideData {
  const make = GUIDES[g.code];
  const links = [{ label: `${g.name} website`, href: g.portalUrl }, ...(g.sandboxUrl ? [{ label: 'Test (sandbox) account', href: g.sandboxUrl }] : [])];
  if (make) return { brand: brandForPayment(g.code), ...make(g), links };
  return {
    brand: brandForPayment(g.code),
    title: `${g.name} jorein`,
    steps: [{ title: `${g.name} se merchant account lein` }, { title: 'Details Nafaa me paste karein', done: g.connected }, LINK_STEP(g.name)],
    errors: COMMON,
    links,
  };
}
