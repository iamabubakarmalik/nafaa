import { Navigate, useParams } from 'react-router-dom';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';

/**
 * ProductViewGate — routes /products/:id to the correct industry detail page.
 *
 * Every industry with a dedicated detail page is routed here.
 * Any industry not listed falls through to the generic edit form (which
 * then handles the render via ProductFormPage + plugin slots).
 */
export default function ProductViewGate() {
  const industry = useCurrentIndustry();
  const { id } = useParams();

  if (!id) return <Navigate to="/products" replace />;

  switch (industry?.id) {
    case 'carpet':
      return <Navigate to={`/carpet-products/${id}`} replace />;
    case 'mobile':
      return <Navigate to={`/mobile-products/${id}`} replace />;
    case 'retail':
      return <Navigate to={`/retail-products/${id}`} replace />;
    case 'restaurant':
      return <Navigate to={`/restaurant-menu-items/${id}`} replace />;
    case 'pharmacy':
      return <Navigate to={`/pharmacy-medicines/${id}`} replace />;
    case 'bakery':
      return <Navigate to={`/bakery-products/${id}`} replace />;
    case 'garments':
      return <Navigate to={`/garment-products/${id}`} replace />;
    case 'jewelry':
      return <Navigate to={`/jewelry-items/${id}`} replace />;
    case 'hardware':
      return <Navigate to={`/hardware-products/${id}`} replace />;
    case 'dairy':
      return <Navigate to={`/dairy-products/${id}`} replace />;
    case 'meat':
      return <Navigate to={`/meat-products/${id}`} replace />;
    case 'agri':
      return <Navigate to={`/agri-products/${id}`} replace />;
    case 'autoparts':
      return <Navigate to={`/autoparts-parts/${id}`} replace />;
    case 'bookstore':
      return <Navigate to={`/bookstore-products/${id}`} replace />;
    case 'salon':
      return <Navigate to={`/salon-services/${id}`} replace />;
    case 'hotel':
      return <Navigate to={`/hotel-room-types/${id}`} replace />;
    case 'clinic':
      return <Navigate to={`/clinic-services/${id}`} replace />;
    default:
      // clinic, gym, services-biz — no detail page yet, use generic edit form
      return <Navigate to={`/products/${id}/edit`} replace />;
  }
}
