/**
 * Purchases routes. Every industry uses the shared list and editor; carpet
 * has its own editor because each purchase there creates rolls; electronics
 * adds serial badges to the editor; bookstores fill book costs from the
 * publisher's discount.
 */

import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import PurchasesListPage from './PurchasesListPage';
import { PurchaseEditorPage } from '../editor/PurchaseEditorPage';
import { usePublisherCosts } from '@industries/bookstore/purchases/usePublisherCosts';

const CarpetPurchaseEditor = lazy(() => import('@industries/carpet/pages/CarpetPurchaseEditor'));
const ElectronicsPurchaseEditor = lazy(() => import('@industries/electronics/pages/ElectronicsPurchasesPage').then((m) => ({ default: m.ElectronicsPurchaseEditor })));

export default function PurchasesGate() {
  return <PurchasesListPage />;
}

const BOOKSTORE_EDITOR = { useSupplierCosts: usePublisherCosts };

export function PurchaseEditorGate() {
  const industry = useCurrentIndustry();
  if (industry?.id === 'carpet') return <Suspense fallback={null}><CarpetPurchaseEditor /></Suspense>;
  if (industry?.id === 'electronics') return <Suspense fallback={null}><ElectronicsPurchaseEditor /></Suspense>;
  if (industry?.id === 'bookstore') return <PurchaseEditorPage config={BOOKSTORE_EDITOR} />;
  return <PurchaseEditorPage />;
}
