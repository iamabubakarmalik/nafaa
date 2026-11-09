/**
 * Campaigns and traffic sources: spend against delivered orders, with the
 * advice cards (move budget away from ROAS under 1, ad fatigue) and the
 * codes / utm values that came in on orders but belong to no campaign yet.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Flame, Link2, Pencil, Plus, Tag, TrendingDown } from 'lucide-react';
import { Button, Skeleton } from '@/design-system/components';
import { BrandLogo, type BrandName } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { t as tr } from '@core/i18n';
import { MARKETING_KEY, marketingApi, type CampaignRow, type MarketingReport, type Numbers, type TrafficSource } from '../api/marketing.api';
import { PLATFORM, roasText, rs } from '../ads/meta';
import { CampaignForm, type CampaignDraft } from './CampaignForm';

export const SOURCE: Record<TrafficSource, { label: string; brand: BrandName }> = {
  META: { label: tr('Facebook / Instagram'), brand: 'meta' },
  GOOGLE: { label: tr('Google'), brand: 'google' },
  TIKTOK: { label: tr('TikTok'), brand: 'tiktok' },
  SNAPCHAT: { label: tr('Snapchat'), brand: 'other' },
  INFLUENCER: { label: tr('Influencer'), brand: 'other' },
  WHATSAPP: { label: tr('WhatsApp'), brand: 'whatsapp' },
  EMAIL: { label: tr('Email'), brand: 'other' },
  PHONE: { label: tr('Phone call'), brand: 'other' },
  REFERRAL: { label: tr('Doosri website'), brand: 'website' },
  ORGANIC: { label: tr('Search (bina ad)'), brand: 'other' },
  DIRECT: { label: tr('Seedha website par'), brand: 'website' },
  OTHER: { label: tr('Doosra'), brand: 'other' },
  MARKETPLACE: { label: tr('Daraz / Foodpanda'), brand: 'daraz' },
  UNKNOWN: { label: tr('Pata nahi'), brand: 'other' },
};

const roasCls = (v: number | null) => (v == null ? 'text-slate-400' : v >= 3 ? 'text-success-700' : v >= 1 ? 'text-amber-700' : 'text-rose-600');

type Show = { sales: (n: number | null | undefined) => string; profit: (n: number | null | undefined) => string };

export function CampaignsView({ report, canWrite, show }: { report: MarketingReport | undefined; canWrite: boolean; show: Show }) {
  const [form, setForm] = useState<{ id: string | null; draft?: CampaignDraft } | null>(null);
  const savedQ = useQuery({ queryKey: [MARKETING_KEY, 'campaigns'], queryFn: marketingApi.campaigns, staleTime: 30_000 });
  const saved = savedQ.data?.items ?? [];
  if (!report) return <Skeleton className="h-80 rounded-3xl" />;
  const open = (row: CampaignRow) => setForm(row.id ? { id: row.id } : { id: null, draft: { platform: row.platform, name: row.name ?? '' } });

  return (
    <div className="space-y-4">
      <Advice report={report} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.8125rem] text-slate-600">
          {report.totals.attributedPct != null
            ? tr('{{pct}}% orders ka source maloom hai. Har campaign ke orders discount code ya link ke utm_campaign se gine jate hain.', { pct: report.totals.attributedPct })
            : tr('Is period me koi online order nahi.')}
        </p>
        {canWrite && <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setForm({ id: null })}>{tr('Nayi campaign')}</Button>}
      </div>

      <NumbersTable
        rows={report.campaigns.map((c) => ({
          key: c.key,
          label: c.name ?? tr('Bina campaign ka kharcha'),
          brand: PLATFORM[c.platform]?.brand ?? 'other',
          sub: [PLATFORM[c.platform]?.short, c.discountCodes.length ? c.discountCodes.join(', ') : null, c.utmCampaign ? `utm: ${c.utmCampaign}` : null,
            c.adSets.length ? tr('{{count}} ad sets', { count: c.adSets.length }) : null, c.status !== 'ACTIVE' ? (c.status === 'PAUSED' ? tr('Ruki hui') : tr('Khatam')) : null].filter(Boolean).join(' · '),
          flag: c.fatigue ? 'fatigue' : null,
          action: canWrite && c.name ? () => open(c) : undefined,
          n: c,
        }))}
        seesProfit={report.seesProfit} show={show}
        empty={tr('Ads ka kharcha likhein ya campaign banayein — phir yahan har campaign ka asli nateeja aayega.')}
      />

      {(report.unmatched.codes.length > 0 || report.unmatched.utmCampaigns.length > 0) && (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <p className="flex items-center gap-2 font-semibold text-slate-900"><Link2 className="h-4 w-4 text-brand-600" /> {tr('Ye orders kisi campaign se nahi jude')}</p>
          <p className="mt-0.5 text-[0.8125rem] text-slate-600">{tr('In codes ya links se orders aaye. Campaign se jorein to nateeja sahi jagah dikhega.')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {report.unmatched.codes.map((c) => (
              <button key={`c-${c.code}`} type="button" disabled={!canWrite} onClick={() => setForm({ id: null, draft: { discountCodes: [c.code], name: c.code } })}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[0.75rem] font-medium text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100">
                <Tag className="h-3.5 w-3.5" /> {c.code} · {tr('{{orders}} orders', { orders: c.orders })}
              </button>
            ))}
            {report.unmatched.utmCampaigns.map((u) => (
              <button key={`u-${u.value}`} type="button" disabled={!canWrite} onClick={() => setForm({ id: null, draft: { utmCampaign: u.value, name: u.value } })}
                className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-[0.75rem] font-medium text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100">
                <Link2 className="h-3.5 w-3.5" /> {u.value} · {tr('{{orders}} orders', { orders: u.orders })}
              </button>
            ))}
          </div>
        </div>
      )}

      {form && <CampaignForm campaign={form.id ? saved.find((s) => s.id === form.id) ?? null : null} draft={form.draft} onClose={() => setForm(null)} />}
    </div>
  );
}

function Advice({ report }: { report: MarketingReport }) {
  if (!report.suggestions.length && !report.fatigued.length) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {report.suggestions.map((s) => (
        <div key={`s-${s.from.key}`} className="flex gap-3 rounded-2xl bg-rose-50/70 p-4 ring-1 ring-rose-200">
          <TrendingDown className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div className="min-w-0 text-[0.8125rem]">
            <p className="font-semibold text-slate-900">{tr('"{{name}}" ka ROAS {{roas}} hai — kharcha zyada, wapsi kam', { name: s.from.name, roas: roasText(s.from.roas) })}</p>
            <p className="mt-0.5 text-slate-700">
              {s.to
                ? tr('Roz ke takreeban {{amount}} "{{to}}" ({{roas}}) par lagayein.', { amount: rs(s.dailyAmount), to: s.to.name, roas: roasText(s.to.roas) })
                : tr('Roz ke takreeban {{amount}} kam karein ya campaign rokein, aur naya ad try karein.', { amount: rs(s.dailyAmount) })}
            </p>
            {s.to && <p className="mt-1 inline-flex items-center gap-1 text-[0.75rem] text-slate-500">{s.from.name} <ArrowRight className="h-3 w-3" /> {s.to.name}</p>}
          </div>
        </div>
      ))}
      {report.fatigued.map((f) => (
        <div key={`f-${f.key}`} className="flex gap-3 rounded-2xl bg-amber-50/70 p-4 ring-1 ring-amber-200">
          <Flame className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="min-w-0 text-[0.8125rem]">
            <p className="font-semibold text-slate-900">{tr('"{{name}}" thak raha hai', { name: f.name ?? PLATFORM[f.platform]?.label })}</p>
            <p className="mt-0.5 text-slate-700">{tr('Har order ka kharcha 3 din se barh raha hai: {{from}} se {{to}}. Naya picture/video ya naya audience try karein.', { from: rs(f.from), to: rs(f.to) })}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SourcesView({ report, show }: { report: MarketingReport | undefined; show: Show }) {
  if (!report) return <Skeleton className="h-80 rounded-3xl" />;
  return (
    <div className="space-y-2">
      <NumbersTable
        rows={report.sources.map((s) => ({ key: s.source, label: SOURCE[s.source]?.label ?? s.source, brand: SOURCE[s.source]?.brand ?? 'other', n: s }))}
        seesProfit={report.seesProfit} show={show}
        empty={tr('Is period me koi online order nahi.')}
      />
      <p className="px-1 text-[0.75rem] text-slate-500">
        {tr('Source order ke saath aata hai: Shopify ka landing page aur referrer, WooCommerce ka order attribution, website ke utm, ya Add order me chuna gaya source.')}
      </p>
    </div>
  );
}

type TableRow = { key: string; label: string; brand: BrandName; sub?: string; flag?: 'fatigue' | null; action?: () => void; n: Numbers };

function NumbersTable({ rows, seesProfit, show, empty }: { rows: TableRow[]; seesProfit: boolean; show: Show; empty: string }) {
  if (!rows.length) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <AlertTriangle className="mx-auto h-9 w-9 text-slate-300" />
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-600">{empty}</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-[0.8125rem]">
          <thead className="bg-slate-50 text-start text-[0.75rem] text-slate-500">
            <tr>
              <th className="px-4 py-2.5 text-start font-medium">{tr('Naam')}</th>
              <th className="px-2 py-2.5 text-end font-medium">{tr('Ads kharcha')}</th>
              <th className="px-2 py-2.5 text-end font-medium" title={tr('Aaye / delivered / wapas / raste me')}>{tr('Orders')}</th>
              <th className="px-2 py-2.5 text-end font-medium">{tr('Delivered sale')}</th>
              <th className="px-2 py-2.5 text-end font-medium">{tr('ROAS')}</th>
              <th className="px-2 py-2.5 text-end font-medium">{tr('Kharcha / order')}</th>
              <th className="px-2 py-2.5 text-end font-medium" title={tr('Naye customer laane ka kharcha')}>{tr('CAC')}</th>
              {seesProfit && <th className="px-4 py-2.5 text-end font-medium">{tr('Ads ke baad Profit')}</th>}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ key, label, brand, sub, flag, action, n }) => (
              <tr key={key}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <BrandLogo name={brand} size={22} />
                    <div className="min-w-0">
                      <p className="flex max-w-[16rem] items-center gap-1.5 truncate font-medium text-slate-900">
                        {label}
                        {flag === 'fatigue' && <Flame className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label={tr('Thak raha hai')} />}
                      </p>
                      {sub && <p className="max-w-[18rem] truncate text-[0.6875rem] text-slate-500">{sub}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-end tabular-nums text-slate-800">{n.spend ? rs(n.spend) : '—'}</td>
                <td className="px-2 py-2.5 text-end tabular-nums text-slate-700">
                  {n.placed ? <>
                    <span className="font-semibold text-slate-900">{n.delivered}</span>
                    <span className="text-slate-400"> / {n.placed}</span>
                    {(n.returned > 0 || n.open > 0) && (
                      <span className="block text-[0.6875rem] text-slate-500">
                        {[n.returned ? tr('{{count}} RTO', { count: n.returned }) : null, n.open ? tr('{{count}} raste me', { count: n.open }) : null].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </> : '—'}
                </td>
                <td className="px-2 py-2.5 text-end tabular-nums text-slate-800">{n.deliveredSales ? show.sales(n.deliveredSales) : '—'}</td>
                <td className={cn('px-2 py-2.5 text-end font-semibold tabular-nums', roasCls(n.roas))}>{roasText(n.roas)}</td>
                <td className="px-2 py-2.5 text-end tabular-nums text-slate-600">{n.costPerOrder != null ? rs(n.costPerOrder) : '—'}</td>
                <td className="px-2 py-2.5 text-end tabular-nums text-slate-600">{n.cac != null ? rs(n.cac) : '—'}</td>
                {seesProfit && <td className={cn('px-4 py-2.5 text-end font-semibold tabular-nums', (n.profitAfterAds ?? 0) >= 0 ? 'text-success-700' : 'text-rose-600')}>{show.profit(n.profitAfterAds)}</td>}
                <td className="pe-3">
                  {action && <button type="button" onClick={action} aria-label={tr('Badlein')} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-slate-100 px-4 py-2 text-[0.6875rem] text-slate-500">
        {tr('Orders: delivered / kul aaye. ROAS, kharcha per order aur CAC sirf delivered orders par. Profit = delivered orders ka Profit (Cost, courier, COD, RTO ke baad) − Ads.')}
      </p>
    </div>
  );
}
