import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Award, Plus, X, Save, RefreshCw, Sparkles, User, Calendar, DollarSign,
  Snowflake, Play, Ban, RotateCw, CheckCircle2, AlertCircle, Search,
} from 'lucide-react';
import { membershipsApi } from '../api/memberships.api';
import { membershipPlansApi } from '../api/membership-plans.api';
import { gymMembersApi } from '../api/members.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-600', EXPIRED: 'bg-slate-500', PAUSED: 'bg-amber-500',
  CANCELLED: 'bg-rose-500', PENDING_PAYMENT: 'bg-orange-500', FROZEN: 'bg-cyan-500',
};

export default function MembershipsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [expiringFilter, setExpiringFilter] = useState<boolean>(false);
  const [showForm, setShowForm] = useState(false);
  const [paying, setPaying] = useState<any>(null);
  const [freezing, setFreezing] = useState<any>(null);

  const { data: memberships = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['memberships-list', statusFilter, expiringFilter],
    queryFn: () => membershipsApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      expiringDays: expiringFilter ? 7 : undefined,
    }),
    refetchInterval: 60_000,
  });

  const expireOldMutation = useMutation({
    mutationFn: () => membershipsApi.expireOld(),
    onSuccess: () => { toast.success('Old memberships expired'); queryClient.invalidateQueries({ queryKey: ['memberships-list'] }); },
  });

  const unfreezeMutation = useMutation({
    mutationFn: (id: string) => membershipsApi.unfreeze(id),
    onSuccess: () => { toast.success('Membership resumed'); queryClient.invalidateQueries({ queryKey: ['memberships-list'] }); },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: any) => membershipsApi.cancel(id, reason),
    onSuccess: () => { toast.success('Cancelled'); queryClient.invalidateQueries({ queryKey: ['memberships-list'] }); },
  });

  const renewMutation = useMutation({
    mutationFn: ({ id, paidAmount }: any) => membershipsApi.renew(id, paidAmount),
    onSuccess: () => { toast.success('Renewed'); queryClient.invalidateQueries({ queryKey: ['memberships-list'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Award className="h-3.5 w-3.5 text-amber-300" />
              Active Subscriptions
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🎖️ Memberships</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Subscribe, freeze, renew, cancel</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => expireOldMutation.mutate()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <Calendar className="h-4 w-4" />
              Expire Old
            </button>
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              New Subscription
            </Button>
          </div>
        </div>
      </section>

      <div className="flex gap-1.5 flex-wrap">
        {['ACTIVE', 'all', 'PENDING_PAYMENT', 'FROZEN', 'EXPIRED', 'CANCELLED'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={
            'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (statusFilter === s ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>{s === 'all' ? 'All' : s.replace('_', ' ')}</button>
        ))}
        <button onClick={() => setExpiringFilter(!expiringFilter)} className={
          'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
          (expiringFilter ? 'bg-rose-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
        }>⚠️ Expiring in 7 days</button>
      </div>

      {showForm && (
        <SubscribeForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['memberships-list'] }); }}
        />
      )}

      {paying && (
        <PaymentModal
          membership={paying}
          onClose={() => setPaying(null)}
          onDone={() => { setPaying(null); queryClient.invalidateQueries({ queryKey: ['memberships-list'] }); }}
        />
      )}

      {freezing && (
        <FreezeModal
          membership={freezing}
          onClose={() => setFreezing(null)}
          onDone={() => { setFreezing(null); queryClient.invalidateQueries({ queryKey: ['memberships-list'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : memberships.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <Award className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No memberships</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {memberships.map((m) => {
            const daysLeft = differenceInDays(new Date(m.endDate), new Date());
            const isExpiringSoon = m.status === 'ACTIVE' && daysLeft <= 7 && daysLeft > 0;
            return (
              <div key={m.id} className={
                'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-4 space-y-3 ' +
                (isExpiringSoon ? 'border-amber-400 ring-2 ring-amber-100' :
                 m.status === 'PENDING_PAYMENT' ? 'border-orange-400' :
                 'border-slate-200 dark:border-neutral-800')
              }>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow shrink-0">
                      <Award className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-white">{m.membershipNumber}</span>
                        <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + STATUS_COLORS[m.status]}>
                          {m.status.replace('_', ' ')}
                        </span>
                        {isExpiringSoon && (
                          <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase animate-pulse">
                            {daysLeft}d left
                          </span>
                        )}
                        {m.autoRenew && (
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold uppercase">Auto-renew</span>
                        )}
                      </div>
                      <div className="mt-1 text-sm font-bold text-slate-900">{m.plan?.name}</div>
                      <div className="text-xs text-slate-500 font-semibold">
                        {format(new Date(m.startDate), 'dd MMM yyyy')} → {format(new Date(m.endDate), 'dd MMM yyyy')}
                      </div>
                      {m.isFrozen && m.frozenReason && (
                        <div className="mt-1 text-xs italic text-cyan-700">
                          <Snowflake className="h-3 w-3 inline mr-0.5" />
                          Frozen: {m.frozenReason}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(m.paidAmount)}</div>
                    <div className="text-[10px] font-bold text-slate-500">of {formatPKR(m.totalPrice)}</div>
                    {m.balanceDue > 0 && (
                      <div className="text-[10px] font-extrabold text-amber-700">Due: {formatPKR(m.balanceDue)}</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2 text-center">
                    <div className="text-[9px] uppercase font-extrabold text-blue-700">Visits Used</div>
                    <div className="text-sm font-extrabold text-blue-800 tabular-nums">{m.visitsUsed}</div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 text-center">
                    <div className="text-[9px] uppercase font-extrabold text-emerald-700">Classes</div>
                    <div className="text-sm font-extrabold text-emerald-800 tabular-nums">{m.classesUsed}</div>
                  </div>
                  <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 p-2 text-center">
                    <div className="text-[9px] uppercase font-extrabold text-violet-700">PT</div>
                    <div className="text-sm font-extrabold text-violet-800 tabular-nums">{m.ptSessionsUsed}</div>
                  </div>
                  <div className="rounded-lg bg-cyan-50 dark:bg-cyan-950/30 p-2 text-center">
                    <div className="text-[9px] uppercase font-extrabold text-cyan-700">Frozen Days</div>
                    <div className="text-sm font-extrabold text-cyan-800 tabular-nums">{m.totalFrozenDays}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 flex-wrap pt-2 border-t border-slate-100 dark:border-neutral-800">
                  {m.balanceDue > 0 && (
                    <button onClick={() => setPaying(m)} className="flex-1 min-w-[100px] h-9 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Add Payment
                    </button>
                  )}
                  {m.status === 'ACTIVE' && !m.isFrozen && (
                    <button onClick={() => setFreezing(m)} className="flex-1 min-w-[100px] h-9 rounded-lg bg-cyan-100 hover:bg-cyan-200 text-cyan-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
                      <Snowflake className="h-3 w-3" />
                      Freeze
                    </button>
                  )}
                  {m.status === 'FROZEN' && (
                    <button onClick={() => unfreezeMutation.mutate(m.id)} className="flex-1 min-w-[100px] h-9 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
                      <Play className="h-3 w-3" />
                      Resume
                    </button>
                  )}
                  {['ACTIVE', 'EXPIRED'].includes(m.status) && (
                    <button onClick={() => {
                      const paid = prompt('Paid amount for renewal?', String(m.plan?.price || 0));
                      if (paid !== null) renewMutation.mutate({ id: m.id, paidAmount: Number(paid) });
                    }} className="flex-1 min-w-[100px] h-9 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
                      <RotateCw className="h-3 w-3" />
                      Renew
                    </button>
                  )}
                  {!['CANCELLED', 'EXPIRED'].includes(m.status) && (
                    <button onClick={() => {
                      const reason = prompt('Cancellation reason?');
                      if (reason !== null) cancelMutation.mutate({ id: m.id, reason });
                    }} className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function SubscribeForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    memberId: '',
    planId: '',
    startDate: new Date().toISOString().split('T')[0],
    paidAmount: 0,
    autoRenew: false,
    notes: '',
  });
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const { data: members = [] } = useQuery({
    queryKey: ['members-for-subscribe', memberSearch],
    queryFn: () => gymMembersApi.list({ search: memberSearch || undefined, status: 'ACTIVE' }),
    enabled: showMemberPicker,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans-for-subscribe'],
    queryFn: () => membershipPlansApi.list({ active: true }),
  });

  const totalPrice = selectedPlan ? selectedPlan.price + selectedPlan.registrationFee + selectedPlan.securityDeposit : 0;

  const saveMutation = useMutation({
    mutationFn: () => membershipsApi.subscribe({
      memberId: form.memberId,
      planId: form.planId,
      startDate: form.startDate,
      paidAmount: Number(form.paidAmount) || 0,
      autoRenew: form.autoRenew,
      notes: form.notes || undefined,
    }),
    onSuccess: () => { toast.success('Subscribed'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-amber-300 dark:border-amber-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">New Membership Subscription</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Member picker */}
        {selectedMember ? (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 p-3 flex items-center gap-3">
            <User className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <div className="font-extrabold">{selectedMember.customer?.name}</div>
              <div className="text-xs text-slate-600 font-bold">{selectedMember.memberNumber}</div>
            </div>
            <button onClick={() => { setSelectedMember(null); setForm({ ...form, memberId: '' }); }} className="text-xs font-extrabold text-amber-600 hover:underline">Change</button>
          </div>
        ) : (
          <div>
            <label className="text-[10px] uppercase font-extrabold mb-1 block">Select Member *</label>
            <input autoFocus value={memberSearch} onChange={(e) => { setMemberSearch(e.target.value); setShowMemberPicker(true); }} placeholder="Search member..." className="h-11 w-full rounded-xl border-2 border-amber-200 bg-amber-50 dark:bg-amber-950/30 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            {showMemberPicker && (
              <div className="mt-2 max-h-52 overflow-y-auto space-y-1 rounded-xl border border-slate-200 p-1">
                {members.map((m: any) => (
                  <button key={m.id} onClick={() => { setSelectedMember(m); setForm({ ...form, memberId: m.id }); setShowMemberPicker(false); }} className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-amber-50 text-left">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm font-extrabold flex-1 truncate">{m.customer?.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono font-bold">{m.memberNumber}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Plan selector */}
        <div>
          <label className="text-[10px] uppercase font-extrabold mb-2 block">Select Plan *</label>
          <div className="grid sm:grid-cols-2 gap-2">
            {plans.map((p: any) => (
              <button key={p.id} onClick={() => { setSelectedPlan(p); setForm({ ...form, planId: p.id, paidAmount: p.price + p.registrationFee + p.securityDeposit }); }} className={
                'p-3 rounded-xl border-2 text-left transition ' +
                (form.planId === p.id ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-amber-300')
              }>
                <div className="font-extrabold text-sm">{p.name}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">{p.planType.replace('_', ' ')}</div>
                <div className="mt-1 text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.price)}</div>
                <div className="text-[10px] font-bold text-slate-500">{p.durationDays}d</div>
              </button>
            ))}
          </div>
        </div>

        {selectedPlan && (
          <div className="rounded-xl bg-gradient-to-br from-slate-950 to-amber-900 text-white p-4">
            <div className="text-[10px] uppercase font-extrabold text-white/70 mb-2">Bill Preview</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-white/80">Plan price</span><span className="font-bold tabular-nums">{formatPKR(selectedPlan.price)}</span></div>
              {selectedPlan.registrationFee > 0 && <div className="flex justify-between"><span className="text-white/80">Registration fee</span><span className="font-bold tabular-nums">{formatPKR(selectedPlan.registrationFee)}</span></div>}
              {selectedPlan.securityDeposit > 0 && <div className="flex justify-between"><span className="text-white/80">Security deposit</span><span className="font-bold tabular-nums">{formatPKR(selectedPlan.securityDeposit)}</span></div>}
              <div className="pt-1 border-t border-white/20 flex justify-between font-extrabold">
                <span>Total</span>
                <span className="text-emerald-300 tabular-nums">{formatPKR(totalPrice)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Start Date</label>
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Paid Amount</label>
            <input type="number" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/30 cursor-pointer">
          <input type="checkbox" checked={form.autoRenew} onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })} className="h-4 w-4 rounded" />
          <RotateCw className={'h-4 w-4 ' + (form.autoRenew ? 'text-blue-600' : 'text-slate-400')} />
          <span className="text-sm font-extrabold text-blue-900">Auto-renew on expiry</span>
        </label>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-amber-600 to-orange-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.memberId || !form.planId}>
            <CheckCircle2 className="h-4 w-4" />
            Subscribe
          </Button>
        </div>
      </div>
    </section>
  );
}

function PaymentModal({ membership, onClose, onDone }: any) {
  const [amount, setAmount] = useState(membership.balanceDue);

  const payMutation = useMutation({
    mutationFn: () => membershipsApi.payment(membership.id, Number(amount)),
    onSuccess: () => { toast.success('Payment added'); onDone(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
          <h3 className="font-extrabold">Add Payment</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="text-xs font-bold text-slate-500">{membership.membershipNumber} • Balance: {formatPKR(membership.balanceDue)}</div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Amount *</label>
            <input type="number" step="0.01" autoFocus value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700" onClick={() => payMutation.mutate()} loading={payMutation.isPending} disabled={amount <= 0}>
              <CheckCircle2 className="h-4 w-4" />
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FreezeModal({ membership, onClose, onDone }: any) {
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState('');

  const freezeMutation = useMutation({
    mutationFn: () => membershipsApi.freeze(membership.id, Number(days), reason || undefined),
    onSuccess: () => { toast.success('Membership frozen'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-cyan-50 dark:bg-cyan-950/30 flex items-center justify-between">
          <h3 className="font-extrabold">❄️ Freeze Membership</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="text-xs font-bold text-slate-500">
            {membership.membershipNumber} • Max: {membership.plan?.maxFreezeDays || 0} days • Used: {membership.totalFrozenDays}
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-cyan-700 mb-1 block">Days to freeze *</label>
            <input type="number" min="1" autoFocus value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-cyan-300 bg-cyan-50 dark:bg-cyan-950/30 px-4 text-2xl font-extrabold tabular-nums text-center focus:outline-none focus:border-cyan-500" />
          </div>
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (travel, medical...)" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-cyan-500 resize-none" />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-700" onClick={() => freezeMutation.mutate()} loading={freezeMutation.isPending} disabled={days <= 0}>
              <Snowflake className="h-4 w-4" />
              Freeze
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
