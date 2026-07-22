import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Tag, Plus, Trash2, ToggleLeft, ToggleRight, Percent, DollarSign,
  Calendar, Copy, CheckCircle2, AlertTriangle, Sparkles, TrendingUp,
  Clock, Search, Filter, X, Zap, Gift,
} from 'lucide-react';
import { discountsApi, type DiscountType } from '@/api/discounts.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

type Filter = 'all' | 'active' | 'expired' | 'limit-reached';

export default function DiscountsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('active');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    code: '',
    description: '',
    type: 'PERCENTAGE' as DiscountType,
    value: '',
    minPurchase: '',
    maxDiscount: '',
    usageLimit: '',
    validUntil: '',
  });

  const { data: codes = [] } = useQuery({
    queryKey: ['discounts'],
    queryFn: discountsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: discountsApi.create,
    onSuccess: () => {
      toast.success('Discount code created');
      setForm({ code: '', description: '', type: 'PERCENTAGE', value: '', minPurchase: '', maxDiscount: '', usageLimit: '', validUntil: '' });
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Create fail'),
  });

  const toggleMutation = useMutation({
    mutationFn: discountsApi.toggle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discounts'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: discountsApi.remove,
    onSuccess: () => {
      toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
    },
  });

  const filteredCodes = useMemo(() => {
    let result = [...codes];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((c) => c.code.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
    }
    if (filter === 'active') {
      result = result.filter((c) => {
        const expired = c.validUntil && new Date(c.validUntil) < new Date();
        const limitReached = c.usageLimit && c.usageCount >= c.usageLimit;
        return c.isActive && !expired && !limitReached;
      });
    } else if (filter === 'expired') {
      result = result.filter((c) => c.validUntil && new Date(c.validUntil) < new Date());
    } else if (filter === 'limit-reached') {
      result = result.filter((c) => c.usageLimit && c.usageCount >= c.usageLimit);
    }
    return result;
  }, [codes, search, filter]);

  const stats = useMemo(() => {
    const now = new Date();
    const active = codes.filter((c) => {
      const expired = c.validUntil && new Date(c.validUntil) < now;
      const limitReached = c.usageLimit && c.usageCount >= c.usageLimit;
      return c.isActive && !expired && !limitReached;
    });
    const expired = codes.filter((c) => c.validUntil && new Date(c.validUntil) < now);
    const limitReached = codes.filter((c) => c.usageLimit && c.usageCount >= c.usageLimit);
    const totalUsed = codes.reduce((s, c) => s + c.usageCount, 0);
    return { total: codes.length, active: active.length, expired: expired.length, limitReached: limitReached.length, totalUsed };
  }, [codes]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Code ${code} copied`);
  };

  const getCodeStatus = (c: any) => {
    if (!c.isActive) return { label: 'INACTIVE', tone: 'bg-slate-100 text-slate-600', icon: ToggleLeft };
    const expired = c.validUntil && new Date(c.validUntil) < new Date();
    if (expired) return { label: 'EXPIRED', tone: 'bg-rose-100 text-rose-700', icon: Clock };
    if (c.usageLimit && c.usageCount >= c.usageLimit) return { label: 'LIMIT REACHED', tone: 'bg-amber-100 text-amber-700', icon: AlertTriangle };
    return { label: 'ACTIVE', tone: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 };
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-pink-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Tag className="h-3.5 w-3.5 text-amber-300" />
              Promo Codes & Discounts
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Discount Codes</h2>
            <p className="mt-2 text-sm text-white/80">
              Eid, sales, special offers ke liye promo codes banayein. POS me apply hote hain automatic.
            </p>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Active Codes</div>
              <div className="mt-2 text-2xl font-extrabold text-emerald-700">{stats.active}</div>
              <div className="text-xs text-emerald-600 font-semibold mt-1">Currently usable</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Codes</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">{stats.total}</div>
              <div className="text-xs text-slate-600 font-semibold mt-1">All created</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center shadow-lg">
              <Tag className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Times Used</div>
              <div className="mt-2 text-2xl font-extrabold text-violet-700">{stats.totalUsed}</div>
              <div className="text-xs text-violet-600 font-semibold mt-1">Total redemptions</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Expired</div>
              <div className="mt-2 text-2xl font-extrabold text-rose-700">{stats.expired}</div>
              <div className="text-xs text-rose-600 font-semibold mt-1">No longer valid</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[420px_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 h-fit sticky top-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-700 text-white flex items-center justify-center shadow">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">New Discount Code</h3>
              <p className="text-sm text-slate-500">Create promo for customers</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input label="Code *" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="EID2026" />
            <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Eid special discount" />
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Discount Type *</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setForm({ ...form, type: 'PERCENTAGE' })} className={`p-3 rounded-xl border-2 transition flex items-center justify-center gap-2 ${form.type === 'PERCENTAGE' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 text-slate-600 hover:border-pink-300'}`}>
                  <Percent className="h-4 w-4" />
                  <span className="font-bold text-sm">Percentage</span>
                </button>
                <button type="button" onClick={() => setForm({ ...form, type: 'FIXED_AMOUNT' })} className={`p-3 rounded-xl border-2 transition flex items-center justify-center gap-2 ${form.type === 'FIXED_AMOUNT' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 text-slate-600 hover:border-pink-300'}`}>
                  <DollarSign className="h-4 w-4" />
                  <span className="font-bold text-sm">Fixed</span>
                </button>
              </div>
            </div>
            <Input label={form.type === 'PERCENTAGE' ? 'Percentage (0-100) *' : 'Amount (PKR) *'} type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder={form.type === 'PERCENTAGE' ? '20' : '500'} />
            <Input label="Min Purchase (PKR)" type="number" value={form.minPurchase} onChange={(e) => setForm({ ...form, minPurchase: e.target.value })} placeholder="0" hint="0 = no minimum" />
            {form.type === 'PERCENTAGE' && (
              <Input label="Max Discount Cap" type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} placeholder="1000" hint="Optional ceiling" />
            )}
            <Input label="Usage Limit" type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="100" hint="Leave blank for unlimited" />
            <Input label="Valid Until" type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} hint="Blank = never expires" />
            <Button className="w-full bg-pink-600 hover:bg-pink-700" size="lg" loading={createMutation.isPending} onClick={() => {
              if (!form.code.trim()) return toast.error('Code likhein');
              if (!Number(form.value)) return toast.error('Value likhein');
              createMutation.mutate({
                code: form.code.trim(),
                description: form.description.trim() || undefined,
                type: form.type,
                value: Number(form.value),
                minPurchase: Number(form.minPurchase || 0),
                maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
                usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
                validUntil: form.validUntil || undefined,
              });
            }}>
              <Sparkles className="h-4 w-4" />
              Create Discount Code
            </Button>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-xl font-bold text-slate-900">All Codes ({filteredCodes.length})</h3>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code..." className="h-9 w-56 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:border-pink-500" />
              </div>
            </div>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {[
                { v: 'active' as Filter, l: 'Active', c: 'bg-emerald-600' },
                { v: 'all' as Filter, l: 'All', c: 'bg-slate-900' },
                { v: 'expired' as Filter, l: 'Expired', c: 'bg-rose-600' },
                { v: 'limit-reached' as Filter, l: 'Limit Reached', c: 'bg-amber-600' },
              ].map((opt) => (
                <button key={opt.v} onClick={() => setFilter(opt.v)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${filter === opt.v ? `${opt.c} text-white shadow-sm` : 'text-slate-600 hover:text-slate-900'}`}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          {filteredCodes.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
                <Gift className="h-9 w-9 text-pink-600" />
              </div>
              <h4 className="mt-5 text-xl font-bold text-slate-900">{search || filter !== 'active' ? 'No matches' : 'No codes yet'}</h4>
              <p className="mt-2 text-sm text-slate-500">{search || filter !== 'active' ? 'Different filter try karein' : 'Left side se naya code create karein'}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4 p-6">
              {filteredCodes.map((c) => {
                const status = getCodeStatus(c);
                const StatusIcon = status.icon;
                const usagePct = c.usageLimit ? (c.usageCount / c.usageLimit) * 100 : 0;
                return (
                  <div key={c.id} className={`rounded-2xl border-2 overflow-hidden transition ${
                    !c.isActive ? 'border-slate-200 bg-slate-50 opacity-70' :
                    status.label === 'EXPIRED' ? 'border-rose-200 bg-rose-50/30' :
                    status.label === 'LIMIT REACHED' ? 'border-amber-200 bg-amber-50/30' :
                    'border-pink-200 bg-gradient-to-br from-pink-50 to-white'
                  }`}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <button onClick={() => copyCode(c.code)} className="font-mono text-xl font-extrabold text-slate-900 hover:text-pink-700 transition inline-flex items-center gap-1.5 group">
                              {c.code}
                              <Copy className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
                            </button>
                          </div>
                          {c.description && <div className="text-xs text-slate-600 mt-1">{c.description}</div>}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-2 ${status.tone}`}>
                            <StatusIcon className="h-2.5 w-2.5" />
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => toggleMutation.mutate(c.id)} className="text-slate-700 hover:bg-white rounded-lg p-1.5 transition" title="Toggle active">
                            {c.isActive ? <ToggleRight className="h-5 w-5 text-emerald-600" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                          </button>
                          <button onClick={() => { if (confirm(`Delete ${c.code}?`)) deleteMutation.mutate(c.id); }} className="text-rose-600 hover:bg-white rounded-lg p-1.5 transition">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Discount</div>
                          <div className="font-extrabold text-pink-700 text-lg">{c.type === 'PERCENTAGE' ? `${c.value}%` : formatPKR(c.value)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Min Order</div>
                          <div className="font-bold text-slate-700">{c.minPurchase > 0 ? formatPKR(c.minPurchase) : 'No min'}</div>
                        </div>
                      </div>

                      {c.usageLimit ? (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                            <span className="font-bold">Usage: {c.usageCount} / {c.usageLimit}</span>
                            <span className="font-bold">{usagePct.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full ${usagePct >= 100 ? 'bg-rose-500' : usagePct >= 80 ? 'bg-amber-500' : 'bg-pink-500'}`} style={{ width: `${Math.min(usagePct, 100)}%` }} />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 text-[11px] text-slate-500">
                          <span className="font-bold">Used: {c.usageCount}</span> • Unlimited
                        </div>
                      )}

                      {c.validUntil && (
                        <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                          <Calendar className="h-3 w-3" />
                          Expires: <span className="font-bold">{new Date(c.validUntil).toLocaleDateString('en-PK')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
