import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Users, Plus, TrendingUp, Clock, CheckCircle2, XCircle, X,
  Sparkles, Package, Calendar, AlertCircle,
} from 'lucide-react';
import { groupBuysApi, productPublishingApi, type GroupBuyStatus } from '../shared/marketplace.api';
import { relativeTime } from '../shared/status-utils';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const STATUS_META: Record<GroupBuyStatus, { label: string; color: string; bg: string; icon: any }> = {
  DRAFT:     { label: 'Draft',     color: 'text-slate-700',   bg: 'bg-slate-100',   icon: Clock },
  ACTIVE:    { label: 'Active',    color: 'text-emerald-800', bg: 'bg-emerald-100', icon: TrendingUp },
  SUCCESS:   { label: 'Success',   color: 'text-blue-800',    bg: 'bg-blue-100',    icon: CheckCircle2 },
  FAILED:    { label: 'Failed',    color: 'text-rose-800',    bg: 'bg-rose-100',    icon: XCircle },
  CANCELLED: { label: 'Cancelled', color: 'text-slate-700',   bg: 'bg-slate-100',   icon: XCircle },
};

export default function MarketplaceGroupBuysPage() {
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<GroupBuyStatus | 'ALL'>('ACTIVE');

  const { data } = useQuery({
    queryKey: ['marketplace-group-buys', filter],
    queryFn: () => groupBuysApi.list({ status: filter === 'ALL' ? undefined : filter }),
    refetchInterval: 30_000,
  });

  const items = data?.items || [];
  const counts = data?.counts || {} as Record<GroupBuyStatus, number>;

  return (
    <div className="space-y-5 pb-10">
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <Users className="h-3.5 w-3.5" />
              Group Buy Campaigns
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">Group Buy</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">
              Pinduoduo-style — multiple customers milkar khareedain, sab ko discount
            </p>
          </div>
          <Button size="lg" onClick={() => setShowCreate(true)} className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl">
            <Plus className="h-4 w-4" />
            Create Group Buy
          </Button>
        </div>

        <div className="relative grid grid-cols-3 md:grid-cols-5 gap-2 mt-6">
          {(['ACTIVE', 'SUCCESS', 'FAILED', 'DRAFT', 'CANCELLED'] as GroupBuyStatus[]).map((s) => {
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
        {(['ACTIVE', 'SUCCESS', 'FAILED', 'DRAFT', 'ALL'] as (GroupBuyStatus | 'ALL')[]).map((s) => (
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
          <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-900">No group buys yet</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Create your first group buy campaign to attract more customers</p>
          <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            Create Group Buy
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((gb) => (
            <GroupBuyCard key={gb.id} groupBuy={gb} onCancel={async () => {
              const reason = prompt('Cancel reason?');
              if (reason !== null) {
                await groupBuysApi.cancel(gb.id, reason);
                qc.invalidateQueries({ queryKey: ['marketplace-group-buys'] });
                toast.success('Group buy cancelled');
              }
            }} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateGroupBuyModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['marketplace-group-buys'] });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function GroupBuyCard({ groupBuy: gb, onCancel }: any) {
  const meta = STATUS_META[gb.status as GroupBuyStatus];
  const StatusIcon = meta.icon;
  const progress = Math.min(100, (gb.currentCount / gb.minParticipants) * 100);
  const discount = ((gb.originalPrice - gb.groupPrice) / gb.originalPrice) * 100;
  const timeLeftMs = new Date(gb.expiresAt).getTime() - Date.now();
  const hoursLeft = Math.max(0, Math.floor(timeLeftMs / 3600000));
  const daysLeft = Math.floor(hoursLeft / 24);
  const isActive = gb.status === 'ACTIVE';
  const isSuccess = progress >= 100;

  return (
    <div className={`rounded-2xl bg-white border-2 p-5 shadow-sm ${
      isActive && isSuccess ? 'border-emerald-500 ring-2 ring-emerald-100' :
      isActive ? 'border-blue-300' :
      'border-slate-200'
    }`}>
      <div className="flex items-start gap-3">
        <div className="h-16 w-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
          {gb.productImage ? (
            <img src={gb.productImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <Package className="h-7 w-7" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${meta.bg} ${meta.color} inline-flex items-center gap-0.5`}>
              <StatusIcon className="h-2.5 w-2.5" />
              {meta.label}
            </span>
            {isActive && daysLeft > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                ⏱ {daysLeft}d {hoursLeft % 24}h left
              </span>
            )}
          </div>

          <div className="font-black text-slate-900 text-sm mt-1 line-clamp-1">{gb.productName}</div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-slate-500 font-bold line-through">Rs {formatPKR(gb.originalPrice)}</span>
            <span className="text-sm font-black text-orange-700 tabular-nums">Rs {formatPKR(gb.groupPrice)}</span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
              -{discount.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-black">
          <span className="text-slate-700 inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {gb.currentCount} / {gb.minParticipants} joined
          </span>
          <span className={progress >= 100 ? 'text-emerald-700' : 'text-slate-600'}>{progress.toFixed(0)}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {gb.maxParticipants && (
          <div className="text-[10px] font-bold text-slate-500">
            Max cap: {gb.maxParticipants}
          </div>
        )}
      </div>

      {gb.participantsPreview && gb.participantsPreview.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex -space-x-2">
            {gb.participantsPreview.slice(0, 5).map((p: any) => (
              <div key={p.id} className="h-7 w-7 rounded-full bg-slate-100 border-2 border-white overflow-hidden">
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-slate-500">
                    {p.fullName.charAt(0)}
                  </div>
                )}
              </div>
            ))}
          </div>
          {gb.currentCount > 5 && (
            <span className="text-[10px] font-bold text-slate-500">+{gb.currentCount - 5} more</span>
          )}
        </div>
      )}

      {isActive && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
          <span>Started {relativeTime(gb.createdAt)}</span>
          <button onClick={onCancel} className="text-rose-600 hover:text-rose-700 font-black">Cancel</button>
        </div>
      )}
    </div>
  );
}

function CreateGroupBuyModal({ onClose, onSuccess }: any) {
  const [form, setForm] = useState({
    productId: '',
    groupPrice: 0,
    minParticipants: 5,
    maxParticipants: 50,
    startsAt: new Date().toISOString().slice(0, 16),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  });
  const [processing, setProcessing] = useState(false);

  const { data: products } = useQuery({
    queryKey: ['marketplace-products-for-group'],
    queryFn: () => productPublishingApi.list({ isListedOnMarketplace: true, limit: 100 }),
  });

  const selectedProduct = products?.items.find((p) => p.productId === form.productId);

  const create = async () => {
    if (!form.productId) return toast.error('Product select karein');
    if (form.groupPrice <= 0) return toast.error('Valid group price');
    if (form.minParticipants < 2) return toast.error('Min 2 participants required');
    setProcessing(true);
    try {
      await groupBuysApi.create({
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        expiresAt: new Date(form.expiresAt).toISOString(),
      });
      toast.success('Group buy created ✅');
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
        <div className="bg-gradient-to-br from-orange-600 to-red-600 text-white p-5 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black">
              <Users className="h-3 w-3" />
              New Group Buy
            </div>
            <h2 className="mt-2 text-xl font-black">Create Group Buy Campaign</h2>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Product</label>
            <select
              value={form.productId}
              onChange={(e) => {
                const p = products?.items.find((x) => x.productId === e.target.value);
                setForm({
                  ...form,
                  productId: e.target.value,
                  groupPrice: p ? Math.round(Number(p.publicPrice) * 0.8) : 0,
                });
              }}
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-orange-500"
            >
              <option value="">Select from your listed products...</option>
              {products?.items.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.publicName} — Rs {formatPKR(p.publicPrice)}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="rounded-xl bg-orange-50 border-2 border-orange-200 p-3 flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-white overflow-hidden shrink-0">
                {selectedProduct.publicImages?.[0] ? (
                  <img src={selectedProduct.publicImages[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Package className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-sm text-orange-900 truncate">{selectedProduct.publicName}</div>
                <div className="text-xs text-orange-700 font-bold">Original: Rs {formatPKR(selectedProduct.publicPrice)}</div>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Group Price (PKR)</label>
            <input
              type="number"
              min={1}
              value={form.groupPrice}
              onChange={(e) => setForm({ ...form, groupPrice: Number(e.target.value) })}
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-orange-500"
            />
            {selectedProduct && form.groupPrice > 0 && (
              <p className="text-xs text-orange-700 font-bold mt-1">
                Discount: {(((Number(selectedProduct.publicPrice) - form.groupPrice) / Number(selectedProduct.publicPrice)) * 100).toFixed(1)}% OFF
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Min Participants</label>
              <input
                type="number"
                min={2}
                value={form.minParticipants}
                onChange={(e) => setForm({ ...form, minParticipants: Number(e.target.value) })}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-orange-500"
              />
              <p className="text-[10px] text-slate-500 font-medium mt-1">Target hit hone tak wait</p>
            </div>
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Max Participants</label>
              <input
                type="number"
                min={form.minParticipants}
                value={form.maxParticipants}
                onChange={(e) => setForm({ ...form, maxParticipants: Number(e.target.value) })}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-orange-500"
              />
              <p className="text-[10px] text-slate-500 font-medium mt-1">Cap for total buyers</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Starts</label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Expires</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 text-xs text-blue-800 font-medium">
            💡 <strong>Tip:</strong> Agar min participants target hit ho gaya to sab ko discount price milega, warna sab ka amount refund ho jayega.
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200">
            Cancel
          </button>
          <Button onClick={create} loading={processing} className="bg-gradient-to-r from-orange-600 to-red-600">
            <Users className="h-4 w-4" />
            Create Group Buy
          </Button>
        </div>
      </div>
    </div>
  );
}
