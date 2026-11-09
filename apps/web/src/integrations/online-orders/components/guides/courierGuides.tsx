/**
 * Setup guides for each courier, written from what the courier adapters do
 * (apps/api/src/integrations/online-orders/courier-api): which details the
 * courier gives, where they sit on its portal, what Nafaa checks on connect
 * and the errors the adapters return.
 */

import type { ReactNode } from 'react';
import { brandForCourier } from '@/assets/brands/BrandLogo';
import type { CourierAccount } from '../../api/online-orders.api';
import type { GuideData, GuideFix, GuideStep } from './Guide';
import { t, Trans } from '@core/i18n';

type Courier = Pick<CourierAccount, 'code' | 'name' | 'mode' | 'connected' | 'missingSettings' | 'connect'> & Partial<Pick<CourierAccount, 'apiSoon'>>;

const BOOK_STEPS = (name: string): GuideStep[] => [
  {
    title: t('Settings poori karein'),
    path: ['Couriers', name, 'Settings'],
    body: <>{t('Pickup address, aam wazan aur note ek dafa bhar dein — har booking me khud lagenge. "Accept hote hi khud book" sirf ek courier par chalu karein.')}</>,
  },
  {
    title: t('Pehli booking'),
    path: ['Couriers', name, 'Book karein'],
    body: <Trans text={'Accept ho chuke orders chunein → {{button}}. CN khud aata hai aur order par likha jata hai. Ek order ke andar se bhi "Courier par book karein" dabaa sakte hain.'} values={{ button: <b>{t('{{name}} par book', { name })}</b> }} />,
  },
];

const COMMON_ERRORS = (name: string): GuideFix[] => [
  { q: t('"Customer ka phone 03xxxxxxxxx jaisa hona chahiye"'), a: <>{t('Order kholein → customer ka phone theek karein (11 hindse, 03 se shuru) → dobara book karein.')}</> },
  { q: t('"Shehar {{name}} ki list me nahi mila"', { name }), a: <>{t('Booking window me shehar ki list se sahi shehar khud chunein — customer ne spelling ghalat likhi ho to aisa hota hai.')}</> },
  { q: t('"Pehle order accept karein"'), a: <>{t('Courier booking sirf accept hue order ki hoti hai (bill ban chuka ho). Pehle Accept, phir book.')}</> },
  { q: t('Booking cancel nahi ho rahi'), a: <>{t('Courier parcel utha le to API se cancel nahi hoti — courier se baat karein ya parcel wapas aane par RTO karein.')}</> },
];

const TEST = (name: string) => [
  <>{t('Connect par Nafaa usi waqt {{name}} se shehron ki list mangwa kar key check karta hai — ghalat key save hi nahi hoti.', { name })}</>,
  <>{t('Apne hi number par ek chhota order accept karke book karein, label print karein, phir booking cancel kar dein.')}</>,
  <>{t('Couriers safhe par {{name}} ki tile par "Jura hua" aur sync ka waqt dikhe to sab theek hai.', { name })}</>,
];

const API: Record<string, { intro: string; steps: GuideStep[]; errors: GuideFix[]; test?: ReactNode[] }> = {
  TCS: {
    intro: t('TCS ka connection TCS ki team deti hai — pehle Test (UAT), phir Live. Label PDF aur COD settlement khud aata hai.'),
    steps: [
      { title: t('TCS se API access maangein'), path: ['TCS account manager'], body: <Trans text={'"OCI / Envio API access" maangein. Woh {{id}}, {{secret}}, {{user}}, {{pass}} aur {{account}} (jaise 04011K1) dete hain.'} values={{ id: <b>Client ID</b>, secret: <b>Client Secret</b>, user: <b>Envio username</b>, pass: <b>Envio password</b>, account: <b>account number</b> }} /> },
      { title: t('Nafaa me paste karein'), path: ['Couriers', 'TCS', 'Jorein'], body: <Trans text="Paanchon cheezein apne apne khane me daalein. {{where}} me pehle {{test}} chunein → {{button}}." values={{ where: <b>{t('Kahan jorna hai')}</b>, test: <b>{t('Test (UAT)')}</b>, button: <b>{t('Check karke jorein')}</b> }} /> },
      { title: t('Live keys par jayein'), body: <Trans text="TCS test booking dekh kar Live keys deta hai (aam taur par 3 din). Phir Connection tab → {{button}} → Live chun kar dobara jorein." values={{ button: <b>{t('Nayi key')}</b> }} /> },
    ],
    errors: [
      { q: t('"TCS ne Client ID / Client Secret nahi maana"'), a: <>{t('Keys TCS ki email se dobara copy karein — shuru ya aakhir me khali jagah na ho. Test keys ke saath "Test (UAT)" hi chunein.')}</> },
      { q: t('"TCS ne Envio username / password nahi maana"'), a: <>{t('envio.tcscourier.com par isi username/password se login karke dekhein; na chale to TCS se reset karwayein.')}</> },
      { q: t('"TCS account me koi cost center (pickup) nahi"'), a: <>{t('TCS se cost center banwayein, phir Settings → Cost center (pickup) chunein.')}</> },
    ],
  },
  LEOPARDS: {
    intro: t('Leopards ki API key aur password merchant portal par milte hain. Label link, COD settlement aur portal ke saare parcels Nafaa me aate hain.'),
    steps: [
      { title: t('Leopards portal kholein'), path: ['Leopards merchant portal', 'Login'], body: <>{t('Apne merchant account se login karein.')}</> },
      { title: t('API key aur password copy karein'), path: ['Leopards portal', 'API'], body: <>{t('API wala hissa na mile to Leopards account manager se "API key aur API password" maangein.')}</> },
      { title: t('Nafaa me paste karein'), path: ['Couriers', 'Leopards', 'Jorein'], body: <Trans text="{{key}} aur {{pass}} khano me daalein → {{button}}." values={{ key: <b>API key</b>, pass: <b>API password</b>, button: <b>{t('Check karke jorein')}</b> }} /> },
      { title: t('Shehar chunein'), path: ['Couriers', 'Leopards', 'Settings'], body: <>{t('"Parcel kis shehar se jayega" — khali chhorein to Leopards account wala shehar lagta hai.')}</> },
    ],
    errors: [
      { q: t('"Leopards ne API key / password nahi maana"'), a: <>{t('Dono cheezein portal se dobara copy karein. Password aur API password alag hain — login wala password nahi chalta.')}</> },
      { q: t('Label nahi khul raha'), a: <>{t('Leopards kabhi label link nahi deta — CN copy karke Leopards portal se print karein.')}</> },
    ],
  },
  POSTEX: {
    intro: t('PostEx sab se aasaan hai — sirf ek API token. Label PDF, COD settlement aur portal ke saare parcels Nafaa me.'),
    steps: [
      { title: t('PostEx merchant portal kholein'), path: ['merchant.postex.pk', 'Login'] },
      { title: t('API token copy karein'), path: ['PostEx portal', 'Settings', 'API / Integration'], body: <>{t('Na mile to PostEx support se "API token" maangein.')}</> },
      { title: t('Nafaa me paste karein'), path: ['Couriers', 'PostEx', 'Jorein'], body: <Trans text="{{token}} khane me daalein → {{button}}." values={{ token: <b>API token</b>, button: <b>{t('Check karke jorein')}</b> }} /> },
      { title: t('Pickup address chunein'), path: ['Couriers', 'PostEx', 'Settings'], body: <>{t('PostEx portal par bane pickup address me se ek chunein — rider wahin se parcel uthayega.')}</> },
    ],
    errors: [
      { q: t('"PostEx ne key nahi maani"'), a: <>{t('Portal se poora token dobara copy karein. Naya token banaya ho to purana band ho jata hai.')}</> },
      { q: t('Pickup address ki list khali hai'), a: <>{t('PostEx portal par pehle pickup address banayein, phir Settings dobara kholein.')}</> },
    ],
  },
  TRAX: {
    intro: t('Trax ki API key Sonic portal ki Profile me hoti hai. Label PDF aur COD settlement khud aata hai.'),
    steps: [
      { title: t('Sonic portal kholein'), path: ['sonic.pk', 'Login'], body: <>{t('Apne Trax account se login karein. Pickup address pehle se yahan bana hona chahiye.')}</> },
      { title: t('API key copy karein'), path: ['Sonic portal', 'Profile', 'API key'], body: <>{t('Profile safhe ke sab se neeche API key likhi hai.')}</> },
      { title: t('Nafaa me paste karein'), path: ['Couriers', 'Trax', 'Jorein'], body: <Trans text="{{key}} daal kar {{button}}." values={{ key: <b>API key</b>, button: <b>{t('Check karke jorein')}</b> }} /> },
      { title: t('Settings bharein'), path: ['Couriers', 'Trax', 'Settings'], body: <>{t('Pickup address, shipping mode (Rush / Saver Plus), account ki type aur maal ki type — jaise Trax ne aap ka account banaya.')}</> },
    ],
    errors: [
      { q: t('"Trax ne API key nahi maani"'), a: <>{t('Sonic portal → Profile se key dobara copy karein.')}</> },
      { q: t('"Trax account me koi pickup address nahi"'), a: <>{t('Sonic portal par pehle pickup address banayein, phir dobara jorein.')}</> },
    ],
  },
  MNP: {
    intro: t('M&P ki details un ka account manager deta hai. Booking aur tracking Nafaa se; label M&P portal se (CN copy karke).'),
    steps: [
      { title: t('M&P se COD API access maangein'), path: ['M&P account manager'], body: <Trans text="Woh {{user}}, {{pass}}, {{account}} (jaise 4T154) aur kabhi {{location}} / {{insert}} dete hain." values={{ user: <b>username</b>, pass: <b>password</b>, account: <b>account number</b>, location: <b>return location</b>, insert: <b>insert type</b> }} /> },
      { title: t('Nafaa me paste karein'), path: ['Couriers', 'M&P', 'Jorein'], body: <Trans text="Jo mila woh khano me daalein — optional khane khali chhor sakte hain → {{button}}." values={{ button: <b>{t('Check karke jorein')}</b> }} /> },
      { title: t('Pickup location aur service'), path: ['Couriers', 'M&P', 'Settings'], body: <>{t('Nafaa M&P se aap ki locations khud le aata hai — ek chunein.')}</> },
    ],
    errors: [
      { q: t('"M&P ne username / password nahi maana"'), a: <>{t('M&P se mili details dobara check karein — account number bhi sahi hona chahiye.')}</> },
      { q: t('"M&P location chunein"'), a: <>{t('Couriers → M&P → Settings → Pickup location chunein.')}</> },
      { q: t('Label print'), a: <>{t('M&P label API se nahi deta — CN copy karke M&P portal se print karein.')}</> },
    ],
  },
  CALL_COURIER: {
    intro: t('Call Courier sirf Login ID se jurta hai. Label aur cancel Call Courier portal se hote hain.'),
    steps: [
      { title: t('Login ID lein'), path: ['Call Courier KAM (account manager)'], body: <Trans text="Apna Login ID maangein — jaise {{example}}." values={{ example: <b>LHE-1234</b> }} /> },
      { title: t('Nafaa me paste karein'), path: ['Couriers', 'Call Courier', 'Jorein'], body: <Trans text="{{field}} daal kar {{button}}." values={{ field: <b>Login ID</b>, button: <b>{t('Check karke jorein')}</b> }} /> },
      { title: t('Settings zaroor bharein'), path: ['Couriers', 'Call Courier', 'Settings'], body: <>{t('Apna shehar, phir area, bhejne wale ka naam, phone aur pickup address — label par yahi chhapta hai. Ye khali hon to booking nahi hoti.')}</> },
    ],
    errors: [
      { q: t('"Call Courier ne Login ID nahi maana"'), a: <>{t('KAM se mila Login ID bilkul waise hi likhein (jaise LHE-1234).')}</> },
      { q: t('"COD service par 0 amount nahi leta"'), a: <>{t('Paid (advance poora) order Call Courier ki COD service par nahi jata — kisi aur courier se bhejein.')}</> },
      { q: t('Cancel ya label'), a: <>{t('Dono Call Courier portal se karein — CN Nafaa me copy ho jata hai.')}</> },
    ],
  },
  INSTAWORLD: {
    intro: t('Beta — pehli booking check karein. InstaWorld ki v2 API key portal par khud banti hai. Label PDF, COD settlement aur portal ke saare parcels Nafaa me aate hain.'),
    steps: [
      { title: t('InstaWorld portal kholein'), path: ['one.instaworld.pk', 'API Access'], body: <>{t('Apne merchant account se login karein aur API Access kholein.')}</> },
      { title: t('Nayi v2 key banayein'), path: ['InstaWorld portal', 'API Access', 'Create key'], body: <Trans text="Portal password maangta hai. Key {{once}} dikhti hai — foran copy karein. Purani location key (Shopify app wali) yahan nahi chalti." values={{ once: <b>{t('sirf ek dafa')}</b> }} /> },
      { title: t('Nafaa me paste karein'), path: ['Couriers', 'InstaWorld', 'Jorein'], body: <Trans text="{{key}} daal kar {{button}}. Pickup location Nafaa khud le aata hai." values={{ key: <b>API key (v2)</b>, button: <b>{t('Check karke jorein')}</b> }} /> },
    ],
    errors: [
      { q: t('"InstaWorld ne API key nahi maani"'), a: <>{t('Portal → API Access se nayi v2 key banayein. Key ke shuru me iw_ hona chahiye.')}</> },
      { q: t('"Kisi courier ne parcel qabool nahi kiya"'), a: <>{t('Order book nahi hua — thori der baad dobara book karein, double booking nahi hogi.')}</> },
      { q: t('"InstaWorld is shehar me deliver nahi karta"'), a: <>{t('Booking window me InstaWorld ki list se qareeb wala shehar chunein ya kisi aur courier se bhejein.')}</> },
    ],
  },
  SHIPNOC: {
    intro: t('Beta — pehli booking check karein. ShipNOC username, password aur signature se jurta hai. Label link booking ke saath aata hai.'),
    steps: [
      { title: t('ShipNOC se API access maangein'), path: ['ShipNOC'], body: <Trans text="Woh {{user}}, {{pass}} aur kabhi {{sig}} dete hain." values={{ user: <b>username</b>, pass: <b>password</b>, sig: <b>signature</b> }} /> },
      { title: t('Nafaa me paste karein'), path: ['Couriers', 'ShipNOC', 'Jorein'], body: <Trans text="Signature na mila ho to khali chhor dein → {{button}}. Nafaa ShipNOC se shehron ki list mangwa kar check karta hai." values={{ button: <b>{t('Check karke jorein')}</b> }} /> },
    ],
    errors: [
      { q: t('"ShipNOC ne username / password / signature nahi maana"'), a: <>{t('Teeno cheezein ShipNOC se dobara confirm karein. Signature diya hai to wohi likhein.')}</> },
      { q: t('Order number label par'), a: <>{t('ShipNOC me order number ka khana nahi — Nafaa use note (Special instruction) me likhta hai.')}</> },
    ],
  },
};

const MANUAL: Record<string, string> = {
  RIDER: t('Apna rider — koi CN nahi. Nafaa order ka safar aur COD ka paisa sambhalta hai.'),
};

function manualGuide(c: Courier): GuideData {
  const own = c.code === 'RIDER';
  return {
    brand: brandForCourier(c.code),
    title: own ? t('Apne rider se delivery') : t('{{name}} — manual tareeqa', { name: c.name }),
    intro: own ? MANUAL.RIDER : (
      <>
        {t('{{name}} ka API abhi Nafaa me nahi, is liye booking un ke portal par hoti hai. Tracking link, COD hisaab aur RTO phir bhi Nafaa me chalta hai.', { name: c.name })}
        {/* No public API: a direct connection needs the courier's own API details. */}
        {c.apiSoon && <> {t('Direct API jald (Coming soon) — {{name}} se apna API key aur API docs maang kar Nafaa support ko bhejein. Pehli booking hum aap ke saath check karenge.', { name: c.name })}</>}
      </>
    ),
    steps: [
      ...(own ? [] : [{ title: t('{{name}} par parcel book karein', { name: c.name }), path: [`${c.name} portal`], body: <>{t('Parcel book karke CN (tracking number) lein.')}</> }]),
      {
        title: t('Order par courier likhein'),
        path: ['Online orders', 'Order', 'Rider ko de diya'],
        body: own
          ? <Trans text={'Pack hone ke baad {{button}} dabayein aur {{own}} chunein — customer ko WhatsApp par "raste me" bhej sakte hain.'} values={{ button: <b>{t('Rider ko de diya')}</b>, own: <b>{t('Apna rider')}</b> }} />
          : <Trans text="Pack hone ke baad {{button}} dabayein → {{courier}} chunein → CN daalein. Customer ko tracking link WhatsApp par jata hai." values={{ button: <b>{t('Rider ko de diya')}</b>, courier: <b>{c.name}</b> }} />,
      },
      { title: t('Deliver ya wapas'), body: <Trans text="Pohanch jaye to {{delivered}}; wapas aaye to {{rto}} — bill void aur stock khud wapas." values={{ delivered: <b>{t('Deliver ho gaya')}</b>, rto: <b>{t('Wapas aaya (RTO)')}</b> }} /> },
      { title: t('COD ka paisa'), path: ['Online store', 'COD & courier'], body: <Trans text="{{who}} paisa de to COD safhe par orders chun kar {{button}}." values={{ who: own ? t('Rider') : c.name, button: <b>{t('Paisa mil gaya')}</b> }} /> },
    ],
    test: [<>{t('Ek order par ye qadam chala kar dekhein — COD safhe par woh order "{{value}} ke paas" me dikhe.', { value: own ? t('Rider') : t('Courier') })}</>],
    errors: [
      { q: t('Order Couriers safhe par nahi dikh raha'), a: <>{t('Order par courier chuna hai? "Rider ko de diya" ke waqt {{value}} chunna zaroori hai.', { value: own ? t('Apna rider') : c.name })}</> },
    ],
  };
}

/** The full guide for one courier (API or manual). */
export function courierGuide(c: Courier): GuideData {
  const api = API[c.code];
  if (c.mode !== 'api' || !api) return manualGuide(c);
  const portal = c.connect?.portalUrl;
  return {
    brand: brandForCourier(c.code),
    title: t('{{name}} ko Nafaa se jorein', { name: c.name }),
    intro: api.intro,
    steps: [
      ...api.steps.map((s) => (s.path?.includes('Jorein') ? { ...s, done: c.connected } : s)),
      ...BOOK_STEPS(c.name).map((s, i) => (i === 0 ? { ...s, done: c.connected && !c.missingSettings.length } : s)),
    ],
    test: api.test ?? TEST(c.name),
    errors: [...api.errors, ...COMMON_ERRORS(c.name)],
    links: portal ? [{ label: t('{{name}} portal', { name: c.name }), href: portal }] : undefined,
  };
}
