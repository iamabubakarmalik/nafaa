import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Store, Paperclip, Image, X } from 'lucide-react';
import { shopChatApi } from '../api/shop-chat.api';
import { Button, Card, Avatar, EmptyState } from '@/ui';
import { timeAgo } from '@/lib/format';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

export default function ShopChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const customer = useAuthStore((s) => s.customer);
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conv, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => shopChatApi.detail(conversationId!),
    enabled: !!conversationId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (conversationId) {
      shopChatApi.markRead(conversationId).catch(() => {});
    }
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conv?.messages?.length]);

  const sendMutation = useMutation({
    mutationFn: (msg: string) => shopChatApi.sendMessage(conversationId!, msg),
    onSuccess: () => {
      setMessage('');
      qc.invalidateQueries({ queryKey: ['conversation', conversationId] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  if (isLoading || !conv) return <div className="skeleton h-screen rounded-3xl m-4" />;

  const shop = conv.shopProfile;

  return (
    <>
      <Helmet><title>Chat with {shop?.publicName} — Nafaa Bazaar</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-4">
        <button
          onClick={() => navigate('/messages')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          All messages
        </button>

        <Card className="flex flex-col h-[calc(100vh-10rem)] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center gap-3">
            <Link to={`/shops/${shop?.slug || conv.shopId}`}>
              {shop?.logoUrl ? (
                <img src={shop.logoUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
              ) : (
                <div className="h-11 w-11 rounded-xl bg-gradient-brand flex items-center justify-center">
                  <Store className="h-5 w-5 text-white" />
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                to={`/shops/${shop?.slug || conv.shopId}`}
                className="font-black text-content hover:text-brand-600 transition"
              >
                {shop?.publicName || 'Shop'}
              </Link>
              <div className="flex items-center gap-2 text-2xs">
                <span className={cn(
                  'inline-flex items-center gap-1 font-bold',
                  shop?.currentlyOpen ? 'text-brand-600 dark:text-brand-400' : 'text-content-muted',
                )}>
                  <span className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    shop?.currentlyOpen ? 'bg-brand-500 animate-pulse-soft' : 'bg-content-subtle',
                  )} />
                  {shop?.currentlyOpen ? 'Online' : 'Offline'}
                </span>
                {shop?.avgResponseTimeMinutes && (
                  <>
                    <span className="text-content-subtle">·</span>
                    <span className="text-content-muted">Usually replies in {shop.avgResponseTimeMinutes}m</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-muted/30">
            {!conv.messages?.length ? (
              <div className="text-center py-12 text-content-muted">
                <div className="text-4xl mb-2">👋</div>
                <p className="text-sm">Start a conversation with {shop?.publicName}</p>
                <p className="text-2xs mt-1">Ask about products, delivery, or anything else</p>
              </div>
            ) : (
              conv.messages.map((msg: any) => {
                const isMe = msg.senderType === 'CUSTOMER';
                return (
                  <div key={msg.id} className={cn('flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
                    {!isMe && (
                      <Avatar name={shop?.publicName} src={shop?.logoUrl} size="xs" />
                    )}
                    <div className={cn(
                      'max-w-[75%] rounded-2xl p-3 shadow-soft',
                      isMe
                        ? 'bg-gradient-brand text-white rounded-tr-sm'
                        : 'bg-surface border border-border rounded-tl-sm',
                    )}>
                      {msg.attachments?.length > 0 && (
                        <div className="grid grid-cols-2 gap-1 mb-2">
                          {msg.attachments.map((url: string, i: number) => (
                            <img key={i} src={url} alt="" className="h-24 w-full object-cover rounded-lg" />
                          ))}
                        </div>
                      )}
                      <div className="text-sm whitespace-pre-wrap break-words">{msg.body}</div>
                      <div className={cn(
                        'text-3xs mt-1',
                        isMe ? 'text-white/70' : 'text-content-subtle',
                      )}>
                        {timeAgo(msg.createdAt)}
                        {isMe && msg.isRead && ' · Read'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (message.trim()) sendMutation.mutate(message.trim());
              }}
              className="flex items-end gap-2"
            >
              <button
                type="button"
                className="h-11 w-11 rounded-xl hover:bg-surface-muted text-content-muted flex items-center justify-center transition shrink-0"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (message.trim()) sendMutation.mutate(message.trim());
                  }
                }}
                placeholder="Type your message..."
                rows={1}
                className="flex-1 min-h-[44px] max-h-32 px-4 py-3 rounded-2xl bg-surface-muted border border-transparent text-sm focus:outline-none focus:border-brand-500 focus:bg-surface resize-none"
              />
              <button
                type="submit"
                disabled={!message.trim() || sendMutation.isPending}
                className="h-11 w-11 rounded-xl bg-gradient-brand text-white flex items-center justify-center disabled:opacity-50 hover:scale-105 transition shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </Card>
      </div>
    </>
  );
}
