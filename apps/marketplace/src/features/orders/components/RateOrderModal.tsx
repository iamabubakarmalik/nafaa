import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Star } from 'lucide-react';
import { ordersApi } from '../api/orders.api';
import { Button, Card } from '@/ui';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

interface Props {
  orderId: string;
  onClose: () => void;
}

export function RateOrderModal({ orderId, onClose }: Props) {
  const qc = useQueryClient();
  const [shopRating, setShopRating] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [comment, setComment] = useState('');

  const rateMutation = useMutation({
    mutationFn: () => ordersApi.rate(orderId, {
      shopRating,
      riderRating: riderRating || undefined,
      qualityRating: qualityRating || undefined,
      comment: comment || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Thanks for your review! 5 loyalty points earned 🎉');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div>
      <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">{label}</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className="transition hover:scale-110"
          >
            <Star className={cn(
              'h-8 w-8',
              s <= value ? 'fill-amber-400 text-amber-400' : 'text-content-subtle',
            )} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <Card className="max-w-md w-full p-5 space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-black text-lg">Rate your order</h3>
            <p className="text-xs text-content-muted">Earn 5 loyalty points ⭐</p>
          </div>
          <button onClick={onClose} className="text-content-subtle hover:text-content">
            <X className="h-5 w-5" />
          </button>
        </div>

        <StarRating value={shopRating} onChange={setShopRating} label="Shop rating (required)" />
        <StarRating value={riderRating} onChange={setRiderRating} label="Rider (optional)" />
        <StarRating value={qualityRating} onChange={setQualityRating} label="Product quality (optional)" />

        <div>
          <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
            Comment (optional)
          </div>
          <textarea
            placeholder="Share your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border border-border bg-surface text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 resize-none"
          />
        </div>

        <Button
          variant="gradient"
          size="lg"
          fullWidth
          disabled={!shopRating}
          loading={rateMutation.isPending}
          onClick={() => rateMutation.mutate()}
        >
          Submit review
        </Button>
      </Card>
    </div>
  );
}
