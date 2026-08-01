// apps/web/src/modules/inventory/products/pages/ProductFormGate.tsx
import { Navigate, useParams } from 'react-router-dom';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import ProductFormPage from './ProductFormPage';

/**
 * ProductFormGate — routes /products/new and /products/:id/edit to the
 * correct industry-specific wizard page.
 */
export default function ProductFormGate() {
  const industry = useCurrentIndustry();
  const { id } = useParams();
  const edit = Boolean(id);

  switch (industry?.id) {
    // ─── Original 19 ───
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

    // ─── 10 NEW ───
    case 'appliances':
      return <Navigate to={edit ? `/appliances-products/${id}/edit` : '/appliances-products/new'} replace />;
    case 'electronics':
      return <Navigate to={edit ? `/electronics-products/${id}/edit` : '/electronics-products/new'} replace />;
    case 'florist':
      return <Navigate to={edit ? `/florist-products/${id}/edit` : '/florist-products/new'} replace />;
    case 'furniture':
      return <Navigate to={edit ? `/furniture-products/${id}/edit` : '/furniture-products/new'} replace />;
    case 'gaming':
      return <Navigate to={edit ? `/gaming-products/${id}/edit` : '/gaming-products/new'} replace />;
    case 'optical':
      return <Navigate to={edit ? `/optical-products/${id}/edit` : '/optical-products/new'} replace />;
    case 'petshop':
      return <Navigate to={edit ? `/petshop-products/${id}/edit` : '/petshop-products/new'} replace />;
    case 'shoe':
      return <Navigate to={edit ? `/shoe-products/${id}/edit` : '/shoe-products/new'} replace />;
    case 'sports':
      return <Navigate to={edit ? `/sports-products/${id}/edit` : '/sports-products/new'} replace />;
    case 'toystore':
      return <Navigate to={edit ? `/toystore-products/${id}/edit` : '/toystore-products/new'} replace />;

    default:
      // gym, services-biz — no wizard yet, use generic form
      return <ProductFormPage />;
  }
}
