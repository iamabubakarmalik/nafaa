/**
 * Send stock to another branch. Items come from search or the scanner
 * (a pack barcode brings its pack unit, an IMEI or serial brings that unit).
 * Plain products go by count in any of their units, variant products ask
 * which variant, carpet goes by whole rolls, phones by IMEI, used phones by
 * code and electronics by serial. Stock at the sending branch shows live and
 * over-sending is blocked; a summary is confirmed before anything moves.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowRight, Boxes, Cpu, Hash, Layers, Minus, Plus, ScanLine, Search, Send, Smartphone, X } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { ProductThumb } from '@modules/inventory/products/lib/productEmoji';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import type { CarpetRoll } from '@industries/carpet/api/carpet-rolls.api';
import { transfersApi, type CreateTransferItemPayload, type StockTransfer } from '../api/transfers.api';
import { PickListModal, RollPicker, VariantModal } from './TransferPickers';
import { qty } from './transferMeta';
import { searchIn, useTransferSources, type CodeHit, type Device, type SendProduct, type UnitChoice, type VariantChoice } from './useTransferSources';

interface Line {
  key: string;
  kind: 'plain' | 'carpet' | 'imei' | 'serial' | 'used';
  name: string;
  /** Roll number, IMEI, serial or used phone code. */
  ref?: string;
  detail?: string;
  productId?: string;
  variantId?: string;
  variantName?: string;
  rollId?: string;
  imeiId?: string;
  serialId?: string;
  usedPhoneId?: string;
  baseUnit: string;
  units: UnitChoice[];
  unit: UnitChoice;
  /** In the chosen unit. */
  qty: number;
  /** Base-unit stock at the sending branch; null for single units. */
  stock: number | null;
  /** Cost of one base unit. */
  cost: number;
}

const PURPOSES = ['Stock barabar karna', 'Wahan demand hai', 'Sale / offer ke liye', 'Naya stock baantna', 'Slow maal wapas', 'Repair / check ke liye'];
const field = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 disabled:bg-slate-50 disabled:text-slate-500';
const KIND_ICON = { imei: Smartphone, used: Smartphone, serial: Cpu, carpet: Layers, plain: Boxes } as const;

export function TransferForm({ defaultFrom, locked, industryId, money, onClose, onSent }: {
  defaultFrom?: string;
  /** Staff tied to a branch send only from it. */
  locked: string | null;
  industryId?: string;
  money: (n: number) => string;
  onClose: () => void;
  onSent: (t: StockTransfer) => void;
}) {
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: () => shopsApi.list(), staleTime: 60_000 });
  const shops = useMemo(() => (shopsQ.data ?? []).filter((s) => s.isActive !== false), [shopsQ.data]);
  const [fromId, setFromId] = useState(locked ?? defaultFrom ?? '');
  const [toId, setToId] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [scanner, setScanner] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [variantFor, setVariantFor] = useState<{ product: SendProduct; unit?: UnitChoice } | null>(null);
  const [rollsFor, setRollsFor] = useState<SendProduct | null>(null);
  const [devicesFor, setDevicesFor] = useState<{ title: string; list: Device[]; product?: SendProduct } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Pick the first branch once shops load, and the only other one as destination.
  useEffect(() => {
    if (!shops.length) return;
    if (!fromId) setFromId(shops.find((s) => s.isMain)?.id ?? shops[0].id);
  }, [shops, fromId]);
  useEffect(() => {
    const others = shops.filter((s) => s.id !== fromId);
    if (toId === fromId || (!toId && others.length === 1)) setToId(others.length === 1 ? others[0].id : '');
  }, [shops, fromId, toId]);

  const { products, devices, byCode, loading } = useTransferSources(fromId, industryId);
  const productResults = useMemo(() => searchIn(products, query), [products, query]);
  const deviceResults = useMemo(() => (query.trim().length >= 3 ? searchIn(devices, query, 12) : []), [devices, query]);
  const taken = useMemo(() => new Set(lines.map((l) => l.rollId ?? l.imeiId ?? l.serialId ?? l.usedPhoneId).filter(Boolean) as string[]), [lines]);
  const counts = useMemo(() => ({
    imei: devices.filter((d) => d.kind === 'imei' && !taken.has(d.id)).length,
    used: devices.filter((d) => d.kind === 'used' && !taken.has(d.id)).length,
    serial: devices.filter((d) => d.kind === 'serial' && !taken.has(d.id)).length,
  }), [devices, taken]);

  const fromShop = shops.find((s) => s.id === fromId);
  const toShop = shops.find((s) => s.id === toId);
  const base = (l: Line) => l.qty * l.unit.rate;
  const value = lines.reduce((s, l) => s + base(l) * l.cost, 0);

  const changeFrom = (id: string) => {
    if (id === fromId) return;
    if (lines.length && !confirm('Branch badalne se list saaf ho jayegi. Theek hai?')) return;
    setLines([]);
    setFromId(id);
  };

  const done = () => { setQuery(''); setOpen(false); searchRef.current?.focus(); };

  const addPlain = (p: SendProduct, unit: UnitChoice = p.units[0], v?: VariantChoice) => {
    const key = `p:${p.id}:${v?.id ?? ''}`;
    const have = lines.find((l) => l.key === key);
    if (have) {
      setLines((ls) => ls.map((l) => (l.key === key ? { ...l, qty: l.qty + (l.unit.name === unit.name ? 1 : unit.rate / l.unit.rate) } : l)));
    } else {
      setLines((ls) => [...ls, {
        key, kind: 'plain', name: p.name, productId: p.id, variantId: v?.id, variantName: v?.name, baseUnit: p.unit, units: p.units, unit, qty: 1,
        stock: v ? v.stock : p.stock, cost: v?.cost || p.cost,
      }]);
    }
    done();
  };

  const addDevices = (list: Device[]) => {
    setLines((ls) => [...ls, ...list.filter((d) => !taken.has(d.id)).map((d): Line => ({
      key: d.key, kind: d.kind, name: d.name, ref: d.ref, detail: d.detail, productId: d.productId, variantId: d.variantId ?? undefined,
      imeiId: d.kind === 'imei' ? d.id : undefined, serialId: d.kind === 'serial' ? d.id : undefined, usedPhoneId: d.kind === 'used' ? d.id : undefined,
      baseUnit: 'pcs', units: [{ name: 'pcs', rate: 1 }], unit: { name: 'pcs', rate: 1 }, qty: 1, stock: null, cost: d.cost,
    }))]);
    done();
  };

  const addRolls = (p: SendProduct, rolls: CarpetRoll[]) => {
    setLines((ls) => [...ls, ...rolls.map((r): Line => ({
      key: `roll:${r.id}`, kind: 'carpet', name: p.name, ref: `Roll ${r.rollNumber}`,
      detail: [r.variant?.name, `${r.widthFt}ft${r.widthInch ? ` ${r.widthInch}in` : ''} × ${qty(r.remainingLengthFt)}ft`].filter(Boolean).join(' · '),
      productId: p.id, variantId: r.variantId ?? undefined, rollId: r.id, baseUnit: p.unit, units: [{ name: p.unit, rate: 1 }], unit: { name: p.unit, rate: 1 },
      qty: Number(r.remainingSqft) || 0, stock: null, cost: Number(r.costPerSqft) || p.cost,
    }))]);
    done();
  };

  /** Route a product to the right picker for how it is sent. */
  const addProduct = (p: SendProduct, unit?: UnitChoice, v?: VariantChoice) => {
    if (!fromId) { toast.error('Pehle bhejne wali branch chunein'); return; }
    if (p.kind === 'carpet') { setRollsFor(p); return; }
    if (p.kind === 'imei' || p.kind === 'serial') {
      setDevicesFor({ title: `${p.name} — ${p.kind === 'imei' ? 'IMEI' : 'serial'} chunein`, list: devices.filter((d) => d.productId === p.id && d.kind === p.kind), product: p });
      return;
    }
    if (!v && p.variants.length) { setVariantFor({ product: p, unit }); return; }
    addPlain(p, unit, v);
  };

  const onHit = (hit: CodeHit) => {
    if (hit.type === 'device') {
      if (taken.has(hit.device.id)) { toast.error(`${hit.device.ref} pehle se list me hai`); return; }
      addDevices([hit.device]);
      toast.success(`${hit.device.name} · ${hit.device.ref}`, { duration: 900 });
      return;
    }
    addProduct(hit.product, hit.unit, hit.variant);
  };

  const onCode = (raw: string) => {
    const hit = byCode.get(raw.trim().toLowerCase());
    if (hit) { onHit(hit); return; }
    toast.error(`"${raw}" ${fromShop?.name ?? 'is branch'} me nahi mila`);
  };

  const patch = (key: string, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const remove = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));

  const over = lines.filter((l) => l.stock != null && base(l) > l.stock + 1e-9);
  const problems = [
    !fromId && 'Bhejne wali branch chunein',
    !toId && 'Kis branch ko bhejna hai, chunein',
    fromId && fromId === toId && 'Dono branch alag honi chahiye',
    !lines.length && 'Kam se kam ek cheez jorein',
    lines.some((l) => !(l.qty > 0)) && 'Har line ki quantity likhein',
    over.length > 0 && `${over[0].name}: stock sirf ${qty(over[0].stock ?? 0)} ${over[0].baseUnit} hai`,
  ].filter(Boolean) as string[];

  const send = useMutation({
    mutationFn: () => {
      const items: CreateTransferItemPayload[] = lines.map((l) => ({
        productId: l.productId, variantId: l.variantId, carpetRollId: l.rollId, imeiId: l.imeiId, serialId: l.serialId, usedPhoneId: l.usedPhoneId,
        quantity: Number(base(l).toFixed(4)),
        notes: [l.variantName, l.unit.rate !== 1 ? `${qty(l.qty)} ${l.unit.name} (= ${qty(base(l))} ${l.baseUnit})` : ''].filter(Boolean).join(' · ') || undefined,
      }));
      return transfersApi.create({ fromShopId: fromId, toShopId: toId, notes: notes.trim() || undefined, items });
    },
    onSuccess: (t) => { toast.success(`${t.transferNumber} bhej diya — maal raste me, ${t.toShop.name} receive karegi`); onSent(t); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Transfer nahi hua'); setConfirming(false); },
  });

  const addPurpose = (p: string) => setNotes((n) => (n.includes(p) ? n : n.trim() ? `${n.trim()} · ${p}` : p));

  return (
    <Modal open onClose={onClose} size="full" title={confirming ? 'Pakka karein' : 'Maal bhejein'}
      description={confirming ? 'Bhejte hi maal bhejne wali branch ke stock se nikal jayega' : 'Dusri branch ko stock bhejein — wahan receive hone par stock barhega'}
      footer={confirming ? <>
        <Button variant="secondary" onClick={() => setConfirming(false)}>Wapas, badlein</Button>
        <Button loading={send.isPending} onClick={() => send.mutate()} leftIcon={<Send className="h-4 w-4" />}>Haan, bhej dein</Button>
      </> : <>
        {problems.length > 0 && lines.length > 0 && <span className="mr-auto text-[0.8125rem] text-rose-700">{problems[0]}</span>}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button disabled={problems.length > 0} onClick={() => setConfirming(true)} leftIcon={<ArrowRight className="h-4 w-4" />}>Aage · {lines.length} cheezein</Button>
      </>}>
      {confirming ? (
        <Summary from={fromShop?.name ?? ''} to={toShop?.name ?? ''} lines={lines} value={value} notes={notes} money={money} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-3">
            <div className="grid items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_auto_1fr]">
              <label className="text-[0.75rem] text-slate-500">Kahan se (bhejne wali branch)
                <select value={fromId} onChange={(e) => changeFrom(e.target.value)} disabled={!!locked} className={cn(field, 'mt-1')}>
                  {!fromId && <option value="">Chunein…</option>}
                  {shops.map((s) => <option key={s.id} value={s.id}>{s.name}{s.isMain ? ' (main)' : ''}</option>)}
                </select>
                <Hint>{locked ? 'Aap sirf apni branch se bhej sakte hain' : 'Jis branch ka maal ja raha hai — stock yahin se kam hoga'}</Hint>
              </label>
              <ArrowRight className="mx-auto mt-8 hidden h-5 w-5 text-slate-400 sm:block" />
              <label className="text-[0.75rem] text-slate-500">Kahan (lene wali branch)
                <select value={toId} onChange={(e) => setToId(e.target.value)} className={cn(field, 'mt-1')}>
                  <option value="">Chunein…</option>
                  {shops.filter((s) => s.id !== fromId).map((s) => <option key={s.id} value={s.id}>{s.name}{s.isMain ? ' (main)' : ''}</option>)}
                </select>
                <Hint>Wahan "Receive karein" dabane par stock barhega</Hint>
              </label>
            </div>
            {shopsQ.isSuccess && shops.length < 2 && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">Transfer ke liye kam se kam do branch chahiye — Settings → Branches se nayi branch banayein.</p>
            )}

            <div className="relative">
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input ref={searchRef} value={query} autoFocus disabled={!fromId}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const hit = byCode.get(query.trim().toLowerCase());
                      if (hit) { onHit(hit); return; }
                      if (productResults[0]) addProduct(productResults[0]);
                      else if (deviceResults[0]) addDevices([deviceResults[0]]);
                    }}
                    placeholder={industryId === 'mobile' ? 'Product, IMEI ya used phone code…' : industryId === 'electronics' ? 'Product, serial ya IMEI…' : 'Product ka naam, SKU ya barcode…'}
                    aria-label="Cheez search"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
                </div>
                <Button variant="secondary" className="h-11" disabled={!fromId} onClick={() => setScanner(true)} leftIcon={<ScanLine className="h-4 w-4" />}><span className="hidden sm:inline">Scan</span></Button>
              </div>
              <Hint>Sirf {fromShop?.name ?? 'bhejne wali branch'} ka maal dikhta hai. Carton ka barcode scan karein to carton hi judta hai; Enter = pehli cheez.</Hint>
              {open && query.trim() && (
                <div className="absolute inset-x-0 top-12 z-30 max-h-[26rem] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                  {loading ? <p className="p-4 text-center text-sm text-slate-500">Load ho raha hai…</p>
                    : !productResults.length && !deviceResults.length ? <p className="p-4 text-center text-sm text-slate-500">"{query.trim()}" is branch me nahi mila</p>
                      : <>
                        {deviceResults.map((d) => {
                          const I = KIND_ICON[d.kind];
                          return (
                            <button key={d.key} type="button" disabled={taken.has(d.id)} onMouseDown={(e) => e.preventDefault()} onClick={() => addDevices([d])}
                              className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-50">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><I className="h-4 w-4" /></span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-slate-900">{d.name}</span>
                                <span className="block truncate text-[0.75rem] text-slate-500">{d.kind === 'used' ? 'Used · ' : ''}{d.ref}{d.detail ? ` · ${d.detail}` : ''}</span>
                              </span>
                              <span className="shrink-0 text-[0.75rem] text-slate-500">{taken.has(d.id) ? 'List me' : money(d.cost)}</span>
                            </button>
                          );
                        })}
                        {productResults.map((p) => (
                          <div key={p.id} className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-0 hover:bg-slate-50">
                            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => addProduct(p)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                              <ProductThumb name={p.name} category={p.category} url={p.image} size="sm" />
                              <span className="min-w-0">
                                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-900"><span className="truncate">{p.name}</span><KindBadge kind={p.kind} variants={p.variants.length} /></span>
                                <span className={cn('block text-[0.75rem]', p.stock > 0 ? 'text-slate-500' : 'text-rose-600')}>Yahan stock {qty(p.stock)} {p.unit} · cost {money(p.cost)}/{p.unit}</span>
                              </span>
                            </button>
                            {p.kind === 'plain' && p.units.length > 1 && !p.variants.length && (
                              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                                {p.units.map((u) => (
                                  <button key={u.name} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => addProduct(p, u)}
                                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.75rem] font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-800">
                                    + {u.name}{u.rate !== 1 ? ` (${qty(u.rate)})` : ''}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </>}
                </div>
              )}
            </div>

            {(counts.imei > 0 || counts.used > 0 || counts.serial > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {counts.imei > 0 && <Chip icon={Smartphone} label={`Phones (IMEI) · ${counts.imei}`} onClick={() => setDevicesFor({ title: 'Phones chunein', list: devices.filter((d) => d.kind === 'imei') })} />}
                {counts.used > 0 && <Chip icon={Smartphone} label={`Used phones · ${counts.used}`} onClick={() => setDevicesFor({ title: 'Used phones chunein', list: devices.filter((d) => d.kind === 'used') })} />}
                {counts.serial > 0 && <Chip icon={Cpu} label={`Serial units · ${counts.serial}`} onClick={() => setDevicesFor({ title: 'Serial units chunein', list: devices.filter((d) => d.kind === 'serial') })} />}
              </div>
            )}

            {!lines.length ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <Boxes className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 font-semibold text-slate-900">Abhi koi cheez nahi</p>
                <p className="mt-1 text-sm text-slate-500">Upar naam likhein ya barcode scan karein. Phone ka IMEI, serial ya roll bhi yahin se.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {lines.map((l) => <LineRow key={l.key} l={l} money={money} onPatch={(p) => patch(l.key, p)} onRemove={() => remove(l.key)} />)}
              </ul>
            )}
          </div>

          <aside className="min-w-0 space-y-3 lg:sticky lg:top-0 lg:self-start">
            <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
              <p className="flex items-center gap-1.5 font-semibold text-slate-900"><span className="truncate">{fromShop?.name ?? '—'}</span><ArrowRight className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{toShop?.name ?? '—'}</span></p>
              <Row k="Cheezein" v={String(lines.length)} />
              <Row k="Kul quantity" v={unitsText(lines)} />
              <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2 text-white">
                <span className="font-semibold">Maal ki qeemat</span><span className="text-lg font-bold tabular-nums">{money(value)}</span>
              </div>
              <Hint>Cost par hisaab — yeh sale nahi, sirf maal ki jagah badalti hai</Hint>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="mb-2 text-[0.8125rem] font-semibold text-slate-800">Kis liye bhej rahe hain</p>
              <div className="flex flex-wrap gap-1.5">
                {PURPOSES.map((p) => (
                  <button key={p} type="button" onClick={() => addPurpose(p)} aria-pressed={notes.includes(p)}
                    className={cn('rounded-full px-2.5 py-1 text-[0.75rem] ring-1 transition', notes.includes(p) ? 'bg-brand-600 text-white ring-brand-600' : 'text-slate-600 ring-slate-200 hover:ring-slate-300')}>{p}</button>
                ))}
              </div>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500} placeholder="Note — misaal: rider Ali le ja raha hai, shaam tak pohanchega"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500" />
              <Hint>Note slip par chhapta hai aur dono branch ko dikhta hai</Hint>
            </div>
          </aside>
        </div>
      )}

      {scanner && <BarcodeScanner title="Maal scan karein" hint="Product, carton, IMEI ya serial ka barcode" onClose={() => setScanner(false)} onDetected={(c) => { setScanner(false); onCode(c); }} />}
      {variantFor && <VariantModal product={variantFor.product} onClose={() => setVariantFor(null)} onPick={(v) => { addPlain(variantFor.product, variantFor.unit, v); setVariantFor(null); }} />}
      {rollsFor && <RollPicker product={rollsFor} shopId={fromId} exclude={taken} money={money} onClose={() => setRollsFor(null)} onPick={(r) => { addRolls(rollsFor, r); setRollsFor(null); }} />}
      {devicesFor && (
        <PickListModal title={devicesFor.title} description={`${fromShop?.name ?? ''} me maujood — jitne bhejne hain sab chunein`} exclude={taken}
          items={devicesFor.list.map((d) => ({ id: d.id, title: devicesFor.product ? d.ref : `${d.name} · ${d.ref}`, sub: devicesFor.product ? d.detail : [d.kind === 'used' ? 'Used' : '', d.detail].filter(Boolean).join(' · '), right: money(d.cost) }))}
          onClose={() => setDevicesFor(null)}
          onConfirm={(ids) => { addDevices(devicesFor.list.filter((d) => ids.includes(d.id))); setDevicesFor(null); }}
          extra={devicesFor.product?.kind === 'serial' ? (
            <button type="button" className="text-[0.8125rem] font-medium text-brand-700 hover:underline" onClick={() => { const p = devicesFor.product!; setDevicesFor(null); addPlain(p); }}>Serial ke bina ginti se bhejein</button>
          ) : undefined} />
      )}
    </Modal>
  );
}

function LineRow({ l, money, onPatch, onRemove }: { l: Line; money: (n: number) => string; onPatch: (p: Partial<Line>) => void; onRemove: () => void }) {
  const baseQty = l.qty * l.unit.rate;
  const after = l.stock == null ? null : l.stock - baseQty;
  const I = KIND_ICON[l.kind];
  return (
    <li className={cn('rounded-2xl border bg-white p-3 shadow-sm', after != null && after < 0 ? 'border-rose-300' : 'border-slate-200')}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><I className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900">{l.name}{l.variantName ? ` (${l.variantName})` : ''}</p>
          <p className="text-[0.75rem] text-slate-500">{[l.kind === 'used' ? 'Used phone' : '', l.ref, l.detail].filter(Boolean).join(' · ') || `${money(l.cost)}/${l.baseUnit}`}</p>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{money(baseQty * l.cost)}</span>
        <button type="button" onClick={onRemove} aria-label="Hatayein" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button>
      </div>

      {l.kind === 'plain' ? (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]">
          <label className="text-[0.6875rem] text-slate-500">Unit
            <select value={l.unit.name} onChange={(e) => { const u = l.units.find((x) => x.name === e.target.value); if (u) onPatch({ unit: u }); }}
              className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none focus:border-brand-500">
              {l.units.map((u) => <option key={u.name} value={u.name}>{u.name}{u.rate !== 1 ? ` = ${qty(u.rate)} ${l.baseUnit}` : ''}</option>)}
            </select>
            <span className="mt-0.5 block text-slate-400">Pcs, carton ya box</span>
          </label>
          <label className="text-[0.6875rem] text-slate-500">Kitne {l.unit.name}
            <span className="mt-0.5 flex">
              <button type="button" aria-label="Kam" onClick={() => onPatch({ qty: Math.max(l.qty - 1, 0) })} className="flex h-9 w-8 items-center justify-center rounded-l-lg border border-r-0 border-slate-200 text-slate-600 hover:bg-slate-50"><Minus className="h-3.5 w-3.5" /></button>
              <input type="number" min={0} step="any" inputMode="decimal" value={l.qty || ''} placeholder="0" aria-label={`${l.name} quantity`}
                onChange={(e) => onPatch({ qty: Math.max(Number(e.target.value) || 0, 0) })}
                className="h-9 w-full min-w-0 border border-slate-200 bg-white px-2 text-center text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-brand-500" />
              <button type="button" aria-label="Zyada" onClick={() => onPatch({ qty: l.qty + 1 })} className="flex h-9 w-8 items-center justify-center rounded-r-lg border border-l-0 border-slate-200 text-slate-600 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /></button>
            </span>
            {l.unit.rate !== 1 && <span className="mt-0.5 block font-medium text-brand-700">= {qty(baseQty)} {l.baseUnit}</span>}
          </label>
          <div className={cn('col-span-2 rounded-lg px-2.5 py-1.5 text-[0.75rem] sm:col-span-1', after != null && after < 0 ? 'bg-rose-50 text-rose-800' : 'bg-slate-50 text-slate-600')}>
            <p>Abhi <b className="tabular-nums">{qty(l.stock ?? 0)}</b> {l.baseUnit}</p>
            <p>Bhejne ke baad <b className="tabular-nums">{qty(after ?? 0)}</b> {l.baseUnit}</p>
            {after != null && after < 0 && <p className="mt-0.5 flex items-center gap-1 font-medium"><AlertTriangle className="h-3.5 w-3.5" /> Stock se zyada — kam karein</p>}
          </div>
        </div>
      ) : (
        <p className="mt-1.5 flex items-center gap-1 text-[0.75rem] text-slate-500"><Hash className="h-3.5 w-3.5" />
          {l.kind === 'carpet' ? `Poora roll · ${qty(baseQty)} ${l.baseUnit}` : 'Ek unit — poora jata hai'}
        </p>
      )}
    </li>
  );
}

function Summary({ from, to, lines, value, notes, money }: { from: string; to: string; lines: Line[]; value: number; notes: string; money: (n: number) => string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-slate-900 px-4 py-4 text-white">
        <span className="text-lg font-bold">{from}</span><ArrowRight className="h-5 w-5 text-white/60" /><span className="text-lg font-bold">{to}</span>
      </div>
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {lines.map((l) => (
          <li key={l.key} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium text-slate-900">{l.name}{l.variantName ? ` (${l.variantName})` : ''}</span>
              {l.ref && <span className="block text-[0.75rem] text-slate-500">{l.ref}</span>}
            </span>
            <span className="shrink-0 text-right tabular-nums">
              {qty(l.qty)} {l.unit.name}{l.unit.rate !== 1 && <span className="block text-[0.75rem] text-slate-500">= {qty(l.qty * l.unit.rate)} {l.baseUnit}</span>}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <span className="text-slate-600">{lines.length} cheezein · {unitsText(lines)}</span><span className="text-lg font-bold tabular-nums text-slate-900">{money(value)}</span>
      </div>
      {notes.trim() && <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700 ring-1 ring-slate-100">{notes.trim()}</p>}
      <p className="text-center text-[0.8125rem] text-slate-500">Maal "Raste me" rahega jab tak {to} "Receive karein" na dabaye. Ghalti ho to receive se pehle cancel ho sakta hai.</p>
    </div>
  );
}

/** "24 pcs · 3 kg · 2 rolls". */
function unitsText(lines: Line[]) {
  const by = new Map<string, number>();
  for (const l of lines) {
    const k = l.kind === 'carpet' ? 'roll' : l.baseUnit;
    by.set(k, (by.get(k) ?? 0) + (l.kind === 'carpet' ? 1 : l.qty * l.unit.rate));
  }
  return [...by].map(([u, n]) => `${qty(n)} ${u}`).join(' · ') || '—';
}

function KindBadge({ kind, variants }: { kind: SendProduct['kind']; variants: number }) {
  const label = kind === 'carpet' ? 'Rolls' : kind === 'imei' ? 'IMEI' : kind === 'serial' ? 'Serial' : variants ? `${variants} type` : '';
  return label ? <span className="rounded bg-violet-50 px-1 text-[0.625rem] font-semibold uppercase text-violet-700">{label}</span> : null;
}

function Chip({ icon: I, label, onClick }: { icon: typeof Boxes; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[0.8125rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:ring-brand-300">
      <I className="h-3.5 w-3.5 text-violet-600" /> {label}
    </button>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-2"><span className="text-slate-500">{k}</span><span className="text-right font-medium tabular-nums text-slate-900">{v}</span></div>;
}

function Hint({ children }: { children: ReactNode }) {
  return <span className="mt-1 block text-[0.6875rem] leading-snug text-slate-400">{children}</span>;
}
