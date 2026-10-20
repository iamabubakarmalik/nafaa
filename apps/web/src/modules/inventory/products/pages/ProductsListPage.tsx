/**
 * Products page for industries without their own config: the shared page
 * (modules/inventory/products/list), opening each industry's own product
 * editor and detail.
 */

import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { ProductsPage } from '../list/ProductsPage';
import type { ProductsPageConfig } from '../list/types';

/** Industries whose products open in their own editor and detail page. */
const PREFIX: Record<string, string> = {
  jewelry: '/jewelry-items', hardware: '/hardware-products', dairy: '/dairy-products',
  meat: '/meat-products', autoparts: '/autoparts-parts', bookstore: '/bookstore-products', salon: '/salon-services',
  clinic: '/clinic-services',
};

const pathsFor = (prefix: string | undefined): ProductsPageConfig['paths'] => prefix
  ? { detail: (id) => `${prefix}/${id}`, edit: (id) => `${prefix}/${id}/edit`, create: `${prefix}/new`, bulkImport: '/products/bulk-import' }
  : { detail: (id) => `/products/${id}`, edit: (id) => `/products/${id}/edit`, create: '/products/new', bulkImport: '/products/bulk-import' };

export default function ProductsListPage() {
  const industry = useCurrentIndustry();
  const id = industry?.id ?? '';
  const config: ProductsPageConfig = {
    label: industry?.name ?? 'Dukaan',
    paths: pathsFor(PREFIX[id]),
    filters: ['tags'],
  };
  return <ProductsPage config={config} />;
}
