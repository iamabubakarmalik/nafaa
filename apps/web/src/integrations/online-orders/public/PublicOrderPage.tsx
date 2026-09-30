import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MessageCircle, Minus, Package, Plus, Search, ShoppingBag, Tag, Truck, X } from 'lucide-react';
import { publicFetch } from './publicApi';

/* ═════════════════════════════════════════════════════════════
   NAFAA ORDER FORM — customer ka safha (login nahi). Dukaan apni
   website / Instagram / WhatsApp par link ya "Order karein" button
   lagati hai. Qeemat Nafaa se; order seedha Online orders me.
   ═════════════════════════════════════════════════════════════ */

interface Option { variantId: string | null; name: string | null; sku: string | null; price: number; inStock: boolean; maxQty: number }
interface Product { id: string; name: string; category: string | null; description: string | null; image: string | null; options: Option[] }
export interface Catalog {
  shop: string; channel: string; deliveryFee: number; freeAbove: number | null; message: string | null; products: Product[];
  accent: string | null; logoUrl: string | null; phone: string | null; hasCoupons: boolean; categories: string[];
}
type Line = { productId: string; variantId: string | null; quantity: number };

const rs = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;
const lineKey = (l: { productId: string; variantId: string | null }) => `${l.productId}:${l.variantId ?? '-'}`;

export default function PublicOrderPage() {
  const { key = '' } = useParams();
  const [params] = useSearchParams();
  const embed = params.get('embed') === '1';
  const sku = params.get('sku');
  // Google Shopping / share link: ek hi product ka safha (?product=<id>)
  const [focus, setFocus] = useState<string | null>(params.get('product'));

  const [cat, setCat] = useState<Catalog | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, Line>>({});
  const [pick, setPick] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'shop' | 'checkout' | 'done'>('shop');
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', city: '', address: '', notes: '', website: '' });
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ orderNumber: string; total: number; message: string | null } | null>(null);
  const [cat2, setCat2] = useState<string>('');
  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discount: number; message: string } | null>(null);
  const [couponErr, setCouponErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    publicFetch<Catalog>(`/integrations/website/v1/form/${encodeURIComponent(key)}${focus ? `?product=${encodeURIComponent(focus)}` : ''}`)
      .then((c) => {
        setCat(c);
        document.title = `${c.shop} — Order`;
        // Buy button se aaye: wahi cheez cart me, seedha checkout
        if (sku) {
          for (const p of c.products) {
            const o = p.options.find((x) => x.sku === sku);
            if (o) {
              setCart({ [lineKey({ productId: p.id, variantId: o.variantId })]: { productId: p.id, variantId: o.variantId, quantity: 1 } });
              if (!(p.options.length > 1 && !o.variantId)) setStep('checkout');
              break;
            }
          }
        }
      })
      .catch((e) => setErr(e.message));
  }, [key, sku]);

  const find = (l: Line) => {
    const p = cat?.products.find((x) => x.id === l.productId);
    const o = p?.options.find((x) => x.variantId === l.variantId);
    return p && o ? { p, o } : null;
  };
  const lines = Object.values(cart).filter((l) => find(l));
  const subtotal = lines.reduce((s, l) => s + find(l)!.o.price * l.quantity, 0);
  const delivery = !cat ? 0 : cat.freeAbove && subtotal >= cat.freeAbove ? 0 : cat.deliveryFee;
  const discount = coupon ? Math.min(coupon.discount, subtotal) : 0;
  const payable = subtotal - discount + delivery;
  const accent = cat?.accent ?? '#059669';

  // Cart badla to code ka discount purana ho sakta hai — dobara lagana hoga
  useEffect(() => { setCoupon(null); setCouponErr(null); }, [subtotal]);

  const applyCoupon = async () => {
    if (!code.trim()) return;
    setChecking(true); setCouponErr(null);
    try {
      const r = await publicFetch<{ ok: boolean; code?: string; discount?: number; message: string }>(`/integrations/website/v1/form/${encodeURIComponent(key)}/coupon`, { method: 'POST', json: { code, subtotal } });
      if (r.ok) setCoupon({ code: r.code!, discount: r.discount!, message: r.message });
      else { setCoupon(null); setCouponErr(r.message); }
    } catch (e: any) {
      setCouponErr(e.message);
    } finally {
      setChecking(false);
    }
  };
  const count = lines.reduce((s, l) => s + l.quantity, 0);

  const setQty = (l: Line, qty: number, max = 50) => setCart((c) => {
    const k = lineKey(l);
    const n = { ...c };
    if (qty <= 0) delete n[k];
    else n[k] = { ...l, quantity: Math.min(max, qty) };
    return n;
  });

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const all = cat?.products ?? [];
    if (focus && all.some((p) => p.id === focus)) return all.filter((p) => p.id === focus);
    return all.filter((p) => (!t || p.name.toLowerCase().includes(t)) && (!cat2 || p.category === cat2));
  }, [cat, q, cat2, focus]);

  const submit = async () => {
    setFormErr(null);
    if (form.name.trim().length < 2) return setFormErr('Apna naam likhein');
    if (form.phone.replace(/\D/g, '').length < 10) return setFormErr('Mobile number sahi likhein (03xxxxxxxxx)');
    if (form.city.trim().length < 2) return setFormErr('Shehar likhein');
    if (form.address.trim().length < 8) return setFormErr('Poora address likhein — ghar #, gali, area');
    setBusy(true);
    try {
      const r = await publicFetch<{ orderNumber: string; total: number; message: string | null }>(`/integrations/website/v1/form/${encodeURIComponent(key)}/order`, {
        method: 'POST',
        json: {
          items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
          customer: { name: form.name, phone: form.phone, city: form.city, address: form.address },
          notes: form.notes || undefined,
          coupon: coupon?.code,
          website: form.website, // bots ke liye chhupa khana
        },
      });
      setDone(r);
      setStep('done');
      setCart({});
    } catch (e: any) {
      setFormErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const closeEmbed = () => window.parent?.postMessage('nafaa:close', '*');

  if (err) {
    return <Shell embed={embed} onClose={closeEmbed}><div className="p-10 text-center"><Package className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-800">{err}</p></div></Shell>;
  }
  if (!cat) return <Shell embed={embed} onClose={closeEmbed}><div className="flex justify-center p-16"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></div></Shell>;

  return (
    <Shell embed={embed} onClose={closeEmbed} title={cat.shop} logo={cat.logoUrl} accent={accent}
      right={<Link to={`/order/${key}/track${embed ? '?embed=1' : ''}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"><Truck className="h-4 w-4" /> Mera order</Link>}>
      {step === 'done' && done ? (
        <div className="px-6 py-12 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <h2 className="mt-3 text-xl font-bold text-slate-900">Order ho gaya! 🎉</h2>
          <p className="mt-1 text-slate-600">Order # <b className="font-mono">{done.orderNumber}</b> · {rs(done.total)} (Cash on delivery)</p>
          <p className="mt-3 text-sm text-slate-500">{done.message || `${cat.shop} jald aap se confirm karne ke liye rabta karega. Shukriya!`}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to={`/order/${key}/track?no=${done.orderNumber}${embed ? '&embed=1' : ''}`} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: accent }}>Order ka haal dekhein</Link>
            <button onClick={() => { setDone(null); setStep('shop'); }} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Aur order karein</button>
          </div>
          <p className="mt-3 text-xs text-slate-400">Order # likh lein — isi se haal dekh sakte hain.</p>
        </div>
      ) : step === 'checkout' ? (
        <div className="space-y-4 p-4 pb-28">
          <button onClick={() => setStep('shop')} className="text-sm font-semibold text-emerald-700">← Aur cheezein</button>
          <div className="rounded-2xl border border-slate-200">
            {lines.map((l) => {
              const { p, o } = find(l)!;
              return (
                <div key={lineKey(l)} className="flex items-center gap-3 border-b border-slate-100 p-3 last:border-0">
                  <Thumb src={p.image} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">{p.name}</div>
                    {o.name && <div className="text-xs text-slate-500">{o.name}</div>}
                    <div className="text-sm font-bold text-slate-900">{rs(o.price * l.quantity)}</div>
                  </div>
                  <Qty value={l.quantity} max={o.maxQty} onChange={(n) => setQty(l, n, o.maxQty)} />
                </div>
              );
            })}
            {!lines.length && <p className="p-4 text-center text-sm text-slate-500">Cart khali hai</p>}
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-bold text-slate-900">Delivery kahan karni hai?</div>
            <In label="Naam" value={form.name} onChange={(v) => setForm({ ...form, name: v })} autoComplete="name" />
            <In label="Mobile number" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="03xxxxxxxxx" inputMode="tel" autoComplete="tel" />
            <In label="Shehar" value={form.city} onChange={(v) => setForm({ ...form, city: v })} autoComplete="address-level2" />
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">Poora address</span>
              <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} autoComplete="street-address"
                placeholder="Ghar #, gali, area, qareeb koi nishani" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[15px] outline-none focus:border-emerald-600" />
            </label>
            <In label="Koi baat (optional)" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Jaise: shaam 5 ke baad" />
            {/* Bots ke liye — insaan ko nahi dikhta */}
            <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="hidden" aria-hidden="true" />
          </div>

          {cat.hasCoupons && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Discount code"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-[15px] uppercase outline-none focus:border-slate-500" />
                </div>
                <button onClick={applyCoupon} disabled={checking || !code.trim()} className="rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50">
                  {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lagao'}
                </button>
              </div>
              {coupon && <p className="mt-2 text-sm font-semibold text-emerald-700">✓ {coupon.code}: {coupon.message}</p>}
              {couponErr && <p className="mt-2 text-sm font-semibold text-rose-600">{couponErr}</p>}
            </div>
          )}

          <div className="space-y-1 rounded-2xl bg-slate-50 p-4 text-sm">
            <Row l="Cheezein" v={rs(subtotal)} />
            {discount > 0 && <Row l={`Discount (${coupon!.code})`} v={`− ${rs(discount)}`} />}
            <Row l="Delivery" v={delivery ? rs(delivery) : 'Free'} />
            {cat.freeAbove && delivery > 0 && <p className="text-xs text-emerald-700">{rs(cat.freeAbove - subtotal)} ki aur shopping par delivery free</p>}
            <div className="flex justify-between pt-1 text-base font-bold text-slate-900"><span>Total</span><span>{rs(payable)}</span></div>
            <p className="text-xs text-slate-500">💵 Cash on delivery — parcel milne par paisa dein</p>
          </div>
          {formErr && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{formErr}</p>}
          <Sticky>
            <button disabled={busy || !lines.length} onClick={submit}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white disabled:opacity-50" style={{ background: accent }}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />} Order confirm karein · {rs(payable)}
            </button>
          </Sticky>
        </div>
      ) : (
        <div className="p-4 pb-28">
          {focus && cat.products.some((p) => p.id === focus) && cat.products.length > 1 && (
            <button type="button" onClick={() => setFocus(null)} className="mb-3 text-[13px] font-semibold underline" style={{ color: accent }}>
              ← Sab products dekhein
            </button>
          )}
          {!focus && cat.products.length > 6 && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dhoondein…" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-[15px] outline-none focus:border-emerald-600" />
            </div>
          )}
          {cat.categories.length > 1 && (
            <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
              {['', ...cat.categories].map((c) => (
                <button key={c || 'all'} onClick={() => setCat2(c)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-semibold ${cat2 === c ? 'border-transparent text-white' : 'border-slate-300 text-slate-700'}`}
                  style={cat2 === c ? { background: accent } : undefined}>
                  {c || 'Sab'}
                </button>
              ))}
            </div>
          )}
          {cat.phone && (
            <a href={`https://wa.me/${cat.phone.replace(/\D/g, '').replace(/^0/, '92')}`} target="_blank" rel="noreferrer"
              className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[13px] font-semibold text-emerald-800">
              <MessageCircle className="h-4 w-4" /> Koi sawal? WhatsApp karein: {cat.phone}
            </a>
          )}
          {!cat.products.length && <p className="p-10 text-center text-slate-500">Abhi koi cheez dastiyab nahi.</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {shown.map((p) => {
              const multi = p.options.length > 1;
              const chosen = p.options.find((o) => (o.variantId ?? '-') === (pick[p.id] ?? (multi ? '' : p.options[0].variantId ?? '-'))) ?? (multi ? null : p.options[0]);
              const inCart = chosen ? cart[lineKey({ productId: p.id, variantId: chosen.variantId })] : undefined;
              const minPrice = Math.min(...p.options.map((o) => o.price));
              return (
                <div key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="aspect-square bg-slate-100">{p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Package className="m-auto mt-[35%] h-8 w-8 text-slate-300" />}</div>
                  <div className="flex flex-1 flex-col p-2.5">
                    <div className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900">{p.name}</div>
                    <div className="mt-1 text-sm font-bold" style={{ color: accent }}>{chosen ? rs(chosen.price) : `${rs(minPrice)} se`}</div>
                    {multi && (
                      <select value={pick[p.id] ?? ''} onChange={(e) => setPick({ ...pick, [p.id]: e.target.value })}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px]">
                        <option value="">Chunein…</option>
                        {p.options.map((o) => <option key={o.variantId ?? '-'} value={o.variantId ?? '-'} disabled={!o.inStock}>{o.name}{o.inStock ? '' : ' (khatam)'}</option>)}
                      </select>
                    )}
                    <div className="mt-auto pt-2">
                      {inCart ? (
                        <Qty value={inCart.quantity} max={chosen!.maxQty} onChange={(n) => setQty(inCart, n, chosen!.maxQty)} full />
                      ) : (
                        <button disabled={!chosen || !chosen.inStock}
                          onClick={() => chosen && setQty({ productId: p.id, variantId: chosen.variantId, quantity: 0 }, 1, chosen.maxQty)}
                          className="w-full rounded-xl bg-slate-900 py-2 text-[13px] font-semibold text-white disabled:bg-slate-300">
                          {chosen && !chosen.inStock ? 'Khatam' : multi && !chosen ? 'Size chunein' : '+ Cart'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {count > 0 && (
            <Sticky>
              <button onClick={() => setStep('checkout')} className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-base font-bold text-white" style={{ background: accent }}>
                <span className="inline-flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> {count} cheez</span>
                <span>Aage · {rs(subtotal)}</span>
              </button>
            </Sticky>
          )}
        </div>
      )}
    </Shell>
  );
}

export function Shell({ embed, onClose, title, logo, accent = '#059669', right, children }: {
  embed: boolean; onClose: () => void; title?: string; logo?: string | null; accent?: string; right?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className={embed ? 'min-h-full bg-white' : 'min-h-screen bg-slate-100 sm:py-6'}>
      <div className={embed ? '' : 'mx-auto min-h-screen max-w-2xl bg-white sm:min-h-0 sm:rounded-3xl sm:shadow-sm'}>
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
          {logo
            ? <img src={logo} alt="" className="h-9 w-9 rounded-xl object-cover" />
            : <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: accent }}><ShoppingBag className="h-5 w-5" /></div>}
          <div className="min-w-0 flex-1 truncate text-base font-bold text-slate-900">{title ?? 'Order'}</div>
          {right}
          {embed && <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Band karein"><X className="h-5 w-5" /></button>}
        </header>
        {children}
        <footer className="px-4 pb-24 pt-2 text-center text-[11px] text-slate-400">Powered by Nafaa</footer>
      </div>
    </div>
  );
}

function Sticky({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-2xl bg-gradient-to-t from-white via-white to-white/0 p-3 pt-6">{children}</div>;
}

function Qty({ value, max, onChange, full }: { value: number; max: number; onChange: (n: number) => void; full?: boolean }) {
  return (
    <div className={`inline-flex items-center rounded-xl border border-slate-300 ${full ? 'w-full justify-between' : ''}`}>
      <button onClick={() => onChange(value - 1)} className="p-2 text-slate-700" aria-label="Kam"><Minus className="h-4 w-4" /></button>
      <span className="min-w-[2ch] text-center text-sm font-bold">{value}</span>
      <button onClick={() => onChange(value + 1)} disabled={value >= max} className="p-2 text-slate-700 disabled:opacity-30" aria-label="Zyada"><Plus className="h-4 w-4" /></button>
    </div>
  );
}

function Thumb({ src }: { src: string | null }) {
  return <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">{src ? <img src={src} alt="" className="h-full w-full object-cover" /> : null}</div>;
}

function In({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[15px] outline-none focus:border-emerald-600" />
    </label>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  return <div className="flex justify-between text-slate-600"><span>{l}</span><span className="font-semibold text-slate-800">{v}</span></div>;
}
