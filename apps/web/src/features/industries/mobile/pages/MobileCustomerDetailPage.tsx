import CustomerDetailPage from '@/features/customers/pages/CustomerDetailPage';

/**
 * MobileCustomerDetailPage — the generic CustomerDetailPage already has
 * Mobile History tab (CustomerMobileHistory) which shows IMEI list,
 * warranty status, EMI plans, repair history — all handled by the
 * `hasMobile` feature flag inside CustomerDetailPage.
 *
 * We reuse it directly so the mobile industry gets that full built-in
 * experience without duplication.
 */
export default function MobileCustomerDetailPage() {
  return <CustomerDetailPage />;
}
