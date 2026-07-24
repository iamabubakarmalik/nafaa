import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Send, Users, Video, Heart, Share2,
  ShoppingBag, Store, X,
} from 'lucide-react';
import { liveShopApi } from '../api/live-shop.api';
import { useAddToCart } from '@/features/cart/hooks/useCart';
import { useAuthStore } from '@/stores/auth.store';
import { Button, Card, Input, Badge, Avatar, EmptyState } from '@/ui';
import { formatPrice, timeAgo } from '@/lib/format';
import { useJoinRoom, useSocketEvent } from '@/lib/useSocket';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

export default function LiveShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const customer = useAuthStore((s) => s.customer);
  const addToCart = useAddToCart();
  const chatRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');
  const [viewerCount, setViewerCount] = useState(0);

  useJoinRoom('live-shop', id);
  useSocketEvent('live-shop:message', () => {
    qc.invalidateQueries({ queryKey: ['live-shop', id] });
  });
  useSocketEvent('live-shop:viewer-count', (data: any) => {
    setViewerCount(data.count);
  });

  const { data: live, isLoading } = useQuery({
    queryKey: ['live-shop', id],
    queryFn: () => liveShopApi.detail(id!),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.isLive ? 5000 : false),
  });

  const joinMutation = useMutation({
    mutationFn: () => liveShopApi.join(id!),
  });

  useEffect(() => {
    if (live?.isLive && customer && !live.isJoined) {
      joinMutation.mutate();
    }
  }, [live?.isLive, live?.isJoined, customer]);

  useEffect(() => {
    return () => {
      if (id) liveShopApi.leave(id).catch(() => {});
    };
  }, [id]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [live?.recentMessages?.length]);

  useEffect(() => {
    if (live?.currentViewerCount) setViewerCount(live.currentViewerCount);
  }, [live?.currentViewerCount]);

  const sendMutation = useMutation({
    mutationFn: (msg: string) => liveShopApi.sendMessage(id!, msg),
    onSuccess: () => {
      setMessage('');
      qc.invalidateQueries({ queryKey: ['live-shop', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <div className="skeleton h-screen rounded-3xl" />;
  if (!live) return <EmptyState icon={Video} title="Stream not found" />;

  const shop = live.shopProfile;

  return (
    <>
      <Helmet><title>{live.title} — Live | Nafaa Bazaar</title></Helmet>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-4">
        {/* LEFT: Video + Products */}
        <div className="space-y-4">
          <button
            onClick={() => navigate('/live')}
            className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
          >
            <ArrowLeft className="h-4 w-4" />
            All live shows
          </button>

          {/* Video area */}
          <Card className="overflow-hidden bg-black aspect-video relative">
            {live.streamUrl ? (
              <video src={live.streamUrl} controls autoPlay muted className="h-full w-full" />
            ) : live.coverImageUrl ? (
              <img src={live.coverImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-rose-600 to-red-800">
                <Video className="h-20 w-20 text-white/50" />
              </div>
            )}

            {/* Overlay */}
            <div className="absolute top-4 left-4 flex gap-2">
              {live.isLive && (
                <Badge variant="danger" size="lg" className="shadow-lg">
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse-soft" />
                  LIVE
                </Badge>
              )}
              <Badge variant="glass" size="lg" className="backdrop-blur-md text-white">
                <Users className="h-3.5 w-3.5" />
                {viewerCount || live.currentViewerCount || 0} watching
              </Badge>
            </div>

            <button className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 transition">
              <Share2 className="h-4 w-4" />
            </button>
          </Card>

          {/* Info */}
          <Card className="p-4">
            <div className="flex items-start gap-3">
              {shop?.logoUrl && (
                <Link to={`/shops/${shop.slug}`}>
                  <img src={shop.logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
                </Link>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-black line-clamp-2">{live.title}</h1>
                <Link
                  to={`/shops/${shop?.slug}`}
                  className="text-sm text-content-muted hover:text-brand-600 font-bold flex items-center gap-1 mt-1"
                >
                  <Store className="h-3.5 w-3.5" />
                  {shop?.publicName}
                </Link>
              </div>
            </div>
            {live.description && (
              <p className="text-sm text-content-muted mt-3">{live.description}</p>
            )}
          </Card>

          {/* Featured products */}
          {live.featuredProducts?.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-black text-lg flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-brand-600" />
                Featured products
                <Badge variant="brand" size="md">{live.featuredProducts.length}</Badge>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {live.featuredProducts.map((p: any) => (
                  <Card key={p.productId} className="overflow-hidden card-hover">
                    <Link to={`/products/${p.productId}`}>
                      <div className="aspect-square bg-surface-muted">
                        {p.publicImages?.[0] && (
                          <img src={p.publicImages[0]} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                    </Link>
                    <div className="p-3">
                      <div className="text-xs font-bold line-clamp-1">{p.publicName}</div>
                      <div className="font-black text-brand-600 text-sm mt-1">
                        {formatPrice(p.publicPrice)}
                      </div>
                      <Button
                        variant="gradient"
                        size="xs"
                        fullWidth
                        className="mt-2"
                        onClick={() => addToCart.mutate({ productId: p.productId, quantity: 1 })}
                      >
                        Add to cart
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Live chat */}
        <div className="lg:sticky lg:top-24 lg:self-start lg:h-[calc(100vh-8rem)]">
          <Card className="flex flex-col h-full max-h-[600px] lg:max-h-none overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-surface-muted/50 flex items-center justify-between">
              <div className="font-black text-sm">Live chat</div>
              <Badge variant="danger" size="sm">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse-soft" />
                {viewerCount} viewers
              </Badge>
            </div>

            <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              {live.recentMessages?.length ? (
                live.recentMessages.map((m: any) => (
                  <div key={m.id} className="flex gap-2">
                    <Avatar name={m.customer?.fullName} src={m.customer?.avatarUrl} size="xs" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-black text-content">
                          {m.customer?.fullName?.split(' ')[0] || 'Anonymous'}
                        </span>
                        <span className="text-3xs text-content-subtle">{timeAgo(m.createdAt)}</span>
                      </div>
                      <div className="text-sm text-content-muted break-words">{m.message}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-content-muted text-sm">
                  Be the first to say hi 👋
                </div>
              )}
            </div>

            {live.isLive && customer ? (
              <div className="border-t border-border p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (message.trim()) sendMutation.mutate(message.trim());
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    maxLength={500}
                    className="flex-1 h-10 px-4 rounded-full bg-surface-muted border border-border text-sm focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={!message.trim() || sendMutation.isPending}
                    className="h-10 w-10 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center disabled:opacity-50 transition"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ) : !customer && live.isLive ? (
              <div className="border-t border-border p-3">
                <Button variant="gradient" size="sm" fullWidth onClick={() => navigate('/login')}>
                  Login to chat
                </Button>
              </div>
            ) : (
              <div className="border-t border-border p-3 text-center text-xs text-content-muted">
                Chat closed
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
