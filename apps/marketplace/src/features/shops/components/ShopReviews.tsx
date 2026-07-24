import { Star, ThumbsUp, CheckCircle2 } from 'lucide-react';
import { Avatar, Card, Badge } from '@/ui';
import { timeAgo } from '@/lib/format';
import type { Review } from '@/types';

export function ShopReviewsSection({ reviews, ratingAverage, ratingCount, distribution }: {
  reviews: Review[];
  ratingAverage: number;
  ratingCount: number;
  distribution?: Record<number, number>;
}) {
  if (ratingCount === 0) {
    return (
      <Card className="p-8 text-center">
        <Star className="h-8 w-8 text-content-subtle mx-auto mb-2" />
        <p className="text-sm font-bold text-content">No reviews yet</p>
        <p className="text-xs text-content-muted mt-1">Be the first to review</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-6">
          <div className="text-center md:border-r md:border-border md:pr-6">
            <div className="text-5xl font-black text-content">{ratingAverage.toFixed(1)}</div>
            <div className="flex justify-center gap-0.5 mt-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={s <= Math.round(ratingAverage) ? 'h-4 w-4 fill-amber-400 text-amber-400' : 'h-4 w-4 text-content-subtle'}
                />
              ))}
            </div>
            <div className="text-xs text-content-muted mt-1">{ratingCount} reviews</div>
          </div>
          {distribution && (
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((r) => {
                const count = distribution[r] || 0;
                const pct = ratingCount > 0 ? (count / ratingCount) * 100 : 0;
                return (
                  <div key={r} className="flex items-center gap-3 text-xs">
                    <span className="font-bold w-3">{r}</span>
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400 -ml-1" />
                    <div className="flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
                      <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-content-subtle w-10 text-right tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Reviews list */}
      <div className="space-y-3">
        {reviews.map((r) => (
          <Card key={r.id} className="p-5">
            <div className="flex items-start gap-3">
              <Avatar src={r.customer.avatarUrl} name={r.customer.fullName} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-content text-sm">{r.customer.fullName}</span>
                  {r.isVerifiedPurchase && (
                    <Badge variant="brand" size="sm">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={s <= r.rating ? 'h-3.5 w-3.5 fill-amber-400 text-amber-400' : 'h-3.5 w-3.5 text-content-subtle'}
                      />
                    ))}
                  </div>
                  <span className="text-2xs text-content-subtle">{timeAgo(r.createdAt)}</span>
                </div>
                {r.title && <p className="font-bold text-content text-sm mt-2">{r.title}</p>}
                {r.comment && <p className="text-sm text-content-muted mt-1 leading-relaxed">{r.comment}</p>}
                {r.imageUrls?.length > 0 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
                    {r.imageUrls.map((url, i) => (
                      <img key={i} src={url} alt="" className="h-20 w-20 rounded-xl object-cover shrink-0" />
                    ))}
                  </div>
                )}
                {r.replyFromShop && (
                  <div className="mt-3 p-3 rounded-2xl bg-brand-50 dark:bg-brand-950/30 border-l-4 border-brand-500">
                    <div className="text-2xs font-black text-brand-700 dark:text-brand-400 uppercase tracking-wider mb-1">
                      Shop reply
                    </div>
                    <p className="text-xs text-content">{r.replyFromShop}</p>
                  </div>
                )}
                <button className="mt-3 inline-flex items-center gap-1 text-xs text-content-muted hover:text-brand-600 font-bold">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Helpful ({r.helpfulCount})
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
