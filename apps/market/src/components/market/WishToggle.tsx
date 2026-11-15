'use client';
/** Save-for-later heart on the product page. */
import { useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { m } from '@/lib/client';
import { WishButton } from './ProductCard';

export function WishToggle({ productId }: { productId: string }) {
  const app = useApp();
  const [on, setOn] = useState(false);
  return (
    <WishButton
      active={on}
      label={on ? app.t('product.saved') : app.t('product.save')}
      onClick={async () => {
        if (!app.requireSignIn()) return;
        try {
          setOn(await m<boolean>(`wishlist/${productId}/toggle`, { body: {} }));
        } catch (e) {
          app.toast(app.errorText(e), 'error');
        }
      }}
    />
  );
}
