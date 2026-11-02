/** Product detail for businesses without an industry-specific one. */

import { ProductDetailPage, type DetailConfig } from '../ProductDetailPage';
import { t } from '@core/i18n';

const config: DetailConfig<never> = {
  label: t('Dukaan'),
  paths: { list: '/products', edit: (id) => `/products/${id}/edit` },
};

export default function GeneralProductDetail() {
  return <ProductDetailPage config={config} />;
}
