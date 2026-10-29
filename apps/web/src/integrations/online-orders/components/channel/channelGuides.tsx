/**
 * Setup guides for each sales-channel type, written from what the connect
 * code does (Shopify install, WooCommerce approve/plugin/webhooks, Daraz
 * allow, Indolj menu + General POS, own website API). Steps tick themselves
 * from the channel's live status.
 */

import type { WebsiteOverview } from '../../api/online-orders.api';
import type { GuideData } from '../guides/Guide';
import type { ChannelFacts } from './meta';

type Overview = WebsiteOverview;

export function channelGuide(f: ChannelFacts, data: Overview): GuideData {
  const i = data.integration!;
  const stats = data.stats;
  const linked = (stats?.productLinks ?? 0) > 0;
  const gotOrder = !!stats?.lastOrderAt || (stats?.allBranchesOrders ?? stats?.totalOrders ?? 0) > 0;

  if (f.kind === 'shopify') {
    return {
      brand: 'shopify',
      title: 'Shopify store jorna',
      intro: 'Shopify aur Nafaa khud baat karte hain: orders Nafaa me aate hain, stock Nafaa se Shopify par jata hai, aur "Raste me" par customer ko Shopify ki tracking email.',
      steps: [
        { title: 'Store ka naam likh kar "Jorein" dabayein', path: ['Nafaa', 'Channel', 'Setup'], body: <>Sirf naam likhein, jaise <b>hiba-e-store</b> (".myshopify.com" Nafaa khud lagata hai). Store ka naam Shopify admin ke address me hota hai.</>, done: f.automatic },
        { title: 'Shopify window me login karke "Install" dabayein', path: ['Shopify', 'Install app'], body: <>Chhoti window khulti hai. Wahan permissions dekh kar <b>Install</b>. Window na khule to browser me popups allow karein.</>, done: f.automatic },
        { title: 'Stock location check karein', path: ['Shopify admin', 'Settings', 'Locations'], body: <>Nafaa stock usi location par likhta hai jo Connection me "stock location" ke saath likhi hai. Kai locations hon to sahi wali pehli rakhein.</>, done: f.automatic && !!i.shopify?.locationName },
        { title: 'Products jorein', path: ['Nafaa', 'Online products'], body: <>Har Shopify product ko Nafaa product se jorein. SKU same ho to Nafaa khud salah deta hai — ek click me sab jur jate hain.</>, done: linked },
        { title: 'Settings me branch aur qeemat chunein', path: ['Channel', 'Settings'], body: <>Stock kis branch se jaye, bill me kaun si qeemat, aur order khud accept ho ya nahi.</> },
      ],
      test: [
        <>Upar <b>Test order</b> dabayein — Online orders me naya order aata hai aur ghanti bajti hai.</>,
        <>Shopify store par asli order karein (ya admin me draft order bana kar paid karein) — 1 minute me Nafaa me.</>,
        <>Accept → bill bana, stock kam. "Raste me" → Shopify par fulfillment aur tracking.</>,
      ],
      errors: [
        { q: '"Dobara install chahiye" likha aa raha hai', a: <>Shopify ne nayi ijazat maangi hai. Setup → <b>Dobara install</b>. Koi data nahi mitega.</> },
        { q: 'Shopify par order hua, Nafaa me nahi aaya', a: <>Activity tab dekhein. Kuch na ho to Setup → <b>Check</b> dabayein — webhooks dobara lag jate hain. Channel band to nahi?</> },
        { q: 'Shopify par stock update nahi hota', a: <>Product jura hua hai? Settings → "Stock kis branch se" sahi hai? Shopify me product par "Track quantity" on ho aur stock usi location par ho jo Nafaa me likhi hai.</> },
        { q: 'Install window khulti hi band ho jati hai', a: <>Browser popups block kar raha hai. Address bar me popup icon → Allow, phir dobara Jorein.</> },
        { q: 'Accept par "product nahi mila"', a: <>Online products me us Shopify product ko Nafaa product se jorein, ya Accept par khulne wale safhe par ek dafa chun lein — aage se khud.</> },
      ],
    };
  }

  if (f.kind === 'woocommerce') {
    return {
      brand: 'woocommerce',
      title: 'WooCommerce (WordPress) website jorna',
      intro: 'Teen tareeqe: Ek click (Approve), Nafaa plugin, ya sirf webhooks. Ek click sab se aasaan hai — keys aur webhooks Nafaa khud lagata hai.',
      steps: [
        { title: 'Website ka address likh kar "WooCommerce se jorein"', path: ['Nafaa', 'Channel', 'Setup'], body: <>Jaise <b>ahmedstore.pk</b>. Website <b>https</b> par honi chahiye.</>, done: f.automatic },
        { title: 'WordPress me login karke "Approve" dabayein', path: ['WordPress', 'WooCommerce', 'Approve'], body: <>Ye Nafaa ko orders aur products parhne/likhne ki ijazat deta hai. Nafaa khud webhooks lagata hai (order bana / badla / delete).</>, done: f.automatic },
        { title: 'Popup nahi chalta? Keys khud daalein', path: ['WooCommerce', 'Settings', 'Advanced', 'REST API', 'Add key'], body: <>Permissions: <b>Read/Write</b> → Generate. Consumer key aur secret Setup me "Keys khud daalein" me paste karein.</> },
        { title: 'Products jorein', path: ['Nafaa', 'Online products'], body: <>Har WooCommerce product aur us ke har variation ko Nafaa product se jorein. SKU same ho to salah khud aati hai.</>, done: linked },
        { title: 'Settings me branch aur qeemat chunein', path: ['Channel', 'Settings'] },
      ],
      test: [
        <>Upar <b>Test order</b> dabayein — Online orders me order aata hai.</>,
        <>Website par asli order karein — 1 minute me Nafaa me, ghanti ke saath.</>,
        <>Accept → website par order "Processing". Deliver → "Completed".</>,
      ],
      errors: [
        { q: 'Approve ke baad error ya 401', a: <>WordPress → Settings → <b>Permalinks</b> → "Post name" chunein (Plain par WooCommerce ka API nahi chalta). Security plugin (Wordfence) ya Cloudflare <b>/wp-json</b> ko rok raha ho to us me Nafaa allow karein.</> },
        { q: 'Website par order hua, Nafaa me nahi aaya', a: <>Activity dekhein. Setup → <b>Check</b> webhooks dobara lagata hai. WooCommerce → Settings → Advanced → Webhooks me Nafaa wale "Active" hon.</> },
        { q: 'Stock website par nahi badla', a: <>Product jura hua hai? WooCommerce me product par "Manage stock" on ho. Settings → "Stock kis branch se" check karein.</> },
        { q: 'https nahi hai', a: <>WooCommerce keys sirf https par bhejta hai. Hosting se free SSL (Let's Encrypt) lagwayein, phir dobara jorein.</> },
      ],
    };
  }

  if (f.kind === 'daraz') {
    return {
      brand: 'daraz',
      title: 'Daraz store jorna',
      intro: 'Daraz seller account se ek dafa "Allow" — phir orders har 5 minute khud aate hain, stock Nafaa se jata hai, aur Ready to ship + label order ke andar se.',
      steps: [
        { title: '"Daraz jorein" dabayein', path: ['Nafaa', 'Channel', 'Setup'], done: f.automatic },
        { title: 'Daraz Seller Center me login karke "Allow"', path: ['Daraz', 'Seller login', 'Allow'], body: <>Login wahi jo Seller Center ka hai. Allow ke baad wapas Nafaa par aa jate hain.</>, done: f.automatic },
        { title: 'Daraz ke SellerSku aur Nafaa ke SKU same rakhein', path: ['Seller Center', 'Products', 'Manage products'], body: <>Isi se product jurte hain. Phir Online products me salah qabool karein, ya Overview → <b>Products SKU se jorein</b>.</>, done: linked },
        { title: 'Order par Ready to ship aur label', path: ['Online orders', 'Order', 'Daraz delivery'], body: <>Accept (bill + stock) → pack → <b>Ready to ship</b> → <b>Daraz label</b> print karke parcel par.</>, done: gotOrder },
      ],
      test: [
        <>Overview → <b>Abhi orders lao</b> — naye Daraz orders foran aa jate hain.</>,
        <>Overview → <b>Stock Daraz par bhejo</b> — Seller Center me stock badla nazar aaye.</>,
      ],
      errors: [
        { q: '"Daraz ki permission jald khatam"', a: <>Daraz har kuch din baad ijazat dobara maangta hai. Overview → <b>Dobara jorein</b> → Allow.</> },
        { q: 'Daraz order Nafaa me nahi aaya', a: <>Orders har 5 minute check hote hain. <b>Abhi orders lao</b> dabayein. "Daraz se rabta toot gaya" ho to Dobara jorein.</> },
        { q: 'Product nahi jura / stock nahi gaya', a: <>Daraz ka SellerSku aur Nafaa ka SKU bilkul same hon (spaces bhi). Phir Products SKU se jorein.</> },
        { q: '"Daraz app server par nahi lagi"', a: <>Ye Nafaa ki taraf ka kaam hai — Nafaa support ko batayein.</> },
      ],
      links: [{ label: 'Daraz Seller Center', href: 'https://sellercenter.daraz.pk' }],
    };
  }

  if (f.kind === 'indolj') {
    return {
      brand: 'indolj',
      title: 'Indolj website jorna',
      intro: 'Indolj par bani website ke do hisse hain: menu (products) aur orders. Menu aap khud jorte hain; orders ki settings aksar Indolj ki team lagati hai.',
      steps: [
        { title: 'Indolj se Menu API ki keys lein', path: ['Indolj team', 'Menu API'], body: <>Indolj ki team <b>activation token</b> aur <b>JWT secret</b> deti hai (Merchant ID ho to wo bhi).</>, done: f.automatic },
        { title: 'Keys Nafaa me daal kar menu jorein', path: ['Channel', 'Setup', 'Indolj menu'], body: <>Poora menu sizes ke saath Nafaa me aa jata hai.</>, done: f.automatic },
        { title: 'Har menu item ko Nafaa product se jorein', path: ['Channel', 'Products'], body: <>Tab hi Indolj ka order bill banata aur stock kam karta hai.</>, done: linked },
        { title: 'Indolj ki team ko General POS settings bhejein', path: ['Indolj', 'General POS'], body: <>Har branch ka Call Back URL, Cancel Call Back URL, Token aur POS Code neeche se copy karein — "Message copy" poora English message bana deta hai.</>, done: gotOrder },
        { title: 'Har branch se ek test order', body: <>Website par order karein — yahan ghanti bajegi aur order par usi branch ka naam hoga.</>, done: gotOrder },
      ],
      test: [
        <>Upar <b>Test order</b> — Online orders me order aata hai.</>,
        <>Indolj website par har branch se ek asli order.</>,
      ],
      errors: [
        { q: 'Indolj ka order aata hi nahi', a: <>Activity dekhein. <b>401</b> = Token ghalat. Settings → "Sirf signed orders" <b>band</b> rakhein — Indolj sign nahi karta.</> },
        { q: 'Indolj par cancel hua, Nafaa me nahi', a: <>Indolj me <b>Cancel Call Back URL</b> bhi wahi ho jo Call Back URL hai.</> },
        { q: 'Order ghalat branch me aaya', a: <>Har branch ka apna Call Back URL lagwayein. Abhi wala order: order kholein → Branch badlein.</> },
        { q: 'Delivery charges sale me aa rahe hain, rider le jata hai', a: <>Settings → Delivery charges → <b>Rider ke</b>.</> },
      ],
    };
  }

  return {
    brand: f.brand,
    title: 'Apni banayi website jorna',
    intro: 'Website ka developer orders Nafaa ko bhejta hai — 15 minute ka kaam. Neeche se poori guide WhatsApp par bhej dein.',
    steps: [
      { title: 'Developer ko guide bhejein', path: ['Channel', 'Setup', 'WhatsApp par bhejo'], body: <>Guide me Orders URL, key aur PHP / Node / Python ka tayyar code hai.</> },
      { title: 'Website har order Nafaa ko bheje', path: ['Website', 'Checkout'], body: <>Order bante hi <b>POST</b> Orders URL par, header <b>X-Nafaa-Key</b> ke saath. Key sirf server par rahe — browser ke code me nahi.</>, done: gotOrder || i.webhookVerified },
      { title: 'Status wapas website par (optional)', path: ['Channel', 'Settings', 'Status URL'], body: <>Website ka ek URL daalein — accept, raste me, deliver, cancel par Nafaa wahan batata hai.</>, done: !!i.config.statusWebhookUrl },
      { title: 'Products jorein', path: ['Channel', 'Products'], body: <>Pehle order me product ek dafa chunein — aage se khud. Ya CSV se ek saath.</>, done: linked },
    ],
    test: [
      <>Upar <b>Test order</b> — Online orders me order aata hai.</>,
      <>Developer guide wala <b>curl</b> sample chala kar dekhein — Activity me "Theek" aaye.</>,
    ],
    errors: [
      { q: 'Website par order hua, Nafaa me nahi aaya', a: <>Activity dekhein. <b>401</b> = key ghalat — Setup se dobara copy karein. Kuch na ho = request aayi hi nahi; URL dobara check karein.</> },
      { q: '400 / "field missing"', a: <>Activity me ghalti ki wajah likhi hoti hai — developer ko wahi line bhejein. JSON sample guide me hai.</> },
      { q: 'Key galat haath lag gayi', a: <>Setup → Keys → <b>Nayi key</b>. Purani foran band; website me nayi daalni hogi.</> },
    ],
  };
}
