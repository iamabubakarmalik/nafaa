import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { wishlistApi, ListWishlistParams } from '../api/wishlist.api';
import { useAuthStore } from '@/stores/auth.store';

export function useWishlist(params: ListWishlistParams = {}) {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['wishlist', params],
    queryFn: () => wishlistApi.list(params),
    enabled: isAuth,
  });
}

export function useWishlistCount() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['wishlist-count'],
    queryFn: wishlistApi.count,
    enabled: isAuth,
  });
}

export function useToggleWishlist() {
  const qc = useQueryClient();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  return useMutation({
    mutationFn: (productId: string) => {
      if (!isAuth) {
        toast.error('Please login first');
        window.location.href = '/login';
        throw new Error('not-authed');
      }
      return wishlistApi.toggle(productId);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      qc.invalidateQueries({ queryKey: ['wishlist-count'] });
      qc.invalidateQueries({ queryKey: ['product-detail'] });
      toast.success(data.isInWishlist ? 'Added to wishlist ❤️' : 'Removed from wishlist');
    },
    onError: (e: any) => {
      if (e.message === 'not-authed') return;
      toast.error(e?.response?.data?.message || 'Failed');
    },
  });
}

export function useMoveWishlistToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity?: number }) =>
      wishlistApi.moveToCart(productId, quantity),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      qc.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Moved to cart 🛒');
    },
  });
}
