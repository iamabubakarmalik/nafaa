'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import type { ProductCard } from '@/lib/api';
import { useStore } from '../providers/StoreProvider';

/** Pick-and-add bundle. Products with options link to their page instead of adding blindly. */
export function BoughtTogetherClient({ items }: { items: ProductCard[] }) {
  const { money, t, addMany, busy, href } = useStore();
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(items.map((p) => [p.id, !p.hasVariants])));
  const chosen = items.filter((p) => on[p.id]);
  const total = chosen.reduce((s, p) => s + p.price, 0);
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center">
      <div className="flex flex-1 items-center gap-2 overflow-x-auto no-scrollbar">
        {items.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2">
            {i > 0 && <Plus size={18} className="shrink-0 text-muted" />}
            <Link href={href(p.url)} className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-[calc(var(--r-card)*0.6)] bg-surface md:w-32">
              {p.image && <Image src={p.image.url} alt={p.title} fill sizes="128px" className="object-cover" />}
            </Link>
          </div>
        ))}
      </div>
      <div className="md:w-72">
        <ul className="space-y-2">
          {items.map((p, i) => (
            <li key={p.id}>
              <label className={`flex items-start gap-2.5 text-[13.5px] ${p.hasVariants ? 'opacity-60' : ''}`}>
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[rgb(var(--c-primary))]" checked={!!on[p.id]} disabled={(i === 0 && !p.hasVariants) || p.hasVariants} onChange={(e) => setOn({ ...on, [p.id]: e.target.checked })} />
                <span className="flex-1">
                  {i === 0 ? <b>{p.title}</b> : p.title}
                  {p.hasVariants && i > 0 && (
                    <Link href={href(p.url)} className="ms-1 underline">
                      ({t('product.choose', { name: '' }).trim()})
                    </Link>
                  )}
                </span>
                <span className="font-semibold tabular-nums">{money(p.price)}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-[14px]">{t('product.total')}</span>
          <span className="text-lg font-semibold">{money(total)}</span>
        </div>
        <button
          type="button"
          disabled={busy || !chosen.length}
          className="btn btn-primary btn-block mt-3"
          onClick={() => addMany(chosen.map((p) => ({ productId: p.id, variantId: p.firstVariantId, quantity: 1, title: p.title, price: p.price })))}
        >
          <Check size={17} /> {t('product.addAll', { n: chosen.length })}
        </button>
      </div>
    </div>
  );
}
