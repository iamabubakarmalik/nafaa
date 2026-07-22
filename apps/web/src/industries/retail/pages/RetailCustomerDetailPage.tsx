import CustomerDetailPage from '@modules/customers/customers/pages/CustomerDetailPage';

/**
 * RetailCustomerDetailPage — Retail is the closest to the generic customer flow
 * (loyalty, khata, combos already covered in CustomerDetailPage).
 * Delegates directly.
 */
export default function RetailCustomerDetailPage() {
  return <CustomerDetailPage />;
}
