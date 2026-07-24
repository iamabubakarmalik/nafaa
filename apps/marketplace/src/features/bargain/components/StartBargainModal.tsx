import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { X, MessageCircle, TrendingDown, Info } from 'lucide-react';
import { bargainApi } from '../api/bargain.api';
import { Button, Card, Input } from '@/ui';
import { formatPrice } from '@/lib/format';
import { toast } from 'sonner';

interface Props {
  productId: string;
  productName: string;
  originalPrice: number;
  minPrice?: number;
  imageUrl?: string;
  onClose: () => void;
}

export function StartBargainModal({ productId, productName, originalPrice, minPrice, imageUrl, onClose }: Props) {
  const navigate = useNavigate();
  const suggestedMin = minPrice ?? originalPrice * 0.8;
  const [offer, setOffer] = useState<number>(Math.round(suggestedMin * 1.05));
  const [message, setMessage] = useState('');
  const [quantity, setQuantity] = useState(1);

  const savings = originalPrice - offer;
  const savingsPct = Math.round((savings / originalPrice) * 100);

  const startMutation = useMutation({
    mutationFn: () => bargainApi.start({ productId, offerPrice: offer, quantity, message: message || undefined }),
    onSuccess: (b) => {
      toast.success('Offer sent! Wait for shop response');
      onClose();
      navigate(`/bargain/${b.id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <Card className="max-w-md w-full p-5 space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">Make an offer</h3>
              <p className="text-xs text-content-muted">Bargain with the shop</p>
            </div>
          </div>
          <button onClick={onClose} className="text-content-subtle hover:text-content">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Product preview */}
        <div className="flex gap-3 p-3 rounded-2xl bg-surface-muted">
          {imageUrl && (
            <img src={imageUrl} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm line-clamp-2">{productName}</div>
            <div className="text-xs text-content-muted mt-1">
              Listed at <span className="font-black text-content">{formatPrice(originalPrice)}</span>
            </div>
          </div>
        </div>

        {/* Offer input */}
        <div>
          <label className="block text-xs font-black text-content-muted uppercase tracking-wider mb-2">
            Your offer (PKR)
          </label>
          <Input
            type="number"
            inputSize="lg"
            value={offer}
            onChange={(e) => setOffer(Number(e.target.value))}
            leftIcon={<TrendingDown className="h-4 w-4" />}
            placeholder="Enter your offer"
          />
          <input
            type="range"
            min={suggestedMin}
            max={originalPrice - 1}
            step={10}
            value={offer}
            onChange={(e) => setOffer(Number(e.target.value))}
            className="w-full mt-3 accent-accent-500"
          />
          <div className="flex justify-between text-2xs text-content-subtle mt-1 font-bold">
            <span>Min: {formatPrice(suggestedMin)}</span>
            <span>Max: {formatPrice(originalPrice - 1)}</span>
          </div>
        </div>

        {/* Savings display */}
        {offer > 0 && offer < originalPrice && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-brand-50 to-emerald-50 dark:from-brand-950/40 dark:to-emerald-950/30 border border-brand-200 dark:border-brand-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-content-muted uppercase">You save</span>
              <span className="text-lg font-black gradient-text">
                {formatPrice(savings)} ({savingsPct}%)
              </span>
            </div>
          </div>
        )}

        {/* Quantity */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-black text-content-muted uppercase tracking-wider">Quantity</span>
          <div className="inline-flex items-center bg-surface rounded-xl border border-border">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="h-10 w-10 font-black hover:bg-surface-muted rounded-l-xl"
            >
              −
            </button>
            <span className="w-12 text-center font-black tabular-nums">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="h-10 w-10 font-black hover:bg-surface-muted rounded-r-xl"
            >
              +
            </button>
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-black text-content-muted uppercase tracking-wider mb-2">
            Message to shop (optional)
          </label>
          <textarea
            placeholder="e.g. Bulk order for family event..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            maxLength={200}
            className="w-full px-4 py-3 rounded-2xl border border-border bg-surface text-sm focus:outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/10 resize-none"
          />
        </div>

        <div className="flex items-start gap-2 text-2xs text-content-muted p-2 rounded-xl bg-surface-muted">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-info" />
          <span>Shop will respond within 24 hours. You'll get a notification when they reply.</span>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="lg" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="accent"
            size="lg"
            fullWidth
            disabled={!offer || offer >= originalPrice}
            loading={startMutation.isPending}
            onClick={() => startMutation.mutate()}
          >
            Send offer
          </Button>
        </div>
      </Card>
    </div>
  );
}
