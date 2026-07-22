import { Navigate, useParams } from 'react-router-dom';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import ProductFormPage from './ProductFormPage';

/**
 * ProductFormGate — routes /products/new and /products/:id/edit to the
 * correct industry-specific wizard page.
 *
 * Every industry that has a dedicated wizard file is routed here.
 * Any industry not listed falls through to the generic ProductFormPage
 * (which already renders industry-specific plugin slots).
 */
export default function ProductFormGate() {
  const industry = useCurrentIndustry();
  const { id } = useParams();
  const edit = Boolean(id);

  switch (industry?.id) {
    case 'carpet':
      return <Navigate to={edit ? `/carpet-products/${id}/edit` : '/carpet-products/new'} replace />;
    case 'mobile':
      return <Navigate to={edit ? `/mobile-products/${id}/edit` : '/mobile-products/new'} replace />;
    case 'retail':
      return <Navigate to={edit ? `/retail-products/${id}/edit` : '/retail-products/new'} replace />;
    case 'restaurant':
      return <Navigate to={edit ? `/restaurant-menu-items/${id}/edit` : '/restaurant-menu-items/new'} replace />;
    case 'pharmacy':
      return <Navigate to={edit ? `/pharmacy-medicines/${id}/edit` : '/pharmacy-medicines/new'} replace />;
    case 'bakery':
      return <Navigate to={edit ? `/bakery-products/${id}/edit` : '/bakery-products/new'} replace />;
    case 'garments':
      return <Navigate to={edit ? `/garment-products/${id}/edit` : '/garment-products/new'} replace />;
    case 'jewelry':
      return <Navigate to={edit ? `/jewelry-items/${id}/edit` : '/jewelry-items/new'} replace />;
    case 'hardware':
      return <Navigate to={edit ? `/hardware-products/${id}/edit` : '/hardware-products/new'} replace />;
    case 'dairy':
      return <Navigate to={edit ? `/dairy-products/${id}/edit` : '/dairy-products/new'} replace />;
    case 'meat':
      return <Navigate to={edit ? `/meat-products/${id}/edit` : '/meat-products/new'} replace />;
    case 'agri':
      return <Navigate to={edit ? `/agri-products/${id}/edit` : '/agri-products/new'} replace />;
    case 'autoparts':
      return <Navigate to={edit ? `/autoparts-parts/${id}/edit` : '/autoparts-parts/new'} replace />;
    case 'bookstore':
      return <Navigate to={edit ? `/bookstore-products/${id}/edit` : '/bookstore-products/new'} replace />;
    case 'salon':
      return <Navigate to={edit ? `/salon-services/${id}/edit` : '/salon-services/new'} replace />;
    case 'hotel':
      return <Navigate to={edit ? `/hotel-room-types/${id}/edit` : '/hotel-room-types/new'} replace />;
    case 'clinic':
      return <Navigate to={edit ? `/clinic-services/${id}/edit` : '/clinic-services/new'} replace />;
    default:
      // clinic, gym, services-biz — no wizard yet, use generic form
      return <ProductFormPage />;
  }
}
