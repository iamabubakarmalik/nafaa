import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Radio, Plus, Calendar, Users, MessageCircle, TrendingUp,
  Play, Square, Eye, Video, X, Package, DollarSign,
} from 'lucide-react';
import { liveShopApi, productPublishingApi, type LiveShopStatus } from '../shared/marketplace.api';
import { relativeTime } from '../shared/status-utils';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const STATUS_META: Record<LiveShopStatus, { label: string; color: string; bg: string; icon: any }> = {
  SCHEDULED: { label: 'Scheduled', color: 'text-blue-800',    bg: 'bg-blue-100',    icon: Calendar },
  LIVE:      { label: 'Live Now',  color: 'text-red-800',     bg: 'bg-red-100',     icon: Radio },
  ENDED:     { label: 'Ended',     color: 'text-emerald-800', bg: 'bg-emerald-100', icon: Square },
  CANCELLED: { label: 'Cancelled', color: 'text-slate-700',   bg: 'bg-slate-100',   icon: X },
};

export default function MarketplaceLiveShopPage() {
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<LiveShopStatus | 'ALL'>('ALL');

  const { data } = useQuery({
    queryKey: ['marketplace-live-shows', filter],
    queryFn: () => liveShopApi.list({ status: filter === 'ALL' ? undefined : filter }),
    refetchInterval: 20_000,
  });

  const items = data?.items || [];
  const counts = data?.counts || {} as Record<LiveShopStatus, number>;

  return (
    <div className="space-y-5 pb-10">
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <Radio className="h-3.5 w-3.5" />
              Live Shopping
              {(counts.LIVE || 0) > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[9px] animate-pulse">
                  🔴 ON AIR
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">Live Shop</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">Real-time video streaming se products bechain — 10x reach</p>
          </div>
          <Button size="lg" onClick={() => setShowCreate(true)} className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl">
            <Plus className="h-4 w-4" />
            Schedule Live Show
          </Button>
        </div>

        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-2 mt-6">
          {(['LIVE', 'SCHEDULED', 'ENDED', 'CANCELLED'] as LiveShopStatus[]).map((s) => {
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
        {(['ALL', 'LIVE', 'SCHEDULED', 'ENDED'] as (LiveShopStatus | 'ALL')[]).map((s) => (
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
          <Radio className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-900">No live shows yet</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Schedule your first live show and reach thousands of customers</p>
          <Button onClick={() => setShowCreate(true)} className="bg-rose-600 hover:bg-rose-700">
            <Plus className="h-4 w-4" />
            Schedule Live Show
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((ls) => (
            <LiveShowCard
              key={ls.id}
              show={ls}
              onGoLive={async () => {
                const streamUrl = prompt('Stream URL (RTMP/HLS):');
                if (streamUrl) {
                  await liveShopApi.goLive(ls.id, streamUrl);
                  qc.invalidateQueries({ queryKey: ['marketplace-live-shows'] });
                  toast.success('🔴 You are now LIVE!');
                }
              }}
              onEnd={async () => {
                if (confirm('End this live show?')) {
                  await liveShopApi.endLive(ls.id);
                  qc.invalidateQueries({ queryKey: ['marketplace-live-shows'] });
                  toast.success('Live show ended');
                }
              }}
              onCancel={async () => {
                if (confirm('Cancel this live show?')) {
                  await liveShopApi.cancel(ls.id);
                  qc.invalidateQueries({ queryKey: ['marketplace-live-shows'] });
                  toast.success('Cancelled');
                }
              }}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateLiveShowModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['marketplace-live-shows'] });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function LiveShowCard({ show: ls, onGoLive, onEnd, onCancel }: any) {
  const meta = STATUS_META[ls.status as LiveShopStatus];
  const StatusIcon = meta.icon;

  return (
    <div className={`rounded-2xl bg-white border-2 overflow-hidden shadow-sm ${
      ls.status === 'LIVE' ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-200'
    }`}>
      <div className="aspect-video bg-slate-900 relative overflow-hidden">
        {ls.coverImageUrl ? (
          <img src={ls.coverImageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-900 to-slate-900">
            <Video className="h-16 w-16 text-white/40" />
          </div>
        )}
        <div className={`absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full ${meta.bg} ${meta.color} inline-flex items-center gap-1 shadow`}>
          <StatusIcon className="h-2.5 w-2.5" />
          {meta.label}
          {ls.status === 'LIVE' && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />}
        </div>
        {ls.status === 'LIVE' && (
          <div className="absolute bottom-2 left-2 flex items-center gap-2">
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-900/80 text-white backdrop-blur inline-flex items-center gap-1">
              <Eye className="h-2.5 w-2.5" />
              {ls.peakViewerCount} viewers
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-black text-slate-900 line-clamp-2">{ls.title}</h3>
        {ls.description && (
          <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">{ls.description}</p>
        )}

        {ls.status === 'SCHEDULED' && ls.scheduledAt && (
          <div className="mt-3 flex items-center gap-1 text-xs text-blue-700 font-bold">
            <Calendar className="h-3 w-3" />
            {new Date(ls.scheduledAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        )}

        <div className="mt-3 grid grid-cols-4 gap-2">
          <MiniStat label="Views" value={ls.totalViewers} icon={Eye} />
          <MiniStat label="Chat" value={ls.totalMessages} icon={MessageCircle} />
          <MiniStat label="Orders" value={ls.totalOrders} icon={Package} />
          <MiniStat label="Revenue" value={`Rs ${formatPKR(ls.totalRevenue)}`} icon={DollarSign} isText />
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 justify-between flex-wrap">
          {ls.status === 'SCHEDULED' && (
            <>
              <button onClick={onGoLive} className="h-8 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-black inline-flex items-center gap-1">
                <Play className="h-3 w-3" />
                Go Live Now
              </button>
              <button onClick={onCancel} className="text-[10px] text-rose-600 hover:text-rose-700 font-black">Cancel</button>
            </>
          )}
          {ls.status === 'LIVE' && (
            <button onClick={onEnd} className="h-8 px-3 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-black inline-flex items-center gap-1">
              <Square className="h-3 w-3" />
              End Show
            </button>
          )}
          <span className="text-[10px] text-slate-500 font-bold ml-auto">{relativeTime(ls.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, isText }: any) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-center">
      <Icon className="h-3 w-3 text-slate-500 mx-auto mb-1" />
      <div className={`font-black text-slate-900 tabular-nums ${isText ? 'text-[10px]' : 'text-sm'}`}>{value}</div>
      <div className="text-[9px] font-black text-slate-500 uppercase">{label}</div>
    </div>
  );
}

function CreateLiveShowModal({ onClose, onSuccess }: any) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    coverImageUrl: '',
    scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    featuredProductIds: [] as string[],
  });
  const [processing, setProcessing] = useState(false);

  const { data: products } = useQuery({
    queryKey: ['marketplace-products-for-live'],
    queryFn: () => productPublishingApi.list({ isListedOnMarketplace: true, limit: 100 }),
  });

  const create = async () => {
    if (!form.title) return toast.error('Title required');
    setProcessing(true);
    try {
      await liveShopApi.create({
        ...form,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
      });
      toast.success('Live show scheduled ✅');
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
        <div className="bg-gradient-to-br from-rose-600 to-pink-600 text-white p-5 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black">
              <Radio className="h-3 w-3" />
              New Live Show
            </div>
            <h2 className="mt-2 text-xl font-black">Schedule Live Show</h2>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Grand Eid Sale — 50% OFF!"
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Kya dikha rahay hain? Special offers?"
              className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-rose-500 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Cover Image URL</label>
            <input
              value={form.coverImageUrl}
              onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
              placeholder="https://..."
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-rose-500"
            />
            {form.coverImageUrl && (
              <img src={form.coverImageUrl} alt="" className="mt-2 h-24 w-full rounded-xl object-cover border-2 border-slate-200" />
            )}
          </div>

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Scheduled At</label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Featured Products (multi-select)</label>
            <div className="max-h-48 overflow-y-auto rounded-xl border-2 border-slate-200 p-2 space-y-1">
              {products?.items.map((p) => {
                const isSelected = form.featuredProductIds.includes(p.productId);
                return (
                  <label
                    key={p.productId}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ${
                      isSelected ? 'bg-rose-50 border-rose-300 border' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        setForm({
                          ...form,
                          featuredProductIds: e.target.checked
                            ? [...form.featuredProductIds, p.productId]
                            : form.featuredProductIds.filter((id) => id !== p.productId),
                        });
                      }}
                      className="h-4 w-4 rounded"
                    />
                    <div className="h-8 w-8 rounded bg-slate-100 overflow-hidden shrink-0">
                      {p.publicImages?.[0] && <img src={p.publicImages[0]} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="font-black text-slate-900 truncate">{p.publicName}</div>
                      <div className="text-[10px] text-slate-500 font-bold">Rs {formatPKR(p.publicPrice)}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              {form.featuredProductIds.length} selected
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200">
            Cancel
          </button>
          <Button onClick={create} loading={processing} className="bg-gradient-to-r from-rose-600 to-pink-600">
            <Radio className="h-4 w-4" />
            Schedule Show
          </Button>
        </div>
      </div>
    </div>
  );
}
