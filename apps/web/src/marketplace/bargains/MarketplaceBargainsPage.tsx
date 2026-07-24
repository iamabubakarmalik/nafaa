import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MessageSquare, Search, TrendingDown, TrendingUp, CheckCircle2,
  XCircle, Clock, Sparkles, X, ArrowRight, User, Package, DollarSign,
} from 'lucide-react';
import { bargainsApi, type Bargain, type BargainStatus } from '../shared/marketplace.api';
import { relativeTime } from '../shared/status-utils';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const STATUS_META: Record<BargainStatus, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:         { label: 'Awaiting Your Response', color: 'text-amber-800',   bg: 'bg-amber-100',   icon: Clock },
  COUNTER_OFFERED: { label: 'Counter Offered',         color: 'text-blue-800',    bg: 'bg-blue-100',    icon: TrendingUp },
  ACCEPTED:        { label: 'Accepted',                color: 'text-emerald-800', bg: 'bg-emerald-100', icon: CheckCircle2 },
  REJECTED:        { label: 'Rejected',                color: 'text-rose-800',    bg: 'bg-rose-100',    icon: XCircle },
  EXPIRED:         { label: 'Expired',                 color: 'text-slate-700',   bg: 'bg-slate-100',   icon: Clock },
  CONVERTED:       { label: 'Converted to Order',      color: 'text-emerald-800', bg: 'bg-emerald-100', icon: CheckCircle2 },
};

export default function MarketplaceBargainsPage() {
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);

  const [filter, setFilter] = useState<BargainStatus | 'ALL'>('PENDING');
  const [selected, setSelected] = useState<Bargain | null>(null);

  const { data } = useQuery({
    queryKey: ['marketplace-bargains', filter],
    queryFn: () => bargainsApi.list({ status: filter === 'ALL' ? undefined : [filter] }),
    refetchInterval: 20_000,
  });

  const items = data?.items || [];
  const counts = data?.counts || {} as Record<BargainStatus, number>;

  return (
    <div className="space-y-5 pb-10">
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <MessageSquare className="h-3.5 w-3.5" />
              Bargain Offers
              {(counts.PENDING || 0) > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] animate-pulse">
                  {counts.PENDING} PENDING
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">Mol-Bhaav (Bargain)</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">
              Customer offers ka jawab dein — accept, reject, ya counter offer
            </p>
          </div>
        </div>

        <div className="relative grid grid-cols-3 md:grid-cols-6 gap-2 mt-6">
          {(['PENDING', 'COUNTER_OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'] as BargainStatus[]).map((s) => {
            const meta = STATUS_META[s];
            const StatusIcon = meta.icon;
            return (
              <div key={s} className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <StatusIcon className="h-3 w-3 opacity-80" />
                  <div className="text-[9px] uppercase tracking-wider font-black opacity-90 truncate">{s.replace(/_/g, ' ')}</div>
                </div>
                <div className="text-xl font-black tabular-nums">{counts[s] || 0}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['PENDING', 'COUNTER_OFFERED', 'ACCEPTED', 'REJECTED', 'ALL'] as (BargainStatus | 'ALL')[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-black transition border-2 ${
              filter === s
                ? 'bg-slate-900 text-white border-slate-900 shadow'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            {s === 'ALL' ? 'All' : STATUS_META[s]?.label || s}
            {s !== 'ALL' && (counts[s] || 0) > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                filter === s ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {counts[s]}
              </span>
            )}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <MessageSquare className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-900">No bargain offers</h3>
          <p className="text-sm text-slate-500 mt-1">Customer offers yahan appear honge</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map((bargain) => (
            <BargainCard
              key={bargain.id}
              bargain={bargain}
              onOpen={() => setSelected(bargain)}
            />
          ))}
        </div>
      )}

      {selected && (
        <BargainModal
          bargain={selected}
          onClose={() => setSelected(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['marketplace-bargains'] });
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function BargainCard({ bargain, onOpen }: any) {
  const meta = STATUS_META[bargain.status as BargainStatus];
  const StatusIcon = meta.icon;
  const discount = ((bargain.originalPrice - bargain.customerOffer) / bargain.originalPrice) * 100;
  const isPending = bargain.status === 'PENDING';
  const timeLeftMs = new Date(bargain.expiresAt).getTime() - Date.now();
  const hoursLeft = Math.max(0, Math.floor(timeLeftMs / 3600000));

  return (
    <div className={`rounded-2xl bg-white border-2 p-4 transition-all cursor-pointer hover:shadow-md ${
      isPending ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200 hover:border-slate-300'
    }`} onClick={onOpen}>
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 rounded-xl bg-slate-100 overflow-hidden shrink-0">
          {bargain.productImage ? (
            <img src={bargain.productImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <Package className="h-6 w-6" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${meta.bg} ${meta.color} inline-flex items-center gap-0.5`}>
              <StatusIcon className="h-2.5 w-2.5" />
              {meta.label}
            </span>
            {isPending && hoursLeft > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                ⏱ {hoursLeft}h left
              </span>
            )}
          </div>

          <div className="font-black text-slate-900 text-sm mt-1 line-clamp-1">{bargain.productName}</div>

          <div className="flex items-center gap-2 mt-1 text-xs">
            <User className="h-3 w-3 text-slate-400" />
            <span className="text-slate-600 font-bold truncate">{bargain.customer?.fullName || 'Customer'}</span>
          </div>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <div className="text-xs">
              <span className="text-slate-500 font-bold line-through">Rs {formatPKR(bargain.originalPrice)}</span>
            </div>
            <div className="text-xs text-slate-400">→</div>
            <div className="text-sm font-black text-purple-700 tabular-nums">
              Rs {formatPKR(bargain.customerOffer)}
            </div>
            <div className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
              -{discount.toFixed(0)}%
            </div>
          </div>

          {bargain.customerMessage && (
            <div className="mt-2 text-xs text-slate-600 font-medium bg-slate-50 rounded p-2 line-clamp-2">
              "{bargain.customerMessage}"
            </div>
          )}

          <div className="mt-2 text-[10px] text-slate-500 font-bold">
            Offer #{bargain.offerCount}/{bargain.maxOffers} · {relativeTime(bargain.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

function BargainModal({ bargain, onClose, onSuccess }: any) {
  const [action, setAction] = useState<'accept' | 'reject' | 'counter' | null>(null);
  const [counterOffer, setCounterOffer] = useState<number>(
    Math.round((bargain.customerOffer + bargain.originalPrice) / 2)
  );
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  const isPending = bargain.status === 'PENDING' || bargain.status === 'COUNTER_OFFERED';
  const discount = ((bargain.originalPrice - bargain.customerOffer) / bargain.originalPrice) * 100;

  const execute = async () => {
    if (!action) return;
    setProcessing(true);
    try {
      if (action === 'accept') {
        await bargainsApi.accept(bargain.id);
        toast.success('Offer accepted! Order create ho gayi 🎉');
      } else if (action === 'reject') {
        await bargainsApi.reject(bargain.id, message || undefined);
        toast.success('Offer rejected');
      } else if (action === 'counter') {
        if (counterOffer <= bargain.customerOffer) {
          toast.error('Counter offer customer ke offer se zyada ho');
          setProcessing(false);
          return;
        }
        if (counterOffer >= bargain.originalPrice) {
          toast.error('Counter offer original price se kam ho');
          setProcessing(false);
          return;
        }
        await bargainsApi.counter(bargain.id, counterOffer, message || undefined);
        toast.success('Counter offer sent ✅');
      }
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white p-5 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black">
              <MessageSquare className="h-3 w-3" />
              Bargain Offer
            </div>
            <h2 className="mt-2 text-lg font-black">{bargain.productName}</h2>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-4">
            <div className="text-xs font-black uppercase text-slate-500 mb-2">Customer Info</div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              <span className="font-black text-slate-900">{bargain.customer?.fullName || 'Customer'}</span>
            </div>
            {bargain.customer?.phone && (
              <div className="text-xs text-slate-600 font-medium mt-1">{bargain.customer.phone}</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 text-center">
              <div className="text-[10px] font-black uppercase text-slate-500">Original</div>
              <div className="text-lg font-black text-slate-900 tabular-nums mt-1">Rs {formatPKR(bargain.originalPrice)}</div>
            </div>
            <div className="rounded-xl bg-purple-50 border-2 border-purple-300 p-3 text-center">
              <div className="text-[10px] font-black uppercase text-purple-700">Customer Offer</div>
              <div className="text-lg font-black text-purple-700 tabular-nums mt-1">Rs {formatPKR(bargain.customerOffer)}</div>
              <div className="text-[9px] font-black text-purple-600 mt-0.5">-{discount.toFixed(0)}% discount</div>
            </div>
          </div>

          <div className="text-center text-xs text-slate-600 font-bold">
            Quantity: <span className="text-slate-900 font-black">{bargain.quantity}</span> ·
            Total: <span className="text-emerald-700 font-black">Rs {formatPKR(bargain.customerOffer * bargain.quantity)}</span>
          </div>

          {bargain.customerMessage && (
            <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3">
              <div className="text-[10px] font-black uppercase text-amber-700 mb-1">Customer Message</div>
              <p className="text-sm text-slate-700 font-medium">"{bargain.customerMessage}"</p>
            </div>
          )}

          {isPending && (
            <>
              <div className="border-t-2 border-slate-100 pt-4">
                <div className="text-sm font-black text-slate-700 mb-3">Choose Action</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setAction('accept')}
                    className={`p-3 rounded-xl border-2 transition ${
                      action === 'accept' ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto" />
                    <div className="text-xs font-black text-emerald-700 mt-1">Accept</div>
                  </button>
                  <button
                    onClick={() => setAction('counter')}
                    className={`p-3 rounded-xl border-2 transition ${
                      action === 'counter' ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <TrendingUp className="h-5 w-5 text-blue-600 mx-auto" />
                    <div className="text-xs font-black text-blue-700 mt-1">Counter</div>
                  </button>
                  <button
                    onClick={() => setAction('reject')}
                    className={`p-3 rounded-xl border-2 transition ${
                      action === 'reject' ? 'bg-rose-50 border-rose-500' : 'bg-white border-slate-200 hover:border-rose-300'
                    }`}
                  >
                    <XCircle className="h-5 w-5 text-rose-600 mx-auto" />
                    <div className="text-xs font-black text-rose-700 mt-1">Reject</div>
                  </button>
                </div>
              </div>

              {action === 'counter' && (
                <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-4 space-y-3">
                  <label className="text-xs font-black text-blue-900 block">Your Counter Offer (PKR)</label>
                  <input
                    type="number"
                    min={bargain.customerOffer + 1}
                    max={bargain.originalPrice - 1}
                    value={counterOffer}
                    onChange={(e) => setCounterOffer(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl border-2 border-blue-300 bg-white text-lg font-black outline-none focus:border-blue-500"
                  />
                  <div className="text-[10px] font-bold text-blue-700">
                    Suggested range: Rs {formatPKR(bargain.customerOffer + 100)} - Rs {formatPKR(bargain.originalPrice - 100)}
                  </div>
                </div>
              )}

              {(action === 'counter' || action === 'reject') && (
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1.5">
                    Message to Customer {action === 'counter' && '(optional)'}
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    maxLength={200}
                    placeholder={action === 'counter' ? "Aap ki offer accept nahi kar sakta. Ye final price hai..." : "Discount possible nahi hai is item pe..."}
                    className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {isPending && action && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200">
              Cancel
            </button>
            <Button
              onClick={execute}
              loading={processing}
              className={
                action === 'accept' ? 'bg-emerald-600 hover:bg-emerald-700' :
                action === 'counter' ? 'bg-blue-600 hover:bg-blue-700' :
                'bg-rose-600 hover:bg-rose-700'
              }
            >
              {action === 'accept' && <><CheckCircle2 className="h-4 w-4" />Accept Offer</>}
              {action === 'counter' && <><ArrowRight className="h-4 w-4" />Send Counter</>}
              {action === 'reject' && <><XCircle className="h-4 w-4" />Reject Offer</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
