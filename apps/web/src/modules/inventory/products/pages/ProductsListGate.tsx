import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '../../../../industries/_shared/registry/useCurrentIndustry';
import ProductsListPage from './ProductsListPage';

const RetailProductsPage = lazy(() => import('../../../../industries/retail/pages/RetailProductsPage'));

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-sky-200 border-t-sky-600 animate-spin" />
    </div>
  );
}

/**
 * ProductsListGate — /products ko industry ke hisaab se route karta hai.
 * Retail  → RetailProductsPage (grid/table, bulk actions, quick stock)
 * Others  → generic ProductsListPage
 */
export default function ProductsListGate() {
  const industry = useCurrentIndustry();

  if (industry?.id === 'retail') {
    return (
      <Suspense fallback={<Loader />}>
        <RetailProductsPage />
      </Suspense>
    );
  }

  return <ProductsListPage />;
}
