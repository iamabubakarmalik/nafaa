import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Zap, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { emergencyDeliveryApi } from '../api/emergency-delivery.api';
import { Button, Card } from '@/ui';
import { formatPrice } from '@/lib/format';
import { toast } from 'sonner';

interface Props {
  orderId: string;
  orderTotal: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmergencyDeliveryModal({ orderId, orderTotal, onClose, onSuccess }: Props) {
  const [agreed, setAgreed] = useState(false);
  const surcharge = orderTotal * 0.15;

  const requestMutation = useMutation({
    mutationFn: () => emergencyDeliveryApi.request(orderId),
    onSuccess: () => {
      toast.success('Emergency delivery activated! ⚡');
      onSuccess();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <Card className="max-w-md w-full p-5 space-y-4 animate-scale-in">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center animate-pulse-soft">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">Emergency 30-min Delivery</h3>
              <p className="text-xs text-content-muted">Priority delivery guaranteed</p>
            </div>
          </div>
          <button onClick={onClose} className="text-content-subtle hover:text-content">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Benefits */}
        <div className="space-y-2">
          {[
            { icon: Clock, label: 'Delivered within 30 minutes', color: 'from-orange-500 to-red-500' },
            { icon: Zap, label: 'Skip the queue — priority handling', color: 'from-amber-500 to-orange-500' },
            { icon: ShieldCheck, label: 'Late? Surcharge refunded automatically', color: 'from-brand-500 to-emerald-600' },
          ].map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-muted">
                <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${b.color} flex items-center justify-center shrink-0`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-bold">{b.label}</span>
              </div>
            );
          })}
        </div>

        {/* Cost breakdown */}
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-orange-200 dark:border-orange-800">
          <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
            Extra cost
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-content-muted">Order total</span>
              <span className="font-bold">{formatPrice(orderTotal)}</span>
            </div>
            <div className="flex justify-between text-orange-700 dark:text-orange-400">
              <span className="font-bold">+ Emergency surcharge (15%)</span>
              <span className="font-black">{formatPrice(surcharge)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-orange-200 dark:border-orange-800">
              <span className="font-black">New total</span>
              <span className="text-lg font-black text-orange-700 dark:text-orange-400">
                {formatPrice(orderTotal + surcharge)}
              </span>
            </div>
          </div>
        </Card>

        <label className="flex items-start gap-2 cursor-pointer p-3 rounded-xl bg-surface-muted">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="h-4 w-4 mt-0.5 rounded"
          />
          <span className="text-xs text-content">
            I understand the extra <b>{formatPrice(surcharge)}</b> charge for 30-min delivery.
            If delivered late, this amount will be refunded to my wallet.
          </span>
        </label>

        <div className="flex gap-2">
          <Button variant="ghost" size="lg" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="lg"
            fullWidth
            disabled={!agreed}
            loading={requestMutation.isPending}
            onClick={() => requestMutation.mutate()}
            leftIcon={<Zap className="h-4 w-4" />}
          >
            Activate emergency
          </Button>
        </div>
      </Card>
    </div>
  );
}
