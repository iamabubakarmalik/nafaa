/** Retail product detail: the shared page; packs, variants and batches show as tabs when present. */

import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';

const config: DetailConfig<never> = {
  label: 'Retail',
  paths: { list: '/products', edit: (id) => `/retail-products/${id}/edit` },
};

export default function RetailProductDetail() {
  return <ProductDetailPage config={config} />;
}
