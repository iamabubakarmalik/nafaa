/** Optical item detail on the shared product page: what it is, brand and model, frame size, lens, contact lens fit and warranty. */

import type { ReactNode } from 'react';
import { Glasses, StickyNote } from 'lucide-react';
import { Card } from '@/design-system/components';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { opticalProductsApi, type OpticalFacts, type OpticalProfileMore } from '../api/products.api';
import { typeLabel } from '../hooks/useOpticalFacts';
import { t } from '@core/i18n';

type Profile = (OpticalFacts & OpticalProfileMore & { id: string }) | null;

const config: DetailConfig<Profile> = {
  label: t('Optical'),
  paths: { list: '/products', edit: (id) => `/optical-products/${id}/edit` },
  stockChips: [1, 5, 10, 20],
  extra: { key: 'optical-product-detail', load: (id) => opticalProductsApi.byProduct(id).catch(() => null) },
  badges: ({ extra: p }) => (p ? (
    <>
      {p.categoryType && <span className="rounded-md bg-cyan-50 px-2 py-0.5 text-[0.75rem] font-semibold text-cyan-800 ring-1 ring-cyan-200">{typeLabel(p.categoryType)}</span>}
      {p.colorHex && <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[0.75rem] font-semibold text-slate-700 ring-1 ring-slate-200"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.colorHex }} />{p.colorName}</span>}
      {p.hasBlueCut && <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[0.75rem] font-semibold text-sky-700">{t('Blue cut')}</span>}
      {p.isPolarized && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[0.75rem] font-semibold text-slate-700">{t('Polarized')}</span>}
    </>
  ) : null),
  facts: ({ extra: p }) => {
    if (!p) return [];
    const rows: Array<[string, ReactNode]> = [
      [t('Brand'), p.brand], [t('Model'), p.modelNumber], [t('Collection'), p.collectionName], [t('Rang'), p.colorName],
      [t('Size'), p.frameSizeMm ? `${p.frameSizeMm}□${p.bridgeSizeMm ?? '—'}-${p.templeLengthMm ?? '—'}` : undefined],
      [t('Shape'), p.frameShape ? p.frameShape.replace(/_/g, ' ').toLowerCase() : undefined], [t('Material'), p.frameMaterial ? p.frameMaterial.replace(/_/g, ' ').toLowerCase() : undefined],
      [t('Lens'), [p.lensIndex, p.lensMaterial, p.lensType].filter(Boolean).join(' · ') || undefined], [t('Coating'), p.lensCoatings?.length ? p.lensCoatings.join(', ') : undefined],
      [t('Contact lens'), p.isContactLens ? [p.clDuration, p.clBaseCurve && `BC ${p.clBaseCurve}`, p.clDiameter && `DIA ${p.clDiameter}`, p.clForAstigmatism && 'Toric'].filter(Boolean).join(' · ') : undefined],
      [t('Power range'), p.supportsMinSph != null || p.supportsMaxSph != null ? t('SPH {{value}} se {{value2}}{{value3}}', { value: p.supportsMinSph ?? '—', value2: p.supportsMaxSph ?? '—', value3: p.supportsMaxCyl != null ? t(' · CYL {{supportsMaxCyl}} tak', { supportsMaxCyl: p.supportsMaxCyl }) : '' }) : undefined],
      [t('Warranty'), p.warrantyMonths ? `${p.warrantyMonths} mahine` : undefined],
    ];
    return rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  },
  tabs: [
    {
      id: 'notes', label: t('Note'), icon: StickyNote, when: ({ extra }) => !!extra?.notes,
      render: ({ extra }) => <Card className="rounded-2xl" title={t('Note')}><p className="whitespace-pre-line text-[0.875rem] text-slate-700">{extra?.notes}</p></Card>,
    },
  ],
  guide: [{ icon: Glasses, color: '#0891b2', title: t('Optical tafseel'), text: t('Brand, size aur lens ki tafseel Edit se badlein — counter aur orders me yahi dikhti hai.') }],
};

export default function OpticalProductDetailPage() {
  return <ProductDetailPage config={config} />;
}
