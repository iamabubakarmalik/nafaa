/**
 * Setup guides for each sales-channel type, written from what the connect
 * code does (Shopify install, WooCommerce approve/plugin/webhooks, Daraz
 * allow, Indolj menu + General POS, own website API). Steps tick themselves
 * from the channel's live status.
 */

import type { WebsiteOverview } from '../../api/online-orders.api';
import type { GuideData } from '../guides/Guide';
import type { ChannelFacts } from './meta';
import { t, Trans } from '@core/i18n';

type Overview = WebsiteOverview;

export function channelGuide(f: ChannelFacts, data: Overview): GuideData {
  const i = data.integration!;
  const stats = data.stats;
  const linked = (stats?.productLinks ?? 0) > 0;
  const gotOrder = !!stats?.lastOrderAt || (stats?.allBranchesOrders ?? stats?.totalOrders ?? 0) > 0;

  if (f.kind === 'shopify') {
    return {
      brand: 'shopify',
      title: t('Shopify store jorna'),
      intro: t('Shopify aur Nafaa khud baat karte hain: orders Nafaa me aate hain, stock Nafaa se Shopify par jata hai, aur "Raste me" par customer ko Shopify ki tracking email.'),
      steps: [
        { title: t('Store ka naam likh kar "Jorein" dabayein'), path: ['Nafaa', 'Channel', 'Setup'], body: <Trans text={'Sirf naam likhein, jaise {{example}} (".myshopify.com" Nafaa khud lagata hai). Store ka naam Shopify admin ke address me hota hai.'} values={{ example: <b>hiba-e-store</b> }} />, done: f.automatic },
        { title: t('Shopify window me login karke "Install" dabayein'), path: ['Shopify', 'Install app'], body: <Trans text="Chhoti window khulti hai. Wahan permissions dekh kar {{button}}. Window na khule to browser me popups allow karein." values={{ button: <b>Install</b> }} />, done: f.automatic },
        { title: t('Stock location check karein'), path: ['Shopify admin', 'Settings', 'Locations'], body: <>{t('Nafaa stock usi location par likhta hai jo Connection me "stock location" ke saath likhi hai. Kai locations hon to sahi wali pehli rakhein.')}</>, done: f.automatic && !!i.shopify?.locationName },
        { title: t('Products jorein'), path: ['Nafaa', 'Online products'], body: <>{t('Har Shopify product ko Nafaa product se jorein. SKU same ho to Nafaa khud salah deta hai — ek click me sab jur jate hain.')}</>, done: linked },
        { title: t('Settings me branch aur qeemat chunein'), path: ['Channel', 'Settings'], body: <>{t('Stock kis branch se jaye, bill me kaun si qeemat, aur order khud accept ho ya nahi.')}</> },
      ],
      test: [
        <Trans text="Upar {{button}} dabayein — Online orders me naya order aata hai aur ghanti bajti hai." values={{ button: <b>{t('Test order')}</b> }} />,
        <>{t('Shopify store par asli order karein (ya admin me draft order bana kar paid karein) — 1 minute me Nafaa me.')}</>,
        <>{t('Accept → bill bana, stock kam. "Raste me" → Shopify par fulfillment aur tracking.')}</>,
      ],
      errors: [
        { q: t('"Dobara install chahiye" likha aa raha hai'), a: <Trans text="Shopify ne nayi ijazat maangi hai. Setup → {{button}}. Koi data nahi mitega." values={{ button: <b>{t('Dobara install')}</b> }} /> },
        { q: t('Shopify par order hua, Nafaa me nahi aaya'), a: <Trans text="Activity tab dekhein. Kuch na ho to Setup → {{button}} dabayein — webhooks dobara lag jate hain. Channel band to nahi?" values={{ button: <b>{t('Check')}</b> }} /> },
        { q: t('Shopify par stock update nahi hota'), a: <>{t('Product jura hua hai? Settings → "Stock kis branch se" sahi hai? Shopify me product par "Track quantity" on ho aur stock usi location par ho jo Nafaa me likhi hai.')}</> },
        { q: t('Install window khulti hi band ho jati hai'), a: <>{t('Browser popups block kar raha hai. Address bar me popup icon → Allow, phir dobara Jorein.')}</> },
        { q: t('Accept par "product nahi mila"'), a: <>{t('Online products me us Shopify product ko Nafaa product se jorein, ya Accept par khulne wale safhe par ek dafa chun lein — aage se khud.')}</> },
      ],
    };
  }

  if (f.kind === 'woocommerce') {
    return {
      brand: 'woocommerce',
      title: t('WooCommerce (WordPress) website jorna'),
      intro: t('Teen tareeqe: Ek click (Approve), Nafaa plugin, ya sirf webhooks. Ek click sab se aasaan hai — keys aur webhooks Nafaa khud lagata hai.'),
      steps: [
        { title: t('Website ka address likh kar "WooCommerce se jorein"'), path: ['Nafaa', 'Channel', 'Setup'], body: <Trans text="Jaise {{example}}. Website {{https}} par honi chahiye." values={{ example: <b>ahmedstore.pk</b>, https: <b>https</b> }} />, done: f.automatic },
        { title: t('WordPress me login karke "Approve" dabayein'), path: ['WordPress', 'WooCommerce', 'Approve'], body: <>{t('Ye Nafaa ko orders aur products parhne/likhne ki ijazat deta hai. Nafaa khud webhooks lagata hai (order bana / badla / delete).')}</>, done: f.automatic },
        { title: t('Popup nahi chalta? Keys khud daalein'), path: ['WooCommerce', 'Settings', 'Advanced', 'REST API', 'Add key'], body: <Trans text={'Permissions: {{value}} → Generate. Consumer key aur secret Setup me "Keys khud daalein" me paste karein.'} values={{ value: <b>Read/Write</b> }} /> },
        { title: t('Products jorein'), path: ['Nafaa', 'Online products'], body: <>{t('Har WooCommerce product aur us ke har variation ko Nafaa product se jorein. SKU same ho to salah khud aati hai.')}</>, done: linked },
        { title: t('Settings me branch aur qeemat chunein'), path: ['Channel', 'Settings'] },
      ],
      test: [
        <Trans text="Upar {{button}} dabayein — Online orders me order aata hai." values={{ button: <b>{t('Test order')}</b> }} />,
        <>{t('Website par asli order karein — 1 minute me Nafaa me, ghanti ke saath.')}</>,
        <>{t('Accept → website par order "Processing". Deliver → "Completed".')}</>,
      ],
      errors: [
        { q: t('Approve ke baad error ya 401'), a: <Trans text={'WordPress → Settings → {{menu}} → "Post name" chunein (Plain par WooCommerce ka API nahi chalta). Security plugin (Wordfence) ya Cloudflare {{path}} ko rok raha ho to us me Nafaa allow karein.'} values={{ menu: <b>Permalinks</b>, path: <b>/wp-json</b> }} /> },
        { q: t('Website par order hua, Nafaa me nahi aaya'), a: <Trans text={'Activity dekhein. Setup → {{button}} webhooks dobara lagata hai. WooCommerce → Settings → Advanced → Webhooks me Nafaa wale "Active" hon.'} values={{ button: <b>{t('Check')}</b> }} /> },
        { q: t('Stock website par nahi badla'), a: <>{t('Product jura hua hai? WooCommerce me product par "Manage stock" on ho. Settings → "Stock kis branch se" check karein.')}</> },
        { q: t('https nahi hai'), a: <>{t('WooCommerce keys sirf https par bhejta hai. Hosting se free SSL (Let\'s Encrypt) lagwayein, phir dobara jorein.')}</> },
      ],
    };
  }

  if (f.kind === 'daraz') {
    return {
      brand: 'daraz',
      title: t('Daraz store jorna'),
      intro: t('Daraz seller account se ek dafa "Allow" — phir orders har 5 minute khud aate hain, stock Nafaa se jata hai, aur Ready to ship + label order ke andar se.'),
      steps: [
        { title: t('"Daraz jorein" dabayein'), path: ['Nafaa', 'Channel', 'Setup'], done: f.automatic },
        { title: t('Daraz Seller Center me login karke "Allow"'), path: ['Daraz', 'Seller login', 'Allow'], body: <>{t('Login wahi jo Seller Center ka hai. Allow ke baad wapas Nafaa par aa jate hain.')}</>, done: f.automatic },
        { title: t('Daraz ke SellerSku aur Nafaa ke SKU same rakhein'), path: ['Seller Center', 'Products', 'Manage products'], body: <Trans text="Isi se product jurte hain. Phir Online products me salah qabool karein, ya Overview → {{button}}." values={{ button: <b>{t('Products SKU se jorein')}</b> }} />, done: linked },
        { title: t('Order par Ready to ship aur label'), path: ['Online orders', 'Order', 'Daraz delivery'], body: <Trans text="Accept (bill + stock) → pack → {{ready}} → {{label}} print karke parcel par." values={{ ready: <b>{t('Ready to ship')}</b>, label: <b>{t('Daraz label')}</b> }} />, done: gotOrder },
      ],
      test: [
        <Trans text="Overview → {{button}} — naye Daraz orders foran aa jate hain." values={{ button: <b>{t('Abhi orders lao')}</b> }} />,
        <Trans text="Overview → {{button}} — Seller Center me stock badla nazar aaye." values={{ button: <b>{t('Stock Daraz par bhejo')}</b> }} />,
      ],
      errors: [
        { q: t('"Daraz ki permission jald khatam"'), a: <Trans text="Daraz har kuch din baad ijazat dobara maangta hai. Overview → {{button}} → Allow." values={{ button: <b>{t('Dobara jorein')}</b> }} /> },
        { q: t('Daraz order Nafaa me nahi aaya'), a: <Trans text={'Orders har 5 minute check hote hain. {{button}} dabayein. "Daraz se rabta toot gaya" ho to Dobara jorein.'} values={{ button: <b>{t('Abhi orders lao')}</b> }} /> },
        { q: t('Product nahi jura / stock nahi gaya'), a: <>{t('Daraz ka SellerSku aur Nafaa ka SKU bilkul same hon (spaces bhi). Phir Products SKU se jorein.')}</> },
        { q: t('"Daraz app server par nahi lagi"'), a: <>{t('Ye Nafaa ki taraf ka kaam hai — Nafaa support ko batayein.')}</> },
      ],
      links: [{ label: t('Daraz Seller Center'), href: 'https://sellercenter.daraz.pk' }],
    };
  }

  if (f.kind === 'indolj') {
    return {
      brand: 'indolj',
      title: t('Indolj website jorna'),
      intro: t('Indolj par bani website ke do hisse hain: menu (products) aur orders. Menu aap khud jorte hain; orders ki settings aksar Indolj ki team lagati hai.'),
      steps: [
        { title: t('Indolj se Menu API ki keys lein'), path: ['Indolj team', 'Menu API'], body: <Trans text="Indolj ki team {{token}} aur {{secret}} deti hai (Merchant ID ho to wo bhi)." values={{ token: <b>activation token</b>, secret: <b>JWT secret</b> }} />, done: f.automatic },
        { title: t('Keys Nafaa me daal kar menu jorein'), path: ['Channel', 'Setup', 'Indolj menu'], body: <>{t('Poora menu sizes ke saath Nafaa me aa jata hai.')}</>, done: f.automatic },
        { title: t('Har menu item ko Nafaa product se jorein'), path: ['Channel', 'Products'], body: <>{t('Tab hi Indolj ka order bill banata aur stock kam karta hai.')}</>, done: linked },
        { title: t('Indolj ki team ko General POS settings bhejein'), path: ['Indolj', 'General POS'], body: <>{t('Har branch ka Call Back URL, Cancel Call Back URL, Token aur POS Code neeche se copy karein — "Message copy" poora English message bana deta hai.')}</>, done: gotOrder },
        { title: t('Har branch se ek test order'), body: <>{t('Website par order karein — yahan ghanti bajegi aur order par usi branch ka naam hoga.')}</>, done: gotOrder },
      ],
      test: [
        <Trans text="Upar {{button}} — Online orders me order aata hai." values={{ button: <b>{t('Test order')}</b> }} />,
        <>{t('Indolj website par har branch se ek asli order.')}</>,
      ],
      errors: [
        { q: t('Indolj ka order aata hi nahi'), a: <Trans text={'Activity dekhein. {{code}} = Token ghalat. Settings → "Sirf signed orders" {{off}} rakhein — Indolj sign nahi karta.'} values={{ code: <b>401</b>, off: <b>{t('off')}</b> }} /> },
        { q: t('Indolj par cancel hua, Nafaa me nahi'), a: <Trans text="Indolj me {{field}} bhi wahi ho jo Call Back URL hai." values={{ field: <b>Cancel Call Back URL</b> }} /> },
        { q: t('Order ghalat branch me aaya'), a: <>{t('Har branch ka apna Call Back URL lagwayein. Abhi wala order: order kholein → Branch badlein.')}</> },
        { q: t('Delivery charges sale me aa rahe hain, rider le jata hai'), a: <Trans text="Settings → Delivery charges → {{option}}." values={{ option: <b>{t('Rider ke')}</b> }} /> },
      ],
    };
  }

  return {
    brand: f.brand,
    title: t('Apni banayi website jorna'),
    intro: t('Website ka developer orders Nafaa ko bhejta hai — 15 minute ka kaam. Neeche se poori guide WhatsApp par bhej dein.'),
    steps: [
      { title: t('Developer ko guide bhejein'), path: ['Channel', 'Setup', 'WhatsApp par bhejo'], body: <>{t('Guide me Orders URL, key aur PHP / Node / Python ka tayyar code hai.')}</> },
      { title: t('Website har order Nafaa ko bheje'), path: ['Website', 'Checkout'], body: <Trans text="Order bante hi {{method}} Orders URL par, header {{header}} ke saath. Key sirf server par rahe — browser ke code me nahi." values={{ method: <b>POST</b>, header: <b>X-Nafaa-Key</b> }} />, done: gotOrder || i.webhookVerified },
      { title: t('Status wapas website par (optional)'), path: ['Channel', 'Settings', 'Status URL'], body: <>{t('Website ka ek URL daalein — accept, raste me, deliver, cancel par Nafaa wahan batata hai.')}</>, done: !!i.config.statusWebhookUrl },
      { title: t('Products jorein'), path: ['Channel', 'Products'], body: <>{t('Pehle order me product ek dafa chunein — aage se khud. Ya CSV se ek saath.')}</>, done: linked },
    ],
    test: [
      <Trans text="Upar {{button}} — Online orders me order aata hai." values={{ button: <b>{t('Test order')}</b> }} />,
      <Trans text={'Developer guide wala {{cmd}} sample chala kar dekhein — Activity me "Theek" aaye.'} values={{ cmd: <b>curl</b> }} />,
    ],
    errors: [
      { q: t('Website par order hua, Nafaa me nahi aaya'), a: <Trans text="Activity dekhein. {{code}} = key ghalat — Setup se dobara copy karein. Kuch na ho = request aayi hi nahi; URL dobara check karein." values={{ code: <b>401</b> }} /> },
      { q: t('400 / "field missing"'), a: <>{t('Activity me ghalti ki wajah likhi hoti hai — developer ko wahi line bhejein. JSON sample guide me hai.')}</> },
      { q: t('Key galat haath lag gayi'), a: <Trans text="Setup → Keys → {{button}}. Purani foran band; website me nayi daalni hogi." values={{ button: <b>{t('Nayi key')}</b> }} /> },
    ],
  };
}
