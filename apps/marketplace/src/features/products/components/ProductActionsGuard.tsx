/**
 * Small barrel — wraps common product actions with auth guard.
 * Import in ProductDetailPage.tsx and replace direct mutation calls.
 */
import { useAuthAction } from '@/hooks/useAuthAction';

export function useProductActions() {
  const runAuthed = useAuthAction();

  return {
    guardAddToCart: (fn: () => void) => runAuthed(fn, 'add to cart'),
    guardWishlist: (fn: () => void) => runAuthed(fn, 'add to wishlist'),
    guardBargain: (fn: () => void) => runAuthed(fn, 'start a bargain'),
    guardQuestion: (fn: () => void) => runAuthed(fn, 'ask a question'),
    guardPriceAlert: (fn: () => void) => runAuthed(fn, 'set price alert'),
    guardRestock: (fn: () => void) => runAuthed(fn, 'get restock alert'),
    guardCompare: (fn: () => void) => runAuthed(fn, 'compare products'),
  };
}
