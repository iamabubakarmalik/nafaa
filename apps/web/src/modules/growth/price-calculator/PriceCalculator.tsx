/**
 * The price calculator's parts: the inputs (cost, courier, packaging, ads,
 * RTO, tax, target), one card per sales channel with the suggested price,
 * break-even, profit and where every rupee goes, the channel fee editor, and
 * the "Ye price lagao" actions. Used by the Price calculator page and by the
 * product editor's "Price nikalein" modal. The numbers come from the API
 * (price-calculator/quote), so every screen shows the same maths.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Check, ChevronDown, Info, Plus, Settings2, Truck } from 'lucide-react';
import { Button, Modal, Segmented, Skeleton, Switch, confirmDialog } from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';

/** Whole rupees: prices and profit per order read better without paisa. */
const rs = (n: number | null | undefined) => formatPKR(n ?? 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { onlineProductsApi } from '@integrations/online-orders/api/online-products.api';
import {
  CHANNEL_KINDS, PRICE_CALC_KEY, apiError, priceCalcApi,
  type CalcContext, type CalcProduct, type ChannelFees, type ChannelKind, type ChannelResult, type CourierQuote, type PriceDefaults,
} from '../api/growth.api';
import { BREAKDOWN, KIND_BRAND, KIND_LABEL, num, quoteBody, type CalcState } from './meta';

export const inputCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 tabular-nums';
const labelCls = 'mb-1 block text-[0.75rem] font-medium text-slate-600';
const PRESET_NOTE = 'Andaza — apne contract ke mutabiq badlein';

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/** Number box with an optional Rs / % mark. */
export function NumBox({ id, label, value, onChange, placeholder, prefix, suffix, hint, className }: {
  id: string; label: ReactNode; value: string; onChange: (v: string) => void; placeholder?: string; prefix?: string; suffix?: string; hint?: ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[0.75rem] text-slate-400">{prefix}</span>}
        <input id={id} inputMode="decimal" value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
          className={cn(inputCls, prefix && 'pl-9', suffix && 'pr-8')} />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[0.75rem] text-slate-400">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-[0.6875rem] leading-snug text-slate-500">{hint}</p>}
    </div>
  );
}

function Group({ title, icon, children, right }: { title: string; icon?: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200/80 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-slate-900">{icon}{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

/* ───────────────────────── quote ───────────────────────── */

/** Live quote for the typed inputs and a cost; refetches 300 ms after typing stops. */
export function useQuote(state: CalcState | null, cost: number | null) {
  const body = useDebounced(useMemo(() => (state ? { ...quoteBody(state), cost: cost ?? undefined } : null), [state, cost]));
  return useQuery({
    queryKey: [PRICE_CALC_KEY, 'quote', body],
    queryFn: () => priceCalcApi.quote(body!),
    enabled: !!body && body.cost !== undefined && body.cost > 0 && body.channels!.length > 0,
    placeholderData: (p) => p,
    staleTime: 30_000,
  });
}

/* ───────────────────────── inputs ───────────────────────── */

export function CalcInputs({ ctx, state, set, courier, hideCost, compact, wide }: {
  ctx: CalcContext; state: CalcState; set: (patch: Partial<CalcState>) => void; courier?: CourierQuote | null; hideCost?: boolean; compact?: boolean;
  /** Groups side by side (bulk view, where the list needs the full width). */
  wide?: boolean;
}) {
  const qc = useQueryClient();
  const canSave = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const [feesFor, setFeesFor] = useState<ChannelKind | null>(null);
  const rated = ctx.couriers.find((c) => c.code === state.courierCode)?.rateCard ?? false;
  const fromCard = courier?.source === 'RATE_CARD';
  const courierName = ctx.couriers.find((c) => c.code === state.courierCode)?.name;

  const save = useMutation({
    mutationFn: () => {
      const price: Partial<PriceDefaults> = {
        channels: state.fees,
        packaging: num(state.packaging) === (ctx.packaging ?? 0) ? null : num(state.packaging),
        courier: {
          code: state.courierCode || null, city: state.city, weightKg: num(state.weightKg) ?? 0.5,
          charge: num(state.courierCharge) ?? ctx.settings.price.courier.charge,
          codPct: num(state.codPct) ?? ctx.settings.price.courier.codPct,
          codFixed: ctx.settings.price.courier.codFixed,
          returnPct: num(state.returnPct) ?? ctx.settings.price.courier.returnPct,
        },
        adsPerOrder: num(state.adsPerOrder) === (ctx.ads.value ?? 0) ? null : num(state.adsPerOrder),
        deliveryCharge: num(state.deliveryCharge) ?? 0,
        taxPct: num(state.taxPct) === ctx.tax.pricePct ? null : num(state.taxPct),
        target: { mode: state.targetMode, value: num(state.targetValue) ?? 0 },
        endWith9: state.endWith9,
      };
      return priceCalcApi.saveDefaults(price);
    },
    onSuccess: () => { toast.success('Ye inputs dukaan ke default ban gaye'); qc.invalidateQueries({ queryKey: [PRICE_CALC_KEY, 'context'] }); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });

  const toggleKind = (k: ChannelKind) => set({ kinds: state.kinds.includes(k) ? state.kinds.filter((x) => x !== k) : CHANNEL_KINDS.filter((x) => x === k || state.kinds.includes(x)) });
  const grid = compact ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-2 gap-3';

  return (
    <div className={wide ? 'grid items-start gap-3 lg:grid-cols-2' : 'space-y-3'}>
      <Group title="Product aur target">
        <div className={grid}>
          {!hideCost && (
            <NumBox id="pc-cost" label="Product cost (ek piece)" prefix="Rs" value={state.cost} onChange={(v) => set({ cost: v })} placeholder="0"
              hint={ctx.product ? `Product ki Cost: ${rs(ctx.product.cost)}` : 'Maal kitne ka para'} />
          )}
          <div className={cn(hideCost && 'col-span-2')}>
            <span className={labelCls}>Kitna Profit chahiye?</span>
            <Segmented label="Profit ka tareeqa" value={state.targetMode} onChange={(v) => set({ targetMode: v })}
              items={[{ value: 'MARGIN', label: 'Margin %' }, { value: 'RUPEES', label: 'Rupees' }]} className="w-full [&>button]:flex-1 [&>button]:whitespace-nowrap [&>button]:px-2" />
          </div>
          <NumBox id="pc-target" label={state.targetMode === 'MARGIN' ? 'Margin (Price ka %)' : 'Profit har piece par'} value={state.targetValue}
            onChange={(v) => set({ targetValue: v })} prefix={state.targetMode === 'RUPEES' ? 'Rs' : undefined} suffix={state.targetMode === 'MARGIN' ? '%' : undefined} />
          <div className="flex items-end pb-1">
            <Switch size="sm" checked={state.endWith9} onChange={(e) => set({ endWith9: e.target.checked })} label="9 par khatam" description="1234 → 1239" />
          </div>
        </div>
      </Group>

      <Group title="Courier aur packing" icon={<Truck className="h-4 w-4 text-slate-400" />}>
        <div className={grid}>
          <div className="col-span-2">
            <label htmlFor="pc-courier" className={labelCls}>Courier</label>
            <select id="pc-courier" value={state.courierCode} onChange={(e) => set({ courierCode: e.target.value, courierCharge: '' })} className={inputCls}>
              <option value="">Rate card ke baghair</option>
              {ctx.couriers.map((c) => <option key={c.code} value={c.code}>{c.name}{c.rateCard ? ' · rate card' : ''}</option>)}
            </select>
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pc-city" className={labelCls}>Shehar</label>
              <input id="pc-city" value={state.city} onChange={(e) => set({ city: e.target.value })} placeholder="Sab" className={inputCls} />
            </div>
            <NumBox id="pc-weight" label="Wazan" suffix="kg" value={state.weightKg} onChange={(v) => set({ weightKg: v })} />
          </div>
          <NumBox id="pc-charge" label="Courier charge" prefix="Rs" value={state.courierCharge} onChange={(v) => set({ courierCharge: v })}
            placeholder={courier ? String(courier.charge) : ''}
            hint={state.courierCharge ? 'Aap ne khud likha' : fromCard ? `${courierName} rate card se` : rated && courier ? 'Rate card me is shehar/wazan ka rate nahi' : 'Aap ka default'} />
          <NumBox id="pc-cod" label="COD fee" suffix="%" value={state.codPct} onChange={(v) => set({ codPct: v })} placeholder={courier ? String(courier.codPct) : ''}
            hint={courier && courier.codFixed > 0 ? `+ Rs ${courier.codFixed} har order` : 'COD amount par'} />
          <NumBox id="pc-pack" label="Packaging (har order)" prefix="Rs" value={state.packaging} onChange={(v) => set({ packaging: v })} />
          <NumBox id="pc-return" label="Wapsi ka courier" suffix="%" value={state.returnPct} onChange={(v) => set({ returnPct: v })}
            placeholder={courier ? String(courier.returnPct) : '100'} hint="Jane wale charge ka kitna %" />
          <NumBox id="pc-delivery" label="Customer se delivery charge" prefix="Rs" value={state.deliveryCharge} onChange={(v) => set({ deliveryCharge: v })}
            hint="Free delivery ho to 0" className="col-span-2 sm:col-span-1" />
        </div>
      </Group>

      <Group title="Ads, wapsi aur tax">
        <div className={grid}>
          <NumBox id="pc-ads" label="Ads har order par" prefix="Rs" value={state.adsPerOrder} onChange={(v) => set({ adsPerOrder: v })}
            hint={ctx.ads.value !== null ? `Pichle 30 din: ${rs(ctx.ads.value)} (${ctx.ads.orders} orders)` : 'Ads ka kharcha likhne par khud aayega'} />
          <NumBox id="pc-tax" label={`${ctx.tax.label} Price me shamil`} suffix="%" value={state.taxPct} onChange={(v) => set({ taxPct: v })}
            hint={ctx.tax.enabled ? (ctx.tax.inclusive ? `Dukaan ki setting: ${ctx.tax.rate}%` : 'Tax upar se lagta hai — 0 rakhein') : 'Tax nahi lagta to 0'} />
        </div>
      </Group>

      <Group title="Channels" right={<span className="text-[0.6875rem] text-slate-400">{PRESET_NOTE}</span>}>
        <div className="flex flex-wrap gap-1.5">
          {CHANNEL_KINDS.map((k) => {
            const on = state.kinds.includes(k);
            return (
              <button key={k} type="button" onClick={() => toggleKind(k)} aria-pressed={on}
                className={cn('inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[0.8125rem] font-semibold ring-1 transition',
                  on ? 'bg-brand-50 text-brand-800 ring-brand-300' : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50')}>
                <BrandLogo name={KIND_BRAND[k]} size={18} />{KIND_LABEL[k]}{on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
        <ul className="mt-3 divide-y divide-slate-100">
          {state.kinds.map((k) => {
            const f = state.fees[k];
            const cat = f.categories.find((c) => c.key === f.category);
            return (
              <li key={k} className="flex items-center gap-2 py-2">
                <BrandLogo name={KIND_BRAND[k]} size={22} />
                <div className="min-w-0 flex-1 text-[0.75rem] text-slate-600">
                  <p className="font-semibold text-slate-800">{KIND_LABEL[k]}</p>
                  <p className="truncate">
                    {[f.commissionPct ? `Commission ${f.commissionPct}%${cat ? ` (${cat.label})` : ''}` : null, f.paymentFeePct ? `Payment ${f.paymentFeePct}%` : null,
                      f.ownCourier ? `Apna courier · COD ${f.codShare}%` : `Shipping Rs ${f.shippingFee}`, `RTO ${state.rto[k] || 0}%`].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Button size="xs" variant="secondary" onClick={() => setFeesFor(k)} leftIcon={<Settings2 className="h-3.5 w-3.5" />}>Fees</Button>
              </li>
            );
          })}
        </ul>
        {canSave && (
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="ghost" loading={save.isPending} onClick={() => save.mutate()}>Ye sab default bana dein</Button>
          </div>
        )}
      </Group>

      {feesFor && (
        <FeesModal kind={feesFor} ctx={ctx} fees={state.fees[feesFor]} rto={state.rto[feesFor]}
          onClose={() => setFeesFor(null)}
          onSave={(fees, rto) => { set({ fees: { ...state.fees, [feesFor]: fees }, rto: { ...state.rto, [feesFor]: rto } }); setFeesFor(null); }} />
      )}
    </div>
  );
}

/** Edits one channel's fees and RTO %. */
function FeesModal({ kind, ctx, fees, rto, onClose, onSave }: {
  kind: ChannelKind; ctx: CalcContext; fees: ChannelFees; rto: string; onClose: () => void; onSave: (f: ChannelFees, rto: string) => void;
}) {
  const [f, setF] = useState(fees);
  const [r, setR] = useState(rto);
  const s = (v: string) => Number(v) || 0;
  const hist = ctx.rto[kind];
  return (
    <Modal open onClose={onClose} size="md" title={<span className="inline-flex items-center gap-2"><BrandLogo name={KIND_BRAND[kind]} size={24} /> {KIND_LABEL[kind]} ki fees</span>}
      description={PRESET_NOTE}
      footer={<>
        <Button variant="ghost" className="mr-auto" onClick={() => setF(ctx.presets[kind])}>Shuru wale numbers</Button>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => onSave(f, r)}>Theek hai</Button>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        {f.categories.length > 0 && (
          <div className="col-span-2">
            <label htmlFor="fee-cat" className={labelCls}>Category (commission is se)</label>
            <select id="fee-cat" value={f.category ?? ''} className={inputCls}
              onChange={(e) => { const c = f.categories.find((x) => x.key === e.target.value); setF({ ...f, category: e.target.value || null, ...(c && { commissionPct: c.pct }) }); }}>
              {f.categories.map((c) => <option key={c.key} value={c.key}>{c.label} · {c.pct}%</option>)}
            </select>
          </div>
        )}
        <NumBox id="fee-comm" label="Commission" suffix="%" value={String(f.commissionPct)} onChange={(v) => setF({ ...f, commissionPct: s(v) })} hint="Item ki Price par" />
        <NumBox id="fee-pay" label="Payment / gateway fee" suffix="%" value={String(f.paymentFeePct)} onChange={(v) => setF({ ...f, paymentFeePct: s(v) })}
          hint={f.ownCourier ? 'Sirf online paid orders par' : 'Har order par'} />
        <NumBox id="fee-fixed" label="Fixed fee (har order)" prefix="Rs" value={String(f.fixedFee)} onChange={(v) => setF({ ...f, fixedFee: s(v) })} />
        <NumBox id="fee-rto" label="RTO (wapas aane wale orders)" suffix="%" value={r} onChange={setR}
          hint={hist?.pct != null ? `Aap ka record: ${hist.pct}% (${hist.parcels} parcel)` : 'Record kam hai — andaza likhein'} />
        <div className="col-span-2 rounded-xl bg-slate-50 p-3">
          <Switch size="sm" checked={f.ownCourier} onChange={(e) => setF({ ...f, ownCourier: e.target.checked })}
            label="Courier main khud book karta hoon" description={f.ownCourier ? 'Courier charge aur COD fee upar wale inputs se' : 'Channel khud bhejta hai aur shipping fee leta hai'} />
          <div className="mt-3 grid grid-cols-2 gap-3">
            {f.ownCourier
              ? <NumBox id="fee-cod" label="COD orders" suffix="%" value={String(f.codShare)} onChange={(v) => setF({ ...f, codShare: Math.min(100, s(v)) })} hint="Baqi online paid" />
              : <NumBox id="fee-ship" label="Shipping fee (aap ka hissa)" prefix="Rs" value={String(f.shippingFee)} onChange={(v) => setF({ ...f, shippingFee: s(v) })} />}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ───────────────────────── results ───────────────────────── */

export function ResultCards({ results, loading, product, ctx, onUseRetail, checkPrice, onCheckPrice }: {
  results: ChannelResult[] | undefined; loading: boolean; product: CalcProduct | null; ctx: CalcContext;
  onUseRetail?: (price: number) => void; checkPrice: string; onCheckPrice: (v: string) => void;
}) {
  if (loading && !results) return <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>;
  if (!results?.length) {
    return (
      <div className="rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-slate-200/80">
        <Info className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 font-semibold text-slate-900">Product ki Cost likhein</p>
        <p className="mt-1 text-sm text-slate-500">Har channel ki Price, break-even aur Profit yahan aayega.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200/80">
        <label htmlFor="pc-check" className="text-[0.8125rem] font-medium text-slate-700">Apni Price check karein</label>
        <div className="relative w-36">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[0.75rem] text-slate-400">Rs</span>
          <input id="pc-check" inputMode="decimal" value={checkPrice} onChange={(e) => onCheckPrice(e.target.value.replace(/[^\d.]/g, ''))} placeholder="Maslan 1999" className={cn(inputCls, 'h-9 pl-9')} />
        </div>
        <span className="text-[0.75rem] text-slate-500">har channel par is Price ka Profit dikhega</span>
      </div>
      <div className={cn('grid gap-3', results.length > 1 && 'md:grid-cols-2', results.length > 2 && '2xl:grid-cols-3')}>
        {results.map((r) => <ChannelCard key={r.kind} r={r} product={product} ctx={ctx} onUseRetail={onUseRetail} />)}
      </div>
    </div>
  );
}

function ChannelCard({ r, product, ctx, onUseRetail }: { r: ChannelResult; product: CalcProduct | null; ctx: CalcContext; onUseRetail?: (price: number) => void }) {
  const [open, setOpen] = useState(false);
  const paid = r.breakdown.reduce((s, l) => s + Math.max(0, l.value), 0);
  return (
    <article className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <header className="flex items-center gap-2">
        <BrandLogo name={KIND_BRAND[r.kind]} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[0.9375rem] font-semibold text-slate-900">{KIND_LABEL[r.kind]}</h3>
          <p className="text-[0.6875rem] text-slate-500">RTO {r.rtoPct}% ke hisaab se</p>
        </div>
      </header>

      {r.problem ? (
        <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {r.problem === 'FEES_TOO_HIGH' ? 'Fees itni zyada hain ke kisi Price par Profit nahi bachta. Fees check karein.' : 'Itna Margin is channel ki fees ke saath mumkin nahi — kam karein.'}
        </div>
      ) : (<>
        <div className="mt-3">
          <p className="text-[0.75rem] font-medium text-slate-500">Suggested Price</p>
          <p className="text-[1.75rem] font-bold leading-tight tabular-nums text-slate-900">{rs(r.price ?? 0)}</p>
          <p className="mt-0.5 text-[0.8125rem] text-slate-600">
            Profit <span className={cn('font-semibold tabular-nums', (r.profit ?? 0) >= 0 ? 'text-success-700' : 'text-rose-600')}>{rs(r.profit ?? 0)}</span>
            <span className="text-slate-400"> · </span>Margin <span className="font-semibold tabular-nums">{r.margin ?? 0}%</span>
          </p>
        </div>
        <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-900 ring-1 ring-rose-100">
          Break-even <span className="font-bold tabular-nums">{rs(r.breakEven ?? 0)}</span> — is se kam me nuksan
        </div>
        {r.check && (
          <div className={cn('mt-2 rounded-xl px-3 py-2 text-[0.8125rem] ring-1', r.check.profit >= 0 ? 'bg-success-50 text-success-900 ring-success-100' : 'bg-amber-50 text-amber-900 ring-amber-200')}>
            {rs(r.check.price)} par: Profit <span className="font-bold tabular-nums">{rs(r.check.profit)}</span> ({r.check.margin ?? 0}%)
          </div>
        )}

        {/* Where the customer's money goes, as one bar. */}
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
          {r.breakdown.filter((l) => l.value > 0).map((l) => (
            <span key={l.key} style={{ width: `${(l.value / (paid || 1)) * 100}%`, backgroundColor: BREAKDOWN[l.key].color }} />
          ))}
        </div>
        <button type="button" onClick={() => setOpen((x) => !x)} aria-expanded={open}
          className="mt-2 inline-flex items-center gap-1 self-start text-[0.75rem] font-semibold text-brand-700 hover:underline">
          Har rupee kahan gaya <ChevronDown className={cn('h-3.5 w-3.5 transition', open && 'rotate-180')} />
        </button>
        {open && (
          <ul className="mt-2 space-y-1 text-[0.8125rem]">
            {r.breakdown.map((l) => (
              <li key={l.key} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: BREAKDOWN[l.key].color }} />
                <span className={cn('flex-1 text-slate-600', l.key === 'profit' && 'font-semibold text-slate-900')}>{BREAKDOWN[l.key].label}</span>
                <span className={cn('tabular-nums text-slate-800', l.key === 'profit' && 'font-bold', l.value < 0 && 'text-rose-600')}>{rs(l.value)}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 border-t border-slate-100 pt-1 text-[0.75rem] text-slate-500">
              <span className="flex-1">Customer ne diya (Price + delivery)</span><span className="tabular-nums">{rs(paid)}</span>
            </li>
          </ul>
        )}

        <div className="mt-auto pt-3">
          <ApplyActions kind={r.kind} price={r.price ?? 0} product={product} ctx={ctx} onUseRetail={onUseRetail} />
        </div>
      </>)}
    </article>
  );
}

/** "Ye price lagao": the Nafaa retail price, or this channel's own price on its linked items. */
function ApplyActions({ kind, price, product, ctx, onUseRetail }: { kind: ChannelKind; price: number; product: CalcProduct | null; ctx: CalcContext; onUseRetail?: (price: number) => void }) {
  const qc = useQueryClient();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const canChannel = usePermission(PERMISSIONS.ONLINE_PRODUCTS_MANAGE);
  const links = (product?.links ?? []).filter((l) => l.kind === kind && l.canSetPrice);
  const channelNames = [...new Set(links.map((l) => ctx.channels.find((c) => c.id === l.integrationId)?.name).filter(Boolean))].join(', ');

  const retail = useMutation({
    mutationFn: () => productsApi.update(product!.id, { price } as any),
    onSuccess: () => { toast.success(`${product!.name}: Retail price ${rs(price)} ho gayi`); qc.invalidateQueries({ queryKey: [PRICE_CALC_KEY] }); qc.invalidateQueries({ queryKey: ['products'] }); },
    onError: (e) => toast.error(apiError(e, 'Price nahi lagi')),
  });
  const channel = useMutation({
    mutationFn: async () => { for (const l of links) await onlineProductsApi.setPrice(l.mappingId, price); },
    onSuccess: () => { toast.success(`${KIND_LABEL[kind]} par ${rs(price)} lag gayi — channel par bhej rahe hain`); qc.invalidateQueries({ queryKey: [PRICE_CALC_KEY] }); qc.invalidateQueries({ queryKey: ['online-products'] }); },
    onError: (e) => toast.error(apiError(e, 'Channel price nahi lagi')),
  });

  if (onUseRetail) {
    return <Button fullWidth onClick={() => onUseRetail(price)}>Ye Price lagao (Retail)</Button>;
  }
  if (!product) return <p className="text-[0.75rem] text-slate-500">Upar product chunein to yahin se Price laga sakte hain.</p>;
  const askRetail = async () => {
    if (await confirmDialog({
      title: `${product.name}: Retail price ${rs(price)} karein?`,
      text: `Abhi ${rs(product.price)} hai. Jo channel Nafaa ki Price lete hain un par bhi nayi Price jayegi.${product.hasVariants ? ' Jin sizes ki apni Price hai wo nahi badlengi.' : ''}`,
    })) retail.mutate();
  };
  const askChannel = async () => {
    if (await confirmDialog({ title: `Sirf ${KIND_LABEL[kind]} par ${rs(price)}?`, text: `${channelNames} par ${links.length} link ki apni Price lagegi. Nafaa ki Retail price wahi rahegi.` })) channel.mutate();
  };
  return (
    <div className="flex flex-col gap-1.5">
      {canEdit && <Button size="sm" onClick={askRetail} loading={retail.isPending}>Ye Price lagao (Retail)</Button>}
      {canChannel && links.length > 0 && <Button size="sm" variant="secondary" onClick={askChannel} loading={channel.isPending}>Sirf {KIND_LABEL[kind]} par lagao</Button>}
      {canChannel && !links.length && kind !== 'WEBSITE' && <p className="text-[0.6875rem] text-slate-500">Ye product {KIND_LABEL[kind]} se jura nahi.</p>}
    </div>
  );
}

