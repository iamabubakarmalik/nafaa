import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Send, CheckCircle2, XCircle, TrendingDown,
  ShoppingBag, MessageCircle, Clock, Sparkles,
} from 'lucide-react';
import { bargainApi } from '../api/bargain.api';
import { useJoinRoom, useSocketEvent } from '@lib/realtime/useSocket';
import { useCustomerAuthStore } from '@stores/customerAuth.store';
import { Button } from '@shared/ui/Button';
import { Modal } from '@shared/ui/Modal';
import { SkeletonCard } from '@shared/ui/Skeleton';
import { cn } from '@lib/cn';

export default function BargainChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const customer = useCustomerAuthStore((s) => s.customer);
  const [message, setMessage] = useState('');
  const [counterModalOpen, setCounterModalOpen] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: bargain, isLoading } = useQuery({
    queryKey: ['bargain', id],
    queryFn: () => bargainApi.detail(id!),
    enabled: !!id,
    refetchInterval: 5000, // poll for updates
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['bargain', id] });

  // Real-time updates
  useJoinRoom('bargain', id);
  useSocketEvent('bargain:update', () => invalidate(), [id]);
  useSocketEvent('bargain:message', () => invalidate(), [id]);

  const sendMessageMutation = useMutation({
    mutationFn: (msg: string) => bargainApi.sendMessage(id!, msg),
    onSuccess: () => { setMessage(''); invalidate(); },
  });

  const counterMutation = useMutation({
    mutationFn: () => bargainApi.counter(id!, Number(counterPrice), counterMessage),
    onSuccess: () => {
      toast.success('Counter offer bhej diya');
      setCounterModalOpen(false);
      setCounterPrice('');
      setCounterMessage('');
      invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Error'),
  });

  const acceptMutation = useMutation({
    mutationFn: () => bargainApi.accept(id!),
    onSuccess: () => { toast.success('Bargain accept ho gaya! 🎉'); invalidate(); },
  });

  const rejectMutation = useMutation({
    mutationFn: () => bargainApi.reject(id!, 'Not interested'),
    onSuccess: () => { toast.success('Rejected'); invalidate(); },
  });

  const addToCartMutation = useMutation({
    mutationFn: () => bargainApi.addToCart(id!),
    onSuccess: () => {
      toast.success('Cart mein add ho gaya at bargain price!');
      navigate('/cart');
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [bargain?.messages]);

  if (isLoading || !bargain) return <SkeletonCard />;

  const isMyTurn = bargain.status === 'COUNTER_OFFERED';
  const canAct = bargain.status === 'PENDING' || bargain.status === 'COUNTER_OFFERED';
  const isAccepted = bargain.status === 'ACCEPTED';

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 shadow-sm">
        <div className="max-w-2xl mx-auto p-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-purple-600" />
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                Bargain Chat
              </span>
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {bargain.shop?.marketplaceProfile?.publicName}
            </div>
          </div>
          <span className={cn(
            'px-2 py-0.5 rounded-full text-[10px] font-extrabold',
            bargain.status === 'ACCEPTED' && 'bg-success-100 text-success-700',
            bargain.status === 'REJECTED' && 'bg-rose-100 text-rose-700',
            bargain.status === 'PENDING' && 'bg-amber-100 text-amber-700',
            bargain.status === 'COUNTER_OFFERED' && 'bg-info-100 text-info-700',
          )}>
            {bargain.status.replace('_', ' ')}
          </span>
        </div>

        {/* Product summary */}
        <div className="max-w-2xl mx-auto px-3 pb-3 flex items-center gap-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-t border-slate-100 dark:border-neutral-800">
          {bargain.product?.marketplaceProfile?.publicImages?.[0] && (
            <img
              src={bargain.product.marketplaceProfile.publicImages[0]}
              alt=""
              className="h-14 w-14 rounded-xl object-cover shrink-0"
            />
          )}
          <div className="flex-1 min-w-0 py-2">
            <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
              {bargain.product?.marketplaceProfile?.publicName}
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-[10px] text-slate-400 line-through">
                Rs {Number(bargain.originalPrice).toFixed(0)}
              </span>
              <span className="text-sm font-black text-purple-700 dark:text-purple-400">
                Rs {Number(bargain.finalPrice || bargain.counterPrice || bargain.offerPrice).toFixed(0)}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                × {bargain.quantity}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full space-y-3">
        {/* Initial offer */}
        <MessageBubble
          isMe={true}
          author="You"
          time={bargain.createdAt}
          content={
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest opacity-80 mb-1">
                Opening Offer
              </div>
              <div className="text-2xl font-black">
                Rs {Number(bargain.offerPrice).toFixed(0)}
              </div>
              {bargain.initialMessage && (
                <div className="text-xs mt-1.5 opacity-90">{bargain.initialMessage}</div>
              )}
            </div>
          }
        />

        {/* Chat history */}
        {bargain.messages?.map((m: any) => (
          <MessageBubble
            key={m.id}
            isMe={m.senderType === 'CUSTOMER'}
            author={m.senderType === 'CUSTOMER' ? 'You' : bargain.shop?.marketplaceProfile?.publicName}
            time={m.createdAt}
            content={
              m.messageType === 'COUNTER_OFFER' ? (
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest opacity-80 mb-1">
                    Counter Offer
                  </div>
                  <div className="text-2xl font-black">
                    Rs {Number(m.counterPrice).toFixed(0)}
                  </div>
                  {m.body && <div className="text-xs mt-1.5 opacity-90">{m.body}</div>}
                </div>
              ) : (
                <div>{m.body}</div>
              )
            }
          />
        ))}

        {/* Status result */}
        {bargain.status === 'ACCEPTED' && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-success-100 to-emerald-100 dark:from-success-900/40 dark:to-emerald-900/40 border-2 border-success-300 text-center">
            <CheckCircle2 className="h-12 w-12 text-success-600 mx-auto mb-2" />
            <div className="font-black text-lg text-success-900 dark:text-success-300">Deal Done! 🎉</div>
            <div className="text-sm text-success-700 dark:text-success-400 mt-1">
              Final price: <span className="font-black">Rs {Number(bargain.finalPrice).toFixed(0)}</span>
            </div>
          </div>
        )}

        {bargain.status === 'REJECTED' && (
          <div className="p-4 rounded-2xl bg-rose-100 dark:bg-rose-900/30 border-2 border-rose-300 text-center">
            <XCircle className="h-12 w-12 text-rose-600 mx-auto mb-2" />
            <div className="font-black text-lg text-rose-900 dark:text-rose-300">Rejected</div>
            {bargain.rejectReason && (
              <div className="text-sm text-rose-700 dark:text-rose-400 mt-1">{bargain.rejectReason}</div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 bg-white dark:bg-neutral-900 border-t border-slate-200 dark:border-neutral-800 shadow-lg">
        <div className="max-w-2xl mx-auto p-3">
          {isAccepted ? (
            <Button
              variant="gradient"
              size="lg"
              fullWidth
              loading={addToCartMutation.isPending}
              onClick={() => addToCartMutation.mutate()}
              leftIcon={<ShoppingBag className="h-4 w-4" />}
            >
              Add to Cart at Bargain Price
            </Button>
          ) : canAct && isMyTurn ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="success"
                  fullWidth
                  loading={acceptMutation.isPending}
                  onClick={() => acceptMutation.mutate()}
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                >
                  Accept
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setCounterModalOpen(true)}
                  leftIcon={<TrendingDown className="h-4 w-4" />}
                >
                  Counter
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => rejectMutation.mutate()}
                  leftIcon={<XCircle className="h-4 w-4" />}
                >
                  Reject
                </Button>
              </div>
            </div>
          ) : canAct ? (
            <>
              <div className="flex items-center gap-2">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && message.trim() && sendMessageMutation.mutate(message)}
                  placeholder="Message likhein..."
                  className="flex-1 h-11 px-4 rounded-full border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => message.trim() && sendMessageMutation.mutate(message)}
                  className="h-11 w-11 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-md hover:scale-105 transition"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-500 text-center mt-2">
                <Clock className="h-3 w-3 inline mr-1" />
                Shop owner ka reply ka intezaar hai
              </p>
            </>
          ) : (
            <div className="text-center py-2 text-xs text-slate-500 font-bold">
              Ye bargain complete ho chuka hai
            </div>
          )}
        </div>
      </div>

      {/* Counter offer modal */}
      <Modal
        open={counterModalOpen}
        onClose={() => setCounterModalOpen(false)}
        title="Counter Offer Bhejain"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCounterModalOpen(false)}>Cancel</Button>
            <Button
              variant="gradient"
              loading={counterMutation.isPending}
              onClick={() => {
                if (!counterPrice || Number(counterPrice) <= 0) return toast.error('Sahi price likhein');
                counterMutation.mutate();
              }}
            >
              Send Counter
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-600 dark:text-slate-400">Shop's offer:</span>
            <span className="font-black text-slate-900 dark:text-white">
              Rs {Number(bargain.counterPrice || bargain.offerPrice).toFixed(0)}
            </span>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Aap ka counter offer (PKR)
            </label>
            <input
              type="number"
              value={counterPrice}
              onChange={(e) => setCounterPrice(e.target.value)}
              placeholder="Kitna dena chahte hain?"
              className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 dark:border-neutral-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none text-lg font-black"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Message (optional)
            </label>
            <textarea
              value={counterMessage}
              onChange={(e) => setCounterMessage(e.target.value)}
              placeholder="Bhai thora aur kam kar dain..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-neutral-700 focus:border-purple-500 outline-none text-sm resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function MessageBubble({
  isMe, author, time, content,
}: {
  isMe: boolean; author: string; time: string; content: React.ReactNode;
}) {
  return (
    <div className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
      <div className="max-w-[75%]">
        {!isMe && (
          <div className="text-[10px] font-extrabold text-slate-500 mb-1 px-1">{author}</div>
        )}
        <div className={cn(
          'p-3 rounded-2xl text-sm shadow-soft',
          isMe
            ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-br-md'
            : 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white rounded-bl-md border border-slate-200 dark:border-neutral-700',
        )}>
          {content}
        </div>
        <div className={cn('text-[9px] text-slate-400 font-bold mt-1', isMe ? 'text-right' : 'text-left')}>
          {new Date(time).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
