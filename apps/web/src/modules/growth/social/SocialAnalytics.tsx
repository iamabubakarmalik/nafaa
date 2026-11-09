/**
 * Social analytics: posts per platform per week (posted ones), and orders
 * from social sources (tagged links, the website/Shopify source data, the
 * manual order source) by platform and per post.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ExternalLink, Megaphone, Send, ShoppingBag, Wallet } from 'lucide-react';
import { EmptyState, KpiCard, KpiRow, Segmented, Skeleton } from '@/design-system/components';
import { t } from '@core/i18n';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { SOCIAL_PLATFORMS, socialApi, type SocialPlatform } from './social.api';
import { PLATFORM_META, PlatformMark, addDaysKey } from './platforms';

/** Fixed categorical order (validated palette), one colour per platform everywhere on this tab. */
const SERIES: Record<SocialPlatform, string> = {
  FACEBOOK: '#2a78d6', INSTAGRAM: '#eb6834', TIKTOK: '#1baf7a', YOUTUBE: '#eda100', WHATSAPP_STATUS: '#e87ba4',
};

const weekLabel = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

export function SocialAnalytics({ today }: { today: string }) {
  const { sales: money } = useMasked();
  const [weeks, setWeeks] = useState('8');
  const from = addDaysKey(today, -(Number(weeks) * 7 - 1));
  const q = useQuery({ queryKey: ['social', 'analytics', from, today], queryFn: () => socialApi.analytics({ from, to: today }), placeholderData: (p) => p });
  const d = q.data;

  const chart = (d?.weeks ?? []).map((w) => ({ week: weekLabel(w.week), ...w.counts }));
  const used = SOCIAL_PLATFORMS.filter((p) => (d?.totals.postsPerPlatform[p] ?? 0) > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented value={weeks} onChange={setWeeks} items={[{ value: '4', label: t('4 hafte') }, { value: '8', label: t('8 hafte') }, { value: '12', label: t('12 hafte') }]} label={t('Muddat')} />
        <p className="text-[0.75rem] text-slate-500">{t('Order tab ginte hain jab link me nishan ho, ya order ka source Facebook / Instagram / TikTok ho.')}</p>
      </div>

      <KpiRow cols={4}>
        {!d ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Send} color="#2563eb" label={t('Posts ki')} value={String(d.totals.posts)} hint={t('{{count}} hafte', { count: weeks })} />
          <KpiCard icon={ShoppingBag} color="#16a34a" label={t('Social se orders')} value={String(d.totals.socialOrders)} hint={d.totals.allOrders ? `${Math.round((d.totals.socialOrders / d.totals.allOrders) * 100)}% ${t('kul ka')}` : '—'} />
          <KpiCard icon={Wallet} color="#7c3aed" label={t('Social se sale')} value={money(d.totals.socialSales)} />
          <KpiCard icon={Megaphone} color="#db2777" label={t('Post ke link se')} value={String(d.totals.taggedOrders)} hint={t('orders')} />
        </>}
      </KpiRow>

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        <p className="mb-3 text-[0.875rem] font-semibold text-slate-900">{t('Har hafte kitni posts')}</p>
        {q.isLoading ? <Skeleton className="h-64 rounded-xl" /> : !used.length ? (
          <EmptyState icon={<Send className="h-5 w-5" />} title={t('Abhi koi post "Posted" nahi')} description={t('Post karne ke baad "Post ho gayi" dabayein — yahan ginti aayegi.')} />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={11} stroke="#64748b" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} stroke="#64748b" />
                <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                {used.map((p, i) => (
                  <Bar key={p} dataKey={p} name={PLATFORM_META[p].label} stackId="posts" fill={SERIES[p]} stroke="#fff" strokeWidth={2}
                    radius={i === used.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} maxBarSize={36} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <p className="mb-2 text-[0.875rem] font-semibold text-slate-900">{t('Platform se orders')}</p>
          <ul className="divide-y divide-slate-100">
            {SOCIAL_PLATFORMS.map((p) => {
              const b = d?.byPlatform[p];
              return (
                <li key={p} className="flex items-center gap-2.5 py-2">
                  <PlatformMark p={p} size={22} />
                  <span className="flex-1 text-[0.8125rem] font-medium text-slate-800">{PLATFORM_META[p].label}</span>
                  <span className="text-end text-[0.8125rem] tabular-nums">
                    <span className="font-semibold text-slate-900">{b?.orders ?? 0}</span>
                    <span className="block text-[0.6875rem] text-slate-500">{money(b?.sales ?? 0)} · {t('{{count}} delivered', { count: b?.delivered ?? 0 })}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <p className="px-4 pt-4 text-[0.875rem] font-semibold text-slate-900">{t('Har post se orders')}</p>
          {!d?.posts.length ? (
            <EmptyState title={t('Abhi kuch nahi')} description={t('Post me product link lagayein — us link se aane wale orders yahan dikhenge.')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-[0.8125rem]">
                <thead><tr className="border-b border-slate-100 text-start text-[0.6875rem] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2 text-start font-semibold">{t('Post')}</th>
                  <th className="px-2 py-2 text-end font-semibold">{t('Orders')}</th>
                  <th className="px-2 py-2 text-end font-semibold">{t('Delivered')}</th>
                  <th className="px-4 py-2 text-end font-semibold">{t('Sale')}</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {d.posts.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="flex shrink-0 -space-x-1">{p.platforms.map((pl) => <PlatformMark key={pl} p={pl} size={16} />)}</span>
                          <span className="min-w-0 truncate font-medium text-slate-800">{p.title}</span>
                          {Object.values(p.postUrls)[0] && <a href={Object.values(p.postUrls)[0]} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-700" aria-label={t('Post kholein')}><ExternalLink className="h-3.5 w-3.5" /></a>}
                        </div>
                        <span className="text-[0.6875rem] text-slate-500">{p.day}</span>
                      </td>
                      <td className="px-2 py-2 text-end font-semibold tabular-nums">{p.orders}</td>
                      <td className="px-2 py-2 text-end tabular-nums text-slate-600">{p.delivered}</td>
                      <td className="px-4 py-2 text-end tabular-nums">{money(p.sales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
