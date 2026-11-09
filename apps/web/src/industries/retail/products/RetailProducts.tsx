/** Retail products: the shared page; the ready-made grocery catalog opens from its "Library se products" button. */

import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { t } from '@core/i18n';

const config: ProductsPageConfig = {
  label: t('Retail'),
  paths: {
    detail: (id) => `/retail-products/${id}`,
    edit: (id) => `/retail-products/${id}/edit`,
    create: '/retail-products/new',
    bulkImport: '/products/bulk-import',
  },
  filters: ['tags'],
};

export default function RetailProducts() {
  return <ProductsPage config={config} />;
}
