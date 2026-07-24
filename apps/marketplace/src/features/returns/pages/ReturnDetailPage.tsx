import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, Package, CheckCircle2, Truck, RefreshCw, DollarSign,
  Clock, AlertTriangle,
} from 'lucide-react';
import { disputeApi } from '@/features/orders/api/dispute.api';
import { Card, Badge, EmptyState, Avatar } from '@/ui';
import { formatPrice, timeAgo } from '@/lib/format';
import { cn } from '@/lib/cn';

const RETURN_STEPS = [
  { key: 'REQUESTED',     label: 'Return requested',      icon: Clock },
  { key: 'APPROVED',      label: 'Approved by shop',      icon: CheckCircle2 },
  { key: 'PICKUP_ARRANGED', label: 'Pickup arranged',     icon: Truck },
  { key: 'IN_TRANSIT',    label: 'Item in transit',       icon: Truck },
  { key: 'RECEIVED',      label: 'Received & inspected',  icon: Package },
  { key: 'REFUNDED',      label: 'Refund processed',      icon: DollarSign },
];

export default function ReturnDetailPage() {
  const { returnId } = useParams<{ returnId: string }>();
  const navigate = useNavigate();

  const { data: dispute, isLoading } = useQuery({
    queryKey: ['dispute', returnId],
    queryFn: () => disputeApi.detail(returnId!),
    enabled: !!returnId,
    refetchInterval: 30_000,
  });

  if (isLoading) return <div className="skeleton h-96 rounded-3xl" />;
  if (!dispute) return <EmptyState icon={AlertTriangle} title="Return request not found" />;

  const currentStepIdx = RETURN_STEPS.findIndex((s) => s.key === dispute.status);

  return (
    <>
      <Helmet><title>Return #{dispute.disputeNumber} — Nafaa Bazaar</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-5">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-black">Return #{dispute.disputeNumber}</h1>
              <div className="text-sm text-content-muted mt-1">
                Order #{dispute.orderNumber} · Opened {timeAgo(dispute.createdAt)}
              </div>
            </div>
            <Badge variant={dispute.status === 'REFUNDED' ? 'success' : 'info'} size="lg">
              {dispute.status.replace(/_/g, ' ')}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-2xs font-black text-content-muted uppercase">Reason</div>
              <div className="font-bold mt-1">{dispute.reason.replace(/_/g, ' ')}</div>
            </div>
            <div>
              <div className="text-2xs font-black text-content-muted uppercase">Resolution</div>
              <div className="font-bold mt-1">{dispute.resolution.replace(/_/g, ' ')}</div>
            </div>
            <div>
              <div className="text-2xs font-black text-content-muted uppercase">Refund amount</div>
              <div className="font-black text-brand-600 mt-1">{formatPrice(dispute.refundAmount || 0)}</div>
            </div>
          </div>
        </Card>

        {/* Timeline */}
        <Card className="p-5">
          <h3 className="font-black text-lg mb-4 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-brand-600" />
            Return progress
          </h3>
          <div className="relative">
            {RETURN_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isReached = i <= currentStepIdx;
              const isCurrent = i === currentStepIdx;
              const isLast = i === RETURN_STEPS.length - 1;

              return (
                <div key={step.key} className="flex gap-4 pb-6 relative last:pb-0">
                  {!isLast && (
                    <div className={cn(
                      'absolute left-5 top-11 bottom-0 w-0.5',
                      isReached ? 'bg-brand-500' : 'bg-border',
                    )} />
                  )}
                  <div className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center shrink-0 relative z-10 transition-all',
                    isReached ? 'bg-brand-600 text-white shadow-brand' : 'bg-surface-muted text-content-subtle border-2 border-border',
                    isCurrent && 'ring-4 ring-brand-500/20 animate-pulse-soft',
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 pt-1.5">
                    <div className={cn('font-black text-sm', isReached ? 'text-content' : 'text-content-subtle')}>
                      {step.label}
                      {isCurrent && (
                        <span className="ml-2 inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400">
                          Current
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Messages */}
        {dispute.messages?.length > 0 && (
          <Card className="p-5">
            <h3 className="font-black text-lg mb-3">Conversation</h3>
            <div className="space-y-3">
              {dispute.messages.map((m: any) => (
                <div key={m.id} className="flex gap-3">
                  <Avatar name={m.senderName} size="sm" />
                  <div className="flex-1">
                    <div className="text-xs font-black">{m.senderName}</div>
                    <div className="text-sm text-content-muted mt-0.5">{m.message}</div>
                    <div className="text-2xs text-content-subtle mt-1">{timeAgo(m.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
