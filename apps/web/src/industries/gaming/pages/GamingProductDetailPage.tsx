/** Gaming item on the shared product detail page: platform, condition, game and hardware facts, rental rates. */

import type { ReactNode } from 'react';
import { PackageOpen } from 'lucide-react';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { gamingProductsApi, type GamingProductProfile } from '../api/products.api';
import { CONDITIONS, PLATFORMS, categoryLabel, shortDate } from '../lib/meta';

const config: DetailConfig<GamingProductProfile | null> = {
  label: 'Gaming',
  paths: { list: '/products', edit: (id) => `/gaming-products/${id}/edit` },
  stockChips: [1, 2, 5, 10],
  extra: { key: 'gaming-product-detail', load: (id) => gamingProductsApi.byProduct(id).catch(() => null) },
  badges: ({ extra: p }) => {
    if (!p) return null;
    const c = CONDITIONS[p.conditionType];
    return (
      <>
        <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[0.75rem] font-semibold text-violet-800 ring-1 ring-violet-200">{PLATFORMS[p.platform] ?? p.platform}</span>
        {c && <span className={`rounded-md px-2 py-0.5 text-[0.75rem] font-semibold ring-1 ${c.tone}`}>{c.label}</span>}
        {p.isPreOrder && <span className="rounded-md bg-violet-600 px-2 py-0.5 text-[0.75rem] font-semibold text-white">Pre-order</span>}
      </>
    );
  },
  facts: ({ extra: p, money }) => {
    if (!p) return [];
    const rows: Array<[string, ReactNode]> = [
      ['Kya hai', p.categoryType ? categoryLabel(p.categoryType) : undefined],
      ['Company', p.publisher], ['Genre', p.genre?.length ? p.genre.join(', ') : undefined], ['Region', p.region], ['Umar', p.ageRating],
      ['Player', p.playerCount], ['Online', p.onlineMultiplayer ? 'Haan' : undefined],
      ['Storage', p.storageCapacity], ['Controller', p.numberOfControllers ? String(p.numberOfControllers) : undefined],
      ['Dabbe me', p.includedAccessories?.length ? p.includedAccessories.join(', ') : undefined], ['PC', p.gpuModel],
      ['MRP', p.mrp ? money(p.mrp) : undefined], ['Trade-in rate', p.tradeInValue ? money(p.tradeInValue) : undefined],
      ['Kab aayega', p.isPreOrder && p.preOrderReleaseDate ? shortDate(p.preOrderReleaseDate) : undefined],
    ];
    return rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  },
  tile: ({ extra: p, money }) => (p?.isRentable ? {
    label: 'Kiraya', value: p.rentalPricePerDay ? `${money(p.rentalPricePerDay)}/din` : p.rentalPricePerHour ? `${money(p.rentalPricePerHour)}/ghanta` : '—',
    hint: p.rentalDeposit ? `Deposit ${money(p.rentalDeposit)}` : undefined,
  } : null),
  guide: [
    { icon: PackageOpen, color: '#0891b2', title: 'Kiraya', text: 'Kiraye wali cheez ka rate aur deposit Rentals page par khud aata hai. Badalna ho to Edit → Rental.' },
  ],
};

export default function GamingProductDetailPage() {
  return <ProductDetailPage config={config} />;
}
