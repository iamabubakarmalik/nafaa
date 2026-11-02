/**
 * Setup guides for the payment gateways, written from the gateway adapters
 * (apps/api/src/integrations/online-orders/pay-api) and payment-links.service:
 * the details each gateway asks for, the sandbox → live path, how the
 * customer pays and the errors the adapters return.
 */

import { brandForPayment } from '@/assets/brands/BrandLogo';
import type { PayGatewayAccount } from '../../api/online-orders.api';
import type { GuideData, GuideFix, GuideStep } from './Guide';
import { t, Trans } from '@core/i18n';

type Gateway = Pick<PayGatewayAccount, 'code' | 'name' | 'connected' | 'env' | 'portalUrl' | 'sandboxUrl'>;

const LINK_STEP = (name: string): GuideStep => ({
  title: t('Order par payment link'),
  path: ['Online orders', 'Order', 'Online payment'],
  body: <Trans text="Poori amount, sirf delivery charges ya apni amount chunein → {{button}} → WhatsApp par bhejein. Link 3 din chalta hai." values={{ button: <b>{t('link banayein ({{name}})', { name })}</b> }} />,
});

const COMMON: GuideFix[] = [
  { q: t('Customer ne pay kar diya, order par "Intezar" hai'), a: <>{t('Nafaa wapas aate hi aur har 10 minute gateway se pakki tasdeeq karta hai. Thori der baad order dobara kholein.')}</> },
  { q: t('"Link ki period khatam"'), a: <>{t('Link 3 din baad band ho jata hai — order se naya link banayein.')}</> },
  { q: t('"Baqi sirf Rs … hai"'), a: <>{t('Advance pehle mil chuka ho to link sirf baqi amount ka ban sakta hai.')}</> },
];

const GUIDES: Record<string, (g: Gateway) => Omit<GuideData, 'brand'>> = {
  SAFEPAY: (g) => ({
    title: t('Safepay jorein'),
    intro: t('Customer card, wallet ya Raast se Safepay ke safhe par pay karta hai. Paisa aap ke Safepay account me jata hai.'),
    steps: [
      { title: t('Safepay account banayein'), path: ['getsafepay.pk', 'Sign up'], body: <>{t('Live ke liye KYC zaroori hai. Test ke liye pehle sandbox account banayein (muft, foran) — sandbox aur live ki keys alag hoti hain.')}</> },
      { title: t('Keys copy karein'), path: ['Safepay dashboard', 'Developers'], body: <Trans text={'{{pub}} ("sec_" se shuru) aur {{secret}}.'} values={{ pub: <b>Public API key</b>, secret: <b>Secret key</b> }} /> },
      { title: t('Nafaa me jorein'), path: ['Online payments', 'Safepay'], body: <Trans text="Pehle {{test}} chunein, dono keys paste karein → {{button}}. Nafaa usi waqt Safepay se keys check karta hai." values={{ test: <b>{t('Test (sandbox)')}</b>, button: <b>{t('Check karke jorein')}</b> }} />, done: g.connected },
      LINK_STEP('Safepay'),
      { title: t('Live par jayein'), body: <Trans text="Test theek ho to {{button}} → {{live}} → live keys paste karein." values={{ button: <b>{t('Nayi key')}</b>, live: <b>{t('Live (asli paisa)')}</b> }} />, done: g.connected && g.env === 'live' },
    ],
    test: [
      <>{t('Sandbox me ek order par Rs 10 ka link banayein, khud kholein aur Safepay ke test card se pay karein.')}</>,
      <>{t('Order par link "Mil gaya" ho jaye aur courier ka COD utna kam dikhe.')}</>,
    ],
    errors: [
      { q: t('"Safepay ne keys nahi maani"'), a: <>{t('Keys dashboard → Developers se dobara copy karein. Sandbox keys ke saath "Test", live keys ke saath "Live" chunein.')}</> },
      { q: t('"Public key sec_ se shuru hoti hai"'), a: <>{t('Public aur Secret key ki jagah ulat gayi hai — Public key wale khane me "sec_…" wali key daalein.')}</> },
      ...COMMON,
    ],
  }),
  JAZZCASH: (g) => ({
    title: t('JazzCash jorein'),
    intro: t('Customer link khol kar apna JazzCash number aur CNIC ke aakhri 6 hindse likhta hai, phir phone par MPIN se approve karta hai.'),
    steps: [
      { title: t('JazzCash merchant account lein'), path: ['JazzCash business / account manager'], body: <>{t('"Online Payment Gateway" merchant account maangein.')}</> },
      { title: t('Details copy karein'), path: ['JazzCash merchant portal', 'Integration'], body: <><b>Merchant ID</b>, <b>Password</b> {t('aur')} <b>Integrity Salt</b>.</> },
      { title: t('Nafaa me jorein'), path: ['Online payments', 'JazzCash'], body: <Trans text="Pehle {{test}} ki details se jorein → {{button}}." values={{ test: <b>{t('Test (sandbox)')}</b>, button: <b>{t('Check karke jorein')}</b> }} />, done: g.connected },
      LINK_STEP('JazzCash'),
      { title: t('Live par jayein'), body: <Trans text="Test theek ho to live details ke saath {{button}} → {{live}}." values={{ button: <b>{t('Nayi key')}</b>, live: <b>{t('Live')}</b> }} />, done: g.connected && g.env === 'live' },
    ],
    test: [
      <>{t('Sandbox me Rs 10 ka link banayein, JazzCash ka test number daal kar approve karein.')}</>,
      <>{t('Customer ke phone par approve hone me 1 minute tak lag sakta hai — safha band na karein.')}</>,
    ],
    errors: [
      { q: t('"JazzCash ne keys nahi maani"'), a: <>{t('Merchant ID, Password aur Integrity Salt portal se dobara copy karein — sandbox aur live ki alag hoti hain.')}</> },
      { q: t('"CNIC ke aakhri 6 hindse likhein"'), a: <>{t('Customer ko batayein: JazzCash account wale CNIC ke aakhri 6 hindse.')}</> },
      { q: t('"JazzCash ne waqt par jawab nahi diya"'), a: <>{t('Customer ne approve kar diya ho to thori der me order par khud "Mil gaya" ho jayega.')}</> },
      ...COMMON,
    ],
  }),
  EASYPAISA: (g) => ({
    title: t('Easypaisa jorein'),
    intro: t('Customer link khol kar apna Easypaisa number likhta hai aur phone par approve karta hai.'),
    steps: [
      { title: t('Easypay merchant account lein'), path: ['Easypaisa / Telenor Microfinance Bank'], body: <Trans text={'"Easypay" merchant account maangein. {{method}} payment method aap ke store par chalu ho — na ho to Easypaisa se chalu karwayein.'} values={{ method: <b>Mobile Account (MA)</b> }} /> },
      { title: t('Store ID aur account number'), path: ['Easypay portal', 'Profile'], body: <><b>Store ID</b> {t('aur')} <b>Merchant account number</b>.</> },
      { title: t('Partner user banayein'), path: ['Easypay portal', 'Manage Partner Accounts'], body: <>{t('Naya partner username aur password banayein.')}</> },
      { title: t('Nafaa me jorein'), path: ['Online payments', 'Easypaisa'], body: <Trans text="Pehle {{test}} chunein, chaaron cheezein daalein → {{button}}." values={{ test: <b>{t('Test (sandbox)')}</b>, button: <b>{t('Check karke jorein')}</b> }} />, done: g.connected },
      LINK_STEP('Easypaisa'),
      { title: t('Live par jayein'), body: <Trans text="Test theek ho to live details ke saath {{button}} → {{live}}." values={{ button: <b>{t('Nayi key')}</b>, live: <b>{t('Live')}</b> }} />, done: g.connected && g.env === 'live' },
    ],
    test: [<>{t('Sandbox me Rs 10 ka link banayein, Easypaisa ka test number daal kar approve karein.')}</>],
    errors: [
      { q: t('"Easypaisa ne details nahi maani"'), a: <>{t('Store ID, account number aur Partner username/password dobara dekhein. Partner password portal ke login password se alag hai.')}</> },
      { q: t('Customer ko approve ka message nahi aaya'), a: <>{t('Store par Mobile Account (MA) method chalu hai? Easypaisa se confirm karein.')}</> },
      ...COMMON,
    ],
  }),
};

/** Guide for one gateway; a short generic one for gateways without a written guide. */
export function paymentGuide(g: Gateway): GuideData {
  const make = GUIDES[g.code];
  const links = [{ label: t('{{name}} website', { name: g.name }), href: g.portalUrl }, ...(g.sandboxUrl ? [{ label: t('Test (sandbox) account'), href: g.sandboxUrl }] : [])];
  if (make) return { brand: brandForPayment(g.code), ...make(g), links };
  return {
    brand: brandForPayment(g.code),
    title: t('{{name}} jorein', { name: g.name }),
    steps: [{ title: t('{{name}} se merchant account lein', { name: g.name }) }, { title: t('Details Nafaa me paste karein'), done: g.connected }, LINK_STEP(g.name)],
    errors: COMMON,
    links,
  };
}
