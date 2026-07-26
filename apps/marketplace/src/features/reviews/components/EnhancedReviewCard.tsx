import { useState } from 'react';
import { Star, ThumbsUp, ThumbsDown, CheckCircle2, Video, Camera, Flag } from 'lucide-react';
import { Card, Avatar, Badge } from '@/ui';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Review } from '@/types';

interface Props {
  review: Review & { hasVideo?: boolean; ratings?: any };
  onVote?: (helpful: boolean) => void;
  onReport?: () => void;
}

export function EnhancedReviewCard({ review, onVote, onReport }: Props) {
  const [showFullComment, setShowFullComment] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const hasSubRatings = review.qualityRating || review.deliveryRating || review.packagingRating;

  return (
    <Card className="p-5 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar src={review.customer.avatarUrl} name={review.customer.fullName} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-sm">{review.customer.fullName}</span>
            {review.isVerifiedPurchase && (
              <Badge variant="brand" size="sm">
                <CheckCircle2 className="h-3 w-3" />
                Verified purchase
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={s <= review.rating ? 'h-3.5 w-3.5 fill-amber-400 text-amber-400' : 'h-3.5 w-3.5 text-content-subtle'}
                />
              ))}
            </div>
            <span className="text-2xs text-content-subtle font-bold">{timeAgo(review.createdAt)}</span>
          </div>
        </div>

        <button onClick={onReport} className="text-content-subtle hover:text-danger transition p-1">
          <Flag className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Title & comment */}
      {review.title && <h4 className="font-black text-content">{review.title}</h4>}
      {review.comment && (
        <p className={cn('text-sm text-content-muted leading-relaxed', !showFullComment && 'line-clamp-3')}>
          {review.comment}
        </p>
      )}
      {review.comment && review.comment.length > 200 && (
        <button
          onClick={() => setShowFullComment(!showFullComment)}
          className="text-xs font-bold text-brand-600 hover:underline"
        >
          {showFullComment ? 'Show less' : 'Read more'}
        </button>
      )}

      {/* Sub-ratings */}
      {hasSubRatings && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-border">
          {[
            { label: 'Quality', value: review.qualityRating },
            { label: 'Packaging', value: review.packagingRating },
            { label: 'Delivery', value: review.deliveryRating },
            { label: 'Value', value: review.valueRating },
          ].filter((r) => r.value).map((r, i) => (
            <div key={i} className="text-center">
              <div className="text-2xs font-bold text-content-muted uppercase">{r.label}</div>
              <div className="flex justify-center gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={s <= (r.value || 0) ? 'h-3 w-3 fill-amber-400 text-amber-400' : 'h-3 w-3 text-content-subtle'}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Media */}
      {(review.imageUrls?.length > 0 || review.videoUrl) && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {review.videoUrl && (
            <button
              onClick={() => setVideoPlaying(!videoPlaying)}
              className="relative h-24 w-24 rounded-xl bg-surface-muted overflow-hidden shrink-0 group"
            >
              {videoPlaying ? (
                <video src={review.videoUrl} autoPlay controls className="h-full w-full object-cover" />
              ) : (
                <>
                  <video src={review.videoUrl} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 transition">
                    <Video className="h-6 w-6 text-white" />
                  </div>
                </>
              )}
            </button>
          )}
          {review.imageUrls?.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="h-24 w-24 rounded-xl object-cover shrink-0 cursor-pointer hover:opacity-90 transition"
            />
          ))}
        </div>
      )}

      {/* Shop reply */}
      {review.replyFromShop && (
        <div className="p-3 rounded-2xl bg-brand-50 dark:bg-brand-950/30 border-l-4 border-brand-500">
          <div className="text-2xs font-black text-brand-700 dark:text-brand-400 uppercase tracking-wider mb-1">
            Shop reply
          </div>
          <p className="text-xs text-content">{review.replyFromShop}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <button
          onClick={() => onVote?.(true)}
          className="inline-flex items-center gap-1 text-2xs font-bold text-content-muted hover:text-brand-600 transition"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          Helpful ({review.helpfulCount || 0})
        </button>
        <button
          onClick={() => onVote?.(false)}
          className="inline-flex items-center gap-1 text-2xs font-bold text-content-muted hover:text-danger transition"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          ({review.unhelpfulCount || 0})
        </button>
      </div>
    </Card>
  );
}
