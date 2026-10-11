/** Product detail for businesses without an industry-specific one. */

import { ProductDetailPage, type DetailConfig } from '../ProductDetailPage';

const config: DetailConfig<never> = {
  label: 'Dukaan',
  paths: { list: '/products', edit: (id) => `/products/${id}/edit` },
};

export default function GeneralProductDetail() {
  return <ProductDetailPage config={config} />;
}
