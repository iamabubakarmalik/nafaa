'use client';
/** Options sheet on shop pages: loads the product's lines and shows ProductOptions. */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { Img, Price, Sheet, Skeleton } from '@/components/ui';
import { GATE_LOOK } from '@/lib/site';
import type { Flow, Gate, ProductDetail, ProductSummary } from '@/lib/types';
import { GateIcon } from './GateIcon';
import { ProductOptions } from './ProductOptions';

export function ProductSheet({ product, gate, flow, onClose }: { product: ProductSummary | null; gate: Gate; flow: Flow; onClose: () => void }) {
  const { t, href } = useApp();
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setDetail(null);
    setFailed(false);
    if (!product) return;
    let live = true;
    fetch(`/api/p/${encodeURIComponent(product.productId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => live && setDetail(j.data))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [product]);

  return (
    <Sheet open={!!product} onClose={onClose} closeLabel={t('common.close')} title={product?.name}>
      {product && (
        <div className="space-y-4">
          <Img src={detail?.images[0] ?? product.image} alt={product.name} color={GATE_LOOK[gate].color} className="aspect-[16/10] rounded-2xl" sizes="(max-width: 768px) 100vw, 512px" fallback={<GateIcon gate={gate} className="h-12 w-12 opacity-50" />} />
          <div>
            <Price value={product.price} compareAt={product.compareAt} max={product.priceMax} size="lg" />
            {product.description && <p className="mt-1 text-sm text-gray-600">{product.description}</p>}
            <Link href={href(`/p/${product.productId}`)} className="mt-1 inline-block text-xs font-semibold text-brand-700 hover:underline">{t('product.description')}</Link>
          </div>
          {detail ? (
            <ProductOptions product={detail} flow={flow} onAdded={onClose} />
          ) : failed ? (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{t('common.networkError')}</p>
          ) : (
            <div className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-12" /></div>
          )}
        </div>
      )}
    </Sheet>
  );
}
