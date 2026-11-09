/**
 * Customer portal (no login). /my/:token opens one order; /my/c/:token lists
 * the customer's orders and /my/c/:token/:orderId opens one of them. The
 * customer sees the order, the courier journey and the bill (print or save
 * as PDF), and can ask for a return, exchange, cancel, address change or the
 * same order again. The shop decides in its Returns & exchanges queue.
 */

import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft, Camera, CheckCircle2, Circle, Copy, ExternalLink, FileText, Loader2, MapPin, PackageX, Repeat, RotateCcw, X, XCircle,
} from 'lucide-react';
import { Button, Card, IconButton, Input, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { LanguageSwitch } from '@core/i18n/components/LanguagePicker';
import { Shell } from '../public/PublicOrderPage';
import { JourneyView } from '../components/tracking/OrderJourney';
import { portalPublic, type PortalBrand, type PortalOpen, type PortalOrder, type RequestBody, type RequestType } from './api';

const rs = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');

const STATUS: Record<string, string> = {
  PENDING: t('Order mil gaya — confirm ho raha hai'), ACCEPTING: t('Confirm ho raha hai'), CONFIRMED: t('Confirm ho gaya'),
  PREPARING: t('Tayyar ho raha hai'), READY: t('Pack ho gaya'), OUT_FOR_DELIVERY: t('Raste me hai'), DELIVERED: t('Deliver ho gaya'),
  CANCELLED: t('Cancel ho gaya'), REJECTED: t('Cancel ho gaya'), RETURNED: t('Wapas chala gaya'),
};
const STEP: Record<string, string> = { received: t('Order mila'), confirmed: t('Confirm'), dispatched: t('Courier ko diya'), delivered: t('Deliver') };
const TYPE: Record<RequestType, { label: string; icon: typeof RotateCcw }> = {
  RETURN: { label: t('Wapas karna hai'), icon: RotateCcw },
  EXCHANGE: { label: t('Badalna hai (exchange)'), icon: Repeat },
  CANCEL: { label: t('Order cancel karein'), icon: XCircle },
  ADDRESS: { label: t('Address / phone badlein'), icon: MapPin },
  REORDER: { label: t('Yehi order dobara'), icon: Repeat },
};
const REQ_STATUS: Record<string, { label: string; cls: string }> = {
  REQUESTED: { label: t('Dukaan dekh rahi hai'), cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  APPROVED: { label: t('Manzoor'), cls: 'bg-sky-50 text-sky-800 ring-sky-200' },
  DONE: { label: t('Mukammal'), cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  REJECTED: { label: t('Mana'), cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  WITHDRAWN: { label: t('Wapas le li'), cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
};
const REASONS: Record<'RETURN' | 'EXCHANGE' | 'CANCEL', string[]> = {
  RETURN: [t('Kharab / toota hua mila'), t('Ghalat cheez aayi'), t('Pasand nahi aayi'), t('Tasveer se mukhtalif')],
  EXCHANGE: [t('Size theek nahi'), t('Rang badalna hai'), t('Kharab / toota hua mila'), t('Ghalat cheez aayi')],
  CANCEL: [t('Ab zaroorat nahi'), t('Ghalti se order hua'), t('Der ho rahi hai'), t('Kahin aur se le liya')],
};

export default function PublicPortalPage() {
  const { token = '', orderId } = useParams();
  const { pathname } = useLocation();
  const customerLink = pathname.startsWith('/my/c/');
  const [brand, setBrand] = useState<PortalBrand | null>(null);
  const [list, setList] = useState<Extract<PortalOpen, { kind: 'CUSTOMER' }> | null>(null);
  const [order, setOrder] = useState<PortalOrder | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setErr(null); setOrder(null);
    const run = customerLink && orderId
      ? portalPublic.order(token, orderId).then((r) => { setBrand(r.brand); setOrder(r.order); })
      : portalPublic.open(token).then((r) => {
        setBrand(r.brand);
        if (r.kind === 'ORDER') setOrder(r.order); else setList(r);
      });
    run.catch((e: Error) => setErr(e.message));
  }, [token, orderId, customerLink]);

  useEffect(() => { if (brand?.shop) document.title = t('{{shop}} — Mera order', { shop: brand.shop }); }, [brand?.shop]);
  const accent = brand?.accent ?? '#059669';

  return (
    <Shell embed={false} onClose={() => null} title={brand?.shop ?? t('Mera order')} logo={brand?.logoUrl} accent={accent}
      right={<LanguageSwitch className="w-48 print:hidden" />}>
      <div className="space-y-4 p-4 pb-10">
        {err ? (
          <Card className="rounded-2xl"><p className="text-center text-sm font-semibold text-rose-600">{err}</p></Card>
        ) : !order && !list ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : order ? (
          <>
            {customerLink && <Link to={`/my/c/${token}`} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 print:hidden"><ArrowLeft className="h-4 w-4" />{t('Mere sab orders')}</Link>}
            <OrderView token={token} order={order} accent={accent} brand={brand} onChange={setOrder} />
          </>
        ) : list && (
          <Card className="rounded-2xl" title={list.name ? t('{{name}} ke orders', { name: list.name }) : t('Mere orders')}>
            {!list.orders.length ? <p className="text-sm text-slate-500">{t('Abhi koi order nahi')}</p> : (
              <ul className="-mx-1 divide-y divide-slate-100">
                {list.orders.map((o) => (
                  <li key={o.id}>
                    <Link to={`/my/c/${token}/${o.id}`} className="flex items-center gap-3 rounded-xl px-1 py-3 hover:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">#{o.no}</p>
                        <p className="text-xs text-slate-500">{when(o.at)} · {t('{{count}} cheezein', { count: o.items })}</p>
                      </div>
                      <div className="text-end">
                        <p className="text-sm font-semibold tabular-nums text-slate-900">{rs(o.total)}</p>
                        <p className="text-xs text-slate-500">{STATUS[o.status] ?? o.label}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </Shell>
  );
}

function OrderView({ token, order: o, accent, brand, onChange }: { token: string; order: PortalOrder; accent: string; brand: PortalBrand | null; onChange: (o: PortalOrder) => void }) {
  const [form, setForm] = useState<RequestType | null>(null);
  const [busy, setBusy] = useState(false);
  const reached = o.steps.filter((s) => s.at).length;

  const withdraw = async (id: string) => {
    setBusy(true);
    try { onChange((await portalPublic.withdraw(token, id)).order); } catch { /* the list stays as it was */ } finally { setBusy(false); }
  };

  return (
    <>
      <Card className="rounded-2xl">
        <div className="flex items-center gap-2">
          {o.closed ? <XCircle className="h-6 w-6 text-rose-500" /> : <CheckCircle2 className="h-6 w-6" style={{ color: accent }} />}
          <div className="flex-1 text-lg font-bold text-slate-900">{STATUS[o.status] ?? o.label}</div>
          <span className="font-mono text-sm font-semibold text-slate-500">#{o.no}</span>
        </div>
        {!o.closed && (
          <ol className="mt-4 space-y-3">
            {o.steps.map((s, i) => (
              <li key={s.key} className="flex items-center gap-3">
                {s.at ? <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: accent }} /> : <Circle className={cn('h-5 w-5 shrink-0', i === reached ? 'text-slate-400' : 'text-slate-300')} />}
                <div className={cn('flex-1 text-sm font-semibold', s.at ? 'text-slate-900' : 'text-slate-400')}>{STEP[s.key] ?? s.label}</div>
                <div className="text-xs text-slate-400">{when(s.at)}</div>
              </li>
            ))}
          </ol>
        )}
        {o.journey && o.journey.steps.some((st) => st.reached && st.key !== 'BOOKED') && (
          <div className="mt-5 print:hidden"><div className="mb-2 text-xs font-semibold text-slate-500">{t('Courier ke saath safar')}</div><JourneyView journey={o.journey} /></div>
        )}
        {o.courier && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
            <div className="text-xs font-semibold text-slate-500">{t('{{name}} · tracking number', { name: o.courier.name })}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-base font-bold text-slate-900">{o.courier.trackingNumber}</span>
              <IconButton size="sm" label={t('Copy')} onClick={() => navigator.clipboard?.writeText(o.courier!.trackingNumber)}><Copy className="h-4 w-4" /></IconButton>
              {o.courier.site && <a href={o.courier.site} target="_blank" rel="noreferrer" className="ms-auto inline-flex items-center gap-1 text-xs font-semibold print:hidden" style={{ color: accent }}>{t('{{name}} par dekhein', { name: o.courier.name })} <ExternalLink className="h-3.5 w-3.5" /></a>}
            </div>
          </div>
        )}
      </Card>

      <Card className="rounded-2xl" title={t('Bill')} actions={<Button size="sm" variant="secondary" className="print:hidden" leftIcon={<FileText className="h-4 w-4" />} onClick={() => window.print()}>{t('PDF / Print')}</Button>}>
        <p className="text-xs text-slate-500">{brand?.shop}{brand?.phone ? ` · ${brand.phone}` : ''}</p>
        <p className="mt-1 text-sm text-slate-700">{o.customer.name}{o.customer.phone ? ` · ${o.customer.phone}` : ''}</p>
        {(o.customer.address || o.customer.city) && <p className="text-sm text-slate-500">{[o.customer.address, o.customer.city].filter(Boolean).join(', ')}</p>}
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {o.items.map((l) => (
            <li key={l.index} className="flex items-center gap-3 py-2">
              {l.image && <img src={l.image} alt="" className="h-10 w-10 rounded-lg object-cover print:hidden" />}
              <div className="min-w-0 flex-1"><p className="truncate font-medium text-slate-900">{l.name}</p>{l.variant && <p className="text-xs text-slate-500">{l.variant}</p>}</div>
              <span className="text-xs text-slate-500">×{l.quantity}</span>
              <span className="w-24 text-end tabular-nums text-slate-900">{rs(l.price * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-sm">
          <Row k={t('Items')} v={rs(o.money.subtotal)} />
          {o.money.discount > 0 && <Row k={t('Discount')} v={`− ${rs(o.money.discount)}`} />}
          {o.money.deliveryFee > 0 && <Row k={t('Delivery')} v={rs(o.money.deliveryFee)} />}
          <Row k={t('Total')} v={rs(o.money.total)} bold />
          <Row k="" v={o.money.paid ? t('Paisa mil gaya') : t('Cash on delivery')} />
        </dl>
      </Card>

      {!!o.requests.length && (
        <Card className="rounded-2xl" title={t('Meri requests')}>
          <ul className="space-y-2">
            {o.requests.map((r) => (
              <li key={r.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex-1 font-semibold text-slate-900">{TYPE[r.type]?.label ?? r.type}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold ring-1', REQ_STATUS[r.status]?.cls)}>{REQ_STATUS[r.status]?.label ?? r.status}</span>
                </div>
                {r.reason && <p className="mt-1 text-slate-600">{r.reason}</p>}
                {r.decisionNote && <p className="mt-1 text-slate-700">{t('Dukaan: {{note}}', { note: r.decisionNote })}</p>}
                {r.pickupTracking && <p className="mt-1 text-slate-700">{t('Pickup: {{courier}} {{cn}}', { courier: r.pickupCourier ?? '', cn: r.pickupTracking })}</p>}
                {r.refundNote && <p className="mt-1 text-slate-700">{t('Refund: {{note}}', { note: r.refundNote })}</p>}
                {r.status === 'REQUESTED' && <button type="button" disabled={busy} onClick={() => withdraw(r.id)} className="mt-2 text-xs font-semibold text-slate-500 underline print:hidden">{t('Request wapas lein')}</button>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!!o.allowed.length && !form && (
        <Card className="rounded-2xl print:hidden" title={t('Kuch chahiye?')}>
          <div className="grid gap-2 sm:grid-cols-2">
            {o.allowed.map((k) => {
              const Icon = TYPE[k].icon;
              return (
                <button key={k} type="button" onClick={() => setForm(k)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-start text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: accent }}><Icon className="h-4 w-4" /></span>{TYPE[k].label}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {form && <RequestForm token={token} order={o} type={form} accent={accent} onClose={() => setForm(null)} onDone={(next) => { onChange(next); setForm(null); }} />}
    </>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return <div className={cn('flex justify-between', bold ? 'font-bold text-slate-900' : 'text-slate-600')}><dt>{k}</dt><dd className="tabular-nums">{v}</dd></div>;
}

function RequestForm({ token, order: o, type, accent, onClose, onDone }: {
  token: string; order: PortalOrder; type: RequestType; accent: string; onClose: () => void; onDone: (o: PortalOrder) => void;
}) {
  const lines = type === 'RETURN' || type === 'EXCHANGE';
  const [picked, setPicked] = useState<Record<number, number>>(() => (o.items.length === 1 ? { 0: o.items[0].quantity } : {}) as Record<number, number>);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<'PICKUP' | 'DROP_OFF'>('PICKUP');
  const [addr, setAddr] = useState({ name: o.customer.name, phone: o.customer.phone ?? '', address: o.customer.address ?? '', city: o.customer.city ?? '' });
  const [slot, setSlot] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const addPhoto = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true); setErr(null);
    try {
      for (const f of Array.from(files).slice(0, 4 - photos.length)) {
        const url = await portalPublic.upload(token, f);
        setPhotos((p) => [...p, url].slice(0, 4));
      }
    } catch (e) {
      setErr(e instanceof Error && e.message !== 'upload' ? e.message : t('Tasveer nahi gayi, dobara koshish karein'));
    } finally { setUploading(false); }
  };

  const submit = async () => {
    setBusy(true); setErr(null);
    const body: RequestBody = { orderId: o.id, type, reason: reason || undefined, note: note || undefined };
    if (lines) {
      body.items = Object.entries(picked).filter(([, q]) => q > 0).map(([i, q]) => ({ index: Number(i), qty: q }));
      body.photos = photos;
      body.pickup = { mode, address: addr.address, city: addr.city, slot: slot || undefined };
    }
    if (type === 'ADDRESS') body.address = addr;
    try { onDone((await portalPublic.request(token, body)).order); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Card className="rounded-2xl print:hidden" title={TYPE[type].label} actions={<IconButton size="sm" variant="ghost" label={t('Band karein')} onClick={onClose}><X className="h-4 w-4" /></IconButton>}>
      <div className="space-y-4">
        {lines && (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">{t('Kaun si cheez?')}</p>
            <ul className="space-y-2">
              {o.items.map((l) => {
                const q = picked[l.index] ?? 0;
                return (
                  <li key={l.index} className={cn('flex items-center gap-3 rounded-xl p-2 ring-1', q ? 'ring-2' : 'ring-slate-200')} style={q ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}>
                    <button type="button" className="min-w-0 flex-1 text-start" onClick={() => setPicked((p) => ({ ...p, [l.index]: q ? 0 : l.quantity }))}>
                      <p className="truncate text-sm font-semibold text-slate-900">{l.name}</p>
                      {l.variant && <p className="text-xs text-slate-500">{l.variant}</p>}
                    </button>
                    {q > 0 && l.quantity > 1 && (
                      <select value={q} onChange={(e) => setPicked((p) => ({ ...p, [l.index]: Number(e.target.value) }))} className="rounded-lg border border-slate-200 px-2 py-1 text-sm" aria-label={t('Kitne')}>
                        {Array.from({ length: l.quantity }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {(type === 'RETURN' || type === 'EXCHANGE' || type === 'CANCEL') && (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">{t('Wajah')}</p>
            <div className="flex flex-wrap gap-2">
              {REASONS[type].map((r) => (
                <button key={r} type="button" onClick={() => setReason(r)} className={cn('rounded-full px-3 py-1.5 text-xs font-semibold ring-1', reason === r ? 'text-white ring-transparent' : 'text-slate-700 ring-slate-200')} style={reason === r ? { background: accent } : undefined}>{r}</button>
              ))}
            </div>
          </div>
        )}

        {lines && (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">{t('Tasveer (agar kharab hai)')}</p>
            <div className="flex flex-wrap items-center gap-2">
              {photos.map((p) => (
                <div key={p} className="relative">
                  <img src={p} alt="" className="h-16 w-16 rounded-xl object-cover" />
                  <button type="button" onClick={() => setPhotos((x) => x.filter((y) => y !== p))} aria-label={t('Hatayein')} className="absolute -end-1 -top-1 rounded-full bg-white p-0.5 shadow"><X className="h-3 w-3" /></button>
                </div>
              ))}
              {photos.length < 4 && (
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl text-slate-500 ring-1 ring-dashed ring-slate-300">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => addPhoto(e.target.files)} />
                </label>
              )}
            </div>
          </div>
        )}

        {lines && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">{t('Parcel kaise wapas aaye?')}</p>
            <div className="grid grid-cols-2 gap-2">
              {(['PICKUP', 'DROP_OFF'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)} className={cn('rounded-xl px-3 py-2 text-sm font-semibold ring-1', mode === m ? 'text-white ring-transparent' : 'text-slate-700 ring-slate-200')} style={mode === m ? { background: accent } : undefined}>
                  {m === 'PICKUP' ? t('Ghar se utha lein') : t('Main khud de dunga')}
                </button>
              ))}
            </div>
            {mode === 'PICKUP' && <>
              <Input value={addr.address} onChange={(e) => setAddr({ ...addr, address: e.target.value })} placeholder={t('Pickup ka address')} aria-label={t('Pickup ka address')} />
              <div className="grid grid-cols-2 gap-2">
                <Input value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} placeholder={t('Shehar')} aria-label={t('Shehar')} />
                <Input value={slot} onChange={(e) => setSlot(e.target.value)} placeholder={t('Kab aayein (jaise subah)')} aria-label={t('Kab aayein')} />
              </div>
            </>}
          </div>
        )}

        {type === 'ADDRESS' && (
          <div className="space-y-2">
            <Input value={addr.name} onChange={(e) => setAddr({ ...addr, name: e.target.value })} placeholder={t('Naam')} aria-label={t('Naam')} />
            <Input value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} placeholder={t('Phone')} aria-label={t('Phone')} inputMode="tel" />
            <Input value={addr.address} onChange={(e) => setAddr({ ...addr, address: e.target.value })} placeholder={t('Poora address')} aria-label={t('Poora address')} />
            <Input value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} placeholder={t('Shehar')} aria-label={t('Shehar')} />
          </div>
        )}

        {type === 'REORDER' && <p className="text-sm text-slate-600">{t('Yehi cheezein dobara mangwane ki request dukaan ko jayegi. Dukaan qeemat confirm karke order bhejegi.')}</p>}

        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t('Kuch aur batana ho to likhein')} aria-label={t('Note')} />
        {err && <p className="text-sm font-semibold text-rose-600">{err}</p>}
        <Button size="lg" className="w-full text-white" style={{ background: accent }} disabled={busy || uploading} onClick={submit}
          leftIcon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageX className="h-4 w-4" />}>
          {t('Request bhejein')}
        </Button>
      </div>
    </Card>
  );
}
