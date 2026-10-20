/**
 * Sports product detail on the shared page: sport, type and age group;
 * bat, ball or kit specs; team rate and team discount; MRP and warranty.
 */

import type { ReactNode } from 'react';
import { formatPKR } from '@core/lib/format';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { sportsProductsApi, type SportsProductProfile } from '../api/products.api';
import { ageLabel, typeLabel } from '../components/meta';

const config: DetailConfig<SportsProductProfile | null> = {
  label: 'Sports',
  paths: { list: '/sports-products', edit: (id) => `/sports-products/${id}/edit` },
  stockChips: [1, 6, 12, 24, 50],
  extra: { key: 'sports-product-detail-extra', load: (id) => sportsProductsApi.byProduct(id).catch(() => null) },
  badges: ({ extra: p, product }) => {
    if (!p) return null;
    const price = Number(product.price);
    const off = p.mrp && price > 0 && p.mrp > price ? Math.round(((p.mrp - price) / p.mrp) * 100) : 0;
    return (
      <>
        {p.sport && <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[0.75rem] font-medium text-teal-700">{p.sport}</span>}
        {p.categoryType && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[0.75rem] font-medium text-slate-700">{typeLabel(p.categoryType)}</span>}
        {off > 0 && <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[0.75rem] font-bold text-white">Sale {off}%</span>}
        {p.isTeamOrderable && <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[0.75rem] font-semibold text-brand-700">Team order</span>}
        {p.isProfessional && <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[0.75rem] font-semibold text-white">Pro</span>}
      </>
    );
  },
  facts: ({ extra: p }) => {
    if (!p) return [];
    const rows: Array<[string, ReactNode]> = [['Kis ke liye', ageLabel(p.ageGroup)]];
    if (p.batWood || p.batWeightGrams || p.batSize) rows.push(['Bat', [p.batWood, p.batGrade && `Grade ${p.batGrade}`, p.batSize, p.batWeightGrams && `${p.batWeightGrams} g`, p.handleType].filter(Boolean).join(' · ')]);
    if (p.ballType || p.ballWeight) rows.push(['Ball', [p.ballType, p.ballWeight].filter(Boolean).join(' · ')]);
    if (p.size || p.material || p.fit) rows.push(['Size / material', [p.size, p.material, p.fit].filter(Boolean).join(' · ')]);
    if (p.weight) rows.push(['Wazan', p.weight]);
    rows.push(['MRP', p.mrp ? formatPKR(p.mrp) : '—']);
    rows.push(['Team rate', p.teamPrice ? `${formatPKR(p.teamPrice)}${p.minTeamOrder ? ` (kam se kam ${p.minTeamOrder})` : ''}` : '—']);
    if (p.bulkDiscountPct) rows.push(['Team discount', `${p.bulkDiscountPct}%`]);
    rows.push(['Warranty', p.warrantyMonths ? `${p.warrantyMonths} mahine${p.warrantyType ? ` · ${p.warrantyType}` : ''}` : '—']);
    if (p.careInstructions) rows.push(['Dekh bhaal', p.careInstructions]);
    return rows;
  },
  tile: ({ extra: p, money }) => (p?.teamPrice ? { label: 'Team rate', value: money(p.teamPrice), hint: p.minTeamOrder ? `${p.minTeamOrder}+ piece` : 'Team / school ke liye' } : null),
};

export default function SportsProductDetailPage() {
  return <ProductDetailPage config={config} />;
}
