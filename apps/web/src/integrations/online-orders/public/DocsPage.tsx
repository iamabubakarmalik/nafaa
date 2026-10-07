import { useEffect, useState, type ReactNode } from 'react';
import { BookOpen, CheckCircle2, ChevronRight, Info, LifeBuoy, TriangleAlert } from 'lucide-react';
import { CodeBlock } from '@integrations/_core/components/CodeBlock';
import { SAMPLE_ORDER } from '../lib/snippets';
import { cn } from '@core/lib/cn';

/* ═════════════════════════════════════════════════════════════
   ONLINE STORE GUIDE — bina login, malik aur developer dono ke liye.
   Har platform, har setting, poora API aur masle ka hal ek jagah —
   taake koi bhi khud jor le, kisi ko bulana na pare.
   App ke andar har setting / step isi ke kisi hisse (#anchor) se jurta hai.
   ═════════════════════════════════════════════════════════════ */

const API = `${(import.meta.env.VITE_API_URL || 'https://api.nafaa.pk/api').replace(/\/+$/, '')}/integrations/website/v1`;

const TOC: Array<{ id: string; label: string; sub?: Array<{ id: string; label: string }> }> = [
  { id: 'shuru', label: 'Kaise kaam karta hai' },
  { id: 'platform', label: 'Kaunsa raasta chunein' },
  { id: 'woocommerce', label: 'WordPress / WooCommerce' },
  { id: 'shopify', label: 'Shopify' },
  { id: 'indolj', label: 'Indolj' },
  { id: 'apni-website', label: 'Apni banayi website' },
  { id: 'branches', label: 'Kai branches' },
  { id: 'products', label: 'Products aur stock' },
  { id: 'orders', label: 'Order ka safar' },
  {
    id: 'settings', label: 'Har setting', sub: [
      { id: 'setting-auto-accept', label: 'Khud accept' },
      { id: 'setting-stock-branch', label: 'Stock kis branch se' },
      { id: 'setting-delivery', label: 'Delivery charges' },
      { id: 'setting-price', label: 'Bill me qeemat' },
      { id: 'setting-status-url', label: 'Status URL' },
      { id: 'setting-signed', label: 'Sirf signed orders' },
    ],
  },
  { id: 'api', label: 'Developer API' },
  { id: 'masle', label: 'Masle aur hal' },
  { id: 'madad', label: 'Phir bhi madad chahiye' },
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
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white"><BookOpen className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-slate-900">Nafaa — Online store guide</div>
            <div className="truncate text-[12px] text-slate-500">Website, Indolj, WooCommerce, Shopify — khud jorein, khud chalayein</div>
          </div>
          <a href="/online-store/channels" className="rounded-lg bg-slate-900 px-3 py-1.5 text-[12.5px] font-semibold text-white">Nafaa kholein</a>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="hidden lg:block">
          <ul className="sticky top-20 space-y-0.5 text-[13px]">
            {TOC.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className={cn('block rounded-md px-2 py-1.5', active === t.id ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-slate-600 hover:bg-slate-50')}>{t.label}</a>
                {t.sub && (
                  <ul className="ml-3 border-l border-slate-200 pl-2">
                    {t.sub.map((s) => (
                      <li key={s.id}><a href={`#${s.id}`} className={cn('block rounded-md px-2 py-1 text-[12.5px]', active === s.id ? 'font-semibold text-emerald-800' : 'text-slate-500 hover:text-slate-800')}>{s.label}</a></li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 max-w-3xl space-y-14 pb-24 text-[14.5px] leading-relaxed">
          {/* Mobile par upar chhota menu */}
          <details className="rounded-xl border border-slate-200 p-3 lg:hidden">
            <summary className="cursor-pointer text-[13px] font-semibold">Is guide me kya hai</summary>
            <ul className="mt-2 space-y-1 text-[13px]">{TOC.map((t) => <li key={t.id}><a className="text-emerald-700" href={`#${t.id}`}>{t.label}</a></li>)}</ul>
          </details>

          <Section id="shuru" title="Online store kaise kaam karta hai">
            <p>Customer aap ki website, Indolj, WooCommerce ya Shopify par order karta hai → order <b>foran Nafaa me</b> aata hai aur ghanti bajti hai → aap <b>Accept</b> dabate hain → bill banta hai aur stock kam hota hai → status (accept, raste me, deliver, cancel) website ko wapas jata hai.</p>
            <Steps items={[
              ['Channel banayein', <>Nafaa → <b>Online store → Add channel</b> → apna platform chunein.</>],
              ['Jorein', <>Platform ke hisaab se neeche wala hissa parhein — zyada tar 2-10 minute ka kaam.</>],
              ['Products jorein', <>Channel → <b>Products</b> tab — website ke products Nafaa ke products se jorein (ek click me naye bhi ban jate hain).</>],
              ['Test order', <>Channel par <b>Test order</b> dabayein ya website par ek order karein. Ghanti baje to sab theek.</>],
            ]} />
            <Note>Har channel ke andar <b>Setup</b> tab me aap ki apni keys aur URL tayyar milte hain — copy karke paste karein. Is guide me sirf tareeqa hai, aap ki keys nahi.</Note>
          </Section>

          <Section id="platform" title="Kaunsa raasta chunein">
            <Table head={['Aap ki website', 'Raasta', 'Waqt', 'Kya milta hai']} rows={[
              ['WordPress / WooCommerce', 'Ek click (Approve)', '2 min', 'Orders, status wapas, stock, products dono taraf'],
              ['Shopify', 'Ek click (Install)', '2 min', 'Orders, fulfillment + tracking, stock'],
              ['Indolj', 'General POS settings', '10 min', 'Orders, cancel, menu Nafaa me, kai branches'],
              ['Apni banayi (PHP, Laravel, Node…)', 'Developer API — ek POST', '15 min', 'Orders, cancel, stock / products API'],
              ['Website hi nahi', 'Nafaa order form', '1 min', 'Link + "Order karein" button, Instagram / WhatsApp par'],
            ]} />
          </Section>

          <Section id="woocommerce" title="WordPress / WooCommerce">
            <H3>Ek click (sab se aasaan)</H3>
            <Steps items={[
              ['Add channel → WooCommerce', <>Site ka address likhein (jaise <code>ahmedstore.pk</code>) → <b>Jorein</b>.</>],
              ['Approve', <>Chhoti window me WordPress khulega → login → <b>Approve</b>. Keys aur webhooks Nafaa khud lagata hai.</>],
              ['Products jorein', <>Products tab → jo match ho gaye wo khud jure; baqi ek click me.</>],
            ]} />
            <Note tone="warning">Window na khule ya "https" ka masla aaye: site par SSL (https) zaroori hai. Na ho to neeche wala plugin raasta chalta hai.</Note>
            <H3>Nafaa plugin</H3>
            <Steps items={[
              ['Plugin download', <>Channel → <b>Setup</b> → <b>nafaa-woocommerce.zip</b>.</>],
              ['Install', <>WP Admin → Plugins → Add New → Upload Plugin → zip → Install → Activate.</>],
              ['Key + Secret', <>WP Admin → WooCommerce → <b>Nafaa POS</b> → Setup tab wali Key aur Secret paste → <b>Save &amp; Connect</b>.</>],
            ]} />
            <H3>Bina plugin (sirf orders)</H3>
            <p>WooCommerce → Settings → Advanced → Webhooks → Add webhook: Topic <b>Order created</b>, Delivery URL aur Secret Setup tab se. Ek aur <b>Order updated</b> ke liye bhi banayein (cancel / payment ki khabar).</p>
          </Section>

          <Section id="shopify" title="Shopify">
            <Steps items={[
              ['Add channel → Shopify', <>Store ka naam likhein (jaise <code>ahmed-store</code>.myshopify.com) → <b>Shopify se jorein</b>.</>],
              ['Install', <>Shopify khulega → <b>Install</b>. Orders, cancel, payment ke webhooks aur stock location khud lag jate hain.</>],
              ['Products jorein', <>Products tab se.</>],
            ]} />
            <p>Nafaa me <b>Raste me</b> dabane par Shopify me fulfillment + tracking number jata hai aur customer ko Shopify ki email.</p>
            <Note>"Dobara install chahiye" likha aaye to channel par <b>Dobara install</b> dabayein — koi data nahi mitta.</Note>
          </Section>

          <Section id="indolj" title="Indolj">
            <p>Indolj par bani website (menu + orders) Nafaa se do hisson me jurti hai: <b>menu</b> (products) aur <b>orders</b>.</p>
            <H3>1. Menu Nafaa me laayein</H3>
            <Steps items={[
              ['Indolj se 2 cheezein lein', <>Indolj team se kahen: <i>"Please share our Menu API <b>activation token</b> and <b>JWT secret</b>."</i></>],
              ['Nafaa me daalein', <>Channel → <b>Products</b> tab → <b>Indolj se jorein</b> → dono paste → Save. Menu foran aa jata hai.</>],
              ['Products jorein', <>Har menu item ke saamne Nafaa product chunein, ya <b>"Baqi Nafaa me banao"</b> — variants (size / flavour) bhi.</>],
            ]} />
            <H3>2. Orders Nafaa me</H3>
            <p>Indolj ki <b>General POS</b> settings me har branch ke liye ye bharein (Nafaa channel → <b>Setup</b> tab me har khaana copy button ke saath tayyar hai):</p>
            <Table head={['Indolj ka khaana', 'Kya daalein']} rows={[
              ['POS Code', 'Nafaa branch ki ID (Setup tab me har branch ke saath)'],
              ['Token', 'Nafaa key (nfk_… — Setup tab)'],
              ['Call Back URL', 'Usi branch ka Nafaa orders URL (…/orders/branch/<branch id>)'],
              ['Cancel Call Back URL', 'Wahi URL'],
              ['Status', 'Active'],
              ['Send on Order Placement', 'ON'],
            ]} />
            <Note>Ye settings aksar Indolj ki team lagati hai. Setup tab me <b>"Indolj ko bhejein"</b> dabayein — English me poora paigham (har branch ka URL + Token) copy ho jata hai, WhatsApp group me paste kar dein.</Note>
            <H3>Kai branches</H3>
            <p>Indolj order ke andar branch nahi bhejta — branch <b>URL se</b> pehchani jati hai. Is liye har branch ka Call Back URL alag ho. Ek hi URL sab branches me laga ho to sab orders ek branch me aayenge — order khol kar <b>Branch</b> se badal sakte hain.</p>
          </Section>

          <Section id="apni-website" title="Apni banayi website">
            <p>Teen raaste — jo aasaan lage:</p>
            <Table head={['Raasta', 'Kis ke liye', 'Kaise']} rows={[
              ['Order form (code ke bina)', 'Jinke paas developer nahi', 'Setup → Code ke bina → "Order form chalu karein". Link share karein, ya website par ek line ka button.'],
              ['Developer ko link', 'Jinke paas developer hai', 'Setup → Developer ko bhejein → link WhatsApp karein. Us page par keys, code, test sab hai.'],
              ['Khud code', 'Developer khud', 'Neeche Developer API — ek POST request.'],
            ]} />
          </Section>

          <Section id="branches" title="Kai branches">
            <Steps items={[
              ['Har branch ka apna URL', <>Channel → <b>Setup → Har branch ka URL</b>. Jo order jis URL par aaye, bill aur stock usi branch ka.</>],
              ['Bina branch wala URL', <>Branch ke baghair URL par aaya order channel ki <b>Stock kis branch se</b> wali branch me jata hai.</>],
              ['Ghalat branch me aaya?', <>Order kholein → <b>Branch</b> → sahi branch. "Aage se bhi" tick karein to agle orders khud wahan.</>],
            ]} />
            <p>Upar branch chunein to Online orders aur channel ki ginti sirf usi branch ki; <b>All Shops</b> par sab — har order par branch ka naam likha hota hai.</p>
          </Section>

          <Section id="products" title="Products aur stock">
            <ul className="list-disc space-y-1.5 pl-5">
              <li><b>Jorna:</b> Products tab me website ka har product ek Nafaa product (ya variant) se jurta hai. SKU / naam same ho to khud jur jata hai.</li>
              <li><b>Naya banao:</b> jo product Nafaa me nahi — "Naya banao" ya "Baqi sab Nafaa me banao". Variants ke liye "Nafaa product me variants jorein".</li>
              <li><b>Stock:</b> malik Nafaa hai. Jure hue product ka stock har 15 minute aur har accept / cancel par website par jata hai (WooCommerce, Shopify).</li>
              <li><b>Na jura product:</b> order phir bhi aata hai; Accept par Nafaa poochta hai kis product se jorna hai — sirf ek dafa.</li>
            </ul>
          </Section>

          <Section id="orders" title="Order ka safar">
            <Table head={['Haal', 'Matlab', 'Website ko kya jata hai']} rows={[
              ['Naya', 'Order aaya, accept baqi — ghanti bajti hai', '—'],
              ['Accept', 'Bill bana, stock kam', 'order.confirmed'],
              ['Pack / Raste me', 'Courier / rider ke paas', 'order.status_changed (+ tracking)'],
              ['Delivered', 'Mil gaya — COD ho to paisa', 'order.status_changed'],
              ['Cancel', 'Bill void, stock wapas', 'order.cancelled'],
              ['Wapas (RTO)', 'Customer ne nahi liya', 'order.returned'],
            ]} />
            <p><b>COD:</b> "COD baqi" tab me jo paisa aana hai. Courier ka paisa aaye to <b>COD & courier</b> me settle karein.</p>
            <p><b>Bahar ka rider:</b> Indolj / Foodpanda / Bykea ka rider delivery charges khud le to Settings → <a href="#setting-delivery">Delivery charges → Rider ke</a>.</p>
          </Section>

          <Section id="settings" title="Har setting ka matlab">
            <Setting id="setting-auto-accept" title="Order aate hi khud accept">
              On ho to har order khud accept — bill aur stock foran. Product na jura ho ya stock kam ho to order "Naya" me ruk jata hai taake aap dekh lein. Naye log pehle off rakhein.
            </Setting>
            <Setting id="setting-auto-print" title="Accept par receipt kholo">
              Accept dabate hi receipt khulti hai; POS me auto-print on ho to print bhi.
            </Setting>
            <Setting id="setting-stock-branch" title="Stock kis branch se">
              Is channel ke orders ka stock is branch se kam hota hai aur website ko isi ka stock dikhta hai. Kai branches me, branch wale URL par aaya order apni branch ka stock leta hai.
            </Setting>
            <Setting id="setting-delivery" title="Delivery charges kis ke paas?">
              <b>Dukaan ke:</b> delivery charges bill aur sale me (apna rider). <b>Rider ke:</b> bahar ka rider (Indolj, Foodpanda, Bykea) khud le leta hai — bill par likha aata hai ("Delivery (rider ko dein)"), lekin sale, drawer aur munafa me nahi. COD me dukaan ka paisa delivery ke baghair.
            </Setting>
            <Setting id="setting-price" title="Bill me qeemat">
              <b>Website wali:</b> jo customer ne di (offer chal raha ho to yahi). <b>Nafaa wali:</b> POS ki qeemat.
            </Setting>
            <Setting id="setting-push-price" title="Nafaa ki qeemat website par bhi">
              (WooCommerce / Shopify) Nafaa me qeemat badlein → website par 1-2 minute me. Website par sale chalate hon to off rakhein.
            </Setting>
            <Setting id="setting-status-url" title="Status URL (apni website)">
              Nafaa har status badalne par is URL par POST karta hai — neeche <a href="#api-status-webhook">Status webhook</a>. WooCommerce / Shopify / Indolj me zaroorat nahi.
            </Setting>
            <Setting id="setting-signed" title="Sirf signed orders">
              On ho to sirf wahi order qabool jis par sahi <code>X-Nafaa-Signature</code> ho. Plugin aur ek-click khud sign karte hain. Indolj sign nahi karta — Indolj ke liye off rakhein.
            </Setting>
          </Section>

          <Section id="api" title="Developer API">
            <p className="text-slate-600">For developers (English). Base URL:</p>
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

          <Section id="masle" title="Masle aur hal">
            <Faq q="Website par order hua, Nafaa me nahi aaya">
              Channel → <b>Activity</b> tab dekhein. <b>Ghalti 401</b> = key / Token ghalat (Setup se dobara copy karein; Indolj ke Token me <code>nfk_</code> ho ya na ho, dono chalte hain). Kuch bhi nahi dikha = request Nafaa tak aayi hi nahi: URL dobara copy karein, channel band (paused) to nahi?
            </Faq>
            <Faq q="Order ghalat branch me aaya">
              Har branch ka URL alag lagayein (<a href="#branches">Kai branches</a>). Abhi wala order: order kholein → <b>Branch</b> → sahi branch.
            </Faq>
            <Faq q="Accept par 'product nahi mila'">
              Products tab me us item ko Nafaa product se jorein, ya Accept par jo safha khulta hai wahan ek dafa chun lein — aage se khud.
            </Faq>
            <Faq q="Website par stock update nahi hota">
              Product jura hua hai? (Products tab). Settings → <a href="#setting-stock-branch">Stock kis branch se</a> sahi branch hai? WooCommerce / Shopify me channel par <b>Check</b> dabayein.
            </Faq>
            <Faq q="Customer ne website par cancel kiya, Nafaa me nahi hua">
              Indolj: <b>Cancel Call Back URL</b> lagaya hai? Apni website: <a href="#api-cancel">status API</a> bhejein. WooCommerce / Shopify me khud hota hai.
            </Faq>
            <Faq q="Delivery charges sale / drawer me aa rahe hain, rider le jata hai">
              Settings → <a href="#setting-delivery">Delivery charges → Rider ke</a>.
            </Faq>
            <Faq q="Key kisi ghalat haath lag gayi">
              Setup → <b>Nayi key</b>. Purani foran band. WooCommerce / Shopify ek-click khud shift ho jate hain; plugin, apni website aur Indolj me nayi key daalni hogi.
            </Faq>
          </Section>

          <Section id="madad" title="Phir bhi madad chahiye">
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
              <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <p>Pehle channel ka <b>Activity</b> tab dekhein — har ghalti ki wajah wahin likhi hoti hai. Phir bhi na bane to <a href="mailto:support@nafaa.pk">support@nafaa.pk</a> par channel ka naam aur Activity ka screenshot bhejein.</p>
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
      <h2 className="group flex items-center gap-2 text-[22px] font-bold tracking-tight text-slate-900">
        {title}
        <a href={`#${id}`} className="text-slate-300 opacity-0 transition group-hover:opacity-100" aria-label="Link">#</a>
      </h2>
      {children}
    </section>
  );
}

function H3({ id, children }: { id?: string; children: ReactNode }) {
  return <h3 id={id} className="scroll-mt-20 pt-2 text-[16px] font-semibold text-slate-900">{children}</h3>;
}

function Steps({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <ol className="space-y-3">
      {items.map(([t, d], n) => (
        <li key={t} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[12px] font-bold text-white">{n + 1}</span>
          <div className="min-w-0"><div className="font-semibold text-slate-900">{t}</div><div className="text-slate-600">{d}</div></div>
        </li>
      ))}
    </ol>
  );
}

function Note({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' }) {
  return (
    <div className={cn('flex items-start gap-2 rounded-xl px-4 py-3 text-[13.5px]', tone === 'warning' ? 'bg-amber-50 text-amber-900' : 'bg-sky-50 text-sky-900')}>
      {tone === 'warning' ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> : <Info className="mt-0.5 h-4 w-4 shrink-0" />}
      <div>{children}</div>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[520px] text-left text-[13px]">
        <thead className="bg-slate-50 text-slate-600"><tr>{head.map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={cn('px-3 py-2 align-top', j === 0 && 'font-medium text-slate-900')}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

function Setting({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-20 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 font-semibold text-slate-900"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {title}</div>
      <p className="mt-1 text-slate-600">{children}</p>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-slate-200 p-4 open:bg-slate-50/60">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-slate-900">
        <ChevronRight className="h-4 w-4 shrink-0 transition group-open:rotate-90" /> {q}
      </summary>
      <div className="mt-2 pl-6 text-slate-600">{children}</div>
    </details>
  );
}
