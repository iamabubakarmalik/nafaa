import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Tag, Plus, TrendingUp, DollarSign, Percent, Users, Sparkles,
  Download, Send, Copy, X, Zap, BarChart3, Gift, Target, Award,
} from 'lucide-react';
import { promotionsApi, couponsApi, type PromoStatus, type PromoDiscountType } from '../shared/marketplace.api';
import { relativeTime } from '../shared/status-utils';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

export default function CouponsAdvancedPage() {
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);
  const [showBulkGen, setShowBulkGen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'year'>('30d');

  const { data: analytics } = useQuery({
    queryKey: ['coupons-analytics', range],
    queryFn: () => couponsApi.analytics(range),
  });

  const { data: coupons } = useQuery({
    queryKey: ['promotions-coupon-list'],
    queryFn: () => promotionsApi.list({ type: 'COUPON' as any, limit: 100 }),
  });

  return (
    <div className="space-y-5 pb-10">
      {/* HERO */}
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <Tag className="h-3.5 w-3.5" />
              Coupons Advanced
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">Advanced Coupons</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">
              Bulk generate, targeted campaigns, aur deep analytics
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="lg" onClick={() => setShowBulkGen(true)} className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl">
              <Zap className="h-4 w-4" />
              Bulk Generate
            </Button>
            <Button size="lg" onClick={() => setShowAnalytics(!showAnalytics)} className="bg-white/15 backdrop-blur text-white hover:bg-white/25 border border-white/20">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </div>
        </div>

        {analytics && (
          <div className="relative grid grid-cols-2 md:grid-cols-5 gap-2 mt-6">
            <HeroKpi label="Active Coupons" value={analytics.activeCoupons} icon={Tag} />
            <HeroKpi label="Redemptions" value={analytics.totalRedemptions} icon={Users} />
            <HeroKpi label="Discount Given" value={`Rs ${formatPKR(analytics.totalDiscountGiven)}`} icon={Percent} isText />
            <HeroKpi label="Revenue" value={`Rs ${formatPKR(analytics.totalRevenue)}`} icon={DollarSign} isText highlight />
            <HeroKpi label="ROI" value={`${analytics.roi.toFixed(1)}x`} icon={TrendingUp} />
          </div>
        )}
      </section>

      {/* Analytics Panel */}
      {showAnalytics && analytics && (
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                Coupon Performance Analytics
              </h3>
              <p className="text-xs text-slate-500 font-medium">Deep insights on your coupon campaigns</p>
            </div>
            <div className="flex gap-1">
              {(['7d', '30d', '90d', 'year'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                    range === r ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* AOV comparison */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-4">
              <div className="text-xs font-black text-emerald-700 uppercase mb-1">Avg Order Value (with coupon)</div>
              <div className="text-3xl font-black text-emerald-900 tabular-nums">Rs {formatPKR(analytics.avgOrderValueWithCoupon)}</div>
              <div className="text-[10px] text-emerald-700 font-bold mt-1">
                {analytics.avgOrderValueWithCoupon > analytics.avgOrderValueWithoutCoupon ? (
                  <>↑ {(((analytics.avgOrderValueWithCoupon - analytics.avgOrderValueWithoutCoupon) / analytics.avgOrderValueWithoutCoupon) * 100).toFixed(1)}% higher than non-coupon</>
                ) : (
                  <>↓ {(((analytics.avgOrderValueWithoutCoupon - analytics.avgOrderValueWithCoupon) / analytics.avgOrderValueWithoutCoupon) * 100).toFixed(1)}% lower than non-coupon</>
                )}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-4">
              <div className="text-xs font-black text-slate-700 uppercase mb-1">Avg Order Value (without coupon)</div>
              <div className="text-3xl font-black text-slate-900 tabular-nums">Rs {formatPKR(analytics.avgOrderValueWithoutCoupon)}</div>
              <div className="text-[10px] text-slate-600 font-bold mt-1">Baseline for comparison</div>
            </div>
          </div>

          {/* Top coupons */}
          <div>
            <h4 className="text-sm font-black text-slate-900 mb-2">Top Performing Coupons</h4>
            <div className="space-y-1.5">
              {analytics.topCoupons.slice(0, 5).map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-6 text-center font-black text-slate-500">#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-purple-700 text-sm">{c.code}</span>
                      <span className="text-xs font-bold text-slate-700 truncate">{c.title}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                      {c.redemptions} redemptions · Rs {formatPKR(c.discountGiven)} discount given
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-emerald-700 tabular-nums">Rs {formatPKR(c.revenue)}</div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase">revenue</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Redemptions trend */}
          <div>
            <h4 className="text-sm font-black text-slate-900 mb-2">Redemptions Trend</h4>
            <div className="space-y-1">
              {analytics.redemptionsTrend.slice(-14).map((day) => {
                const maxCount = Math.max(...analytics.redemptionsTrend.map((d) => d.count), 1);
                const pct = (day.count / maxCount) * 100;
                return (
                  <div key={day.date} className="flex items-center gap-2 text-xs">
                    <span className="w-20 text-slate-600 font-bold shrink-0">
                      {new Date(day.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                    </span>
                    <div className="flex-1 h-5 rounded-lg bg-slate-100 overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-lg transition-all"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="absolute inset-0 flex items-center px-2">
                        <span className="text-[10px] font-black text-slate-700">{day.count} redemptions</span>
                      </div>
                    </div>
                    <span className="w-20 text-right text-emerald-700 font-black tabular-nums shrink-0">
                      Rs {formatPKR(day.revenue)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Existing coupons */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-black text-slate-900 text-lg">All Coupons</h3>
            <p className="text-xs text-slate-500 font-medium">Manage your coupon codes</p>
          </div>
          <span className="text-xs font-black text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
            {coupons?.items.length || 0} total
          </span>
        </div>

        {!coupons?.items.length ? (
          <div className="py-12 text-center">
            <Tag className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-black text-slate-600">No coupons yet</p>
            <Button onClick={() => setShowBulkGen(true)} className="mt-3 bg-purple-600 hover:bg-purple-700">
              <Zap className="h-4 w-4" />
              Generate First Batch
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {coupons.items.map((c) => (
              <CouponMiniCard key={c.id} coupon={c} onCopy={() => {
                if (c.couponCode) {
                  navigator.clipboard.writeText(c.couponCode);
                  toast.success('Coupon copied!');
                }
              }} />
            ))}
          </div>
        )}
      </div>

      {showBulkGen && (
        <BulkGenerateModal
          onClose={() => setShowBulkGen(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['promotions-coupon-list'] });
            qc.invalidateQueries({ queryKey: ['coupons-analytics'] });
            setShowBulkGen(false);
          }}
        />
      )}
    </div>
  );
}

function HeroKpi({ label, value, icon: Icon, highlight, isText }: any) {
  return (
    <div className={`rounded-xl backdrop-blur border p-2.5 ${
      highlight ? 'bg-emerald-500/25 border-emerald-300/50' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-black opacity-90 truncate">{label}</div>
      </div>
      <div className={`font-black leading-none tabular-nums ${isText ? 'text-sm' : 'text-xl'}`}>{value}</div>
    </div>
  );
}

function CouponMiniCard({ coupon, onCopy }: any) {
  const isActive = coupon.status === 'ACTIVE';
  const expired = new Date(coupon.endsAt) < new Date();

  return (
    <div className={`rounded-2xl border-2 p-4 transition ${
      expired ? 'bg-slate-50 border-slate-200 opacity-60' :
      isActive ? 'bg-white border-purple-300 shadow-sm hover:shadow-md' :
      'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
          isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
        }`}>
          {coupon.status}
        </span>
        {coupon.isFlashSale && (
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 inline-flex items-center gap-0.5">
            <Zap className="h-2.5 w-2.5" />
            FLASH
          </span>
        )}
      </div>

      <button
        onClick={onCopy}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-purple-50 border-2 border-dashed border-purple-300 hover:border-purple-500 transition mb-2"
      >
        <span className="font-mono font-black text-purple-900">{coupon.couponCode || '—'}</span>
        <Copy className="h-3.5 w-3.5 text-purple-600" />
      </button>

      <div className="text-sm font-black text-slate-900 line-clamp-1">{coupon.title}</div>

      <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] font-bold">
        <div className="text-slate-600">
          Discount:{' '}
          <span className="text-slate-900">
            {coupon.discountType === 'PERCENT' && `${coupon.discountValue}%`}
            {coupon.discountType === 'FIXED' && `Rs ${formatPKR(coupon.discountValue)}`}
            {coupon.discountType === 'FREE_SHIPPING' && 'Free Ship'}
          </span>
        </div>
        <div className="text-slate-600">
          Used: <span className="text-emerald-700">{coupon.usageCount}{coupon.usageLimit ? `/${coupon.usageLimit}` : ''}</span>
        </div>
      </div>
    </div>
  );
}

function BulkGenerateModal({ onClose, onSuccess }: any) {
  const [form, setForm] = useState({
    count: 100,
    prefix: 'NAFAA',
    discountType: 'PERCENT' as PromoDiscountType,
    discountValue: 10,
    maxDiscount: undefined as number | undefined,
    minOrderAmount: 0,
    perCustomerLimit: 1,
    usageLimit: 1,
    startsAt: new Date().toISOString().slice(0, 16),
    endsAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
  });
  const [processing, setProcessing] = useState(false);

  const generate = async () => {
    if (form.count < 1 || form.count > 5000) return toast.error('Count 1-5000');
    setProcessing(true);
    try {
      const result = await couponsApi.bulkGenerate({
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      });
      toast.success(`✅ ${result.count} coupons generated!`);
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
              <Zap className="h-3 w-3" />
              Bulk Generator
            </div>
            <h2 className="mt-2 text-xl font-black">Generate Coupon Codes</h2>
            <p className="text-xs text-white/70 mt-1">Ek saath multiple unique codes banayein</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">How Many? *</label>
              <input
                type="number"
                min={1}
                max={5000}
                value={form.count}
                onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-lg font-black outline-none focus:border-purple-500"
              />
              <p className="text-[10px] text-slate-500 font-bold mt-1">Max 5000 at once</p>
            </div>
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Prefix</label>
              <input
                value={form.prefix}
                onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase() })}
                placeholder="NAFAA"
                maxLength={10}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-mono font-black uppercase outline-none focus:border-purple-500"
              />
              <p className="text-[10px] text-slate-500 font-bold mt-1">e.g. NAFAA-ABC123</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Discount Type *</label>
            <select
              value={form.discountType}
              onChange={(e) => setForm({ ...form, discountType: e.target.value as PromoDiscountType })}
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-purple-500"
            >
              <option value="PERCENT">Percentage Off</option>
              <option value="FIXED">Fixed Amount Off</option>
              <option value="FREE_SHIPPING">Free Shipping</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">
                Value {form.discountType === 'PERCENT' ? '(%)' : '(PKR)'} *
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
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {form.discountType === 'PERCENT' && (
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Max Discount Cap (PKR, optional)</label>
              <input
                type="number"
                min={0}
                value={form.maxDiscount ?? ''}
                onChange={(e) => setForm({ ...form, maxDiscount: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="e.g. 500"
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-purple-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Uses per Coupon</label>
              <input
                type="number"
                min={1}
                value={form.usageLimit}
                onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-purple-500"
              />
              <p className="text-[10px] text-slate-500 font-bold mt-1">Usually 1 (single-use)</p>
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
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Valid From</label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Valid Until</label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="rounded-xl bg-purple-50 border-2 border-purple-200 p-3 text-xs text-purple-800 font-medium">
            💡 <strong>Preview:</strong> Codes will look like <span className="font-mono font-black">{form.prefix || 'NAFAA'}-XXXXXX</span>
            <br />
            <strong>{form.count} codes</strong> with <strong>
              {form.discountType === 'PERCENT' && `${form.discountValue}% off`}
              {form.discountType === 'FIXED' && `Rs ${form.discountValue} off`}
              {form.discountType === 'FREE_SHIPPING' && 'free shipping'}
            </strong>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200">
            Cancel
          </button>
          <Button onClick={generate} loading={processing} className="bg-gradient-to-r from-purple-600 to-pink-600">
            <Zap className="h-4 w-4" />
            Generate {form.count} Codes
          </Button>
        </div>
      </div>
    </div>
  );
}
