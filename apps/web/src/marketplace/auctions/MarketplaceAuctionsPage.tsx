import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Gavel, Plus, Clock, TrendingUp, CheckCircle2, XCircle, X,
  Package, Calendar, Trophy, DollarSign, Activity, User,
} from 'lucide-react';
import { auctionsApi, productPublishingApi, type AuctionStatus } from '../shared/marketplace.api';
import { relativeTime } from '../shared/status-utils';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const STATUS_META: Record<AuctionStatus, { label: string; color: string; bg: string; icon: any }> = {
  DRAFT:     { label: 'Draft',     color: 'text-slate-700',   bg: 'bg-slate-100',   icon: Clock },
  SCHEDULED: { label: 'Scheduled', color: 'text-blue-800',    bg: 'bg-blue-100',    icon: Calendar },
  LIVE:      { label: 'Live Now',  color: 'text-red-800',     bg: 'bg-red-100',     icon: Activity },
  ENDED:     { label: 'Ended',     color: 'text-emerald-800', bg: 'bg-emerald-100', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'text-slate-700',   bg: 'bg-slate-100',   icon: XCircle },
};

export default function MarketplaceAuctionsPage() {
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<AuctionStatus | 'ALL'>('LIVE');

  const { data } = useQuery({
    queryKey: ['marketplace-auctions', filter],
    queryFn: () => auctionsApi.list({ status: filter === 'ALL' ? undefined : filter }),
    refetchInterval: 15_000,
  });

  const items = data?.items || [];
  const counts = data?.counts || {} as Record<AuctionStatus, number>;

  return (
    <div className="space-y-5 pb-10">
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <Gavel className="h-3.5 w-3.5" />
              Live Auctions
              {(counts.LIVE || 0) > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[9px] animate-pulse">
                  🔴 {counts.LIVE} LIVE
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">Auction House</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">Products ki live nilami — sab se ooncha bidder jeetega</p>
          </div>
          <Button size="lg" onClick={() => setShowCreate(true)} className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl">
            <Plus className="h-4 w-4" />
            Create Auction
          </Button>
        </div>

        <div className="relative grid grid-cols-3 md:grid-cols-5 gap-2 mt-6">
          {(['LIVE', 'SCHEDULED', 'ENDED', 'DRAFT', 'CANCELLED'] as AuctionStatus[]).map((s) => {
            const meta = STATUS_META[s];
            const StatusIcon = meta.icon;
            return (
              <div key={s} className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <StatusIcon className="h-3 w-3 opacity-80" />
                  <div className="text-[9px] uppercase tracking-wider font-black opacity-90 truncate">{s}</div>
                </div>
                <div className="text-xl font-black tabular-nums">{counts[s] || 0}</div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex items-center gap-2 flex-wrap">
        {(['LIVE', 'SCHEDULED', 'ENDED', 'DRAFT', 'ALL'] as (AuctionStatus | 'ALL')[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-black transition border-2 ${
              filter === s ? 'bg-slate-900 text-white border-slate-900 shadow' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <Gavel className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-900">No auctions</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Create your first auction to sell high-value items</p>
          <Button onClick={() => setShowCreate(true)} className="bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4" />
            Create Auction
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((a) => (
            <AuctionCard key={a.id} auction={a} onCancel={async () => {
              const reason = prompt('Cancel reason?');
              if (reason !== null) {
                await auctionsApi.cancel(a.id, reason);
                qc.invalidateQueries({ queryKey: ['marketplace-auctions'] });
                toast.success('Auction cancelled');
              }
            }} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateAuctionModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['marketplace-auctions'] });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function AuctionCard({ auction: a, onCancel }: any) {
  const meta = STATUS_META[a.status as AuctionStatus];
  const StatusIcon = meta.icon;
  const priceIncrease = ((a.currentPrice - a.startPrice) / a.startPrice) * 100;
  const timeLeftMs = new Date(a.endsAt).getTime() - Date.now();
  const isLive = a.status === 'LIVE';
  const hoursLeft = Math.max(0, Math.floor(timeLeftMs / 3600000));
  const minsLeft = Math.max(0, Math.floor((timeLeftMs % 3600000) / 60000));

  return (
    <div className={`rounded-2xl bg-white border-2 overflow-hidden shadow-sm ${
      isLive ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'
    }`}>
      <div className="aspect-video bg-slate-100 relative overflow-hidden">
        {a.imageUrls?.[0] ? (
          <img src={a.imageUrls[0]} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <Gavel className="h-12 w-12" />
          </div>
        )}
        <div className={`absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full ${meta.bg} ${meta.color} inline-flex items-center gap-1 shadow`}>
          <StatusIcon className="h-2.5 w-2.5" />
          {meta.label}
          {isLive && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />}
        </div>
        {isLive && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/80 text-white text-[10px] font-black backdrop-blur">
            ⏱ {hoursLeft}h {minsLeft}m
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-black text-slate-900 line-clamp-2">{a.title}</h3>
        {a.description && (
          <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">{a.description}</p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
            <div className="text-[9px] font-black uppercase text-slate-500">Start Price</div>
            <div className="text-sm font-black text-slate-900 tabular-nums">Rs {formatPKR(a.startPrice)}</div>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-200 p-2">
            <div className="text-[9px] font-black uppercase text-red-700">Current</div>
            <div className="text-sm font-black text-red-700 tabular-nums">Rs {formatPKR(a.currentPrice)}</div>
            {priceIncrease > 0 && (
              <div className="text-[9px] font-black text-emerald-600">+{priceIncrease.toFixed(0)}%</div>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs font-bold">
          <span className="text-slate-600 inline-flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {a.bidCount} bids
          </span>
          <span className="text-slate-600">
            +Rs {formatPKR(a.bidIncrement)} min
          </span>
        </div>

        {a.recentBids && a.recentBids.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
            <div className="text-[10px] font-black uppercase text-slate-500 mb-1">Recent Bids</div>
            {a.recentBids.slice(0, 2).map((bid: any) => (
              <div key={bid.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <div className="h-5 w-5 rounded-full bg-slate-100 overflow-hidden shrink-0">
                    {bid.customer?.avatarUrl ? (
                      <img src={bid.customer.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-slate-500">
                        {bid.customer?.fullName?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-slate-700 truncate">{bid.customer?.fullName || 'Anon'}</span>
                </div>
                <span className="font-black text-emerald-700 tabular-nums">Rs {formatPKR(bid.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {isLive && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-bold">Started {relativeTime(a.createdAt)}</span>
            <button onClick={onCancel} className="text-[10px] text-rose-600 hover:text-rose-700 font-black">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateAuctionModal({ onClose, onSuccess }: any) {
  const [form, setForm] = useState({
    productId: '',
    title: '',
    description: '',
    imageUrls: [] as string[],
    startPrice: 100,
    reservePrice: undefined as number | undefined,
    bidIncrement: 50,
    startsAt: new Date().toISOString().slice(0, 16),
    endsAt: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16),
    autoExtendOnBid: true,
  });
  const [processing, setProcessing] = useState(false);

  const { data: products } = useQuery({
    queryKey: ['marketplace-products-for-auction'],
    queryFn: () => productPublishingApi.list({ isListedOnMarketplace: true, limit: 100 }),
  });

  const create = async () => {
    if (!form.title) return toast.error('Title required');
    if (form.startPrice <= 0) return toast.error('Valid start price');
    if (new Date(form.endsAt) <= new Date(form.startsAt)) return toast.error('End must be after start');
    setProcessing(true);
    try {
      await auctionsApi.create({
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      });
      toast.success('Auction created ✅');
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed');
    } finally {
      setProcessing(false);
    }
  };

  const addImage = () => {
    const url = prompt('Image URL:');
    if (url) setForm({ ...form, imageUrls: [...form.imageUrls, url] });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-br from-red-600 to-rose-700 text-white p-5 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black">
              <Gavel className="h-3 w-3" />
              New Auction
            </div>
            <h2 className="mt-2 text-xl font-black">Create Auction</h2>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Linked Product (optional)</label>
            <select
              value={form.productId}
              onChange={(e) => {
                const p = products?.items.find((x) => x.productId === e.target.value);
                if (p) {
                  setForm({
                    ...form,
                    productId: e.target.value,
                    title: form.title || p.publicName,
                    description: form.description || p.publicDescription || '',
                    imageUrls: form.imageUrls.length ? form.imageUrls : p.publicImages || [],
                    startPrice: form.startPrice || Math.round(Number(p.publicPrice) * 0.5),
                  });
                } else {
                  setForm({ ...form, productId: '' });
                }
              }}
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-red-500"
            >
              <option value="">No product (standalone auction)</option>
              {products?.items.map((p) => (
                <option key={p.productId} value={p.productId}>{p.publicName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Antique Persian Rug — Rare Find"
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Item ki details, condition, provenance..."
              className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-red-500 resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-black text-slate-700">Images</label>
              <button onClick={addImage} className="h-7 px-2 rounded-lg bg-red-600 text-white text-[10px] font-black inline-flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            {form.imageUrls.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {form.imageUrls.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg bg-slate-100 overflow-hidden border-2 border-slate-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setForm({ ...form, imageUrls: form.imageUrls.filter((_, idx) => idx !== i) })}
                      className="absolute top-1 right-1 h-5 w-5 rounded-md bg-rose-600 text-white flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Start Price (PKR)</label>
              <input
                type="number"
                min={1}
                value={form.startPrice}
                onChange={(e) => setForm({ ...form, startPrice: Number(e.target.value) })}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Bid Increment</label>
              <input
                type="number"
                min={1}
                value={form.bidIncrement}
                onChange={(e) => setForm({ ...form, bidIncrement: Number(e.target.value) })}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Reserve Price (optional)</label>
            <input
              type="number"
              min={0}
              value={form.reservePrice ?? ''}
              onChange={(e) => setForm({ ...form, reservePrice: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="Minimum price ke liye — is se kam ho to auction fail"
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Starts At</label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Ends At</label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-red-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.autoExtendOnBid}
              onChange={(e) => setForm({ ...form, autoExtendOnBid: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm font-bold text-slate-700">Auto-extend if bid in last 2 minutes (anti-snipe)</span>
          </label>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200">
            Cancel
          </button>
          <Button onClick={create} loading={processing} className="bg-gradient-to-r from-red-600 to-rose-700">
            <Gavel className="h-4 w-4" />
            Create Auction
          </Button>
        </div>
      </div>
    </div>
  );
}
