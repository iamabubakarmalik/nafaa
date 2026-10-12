/**
 * Purchases routes. Every industry uses the shared list and editor; carpet
 * keeps its own page because each purchase there creates rolls; electronics
 * adds serial badges to the editor.
 */

import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import PurchasesListPage from './PurchasesListPage';
import { PurchaseEditorPage } from '../editor/PurchaseEditorPage';

const CarpetPurchases = lazy(() => import('@industries/carpet/pages/CarpetPurchasesV2'));
const ElectronicsPurchaseEditor = lazy(() => import('@industries/electronics/pages/ElectronicsPurchasesPage').then((m) => ({ default: m.ElectronicsPurchaseEditor })));

export default function PurchasesGate() {
  const industry = useCurrentIndustry();
  if (industry?.id === 'carpet') return <Suspense fallback={null}><CarpetPurchases /></Suspense>;
  return <PurchasesListPage />;
}

export function PurchaseEditorGate() {
  const industry = useCurrentIndustry();
  if (industry?.id === 'carpet') return <Navigate to="/purchases" replace />;
  if (industry?.id === 'electronics') return <Suspense fallback={null}><ElectronicsPurchaseEditor /></Suspense>;
  return <PurchaseEditorPage />;
}
