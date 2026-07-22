import CustomerDetailPage from '@modules/customers/customers/pages/CustomerDetailPage';

/**
 * GarmentCustomerDetailPage — reuses generic CustomerDetailPage which
 * automatically shows garment-specific measurements + tailoring history
 * via industry pack slots (hasGarments feature flag).
 */
export default function GarmentCustomerDetailPage() {
  return <CustomerDetailPage />;
}
