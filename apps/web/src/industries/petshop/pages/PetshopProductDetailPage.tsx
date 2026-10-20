/** Pet shop item on the shared product detail page: animal, brand, medicine facts and an expiry alert. */

import type { ReactNode } from 'react';
import { CalendarX } from 'lucide-react';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { petProductsApi, type PetProductProfile } from '../api/products.api';
import { LIFE_STAGE, categoryLabel, daysFromToday, shortDate, speciesLabel } from '../lib/meta';

const config: DetailConfig<PetProductProfile | null> = {
  label: 'Pet shop',
  paths: { list: '/products', edit: (id) => `/petshop-products/${id}/edit` },
  stockChips: [5, 10, 20, 50],
  extra: { key: 'petshop-product-detail', load: (id) => petProductsApi.byProduct(id).catch(() => null) },
  badges: ({ extra: p }) => (p?.categoryType
    ? <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[0.75rem] font-semibold text-amber-800 ring-1 ring-amber-200">{categoryLabel(p.categoryType)}</span>
    : null),
  facts: ({ extra: p }) => {
    if (!p) return [];
    const rows: Array<[string, ReactNode]> = [
      ['Kis ke liye', p.species ? speciesLabel(p.species) : undefined], ['Umar', p.lifeStage ? LIFE_STAGE[p.lifeStage] : undefined],
      ['Brand', p.brand], ['Pack', p.packSize], ['Flavour', p.flavor], ['Wazan', p.weightKg ? `${p.weightKg} kg` : undefined],
      ['Asal dawa', p.activeIngredient], ['Taqat', p.dosageStrength], ['Shakal', p.dosageForm],
      ['Parchi', p.isPrescriptionOnly ? 'Doctor ki parchi par' : undefined], ['Kaise rakhein', p.storageInstructions],
      ['Size', p.size], ['Material', p.material], ['Tank', p.tankCapacityLiters ? `${p.tankCapacityLiters} litre` : undefined],
    ];
    return rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  },
  tile: ({ extra: p }) => {
    const left = daysFromToday(p?.expiryDate);
    if (left === null) return null;
    return { label: 'Expiry', value: left < 0 ? 'Expire' : `${left} din`, hint: p?.expiryDate ? shortDate(p.expiryDate) : undefined };
  },
  alerts: ({ extra: p, stock }) => {
    const left = daysFromToday(p?.expiryDate);
    if (left === null || left > 30 || stock <= 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">
        <CalendarX className="h-4 w-4" />
        <span className="text-[0.875rem] font-medium">{left < 0 ? 'Ye cheez expire ho chuki hai — counter se hatayein aur Damage me likhein' : `${left} din me expire — pehle bechein`}</span>
      </div>
    );
  },
  guide: [
    { icon: CalendarX, color: '#e11d48', title: 'Expiry', text: 'Batch ki expiry Stock me likhein. Expire cheez Damage page se "Expiry" likh kar stock se nikalein.' },
  ],
};

export default function PetshopProductDetailPage() {
  return <ProductDetailPage config={config} />;
}
