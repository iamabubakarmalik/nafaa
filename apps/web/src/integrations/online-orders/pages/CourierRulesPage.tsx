/**
 * Courier auto-booking rules. The shop picks when Nafaa books by itself (on
 * accept, or when the order is marked ready) and which courier: rules run
 * top to bottom on the customer's city, COD amount, customer risk and
 * channel; the first that fits books (or waits for the shop), else the
 * fallback. Risky customers always wait when the shop keeps that on. Only
 * couriers connected through their API can book by themselves.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Hand, Plus, Save, Trash2, Zap } from 'lucide-react';
import { Alert, Button, Card, Input, PageHero, PageShell, Segmented, Select, Skeleton, Switch } from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { apiErrorMessage } from '../api/online-orders.api';
import { orderMoneyApi, type CourierRule, type CourierRules, type RuleTrigger } from '../api/order-money.api';
import { useSalesChannels } from '../hooks/useSalesChannels';
import { courierBrand } from '../lib/labels';

const KEY = ['courier-rules'];
const RISKS = [
  { value: 'NEW', label: 'Naya customer' }, { value: 'WATCH', label: 'Dhyan se' }, { value: 'HIGH', label: 'RTO khatra' },
  { value: 'OK', label: 'Theek' }, { value: 'TRUSTED', label: 'Bharosemand' },
];
const TRIGGERS: Array<{ value: RuleTrigger; label: string }> = [
  { value: 'OFF', label: 'Band' }, { value: 'ACCEPT', label: 'Accept hote hi' }, { value: 'READY', label: '"Ready" par' },
];
const newRule = (i: number): CourierRule => ({ id: `r${Date.now().toString(36)}${i}`, cities: [], codMin: null, codMax: null, risks: [], channelIds: [], action: 'BOOK', courier: null });

export default function CourierRulesPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: orderMoneyApi.courierRules });
  const { data: channels } = useSalesChannels();
  const [draft, setDraft] = useState<CourierRules | null>(null);
  useEffect(() => { if (data && !draft) setDraft(data.rules); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = useMemo(() => !!draft && !!data && (!data.saved || JSON.stringify(draft) !== JSON.stringify(data.rules)), [draft, data]);

  const save = useMutation({
    mutationFn: () => orderMoneyApi.saveCourierRules(draft!),
    onSuccess: (r) => { qc.setQueryData(KEY, r); setDraft(r.rules); toast.success('Auto booking save ho gayi'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const couriers = data?.couriers ?? [];
  const courierOptions = [
    { value: '', label: '— courier chunein —' },
    ...couriers.map((c) => ({ value: c.code, label: `${c.name}${c.connected ? '' : c.api ? ' (jura nahi)' : ' (sirf haath se)'}`, disabled: !c.connected })),
  ];
  const setRule = (i: number, p: Partial<CourierRule>) => setDraft((d) => d && ({ ...d, rules: d.rules.map((r, j) => (j === i ? { ...r, ...p } : r)) }));
  const move = (i: number, by: number) => setDraft((d) => {
    if (!d) return d;
    const rules = [...d.rules];
    const [r] = rules.splice(i, 1);
    rules.splice(Math.max(0, Math.min(rules.length, i + by)), 0, r);
    return { ...d, rules };
  });
  const connectedCount = couriers.filter((c) => c.connected).length;

  return (
    <PageShell className="max-w-4xl">
      <PageHero back="/online-store/couriers" backLabel="Couriers" title="Auto booking" chip={<><Zap />Auto booking</>}
        meta="Shehar, COD, risk aur channel ke rules"
        subtitle="Kaun sa order kis courier par khud book ho — shehar, COD, customer ka risk aur channel ke hisaab se."
        actions={<Button variant="primary" size="sm" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Save className="h-4 w-4" />}>Save</Button>} />

      {isLoading || !draft ? (
        error ? <Alert tone="danger">{apiErrorMessage(error)}</Alert> : <Skeleton className="h-64 rounded-2xl" />
      ) : (<>
        {!data!.saved && draft.trigger !== 'OFF' && (
          <Alert tone="info">Abhi purani setting chal rahi hai ({couriers.find((c) => c.code === draft.fallback)?.name} par accept hote hi). Save karne par yahi rules chalenge.</Alert>
        )}
        {connectedCount === 0 && (
          <Alert tone="warning">Koi courier API se jura nahi — khud booking ke liye pehle Couriers me PostEx, Leopards ya TCS jorein.</Alert>
        )}

        <Card title="Kab book ho" description="Book karne se pehle Nafaa dobara dekhta hai ke order pehle se book to nahi — do CN kabhi nahi bante.">
          <Segmented label="Kab" value={draft.trigger} onChange={(t) => setDraft({ ...draft, trigger: t })}
            items={TRIGGERS.map((t) => ({ value: t.value, label: t.label }))} />
          <div className="mt-4">
            <Switch checked={draft.holdRisky} onChange={(e) => setDraft({ ...draft, holdRisky: e.target.checked })}
              label="RTO khatre wale customer par ruk jao"
              description="Customer ka risk zyada ho ya number block ho to khud book nahi hoga — order par likha aayega, aap dekh kar book karein." />
          </div>
        </Card>

        <Card flush title="Rules" description="Upar se neeche — jo pehla rule fit ho wahi chalega."
          actions={<Button size="sm" variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setDraft({ ...draft, rules: [...draft.rules, newRule(draft.rules.length)] })}>Rule</Button>}>
          {!draft.rules.length ? (
            <p className="border-t border-slate-100 px-5 py-8 text-center text-[0.8125rem] text-slate-500">Koi rule nahi — sab orders neeche wale courier par jayenge.</p>
          ) : (
            <ol className="divide-y divide-slate-100 border-t border-slate-100">
              {draft.rules.map((r, i) => (
                <li key={r.id} className="space-y-3 px-4 py-4 sm:px-5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{i + 1}</span>
                    <span className="text-[0.8125rem] font-semibold text-slate-800">Agar</span>
                    <span className="flex-1" />
                    <button type="button" aria-label="Upar" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" aria-label="Neeche" disabled={i === draft.rules.length - 1} onClick={() => move(i, 1)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" aria-label="Rule hatayein" onClick={() => setDraft({ ...draft, rules: draft.rules.filter((_, j) => j !== i) })} className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input size="sm" label="Shehar (comma se)" placeholder="Koi bhi" value={r.cities.join(', ')}
                      onChange={(e) => setRule(i, { cities: e.target.value.split(',').map((x) => x.trimStart()).filter((x, k, a) => x || k === a.length - 1) })}
                      onBlur={(e) => setRule(i, { cities: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
                    <Input size="sm" type="number" min={0} label="COD kam az kam (Rs)" placeholder="Koi had nahi" value={r.codMin ?? ''}
                      onChange={(e) => setRule(i, { codMin: e.target.value === '' ? null : Number(e.target.value) })} />
                    <Input size="sm" type="number" min={0} label="COD zyada se zyada (Rs)" placeholder="Koi had nahi" value={r.codMax ?? ''}
                      onChange={(e) => setRule(i, { codMax: e.target.value === '' ? null : Number(e.target.value) })} />
                  </div>
                  <Chips label="Customer risk" items={RISKS} picked={r.risks} onChange={(risks) => setRule(i, { risks })} />
                  {(channels?.length ?? 0) > 1 && (
                    <Chips label="Channel" items={channels!.map((c) => ({ value: c.id, label: c.displayName }))} picked={r.channelIds} onChange={(channelIds) => setRule(i, { channelIds })} />
                  )}
                  <div className="flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    <span className="pb-2 text-[0.8125rem] font-semibold text-slate-800">To</span>
                    <Segmented label="Kya karein" value={r.action} onChange={(action) => setRule(i, { action })}
                      items={[{ value: 'BOOK', label: <><Zap className="h-3.5 w-3.5" />Book karo</> }, { value: 'ASK', label: <><Hand className="h-3.5 w-3.5" />Mujh se poocho</> }]} />
                    {r.action === 'BOOK' && (
                      <div className="flex items-center gap-2">
                        {r.courier && <BrandLogo name={courierBrand(r.courier)} size={24} />}
                        <Select size="sm" aria-label="Courier" value={r.courier ?? ''} onChange={(e) => setRule(i, { courier: e.target.value || null })} options={courierOptions} wrapperClassName="w-52" />
                      </div>
                    )}
                  </div>
                  {r.action === 'BOOK' && !r.courier && <p className="text-[0.75rem] font-semibold text-amber-700">Courier chunein — warna ye rule save nahi hoga.</p>}
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title="Baqi sab orders" description="Jab koi rule fit na ho.">
          <div className="flex flex-wrap items-center gap-2">
            {draft.fallback && <BrandLogo name={courierBrand(draft.fallback)} size={24} />}
            <Select size="sm" aria-label="Baqi orders ka courier" value={draft.fallback ?? ''} onChange={(e) => setDraft({ ...draft, fallback: e.target.value || null })}
              options={[{ value: '', label: 'Mujh se poocho (khud book na karo)' }, ...courierOptions.slice(1)]} wrapperClassName="w-72" />
          </div>
        </Card>
      </>)}
    </PageShell>
  );
}

function Chips({ label, items, picked, onChange }: { label: string; items: Array<{ value: string; label: string }>; picked: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <div className="mb-1 text-[0.75rem] font-semibold text-slate-600">{label} <span className="font-normal text-slate-400">{picked.length ? '' : '· koi bhi'}</span></div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((x) => {
          const on = picked.includes(x.value);
          return (
            <button key={x.value} type="button" aria-pressed={on} onClick={() => onChange(on ? picked.filter((p) => p !== x.value) : [...picked, x.value])}
              className={cn('rounded-lg border px-2.5 py-1 text-xs font-semibold transition', on ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
              {x.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
