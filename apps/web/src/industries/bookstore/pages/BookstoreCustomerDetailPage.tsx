import CustomerDetailPage from '@modules/customers/customers/pages/CustomerDetailPage';

/**
 * BookstoreCustomerDetailPage — Delegates to generic CustomerDetailPage.
 * Bookstore customers use standard loyalty + khata patterns.
 */
export default function BookstoreCustomerDetailPage() {
  return <CustomerDetailPage />;
}
