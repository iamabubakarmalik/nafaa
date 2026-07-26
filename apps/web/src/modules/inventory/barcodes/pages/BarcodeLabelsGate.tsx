import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '../../../../industries/_shared/registry/useCurrentIndustry';
import BarcodeLabelsPage from './BarcodeLabelsPage';

const RetailBarcodeLabelsPage = lazy(() =>
  import('../../../../industries/retail/pages/BarcodeLabelsPage')
);

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
    </div>
  );
}

/**
 * BarcodeLabelsGate — /retail/barcode-labels aur /barcode-labels ko
 * industry ke hisaab se route karta hai.
 *   • Retail  → naya feature-rich retail page (SVG barcodes, 6 layouts, print)
 *   • Others  → generic BarcodeLabelsPage
 */
export default function BarcodeLabelsGate() {
  const industry = useCurrentIndustry();

  if (industry?.id === 'retail') {
    return (
      <Suspense fallback={<Loader />}>
        <RetailBarcodeLabelsPage />
      </Suspense>
    );
  }

  return <BarcodeLabelsPage />;
}
