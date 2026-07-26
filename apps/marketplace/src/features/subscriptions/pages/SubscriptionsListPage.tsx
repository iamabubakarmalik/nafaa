import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, RefreshCw, Pause, Play, XCircle, SkipForward,
  Calendar, Package, Sparkles, Store,
} from 'lucide-react';
import { subscriptionsApi } from '../api/subscriptions.api';
import { Card, Badge, Button, EmptyState } from '@/ui';
import { formatPrice } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Every 2 weeks',
  MONTHLY: 'Monthly',
  CUSTOM_DAYS: 'Custom',
};

const STATUS_STYLES: Record<string, any> = {
  ACTIVE: { color: 'success', icon: RefreshCw, label: 'Active' },
  PAUSED: { color: 'warning', icon: Pause, label: 'Paused' },
  CANCELLED: { color: 'danger', icon: XCircle, label: 'Cancelled' },
  EXPIRED: { color: 'default', icon: XCircle, label: 'Expired' },
};

export default function SubscriptionsListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: subscriptionsApi.list,
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => subscriptionsApi.pause(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Subscription paused');
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => subscriptionsApi.resume(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Subscription resumed');
    },
  });

  const skipMutation = useMutation({
    mutationFn: (id: string) => subscriptionsApi.skipNext(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Next delivery skipped');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => subscriptionsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Subscription cancelled');
    },
  });

  return (
    <>
      <Helmet><title>Subscribe & Save — Nafaa Bazaar</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-5">
        <button
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </button>

        <Card className="p-6 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-xs font-black mb-3">
              <RefreshCw className="h-3.5 w-3.5" />
              Subscribe & Save 5%
            </div>
            <h1 className="text-2xl md:text-3xl font-black">Recurring Deliveries</h1>
            <p className="text-white/90 text-sm md:text-base mt-1">
              Daily roti, monthly groceries, weekly dairy — never run out
            </p>
          </div>
        </Card>

        {isLoading ? (
          <div className="skeleton h-96 rounded-3xl" />
        ) : !data?.length ? (
          <EmptyState
            icon={RefreshCw}
            title="No active subscriptions"
            description="Save 5% on regularly-purchased items with automatic deliveries"
            action={<Button variant="gradient" onClick={() => navigate('/')}>Browse products</Button>}
          />
        ) : (
          <div className="space-y-3">
            {data.map((sub: any) => {
              const status = STATUS_STYLES[sub.status] || STATUS_STYLES.ACTIVE;
              const StatusIcon = status.icon;
              const nextDate = new Date(sub.nextDeliveryAt);
              const daysUntil = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

              return (
                <Card key={sub.id} className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <RefreshCw className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-black">{FREQ_LABELS[sub.frequency]}</div>
                        <div className="text-2xs text-content-muted">
                          {sub.items?.length} items · Save {sub.discountPercent || 5}%
                        </div>
                      </div>
                    </div>
                    <Badge variant={status.color} size="md">
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  </div>

                  {/* Items preview */}
                  <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
                    {sub.items?.slice(0, 4).map((item: any, i: number) => (
                      <div key={i} className="h-14 w-14 rounded-xl bg-surface-muted overflow-hidden shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-content-subtle" />
                          </div>
                        )}
                      </div>
                    ))}
                    {sub.items?.length > 4 && (
                      <div className="h-14 w-14 rounded-xl bg-surface-muted flex items-center justify-center text-xs font-black text-content-muted shrink-0">
                        +{sub.items.length - 4}
                      </div>
                    )}
                  </div>

                  {/* Next delivery */}
                  {sub.status === 'ACTIVE' && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 mb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-emerald-600" />
                          <div>
                            <div className="text-xs font-black">Next delivery</div>
                            <div className="text-2xs text-content-muted">
                              {nextDate.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })}
                              {daysUntil <= 3 && ` · ${daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-content-muted">Total</div>
                          <div className="font-black text-emerald-600">
                            {formatPrice(sub.items?.reduce((s: number, i: any) => s + Number(i.unitPrice) * i.quantity, 0) * 0.95)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {sub.status === 'ACTIVE' && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => skipMutation.mutate(sub.id)}
                          leftIcon={<SkipForward className="h-3.5 w-3.5" />}
                        >
                          Skip next
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => pauseMutation.mutate(sub.id)}
                          leftIcon={<Pause className="h-3.5 w-3.5" />}
                        >
                          Pause
                        </Button>
                      </>
                    )}
                    {sub.status === 'PAUSED' && (
                      <Button
                        variant="gradient"
                        size="sm"
                        onClick={() => resumeMutation.mutate(sub.id)}
                        leftIcon={<Play className="h-3.5 w-3.5" />}
                      >
                        Resume
                      </Button>
                    )}
                    {sub.status !== 'CANCELLED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelMutation.mutate(sub.id)}
                        className="text-danger hover:bg-danger/10 ml-auto"
                        leftIcon={<XCircle className="h-3.5 w-3.5" />}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
