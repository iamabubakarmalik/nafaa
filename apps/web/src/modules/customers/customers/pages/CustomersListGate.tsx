// apps/web/src/modules/customers/customers/pages/CustomersListGate.tsx
import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import CustomersListPage from './CustomersListPage';

const MobileCustomersPage = lazy(() =>
  import('@industries/mobile/pages/MobileCustomersPage'),
);
const ElectronicsCustomersPage = lazy(() =>
  import('@industries/electronics/pages/ElectronicsCustomersPage'),
);

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
    </div>
  );
}

/**
 * CustomersListGate — /customers ko industry ke hisaab se route karta hai.
 *
 * Mobile → MobileCustomersPage: har customer ke saath ye bhi dikhta hai ke
 *          us ne kitne phone liye, kitni warranty chal rahi hai, EMI hai ya
 *          nahi — aur "sirf EMI wale / sirf phone wale" filter bhi milte hain.
 * Electronics → ElectronicsCustomersPage: kis ke paas kaunsa serial unit
 *          gaya, kitni warranty abhi chal rahi hai, aur kitni 30 din me
 *          khatam ho rahi hai — warranty claim ke waqt yehi kaam aata hai.
 * Baaki   → generic CustomersListPage.
 *
 * Customer DETAIL page ka gate nahi chahiye — generic CustomerDetailPage me
 * pehle se Mobile History tab (IMEI, warranty, EMI, repairs) mojood hai.
 */
export default function CustomersListGate() {
  const industry = useCurrentIndustry();

  if (industry?.id === 'mobile') {
    return (
      <Suspense fallback={<Loader />}>
        <MobileCustomersPage />
      </Suspense>
    );
  }

  if (industry?.id === 'electronics') {
    return (
      <Suspense fallback={<Loader />}>
        <ElectronicsCustomersPage />
      </Suspense>
    );
  }

  return <CustomersListPage />;
}
