import CustomerDetailPage from '@/features/customers/pages/CustomerDetailPage';

/**
 * AgriCustomerDetailPage — reuses generic detail with farmer data enrichment.
 * Farmer specific info (village, land, crops) already shown in AgriCustomersPage cards.
 */
export default function AgriCustomerDetailPage() {
  return <CustomerDetailPage />;
}
