/**
 * Agri product detail on the shared product page: kind, pack and formula,
 * crops and season, the registration state, spray safety and bulk rate.
 */

import type { ReactNode } from 'react';
import { Bug, ShieldAlert, Sprout, Tags } from 'lucide-react';
import { Card } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { agriProductsApi, type AgriProductProfile } from '../api/products.api';
import { isSprayKind, needsGovtReg, prettyAgriKind, type AgriKind } from '../lib/agriCategory';
import { certStatus } from '../lib/agriUnits';
import { seasonLabel, shortDate } from '../lib/meta';

type Extra = AgriProductProfile | null;

const regOf = (p: Extra | undefined) => (p && needsGovtReg(p.category as AgriKind) ? certStatus(p.govtRegExpiry) : null);

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium text-slate-900">{children || '—'}</dd></div>;
}

const config: DetailConfig<Extra> = {
  label: 'Agri',
  paths: { list: '/agri/products', edit: (id) => `/agri-products/${id}/edit` },
  stockChips: [1, 10, 50, 100],
  extra: { key: 'agri-product-detail', load: (id) => agriProductsApi.byProduct(id).catch(() => null) },
  badges: ({ extra: p }) => {
    if (!p) return null;
    const reg = regOf(p);
    return (
      <>
        <span className="rounded-md bg-lime-50 px-2 py-0.5 text-[0.75rem] font-semibold text-lime-800 ring-1 ring-lime-200">{prettyAgriKind(p.category as AgriKind)}</span>
        {p.season && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[0.75rem] font-semibold text-slate-700">{seasonLabel(p.season)}</span>}
        {reg?.state === 'expired' && <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 text-[0.75rem] font-semibold text-white"><ShieldAlert className="h-3 w-3" />Registration khatam</span>}
        {(p.isRestricted || p.requiresLicense) && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[0.75rem] font-semibold text-amber-800">Pabandi wali</span>}
      </>
    );
  },
  facts: ({ extra: p }) => {
    if (!p) return [];
    const rows: Array<[string, ReactNode]> = [
      ['Company', [p.manufacturer, p.brand].filter(Boolean).join(' · ') || undefined],
      ['Pack', Number(p.packSize) > 0 ? `${p.packSize} ${p.packUnit || 'kg'}` : undefined],
      ['NPK', p.npkRatio], ['Formula', [p.activeIngredient, p.concentration].filter(Boolean).join(' ') || undefined],
      ['Fasal', p.targetCrops?.length ? p.targetCrops.join(', ') : undefined],
      ['Dose', p.applicationRate],
      ['Bulk rate', Number(p.bulkDiscountThreshold) > 0 && Number(p.bulkDiscountPct) > 0 ? `${p.bulkDiscountThreshold}+ par ${p.bulkDiscountPct}% kam` : undefined],
    ];
    return rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  },
  tile: ({ extra: p }) => {
    const reg = regOf(p);
    if (!reg || reg.state === 'none') return null;
    return { label: 'Registration', value: reg.state === 'expired' ? 'Khatam' : `${reg.days} din`, hint: shortDate(p!.govtRegExpiry) };
  },
  alerts: ({ extra: p }) => {
    const reg = regOf(p);
    if (!reg || (reg.state !== 'expired' && reg.state !== 'soon')) return null;
    return (
      <div className={cn('flex items-center gap-2 rounded-2xl px-4 py-3 ring-1', reg.state === 'expired' ? 'bg-rose-50 text-rose-900 ring-rose-200' : 'bg-amber-50 text-amber-900 ring-amber-200')}>
        <ShieldAlert className="h-4 w-4" /><span className="text-[0.875rem] font-medium">{reg.text}{reg.state === 'expired' ? ' — POS par nahi bikegi. Nayi date Edit me likhein.' : ''}</span>
      </div>
    );
  },
  tabs: [
    {
      id: 'agri', label: 'Istemal', icon: Sprout, when: ({ extra }) => !!extra,
      render: ({ extra: p }) => (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl" title="Istemal">
            <dl className="space-y-2 text-[0.875rem]">
              <Row label="Dose">{p!.applicationRate}</Row>
              <Row label="Tareeqa">{p!.applicationMethod}</Row>
              <Row label="Keeray / bimari">{p!.targetPests?.join(', ')}</Row>
              <Row label="Season">{p!.season ? seasonLabel(p!.season) : ''}</Row>
            </dl>
          </Card>
          <Card className="rounded-2xl" title="Registration aur hifazat">
            <dl className="space-y-2 text-[0.875rem]">
              <Row label="Registration #">{p!.govtRegNumber}</Row>
              <Row label="Aakhri date">{p!.govtRegExpiry ? shortDate(p!.govtRegExpiry) : ''}</Row>
              {isSprayKind(p!.category as AgriKind) && (
                <>
                  <Row label="Zeher ka darja">{p!.toxicityLevel}</Row>
                  <Row label="Khet me na jayein">{p!.reEntryPeriod ? `${p!.reEntryPeriod} din` : ''}</Row>
                  <Row label="Katai se pehle band">{p!.ppePeriod ? `${p!.ppePeriod} din` : ''}</Row>
                  <Row label="Khabardar">{p!.warningLabel}</Row>
                </>
              )}
            </dl>
          </Card>
        </div>
      ),
    },
  ],
  guide: [
    { icon: ShieldAlert, color: '#e11d48', title: 'Registration', text: 'Date guzar jaye to POS ye cheez nahi bechta. Renew ho to Edit me nayi date likhein.' },
    { icon: Bug, color: '#d97706', title: 'Spray', text: 'Hifazat ke din receipt par chhapte hain — farmer ko batayein.' },
    { icon: Tags, color: '#16a34a', title: 'Bulk rate', text: 'Bulk quantity par POS khud kam rate lagata hai.' },
  ],
};

/** Agri product detail (route /agri-products/:id). */
export default function AgriProductDetailPage() {
  return <ProductDetailPage config={config} />;
}
