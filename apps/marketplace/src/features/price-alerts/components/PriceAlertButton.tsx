import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellRing, TrendingDown, X } from 'lucide-react';
import { priceAlertsApi } from '../api/price-alerts.api';
import { Button, Card, Input } from '@/ui';
import { formatPrice } from '@/lib/format';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';

interface Props {
  productId: string;
  currentPrice: number;
  productName: string;
}

export function PriceAlertButton({ productId, currentPrice, productName }: Props) {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [targetPrice, setTargetPrice] = useState(Math.round(currentPrice * 0.85));

  const { data: alerts } = useQuery({
    queryKey: ['price-alerts'],
    queryFn: priceAlertsApi.list,
    enabled: isAuth,
  });

  const existingAlert = alerts?.find((a: any) => a.productId === productId);

  const createMutation = useMutation({
    mutationFn: () => priceAlertsApi.create(productId, targetPrice),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-alerts'] });
      toast.success(`Alert set! We'll notify you when price drops below ${formatPrice(targetPrice)} 🔔`);
      setShowModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => priceAlertsApi.delete(existingAlert!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-alerts'] });
      toast.success('Alert removed');
      setShowModal(false);
    },
  });

  const handleClick = () => {
    if (!isAuth) {
      toast.error('Please login to set price alerts');
      return;
    }
    setShowModal(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-2 h-11 px-4 rounded-2xl text-sm font-bold transition ${
          existingAlert
            ? 'bg-accent-500 text-white'
            : 'bg-surface hover:bg-surface-muted border border-border text-content'
        }`}
      >
        {existingAlert ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {existingAlert ? `Alert @ ${formatPrice(existingAlert.targetPrice)}` : 'Price alert'}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <Card className="max-w-sm w-full p-5 space-y-4 animate-scale-in">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-500 to-orange-600 flex items-center justify-center animate-bounce-soft">
                  <BellRing className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-lg">Price alert</h3>
                  <p className="text-xs text-content-muted">Notify me when price drops</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-content-subtle hover:text-content">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-surface-muted">
              <div className="text-2xs text-content-muted font-bold uppercase">Current price</div>
              <div className="text-xl font-black">{formatPrice(currentPrice)}</div>
              <div className="text-xs text-content-muted line-clamp-1 mt-1">{productName}</div>
            </div>

            <div>
              <label className="text-xs font-black text-content-muted uppercase tracking-wider mb-2 block">
                Notify me when price drops to
              </label>
              <Input
                type="number"
                inputSize="lg"
                value={targetPrice}
                onChange={(e) => setTargetPrice(Number(e.target.value))}
                leftIcon={<TrendingDown className="h-4 w-4" />}
              />
              <input
                type="range"
                min={Math.round(currentPrice * 0.3)}
                max={currentPrice - 1}
                step={10}
                value={targetPrice}
                onChange={(e) => setTargetPrice(Number(e.target.value))}
                className="w-full mt-3 accent-accent-500"
              />
              <div className="text-2xs text-brand-600 font-bold mt-1">
                Save {formatPrice(currentPrice - targetPrice)} ({Math.round(((currentPrice - targetPrice) / currentPrice) * 100)}% off)
              </div>
            </div>

            <div className="flex gap-2">
              {existingAlert ? (
                <>
                  <Button variant="ghost" size="lg" fullWidth onClick={() => deleteMutation.mutate()} className="text-danger">
                    Remove
                  </Button>
                  <Button variant="gradient" size="lg" fullWidth onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
                    Update
                  </Button>
                </>
              ) : (
                <Button variant="gradient" size="lg" fullWidth onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
                  Set alert
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
