/** Clinic service or medicine on the shared product page: service type, time and preparation. */

import type { ReactNode } from 'react';
import { FlaskConical, Stethoscope } from 'lucide-react';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { SERVICE_CATEGORIES } from '../api/constants';
import { clinicServicesApi, type ClinicService } from '../api/services.api';
import { t } from '@core/i18n';

type Extra = ClinicService | null;

const config: DetailConfig<Extra> = {
  label: t('Clinic'),
  paths: { list: '/products', edit: (id) => `/clinic-services/${id}/edit` },
  stockChips: [1, 10, 30, 100],
  extra: { key: 'clinic-service-detail', load: (id) => clinicServicesApi.byProduct(id).catch(() => null) },
  badges: ({ extra: s }) => {
    if (!s) return null;
    const c = SERVICE_CATEGORIES.find((x) => x.value === s.category);
    return (
      <>
        <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[0.75rem] font-semibold text-sky-800 ring-1 ring-sky-100"><Stethoscope className="h-3 w-3" />{c?.label ?? t('Service')}</span>
        {s.requiresFasting && <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[0.75rem] font-semibold text-amber-800"><FlaskConical className="h-3 w-3" />{t('Tayyari zaroori')}</span>}
        {!s.isActive && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[0.75rem] font-semibold text-slate-600">{t('Service band')}</span>}
      </>
    );
  },
  facts: ({ extra: s }) => {
    if (!s) return [];
    const rows: Array<[string, ReactNode]> = [
      [t('Type'), SERVICE_CATEGORIES.find((x) => x.value === s.category)?.label], [t('Service code'), s.serviceCode], [t('Waqt'), s.durationMin ? `${s.durationMin} minute` : undefined],
      [t('Doctor'), s.requiresDoctor ? t('Zaroori') : t('Nahi')], [t('Mareez ko hidayat'), s.prepInstructions || undefined],
    ];
    return rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  },
  tile: ({ extra: s }) => (s ? { label: t('Service'), value: SERVICE_CATEGORIES.find((x) => x.value === s.category)?.label ?? 'Service', hint: t('Stock nahi hota') } : null),
  guide: [
    { icon: Stethoscope, color: '#0891b2', title: t('Service'), text: t('Service ka stock nahi hota; Sale tab me dekhein kitni dafa bili. Rate badlein to Lab order aur counter par naya rate lagta hai.') },
  ],
};

export default function ClinicServiceDetailPage() {
  return <ProductDetailPage config={config} />;
}
