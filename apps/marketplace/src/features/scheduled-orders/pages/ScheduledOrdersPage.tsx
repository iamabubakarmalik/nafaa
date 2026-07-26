import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, Calendar, Clock, Package, XCircle, RefreshCw,
  CheckCircle2, AlertTriangle, Edit3,
} from 'lucide-react';
import { scheduledOrdersApi } from '../api/scheduled-orders.api';
import { Card, Badge, Button, EmptyState } from '@/ui';
import { formatPrice } from '@/lib/format';
import { toast } from 'sonner';
import { useState } from 'react';

export default function ScheduledOrdersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['scheduled-orders'],
    queryFn: scheduledOrdersApi.list,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => scheduledOrdersApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduled-orders'] });
      toast.success('Scheduled order cancelled');
    },
  });

  const now = new Date();
  const upcoming = data?.filter((o) => new Date(o.scheduledFor) > now && o.status === 'PENDING') || [];
  const past = data?.filter((o) => new Date(o.scheduledFor) <= now || o.status !== 'PENDING') || [];

  return (
    <>
      <Helmet><title>Scheduled Orders — Nafaa Bazaar</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-5">
        <button
          onClick={() => navigate('/orders')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          All orders
        </button>

        <Card className="p-6 bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-xs font-black mb-3">
              <Calendar className="h-3.5 w-3.5" />
              Advance ordering
            </div>
            <h1 className="text-2xl md:text-3xl font-black">Scheduled Orders</h1>
            <p className="text-white/90 text-sm md:text-base mt-1">
              Plan ahead — order today, deliver tomorrow (or any day)
            </p>
          </div>
        </Card>

        {isLoading ? (
          <div className="skeleton h-96 rounded-3xl" />
        ) : !data?.length ? (
          <EmptyState
            icon={Calendar}
            title="No scheduled orders"
            description="Schedule orders in advance for special occasions or regular needs"
            action={<Button variant="gradient" onClick={() => navigate('/')}>Browse products</Button>}
          />
        ) : (
          <>
            {upcoming.length > 0 && (
              <section>
                <h3 className="text-lg font-black mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  Upcoming ({upcoming.length})
                </h3>
                <div className="space-y-3">
                  {upcoming.map((o) => (
                    <ScheduledCard key={o.id} order={o} onCancel={() => cancelMutation.mutate(o.id)} />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h3 className="text-lg font-black mb-3 flex items-center gap-2 text-content-muted">
                  <CheckCircle2 className="h-5 w-5" />
                  Past
                </h3>
                <div className="space-y-3">
                  {past.map((o) => (
                    <ScheduledCard key={o.id} order={o} isPast />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}

function ScheduledCard({ order, isPast, onCancel }: any) {
  const date = new Date(order.scheduledFor);
  const daysUntil = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const statusStyles: Record<string, any> = {
    PENDING: { color: 'info', label: 'Scheduled' },
    CONFIRMED: { color: 'brand', label: 'Confirmed' },
    EXECUTED: { color: 'success', label: 'Delivered' },
    CANCELLED: { color: 'danger', label: 'Cancelled' },
  };
  const status = statusStyles[order.status];

  return (
    <Card className={`p-4 ${isPast ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xs font-black text-content-subtle">#{order.orderNumber}</span>
            <Badge variant={status.color as any} size="sm">{status.label}</Badge>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black">{date.toLocaleDateString('en-PK', {
              weekday: 'short', day: 'numeric', month: 'short',
            })}</span>
            <span className="text-sm text-content-muted">
              {date.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>

          {!isPast && daysUntil > 0 && (
            <div className="text-xs text-purple-600 dark:text-purple-400 font-bold mt-1">
              {daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 text-xs">
            <Package className="h-3.5 w-3.5 text-content-muted" />
            <span className="text-content-muted">{order.items?.length || 0} items</span>
            <span className="text-content-subtle">·</span>
            <span className="font-black text-brand-600">{formatPrice(order.total)}</span>
          </div>
        </div>

        {!isPast && order.status === 'PENDING' && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={onCancel}
              className="h-9 w-9 rounded-xl hover:bg-danger/10 text-content-muted hover:text-danger flex items-center justify-center transition"
              title="Cancel"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
