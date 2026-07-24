import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import {
  Users, CheckCircle2, Clock, XCircle, CreditCard,
  ArrowRight, Sparkles, ShoppingBag,
} from 'lucide-react';
import { splitPaymentApi } from '../api/split-payment.api';
import { Button, Card, Input, Badge, Avatar, EmptyState } from '@/ui';
import { formatPrice, timeAgo } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

export default function SplitPaymentPublicPage() {
  const { token } = useParams<{ token: string }>();
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'JAZZCASH' | 'EASYPAISA'>('JAZZCASH');
  const [phone, setPhone] = useState('');

  const { data: split, isLoading } = useQuery({
    queryKey: ['split-payment', token],
    queryFn: () => splitPaymentApi.byToken(token!),
    enabled: !!token,
    refetchInterval: 10000,
  });

  const payMutation = useMutation({
    mutationFn: () => {
      const p = split.participants.find((x: any) => x.id === selectedParticipantId);
      return splitPaymentApi.payShare(selectedParticipantId!, `${paymentMethod}-${Date.now()}`, p.shareAmount);
    },
    onSuccess: () => {
      toast.success('Payment successful! 🎉');
      setSelectedParticipantId(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <div className="skeleton h-96 rounded-3xl m-4" />;
  if (!split) return <EmptyState icon={XCircle} title="Split payment not found" />;

  const paidCount = split.participants.filter((p: any) => p.status === 'PAID').length;
  const progressPct = (Number(split.paidAmount) / Number(split.totalAmount)) * 100;

  return (
    <>
      <Helmet><title>Split Payment — Nafaa Bazaar</title></Helmet>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Hero */}
        <Card className="p-5 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-wider">Split payment</span>
            </div>
            <div className="text-3xl md:text-4xl font-black">{formatPrice(split.totalAmount)}</div>
            <div className="text-white/90 text-sm mt-1">
              Split between {split.participants.length} people
            </div>
          </div>
        </Card>

        {/* Progress */}
        <Card className="p-4">
          <div className="flex justify-between text-xs mb-2">
            <span className="font-black text-content-muted uppercase tracking-wider">Progress</span>
            <span className="font-black">{paidCount}/{split.participants.length} paid</span>
          </div>
          <div className="h-3 rounded-full bg-surface-muted overflow-hidden">
            <div
              className="h-full bg-gradient-brand transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-2xs mt-2 font-bold">
            <span className="text-content-muted">Paid: {formatPrice(split.paidAmount)}</span>
            <span className="text-content-muted">
              Remaining: {formatPrice(Number(split.totalAmount) - Number(split.paidAmount))}
            </span>
          </div>

          {split.status === 'FULLY_PAID' && (
            <div className="mt-4 p-3 rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-600" />
              <div>
                <div className="font-black text-brand-700 dark:text-brand-400 text-sm">
                  Fully paid!
                </div>
                <div className="text-2xs text-content-muted">Order is being processed</div>
              </div>
            </div>
          )}
        </Card>

        {/* Participants */}
        <div className="space-y-2">
          <h3 className="text-xs font-black text-content-muted uppercase tracking-wider px-1">
            Participants
          </h3>
          {split.participants.map((p: any) => {
            const isPaid = p.status === 'PAID';
            return (
              <Card
                key={p.id}
                className={cn(
                  'p-4 transition',
                  isPaid && 'bg-brand-50 dark:bg-brand-950/20 border-brand-200 dark:border-brand-800',
                  selectedParticipantId === p.id && 'ring-2 ring-brand-500',
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={p.name || p.phone} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm">
                      {p.name || p.phone || 'Anonymous'}
                    </div>
                    <div className="text-2xs text-content-muted">
                      Share: <span className="font-bold">{formatPrice(p.shareAmount)}</span>
                    </div>
                    {p.paidAt && (
                      <div className="text-2xs text-brand-600 mt-0.5 font-bold">
                        ✓ Paid {timeAgo(p.paidAt)}
                      </div>
                    )}
                  </div>
                  {isPaid ? (
                    <div className="h-10 w-10 rounded-full bg-brand-500 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                  ) : (
                    <Button
                      variant="gradient"
                      size="sm"
                      onClick={() => setSelectedParticipantId(p.id)}
                    >
                      Pay
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Payment modal */}
        {selectedParticipantId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Card className="max-w-sm w-full p-5 space-y-4 animate-scale-in">
              <h3 className="font-black text-lg">Pay your share</h3>

              <div className="grid grid-cols-2 gap-2">
                {['JAZZCASH', 'EASYPAISA'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m as any)}
                    className={cn(
                      'h-16 rounded-xl border-2 text-sm font-black transition',
                      paymentMethod === m
                        ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40'
                        : 'border-border',
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <Input
                label="Your mobile number"
                placeholder="03001234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <div className="flex gap-2">
                <Button variant="ghost" size="lg" fullWidth onClick={() => setSelectedParticipantId(null)}>
                  Cancel
                </Button>
                <Button
                  variant="gradient"
                  size="lg"
                  fullWidth
                  loading={payMutation.isPending}
                  disabled={!phone}
                  onClick={() => payMutation.mutate()}
                  leftIcon={<CreditCard className="h-4 w-4" />}
                >
                  Pay
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
