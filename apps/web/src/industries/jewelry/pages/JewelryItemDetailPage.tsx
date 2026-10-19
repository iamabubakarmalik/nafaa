/**
 * Jewelry piece on the shared product detail page: karat, weights and
 * hallmark as facts, today's price at the current rate (with the gap to the
 * saved price), and a price tab with the full breakdown and buy-back value.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Award, Scale, TrendingUp } from 'lucide-react';
import { Card } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { jewelryProductsApi, type JewelryProductProfile } from '../api/products.api';
import { KaratPill } from '../components/ui';
import { useMetalRates } from '../hooks/useJewelryFacts';
import { categoryLabel, grams, profilePrice, purityLabel, rateFor, tola } from '../lib/meta';

type Extra = JewelryProductProfile | null;

function TodayPrice({ j, saved }: { j: JewelryProductProfile; saved: number }) {
  const { rates, isLoading } = useMetalRates();
  const p = profilePrice(j, rates);
  const rate = rateFor(rates, j.metalType, j.purity);
  if (isLoading) return null;
  if (!p || !rate) {
    return (
      <Card className="rounded-2xl" title="Aaj ki qeemat">
        <p className="text-[0.875rem] text-slate-600">{purityLabel(j.purity)} ka aaj ka rate set nahi. <Link to="/jewelry/metal-rates" className="font-semibold text-brand-700 hover:underline">Rate likhein</Link></p>
      </Card>
    );
  }
  const buyBack = j.isBuyBackEligible ? Math.round(p.metal * (j.buyBackPct / 100)) : null;
  const rows: Array<[string, number]> = [['Sona / chandi', p.metal], ['Banwai', p.making], ['Kaat (wastage)', p.wastage], ['Nag', p.stones], ['Polish, hallmark, doosre', p.other]];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-2xl" title="Aaj ki qeemat" description={`${purityLabel(j.purity)} @ ${formatPKR(rate.ratePerGram)}/g · ${grams(j.netWeight)}`}>
        <dl className="space-y-1.5 text-[0.875rem]">
          {rows.filter(([, v]) => v > 0).map(([l, v]) => (
            <div key={l} className="flex justify-between gap-3"><dt className="text-slate-500">{l}</dt><dd className="font-medium tabular-nums">{formatPKR(v)}</dd></div>
          ))}
          <div className="flex justify-between gap-3 border-t border-slate-100 pt-2"><dt className="font-semibold">Kul</dt><dd className="text-[1.0625rem] font-bold tabular-nums">{formatPKR(p.total)}</dd></div>
        </dl>
        {Math.abs(p.total - saved) >= 1 && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
            Save ki hui price {formatPKR(saved)} hai — POS par aaj ke rate wali {formatPKR(p.total)} lagegi.
          </p>
        )}
      </Card>
      <Card className="rounded-2xl" title="Wapsi aur buy-back">
        <dl className="space-y-1.5 text-[0.875rem]">
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Buy-back</dt><dd className="font-medium">{j.isBuyBackEligible ? `${j.buyBackPct}% — aaj ${formatPKR(buyBack ?? 0)}` : 'Nahi'}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Wapsi</dt><dd className="font-medium">{j.isReturnable ? `${j.returnDays} din me` : 'Nahi'}</dd></div>
        </dl>
      </Card>
    </div>
  );
}

const config: DetailConfig<Extra> = {
  label: 'Jewelry',
  paths: { list: '/jewelry/products', edit: (id) => `/jewelry-items/${id}/edit` },
  stockChips: [1, 2, 5],
  extra: { key: 'jewelry-product-detail', load: (id) => jewelryProductsApi.byProduct(id).catch(() => null) },
  badges: ({ extra: j }) => (j ? (
    <>
      <KaratPill purity={j.purity} />
      {j.hallmarkNumber && <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[0.75rem] font-semibold text-emerald-700"><Award className="h-3 w-3" />Hallmark</span>}
      {j.isBridalCollection && <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[0.75rem] font-semibold text-rose-700">Bridal</span>}
    </>
  ) : null),
  facts: ({ extra: j }) => {
    if (!j) return [];
    const rows: Array<[string, ReactNode]> = [
      ['Type', categoryLabel(j.category)], ['Karat', purityLabel(j.purity)],
      ['Kul wazan', `${grams(j.grossWeight)} (${tola(j.grossWeight)})`], ['Nag ka wazan', j.stoneWeight ? grams(j.stoneWeight) : undefined],
      ['Asal wazan', `${grams(j.netWeight)} (${tola(j.netWeight)})`],
      ['Banwai', [j.makingChargePerGram ? `${formatPKR(j.makingChargePerGram)}/g` : '', j.makingChargeFixed ? formatPKR(j.makingChargeFixed) : '', j.makingChargePct ? `${j.makingChargePct}%` : ''].filter(Boolean).join(' + ') || undefined],
      ['Kaat', [j.wastagePct ? `${j.wastagePct}%` : '', j.wastageGrams ? grams(j.wastageGrams) : ''].filter(Boolean).join(' + ') || undefined],
      ['Size', j.size], ['Design number', j.designNumber], ['Hallmark', j.hallmarkNumber], ['Certificate', j.certificateNumber], ['Karigar', j.karigarName],
    ];
    return rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  },
  tile: ({ extra: j }) => (j ? { label: 'Asal wazan', value: grams(j.netWeight), hint: tola(j.netWeight) } : null),
  tabs: [
    {
      id: 'price', label: 'Aaj ki qeemat', icon: TrendingUp, when: ({ extra }) => !!extra,
      render: ({ extra, product }) => <TodayPrice j={extra!} saved={Number(product.price) || 0} />,
    },
  ],
  guide: [
    { icon: Scale, color: '#d97706', title: 'Aaj ki qeemat', text: '"Aaj ki qeemat" tab me rate, banwai, kaat aur nag ka poora hisaab — POS par yehi lagta hai.' },
  ],
};

export default function JewelryItemDetailPage() {
  return <ProductDetailPage config={config} />;
}
