import CustomerDetailPage from '@/features/customers/pages/CustomerDetailPage';

/**
 * PharmacyCustomerDetailPage — delegates to generic CustomerDetailPage.
 * Prescription history is shown via industry pack slots in the base page.
 */
export default function PharmacyCustomerDetailPage() {
  return <CustomerDetailPage />;
}
