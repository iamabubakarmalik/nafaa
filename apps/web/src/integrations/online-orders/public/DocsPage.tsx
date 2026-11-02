import { useEffect, useState, type ReactNode } from 'react';
import { BookOpen, CheckCircle2, ChevronRight, LifeBuoy } from 'lucide-react';
import { Alert, Table as DsTable, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { CodeBlock } from '@integrations/_core/components/CodeBlock';
import { SAMPLE_ORDER } from '../lib/snippets';
import { cn } from '@core/lib/cn';
import { t as tr, Trans } from '@core/i18n';

/* ═════════════════════════════════════════════════════════════
   ONLINE STORE GUIDE — bina login, malik aur developer dono ke liye.
   Har platform, har setting, poora API aur masle ka hal ek jagah —
   taake koi bhi khud jor le, kisi ko bulana na pare.
   App ke andar har setting / step isi ke kisi hisse (#anchor) se jurta hai.
   ═════════════════════════════════════════════════════════════ */

const API = `${(import.meta.env.VITE_API_URL || 'https://api.nafaa.pk/api').replace(/\/+$/, '')}/integrations/website/v1`;

const TOC: Array<{ id: string; label: string; sub?: Array<{ id: string; label: string }> }> = [
  { id: 'shuru', label: tr('Kaise kaam karta hai') },
  { id: 'platform', label: tr('Kaunsa raasta chunein') },
  { id: 'woocommerce', label: 'WordPress / WooCommerce' },
  { id: 'shopify', label: 'Shopify' },
  { id: 'indolj', label: 'Indolj' },
  { id: 'apni-website', label: tr('Apni banayi website') },
  { id: 'branches', label: tr('Kai branches') },
  { id: 'products', label: tr('Products aur stock') },
  { id: 'orders', label: tr('Order ka safar') },
  {
    id: 'settings', label: tr('Har setting'), sub: [
      { id: 'setting-auto-accept', label: tr('Khud accept') },
      { id: 'setting-stock-branch', label: tr('Stock kis branch se') },
      { id: 'setting-delivery', label: tr('Delivery charges') },
      { id: 'setting-price', label: tr('Bill me qeemat') },
      { id: 'setting-status-url', label: tr('Status URL') },
      { id: 'setting-signed', label: tr('Sirf signed orders') },
    ],
  },
  { id: 'api', label: 'Developer API' },
  { id: 'masle', label: tr('Masle aur hal') },
  { id: 'madad', label: tr('Phir bhi madad chahiye') },
];

export default function DocsPage() {
  const [active, setActive] = useState('shuru');

  // Jo hissa screen par hai, menu me wahi roshan
  useEffect(() => {
    const ids = TOC.flatMap((t) => [t.id, ...(t.sub ?? []).map((s) => s.id)]);
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((entries) => {
      const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (top) setActive(top.target.id);
    }, { rootMargin: '-80px 0px -70% 0px' });
    els.forEach((el) => io.observe(el));
    // Link se aaye (#setting-delivery) to wahan jao
    if (window.location.hash) setTimeout(() => document.getElementById(window.location.hash.slice(1))?.scrollIntoView(), 50);
    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-brand-fg"><BookOpen className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[0.875rem] font-bold text-slate-900">{tr('Nafaa — Online store guide')}</div>
            <div className="truncate text-[0.75rem] text-slate-500">{tr('Website, Indolj, WooCommerce, Shopify — khud jorein, khud chalayein')}</div>
          </div>
          <a href="/online-store/channels" className="inline-flex h-8 items-center rounded-md bg-slate-900 px-3 text-xs font-semibold text-white shadow-sm hover:bg-slate-800">{tr('Nafaa kholein')}</a>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[13.75rem_minmax(0,1fr)]">
        <nav className="hidden lg:block">
          <ul className="sticky top-20 space-y-0.5 text-[0.8125rem]">
            {TOC.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className={cn('block rounded-md px-2 py-1.5', active === t.id ? 'bg-brand-50 font-semibold text-brand-800' : 'text-slate-600 hover:bg-slate-50')}>{t.label}</a>
                {t.sub && (
                  <ul className="ms-3 border-s border-slate-200 ps-2">
                    {t.sub.map((s) => (
                      <li key={s.id}><a href={`#${s.id}`} className={cn('block rounded-md px-2 py-1 text-[0.78125rem]', active === s.id ? 'font-semibold text-brand-800' : 'text-slate-500 hover:text-slate-800')}>{s.label}</a></li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 max-w-3xl space-y-14 pb-24 text-[0.90625rem] leading-relaxed">
          {/* Mobile par upar chhota menu */}
          <details className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:hidden">
            <summary className="cursor-pointer text-[0.8125rem] font-semibold">{tr('Is guide me kya hai')}</summary>
            <ul className="mt-2 space-y-1 text-[0.8125rem]">{TOC.map((t) => <li key={t.id}><a className="text-brand-700" href={`#${t.id}`}>{t.label}</a></li>)}</ul>
          </details>

          <Section id="shuru" title={tr('Online store kaise kaam karta hai')}>
            <p><Trans text="Customer aap ki website, Indolj, WooCommerce ya Shopify par order karta hai → order {{now}} aata hai aur ghanti bajti hai → aap {{accept}} dabate hain → bill banta hai aur stock kam hota hai → status (accept, raste me, deliver, cancel) website ko wapas jata hai." values={{ now: <b>{tr('foran Nafaa me')}</b>, accept: <b>{tr('Accept')}</b> }} /></p>
            <Steps items={[
              [tr('Channel banayein'), <Trans text="Nafaa → {{path}} → apna platform chunein." values={{ path: <b>{tr('Online store → Add channel')}</b> }} />],
              [tr('Jorein'), <>{tr('Platform ke hisaab se neeche wala hissa parhein — zyada tar 2-10 minute ka kaam.')}</>],
              [tr('Products jorein'), <Trans text="Channel → {{tab}} tab — website ke products Nafaa ke products se jorein (ek click me naye bhi ban jate hain)." values={{ tab: <b>{tr('Products')}</b> }} />],
              [tr('Test order'), <Trans text="Channel par {{button}} dabayein ya website par ek order karein. Ghanti baje to sab theek." values={{ button: <b>{tr('Test order')}</b> }} />],
            ]} />
            <Note><Trans text="Har channel ke andar {{tab}} tab me aap ki apni keys aur URL tayyar milte hain — copy karke paste karein. Is guide me sirf tareeqa hai, aap ki keys nahi." values={{ tab: <b>{tr('Setup')}</b> }} /></Note>
          </Section>

          <Section id="platform" title={tr('Kaunsa raasta chunein')}>
            <Table head={[tr('Aap ki website'), tr('Raasta'), tr('Waqt'), tr('Kya milta hai')]} rows={[
              ['WordPress / WooCommerce', tr('Ek click (Approve)'), '2 min', tr('Orders, status wapas, stock, products dono taraf')],
              ['Shopify', tr('Ek click (Install)'), '2 min', tr('Orders, fulfillment + tracking, stock')],
              ['Indolj', tr('General POS settings'), '10 min', tr('Orders, cancel, menu Nafaa me, kai branches')],
              [tr('Apni banayi (PHP, Laravel, Node…)'), tr('Developer API — ek POST'), '15 min', tr('Orders, cancel, stock / products API')],
              [tr('Website hi nahi'), tr('Nafaa order form'), '1 min', tr('Link + "Order karein" button, Instagram / WhatsApp par')],
            ]} />
          </Section>

          <Section id="woocommerce" title="WordPress / WooCommerce">
            <H3>{tr('Ek click (sab se aasaan)')}</H3>
            <Steps items={[
              [tr('Add channel → WooCommerce'), <Trans text="Site ka address likhein (jaise {{example}}) → {{button}}." values={{ example: <code>ahmedstore.pk</code>, button: <b>{tr('Jorein')}</b> }} />],
              [tr('Approve'), <Trans text="Chhoti window me WordPress khulega → login → {{button}}. Keys aur webhooks Nafaa khud lagata hai." values={{ button: <b>{tr('Approve')}</b> }} />],
              [tr('Products jorein'), <>{tr('Products tab → jo match ho gaye wo khud jure; baqi ek click me.')}</>],
            ]} />
            <Note tone="warning">{tr('Window na khule ya "https" ka masla aaye: site par SSL (https) zaroori hai. Na ho to neeche wala plugin raasta chalta hai.')}</Note>
            <H3>{tr('Nafaa plugin')}</H3>
            <Steps items={[
              [tr('Plugin download'), <Trans text="Channel → {{tab}} → {{file}}." values={{ tab: <b>{tr('Setup')}</b>, file: <b>nafaa-woocommerce.zip</b> }} />],
              [tr('Install'), <>{tr('WP Admin → Plugins → Add New → Upload Plugin → zip → Install → Activate.')}</>],
              [tr('Key + Secret'), <Trans text="WP Admin → WooCommerce → {{menu}} → Setup tab wali Key aur Secret paste → {{button}}." values={{ menu: <b>Nafaa POS</b>, button: <b>Save &amp; Connect</b> }} />],
            ]} />
            <H3>{tr('Bina plugin (sirf orders)')}</H3>
            <p><Trans text="WooCommerce → Settings → Advanced → Webhooks → Add webhook: Topic {{created}}, Delivery URL aur Secret Setup tab se. Ek aur {{updated}} ke liye bhi banayein (cancel / payment ki khabar)." values={{ created: <b>Order created</b>, updated: <b>Order updated</b> }} /></p>
          </Section>

          <Section id="shopify" title="Shopify">
            <Steps items={[
              [tr('Add channel → Shopify'), <Trans text="Store ka naam likhein (jaise {{example}}.myshopify.com) → {{button}}." values={{ example: <code>ahmed-store</code>, button: <b>{tr('Shopify se jorein')}</b> }} />],
              [tr('Install'), <Trans text="Shopify khulega → {{button}}. Orders, cancel, payment ke webhooks aur stock location khud lag jate hain." values={{ button: <b>Install</b> }} />],
              [tr('Products jorein'), <>{tr('Products tab se.')}</>],
            ]} />
            <p><Trans text="Nafaa me {{button}} dabane par Shopify me fulfillment + tracking number jata hai aur customer ko Shopify ki email." values={{ button: <b>{tr('Raste me')}</b> }} /></p>
            <Note><Trans text={'"Dobara install chahiye" likha aaye to channel par {{button}} dabayein — koi data nahi mitta.'} values={{ button: <b>{tr('Dobara install')}</b> }} /></Note>
          </Section>

          <Section id="indolj" title="Indolj">
            <p><Trans text="Indolj par bani website (menu + orders) Nafaa se do hisson me jurti hai: {{menu}} (products) aur {{orders}}." values={{ menu: <b>{tr('menu')}</b>, orders: <b>{tr('orders')}</b> }} /></p>
            <H3>{tr('1. Menu Nafaa me laayein')}</H3>
            <Steps items={[
              [tr('Indolj se 2 cheezein lein'), <Trans text="Indolj team se kahen: {{request}}" values={{ request: <i>"Please share our Menu API <b>activation token</b> and <b>JWT secret</b>."</i> }} />],
              [tr('Nafaa me daalein'), <Trans text="Channel → {{tab}} tab → {{button}} → dono paste → Save. Menu foran aa jata hai." values={{ tab: <b>{tr('Products')}</b>, button: <b>{tr('Indolj se jorein')}</b> }} />],
              [tr('Products jorein'), <Trans text="Har menu item ke saamne Nafaa product chunein, ya {{button}} — variants (size / flavour) bhi." values={{ button: <b>{tr('"Baqi Nafaa me banao"')}</b> }} />],
            ]} />
            <H3>{tr('2. Orders Nafaa me')}</H3>
            <p><Trans text="Indolj ki {{section}} settings me har branch ke liye ye bharein (Nafaa channel → {{tab}} tab me har khaana copy button ke saath tayyar hai):" values={{ section: <b>General POS</b>, tab: <b>{tr('Setup')}</b> }} /></p>
            <Table head={[tr('Indolj ka khaana'), tr('Kya daalein')]} rows={[
              ['POS Code', tr('Nafaa branch ki ID (Setup tab me har branch ke saath)')],
              ['Token', tr('Nafaa key (nfk_… — Setup tab)')],
              ['Call Back URL', tr('Usi branch ka Nafaa orders URL (…/orders/branch/<branch id>)')],
              ['Cancel Call Back URL', tr('Wahi URL')],
              ['Status', 'Active'],
              ['Send on Order Placement', 'ON'],
            ]} />
            <Note><Trans text="Ye settings aksar Indolj ki team lagati hai. Setup tab me {{button}} dabayein — English me poora message (har branch ka URL + Token) copy ho jata hai, WhatsApp group me paste kar dein." values={{ button: <b>{tr('"Indolj ko bhejein"')}</b> }} /></Note>
            <H3>{tr('Kai branches')}</H3>
            <p><Trans text="Indolj order ke andar branch nahi bhejta — branch {{byUrl}} pehchani jati hai. Is liye har branch ka Call Back URL alag ho. Ek hi URL sab branches me laga ho to sab orders ek branch me aayenge — order khol kar {{branch}} se badal sakte hain." values={{ byUrl: <b>{tr('URL se')}</b>, branch: <b>{tr('Branch')}</b> }} /></p>
          </Section>

          <Section id="apni-website" title={tr('Apni banayi website')}>
            <p>{tr('Teen raaste — jo aasaan lage:')}</p>
            <Table head={[tr('Raasta'), tr('Kis ke liye'), tr('Kaise')]} rows={[
              [tr('Order form (code ke bina)'), tr('Jinke paas developer nahi'), tr('Setup → Code ke bina → "Order form chalu karein". Link share karein, ya website par ek line ka button.')],
              [tr('Developer ko link'), tr('Jinke paas developer hai'), tr('Setup → Developer ko bhejein → link WhatsApp karein. Us page par keys, code, test sab hai.')],
              [tr('Khud code'), tr('Developer khud'), tr('Neeche Developer API — ek POST request.')],
            ]} />
          </Section>

          <Section id="branches" title={tr('Kai branches')}>
            <Steps items={[
              [tr('Har branch ka apna URL'), <Trans text="Channel → {{path}}. Jo order jis URL par aaye, bill aur stock usi branch ka." values={{ path: <b>{tr('Setup → Har branch ka URL')}</b> }} />],
              [tr('Bina branch wala URL'), <Trans text="Branch ke baghair URL par aaya order channel ki {{setting}} wali branch me jata hai." values={{ setting: <b>{tr('Stock kis branch se')}</b> }} />],
              [tr('Ghalat branch me aaya?'), <Trans text={'Order kholein → {{button}} → sahi branch. "Aage se bhi" tick karein to agle orders khud wahan.'} values={{ button: <b>{tr('Branch')}</b> }} />],
            ]} />
            <p><Trans text="Upar branch chunein to Online orders aur channel ki ginti sirf usi branch ki; {{all}} par sab — har order par branch ka naam likha hota hai." values={{ all: <b>{tr('All Shops')}</b> }} /></p>
          </Section>

          <Section id="products" title={tr('Products aur stock')}>
            <ul className="list-disc space-y-1.5 ps-5">
              <li><b>{tr('Jorna:')}</b> {' '}{tr('Products tab me website ka har product ek Nafaa product (ya variant) se jurta hai. SKU / naam same ho to khud jur jata hai.')}</li>
              <li><b>{tr('Naya banao:')}</b> {' '}{tr('jo product Nafaa me nahi — "Naya banao" ya "Baqi sab Nafaa me banao". Variants ke liye "Nafaa product me variants jorein".')}</li>
              <li><b>{tr('Stock:')}</b> {' '}{tr('malik Nafaa hai. Jure hue product ka stock har 15 minute aur har accept / cancel par website par jata hai (WooCommerce, Shopify).')}</li>
              <li><b>{tr('Na jura product:')}</b> {' '}{tr('order phir bhi aata hai; Accept par Nafaa poochta hai kis product se jorna hai — sirf ek dafa.')}</li>
            </ul>
          </Section>

          <Section id="orders" title={tr('Order ka safar')}>
            <Table head={[tr('Haal'), tr('Matlab'), tr('Website ko kya jata hai')]} rows={[
              [tr('Naya'), tr('Order aaya, accept baqi — ghanti bajti hai'), '—'],
              [tr('Accept'), tr('Bill bana, stock kam'), 'order.confirmed'],
              [tr('Pack / Raste me'), tr('Courier / rider ke paas'), 'order.status_changed (+ tracking)'],
              [tr('Delivered'), tr('Mil gaya — COD ho to paisa'), 'order.status_changed'],
              [tr('Cancel'), tr('Bill void, stock wapas'), 'order.cancelled'],
              [tr('Wapas (RTO)'), tr('Customer ne nahi liya'), 'order.returned'],
            ]} />
            <p><b>{tr('COD:')}</b> {' '}<Trans text={'"COD baqi" tab me jo paisa aana hai. Courier ka paisa aaye to {{page}} me settle karein.'} values={{ page: <b>{tr('COD & courier')}</b> }} /></p>
            <p><b>{tr('Bahar ka rider:')}</b> {' '}<Trans text="Indolj / Foodpanda / Bykea ka rider delivery charges khud le to Settings → {{link}}." values={{ link: <a href="#setting-delivery">{tr('Delivery charges → Rider ke')}</a> }} /></p>
          </Section>

          <Section id="settings" title={tr('Har setting ka matlab')}>
            <Setting id="setting-auto-accept" title={tr('Order aate hi khud accept')}>
              {tr('On ho to har order khud accept — bill aur stock foran. Product na jura ho ya stock kam ho to order "Naya" me ruk jata hai taake aap dekh lein. Naye log pehle off rakhein.')}
            </Setting>
            <Setting id="setting-auto-print" title={tr('Accept par receipt kholo')}>
              {tr('Accept dabate hi receipt khulti hai; POS me auto-print on ho to print bhi.')}
            </Setting>
            <Setting id="setting-stock-branch" title={tr('Stock kis branch se')}>
              {tr('Is channel ke orders ka stock is branch se kam hota hai aur website ko isi ka stock dikhta hai. Kai branches me, branch wale URL par aaya order apni branch ka stock leta hai.')}
            </Setting>
            <Setting id="setting-delivery" title={tr('Delivery charges kis ke paas?')}>
              <b>{tr('Dukaan ke:')}</b> {' '}{tr('delivery charges bill aur sale me (apna rider).')}{' '} <b>{tr('Rider ke:')}</b> {' '}{tr('bahar ka rider (Indolj, Foodpanda, Bykea) khud le leta hai — bill par likha aata hai ("Delivery (rider ko dein)"), lekin sale, drawer aur profit me nahi. COD me dukaan ka paisa delivery ke baghair.')}
            </Setting>
            <Setting id="setting-price" title={tr('Bill me qeemat')}>
              <b>{tr('Website wali:')}</b> {' '}{tr('jo customer ne di (offer chal raha ho to yahi).')}{' '} <b>{tr('Nafaa wali:')}</b> {' '}{tr('POS ki qeemat.')}
            </Setting>
            <Setting id="setting-push-price" title={tr('Nafaa ki qeemat website par bhi')}>
              {tr('(WooCommerce / Shopify) Nafaa me qeemat badlein → website par 1-2 minute me. Website par sale chalate hon to off rakhein.')}
            </Setting>
            <Setting id="setting-status-url" title={tr('Status URL (apni website)')}>
              <Trans text="Nafaa har status badalne par is URL par POST karta hai — neeche {{link}}. WooCommerce / Shopify / Indolj me zaroorat nahi." values={{ link: <a href="#api-status-webhook">{tr('Status webhook')}</a> }} />
            </Setting>
            <Setting id="setting-signed" title={tr('Sirf signed orders')}>
              <Trans text="On ho to sirf wahi order qabool jis par sahi {{header}} ho. Plugin aur ek-click khud sign karte hain. Indolj sign nahi karta — Indolj ke liye off rakhein." values={{ header: <code>X-Nafaa-Signature</code> }} />
            </Setting>
          </Section>

          {/* The developer section stays English in every language. */}
          <Section id="api" title="Developer API">
            <p className="text-slate-600">{tr('For developers (English). Base URL:')}</p>
            <CodeBlock code={API} />
            <H3 id="api-auth">Authentication</H3>
            <p>Send your Nafaa key (channel → Setup) from your <b>server</b> — never from browser JavaScript. Any of:</p>
            <CodeBlock code={'X-Nafaa-Key: nfk_xxxxxxxxxxxxxxxx\n# or\nAuthorization: Bearer nfk_xxxxxxxxxxxxxxxx'} />
            <p>Optional signature (recommended): <code>X-Nafaa-Signature: sha256=&lt;hex HMAC-SHA256 of the raw body with your Secret&gt;</code>. Required only if "Sirf signed orders" is on.</p>

            <H3 id="api-orders">Create an order</H3>
            <CodeBlock code={`POST ${API}/orders\nPOST ${API}/orders/branch/{branchId}   # multi-branch: order goes to that branch`} />
            <Table head={['Field', 'Type', 'Required', 'Notes']} rows={[
              ['orderId', 'string', 'yes', 'Your order id — unique per channel. Re-sending the same id does not duplicate.'],
              ['orderNumber', 'string', '', 'Shown to staff (defaults to orderId)'],
              ['customer.name / phone / email / address / city', 'string', 'name', 'Phone in any PK format'],
              ['items[].name', 'string', 'yes', ''],
              ['items[].quantity', 'number', 'yes', ''],
              ['items[].price', 'number', 'yes', 'Unit price'],
              ['items[].sku', 'string', '', 'Best way to auto-match the Nafaa product'],
              ['items[].variant', 'string', '', 'e.g. "M", "Red"'],
              ['deliveryFee', 'number', '', ''],
              ['discount', 'number', '', ''],
              ['total', 'number', '', 'Defaults to items + deliveryFee − discount'],
              ['paymentMethod', 'string', '', 'cod | card | jazzcash | easypaisa | bank'],
              ['paymentStatus', 'string', '', 'pending | paid'],
              ['notes', 'string', '', 'Customer note'],
            ]} />
            <CodeBlock label="Example body" code={JSON.stringify(SAMPLE_ORDER, null, 2)} />
            <CodeBlock label="Response 200" code={'{ "success": true, "data": { "success": true, "message": "Order Nafaa me aa gaya ✅", "nafaaOrderId": "…", "status": "PENDING" } }'} />

            <H3 id="api-errors">Errors</H3>
            <Table head={['HTTP', 'Meaning', 'Fix']} rows={[
              ['401', 'Key wrong, channel paused, or signature mismatch', 'Copy the key again from Setup; check channel is not paused'],
              ['400', 'Body invalid (e.g. no items)', 'See the message field'],
              ['404', 'Wrong URL', 'Copy the URL from Setup exactly'],
              ['429', 'Too many requests', 'Retry after a minute'],
            ]} />

            <H3 id="api-cancel">Cancel / mark paid</H3>
            <CodeBlock code={`POST ${API}/orders/{orderId}/status\n{ "status": "cancelled", "reason": "Customer cancelled" }\n{ "paymentStatus": "paid" }`} />

            <H3 id="api-catalog">Products and stock (Nafaa → your site)</H3>
            <CodeBlock code={`GET  ${API}/products?page=1&limit=100   # products + live stock\nGET  ${API}/stock?skus=SKU1,SKU2        # stock only\nPOST ${API}/products                    # { "products": [{ name, sku, price, stock, category, images }] }\nGET  ${API}/verify                      # check the key`} />

            <H3 id="api-status-webhook">Status webhook (Nafaa → your site)</H3>
            <p>Set <b>Status URL</b> in channel Settings. Nafaa POSTs on every change, with headers <code>X-Nafaa-Event</code> and <code>X-Nafaa-Signature</code>. Events: <code>order.confirmed</code>, <code>order.status_changed</code>, <code>order.cancelled</code>, <code>order.paid</code>, <code>order.returned</code>. Reply with any 2xx within 8 seconds.</p>
            <CodeBlock code={JSON.stringify({ event: 'order.status_changed', orderId: '1042', orderNumber: '1042', status: 'OUT_FOR_DELIVERY', paymentStatus: 'PENDING', trackingNumber: 'TCS123456', courierName: 'TCS', cancelReason: null, timestamp: '2026-10-07T12:00:00.000Z' }, null, 2)} />
            <CodeBlock label="Verify signature (PHP)" code={`$raw = file_get_contents('php://input');\n$ok  = hash_equals('sha256=' . hash_hmac('sha256', $raw, NAFAA_SECRET), $_SERVER['HTTP_X_NAFAA_SIGNATURE'] ?? '');`} />
          </Section>

          <Section id="masle" title={tr('Masle aur hal')}>
            <Faq q={tr('Website par order hua, Nafaa me nahi aaya')}>
              <Trans text="Channel → {{tab}} tab dekhein. {{error}} = key / Token ghalat (Setup se dobara copy karein; Indolj ke Token me {{prefix}} ho ya na ho, dono chalte hain). Kuch bhi nahi dikha = request Nafaa tak aayi hi nahi: URL dobara copy karein, channel band (paused) to nahi?" values={{ tab: <b>{tr('Activity')}</b>, error: <b>{tr('Ghalti 401')}</b>, prefix: <code>nfk_</code> }} />
            </Faq>
            <Faq q={tr('Order ghalat branch me aaya')}>
              <Trans text="Har branch ka URL alag lagayein ({{link}}). Abhi wala order: order kholein → {{button}} → sahi branch." values={{ link: <a href="#branches">{tr('Kai branches')}</a>, button: <b>{tr('Branch')}</b> }} />
            </Faq>
            <Faq q={tr('Accept par \'product nahi mila\'')}>
              {tr('Products tab me us item ko Nafaa product se jorein, ya Accept par jo safha khulta hai wahan ek dafa chun lein — aage se khud.')}
            </Faq>
            <Faq q={tr('Website par stock update nahi hota')}>
              <Trans text="Product jura hua hai? (Products tab). Settings → {{link}} sahi branch hai? WooCommerce / Shopify me channel par {{button}} dabayein." values={{ link: <a href="#setting-stock-branch">{tr('Stock kis branch se')}</a>, button: <b>{tr('Check')}</b> }} />
            </Faq>
            <Faq q={tr('Customer ne website par cancel kiya, Nafaa me nahi hua')}>
              <Trans text="Indolj: {{field}} lagaya hai? Apni website: {{link}} bhejein. WooCommerce / Shopify me khud hota hai." values={{ field: <b>Cancel Call Back URL</b>, link: <a href="#api-cancel">{tr('status API')}</a> }} />
            </Faq>
            <Faq q={tr('Delivery charges sale / drawer me aa rahe hain, rider le jata hai')}>
              <Trans text="Settings → {{link}}." values={{ link: <a href="#setting-delivery">{tr('Delivery charges → Rider ke')}</a> }} />
            </Faq>
            <Faq q={tr('Key kisi ghalat haath lag gayi')}>
              <Trans text="Setup → {{button}}. Purani foran band. WooCommerce / Shopify ek-click khud shift ho jate hain; plugin, apni website aur Indolj me nayi key daalni hogi." values={{ button: <b>{tr('Nayi key')}</b> }} />
            </Faq>
          </Section>

          <Section id="madad" title={tr('Phir bhi madad chahiye')}>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <p><Trans text="Pehle channel ka {{tab}} tab dekhein — har ghalti ki wajah wahin likhi hoti hai. Phir bhi na bane to {{email}} par channel ka naam aur Activity ka screenshot bhejein." values={{ tab: <b>{tr('Activity')}</b>, email: <a href="mailto:support@nafaa.pk" className="dir-ltr">support@nafaa.pk</a> }} /></p>
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}

/* ─── chhote hisse ─── */

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <h2 className="group flex items-center gap-2 text-[1.375rem] font-bold tracking-tight text-slate-900">
        {title}
        <a href={`#${id}`} className="text-slate-300 opacity-0 transition group-hover:opacity-100" aria-label={tr('Link')}>#</a>
      </h2>
      {children}
    </section>
  );
}

function H3({ id, children }: { id?: string; children: ReactNode }) {
  return <h3 id={id} className="scroll-mt-20 pt-2 text-[1rem] font-semibold text-slate-900">{children}</h3>;
}

function Steps({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <ol className="space-y-3">
      {items.map(([t, d], n) => (
        <li key={t} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[0.75rem] font-bold text-brand-800">{n + 1}</span>
          <div className="min-w-0"><div className="font-semibold text-slate-900">{t}</div><div className="text-slate-600">{d}</div></div>
        </li>
      ))}
    </ol>
  );
}

function Note({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' }) {
  return (
    <Alert tone={tone}>{children}</Alert>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <DsTable minWidth="32.5rem" className="rounded-xl border border-slate-200 bg-white">
      <THead><Tr>{head.map((h) => <Th key={h} className="px-3">{h}</Th>)}</Tr></THead>
      <TBody>
        {rows.map((r, i) => <Tr key={i}>{r.map((c, j) => <Td key={j} className={cn('px-3 py-2 align-top text-[0.8125rem]', j === 0 && 'font-medium text-slate-900')}>{c}</Td>)}</Tr>)}
      </TBody>
    </DsTable>
  );
}

function Setting({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-20 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 font-semibold text-slate-900"><CheckCircle2 className="h-4 w-4 text-brand-600" /> {title}</div>
      <p className="mt-1 text-slate-600">{children}</p>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm open:bg-slate-50">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-slate-900">
        <ChevronRight className="h-4 w-4 shrink-0 transition group-open:rotate-90 rtl-flip rtl:group-open:-rotate-90" /> {q}
      </summary>
      <div className="mt-2 ps-6 text-slate-600">{children}</div>
    </details>
  );
}
