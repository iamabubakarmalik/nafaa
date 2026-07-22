import CustomerDetailPage from '@modules/customers/customers/pages/CustomerDetailPage';

/**
 * MeatCustomerDetailPage — Meat customer detail delegates to generic
 * CustomerDetailPage which already shows all orders + khata tracking.
 */
export default function MeatCustomerDetailPage() {
  return <CustomerDetailPage />;
}
