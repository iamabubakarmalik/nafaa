import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, ChevronLeft, ChevronRight, Heart, MessageCircle, Send,
  Store, ShoppingBag, Volume2, VolumeX,
} from 'lucide-react';
import { storiesApi } from '../api/stories.api';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';

const STORY_DURATION = 6000;

export function StoriesViewer({ shopId, onClose }: { shopId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const { data: stories } = useQuery({
    queryKey: ['shop-stories', shopId],
    queryFn: () => storiesApi.shop(shopId),
  });

  const viewMutation = useMutation({
    mutationFn: (storyId: string) => storiesApi.view(storyId),
  });

  const currentStory = stories?.[currentIdx];

  useEffect(() => {
    if (!currentStory) return;
    viewMutation.mutate(currentStory.id);
    setProgress(0);
    startTimeRef.current = Date.now();
  }, [currentIdx, currentStory?.id]);

  useEffect(() => {
    if (isPaused || !currentStory) return;

    const duration = currentStory.mediaType === 'video' ? (currentStory.duration * 1000) : STORY_DURATION;

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);

      if (pct >= 100) {
        next();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [currentIdx, isPaused, currentStory]);

  const next = () => {
    if (!stories) return;
    if (currentIdx < stories.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      onClose();
    }
  };

  const prev = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIdx, stories?.length]);

  if (!stories?.length || !currentStory) return null;

  const shop = currentStory.shop;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-fade-in">
      {/* Left tap zone */}
      <button
        onClick={prev}
        className="absolute left-0 top-0 bottom-0 w-1/3 z-10 group"
        aria-label="Previous story"
      >
        <div className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
          <ChevronLeft className="h-5 w-5 text-white" />
        </div>
      </button>

      {/* Right tap zone */}
      <button
        onClick={next}
        className="absolute right-0 top-0 bottom-0 w-1/3 z-10 group"
        aria-label="Next story"
      >
        <div className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
          <ChevronRight className="h-5 w-5 text-white" />
        </div>
      </button>

      {/* Story frame */}
      <div
        className="relative w-full max-w-md h-full max-h-[95vh] bg-black overflow-hidden md:rounded-3xl"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress bars */}
        <div className="absolute top-3 inset-x-3 flex gap-1 z-20">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white transition-all"
                style={{ width: i < currentIdx ? '100%' : i === currentIdx ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 inset-x-3 z-20 flex items-center gap-3">
          <button
            onClick={() => { onClose(); navigate(`/shops/${shop?.slug || shopId}`); }}
            className="flex items-center gap-2 min-w-0 flex-1"
          >
            {shop?.logoUrl ? (
              <img src={shop.logoUrl} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-white" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-gradient-brand ring-2 ring-white flex items-center justify-center">
                <Store className="h-4 w-4 text-white" />
              </div>
            )}
            <div className="min-w-0 text-left">
              <div className="text-sm font-black text-white truncate">{shop?.publicName}</div>
              <div className="text-2xs text-white/70">{new Date(currentStory.createdAt).toLocaleDateString()}</div>
            </div>
          </button>

          {currentStory.mediaType === 'video' && (
            <button
              onClick={() => setMuted(!muted)}
              className="h-9 w-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
            >
              {muted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
            </button>
          )}

          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Media */}
        {currentStory.mediaType === 'video' ? (
          <video
            src={currentStory.mediaUrl}
            autoPlay
            muted={muted}
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={currentStory.mediaUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        )}

        {/* Text overlay */}
        {currentStory.caption && (
          <div className="absolute bottom-32 inset-x-4 z-20">
            <div className="text-white text-lg font-black drop-shadow-lg text-center">
              {currentStory.caption}
            </div>
          </div>
        )}

        {/* Featured product */}
        {currentStory.featuredProduct && (
          <button
            onClick={() => {
              onClose();
              navigate(`/products/${currentStory.featuredProduct.productId}`);
            }}
            className="absolute bottom-20 inset-x-4 z-20 flex items-center gap-3 p-3 rounded-2xl glass bg-black/60 backdrop-blur-md text-white hover:bg-black/70 transition"
          >
            <img
              src={currentStory.featuredProduct.publicImages?.[0]}
              alt=""
              className="h-12 w-12 rounded-xl object-cover"
            />
            <div className="flex-1 text-left min-w-0">
              <div className="text-xs font-bold line-clamp-1">{currentStory.featuredProduct.publicName}</div>
              <div className="text-sm font-black text-accent-300">
                {formatPrice(currentStory.featuredProduct.publicPrice)}
              </div>
            </div>
            <ShoppingBag className="h-4 w-4" />
          </button>
        )}

        {/* Reactions */}
        <div className="absolute bottom-4 inset-x-4 z-20 flex items-center gap-2">
          <input
            type="text"
            placeholder="Reply..."
            className="flex-1 h-11 px-4 rounded-full bg-black/40 backdrop-blur border border-white/20 text-white placeholder:text-white/50 text-sm focus:outline-none focus:border-white"
          />
          {['❤️', '😍', '🔥', '👍'].map((e) => (
            <button
              key={e}
              onClick={() => storiesApi.react(currentStory.id, e)}
              className="h-11 w-11 rounded-full bg-black/40 backdrop-blur border border-white/20 flex items-center justify-center text-lg hover:scale-110 transition"
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
