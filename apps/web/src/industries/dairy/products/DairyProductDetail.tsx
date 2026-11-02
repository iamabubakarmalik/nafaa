/** Dairy item detail on the shared product page: kind, fat, morning / evening and bulk rates, shelf life. */

import type { ReactNode } from 'react';
import { Snowflake, Star, Sunrise } from 'lucide-react';
import { Card } from '@/design-system/components';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { dairyProductsApi, type DairyProduct } from '../api/products.api';
import { typeLabel } from '../lib/productTypes';
import { t } from '@core/i18n';

const config: DetailConfig<DairyProduct | null> = {
  label: t('Dairy'),
  paths: { list: '/dairy/products', edit: (id) => `/dairy-products/${id}/edit` },
  stockChips: [5, 10, 20, 40],
  extra: { key: 'dairy-product-detail', load: (id) => dairyProductsApi.byProduct(id).catch(() => null) },
  badges: ({ extra: p }) => (p ? (
    <>
      <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[0.75rem] font-semibold text-sky-800 ring-1 ring-sky-200">{typeLabel(p.productType)}</span>
      {p.isFeatured && <span className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-2 py-0.5 text-[0.75rem] font-semibold text-white"><Star className="h-3 w-3" />{t('Asal doodh')}</span>}
      {p.requiresRefrigeration && <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[0.75rem] font-semibold text-slate-700"><Snowflake className="h-3 w-3" />{t('Fridge')}</span>}
    </>
  ) : null),
  facts: ({ extra: p }) => {
    if (!p) return [];
    const hours = p.shelfLifeHours ?? p.bestBeforeHours;
    const rows: Array<[string, ReactNode]> = [
      [t('Fat'), p.fatContent ? `${p.fatContent}%` : undefined], ['SNF', p.snfContent ? `${p.snfContent}%` : undefined],
      [t('Shelf life'), hours ? (hours >= 48 ? `${Math.round(hours / 24)} din` : `${hours} ghante`) : undefined],
      [t('Ghar delivery'), p.homeDeliveryAvailable ? t('Hoti hai') : t('Nahi')],
    ];
    return rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  },
  tabs: [
    {
      id: 'rates', label: t('Rate'), icon: Sunrise,
      when: ({ extra: p }) => !!(p && (p.morningPrice || p.eveningPrice || p.homeDeliveryPrice || p.bulkPrice)),
      render: ({ extra: p, product, money }) => (
        <Card className="rounded-2xl" flush title={t('Rate')} description={t('Counter aur delivery par ye rate lagte hain')}>
          <ul className="divide-y divide-slate-100 text-[0.875rem]">
            {([[t('Aam rate'), product.price], [t('Subah'), p!.morningPrice], [t('Shaam (3 baje ke baad)'), p!.eveningPrice], [t('Ghar delivery'), p!.homeDeliveryPrice],
              [p!.minBulkQty ? t('{{minBulkQty}}+ {{unit}} (bulk)', { minBulkQty: p!.minBulkQty, unit: product.unit }) : t('Bulk'), p!.bulkPrice]] as Array<[string, number | undefined]>)
              .filter(([, v]) => v != null && v > 0)
              .map(([k, v]) => <li key={k} className="flex items-center justify-between px-5 py-2.5"><span className="text-slate-600">{k}</span><span className="font-semibold tabular-nums">{money(v!)}</span></li>)}
          </ul>
        </Card>
      ),
    },
  ],
  guide: [{ icon: Sunrise, color: '#ea580c', title: t('Rate'), text: t('Rate tab me subah, shaam, delivery aur bulk rate. Edit se badlein.') }],
};

export default function DairyProductDetail() {
  return <ProductDetailPage config={config} />;
}
