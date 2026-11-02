/**
 * Selling costs of online orders: whether Nafaa writes them in Expenses by
 * itself (the P&L), each courier's rate card (base price and weight, price
 * per extra kilo, city prices, COD fee and return charge), packaging per
 * channel and payment gateway fees. Orders use these until the courier's own
 * figure arrives (booking reply, settlement statement or typed by hand).
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, Package, Plus, Receipt, Save, Trash2, Truck, Wallet } from 'lucide-react';
import { Alert, Button, Card, Input, PageHero, PageShell, Skeleton, Switch } from '@/design-system/components';
import { BrandLogo, brandForChannel, brandForPayment } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { apiErrorMessage } from '../api/online-orders.api';
import { orderMoneyApi, type CostSettings, type CourierRate } from '../api/order-money.api';
import { courierBrand, rs } from '../lib/labels';
import { t, Trans } from '@core/i18n';

const KEY = ['order-cost-settings'];
const GATEWAYS = [{ code: 'SAFEPAY', name: 'Safepay' }, { code: 'JAZZCASH', name: 'JazzCash' }, { code: 'EASYPAISA', name: 'Easypaisa' }];
const blankRate = (): CourierRate => ({ base: 0, baseKg: 0.5, perKg: 0, cities: [], codPct: 0, codFixed: 0, rtoPct: 100 });
const numOr = (v: string, d = 0) => (v.trim() === '' || !Number.isFinite(Number(v)) ? d : Number(v));

export default function OrderCostsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: orderMoneyApi.costSettings });
  const [draft, setDraft] = useState<CostSettings | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { if (data && !draft) setDraft(data.settings); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = useMemo(() => !!draft && !!data && JSON.stringify(draft) !== JSON.stringify(data.settings), [draft, data]);

  const save = useMutation({
    mutationFn: () => orderMoneyApi.saveCostSettings(draft!),
    onSuccess: (r) => {
      qc.setQueryData(KEY, { ...data!, settings: r.settings });
      setDraft(r.settings);
      ['online-order', 'online-profit'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(t('Selling costs save ho gaye'));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const setRate = (code: string, patch: Partial<CourierRate>) =>
    setDraft((d) => d && ({ ...d, couriers: { ...d.couriers, [code]: { ...(d.couriers[code] ?? blankRate()), ...patch } } }));

  return (
    <PageShell className="max-w-4xl">
      <PageHero back="/online-store/couriers" backLabel={t('Couriers')} title={t('Selling costs')}
        subtitle={t('Courier, COD fee, packaging aur gateway fee — har online order ka asli profit inhi se banta hai.')}
        actions={<Button variant="primary" size="sm" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Save className="h-4 w-4" />}>{t('Save')}</Button>} />

      {isLoading || !draft || !data ? (
        error ? <Alert tone="danger">{apiErrorMessage(error)}</Alert> : <div className="space-y-4"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
      ) : (<>
        <Card title={t('P&L me kaise jaye')} description={t('Ek hi jagah se — warna kharcha do dafa ginta hai.')}>
          <Switch checked={draft.postExpenses} onChange={(e) => setDraft({ ...draft, postExpenses: e.target.checked })}
            label={t('Courier charges Nafaa khud kharche me likhe')}
            description={draft.postExpenses
              ? t('Chalu: order deliver ya wapas hote hi us ke courier, COD fee, packaging aur gateway fee "Online selling costs" naam se Expenses me khud likhe jayenge. Statement aane par amount asli ho jata hai.')
              : t('Band: Nafaa sirf order par asli profit dikhata hai. Expenses aur P&L me wohi jaata hai jo aap khud likhte hain.')} />
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-600">
            <Trans text="Agar aap courier ka mahine ka bill pehle se Expenses me khud likhte hain to isay {{off}} rakhein. Chalu karne par sirf aage ke orders likhe jate hain; pichhle nahi." values={{ off: <b>{t('band')}</b> }} />
          </p>
        </Card>

        <Card flush title={t('Courier rates')} description={t('Courier ka apna charge na mile to yahi rate lagta hai. Pehla wazan tak base, phir har agle kilo ka extra.')}>
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {data.couriers.map((c) => {
              const r = draft.couriers[c.code];
              const isOpen = open === c.code;
              return (
                <li key={c.code}>
                  <button type="button" onClick={() => setOpen(isOpen ? null : c.code)} aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-slate-50/80 sm:px-5">
                    <BrandLogo name={courierBrand(c.code)} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.875rem] font-semibold text-slate-900">{c.name}</span>
                      <span className="block truncate text-[0.75rem] text-slate-500">
                        {r && (r.base > 0 || r.perKg > 0)
                          ? [`${rs(r.base)} (${r.baseKg} kg tak)`, r.perKg ? `+${rs(r.perKg)}/kg` : null, r.codPct || r.codFixed ? t('COD {{value}}{{value2}}{{value3}}', { value: r.codPct ? `${r.codPct}%` : '', value2: r.codPct && r.codFixed ? ' + ' : '', value3: r.codFixed ? rs(r.codFixed) : '' }) : null, `wapsi ${r.rtoPct}%`, r.cities.length ? `${r.cities.length} shehar` : null].filter(Boolean).join(' · ')
                          : t('Rate nahi likha')}
                      </span>
                    </span>
                    <ChevronDown className={cn('h-4 w-4 text-slate-400 transition', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && <RateForm rate={r ?? blankRate()} onChange={(p) => setRate(c.code, p)} onClear={() => { const { [c.code]: _x, ...rest } = draft.couriers; setDraft({ ...draft, couriers: rest }); }} />}
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={<span className="inline-flex items-center gap-2"><Package className="h-4 w-4 text-slate-400" />{t('Packaging')}</span>} description={t('Har parcel ka dabba, tape, flyer.')}>
            <div className="space-y-3">
              <Input size="sm" type="number" min={0} label={t('Har order (Rs)')} value={String(draft.packaging.default || '')} placeholder="0"
                onChange={(e) => setDraft({ ...draft, packaging: { ...draft.packaging, default: numOr(e.target.value) } })} />
              {data.channels.map((ch) => (
                <div key={ch.id} className="flex items-center gap-2">
                  <BrandLogo name={brandForChannel(ch.type, { platform: ch.platform ?? undefined })} size={20} />
                  <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-slate-700">{ch.displayName}</span>
                  <input type="number" min={0} aria-label={t('{{displayName}} packaging', { displayName: ch.displayName })} placeholder={String(draft.packaging.default || 0)}
                    value={draft.packaging.byChannel[ch.id] ?? ''}
                    onChange={(e) => {
                      const { [ch.id]: _x, ...rest } = draft.packaging.byChannel;
                      setDraft({ ...draft, packaging: { ...draft.packaging, byChannel: e.target.value === '' ? rest : { ...rest, [ch.id]: numOr(e.target.value) } } });
                    }}
                    className="h-8 w-24 rounded-lg border border-slate-200 bg-white px-2 text-end text-[0.8125rem] tabular-nums text-slate-900" />
                </div>
              ))}
              <p className="text-[0.6875rem] text-slate-500">{t('Channel ka khana khali ho to upar wala amount lagta hai.')}</p>
            </div>
          </Card>

          <Card title={<span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-slate-400" />{t('Gateway fee')}</span>} description={t('Payment link se aaye paise par gateway ka hissa.')}>
            <div className="space-y-2">
              {GATEWAYS.map((g) => {
                const v = draft.gateways[g.code] ?? { pct: 0, fixed: 0 };
                const set = (p: Partial<typeof v>) => setDraft({ ...draft, gateways: { ...draft.gateways, [g.code]: { ...v, ...p } } });
                return (
                  <div key={g.code} className="flex items-center gap-2">
                    <BrandLogo name={brandForPayment(g.code)} size={20} />
                    <span className="min-w-0 flex-1 text-[0.8125rem] text-slate-700">{g.name}</span>
                    <input type="number" min={0} step="0.1" aria-label={`${g.name} %`} value={v.pct || ''} placeholder="%" onChange={(e) => set({ pct: numOr(e.target.value) })}
                      className="h-8 w-16 rounded-lg border border-slate-200 bg-white px-2 text-end text-[0.8125rem] tabular-nums" />
                    <span className="text-xs text-slate-400">% +</span>
                    <input type="number" min={0} aria-label={t('{{name}} Rs', { name: g.name })} value={v.fixed || ''} placeholder="Rs" onChange={(e) => set({ fixed: numOr(e.target.value) })}
                      className="h-8 w-16 rounded-lg border border-slate-200 bg-white px-2 text-end text-[0.8125rem] tabular-nums" />
                  </div>
                );
              })}
              <p className="text-[0.6875rem] text-slate-500">{t('Gateway khud fee bataye to wahi lagti hai.')}</p>
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex flex-wrap items-center gap-3 text-[0.8125rem] text-slate-600">
            <Receipt className="h-4 w-4 text-slate-400" />
            <span className="min-w-0 flex-1"><Trans text="Courier ki payment statement se asli charges khud aa jate hain — {{link}}." values={{ link: <Link to="/online-orders/cod/reconcile" className="font-semibold text-brand-700 hover:underline">{t('Statement milayein')}</Link> }} /></span>
            <Link to="/online-store/couriers/rules" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"><Truck className="h-4 w-4" /> {' '}{t('Auto booking')}</Link>
          </div>
        </Card>

        {dirty && (
          <div className="sticky bottom-3 z-10 flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-2.5 text-white shadow-lg">
            <span className="flex-1 text-[0.8125rem] font-semibold">{t('Tabdeeli save nahi hui')}</span>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setDraft(data.settings)}>{t('Wapas')}</Button>
            <Button size="sm" variant="success" loading={save.isPending} onClick={() => save.mutate()}>{t('Save')}</Button>
          </div>
        )}
      </>)}
    </PageShell>
  );
}

function RateForm({ rate: r, onChange, onClear }: { rate: CourierRate; onChange: (p: Partial<CourierRate>) => void; onClear: () => void }) {
  const [city, setCity] = useState('');
  const [cityBase, setCityBase] = useState('');
  const field = (label: string, key: keyof CourierRate, opts: { step?: string; hint?: string; fallback?: number } = {}) => (
    <Input size="sm" type="number" min={0} step={opts.step} label={label} hint={opts.hint} value={String(r[key] ?? '')}
      onChange={(e) => onChange({ [key]: numOr(e.target.value, opts.fallback ?? 0) } as Partial<CourierRate>)} />
  );
  return (
    <div className="space-y-4 bg-slate-50/70 px-4 pb-4 pt-1 sm:px-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {field(t('Base charge (Rs)'), 'base')}
        {field(t('Base wazan (kg)'), 'baseKg', { step: '0.5', fallback: 0.5 })}
        {field(t('Har agla kilo (Rs)'), 'perKg')}
        {field(t('COD fee (%)'), 'codPct', { step: '0.1' })}
        {field(t('COD fee fixed (Rs)'), 'codFixed')}
        {field(t('Wapsi charge (%)'), 'rtoPct', { hint: t('100 = utna hi dobara, 0 = muft wapsi'), fallback: 100 })}
      </div>
      <div>
        <div className="mb-1.5 text-[0.75rem] font-semibold text-slate-600">{t('Shehar ka alag base charge')}</div>
        <div className="flex flex-wrap gap-1.5">
          {r.cities.map((c) => (
            <span key={c.city} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 text-[0.75rem] ring-1 ring-slate-200">
              {c.city} · {rs(c.base)}
              <button type="button" aria-label={t('{{city}} hatayein', { city: c.city })} onClick={() => onChange({ cities: r.cities.filter((x) => x.city !== c.city) })} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-3 w-3" /></button>
            </span>
          ))}
          {!r.cities.length && <span className="text-[0.75rem] text-slate-400">{t('Koi nahi — har shehar par base charge')}</span>}
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <Input size="sm" label={t('Shehar')} value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('Karachi')} className="w-40" />
          <Input size="sm" type="number" min={0} label={t('Base (Rs)')} value={cityBase} onChange={(e) => setCityBase(e.target.value)} className="w-28" />
          <Button size="sm" variant="secondary" disabled={!city.trim() || !(Number(cityBase) >= 0) || cityBase === ''} leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => { onChange({ cities: [...r.cities.filter((x) => x.city.toLowerCase() !== city.trim().toLowerCase()), { city: city.trim(), base: Number(cityBase) }] }); setCity(''); setCityBase(''); }}>
            {t('Jorein')}
          </Button>
          <span className="flex-1" />
          <Button size="sm" variant="ghost" className="text-rose-600" onClick={onClear}>{t('Rate hatayein')}</Button>
        </div>
      </div>
    </div>
  );
}
