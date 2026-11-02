/** Medicine detail on the shared product page: formula, schedule, storage, substitutes and the register link. */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightLeft, Beaker, ShieldAlert, Snowflake } from 'lucide-react';
import { Card } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { medicinesApi, type PharmacyMedicine } from '../api/medicines.api';
import { substitutesApi } from '../api/substitutes.api';
import { REGISTER_CLASSES, SCHEDULE_META, STORAGE_META } from '../lib/meta';
import { t } from '@core/i18n';

type Extra = PharmacyMedicine | null;

interface Suggestion {
  product: { id: string; name: string; price: number; isActive: boolean };
  exact: boolean;
  stock: number;
  priceDifference: number;
  matchedSalts: Array<{ strength: string | null; salt: { name: string } }>;
}

const genericOf = (m: Extra | undefined) => ((m?.product?.productSalts ?? []) as Array<{ strength: string | null; isMainSalt: boolean; salt?: { name: string } }>)
  .slice().sort((a, b) => Number(b.isMainSalt) - Number(a.isMainSalt))
  .map((s) => [s.salt?.name, s.strength].filter(Boolean).join(' ')).join(' + ');
const inRegister = (m: Extra | undefined) => !!m && (m.isNarcotic || REGISTER_CLASSES.includes(m.scheduleClass));

function Substitutes({ productId }: { productId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['pharmacy-substitutes', productId],
    queryFn: () => substitutesApi.autoSuggest(productId).catch(() => [] as Suggestion[]) as Promise<Suggestion[]>,
    staleTime: 60_000,
  });
  return (
    <Card className="rounded-2xl" flush title={t('Substitute (same formula)')} description={t('Stock khatam ho to grahak ko ye de sakte hain — pehle bilkul same formula, phir shelf wali')}>
      {isLoading ? <p className="px-5 py-8 text-center text-[0.8125rem] text-slate-500">{t('Dhoond rahe hain…')}</p>
        : data.length === 0 ? <p className="px-5 py-8 text-center text-[0.8125rem] text-slate-500">{t('Is formula ki koi aur dawai nahi — formula (salt) likha ho to yahan dikhegi')}</p> : (
          <ul className="divide-y divide-slate-100">
            {data.slice(0, 20).map((s) => (
              <li key={s.product.id}>
                <Link to={`/pharmacy-medicines/${s.product.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                  <ArrowRightLeft className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] font-medium text-slate-900">{s.product.name}</span>
                    <span className="block truncate text-[0.75rem] text-slate-500">{s.matchedSalts.map((m) => [m.salt.name, m.strength].filter(Boolean).join(' ')).join(' + ')}{s.exact ? t(' · bilkul same') : t(' · formula milta julta')}</span>
                  </span>
                  <span className={cn('text-[0.75rem] font-medium tabular-nums', s.stock > 0 ? 'text-emerald-700' : 'text-rose-600')}>{s.stock > 0 ? t('{{value}} stock', { value: Number(s.stock.toFixed(2)) }) : 'khatam'}</span>
                  <span className="w-24 text-end text-[0.875rem] font-semibold tabular-nums">{formatPKR(s.product.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </Card>
  );
}

const config: DetailConfig<Extra> = {
  label: t('Pharmacy'),
  paths: { list: '/pharmacy/medicines', edit: (id) => `/pharmacy-medicines/${id}/edit` },
  stockChips: [1, 10, 30, 100],
  extra: { key: 'pharmacy-product-detail', load: (id) => medicinesApi.byProduct(id).catch(() => null) },
  badges: ({ extra: m }) => {
    if (!m) return null;
    const s = SCHEDULE_META[m.scheduleClass];
    return (
      <>
        {s && <span className={cn('rounded-md px-2 py-0.5 text-[0.75rem] font-semibold ring-1', s.tone)}>{s.label}</span>}
        {inRegister(m) && <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 text-[0.75rem] font-semibold text-white"><ShieldAlert className="h-3 w-3" />{t('Register')}</span>}
        {(m.requiresColdChain || m.isRefrigerated) && <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[0.75rem] font-semibold text-sky-700"><Snowflake className="h-3 w-3" />{t('Fridge')}</span>}
      </>
    );
  },
  facts: ({ extra: m }) => {
    if (!m) return [];
    const rows: Array<[string, ReactNode]> = [
      [t('Formula'), genericOf(m) || undefined], [t('Shakal'), m.dosageForm], [t('Pack'), m.packSize], [t('Company'), m.manufacturer],
      [t('DRAP registration'), m.registrationNumber], [t('Rakhna'), STORAGE_META[m.storageCondition]],
      [t('Temperature'), m.minTemperature != null || m.maxTemperature != null ? t('{{value}}°C se {{value2}}°C', { value: m.minTemperature ?? '—', value2: m.maxTemperature ?? '—' }) : undefined],
      [t('Nuskha'), m.requiresPrescription ? t('Zaroori') : t('Nahi')],
    ];
    return rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  },
  alerts: ({ extra: m, product }) => (inRegister(m) ? (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-rose-900 ring-1 ring-rose-200">
      <ShieldAlert className="h-4 w-4" /><span className="text-[0.875rem] font-medium">{t('Register wali dawai — har sale par doctor aur mareez ka naam likha jata hai')}</span>
      <Link to={`/pharmacy/controlled-log?product=${product.id}`} className="ms-auto text-[0.8125rem] font-semibold hover:underline">{t('Register →')}</Link>
    </div>
  ) : null),
  tabs: [
    {
      id: 'formula', label: t('Formula'), icon: Beaker, when: ({ extra }) => !!extra,
      render: ({ extra: m, product }) => (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl" title={t('Formula aur istemal')}>
            <dl className="space-y-2 text-[0.875rem]">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">{t('Generic')}</dt><dd className="text-end font-medium">{genericOf(m) || t('Likha nahi')}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">{t('Kis bimari me')}</dt><dd className="text-end">{m!.indication || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">{t('Rakhne ki hidayat')}</dt><dd className="text-end">{m!.storageInstructions || '—'}</dd></div>
            </dl>
          </Card>
          <Substitutes productId={product.id} />
        </div>
      ),
    },
  ],
  guide: [
    { icon: ArrowRightLeft, color: '#0891b2', title: t('Substitute'), text: t('Formula tab me same salt wali dawaiyan — stock khatam ho to grahak ko kya dena hai.') },
  ],
};

export default function PharmacyProductDetail() {
  return <ProductDetailPage config={config} />;
}
