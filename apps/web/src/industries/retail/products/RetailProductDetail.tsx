/** Retail product detail: the shared page; packs, variants and batches show as tabs when present. */

import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { t } from '@core/i18n';

const config: DetailConfig<never> = {
  label: t('Retail'),
  paths: { list: '/products', edit: (id) => `/retail-products/${id}/edit` },
};

export default function RetailProductDetail() {
  return <ProductDetailPage config={config} />;
}
