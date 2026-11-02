/** Furniture item on the shared product detail page: type, condition, wood, polish, fabric, size, fitting and delivery needs. */

import type { ReactNode } from 'react';
import { Hammer, Truck } from 'lucide-react';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { furnitureProductsApi, type FurnitureProductProfile } from '../api/products.api';
import { CONDITIONS, categoryLabel, materialOf, sizeText } from '../lib/meta';
import { t } from '@core/i18n';

const config: DetailConfig<FurnitureProductProfile | null> = {
  label: t('Furniture'),
  paths: { list: '/products', edit: (id) => `/furniture-products/${id}/edit` },
  stockChips: [1, 2, 4, 6],
  extra: { key: 'furniture-product-detail', load: (id) => furnitureProductsApi.byProduct(id).catch(() => null) },
  badges: ({ extra: p }) => {
    if (!p) return null;
    const c = CONDITIONS[p.conditionType];
    return (
      <>
        {p.categoryType && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[0.75rem] font-semibold text-amber-900 ring-1 ring-amber-200">{categoryLabel(p.categoryType)}</span>}
        {c && <span className={`rounded-md px-2 py-0.5 text-[0.75rem] font-semibold ring-1 ${c.tone}`}>{c.label}</span>}
        {p.requiresAssembly && <span className="rounded-md bg-sky-600 px-2 py-0.5 text-[0.75rem] font-semibold text-white">{t('Fitting')}</span>}
      </>
    );
  },
  facts: ({ extra: p, money }) => {
    if (!p) return [];
    const rows: Array<[string, ReactNode]> = [
      [t('Material'), p.primaryMaterial ? materialOf(p.primaryMaterial) : undefined], [t('Lakri'), p.woodType], [t('Polish'), p.polishType], [t('Rang'), p.colorName],
      [t('Kapra'), p.upholsteryFabric], [t('Gaddi'), p.cushionFilling], [t('Size'), sizeText(p) || undefined],
      [t('Baithne wale'), p.seatingCapacity ? String(p.seatingCapacity) : undefined], [t('Daraz'), p.drawersCount ? String(p.drawersCount) : undefined],
      [t('Warranty'), p.warrantyMonths ? `${p.warrantyMonths} mahine` : undefined], [t('Deemak'), p.isTermiteProof ? t('Mehfooz') : undefined],
      [t('Showroom'), [p.showroomLocation, p.displayZone].filter(Boolean).join(' · ') || undefined],
      [t('Order par'), p.isCustomizable ? t('Haan{{value}}', { value: p.customLeadTimeDays ? t(' · {{customLeadTimeDays}} din', { customLeadTimeDays: p.customLeadTimeDays }) : '' }) : undefined],
      ['MRP', p.mrp ? money(p.mrp) : undefined],
    ];
    return rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  },
  tile: ({ extra: p, money }) => (p ? {
    label: t('Delivery'), value: p.deliveryChargeBase ? money(p.deliveryChargeBase) : t('Likha nahi'),
    hint: [p.requiresAssembly ? t('Fitting {{value}}', { value: p.assemblyChargeExtra ? money(p.assemblyChargeExtra) : t('free') }) : null, p.requiresLargeVehicle ? t('Bari gaari') : null, p.helpersNeeded ? `${p.helpersNeeded} helper` : null].filter(Boolean).join(' · ') || undefined,
  } : null),
  guide: [
    { icon: Truck, color: '#0891b2', title: t('Delivery'), text: t('Counter par bill ke baad "Delivery" se gaari, date aur charges likhein.') },
    { icon: Hammer, color: '#a16207', title: t('Order par'), text: t('Customer ko alag size ya rang chahiye to Custom orders me naya order banayein.') },
  ],
};

export default function FurnitureProductDetailPage() {
  return <ProductDetailPage config={config} />;
}
