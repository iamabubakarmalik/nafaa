import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Star, MessageCircle, Search, Filter, Send, EyeOff, Flag,
  CheckCircle2, User, ThumbsUp, Sparkles, X, Image as ImageIcon,
} from 'lucide-react';
import { reviewsApi, type ShopReview } from '../shared/marketplace.api';
import { relativeTime } from '../shared/status-utils';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { Button } from '@core/ui/Button';

type Filter = 'all' | 'unresponded' | 'positive' | 'negative';

export default function MarketplaceReviewsPage() {
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);

  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<ShopReview | null>(null);

  const params = {
    rating: starFilter || undefined,
    hasReply: filter === 'unresponded' ? false : undefined,
  };

  const { data } = useQuery({
    queryKey: ['marketplace-reviews', params],
    queryFn: () => reviewsApi.list(params),
  });

  const items = data?.items.filter((r) => {
    if (filter === 'positive' && r.rating < 4) return false;
    if (filter === 'negative' && r.rating >= 3) return false;
    if (search && !(r.comment?.toLowerCase().includes(search.toLowerCase()) || r.customer?.fullName.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  }) || [];

  const counts = data?.counts || { total: 0, unresponded: 0, avgRating: 0, byStar: {} };

  return (
    <div className="space-y-5 pb-10">
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
              Customer Reviews
              {counts.unresponded > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] animate-pulse">
                  {counts.unresponded} PENDING
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">Reviews & Ratings</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">
              Customer feedback ka jawab dein — trust build karein
            </p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-black tabular-nums flex items-center gap-2">
              <Star className="h-8 w-8 fill-amber-300 text-amber-300" />
              {counts.avgRating.toFixed(1)}
            </div>
            <div className="text-xs text-white/70 font-bold">from {counts.total} reviews</div>
          </div>
        </div>

        <div className="relative grid grid-cols-5 gap-2 mt-6">
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-2.5">
              <div className="flex items-center gap-1 text-amber-300">
                {[...Array(star)].map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-current" />
                ))}
              </div>
              <div className="text-xl font-black tabular-nums mt-1">{counts.byStar?.[star] || 0}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'unresponded', 'positive', 'negative'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-black transition border-2 ${
              filter === f
                ? 'bg-slate-900 text-white border-slate-900 shadow'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            {f === 'all' && 'All Reviews'}
            {f === 'unresponded' && `Unresponded (${counts.unresponded})`}
            {f === 'positive' && '⭐ Positive (4-5)'}
            {f === 'negative' && '⚠️ Negative (1-3)'}
          </button>
        ))}

        <div className="ml-auto flex gap-1">
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              onClick={() => setStarFilter(starFilter === s ? null : s)}
              className={`h-9 px-2.5 rounded-lg text-xs font-black inline-flex items-center gap-1 transition border-2 ${
                starFilter === s
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
              }`}
            >
              {s}<Star className="h-3 w-3 fill-current" />
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500"
            placeholder="Search reviews or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Reviews list */}
      {items.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <Star className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-900">No reviews yet</h3>
          <p className="text-sm text-slate-500 mt-1">Customers ke reviews yahan appear honge</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onReply={() => setReplyingTo(review)}
              onHide={async () => {
                if (confirm('Hide this review?')) {
                  await reviewsApi.hide(review.id);
                  qc.invalidateQueries({ queryKey: ['marketplace-reviews'] });
                  toast.success('Review hidden');
                }
              }}
              onReport={async () => {
                const reason = prompt('Report reason:');
                if (reason) {
                  await reviewsApi.report(review.id, reason);
                  qc.invalidateQueries({ queryKey: ['marketplace-reviews'] });
                  toast.success('Reported for moderation');
                }
              }}
            />
          ))}
        </div>
      )}

      {replyingTo && (
        <ReplyModal
          review={replyingTo}
          onClose={() => setReplyingTo(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['marketplace-reviews'] });
            setReplyingTo(null);
          }}
        />
      )}
    </div>
  );
}

function ReviewCard({ review, onReply, onHide, onReport }: any) {
  const hasReply = !!review.replyFromShop;
  const isNegative = review.rating <= 2;

  return (
    <div className={`rounded-2xl bg-white border-2 p-5 shadow-sm ${
      isNegative && !hasReply ? 'border-rose-300 ring-2 ring-rose-100' :
      !hasReply ? 'border-amber-300' : 'border-slate-200'
    }`}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-slate-100 overflow-hidden shrink-0">
          {review.customer?.avatarUrl ? (
            <img src={review.customer.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <User className="h-5 w-5" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-slate-900">{review.customer?.fullName || 'Anonymous'}</span>
            {review.isVerifiedPurchase && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center gap-0.5">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-current' : ''}`} />
              ))}
            </div>
            <span className="text-[10px] text-slate-500 font-bold">{relativeTime(review.createdAt)}</span>
          </div>

          {review.title && (
            <div className="font-black text-slate-900 mt-2">{review.title}</div>
          )}

          {review.comment && (
            <p className="text-sm text-slate-700 font-medium mt-1 leading-relaxed">{review.comment}</p>
          )}

          {review.imageUrls?.length > 0 && (
            <div className="flex gap-2 mt-2">
              {review.imageUrls.slice(0, 4).map((url: string, idx: number) => (
                <img key={idx} src={url} alt="" className="h-16 w-16 rounded-lg object-cover border-2 border-slate-200" />
              ))}
            </div>
          )}

          {review.product && (
            <div className="mt-3 inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-50 text-xs">
              {review.product.imageUrl && (
                <img src={review.product.imageUrl} alt="" className="h-6 w-6 rounded object-cover" />
              )}
              <span className="text-slate-700 font-bold">{review.product.name}</span>
            </div>
          )}

          {hasReply && (
            <div className="mt-4 ml-4 pl-4 border-l-4 border-emerald-300 bg-emerald-50 rounded-r-lg p-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 mb-1">
                🏪 Shop Reply
              </div>
              <p className="text-sm text-slate-700 font-medium">{review.replyFromShop}</p>
              {review.repliedAt && (
                <div className="text-[10px] text-slate-500 font-bold mt-1">{relativeTime(review.repliedAt)}</div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {!hasReply && (
              <button
                onClick={onReply}
                className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1 shadow"
              >
                <MessageCircle className="h-3 w-3" />
                Reply
              </button>
            )}
            <button
              onClick={onHide}
              className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black inline-flex items-center gap-1"
            >
              <EyeOff className="h-3 w-3" />
              Hide
            </button>
            <button
              onClick={onReport}
              className="h-8 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black inline-flex items-center gap-1 border border-rose-200"
            >
              <Flag className="h-3 w-3" />
              Report
            </button>
            {review.helpfulCount > 0 && (
              <span className="ml-auto text-xs text-slate-500 font-bold inline-flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                {review.helpfulCount} helpful
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReplyModal({ review, onClose, onSuccess }: any) {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await reviewsApi.reply(review.id, reply);
      toast.success('Reply sent ✅');
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed');
    } finally {
      setSending(false);
    }
  };

  const templates = [
    'Shukriya aap ke feedback ka! Hum aap ki service se khush hain 🙏',
    'Bohat shukriya! Aap jaise customers hi humari taraqqi ki wajah hain.',
    'Aap ka review dekh ke bohat khushi hui. Umeed hai aage bhi service pasand aayegi.',
    'Sorry aap ka experience acha nahi raha. Hum improve karne ki koshish karenge.',
    'Aap ki concern samajh gaye. Agli order pe extra care lenge — please give us another chance.',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white p-5 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black">
              <MessageCircle className="h-3 w-3" />
              Reply to Review
            </div>
            <h2 className="mt-2 text-lg font-black">{review.customer?.fullName || 'Customer'}</h2>
            <div className="flex text-amber-300 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-current' : ''}`} />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {review.comment && (
            <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3">
              <div className="text-[10px] font-black uppercase text-slate-500 mb-1">Original Review</div>
              <p className="text-sm text-slate-700 font-medium">{review.comment}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-black text-slate-700 mb-2 block">Your Reply</label>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={5}
              maxLength={500}
              placeholder="Type your professional reply..."
              className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-emerald-500 resize-none"
              autoFocus
            />
            <div className="text-right text-[10px] font-bold text-slate-400 mt-1">
              {reply.length}/500
            </div>
          </div>

          <div>
            <div className="text-[10px] font-black uppercase text-slate-500 mb-2">Quick Templates</div>
            <div className="space-y-1.5">
              {templates.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setReply(t)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 text-xs text-slate-700 font-medium transition"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200">
            Cancel
          </button>
          <Button onClick={send} loading={sending} disabled={!reply.trim()} className="bg-gradient-to-r from-emerald-600 to-teal-600">
            <Send className="h-4 w-4" />
            Send Reply
          </Button>
        </div>
      </div>
    </div>
  );
}
