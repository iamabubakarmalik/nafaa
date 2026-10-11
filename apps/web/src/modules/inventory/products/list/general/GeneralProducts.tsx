/** Products page for businesses without an industry-specific one. */

import { ProductsPage } from '../ProductsPage';
import type { ProductsPageConfig } from '../types';

const config: ProductsPageConfig = {
  label: 'Dukaan',
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
