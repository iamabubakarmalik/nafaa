import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, Minus, Plus, AlertTriangle } from 'lucide-react';
import { Button, Badge } from '@/ui';
import { formatPrice } from '@/lib/format';
import { useMoveToWishlist, useRemoveCartLine, useUpdateCartLine } from '../hooks/useCart';
import { cn } from '@/lib/cn';
import type { CartLine } from '@/types';

export function CartLineRow({ line }: { line: CartLine }) {
  const [qty, setQty] = useState(line.quantity);
  const updateLine = useUpdateCartLine();
  const removeLine = useRemoveCartLine();
  const moveToWishlist = useMoveToWishlist();

  const updateQty = (newQty: number) => {
    if (newQty < 1) return;
    setQty(newQty);
    updateLine.mutate({ lineId: line.id, data: { quantity: newQty } });
  };

  return (
    <div className={cn('flex gap-3 py-4', !line.stillAvailable && 'opacity-60')}>
      <Link to={`/products/${line.productId}`} className="shrink-0">
        <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-surface-muted overflow-hidden">
          {line.imageUrl ? (
            <img src={line.imageUrl} alt={line.productName} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-content-subtle">
              📦
            </div>
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <Link to={`/products/${line.productId}`}>
          <h4 className="font-bold text-content text-sm md:text-base line-clamp-2 hover:text-brand-600 transition">
            {line.productName}
          </h4>
        </Link>
        {line.variantName && (
          <div className="text-xs text-content-muted mt-0.5">{line.variantName}</div>
        )}

        {/* Feature badges */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {line.bargainId && <Badge variant="accent" size="sm">Bargained</Badge>}
          {line.groupBuyId && <Badge variant="info" size="sm">Group Buy</Badge>}
          {line.priceChanged && (
            <Badge variant="warning" size="sm">
              <AlertTriangle className="h-3 w-3" />
              Price changed
            </Badge>
          )}
          {!line.stillAvailable && (
            <Badge variant="danger" size="sm">Unavailable</Badge>
          )}
        </div>

        {line.notes && (
          <div className="text-xs text-content-muted mt-1 italic line-clamp-1">
            Note: {line.notes}
          </div>
        )}

        {/* Bottom row: price + qty */}
        <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
          <div>
            <div className="font-black text-brand-600 dark:text-brand-400 text-base md:text-lg">
              {formatPrice(line.lineTotal)}
            </div>
            {line.quantity > 1 && (
              <div className="text-2xs text-content-muted">
                {formatPrice(line.unitPrice)} × {line.quantity}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center bg-surface rounded-xl border border-border">
              <button
                onClick={() => updateQty(qty - 1)}
                disabled={updateLine.isPending}
                className="h-9 w-9 flex items-center justify-center hover:bg-surface-muted rounded-l-xl disabled:opacity-50"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-10 text-center font-black text-sm tabular-nums">
                {qty}
              </span>
              <button
                onClick={() => updateQty(qty + 1)}
                disabled={updateLine.isPending}
                className="h-9 w-9 flex items-center justify-center hover:bg-surface-muted rounded-r-xl disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              onClick={() => moveToWishlist.mutate(line.id)}
              className="h-9 w-9 rounded-xl hover:bg-danger/10 text-content-muted hover:text-danger transition flex items-center justify-center"
              title="Move to wishlist"
            >
              <Heart className="h-4 w-4" />
            </button>

            <button
              onClick={() => removeLine.mutate(line.id)}
              className="h-9 w-9 rounded-xl hover:bg-danger/10 text-content-muted hover:text-danger transition flex items-center justify-center"
              title="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
