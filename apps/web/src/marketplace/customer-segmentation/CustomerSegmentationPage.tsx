import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Users, RefreshCw, Send, Sparkles, TrendingUp, TrendingDown,
  Crown, Heart, Star, UserPlus, AlertCircle, Moon, X, Target, Award,
} from 'lucide-react';
import { segmentationApi, type CustomerSegmentType } from '../shared/marketplace.api';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const SEGMENT_META: Record<CustomerSegmentType, { icon: any; color: string; bg: string; border: string; description: string }> = {
  CHAMPIONS:          { icon: Crown,     color: 'text-purple-800',  bg: 'bg-purple-100',  border: 'border-purple-400',  description: 'Best customers — recent, frequent, high spenders' },
  LOYAL:              { icon: Heart,     color: 'text-pink-800',    bg: 'bg-pink-100',    border: 'border-pink-400',    description: 'Consistent buyers — reward with exclusive perks' },
  POTENTIAL_LOYALIST: { icon: Star,      color: 'text-blue-800',    bg: 'bg-blue-100',    border: 'border-blue-400',    description: 'Recent buyers with growing frequency' },
  NEW_CUSTOMERS:      { icon: UserPlus,  color: 'text-emerald-800', bg: 'bg-emerald-100', border: 'border-emerald-400', description: 'Just started — onboard well' },
  PROMISING:          { icon: TrendingUp,color: 'text-teal-800',    bg: 'bg-teal-100',    border: 'border-teal-400',    description: 'Recent low-value — nurture to grow' },
  NEEDS_ATTENTION:    { icon: AlertCircle,color: 'text-amber-800',  bg: 'bg-amber-100',   border: 'border-amber-400',   description: 'Above average but recency dropping' },
  ABOUT_TO_SLEEP:     { icon: Moon,      color: 'text-orange-800',  bg: 'bg-orange-100',  border: 'border-orange-400',  description: 'Low recency AND frequency — re-engage now' },
  AT_RISK:            { icon: TrendingDown,color: 'text-rose-800',  bg: 'bg-rose-100',    border: 'border-rose-400',    description: 'Used to spend a lot — send win-back offers' },
  HIBERNATING:        { icon: Moon,      color: 'text-slate-700',   bg: 'bg-slate-100',   border: 'border-slate-400',   description: 'Long-gone but low-value historically' },
  LOST:               { icon: X,         color: 'text-red-800',     bg: 'bg-red-100',     border: 'border-red-400',     description: 'Very low recency & frequency — hardest to win back' },
};

const SEGMENT_ORDER: CustomerSegmentType[] = [
  'CHAMPIONS', 'LOYAL', 'POTENTIAL_LOYALIST', 'NEW_CUSTOMERS', 'PROMISING',
  'NEEDS_ATTENTION', 'ABOUT_TO_SLEEP', 'AT_RISK', 'HIBERNATING', 'LOST',
];

export default function CustomerSegmentationPage() {
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegmentType | null>(null);
  const [showBroadcast, setShowBroadcast] = useState<CustomerSegmentType | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: overview } = useQuery({
    queryKey: ['segmentation-overview'],
    queryFn: segmentationApi.overview,
  });

  const { data: customersData } = useQuery({
    queryKey: ['segmentation-customers', selectedSegment, page, search],
    queryFn: () => segmentationApi.customers(selectedSegment!, { page, limit: 20, search: search || undefined }),
    enabled: !!selectedSegment,
  });

  const recomputeMutation = useMutation({
    mutationFn: segmentationApi.recompute,
    onSuccess: (data) => {
      toast.success(`✅ ${data.totalCustomers} customers analyzed`);
      qc.invalidateQueries({ queryKey: ['segmentation-overview'] });
      qc.invalidateQueries({ queryKey: ['segmentation-customers'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="space-y-5 pb-10">
      {/* HERO */}
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <Target className="h-3.5 w-3.5" />
              Customer Segmentation
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">RFM Analysis</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">
              Recency · Frequency · Monetary — targeted marketing ke liye customers segments
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => recomputeMutation.mutate()}
            loading={recomputeMutation.isPending}
            className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl"
          >
            <RefreshCw className={`h-4 w-4 ${recomputeMutation.isPending ? 'animate-spin' : ''}`} />
            Recompute Segments
          </Button>
        </div>

        {overview && (
          <div className="relative mt-6 flex items-center gap-4 flex-wrap">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/15 backdrop-blur border border-white/20">
              <Users className="h-4 w-4" />
              <span className="text-xs font-black uppercase">Total:</span>
              <span className="text-lg font-black tabular-nums">{overview.totalCustomers}</span>
            </div>
            {overview.lastComputedAt && (
              <div className="text-xs text-white/70 font-bold">
                Last analyzed: {new Date(overview.lastComputedAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Segments Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {SEGMENT_ORDER.map((segType) => {
          const seg = overview?.segments.find((s) => s.segment === segType);
          const meta = SEGMENT_META[segType];
          const SegIcon = meta.icon;
          const count = seg?.count || 0;
          const totalPct = overview?.totalCustomers ? (count / overview.totalCustomers) * 100 : 0;
          const isSelected = selectedSegment === segType;

          return (
            <button
              key={segType}
              onClick={() => {
                setSelectedSegment(segType);
                setPage(1);
                setSearch('');
              }}
              className={`text-left rounded-2xl bg-white border-2 p-4 transition-all ${
                isSelected ? `${meta.border} shadow-lg ring-2 ring-current/20 ${meta.color}` : 'border-slate-200 hover:border-slate-300 hover:shadow'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`h-10 w-10 rounded-xl ${meta.bg} ${meta.color} flex items-center justify-center`}>
                  <SegIcon className="h-5 w-5" />
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                  {totalPct.toFixed(1)}%
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 tabular-nums">{count}</div>
              <div className="text-[11px] font-black text-slate-700 uppercase tracking-wide truncate">
                {seg?.displayName || segType.replace(/_/g, ' ')}
              </div>
              <p className="text-[10px] text-slate-500 font-bold mt-2 line-clamp-2">{meta.description}</p>
              {seg && seg.count > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <div className="text-slate-500 font-bold">Revenue</div>
                    <div className="font-black text-emerald-700 tabular-nums">Rs {formatPKR(seg.totalRevenue)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-bold">AOV</div>
                    <div className="font-black text-slate-900 tabular-nums">Rs {formatPKR(seg.avgOrderValue)}</div>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Segment Details */}
      {selectedSegment && (
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-2xl ${SEGMENT_META[selectedSegment].bg} ${SEGMENT_META[selectedSegment].color} flex items-center justify-center shadow`}>
                {(() => {
                  const Icon = SEGMENT_META[selectedSegment].icon;
                  return <Icon className="h-6 w-6" />;
                })()}
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg">
                  {overview?.segments.find((s) => s.segment === selectedSegment)?.displayName || selectedSegment.replace(/_/g, ' ')}
                </h3>
                <p className="text-xs text-slate-500 font-medium">{SEGMENT_META[selectedSegment].description}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search customers..."
                className="h-10 px-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-purple-500"
              />
              <Button onClick={() => setShowBroadcast(selectedSegment)} className="bg-purple-600 hover:bg-purple-700">
                <Send className="h-4 w-4" />
                Broadcast to Segment
              </Button>
            </div>
          </div>

          {!customersData?.items.length ? (
            <div className="py-12 text-center">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-black text-slate-600">No customers in this segment</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b-2 border-slate-100">
                    <tr>
                      <th className="text-left px-3 py-2 text-[10px] font-black uppercase text-slate-600">Customer</th>
                      <th className="text-right px-3 py-2 text-[10px] font-black uppercase text-slate-600">R</th>
                      <th className="text-right px-3 py-2 text-[10px] font-black uppercase text-slate-600">F</th>
                      <th className="text-right px-3 py-2 text-[10px] font-black uppercase text-slate-600">M</th>
                      <th className="text-right px-3 py-2 text-[10px] font-black uppercase text-slate-600">Orders</th>
                      <th className="text-right px-3 py-2 text-[10px] font-black uppercase text-slate-600">Spent</th>
                      <th className="text-right px-3 py-2 text-[10px] font-black uppercase text-slate-600">Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customersData.items.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-slate-100 overflow-hidden shrink-0">
                              {c.avatarUrl ? (
                                <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-black text-slate-600">
                                  {c.fullName.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-black text-slate-900 text-xs truncate">{c.fullName}</div>
                              <div className="text-[10px] text-slate-500 font-bold">{c.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right px-3 py-2 tabular-nums font-black text-xs">{c.recency}d</td>
                        <td className="text-right px-3 py-2 tabular-nums font-black text-xs">{c.frequency}</td>
                        <td className="text-right px-3 py-2 tabular-nums font-black text-xs text-emerald-700">Rs {formatPKR(c.monetary)}</td>
                        <td className="text-right px-3 py-2 tabular-nums text-xs font-bold">{c.totalOrders}</td>
                        <td className="text-right px-3 py-2 tabular-nums text-xs font-black text-emerald-700">Rs {formatPKR(c.totalSpent)}</td>
                        <td className="text-right px-3 py-2">
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase">
                            {c.currentTier}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {customersData.meta.totalPages > 1 && (
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-bold">
                    Page {customersData.meta.page} of {customersData.meta.totalPages} · {customersData.meta.total} total
                  </span>
                  <div className="flex gap-1">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="h-8 px-3 rounded-lg border-2 border-slate-200 font-black disabled:opacity-40 hover:bg-slate-50"
                    >
                      Previous
                    </button>
                    <button
                      disabled={page >= customersData.meta.totalPages}
                      onClick={() => setPage(page + 1)}
                      className="h-8 px-3 rounded-lg bg-purple-600 text-white font-black disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-500 font-bold mt-3">
                <strong>R</strong> = Days since last order · <strong>F</strong> = Total orders · <strong>M</strong> = Total spent
              </p>
            </>
          )}
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcast && (
        <BroadcastModal
          segment={showBroadcast}
          segmentCount={overview?.segments.find((s) => s.segment === showBroadcast)?.count || 0}
          onClose={() => setShowBroadcast(null)}
          onSuccess={() => setShowBroadcast(null)}
        />
      )}
    </div>
  );
}

function BroadcastModal({ segment, segmentCount, onClose, onSuccess }: any) {
  const [form, setForm] = useState({
    channel: 'PUSH' as 'PUSH' | 'SMS' | 'EMAIL' | 'WHATSAPP',
    title: '',
    body: '',
    couponCode: '',
  });
  const [sending, setSending] = useState(false);

  const meta = SEGMENT_META[segment as CustomerSegmentType];

  const send = async () => {
    if (!form.body.trim()) return toast.error('Message body required');
    setSending(true);
    try {
      const result = await segmentationApi.broadcastToSegment({
        segment,
        channel: form.channel,
        title: form.title || undefined,
        body: form.body,
        couponCode: form.couponCode || undefined,
      });
      toast.success(`✅ Sent to ${result.sent} customers`);
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white p-5 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black">
              <Send className="h-3 w-3" />
              Segment Broadcast
            </div>
            <h2 className="mt-2 text-xl font-black">Send to {segment.replace(/_/g, ' ')}</h2>
            <p className="text-xs text-white/70 mt-1">{segmentCount} customers will receive this</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Channel</label>
            <div className="grid grid-cols-4 gap-2">
              {(['PUSH', 'SMS', 'EMAIL', 'WHATSAPP'] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setForm({ ...form, channel: ch })}
                  className={`p-2 rounded-xl border-2 text-xs font-black transition ${
                    form.channel === ch ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {(form.channel === 'PUSH' || form.channel === 'EMAIL') && (
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Title / Subject</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Special offer just for you!"
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-purple-500"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Message *</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={4}
              maxLength={form.channel === 'SMS' ? 160 : 500}
              placeholder="Type your message..."
              className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-purple-500 resize-none"
            />
            <div className="text-right text-[10px] font-bold text-slate-400 mt-1">
              {form.body.length}/{form.channel === 'SMS' ? 160 : 500}
            </div>
          </div>

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Attach Coupon Code (optional)</label>
            <input
              value={form.couponCode}
              onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })}
              placeholder="e.g. WELCOME20"
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-mono font-black uppercase outline-none focus:border-purple-500"
            />
          </div>

          <div className={`rounded-xl border-2 p-3 ${meta.bg} ${meta.border}`}>
            <div className={`text-xs font-black ${meta.color} mb-1`}>Segment Insight</div>
            <p className={`text-xs font-medium ${meta.color} opacity-90`}>{meta.description}</p>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200">
            Cancel
          </button>
          <Button onClick={send} loading={sending} disabled={!form.body.trim()} className="bg-gradient-to-r from-purple-600 to-pink-600">
            <Send className="h-4 w-4" />
            Send to {segmentCount} Customers
          </Button>
        </div>
      </div>
    </div>
  );
}
