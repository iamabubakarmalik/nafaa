import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dumbbell, Search, X, Users, UserPlus, LogIn, Award, Flame, Calendar, DollarSign, CheckCircle2, Scan, Star, Clock, Target, TrendingUp, Zap, Sparkles, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { gymMembersApi } from '../api/members.api';
import { membershipPlansApi } from '../api/membership-plans.api';
import { membershipsApi } from '../api/memberships.api';
import { attendanceApi } from '../api/attendance.api';
import { productsApi } from '@modules/inventory/products/api/products.api';

export default function GymPosPage() {
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const [mode, setMode] = useState<'checkin' | 'plan' | 'shop'>('checkin');
  const [scanInput, setScanInput] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [autoRenew, setAutoRenew] = useState(false);
  const [shopCart, setShopCart] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const { data: members = [] } = useQuery({
    queryKey: ['members-pos', memberSearch],
    queryFn: () => gymMembersApi.list({ search: memberSearch || undefined, status: 'ACTIVE' }),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans-pos'],
    queryFn: () => membershipPlansApi.list({ active: true }),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-pos', productSearch],
    queryFn: () => productsApi.list({ search: productSearch || undefined, limit: 40 }),
    enabled: mode === 'shop',
  });

  const products = productsData?.items ?? [];

  const checkInMutation = useMutation({
    mutationFn: (memberId: string) => attendanceApi.checkIn({ memberId, method: 'MANUAL', entryPoint: 'POS' }),
    onSuccess: (att: any) => {
      toast.success('✅ ' + (att.member?.customer?.name ?? 'Member') + ' checked in!');
      setSelectedMember(null); setScanInput('');
      queryClient.invalidateQueries({ queryKey: ['currently-inside'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Check-in failed'),
  });

  const subscribeMutation = useMutation({
    mutationFn: () => membershipsApi.subscribe({
      memberId: selectedMember.id,
      planId: selectedPlan.id,
      paidAmount: Number(paidAmount) || 0,
      autoRenew,
    }),
    onSuccess: (membership: any) => {
      toast.success('🎉 Membership activated!');
      window.open('/sales/' + membership.id + '/receipt?auto=1', '_blank');
      setSelectedMember(null); setSelectedPlan(null); setPaidAmount(0);
      queryClient.invalidateQueries({ queryKey: ['gym-members'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const shopCheckoutMutation = useMutation({
    mutationFn: () => {
      if (!currentShopId) throw new Error('Shop required');
      return salesApi.create({
        shopId: currentShopId,
        customerId: selectedMember?.customerId || undefined,
        paymentMethod,
        paidAmount: shopCart.reduce((s, c) => s + c.price * c.quantity, 0),
        items: shopCart.map((c) => ({ productId: c.id, quantity: c.quantity, priceOverride: c.price })),
      });
    },
    onSuccess: (sale) => {
      toast.success('Sale complete!');
      window.open('/sales/' + sale.id + '/receipt?auto=1', '_blank');
      setShopCart([]); setSelectedMember(null);
    },
  });

  const shopTotal = shopCart.reduce((s, c) => s + c.price * c.quantity, 0);

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-red-900 to-orange-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-red-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              💪 Gym POS
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold">Front Desk</h1>
            <p className="mt-1 text-sm text-white/80">Check-ins, membership sales, PT bookings, retail</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2">
        {[
          { v: 'checkin', label: '✅ Check-in', gradient: 'from-emerald-500 to-green-600' },
          { v: 'plan', label: '🎯 Buy Plan', gradient: 'from-fuchsia-500 to-pink-600' },
          { v: 'shop', label: '🛒 Retail Shop', gradient: 'from-blue-500 to-cyan-600' },
        ].map((m) => (
          <button key={m.v} onClick={() => setMode(m.v as any)} className={'p-4 rounded-2xl border-2 transition font-extrabold ' + (mode === m.v ? 'bg-gradient-to-br ' + m.gradient + ' text-white shadow-lg' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300')}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'checkin' && (
        <section className="rounded-3xl bg-white border-2 border-emerald-300 shadow-lg p-6 space-y-4">
          <h3 className="font-extrabold text-emerald-900 text-lg flex items-center gap-2"><Zap className="h-5 w-5" /> Quick Check-in</h3>
          <input autoFocus value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search member (name, phone, member#)..." className="h-16 w-full rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-6 text-xl font-extrabold focus:outline-none focus:border-emerald-500" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
            {members.map((m: any) => (
              <button key={m.id} onClick={() => checkInMutation.mutate(m.id)} disabled={checkInMutation.isPending} className="p-3 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 flex items-center gap-3 text-left transition">
                {m.photoUrl ? (
                  <img src={m.photoUrl} className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 text-white flex items-center justify-center font-extrabold">
                    {m.customer?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold truncate">{m.customer?.name}</div>
                  <div className="text-xs font-mono font-bold text-slate-500">{m.memberNumber}</div>
                  {m.currentStreak > 0 && <div className="text-[10px] text-orange-700 font-extrabold">🔥 {m.currentStreak}d</div>}
                </div>
                <LogIn className="h-5 w-5 text-emerald-600" />
              </button>
            ))}
          </div>
        </section>
      )}

      {mode === 'plan' && (
        <section className="rounded-3xl bg-white border-2 border-fuchsia-300 shadow-lg p-6 space-y-4">
          <h3 className="font-extrabold text-fuchsia-900 text-lg flex items-center gap-2"><Target className="h-5 w-5" /> Sell Membership Plan</h3>
          {!selectedMember ? (
            <>
              <input autoFocus value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search member..." className="h-12 w-full rounded-2xl border-2 border-fuchsia-300 bg-fuchsia-50 px-4 text-base font-bold focus:outline-none focus:border-fuchsia-500" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {members.map((m: any) => (
                  <button key={m.id} onClick={() => setSelectedMember(m)} className="p-3 rounded-xl border-2 border-slate-200 hover:border-fuchsia-500 flex items-center gap-3 text-left">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 text-white flex items-center justify-center font-extrabold">{m.customer?.name?.charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="font-extrabold text-sm">{m.customer?.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{m.memberNumber}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : !selectedPlan ? (
            <>
              <div className="rounded-2xl bg-fuchsia-50 border-2 border-fuchsia-200 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 text-white flex items-center justify-center font-extrabold">
                    {selectedMember.customer?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-extrabold">{selectedMember.customer?.name}</div>
                    <div className="text-xs font-mono font-bold text-slate-500">{selectedMember.memberNumber}</div>
                  </div>
                </div>
                <button onClick={() => setSelectedMember(null)} className="text-xs font-extrabold text-fuchsia-600 hover:underline">Change</button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {plans.map((p: any) => (
                  <button key={p.id} onClick={() => { setSelectedPlan(p); setPaidAmount(p.price); }} className="p-4 rounded-2xl border-2 border-slate-200 hover:border-fuchsia-500 text-left transition">
                    <div className="font-extrabold text-lg">{p.name}</div>
                    <div className="text-[10px] uppercase font-extrabold text-fuchsia-600">{p.planType.replace('_', ' ')}</div>
                    <div className="mt-2 text-2xl font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.price)}</div>
                    <div className="text-[10px] font-bold text-slate-500">{p.durationDays} days</div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl bg-fuchsia-50 border-2 border-fuchsia-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-extrabold text-lg">{selectedMember.customer?.name}</div>
                  <button onClick={() => { setSelectedMember(null); setSelectedPlan(null); }} className="text-xs font-extrabold text-slate-500 hover:underline">Reset</button>
                </div>
                <div className="text-lg font-extrabold text-fuchsia-700">{selectedPlan.name}</div>
                <div className="text-3xl font-extrabold text-emerald-700 tabular-nums mt-1">{formatPKR(selectedPlan.price)}</div>
              </div>
              <div>
                <label className="block text-sm font-extrabold text-emerald-700 mb-1.5">Paid Amount</label>
                <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value))} className="h-14 w-full rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
              </div>
              <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 cursor-pointer">
                <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} className="h-5 w-5 rounded" />
                <span className="text-sm font-extrabold">Auto-renew when expires</span>
              </label>
              <Button size="lg" className="w-full bg-gradient-to-r from-fuchsia-600 to-pink-700" onClick={() => subscribeMutation.mutate()} loading={subscribeMutation.isPending}>
                <CheckCircle2 className="h-5 w-5" /> Activate Membership
              </Button>
            </div>
          )}
        </section>
      )}

      {mode === 'shop' && (
        <div className="grid lg:grid-cols-[1fr_400px] gap-4">
          <section className="rounded-3xl bg-white border-2 border-blue-300 shadow-lg p-4 space-y-3">
            <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search product..." className="h-11 w-full rounded-xl border-2 border-blue-200 bg-blue-50 px-3 text-sm font-semibold focus:outline-none focus:border-blue-500" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[70vh] overflow-y-auto">
              {products.map((p: any) => (
                <button key={p.id} onClick={() => {
                  const existing = shopCart.find((c) => c.id === p.id);
                  if (existing) setShopCart(shopCart.map((c) => c.id === p.id ? { ...c, quantity: c.quantity + 1 } : c));
                  else setShopCart([...shopCart, { id: p.id, name: p.name, price: Number(p.price), quantity: 1 }]);
                }} className="p-3 rounded-xl border-2 border-slate-200 hover:border-blue-500 text-left">
                  <div className="font-extrabold text-sm line-clamp-2">{p.name}</div>
                  <div className="text-lg font-extrabold text-emerald-700 mt-1">{formatPKR(p.price)}</div>
                </button>
              ))}
            </div>
          </section>
          <section className="rounded-3xl bg-white border-2 border-emerald-300 shadow-lg p-4 space-y-3">
            <h3 className="font-extrabold text-emerald-900">🛒 Cart ({shopCart.length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {shopCart.map((c) => (
                <div key={c.id} className="p-2 rounded-lg bg-slate-50 flex items-center gap-2">
                  <div className="flex-1 text-sm font-extrabold">{c.name}</div>
                  <button onClick={() => setShopCart(shopCart.map((x) => x.id === c.id && x.quantity > 1 ? { ...x, quantity: x.quantity - 1 } : x))} className="h-7 w-7 rounded bg-slate-200 font-extrabold">−</button>
                  <span className="w-8 text-center font-extrabold">{c.quantity}</span>
                  <button onClick={() => setShopCart(shopCart.map((x) => x.id === c.id ? { ...x, quantity: x.quantity + 1 } : x))} className="h-7 w-7 rounded bg-blue-600 text-white font-extrabold">+</button>
                  <button onClick={() => setShopCart(shopCart.filter((x) => x.id !== c.id))} className="h-7 w-7 rounded bg-rose-50 text-rose-600 flex items-center justify-center"><X className="h-3 w-3" /></button>
                </div>
              ))}
              {shopCart.length === 0 && <div className="text-center py-6 text-sm text-slate-500 font-semibold">Empty cart</div>}
            </div>
            {shopCart.length > 0 && (
              <>
                <div className="rounded-xl bg-slate-900 text-white p-3">
                  <div className="flex justify-between font-extrabold text-2xl text-emerald-300">
                    <span>Total</span><span className="tabular-nums">{formatPKR(shopTotal)}</span>
                  </div>
                </div>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="JAZZCASH">JazzCash</option>
                  <option value="EASYPAISA">EasyPaisa</option>
                  <option value="BANK_TRANSFER">Bank</option>
                </select>
                <Button size="lg" className="w-full bg-gradient-to-r from-emerald-600 to-green-700" onClick={() => shopCheckoutMutation.mutate()} loading={shopCheckoutMutation.isPending}>
                  <CheckCircle2 className="h-5 w-5" /> Complete Sale
                </Button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
