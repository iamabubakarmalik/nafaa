import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { X, Package, ShieldCheck, Clock, Info } from 'lucide-react';
import { tryBeforeBuyApi } from '../api/try-before-buy.api';
import { profileApi } from '@/features/profile/api/profile.api';
import { Button, Card } from '@/ui';
import { formatPrice } from '@/lib/format';
import { AddressSelector } from '@/features/checkout/components/AddressSelector';
import { toast } from 'sonner';
import type { CustomerAddress } from '@/types';

interface Props {
  productId: string;
  productName: string;
  productPrice: number;
  imageUrl?: string;
  onClose: () => void;
}

export function TryBeforeBuyModal({ productId, productName, productPrice, imageUrl, onClose }: Props) {
  const navigate = useNavigate();
  const [address, setAddress] = useState<CustomerAddress | null>(null);
  const [trialDays, setTrialDays] = useState(3);
  const [notes, setNotes] = useState('');
  const deposit = productPrice * 0.5;

  const requestMutation = useMutation({
    mutationFn: () => tryBeforeBuyApi.request({
      productId,
      addressId: address!.id,
      trialDays,
      customerNotes: notes || undefined,
    }),
    onSuccess: (req) => {
      toast.success('Trial request submitted! 🎉');
      onClose();
      navigate(`/try-before-buy/${req.id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <Card className="max-w-lg w-full max-h-[95vh] overflow-y-auto p-5 space-y-4 animate-scale-in">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">Try Before You Buy</h3>
              <p className="text-xs text-content-muted">Home trial with security deposit</p>
            </div>
          </div>
          <button onClick={onClose} className="text-content-subtle hover:text-content">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Product */}
        <div className="flex gap-3 p-3 rounded-2xl bg-surface-muted">
          {imageUrl && <img src={imageUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm line-clamp-2">{productName}</div>
            <div className="text-xs text-content-muted mt-1">
              Full price: <span className="font-black text-content">{formatPrice(productPrice)}</span>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-2">
          {[
            { icon: ShieldCheck, label: `Pay ${formatPrice(deposit)} security deposit (50%)` },
            { icon: Clock, label: `Try the product for ${trialDays} days at home` },
            { icon: Package, label: 'Keep it (deposit adjusted) or return for full refund' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-content">{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Trial days */}
        <div>
          <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
            Trial period
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[3, 5, 7].map((d) => (
              <button
                key={d}
                onClick={() => setTrialDays(d)}
                className={`h-12 rounded-xl border-2 text-sm font-black transition ${
                  trialDays === d
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400'
                    : 'border-border bg-surface hover:border-purple-300'
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>

        {/* Delivery address */}
        <div>
          <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
            Delivery address
          </div>
          <AddressSelector selectedId={address?.id} onSelect={setAddress} />
        </div>

        <div>
          <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
            Notes (optional)
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Need to try the fit"
            rows={2}
            className="w-full px-4 py-3 rounded-2xl border border-border bg-surface text-sm focus:outline-none focus:border-purple-500 resize-none"
          />
        </div>

        {/* Deposit breakdown */}
        <Card className="p-4 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
          <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
            Refundable deposit
          </div>
          <div className="text-2xl font-black text-purple-700 dark:text-purple-400">
            {formatPrice(deposit)}
          </div>
          <div className="text-2xs text-content-muted mt-1 flex items-start gap-1">
            <Info className="h-3 w-3 shrink-0 mt-0.5" />
            <span>If you keep the item, we'll charge the remaining {formatPrice(productPrice - deposit)}. If returned in good condition, full refund.</span>
          </div>
        </Card>

        <div className="flex gap-2">
          <Button variant="ghost" size="lg" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            size="lg"
            fullWidth
            disabled={!address}
            loading={requestMutation.isPending}
            onClick={() => requestMutation.mutate()}
          >
            Request trial
          </Button>
        </div>
      </Card>
    </div>
  );
}
