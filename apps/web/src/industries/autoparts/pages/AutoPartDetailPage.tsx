/** Auto part detail on the shared product page: numbers, quality, warranty and the vehicles it fits. */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Car, Zap } from 'lucide-react';
import { Card } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { partProfilesApi, type PartProfile } from '../api/part-profiles.api';
import { categoryOf, conditionOf } from '../components/meta';

type Extra = PartProfile | null;

const years = (from?: number | null, to?: number | null) => (from && to ? `${from}–${to}` : from ? `${from} se` : to ? `${to} tak` : 'Har saal');

const config: DetailConfig<Extra> = {
  label: 'Auto Parts',
  paths: { list: '/autoparts/parts', edit: (id) => `/autoparts-parts/${id}/edit` },
  stockChips: [1, 2, 5, 10, 20],
  extra: { key: 'autoparts-part-detail', load: (id) => partProfilesApi.byProduct(id).catch(() => null) },
  badges: ({ extra: p }) => {
    if (!p) return null;
    const c = conditionOf(p.condition);
    return (
      <>
        <span className={cn('rounded-md px-2 py-0.5 text-[0.75rem] font-semibold ring-1', c.tone)}>{c.label}</span>
        {p.isFastMoving && <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-[0.75rem] font-semibold text-brand-700"><Zap className="h-3 w-3" />Zyada bikta</span>}
      </>
    );
  },
  facts: ({ extra: p }) => {
    if (!p) return [];
    const rows: Array<[string, ReactNode]> = [
      ['Part number', p.partNumber ? <span className="font-mono">{p.partNumber}</span> : undefined],
      ['OEM number', p.oemNumber ? <span className="font-mono">{p.oemNumber}</span> : undefined],
      ['Doosre number', p.alternateNumbers?.length ? <span className="font-mono">{p.alternateNumbers.join(', ')}</span> : undefined],
      ['Group', p.category !== 'OTHER' ? categoryOf(p.category) : undefined],
      ['Quality', `${conditionOf(p.condition).label} — ${conditionOf(p.condition).hint}`],
      ['Brand', p.brand], ['Bana', p.countryOfOrigin],
      ['Warranty', p.warrantyMonths > 0 || p.warrantyKm ? [p.warrantyMonths > 0 && `${p.warrantyMonths} mahine`, p.warrantyKm && `${p.warrantyKm.toLocaleString('en-PK')} km`].filter(Boolean).join(' ya ') : undefined],
    ];
    return rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  },
  alerts: ({ extra: p }) => (p?.isCritical ? (
    <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[0.875rem] font-medium text-amber-900 ring-1 ring-amber-200">
      <BadgeCheck className="h-4 w-4" />Ye part hamesha stock me rakhna hai — khatam hone se pehle purchase karein
    </div>
  ) : null),
  tabs: [
    {
      id: 'fitment', label: 'Gaariyan', icon: Car, when: ({ extra }) => !!extra,
      render: ({ extra: p }) => {
        const fits = p?.compatibility?.fitments ?? [];
        return (
          <Card className="rounded-2xl" flush title="Kis gaari me lagta hai" description="Counter par in gaariyon ke naam se ye part milta hai">
            {p?.compatibility?.isUniversal ? <p className="px-5 py-8 text-center text-[0.875rem] text-slate-600">Har gaari me lagta hai</p>
              : fits.length === 0 ? (
                <p className="px-5 py-8 text-center text-[0.8125rem] text-slate-500">
                  Koi gaari nahi likhi — <Link to={`/autoparts-parts/${p?.productId}/edit`} className="font-semibold text-brand-700 hover:underline">Edit → Gaari</Link> me jorein
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {fits.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 px-5 py-2.5 text-[0.875rem]">
                      <Car className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 font-medium text-slate-900">{[f.makeName, f.modelName ?? 'sab model'].join(' ')}</span>
                      <span className="tabular-nums text-slate-600">{years(f.yearFrom, f.yearTo)}</span>
                    </li>
                  ))}
                </ul>
              )}
          </Card>
        );
      },
    },
  ],
  guide: [
    { icon: Car, color: '#0891b2', title: 'Gaariyan', text: '"Gaariyan" tab me wo gaariyan jin me ye part lagta hai — Edit se badlein.' },
  ],
};

export default function AutoPartDetailPage() {
  return <ProductDetailPage config={config} />;
}
