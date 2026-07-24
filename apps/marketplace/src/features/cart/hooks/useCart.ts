import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { cartApi, AddToCartPayload } from '../api/cart.api';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';

export function useCart() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const setTotalItems = useCartStore((s) => s.setTotalItems);

  const query = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.get,
    enabled: isAuth,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (query.data) setTotalItems(query.data.totalItems);
  }, [query.data, setTotalItems]);

  return query;
}

export function useCartCount() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const setTotalItems = useCartStore((s) => s.setTotalItems);

  return useQuery({
    queryKey: ['cart-count'],
    queryFn: async () => {
      const r = await cartApi.count();
      setTotalItems(r.count);
      return r;
    },
    enabled: isAuth,
    refetchInterval: 60_000,
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const setTotalItems = useCartStore((s) => s.setTotalItems);

  return useMutation({
    mutationFn: (payload: AddToCartPayload) => {
      if (!isAuth) {
        toast.error('Please login to add to cart');
        window.location.href = '/login';
        throw new Error('not-authed');
      }
      return cartApi.add(payload);
    },
    onSuccess: (cart) => {
      qc.setQueryData(['cart'], cart);
      setTotalItems(cart.totalItems);
      toast.success('Added to cart! 🛒');
    },
    onError: (e: any) => {
      if (e.message === 'not-authed') return;
      toast.error(e?.response?.data?.message || 'Could not add to cart');
    },
  });
}

export function useUpdateCartLine() {
  const qc = useQueryClient();
  const setTotalItems = useCartStore((s) => s.setTotalItems);
  return useMutation({
    mutationFn: ({ lineId, data }: { lineId: string; data: any }) => cartApi.updateLine(lineId, data),
    onSuccess: (cart) => {
      qc.setQueryData(['cart'], cart);
      setTotalItems(cart.totalItems);
    },
  });
}

export function useRemoveCartLine() {
  const qc = useQueryClient();
  const setTotalItems = useCartStore((s) => s.setTotalItems);
  return useMutation({
    mutationFn: (lineId: string) => cartApi.removeLine(lineId),
    onSuccess: (cart) => {
      qc.setQueryData(['cart'], cart);
      setTotalItems(cart.totalItems);
      toast.success('Item removed');
    },
  });
}

export function useClearCart() {
  const qc = useQueryClient();
  const setTotalItems = useCartStore((s) => s.setTotalItems);
  return useMutation({
    mutationFn: cartApi.clear,
    onSuccess: (cart) => {
      qc.setQueryData(['cart'], cart);
      setTotalItems(0);
      toast.success('Cart cleared');
    },
  });
}

export function useClearShopCart() {
  const qc = useQueryClient();
  const setTotalItems = useCartStore((s) => s.setTotalItems);
  return useMutation({
    mutationFn: (shopId: string) => cartApi.clearShop(shopId),
    onSuccess: (cart) => {
      qc.setQueryData(['cart'], cart);
      setTotalItems(cart.totalItems);
    },
  });
}

export function useMoveToWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lineId: string) => cartApi.moveToWishlist(lineId),
    onSuccess: (cart) => {
      qc.setQueryData(['cart'], cart);
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success('Moved to wishlist ❤️');
    },
  });
}
