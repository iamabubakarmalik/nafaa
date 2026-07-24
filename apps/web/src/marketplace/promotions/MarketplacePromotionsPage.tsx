import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Megaphone, Plus, Percent, Zap, Package, Clock, Sparkles, X,
  Play, Pause, Archive, Trash2, Copy, Calendar, Tag,
} from 'lucide-react';
import { promotionsApi, type PromoStatus, type PromoType } from '../shared/marketplace.api';
import { relativeTime } from '../shared/status-utils';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const TYPE_META: Record<PromoType, { label: string; icon: any; color: string }> = {
  COUPON:      { label: 'Coupon',      icon: Tag,       color: 'bg-purple-500' },
  FLASH_SALE:  { label: 'Flash Sale',  icon: Zap,       color: 'bg-orange-500' },
  BUNDLE:      { label: 'Bundle',      icon: Package,   color: 'bg-blue-500' },
  HAPPY_HOUR:  { label: 'Happy Hour',  icon: Clock,     color: 'bg-pink-500' },
  BANNER:      { label: 'Banner',      icon: Megaphone, color: 'bg-emerald-500' },
  BOGO:        { label: 'Buy X Get Y', icon: Percent,   color: 'bg-red-500' },
};

const STATUS_META: Record<PromoStatus, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: 'Draft',     color: 'text-slate-700',   bg: 'bg-slate-100' },
  SCHEDULED: { label: 'Scheduled', color: 'text-blue-800',    bg: 'bg-blue-100' },
  ACTIVE:    { label: 'Active',    color: 'text-emerald-800', bg: 'bg-emerald-100' },
  PAUSED:    { label: 'Paused',    color: 'text-amber-800',   bg: 'bg-amber-100' },
  EXPIRED:   { label: 'Expired',   color: 'text-slate-700',   bg: 'bg-slate-100' },
  ARCHIVED:  { label: 'Archived',  color: 'text-slate-500',   bg: 'bg-slate-50' },
};

export default function MarketplacePromotionsPage() {
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<PromoStatus | 'ALL'>('ACTIVE');

  const { data } = useQuery({
    queryKey: ['promotions', filter],
    queryFn: () => promotionsApi.list({ status: filter === 'ALL' ? undefined : filter }),
  });

  const items = data?.items || [];
  const counts = data?.counts || {} as Record<PromoStatus, number>;

  return (
    <div className="space-y-5 pb-10">
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <Megaphone className="h-3.5 w-3.5" />
              Marketing Campaigns
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">Promotions</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">Coupons, flash sales, bundles — customers ko attract karein</p>
          </div>
          <Button size="lg" onClick={() => setShowCreate(true)} className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl">
            <Plus className="h-4 w-4" />
            Create Promotion
          </Button>
        </div>

        <div className="relative grid grid-cols-3 md:grid-cols-6 gap-2 mt-6">
          {(['ACTIVE', 'SCHEDULED', 'PAUSED', 'EXPIRED', 'DRAFT', 'ARCHIVED'] as PromoStatus[]).map((s) => {
            const meta = STATUS_META[s];
            return (
              <div key={s} className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-2.5">
                <div className="text-[9px] uppercase tracking-wider font-black opacity-90">{s}</div>
                <div className="text-xl font-black tabular-nums mt-1">{counts[s] || 0}</div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex items-center gap-2 flex-wrap">
        {(['ACTIVE', 'SCHEDULED', 'PAUSED', 'DRAFT', 'ALL'] as (PromoStatus | 'ALL')[]).map((s) => (
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
          <Megaphone className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-900">No promotions</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Create your first campaign to boost sales</p>
          <Button onClick={() => setShowCreate(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4" />
            Create Promotion
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <PromotionCard
              key={p.id}
              promo={p}
              onActivate={async () => {
                await promotionsApi.activate(p.id);
                qc.invalidateQueries({ queryKey: ['promotions'] });
                toast.success('Activated ✅');
              }}
              onPause={async () => {
                await promotionsApi.pause(p.id);
                qc.invalidateQueries({ queryKey: ['promotions'] });
                toast.success('Paused');
              }}
              onArchive={async () => {
                await promotionsApi.archive(p.id);
                qc.invalidateQueries({ queryKey: ['promotions'] });
                toast.success('Archived');
              }}
              onDelete={async () => {
                if (confirm('Delete this promotion?')) {
                  await promotionsApi.delete(p.id);
                  qc.invalidateQueries({ queryKey: ['promotions'] });
                  toast.success('Deleted');
                }
              }}
              onCopyCoupon={() => {
                if (p.couponCode) {
                  navigator.clipboard.writeText(p.couponCode);
                  toast.success('Coupon copied!');
                }
              }}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreatePromotionModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['promotions'] });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function PromotionCard({ promo: p, onActivate, onPause, onArchive, onDelete, onCopyCoupon }: any) {
  const typeMeta = TYPE_META[p.type as PromoType];
  const statusMeta = STATUS_META[p.status as PromoStatus];
  const TypeIcon = typeMeta.icon;

  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition">
      <div className={`h-2 ${typeMeta.color}`} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-xl ${typeMeta.color} text-white flex items-center justify-center shrink-0 shadow-md`}>
            <TypeIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                {typeMeta.label}
              </span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${statusMeta.bg} ${statusMeta.color}`}>
                {statusMeta.label}
              </span>
              {p.isFlashSale && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 inline-flex items-center gap-0.5">
                  <Zap className="h-2.5 w-2.5" />
                  FLASH
                </span>
              )}
            </div>
            <h3 className="font-black text-slate-900 mt-1 line-clamp-1">{p.title}</h3>
            {p.description && (
              <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">{p.description}</p>
            )}
          </div>
        </div>

        {p.couponCode && (
          <button
            onClick={onCopyCoupon}
            className="mt-3 w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-purple-50 border-2 border-dashed border-purple-300 hover:border-purple-500 transition"
          >
            <span className="text-xs font-black text-purple-700">Coupon Code:</span>
            <span className="font-mono font-black text-purple-900">{p.couponCode}</span>
            <Copy className="h-3.5 w-3.5 text-purple-600" />
          </button>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
            <div className="text-[9px] font-black uppercase text-slate-500">Discount</div>
            <div className="text-sm font-black text-slate-900 tabular-nums">
              {p.discountType === 'PERCENT' && `${p.discountValue}%`}
              {p.discountType === 'FIXED' && `Rs ${formatPKR(p.discountValue)}`}
              {p.discountType === 'FREE_SHIPPING' && 'Free Ship'}
              {p.discountType === 'BUY_X_GET_Y' && 'BOGO'}
            </div>
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
            <div className="text-[9px] font-black uppercase text-emerald-700">Used</div>
            <div className="text-sm font-black text-emerald-800 tabular-nums">
              {p.usageCount}{p.usageLimit ? ` / ${p.usageLimit}` : ''}
            </div>
          </div>
        </div>

        <div className="mt-2 text-[10px] text-slate-500 font-bold flex items-center gap-1">
          <Calendar className="h-2.5 w-2.5" />
          {new Date(p.startsAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
          {' → '}
          {new Date(p.endsAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1 flex-wrap">
          {(p.status === 'DRAFT' || p.status === 'PAUSED') && (
            <button onClick={onActivate} className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black inline-flex items-center gap-1">
              <Play className="h-2.5 w-2.5" />
              Activate
            </button>
          )}
          {p.status === 'ACTIVE' && (
            <button onClick={onPause} className="h-7 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black inline-flex items-center gap-1">
              <Pause className="h-2.5 w-2.5" />
              Pause
            </button>
          )}
          {p.status !== 'ARCHIVED' && (
            <button onClick={onArchive} className="h-7 px-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black inline-flex items-center gap-1">
              <Archive className="h-2.5 w-2.5" />
              Archive
            </button>
          )}
          <button onClick={onDelete} className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center ml-auto">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatePromotionModal({ onClose, onSuccess }: any) {
  const [form, setForm] = useState<any>({
    type: 'COUPON',
    title: '',
    description: '',
    couponCode: '',
    discountType: 'PERCENT',
    discountValue: 10,
    minOrderAmount: 0,
    usageLimit: 100,
    perCustomerLimit: 1,
    startsAt: new Date().toISOString().slice(0, 16),
    endsAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
    isFlashSale: false,
    isPublic: true,
    status: 'DRAFT',
  });
  const [processing, setProcessing] = useState(false);

  const create = async () => {
    if (!form.title) return toast.error('Title required');
    setProcessing(true);
    try {
      await promotionsApi.create({
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      });
      toast.success('Promotion created ✅');
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed');
    } finally {
      setProcessing(false);
    }
  };

  const generateCouponCode = () => {
    const code = 'PROMO' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setForm({ ...form, couponCode: code });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white p-5 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black">
              <Megaphone className="h-3 w-3" />
              New Promotion
            </div>
            <h2 className="mt-2 text-xl font-black">Create Promotion</h2>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Promotion Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(TYPE_META) as [PromoType, any][]).map(([type, meta]) => {
                const Icon = meta.icon;
                const isSelected = form.type === type;
                return (
                  <button
                    key={type}
                    onClick={() => setForm({ ...form, type })}
                    className={`p-3 rounded-xl border-2 transition ${
                      isSelected ? `${meta.color} text-white border-transparent shadow` : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mx-auto ${isSelected ? '' : 'text-slate-600'}`} />
                    <div className={`text-[10px] font-black mt-1 ${isSelected ? '' : 'text-slate-700'}`}>{meta.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Grand Eid Sale — 20% OFF"
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {form.type === 'COUPON' && (
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Coupon Code</label>
              <div className="flex gap-2">
                <input
                  value={form.couponCode}
                  onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. EID20"
                  className="flex-1 h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-mono font-black uppercase outline-none focus:border-purple-500"
                />
                <button onClick={generateCouponCode} className="h-11 px-3 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-black">
                  Auto
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Discount Type</label>
            <select
              value={form.discountType}
              onChange={(e) => setForm({ ...form, discountType: e.target.value })}
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-purple-500"
            >
              <option value="PERCENT">Percentage Off</option>
              <option value="FIXED">Fixed Amount</option>
              <option value="FREE_SHIPPING">Free Shipping</option>
              <option value="BUY_X_GET_Y">Buy X Get Y</option>
            </select>
          </div>

          {(form.discountType === 'PERCENT' || form.discountType === 'FIXED') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-black text-slate-700 mb-1.5 block">
                  Discount Value {form.discountType === 'PERCENT' ? '(%)' : '(PKR)'}
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                  className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-sm font-black text-slate-700 mb-1.5 block">Min Order (PKR)</label>
                <input
                  type="number"
                  min={0}
                  value={form.minOrderAmount}
                  onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })}
                  className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Usage Limit</label>
              <input
                type="number"
                min={1}
                value={form.usageLimit}
                onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Per Customer</label>
              <input
                type="number"
                min={1}
                value={form.perCustomerLimit}
                onChange={(e) => setForm({ ...form, perCustomerLimit: Number(e.target.value) })}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Starts At</label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Ends At</label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isFlashSale}
              onChange={(e) => setForm({ ...form, isFlashSale: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm font-bold text-slate-700">⚡ Flash Sale (special badge, countdown)</span>
          </label>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200">
            Cancel
          </button>
          <Button onClick={create} loading={processing} className="bg-gradient-to-r from-purple-600 to-pink-600">
            <Megaphone className="h-4 w-4" />
            Create Promotion
          </Button>
        </div>
      </div>
    </div>
  );
}
