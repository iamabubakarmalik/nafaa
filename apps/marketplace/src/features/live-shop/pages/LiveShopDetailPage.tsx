import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Send, Heart, Eye, ShoppingBag,
  MessageCircle, Share2, Radio,
} from 'lucide-react';
import { liveShopApi } from '../api/live-shop.api';
import { useJoinRoom, useSocketEvent } from '@lib/realtime/useSocket';
import { Avatar } from '@shared/ui/Avatar';
import { SkeletonCard } from '@shared/ui/Skeleton';
import { cn } from '@lib/cn';

const REACTIONS = ['❤️', '😍', '🔥', '👏', '😂', '💰'];

export default function LiveShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string }[]>([]);
  const messagesRef = useRef<HTMLDivElement>(null);

  const { data: ls, isLoading, refetch } = useQuery({
    queryKey: ['live-shop', id],
    queryFn: () => liveShopApi.detail(id!),
    enabled: !!id,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (id) {
      liveShopApi.join(id).catch(() => {});
      return () => {
        liveShopApi.leave(id).catch(() => {});
      };
    }
  }, [id]);

  // Real-time updates
  useJoinRoom('live-shop', id);
  useSocketEvent('live-shop:message', () => refetch(), [id]);
  useSocketEvent('live-shop:viewer-count', () => refetch(), [id]);
  useSocketEvent('live-shop:ended', () => {
    toast.info('Live show ended');
    refetch();
  }, [id]);

  const sendMessageMutation = useMutation({
    mutationFn: (m: string) => liveShopApi.sendMessage(id!, m),
    onSuccess: () => { setMessage(''); refetch(); },
  });

  const reactMutation = useMutation({
    mutationFn: (emoji: string) => liveShopApi.react(id!, emoji),
  });

  const handleReact = (emoji: string) => {
    reactMutation.mutate(emoji);
    const newId = Date.now();
    setFloatingReactions((prev) => [...prev, { id: newId, emoji }]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== newId));
    }, 2000);
  };

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
  }, [ls?.messages]);

  if (isLoading || !ls) return <SkeletonCard />;

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col">
      {/* Video area */}
      <div className="relative flex-1 flex items-center justify-center bg-gradient-to-br from-rose-900 via-pink-900 to-purple-900 overflow-hidden">
        {ls.streamUrl ? (
          <video
            src={ls.streamUrl}
            autoPlay
            playsInline
            muted={false}
            controls={false}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center text-white/80">
            <Radio className="h-16 w-16 mx-auto mb-3 opacity-50 animate-pulse-soft" />
            <div className="font-black text-lg">Stream loading...</div>
          </div>
        )}

        {/* Top overlay */}
        <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/70 to-transparent flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black shadow flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </div>
              <div className="text-white font-extrabold text-sm truncate">{ls.title}</div>
            </div>
            <div className="text-white/70 text-[11px] font-bold truncate flex items-center gap-2 mt-0.5">
              <Avatar src={ls.shop?.marketplaceProfile?.logoUrl} name={ls.shop?.marketplaceProfile?.publicName} size="xs" />
              {ls.shop?.marketplaceProfile?.publicName}
              <span>•</span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {ls.currentViewerCount || 0} watching
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success('Link copy ho gaya');
            }}
            className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        {/* Featured product overlay */}
        {ls.featuredProduct && (
          <div className="absolute bottom-32 left-4 right-4 max-w-sm p-3 rounded-2xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-lg border border-white/20 flex items-center gap-3">
            <img
              src={ls.featuredProduct.imageUrl}
              alt=""
              className="h-14 w-14 rounded-xl object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-brand-600">
                Featured Now
              </div>
              <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                {ls.featuredProduct.name}
              </div>
              <div className="text-sm font-black text-brand-700 dark:text-brand-400">
                Rs {Number(ls.featuredProduct.price).toFixed(0)}
              </div>
            </div>
            <button
              onClick={() => navigate(`/products/${ls.featuredProduct.productId}`)}
              className="h-10 w-10 rounded-full bg-brand-600 text-white flex items-center justify-center shadow"
            >
              <ShoppingBag className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Floating reactions */}
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-32 right-8 text-4xl pointer-events-none animate-slide-up"
            style={{ animation: 'slideUp 2s ease-out forwards' }}
          >
            {r.emoji}
          </div>
        ))}

        {/* Right side reactions */}
        <div className="absolute right-3 bottom-32 flex flex-col gap-2">
          {REACTIONS.map((r) => (
            <button
              key={r}
              onClick={() => handleReact(r)}
              className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/40 transition text-xl active:scale-125"
            >
              {r}
            </button>
          ))}
        </div>

        {/* Live chat overlay */}
        <div
          ref={messagesRef}
          className="absolute bottom-16 left-4 right-16 max-h-48 overflow-y-auto space-y-1 no-scrollbar"
        >
          {(ls.messages || []).slice(-10).map((m: any) => (
            <div key={m.id} className="flex items-start gap-2 animate-slide-up">
              <Avatar name={m.customer?.fullName} size="xs" />
              <div className="flex-1 min-w-0 bg-black/50 backdrop-blur rounded-lg px-2 py-1">
                <div className="text-[10px] font-extrabold text-brand-300">
                  {m.customer?.fullName?.split(' ')[0] || 'User'}
                </div>
                <div className="text-xs text-white truncate">{m.body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom chat input */}
        <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center gap-2 max-w-2xl mx-auto">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && message.trim() && sendMessageMutation.mutate(message)}
              placeholder="Comment likhein..."
              className="flex-1 h-11 px-4 rounded-full bg-white/20 backdrop-blur border border-white/30 text-white placeholder:text-white/60 text-sm font-semibold focus:outline-none focus:bg-white/30"
            />
            <button
              onClick={() => message.trim() && sendMessageMutation.mutate(message)}
              className="h-11 w-11 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-lg hover:scale-105 transition"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
