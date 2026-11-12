'use client';

import Link from 'next/link';
import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import type { ProductCard } from '@/lib/api';
import { useStore } from '../providers/StoreProvider';

/** One-tap add for products without variants; others link to the product page. */
export function QuickAdd({ p, url }: { p: ProductCard; url: string }) {
  const { add, t } = useStore();
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const cls = 'inline-flex h-9 shrink-0 items-center gap-1 rounded-btn bg-primary px-3 text-[13px] font-semibold text-primary-fg transition hover:brightness-110 disabled:opacity-60';
  if (p.hasVariants) {
    return (
      <Link href={url} prefetch={false} className={cls} aria-label={t('product.addToCart')}>
        <Plus size={16} strokeWidth={2.5} />
        <span className="hidden sm:inline">{t('product.add')}</span>
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      disabled={state === 'busy'}
      aria-label={t('product.addToCart')}
      onClick={async () => {
        setState('busy');
        const c = await add({ productId: p.id, variantId: p.firstVariantId, quantity: 1, title: p.title, price: p.price });
        setState(c ? 'done' : 'idle');
        if (c) setTimeout(() => setState('idle'), 1600);
      }}
    >
      {state === 'done' ? <Check size={16} strokeWidth={2.5} /> : <Plus size={16} strokeWidth={2.5} />}
      <span className="hidden sm:inline">{state === 'done' ? t('product.added') : t('product.add')}</span>
    </button>
  );
}
