// apps/web/src/modules/inventory/products/pages/BulkImportGate.tsx
import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '../../../../industries/_shared/registry/useCurrentIndustry';
import ProductBulkImportPage from './ProductBulkImportPage';

const RetailBulkImportPage = lazy(() =>
  import('../../../../industries/retail/pages/BulkImportPage')
);

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
    </div>
  );
}

/**
 * BulkImportGate — industry-aware bulk import.
 *   • Retail  → Excel + CSV + Google Sheet paste, smart column detect, auto-barcode
 *   • Others  → generic ProductBulkImportPage
 */
export default function BulkImportGate() {
  const industry = useCurrentIndustry();

  if (industry?.id === 'retail') {
    return (
      <Suspense fallback={<Loader />}>
        <RetailBulkImportPage />
      </Suspense>
    );
  }

  return <ProductBulkImportPage />;
}
