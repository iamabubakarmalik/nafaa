/** Florist item on the shared product detail page: flower facts, freshness tile and a wilting alert. */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { floristProductsApi, type FloristProductProfile } from '../api/products.api';
import { categoryLabel, daysFromToday, shortDate } from '../lib/meta';

const config: DetailConfig<FloristProductProfile | null> = {
  label: 'Florist',
  paths: { list: '/products', edit: (id) => `/florist-products/${id}/edit` },
  stockChips: [10, 25, 50, 100],
  extra: { key: 'florist-product-detail', load: (id) => floristProductsApi.byProduct(id).catch(() => null) },
  badges: ({ extra: p }) => (p?.categoryType
    ? <span className="rounded-md bg-pink-50 px-2 py-0.5 text-[0.75rem] font-semibold text-pink-800 ring-1 ring-pink-200">{categoryLabel(p.categoryType)}</span>
    : null),
  facts: ({ extra: p, money }) => {
    if (!p) return [];
    const rows: Array<[string, ReactNode]> = [
      ['Phool', p.flowerType], ['Rang', p.color], ['Dandi', p.stemLengthCm ? `${p.stemLengthCm} cm` : undefined],
      ['Kitne phool', p.stemCount ? String(p.stemCount) : undefined], ['Size', p.bouquetSize], ['Wrapping', p.wrapType],
      ['Fresh rehta hai', p.daysToWither ? `${p.daysToWither} din` : undefined], ['Maal aaya', p.arrivalDate ? shortDate(p.arrivalDate) : undefined],
      ['Kahan se', p.isImported ? p.origin || 'Imported' : undefined], ['Mauqa', p.occasions?.length ? p.occasions.join(', ') : undefined],
      ['Shaadi rate', p.weddingPrice ? money(p.weddingPrice) : undefined], ['Dekh bhaal', p.careInstructions],
    ];
    return rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  },
  tile: ({ extra: p }) => {
    const left = daysFromToday(p?.freshUntil);
    if (left === null) return null;
    return { label: 'Fresh tak', value: left < 0 ? 'Murjha gaya' : left === 0 ? 'Aaj' : `${left} din`, hint: p?.freshUntil ? shortDate(p.freshUntil) : undefined };
  },
  alerts: ({ extra: p, stock }) => {
    const left = daysFromToday(p?.freshUntil);
    if (left === null || left > 1 || stock <= 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">
        <Leaf className="h-4 w-4" />
        <span className="text-[0.875rem] font-medium">{left < 0 ? 'Ye phool murjha chuke hain' : 'Ye phool aaj kal me murjha jayenge'} — bechein, sasta karein ya wastage likhein</span>
        <Link to="/florist/freshness" className="ml-auto text-[0.8125rem] font-semibold hover:underline">Freshness →</Link>
      </div>
    );
  },
  guide: [
    { icon: Leaf, color: '#16a34a', title: 'Taazgi', text: 'Fresh tak ki date "maal kab aaya" aur "kitne din fresh" se banti hai. Naya maal aaye to Freshness page par update karein.' },
  ],
};

export default function FloristProductDetailPage() {
  return <ProductDetailPage config={config} />;
}
