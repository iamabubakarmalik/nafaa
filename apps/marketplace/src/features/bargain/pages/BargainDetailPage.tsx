import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Send, CheckCircle2, XCircle, Clock, Store,
  Sparkles, ShoppingBag, MessageCircle, X,
} from 'lucide-react';
import { bargainApi } from '../api/bargain.api';
import { useAddToCart } from '@/features/cart/hooks/useCart';
import { Button, Card, Input, Badge, Avatar, EmptyState } from '@/ui';
import { formatPrice, timeAgo } from '@/lib/format';
import { useCountdown, formatCountdown } from '@/hooks/useCountdown';
import { useJoinRoom, useSocketEvent } from '@/lib/useSocket';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

export default function BargainDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const addToCart = useAddToCart();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [counterOffer, setCounterOffer] = useState('');
  const [counterMessage, setCounterMessage] = useState('');

  useJoinRoom('bargain', id);
  useSocketEvent('bargain:update', () => {
    qc.invalidateQueries({ queryKey: ['bargain', id] });
  });
  useSocketEvent('bargain:message', () => {
    qc.invalidateQueries({ queryKey: ['bargain', id] });
  });

  const { data: bargain, isLoading } = useQuery({
    queryKey: ['bargain', id],
    queryFn: () => bargainApi.detail(id!),
    enabled: !!id,
  });

  const cd = useCountdown(bargain?.expiresAt);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [bargain?.messages?.length]);

  const acceptMutation = useMutation({
    mutationFn: () => bargainApi.accept(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bargain', id] });
      toast.success('Deal accepted! 🎉');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => bargainApi.reject(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bargain', id] });
      toast.success('Bargain closed');
    },
  });

  const counterMutation = useMutation({
    mutationFn: () => bargainApi.counter(id!, {
      offerPrice: Number(counterOffer),
      message: counterMessage || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bargain', id] });
      setCounterOffer('');
      setCounterMessage('');
      toast.success('Counter offer sent!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <div className="skeleton h-96 rounded-3xl" />;
  if (!bargain) {
    return <EmptyState icon={MessageCircle} title="Bargain not found" />;
  }

  const shop = bargain.shop?.marketplaceProfile;
  const savings = Number(bargain.originalPrice) - Number(bargain.currentOffer);
  const savingsPct = Math.round((savings / Number(bargain.originalPrice)) * 100);
  const isActive = ['PENDING', 'COUNTER_OFFERED'].includes(bargain.status);

  return (
    <>
      <Helmet><title>Bargain — {bargain.productName}</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-4">
        {/* Back */}
        <button
          onClick={() => navigate('/bargain')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          All bargains
        </button>

        {/* Header card */}
        <Card className="overflow-hidden">
          <div className="p-4 bg-gradient-to-br from-accent-500 to-accent-700 text-white">
            <div className="flex items-start gap-3">
              {shop?.logoUrl ? (
                <img src={shop.logoUrl} alt="" className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white/30" />
              ) : (
                <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Store className="h-6 w-6" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <Link to={`/shops/${shop?.slug || bargain.shopId}`} className="font-black text-lg hover:underline">
                  {shop?.publicName || 'Shop'}
                </Link>
                <div className="text-xs text-accent-50 mt-0.5">{bargain.productName}</div>
              </div>
            </div>

            {/* Price + savings */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <div className="text-2xs text-accent-100 font-bold uppercase">Original</div>
                <div className="text-lg font-black line-through opacity-75">
                  {formatPrice(bargain.originalPrice)}
                </div>
              </div>
              <div>
                <div className="text-2xs text-accent-100 font-bold uppercase">Current offer</div>
                <div className="text-lg font-black">{formatPrice(bargain.currentOffer)}</div>
              </div>
              <div>
                <div className="text-2xs text-accent-100 font-bold uppercase">You save</div>
                <div className="text-lg font-black">
                  {savingsPct}%
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="mt-4 flex items-center justify-between">
              <Badge variant="glass" size="md" className="backdrop-blur-md">
                Round {bargain.offerCount}/{bargain.maxOffers}
              </Badge>
              {isActive && !cd.expired && (
                <div className="flex items-center gap-1 text-2xs font-black">
                  <Clock className="h-3.5 w-3.5" />
                  {formatCountdown(cd)} left
                </div>
              )}
              {bargain.status === 'ACCEPTED' && (
                <Badge variant="glass" size="md" className="backdrop-blur-md">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Deal!
                </Badge>
              )}
            </div>
          </div>

          {/* Success actions */}
          {bargain.status === 'ACCEPTED' && (
            <div className="p-4 bg-brand-50 dark:bg-brand-950/30 border-t border-brand-200 dark:border-brand-800">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-brand-600" />
                <div>
                  <div className="font-black text-sm">Deal locked!</div>
                  <div className="text-xs text-content-muted">Add to cart and checkout to secure</div>
                </div>
              </div>
              <Button
                variant="gradient"
                size="lg"
                fullWidth
                leftIcon={<ShoppingBag className="h-4 w-4" />}
                onClick={() => addToCart.mutate({
                  productId: bargain.productId,
                  variantId: bargain.variantId,
                  quantity: bargain.quantity,
                  bargainId: bargain.id,
                })}
              >
                Add bargain to cart · {formatPrice(bargain.finalPrice)}
              </Button>
            </div>
          )}
        </Card>

        {/* Message thread */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border font-black text-sm bg-surface-muted/50 flex items-center justify-between">
            <span>Negotiation history</span>
            <span className="text-2xs text-content-muted">{bargain.messages?.length || 0} messages</span>
          </div>

          <div
            ref={scrollRef}
            className="p-4 space-y-3 max-h-[500px] overflow-y-auto"
          >
            {bargain.messages?.map((msg: any) => {
              const isCustomer = msg.senderType === 'CUSTOMER';
              return (
                <div key={msg.id} className={cn('flex gap-2', isCustomer ? 'justify-end' : 'justify-start')}>
                  {!isCustomer && (
                    <Avatar name={shop?.publicName} src={shop?.logoUrl} size="sm" />
                  )}
                  <div className={cn(
                    'max-w-[75%] rounded-2xl p-3 shadow-soft',
                    isCustomer
                      ? 'bg-gradient-brand text-white'
                      : 'bg-surface border border-border',
                  )}>
                    {msg.offeredPrice && (
                      <div className={cn(
                        'text-lg font-black mb-1',
                        isCustomer ? 'text-white' : 'text-brand-600',
                      )}>
                        {formatPrice(msg.offeredPrice)}
                      </div>
                    )}
                    {msg.action && (
                      <div className={cn(
                        'text-2xs font-bold uppercase tracking-wider mb-1',
                        isCustomer ? 'text-white/80' : 'text-content-muted',
                      )}>
                        {msg.action === 'OFFER' && '💰 Initial offer'}
                        {msg.action === 'COUNTER' && '🔄 Counter offer'}
                        {msg.action === 'ACCEPT' && '✅ Accepted'}
                        {msg.action === 'REJECT' && '❌ Rejected'}
                      </div>
                    )}
                    {msg.message && (
                      <div className={cn(
                        'text-sm',
                        isCustomer ? 'text-white' : 'text-content',
                      )}>
                        {msg.message}
                      </div>
                    )}
                    <div className={cn(
                      'text-3xs mt-1',
                      isCustomer ? 'text-white/60' : 'text-content-subtle',
                    )}>
                      {timeAgo(msg.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions bar */}
          {bargain.status === 'COUNTER_OFFERED' && bargain.canAccept && (
            <div className="border-t border-border p-4 space-y-3 bg-accent-50 dark:bg-accent-950/30">
              <div className="text-xs font-black text-center text-content-muted uppercase">
                Shop's counter offer
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="lg"
                  fullWidth
                  onClick={() => rejectMutation.mutate()}
                  loading={rejectMutation.isPending}
                  leftIcon={<XCircle className="h-4 w-4" />}
                  className="text-danger hover:bg-danger/10"
                >
                  Reject
                </Button>
                {bargain.canCounter && (
                  <Button
                    variant="secondary"
                    size="lg"
                    fullWidth
                    onClick={() => {
                      const input = document.getElementById('counter-input');
                      input?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Counter
                  </Button>
                )}
                <Button
                  variant="gradient"
                  size="lg"
                  fullWidth
                  onClick={() => acceptMutation.mutate()}
                  loading={acceptMutation.isPending}
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                >
                  Accept
                </Button>
              </div>
            </div>
          )}

          {/* Counter offer form */}
          {bargain.canCounter && (
            <div id="counter-input" className="border-t border-border p-4 space-y-3 bg-surface-muted/50">
              <div className="text-xs font-black text-content-muted uppercase tracking-wider">
                Send counter offer
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Your price"
                  value={counterOffer}
                  onChange={(e) => setCounterOffer(e.target.value)}
                />
              </div>
              <Input
                placeholder="Optional message..."
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
              />
              <Button
                variant="accent"
                size="lg"
                fullWidth
                disabled={!counterOffer}
                loading={counterMutation.isPending}
                onClick={() => counterMutation.mutate()}
                leftIcon={<Send className="h-4 w-4" />}
              >
                Send counter offer
              </Button>
            </div>
          )}

          {['ACCEPTED', 'REJECTED', 'EXPIRED'].includes(bargain.status) && (
            <div className="border-t border-border p-4 text-center text-sm text-content-muted">
              {bargain.status === 'ACCEPTED' && '✅ Bargain complete — add to cart above'}
              {bargain.status === 'REJECTED' && '❌ Bargain rejected'}
              {bargain.status === 'EXPIRED' && '⏰ Bargain expired'}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
