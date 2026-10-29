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

type Courier = Pick<CourierAccount, 'code' | 'name' | 'mode' | 'connected' | 'missingSettings' | 'connect'>;

const BOOK_STEPS = (name: string): GuideStep[] => [
  {
    title: 'Settings poori karein',
    path: ['Couriers', name, 'Settings'],
    body: <>Pickup address, aam wazan aur note ek dafa bhar dein — har booking me khud lagenge. &quot;Accept hote hi khud book&quot; sirf ek courier par chalu karein.</>,
  },
  {
    title: 'Pehli booking',
    path: ['Couriers', name, 'Book karein'],
    body: <>Accept ho chuke orders chunein → <b>{name} par book</b>. CN khud aata hai aur order par likha jata hai. Ek order ke andar se bhi &quot;Courier par book karein&quot; dabaa sakte hain.</>,
  },
];

const COMMON_ERRORS = (name: string): GuideFix[] => [
  { q: '"Customer ka phone 03xxxxxxxxx jaisa hona chahiye"', a: <>Order kholein → customer ka phone theek karein (11 hindse, 03 se shuru) → dobara book karein.</> },
  { q: `"Shehar ${name} ki list me nahi mila"`, a: <>Booking window me shehar ki list se sahi shehar khud chunein — customer ne spelling ghalat likhi ho to aisa hota hai.</> },
  { q: '"Pehle order accept karein"', a: <>Courier booking sirf accept hue order ki hoti hai (bill ban chuka ho). Pehle Accept, phir book.</> },
  { q: 'Booking cancel nahi ho rahi', a: <>Courier parcel utha le to API se cancel nahi hoti — courier se baat karein ya parcel wapas aane par RTO karein.</> },
];

const TEST = (name: string) => [
  <>Connect par Nafaa usi waqt {name} se shehron ki list mangwa kar key check karta hai — ghalat key save hi nahi hoti.</>,
  <>Apne hi number par ek chhota order accept karke book karein, label print karein, phir booking cancel kar dein.</>,
  <>Couriers safhe par {name} ki tile par &quot;Jura hua&quot; aur sync ka waqt dikhe to sab theek hai.</>,
];

const API: Record<string, { intro: string; steps: GuideStep[]; errors: GuideFix[]; test?: ReactNode[] }> = {
  TCS: {
    intro: 'TCS ka connection TCS ki team deti hai — pehle Test (UAT), phir Live. Label PDF aur COD settlement khud aata hai.',
    steps: [
      { title: 'TCS se API access maangein', path: ['TCS account manager'], body: <>&quot;OCI / Envio API access&quot; maangein. Woh <b>Client ID</b>, <b>Client Secret</b>, <b>Envio username</b>, <b>Envio password</b> aur <b>account number</b> (jaise 04011K1) dete hain.</> },
      { title: 'Nafaa me paste karein', path: ['Couriers', 'TCS', 'Jorein'], body: <>Paanchon cheezein apne apne khane me daalein. <b>Kahan jorna hai</b> me pehle <b>Test (UAT)</b> chunein → <b>Check karke jorein</b>.</> },
      { title: 'Live keys par jayein', body: <>TCS test booking dekh kar Live keys deta hai (aam taur par 3 din). Phir Connection tab → <b>Nayi key</b> → Live chun kar dobara jorein.</> },
    ],
    errors: [
      { q: '"TCS ne Client ID / Client Secret nahi maana"', a: <>Keys TCS ki email se dobara copy karein — shuru ya aakhir me khali jagah na ho. Test keys ke saath &quot;Test (UAT)&quot; hi chunein.</> },
      { q: '"TCS ne Envio username / password nahi maana"', a: <>envio.tcscourier.com par isi username/password se login karke dekhein; na chale to TCS se reset karwayein.</> },
      { q: '"TCS account me koi cost center (pickup) nahi"', a: <>TCS se cost center banwayein, phir Settings → Cost center (pickup) chunein.</> },
    ],
  },
  LEOPARDS: {
    intro: 'Leopards ki API key aur password merchant portal par milte hain. Label link, COD settlement aur portal ke saare parcels Nafaa me aate hain.',
    steps: [
      { title: 'Leopards portal kholein', path: ['Leopards merchant portal', 'Login'], body: <>Apne merchant account se login karein.</> },
      { title: 'API key aur password copy karein', path: ['Leopards portal', 'API'], body: <>API wala hissa na mile to Leopards account manager se &quot;API key aur API password&quot; maangein.</> },
      { title: 'Nafaa me paste karein', path: ['Couriers', 'Leopards', 'Jorein'], body: <><b>API key</b> aur <b>API password</b> khano me daalein → <b>Check karke jorein</b>.</> },
      { title: 'Shehar chunein', path: ['Couriers', 'Leopards', 'Settings'], body: <>&quot;Parcel kis shehar se jayega&quot; — khali chhorein to Leopards account wala shehar lagta hai.</> },
    ],
    errors: [
      { q: '"Leopards ne API key / password nahi maana"', a: <>Dono cheezein portal se dobara copy karein. Password aur API password alag hain — login wala password nahi chalta.</> },
      { q: 'Label nahi khul raha', a: <>Leopards kabhi label link nahi deta — CN copy karke Leopards portal se print karein.</> },
    ],
  },
  POSTEX: {
    intro: 'PostEx sab se aasaan hai — sirf ek API token. Label PDF, COD settlement aur portal ke saare parcels Nafaa me.',
    steps: [
      { title: 'PostEx merchant portal kholein', path: ['merchant.postex.pk', 'Login'] },
      { title: 'API token copy karein', path: ['PostEx portal', 'Settings', 'API / Integration'], body: <>Na mile to PostEx support se &quot;API token&quot; maangein.</> },
      { title: 'Nafaa me paste karein', path: ['Couriers', 'PostEx', 'Jorein'], body: <><b>API token</b> khane me daalein → <b>Check karke jorein</b>.</> },
      { title: 'Pickup address chunein', path: ['Couriers', 'PostEx', 'Settings'], body: <>PostEx portal par bane pickup address me se ek chunein — rider wahin se parcel uthayega.</> },
    ],
    errors: [
      { q: '"PostEx ne key nahi maani"', a: <>Portal se poora token dobara copy karein. Naya token banaya ho to purana band ho jata hai.</> },
      { q: 'Pickup address ki list khali hai', a: <>PostEx portal par pehle pickup address banayein, phir Settings dobara kholein.</> },
    ],
  },
  TRAX: {
    intro: 'Trax ki API key Sonic portal ki Profile me hoti hai. Label PDF aur COD settlement khud aata hai.',
    steps: [
      { title: 'Sonic portal kholein', path: ['sonic.pk', 'Login'], body: <>Apne Trax account se login karein. Pickup address pehle se yahan bana hona chahiye.</> },
      { title: 'API key copy karein', path: ['Sonic portal', 'Profile', 'API key'], body: <>Profile safhe ke sab se neeche API key likhi hai.</> },
      { title: 'Nafaa me paste karein', path: ['Couriers', 'Trax', 'Jorein'], body: <><b>API key</b> daal kar <b>Check karke jorein</b>.</> },
      { title: 'Settings bharein', path: ['Couriers', 'Trax', 'Settings'], body: <>Pickup address, shipping mode (Rush / Saver Plus), account ki type aur maal ki type — jaise Trax ne aap ka account banaya.</> },
    ],
    errors: [
      { q: '"Trax ne API key nahi maani"', a: <>Sonic portal → Profile se key dobara copy karein.</> },
      { q: '"Trax account me koi pickup address nahi"', a: <>Sonic portal par pehle pickup address banayein, phir dobara jorein.</> },
    ],
  },
  MNP: {
    intro: 'M&P ki details un ka account manager deta hai. Booking aur tracking Nafaa se; label M&P portal se (CN copy karke).',
    steps: [
      { title: 'M&P se COD API access maangein', path: ['M&P account manager'], body: <>Woh <b>username</b>, <b>password</b>, <b>account number</b> (jaise 4T154) aur kabhi <b>return location</b> / <b>insert type</b> dete hain.</> },
      { title: 'Nafaa me paste karein', path: ['Couriers', 'M&P', 'Jorein'], body: <>Jo mila woh khano me daalein — optional khane khali chhor sakte hain → <b>Check karke jorein</b>.</> },
      { title: 'Pickup location aur service', path: ['Couriers', 'M&P', 'Settings'], body: <>Nafaa M&P se aap ki locations khud le aata hai — ek chunein.</> },
    ],
    errors: [
      { q: '"M&P ne username / password nahi maana"', a: <>M&P se mili details dobara check karein — account number bhi sahi hona chahiye.</> },
      { q: '"M&P location chunein"', a: <>Couriers → M&P → Settings → Pickup location chunein.</> },
      { q: 'Label print', a: <>M&P label API se nahi deta — CN copy karke M&P portal se print karein.</> },
    ],
  },
  CALL_COURIER: {
    intro: 'Call Courier sirf Login ID se jurta hai. Label aur cancel Call Courier portal se hote hain.',
    steps: [
      { title: 'Login ID lein', path: ['Call Courier KAM (account manager)'], body: <>Apna Login ID maangein — jaise <b>LHE-1234</b>.</> },
      { title: 'Nafaa me paste karein', path: ['Couriers', 'Call Courier', 'Jorein'], body: <><b>Login ID</b> daal kar <b>Check karke jorein</b>.</> },
      { title: 'Settings zaroor bharein', path: ['Couriers', 'Call Courier', 'Settings'], body: <>Apna shehar, phir area, bhejne wale ka naam, phone aur pickup address — label par yahi chhapta hai. Ye khali hon to booking nahi hoti.</> },
    ],
    errors: [
      { q: '"Call Courier ne Login ID nahi maana"', a: <>KAM se mila Login ID bilkul waise hi likhein (jaise LHE-1234).</> },
      { q: '"COD service par 0 amount nahi leta"', a: <>Paid (advance poora) order Call Courier ki COD service par nahi jata — kisi aur courier se bhejein.</> },
      { q: 'Cancel ya label', a: <>Dono Call Courier portal se karein — CN Nafaa me copy ho jata hai.</> },
    ],
  },
};

const MANUAL: Record<string, string> = {
  RIDER: 'Apna rider — koi CN nahi. Nafaa order ka safar aur COD ka paisa sambhalta hai.',
};

function manualGuide(c: Courier): GuideData {
  const own = c.code === 'RIDER';
  return {
    brand: brandForCourier(c.code),
    title: own ? 'Apne rider se delivery' : `${c.name} — manual tareeqa`,
    intro: own ? MANUAL.RIDER : `${c.name} ka API abhi Nafaa me nahi, is liye booking un ke portal par hoti hai. Tracking link, COD hisaab aur RTO phir bhi Nafaa me chalta hai.`,
    steps: [
      ...(own ? [] : [{ title: `${c.name} par parcel book karein`, path: [`${c.name} portal`], body: <>Parcel book karke CN (tracking number) lein.</> }]),
      {
        title: 'Order par courier likhein',
        path: ['Online orders', 'Order', 'Rider ko de diya'],
        body: own
          ? <>Pack hone ke baad <b>Rider ko de diya</b> dabayein aur <b>Apna rider</b> chunein — customer ko WhatsApp par &quot;raste me&quot; bhej sakte hain.</>
          : <>Pack hone ke baad <b>Rider ko de diya</b> dabayein → <b>{c.name}</b> chunein → CN daalein. Customer ko tracking link WhatsApp par jata hai.</>,
      },
      { title: 'Deliver ya wapas', body: <>Pohanch jaye to <b>Deliver ho gaya</b>; wapas aaye to <b>Wapas aaya (RTO)</b> — bill void aur stock khud wapas.</> },
      { title: 'COD ka paisa', path: ['Online store', 'COD & courier'], body: <>{own ? 'Rider' : c.name} paisa de to COD safhe par orders chun kar <b>Paisa mil gaya</b>.</> },
    ],
    test: [<>Ek order par ye qadam chala kar dekhein — COD safhe par woh order &quot;{own ? 'Rider' : 'Courier'} ke paas&quot; me dikhe.</>],
    errors: [
      { q: 'Order Couriers safhe par nahi dikh raha', a: <>Order par courier chuna hai? &quot;Rider ko de diya&quot; ke waqt {own ? 'Apna rider' : c.name} chunna zaroori hai.</> },
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
    title: `${c.name} ko Nafaa se jorein`,
    intro: api.intro,
    steps: [
      ...api.steps.map((s) => (s.path?.includes('Jorein') ? { ...s, done: c.connected } : s)),
      ...BOOK_STEPS(c.name).map((s, i) => (i === 0 ? { ...s, done: c.connected && !c.missingSettings.length } : s)),
    ],
    test: api.test ?? TEST(c.name),
    errors: [...api.errors, ...COMMON_ERRORS(c.name)],
    links: portal ? [{ label: `${c.name} portal`, href: portal }] : undefined,
  };
}
