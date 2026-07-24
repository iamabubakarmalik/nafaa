import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState, useRef, useEffect } from 'react';
import {
  Sparkles, Send, ShoppingBag, Bot, User, ArrowRight, Wand2,
  Heart, Gift, TrendingUp, Cake, PartyPopper, Baby,
} from 'lucide-react';
import { aiAssistantApi } from '../api/ai-assistant.api';
import { useAddToCart } from '@/features/cart/hooks/useCart';
import { Button, Card, Avatar, Badge } from '@/ui';
import { formatPrice } from '@/lib/format';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { useTranslation } from 'react-i18next';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  productIds?: string[];
  products?: any[];
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { icon: Heart, label: 'Wedding shopping', prompt: 'meri shaadi hai, kya suggest karo? budget 50000' },
  { icon: Gift, label: 'Birthday gift', prompt: 'meri behn ka birthday hai, gift chahiye budget 3000' },
  { icon: PartyPopper, label: 'Eid preparation', prompt: 'Eid ke liye kya kya lena hai family ke liye' },
  { icon: Cake, label: 'Cake & sweets', prompt: 'anniversary cake with flowers 2000 budget' },
  { icon: Baby, label: 'Baby stuff', prompt: 'newborn baby ke liye essentials chahiye' },
  { icon: TrendingUp, label: 'Trending now', prompt: 'aaj kal kya trending hai lena chahiye' },
];

export default function AiAssistantPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customer = useAuthStore((s) => s.customer);
  const addToCart = useAddToCart();
  const chatRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);

  const initialQuery = searchParams.get('q');

  // Load conversation from URL
  const conversationQuery = useQuery({
    queryKey: ['ai-conversation', sessionId],
    queryFn: () => aiAssistantApi.getConversation(sessionId!),
    enabled: !!sessionId,
    staleTime: Infinity,
  });

  const startMutation = useMutation({
    mutationFn: (query: string) => aiAssistantApi.start(query, i18n.language),
    onSuccess: (data) => {
      setSessionId(data.conversation.sessionId);
      setMessages([
        {
          id: crypto.randomUUID(),
          role: 'USER',
          content: input || initialQuery || '',
          timestamp: new Date(),
        },
        {
          id: crypto.randomUUID(),
          role: 'ASSISTANT',
          content: data.response,
          products: data.products,
          timestamp: new Date(),
        },
      ]);
      setInput('');
      setShowQuickPrompts(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const continueMutation = useMutation({
    mutationFn: (message: string) => aiAssistantApi.continue(sessionId!, message),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'ASSISTANT',
          content: data.response,
          products: data.products,
          timestamp: new Date(),
        },
      ]);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  useEffect(() => {
    if (initialQuery && !sessionId && !startMutation.isPending) {
      startMutation.mutate(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages.length]);

  const send = (message: string) => {
    if (!message.trim()) return;
    if (sessionId) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'USER', content: message, timestamp: new Date() },
      ]);
      continueMutation.mutate(message);
      setInput('');
    } else {
      startMutation.mutate(message);
    }
  };

  const isThinking = startMutation.isPending || continueMutation.isPending;

  return (
    <>
      <Helmet><title>AI Shopping Assistant — Nafaa Bazaar</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-4">
        {/* Hero */}
        {showQuickPrompts && (
          <Card className="p-5 md:p-6 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 text-white border-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-xs font-black mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                AI-powered · Free
              </div>
              <h1 className="text-2xl md:text-3xl font-black leading-tight mb-2">
                Your AI Shopping Assistant
              </h1>
              <p className="text-white/90 text-sm md:text-base">
                Tell me what you need — I'll find the best products, deals, and shops for you
              </p>
            </div>
          </Card>
        )}

        {/* Quick prompts */}
        {showQuickPrompts && messages.length === 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-black text-content-muted uppercase tracking-wider">
              Try one of these
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {QUICK_PROMPTS.map((qp) => {
                const Icon = qp.icon;
                return (
                  <button
                    key={qp.label}
                    onClick={() => send(qp.prompt)}
                    className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-surface hover:bg-brand-50 dark:hover:bg-brand-950/30 border border-border hover:border-brand-400 transition text-left group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center group-hover:scale-110 transition">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-content">{qp.label}</div>
                      <div className="text-2xs text-content-muted line-clamp-1 mt-0.5">
                        {qp.prompt}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.length > 0 && (
          <div ref={chatRef} className="space-y-4 max-h-[calc(100vh-16rem)] overflow-y-auto pb-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'USER';
              return (
                <div key={msg.id} className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
                  {/* Avatar */}
                  <div className="shrink-0">
                    {isUser ? (
                      <Avatar name={customer?.fullName} src={customer?.avatarUrl} size="sm" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Bubble */}
                  <div className={cn('flex-1 max-w-[85%]', isUser && 'flex flex-col items-end')}>
                    <div className={cn(
                      'rounded-2xl p-3 shadow-soft',
                      isUser
                        ? 'bg-gradient-brand text-white rounded-tr-sm'
                        : 'bg-surface border border-border rounded-tl-sm',
                    )}>
                      <div className="whitespace-pre-wrap text-sm font-medium">{msg.content}</div>
                    </div>

                    {/* Product cards */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="mt-3 w-full grid grid-cols-2 gap-2">
                        {msg.products.slice(0, 6).map((p: any) => (
                          <Card key={p.productId} className="overflow-hidden card-hover">
                            <Link to={`/products/${p.productId}`}>
                              <div className="aspect-square bg-surface-muted">
                                {p.publicImages?.[0] ? (
                                  <img src={p.publicImages[0]} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <ShoppingBag className="h-5 w-5 text-content-subtle" />
                                  </div>
                                )}
                              </div>
                            </Link>
                            <div className="p-2.5">
                              <Link
                                to={`/products/${p.productId}`}
                                className="text-2xs font-bold line-clamp-2 hover:text-brand-600 transition min-h-[2rem] block"
                              >
                                {p.publicName}
                              </Link>
                              <div className="text-sm font-black text-brand-600 mt-1">
                                {formatPrice(p.publicPrice)}
                              </div>
                              <Button
                                variant="gradient"
                                size="xs"
                                fullWidth
                                className="mt-2 h-7 text-2xs"
                                onClick={() => {
                                  addToCart.mutate({ productId: p.productId, quantity: 1 });
                                  aiAssistantApi.trackAction(p.productId, 'clicked').catch(() => {});
                                }}
                              >
                                Add to cart
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isThinking && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white animate-pulse" />
                </div>
                <div className="bg-surface border border-border rounded-2xl rounded-tl-sm p-3 shadow-soft">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <Card className="p-3 sticky bottom-4 lg:bottom-0 z-10 shadow-soft-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
              <Wand2 className="h-4 w-4 text-white" />
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={i18n.language === 'ur'
                ? 'Kya chahiye? e.g. "shaadi ke kapre budget 15000"'
                : 'What do you need? e.g. "Wedding dress under 15000"'}
              disabled={isThinking}
              className="flex-1 h-11 px-4 rounded-xl bg-surface-muted border border-transparent text-sm focus:outline-none focus:border-brand-500 focus:bg-surface disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="h-11 w-11 rounded-xl bg-gradient-brand text-white flex items-center justify-center disabled:opacity-50 hover:scale-105 transition shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </Card>
      </div>
    </>
  );
}
