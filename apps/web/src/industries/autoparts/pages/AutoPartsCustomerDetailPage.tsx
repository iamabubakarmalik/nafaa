import { Navigate, useParams } from 'react-router-dom';

/** Customer detail lives in the shared directory; this old page only forwards there. */
export default function AutoPartsCustomerDetailPage() {
  const { id } = useParams();
  return <Navigate to={id ? `/customers/${id}` : '/customers'} replace />;
}
