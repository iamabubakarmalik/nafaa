'use client';

import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import type { Cart } from '@/lib/api';
import { sf } from '@/lib/client/sf';
import { useStore } from '@/components/providers/StoreProvider';

export function AdoptCart({ token, next }: { token: string; next: string }) {
  const router = useRouter();
  const { setCart } = useStore();
  useEffect(() => {
    sf<{ cart: Cart | null }>('cart.adopt', { token })
      .then((r) => {
        setCart(r.cart);
        router.replace(r.cart ? next : next.replace('/checkout', '/cart'));
      })
      .catch(() => router.replace(next.replace('/checkout', '/cart')));
  }, [token, next, router, setCart]);
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <Loader2 className="animate-spin text-muted" />
    </div>
  );
}
