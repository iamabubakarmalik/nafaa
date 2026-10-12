/**
 * Purchase bill page: the shared page for every industry; electronics adds
 * serial entry on its lines.
 */

import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import PurchaseDetailPage from './PurchaseDetailPage';

const ElectronicsPurchaseDetail = lazy(() => import('@industries/electronics/pages/ElectronicsPurchasesPage').then((m) => ({ default: m.ElectronicsPurchaseDetail })));

export default function PurchaseDetailGate() {
  const industry = useCurrentIndustry();
  if (industry?.id === 'electronics') return <Suspense fallback={null}><ElectronicsPurchaseDetail /></Suspense>;
  return <PurchaseDetailPage />;
}
