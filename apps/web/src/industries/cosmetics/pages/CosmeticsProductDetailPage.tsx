/** Cosmetics product detail: the shared product page (shades, batches with expiry, sales, purchases) with cosmetics guide lines. */

import { CalendarClock, Palette } from 'lucide-react';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { t } from '@core/i18n';

const config: DetailConfig<null> = {
  label: t('Cosmetics'),
  paths: { list: '/products', edit: (id) => `/cosmetics-products/${id}/edit` },
  stockChips: [1, 6, 12, 24],
  guide: [
    { icon: Palette, color: '#db2777', title: t('Shade'), text: t('Har shade ka stock variants me — kam ho to wahi shade mangwayein.') },
    { icon: CalendarClock, color: '#e11d48', title: t('Expiry'), text: t('Batch tab me har batch ki expiry. Qareeb expiry wala pehle bechein ya Expiry page se nikaalein.') },
  ],
};

export default function CosmeticsProductDetailPage() {
  return <ProductDetailPage config={config} />;
}
