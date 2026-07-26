import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '../../../../industries/_shared/registry/useCurrentIndustry';
import KhataPage from './KhataPage';

const RetailKhataPage = lazy(() =>
  import('../../../../industries/retail/pages/RetailKhataPage')
);

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
    </div>
  );
}

/**
 * KhataGate — /khata ko industry ke hisaab se route karta hai.
 * Retail  → RetailKhataPage (full khata system)
 * Others  → generic KhataPage
 */
export default function KhataGate() {
  const industry = useCurrentIndustry();

  if (industry?.id === 'retail') {
    return (
      <Suspense fallback={<Loader />}>
        <RetailKhataPage />
      </Suspense>
    );
  }

  return <KhataPage />;
}