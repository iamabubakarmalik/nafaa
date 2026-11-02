/** Meat item detail on the shared product page: animal and cut, halal certificate, restaurant rate and source. */

import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { meatProductsApi, type MeatProductProfile } from '../api/products.api';
import { animalOf, cutLabel, dateOnly } from '../lib/meta';
import { t } from '@core/i18n';

const config: DetailConfig<MeatProductProfile | null> = {
  label: t('Meat'),
  paths: { list: '/meat/products', edit: (id) => `/meat-products/${id}/edit` },
  stockChips: [1, 5, 10, 25],
  extra: { key: 'meat-product-detail', load: (id) => meatProductsApi.byProduct(id).catch(() => null) },
  badges: ({ extra: p }) => (p ? (
    <>
      <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[0.75rem] font-semibold text-rose-800 ring-1 ring-rose-200">{animalOf(p.animalType).emoji} {animalOf(p.animalType).label} · {cutLabel(p.cutCategory)}</span>
      {p.isHalalCertified && <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[0.75rem] font-semibold text-emerald-700 ring-1 ring-emerald-200">{t('Halal')}</span>}
      {p.isFrozen && <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[0.75rem] font-semibold text-sky-700 ring-1 ring-sky-200">{t('Frozen')}</span>}
    </>
  ) : null),
  facts: ({ extra: p, product, money }) => {
    const rows: Array<[string, ReactNode]> = [
      [t('Restaurant rate'), product.wholesalePrice ? money(product.wholesalePrice) : undefined],
      [t('Boneless'), p ? (p.isBoneless ? t('Haan') : t('Haddi wala')) : undefined],
      [t('Halal certificate'), p?.isHalalCertified ? [p.halalCertNumber, p.halalCertBy].filter(Boolean).join(' · ') || t('Haan') : undefined],
      [t('Certificate kab tak'), p?.halalCertExpiry ? dateOnly(p.halalCertExpiry) : undefined],
      [t('Farm / mandi'), p?.farmName], [t('Zibah khana'), p?.slaughterhouseName],
      [t('Kitne din chalta hai'), p?.shelfLifeDays ? `${p.shelfLifeDays} din` : undefined],
      [t('Order par kam se kam'), p?.minOrderKg ? `${p.minOrderKg} kg` : undefined],
    ];
    return rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  },
  alerts: ({ extra: p }) => (p?.isHalalCertified && p.halalCertExpiry && new Date(p.halalCertExpiry) < new Date() ? (
    <div className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-rose-900 ring-1 ring-rose-200">
      <ShieldAlert className="h-4 w-4" />
      <span className="text-[0.875rem] font-medium">{t('Halal certificate {{halalCertExpiry}} ko khatam ho gaya — naya certificate le kar Edit me likhein', { halalCertExpiry: dateOnly(p.halalCertExpiry) })}</span>
    </div>
  ) : null),
};

export default function MeatProductDetailPage() {
  return <ProductDetailPage config={config} />;
}
