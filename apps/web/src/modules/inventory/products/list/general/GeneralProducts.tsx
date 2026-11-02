/** Products page for businesses without an industry-specific one. */

import { ProductsPage } from '../ProductsPage';
import type { ProductsPageConfig } from '../types';
import { t } from '@core/i18n';

const config: ProductsPageConfig = {
  label: t('Dukaan'),
  paths: {
    detail: (id) => `/products/${id}`,
    edit: (id) => `/products/${id}/edit`,
    create: '/products/new',
    bulkImport: '/products/bulk-import',
  },
  filters: ['tags'],
};

export default function GeneralProducts() {
  return <ProductsPage config={config} />;
}
