/**
 * Report scammer: numbers the shop blocked (by hand or from an order's
 * "Scammer report karein"), each with its order history at this shop, and
 * numbers worth a look because their parcels came back. Nothing is blocked
 * by itself, and never by name or city: the shop decides, and every entry
 * says why.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, PackageX, Search, ShieldAlert, ShieldBan, ShoppingBag, Trash2 } from 'lucide-react';
import { apiErrorMessage, onlineOrdersApi } from '../api/online-orders.api';
import { growthApi, type PhoneHistory } from '../api/growth.api';
import { timeAgo, whenText } from '../lib/labels';
import { cn } from '@core/lib/cn';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { Button, Card, controlClass, EmptyState, Input, KpiCard, KpiRow, PageHero, PageShell, Skeleton, Switch } from '@/design-system/components';
import { scanApi } from '../api/order-money.api';
import { t } from '@core/i18n';

export default function BlocklistPage() {
  const qc = useQueryClient();
  const { sales: money } = useMasked();
  const { data, isLoading, error } = useQuery({ queryKey: ['scam-report'], queryFn: growthApi.scamOverview });
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [q, setQ] = useState('');

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['scam-report'] }); qc.invalidateQueries({ queryKey: ['blocklist'] }); qc.invalidateQueries({ queryKey: ['online-orders'] });
  };
  const add = useMutation({
    mutationFn: (b: { phone: string; name?: string; reason?: string }) => onlineOrdersApi.block(b),
    onSuccess: () => { toast.success(t('Number block ho gaya')); setPhone(''); setName(''); setReason(''); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (p: string) => onlineOrdersApi.unblock(p),
    onSuccess: () => { toast.success(t('Unblock ho gaya')); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const term = q.trim().toLowerCase().replace(/\D/g, '') || q.trim().toLowerCase();
  const rows = (data?.entries ?? []).filter((b) => !q.trim() || b.key.includes(term) || (b.name ?? '').toLowerCase().includes(q.trim().toLowerCase()));
  const tot = data?.totals;

  return (
    <PageShell className="max-w-4xl">
      <PageHero back="/online-store" backLabel={t('Online store')} title={t('Report scammer')}
        subtitle={t('Fake ya RTO karne wale numbers. In se aane wale order khud accept nahi hote — \'Blocked\' ke nishan ke saath \'Naye\' me rukte hain.')} />

      <KpiRow cols={4}>
        {!tot ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={ShieldBan} color="#e11d48" label={t('Block kiye')} value={String(tot.blocked)} />
          <KpiCard icon={ShoppingBag} color="#2563eb" label={t('Order se report')} value={String(tot.reportedFromOrders)} />
          <KpiCard icon={AlertTriangle} color="#d97706" label={t('Dekhne layak')} value={String(tot.suggestions)} hint={t('Parcel wapas kiye')} />
          <KpiCard icon={PackageX} color="#c026d3" label={t('Courier nuqsan')} value={money(tot.knownLoss)} hint={t('Block numbers ke RTO par')} />
        </>}
      </KpiRow>

      <RiskRuleCard />

      <Card title={t('Number block karein')} description={t('Order ke "⋯" menu me "Scammer report karein" se wajah aur saboot ke saath bhi report kar sakte hain.')}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input size="sm" label={t('Phone')} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('03xxxxxxxxx')} />
          <Input size="sm" label={t('Naam (optional)')} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          <Input size="sm" label={t('Wajah (optional)')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('Fake order')} maxLength={200} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="critical" disabled={phone.replace(/\D/g, '').length < 10} loading={add.isPending && add.variables?.phone === phone.trim()}
            onClick={() => add.mutate({ phone: phone.trim(), name: name.trim() || undefined, reason: reason.trim() || undefined })} leftIcon={<ShieldBan className="h-4 w-4" />}>{t('Block')}</Button>
        </div>
      </Card>

      {!!data?.suggestions.length && (
        <Card flush title={t('Dekhne layak numbers ({{value}})', { value: data.suggestions.length })}
          description={t('In numbers ke parcel aap ki dukaan se wapas aaye. Khud block nahi hote — dekh kar faisla karein.')}>
          <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
            {data.suggestions.map((s) => (
              <li key={s.key} className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[0.8125rem] font-semibold text-slate-900">{s.phone}{s.name ? <span className="ms-2 font-sans font-normal text-slate-500">{s.name}</span> : null}</div>
                  <History h={{ ...s, open: Math.max(0, s.total - s.delivered - s.returned - s.cancelled) }} money={money} />
                </div>
                <Link to={`/online-orders?search=${s.key}`} className="text-[0.75rem] font-medium text-brand-700 hover:underline">{t('Orders')}</Link>
                <Button size="xs" variant="critical" loading={add.isPending && add.variables?.phone === s.phone}
                  onClick={() => add.mutate({ phone: s.phone, name: s.name ?? undefined, reason: t('{{returned}} parcel wapas, {{delivered}} liye', { returned: s.returned, delivered: s.delivered }) })}
                  leftIcon={<ShieldBan className="h-3.5 w-3.5" />}>{t('Block')}</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card flush title={t('Blocked numbers ({{value}})', { value: data?.entries.length ?? 0 })}>
        <div className="px-4 sm:px-5">
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Number ya naam…')} className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem] ps-8')} />
          </div>
        </div>
        <div className="mt-3 border-t border-slate-100">
          {isLoading ? <div className="p-5"><div className="h-16 animate-pulse rounded-lg bg-slate-100" /></div>
            : error ? <EmptyState title={t('List nahi khuli')} description={apiErrorMessage(error)} />
            : rows.length === 0 ? <EmptyState icon={<ShieldBan className="h-5 w-5" />} title={t('Koi number block nahi')} description={<>{t('Order ke andar "Number block" se bhi block kar sakte hain.')}</>} />
            : (
              <ul className="divide-y divide-slate-100">
                {rows.map((b) => (
                  <li key={b.key} className="flex items-start gap-3 px-4 py-2.5 sm:px-5">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[0.8125rem] font-semibold text-slate-900">{b.phone}{b.name ? <span className="ms-2 font-sans font-normal text-slate-500">{b.name}</span> : null}</div>
                      <div className="text-[0.75rem] text-slate-500">
                        {b.reason ?? t('Wajah nahi likhi')} · {whenText(b.at)}
                        {b.orderNo && <> · <Link to={`/online-orders?search=${encodeURIComponent(b.orderNo)}`} className="font-medium text-brand-700 hover:underline">{t('Order #{{no}}', { no: b.orderNo })}</Link></>}
                      </div>
                      {b.evidence && <p className="mt-0.5 whitespace-pre-wrap text-[0.75rem] text-slate-600">{b.evidence}</p>}
                      <History h={b.history} money={money} />
                    </div>
                    <Button size="xs" variant="ghost" loading={remove.isPending && remove.variables === b.phone} onClick={() => remove.mutate(b.phone)} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>{t('Unblock')}</Button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </Card>
    </PageShell>
  );
}

/** One number's orders at this shop. */
function History({ h, money }: { h: PhoneHistory | (Omit<PhoneHistory, 'last'> & { last: string | null }); money: (n: number) => string }) {
  if (!h.total) return <p className="text-[0.6875rem] text-slate-400">{t('Is number se koi order nahi aaya')}</p>;
  return (
    <p className="mt-0.5 flex flex-wrap gap-x-2 text-[0.6875rem] text-slate-500">
      <span>{t('{{count}} order', { count: h.total })}</span>
      <span className="text-success-700">{t('{{count}} liye', { count: h.delivered })}</span>
      <span className={h.returned ? 'font-semibold text-rose-700' : ''}>{t('{{count}} wapas', { count: h.returned })}</span>
      <span>{t('{{count}} cancel', { count: h.cancelled })}</span>
      {h.loss > 0 && <span className="text-rose-700">{t('Nuqsan {{value}}', { value: money(h.loss) })}</span>}
      {h.last && <span>{t('Aakhri {{ago}}', { ago: timeAgo(h.last) })}</span>}
    </p>
  );
}

/** "Risk HIGH ho to advance maangein": the shop's rule for risky COD orders. */
function RiskRuleCard() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['risk-settings'], queryFn: scanApi.riskSettings });
  const [pct, setPct] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (body: { askAdvance?: boolean; advancePct?: number }) => scanApi.saveRiskSettings(body),
    onSuccess: (r) => { qc.setQueryData(['risk-settings'], r); setPct(null); toast.success(t('Setting save ho gayi')); qc.invalidateQueries({ queryKey: ['online-order'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  if (!data) return null;
  const value = pct ?? String(data.advancePct);
  return (
    <Card title={t('Fake / risky orders')} description={t('Nafaa har order par pichhle RTO, baar baar cancel, shehar jo courier nahi jaata, naye customer ka bahut bara COD aur kuch minute me dobara order dekhta hai.')}>
      <Switch checked={data.askAdvance} disabled={save.isPending} onChange={(e) => save.mutate({ askAdvance: e.target.checked })}
        label={t('Risk HIGH ho to advance maangein')}
        description={t('Aise COD order khud accept nahi honge, aur order par advance maangne ke button aayenge (WhatsApp, payment link, block).')} />
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Input size="sm" type="number" min={5} max={100} label={t('Kitna advance (% order ka)')} value={value} onChange={(e) => setPct(e.target.value)} className="w-44" />
        <Button size="sm" variant="secondary" disabled={pct === null || !(Number(value) >= 5 && Number(value) <= 100)} loading={save.isPending} onClick={() => save.mutate({ advancePct: Number(value) })}>{t('Save')}</Button>
      </div>
    </Card>
  );
}
