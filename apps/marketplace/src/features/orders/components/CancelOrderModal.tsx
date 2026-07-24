import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, AlertTriangle } from 'lucide-react';
import { ordersApi } from '../api/orders.api';
import { Button, Card } from '@/ui';
import { toast } from 'sonner';

const REASONS = [
  'Changed my mind',
  'Ordered by mistake',
  'Found better price elsewhere',
  'Delivery taking too long',
  'Wrong items in order',
  'Other',
];

interface Props {
  orderId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelOrderModal({ orderId, onClose, onSuccess }: Props) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancel(orderId, reason === 'Other' ? customReason : reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success('Order cancelled. Refund initiated if applicable.');
      onSuccess();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to cancel'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <Card className="max-w-md w-full p-5 space-y-4 animate-scale-in">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-lg">Cancel order?</h3>
              <p className="text-xs text-content-muted">This can't be undone</p>
            </div>
          </div>
          <button onClick={onClose} className="text-content-subtle hover:text-content">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
            Reason for cancellation
          </div>
          <div className="space-y-1.5">
            {REASONS.map((r) => (
              <label
                key={r}
                className="flex items-center gap-3 p-3 rounded-xl border-2 border-border hover:border-brand-300 cursor-pointer transition"
                style={reason === r ? { borderColor: 'rgb(16 185 129)', background: 'rgb(16 185 129 / 0.05)' } : {}}
              >
                <input
                  type="radio"
                  name="cancel-reason"
                  value={r}
                  checked={reason === r}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-4 w-4 accent-brand-600"
                />
                <span className="text-sm font-bold">{r}</span>
              </label>
            ))}
            {reason === 'Other' && (
              <textarea
                placeholder="Please tell us why..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-border bg-surface text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 resize-none"
              />
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="lg" fullWidth onClick={onClose}>
            Keep order
          </Button>
          <Button
            variant="danger"
            size="lg"
            fullWidth
            disabled={!reason || (reason === 'Other' && !customReason)}
            loading={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
          >
            Cancel order
          </Button>
        </div>
      </Card>
    </div>
  );
}
