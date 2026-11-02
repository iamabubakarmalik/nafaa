/**
 * Sports product detail on the shared page: sport, type and age group;
 * bat, ball or kit specs; team rate and team discount; MRP and warranty.
 */

import type { ReactNode } from 'react';
import { formatPKR } from '@core/lib/format';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { sportsProductsApi, type SportsProductProfile } from '../api/products.api';
import { ageLabel, typeLabel } from '../components/meta';
import { t } from '@core/i18n';

const config: DetailConfig<SportsProductProfile | null> = {
  label: t('Sports'),
  paths: { list: '/sports-products', edit: (id) => `/sports-products/${id}/edit` },
  stockChips: [1, 6, 12, 24, 50],
  extra: { key: 'sports-product-detail-extra', load: (id) => sportsProductsApi.byProduct(id).catch(() => null) },
  badges: ({ extra: p, product }) => {
    if (!p) return null;
    const price = Number(product.price);
    const off = p.mrp && price > 0 && p.mrp > price ? Math.round(((p.mrp - price) / p.mrp) * 100) : 0;
    return (
      <>
        {p.sport && <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[0.75rem] font-medium text-teal-700">{t(p.sport)}</span>}
        {p.categoryType && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[0.75rem] font-medium text-slate-700">{typeLabel(p.categoryType)}</span>}
        {off > 0 && <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[0.75rem] font-bold text-white">{t('Sale {{off}}%', { off })}</span>}
        {p.isTeamOrderable && <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[0.75rem] font-semibold text-brand-700">{t('Team order')}</span>}
        {p.isProfessional && <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[0.75rem] font-semibold text-white">{t('Pro')}</span>}
      </>
    );
  },
  facts: ({ extra: p }) => {
    if (!p) return [];
    const rows: Array<[string, ReactNode]> = [[t('Kis ke liye'), ageLabel(p.ageGroup)]];
    if (p.batWood || p.batWeightGrams || p.batSize) rows.push([t('Bat'), [p.batWood, p.batGrade && `Grade ${p.batGrade}`, p.batSize, p.batWeightGrams && `${p.batWeightGrams} g`, p.handleType].filter(Boolean).join(' · ')]);
    if (p.ballType || p.ballWeight) rows.push([t('Ball'), [p.ballType, p.ballWeight].filter(Boolean).join(' · ')]);
    if (p.size || p.material || p.fit) rows.push([t('Size / material'), [p.size, p.material, p.fit].filter(Boolean).join(' · ')]);
    if (p.weight) rows.push([t('Wazan'), p.weight]);
    rows.push(['MRP', p.mrp ? formatPKR(p.mrp) : '—']);
    rows.push([t('Team rate'), p.teamPrice ? p.minTeamOrder ? t('{{price}} (kam se kam {{min}})', { price: formatPKR(p.teamPrice), min: p.minTeamOrder }) : formatPKR(p.teamPrice) : '—']);
    if (p.bulkDiscountPct) rows.push([t('Team discount'), `${p.bulkDiscountPct}%`]);
    rows.push([t('Warranty'), p.warrantyMonths ? t('{{warrantyMonths}} mahine{{value}}', { warrantyMonths: p.warrantyMonths, value: p.warrantyType ? ` · ${p.warrantyType}` : '' }) : '—']);
    if (p.careInstructions) rows.push([t('Dekh bhaal'), p.careInstructions]);
    return rows;
  },
  tile: ({ extra: p, money }) => (p?.teamPrice ? { label: t('Team rate'), value: money(p.teamPrice), hint: p.minTeamOrder ? t('{{minTeamOrder}}+ piece', { minTeamOrder: p.minTeamOrder }) : t('Team / school ke liye') } : null),
};

export default function SportsProductDetailPage() {
  return <ProductDetailPage config={config} />;
}
