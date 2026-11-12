/**
 * Website analytics: visitors, orders and sale by day; the path from visit
 * to order (product view → cart → checkout → order) so the shop sees where
 * people stop; where visitors come from; phone vs computer; best products
 * and what people search for. Orders and sale come from the store's own
 * Online orders, so they match the order board.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Eye, GraduationCap, MousePointerClick, Search, ShoppingBag, ShoppingCart, Smartphone, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { Card, EmptyState, PageShell, Segmented, Skeleton, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { t } from '@core/i18n';
import { cn } from '@core/lib/cn';
import { storesApi, type AnalyticsTotals } from '../api/stores.api';
import { StoreGate, WebsiteHero, type StoreCtx } from '../components/StoreGate';
import { SK } from '../lib/hooks';
import { pct, rs } from '../lib/format';

export default function WebsiteAnalyticsPage() {
  return (
    <PageShell>
      <StoreGate title={t('Website analytics')}>{(ctx) => <Analytics ctx={ctx} />}</StoreGate>
    </PageShell>
  );
}

const STEP_LABEL: Record<string, string> = {
  visitors: t('Aaye'), product_views: t('Product dekha'), add_to_cart: t('Cart me dala'), checkout: t('Checkout shuru'), orders: t('Order kiya'),
};
const SOURCE_LABEL: Record<string, string> = { direct: t('Seedha'), google: 'Google', facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', whatsapp: 'WhatsApp', other: t('Doosre') };

function change(cur: number, prev: number) {
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
}

function Analytics({ ctx }: { ctx: StoreCtx }) {
  const id = ctx.store.id;
  const guide = usePageGuide();
  const [days, setDays] = useState<'7' | '30' | '90'>('30');
  const q = useQuery({ queryKey: SK.analytics(id, Number(days)), queryFn: () => storesApi.analytics(id, Number(days) as 7 | 30 | 90) });
  const a = q.data;
  const stat = (k: keyof AnalyticsTotals, fmt: (n: number) => string = (n) => n.toLocaleString()) => {
    const c = a ? change(a.totals[k], a.previous[k]) : null;
    return {
      value: a ? fmt(a.totals[k]) : '—',
      hint: c == null ? undefined : <span className={cn('inline-flex items-center gap-0.5', c >= 0 ? 'text-emerald-300' : 'text-rose-300')}>{c >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{Math.abs(c).toFixed(0)}%</span>,
    };
  };
  const top = a?.funnel[0]?.count || 0;
  const devTotal = (a?.devices ?? []).reduce((n, d) => n + d.visitors, 0);
  const empty = a && a.totals.visitors === 0 && a.totals.orders === 0;

  return (
    <>
      <WebsiteHero ctx={ctx} title={t('Website analytics')} loading={q.isLoading}
        meta={t('Kitne log aaye, kya dekha, kahan ruke aur kitne ne order kiya.')}
        actions={<>
          <Segmented value={days} onChange={setDays} label={t('Kitne din')} items={[{ value: '7', label: t('7 din') }, { value: '30', label: t('30 din') }, { value: '90', label: t('90 din') }]} />
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: t('Visitors'), ...stat('visitors') },
          { label: t('Orders'), ...stat('orders') },
          { label: t('Sale'), ...stat('revenue', rs) },
          { label: t('Conversion'), ...stat('conversion', (n) => pct(n)) },
        ]} />

      {q.isLoading ? <Skeleton className="h-96 rounded-2xl" /> : empty ? (
        <Card><EmptyState icon={<BarChart3 className="h-6 w-6" />} title={t('Abhi koi visitor nahi')} description={t('Website ka link WhatsApp status, Instagram bio aur Facebook page par lagayein. Yahan foran ginti shuru hogi.')} /></Card>
      ) : a && (
        <>
          <Card title={t('Har din')}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={a.daily} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0} /></linearGradient>
                    <linearGradient id="wo" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16a34a" stopOpacity={0.25} /><stop offset="100%" stopColor="#16a34a" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip labelFormatter={(d) => new Date(String(d)).toLocaleDateString(undefined, { dateStyle: 'medium' })} formatter={(v, n) => [Number(v).toLocaleString(), n === 'visitors' ? t('Visitors') : t('Orders')]} />
                  <Area type="monotone" dataKey="visitors" stroke="#2563eb" strokeWidth={2} fill="url(#wv)" />
                  <Area type="monotone" dataKey="orders" stroke="#16a34a" strokeWidth={2} fill="url(#wo)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card title={t('Visit se order tak')} description={t('Har qadam par kitne log aage gaye')}>
              <ol className="space-y-2.5">
                {a.funnel.map((f, i) => {
                  const w = top ? Math.max(3, (f.count / top) * 100) : 0;
                  const prev = i > 0 ? a.funnel[i - 1].count : 0;
                  return (
                    <li key={f.step}>
                      <div className="mb-1 flex items-center justify-between text-[0.8125rem]">
                        <span className="font-medium text-slate-700">{STEP_LABEL[f.step] ?? f.step}</span>
                        <span className="tabular-nums text-slate-900">{f.count.toLocaleString()}{i > 0 && prev ? <span className="ms-2 text-[0.75rem] text-slate-500">{pct((f.count / prev) * 100, 0)}</span> : null}</span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${w}%`, opacity: 1 - i * 0.12 }} /></div>
                    </li>
                  );
                })}
              </ol>
            </Card>

            <Card title={t('Log kahan se aaye')}>
              {!a.sources.length ? <p className="text-[0.8125rem] text-slate-500">{t('Abhi data nahi')}</p> : (
                <table className="w-full text-[0.8125rem]">
                  <thead className="text-[0.6875rem] uppercase tracking-wider text-slate-500"><tr><th className="py-1.5 text-start">{t('Jagah')}</th><th className="py-1.5 text-end">{t('Visitors')}</th><th className="py-1.5 text-end">{t('Orders')}</th><th className="py-1.5 text-end">{t('Sale')}</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {a.sources.map((s) => (
                      <tr key={s.source}><td className="py-1.5 font-medium text-slate-800">{SOURCE_LABEL[s.source.toLowerCase()] ?? s.source}</td><td className="py-1.5 text-end tabular-nums">{s.visitors.toLocaleString()}</td><td className="py-1.5 text-end tabular-nums">{s.orders}</td><td className="py-1.5 text-end tabular-nums">{rs(s.revenue)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
              {devTotal > 0 && (
                <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-[0.8125rem] text-slate-600">
                  <Smartphone className="h-4 w-4 text-slate-400" />
                  {a.devices.map((d) => <span key={d.device} className="rounded-full bg-slate-100 px-2 py-0.5">{d.device === 'mobile' ? t('Mobile') : d.device === 'desktop' ? t('Computer') : t('Tablet')} {pct((d.visitors / devTotal) * 100, 0)}</span>)}
                </div>
              )}
            </Card>

            <Card title={t('Sab se zyada dekhe gaye products')}>
              {!a.topProducts.length ? <p className="text-[0.8125rem] text-slate-500">{t('Abhi data nahi')}</p> : (
                <ul className="divide-y divide-slate-100">
                  {a.topProducts.map((p) => (
                    <li key={p.productId} className="flex items-center gap-3 py-2">
                      {p.image ? <img src={p.image} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span className="h-9 w-9 rounded-lg bg-slate-100" />}
                      <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-slate-800">{p.name}</span>
                      <span className="flex items-center gap-3 text-[0.75rem] tabular-nums text-slate-500">
                        <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{p.views}</span>
                        <span className="inline-flex items-center gap-1"><ShoppingCart className="h-3.5 w-3.5" />{p.addToCart}</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800"><ShoppingBag className="h-3.5 w-3.5" />{p.orders}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title={t('Log kya dhoond rahe hain')}>
              {!a.searches.length ? <p className="text-[0.8125rem] text-slate-500">{t('Abhi kisi ne search nahi kiya')}</p> : (
                <div className="flex flex-wrap gap-1.5">
                  {a.searches.map((s) => <span key={s.query} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[0.8125rem] text-slate-700"><Search className="h-3 w-3" />{s.query}<span className="text-slate-400">{s.count}</span></span>)}
                </div>
              )}
              <p className="mt-3 text-[0.75rem] text-slate-500">{t('Jo cheez log dhoondte hain magar aap ke paas nahi, wo naya maal hai.')}</p>
            </Card>
          </div>
        </>
      )}

      {guide.isOpen && (
        <PageGuide title={t('Website analytics — aasaan tareeqa')} onClose={guide.close}
          flow={[
            { label: t('Aaye'), hint: t('Visitors'), icon: Users, color: '#2563eb' },
            { label: t('Dekha'), hint: t('Product page'), icon: Eye, color: '#7c3aed' },
            { label: t('Cart'), hint: t('Cart me dala'), icon: ShoppingCart, color: '#ea580c' },
            { label: t('Order'), hint: t('Board par'), icon: MousePointerClick, color: '#16a34a' },
          ]}
          steps={[
            { icon: ShoppingCart, color: '#ea580c', title: t('Cart ke baad ruk gaye?'), text: t('Delivery charge zyada ya COD band ho sakta hai. Abandoned carts se WhatsApp karein.') },
            { icon: TrendingUp, color: '#16a34a', title: t('Conversion'), text: t('100 me se kitne logon ne order kiya. Pakistan me 1–3% achha hai.') },
          ]} />
      )}
    </>
  );
}
