import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Cake, User, Phone, Calendar, Gift, Sparkles,
  DollarSign, TrendingUp, Edit3, Save, X, Package, Star,
  Heart, ArrowRight, MessageCircle, CheckCircle2, Baby,
  Award, GraduationCap, ShoppingCart, Copy, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { toyBirthdaysApi } from '../api/birthday-reminders.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

export default function BirthdayDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showRecordPurchase, setShowRecordPurchase] = useState(false);

  const { data: reminder, isLoading } = useQuery({
    queryKey: ['birthday-reminder', id],
    queryFn: () => toyBirthdaysApi.getOne(id!),
    enabled: !!id,
  });

  const { data: suggestions, isLoading: loadingSuggestions } = useQuery({
    queryKey: ['birthday-suggestions', id],
    queryFn: () => toyBirthdaysApi.giftSuggestions(id!, 16),
    enabled: !!id,
  });

  const markReminderSent = useMutation({
    mutationFn: () => toyBirthdaysApi.markReminderSent(id!),
    onSuccess: () => {
      toast.success('Reminder marked as sent');
      qc.invalidateQueries({ queryKey: ['birthday-reminder', id] });
    },
  });

  if (isLoading || !reminder) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin" />
      </div>
    );
  }

  const daysUntil = reminder.computed?.daysUntilBirthday ?? 0;
  const turningAge = reminder.computed?.turningAge ?? 0;
  const isToday = daysUntil === 0;
  const isSoon = daysUntil > 0 && daysUntil <= 7;

  const whatsappMessage = `Assalam-o-Alaikum ${reminder.customerName}! 🎂 ${reminder.childName} ki birthday ${daysUntil === 0 ? 'aaj' : daysUntil === 1 ? 'kal' : `${daysUntil} din mein`} hai. Special gift options dekhne ke liye humari shop visit karain!`;

  return (
    <div className="space-y-5 pb-10">
      {showRecordPurchase && (
        <RecordPurchaseModal reminderId={id!}
          onClose={() => setShowRecordPurchase(false)}
          onSaved={() => {
            setShowRecordPurchase(false);
            qc.invalidateQueries({ queryKey: ['birthday-reminder', id] });
            qc.invalidateQueries({ queryKey: ['birthday-reminders-list'] });
          }} />
      )}

      <button onClick={() => navigate('/toystore/birthdays')} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-pink-600 font-bold">
        <ArrowLeft className="h-4 w-4" /> All Birthdays
      </button>

      {/* HERO */}
      <section className={`relative overflow-hidden rounded-3xl text-white shadow-2xl ${
        isToday ? 'bg-gradient-to-br from-slate-950 via-rose-900 to-red-700' :
        isSoon ? 'bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700' :
        'bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700'}`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <Cake className="h-3.5 w-3.5 text-amber-300" />
                {isToday ? '🎉 BIRTHDAY TODAY!' : isSoon ? '⚡ Birthday soon' : 'Upcoming Birthday'}
              </div>
              <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold leading-tight">
                {reminder.childName}
              </h1>
              <p className="mt-2 text-lg font-extrabold text-white/90">
                Turning {turningAge} on {new Date(reminder.childBirthDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long' })}
              </p>

              <div className="mt-4 flex items-center gap-3 flex-wrap text-sm">
                {reminder.childGender && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 backdrop-blur px-2.5 py-1 text-xs font-extrabold uppercase">
                    {reminder.childGender === 'BOYS' ? '👦' : reminder.childGender === 'GIRLS' ? '👧' : '⚧️'} {reminder.childGender}
                  </span>
                )}
                {reminder.parentRelation && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 backdrop-blur px-2.5 py-1 text-xs font-extrabold">
                    {reminder.parentRelation}
                  </span>
                )}
                {reminder.budgetRange && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/30 backdrop-blur px-2.5 py-1 text-xs font-extrabold border border-emerald-300/40">
                    <DollarSign className="h-3 w-3" /> Budget: {reminder.budgetRange}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Days until</div>
              <div className={`text-6xl sm:text-7xl font-extrabold tabular-nums leading-none mt-1 ${
                isToday ? 'text-amber-300' : 'text-white'}`}>
                {isToday ? '🎉' : daysUntil}
              </div>
              <div className="text-sm font-extrabold text-white/80 mt-1">
                {isToday ? 'TODAY!' : daysUntil === 1 ? 'tomorrow' : 'days'}
              </div>
            </div>
          </div>

          {/* Parent Info */}
          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-3">
              <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Parent</div>
              <div className="text-lg font-extrabold mt-1 flex items-center gap-2">
                <User className="h-4 w-4" /> {reminder.customerName}
              </div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-3">
              <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Phone</div>
              <div className="text-lg font-extrabold mt-1 flex items-center gap-2">
                <Phone className="h-4 w-4" /> {reminder.customerPhone}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CUSTOMER LIFETIME VALUE */}
      {reminder.totalPurchases > 0 && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Orders" value={reminder.totalPurchases} icon={ShoppingCart} tone="blue" />
          <StatCard label="Lifetime Spend" value={formatPKR(reminder.totalSpent)} icon={DollarSign} tone="emerald" />
          <StatCard label="Avg per Order" value={formatPKR(reminder.computed?.avgSpend || 0)} icon={TrendingUp} tone="violet" />
          <StatCard label="Current Age" value={`${reminder.computed?.currentAge} yr`} icon={Baby} tone="pink" />
        </section>
      )}

      {/* QUICK ACTIONS */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4">
        <div className="grid sm:grid-cols-4 gap-2">
          <a href={`https://wa.me/${reminder.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`}
            target="_blank" rel="noreferrer"
            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white p-4 flex flex-col items-center gap-2 shadow-md transition">
            <MessageCircle className="h-6 w-6" />
            <div className="font-extrabold text-sm">WhatsApp Parent</div>
          </a>
          <a href={`tel:${reminder.customerPhone}`}
            className="rounded-xl bg-blue-500 hover:bg-blue-600 text-white p-4 flex flex-col items-center gap-2 shadow-md transition">
            <Phone className="h-6 w-6" />
            <div className="font-extrabold text-sm">Call Parent</div>
          </a>
          <button onClick={() => markReminderSent.mutate()} disabled={markReminderSent.isPending}
            className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white p-4 flex flex-col items-center gap-2 shadow-md transition disabled:opacity-50">
            <Send className="h-6 w-6" />
            <div className="font-extrabold text-sm">Mark Reminder Sent</div>
          </button>
          <button onClick={() => setShowRecordPurchase(true)}
            className="rounded-xl bg-pink-600 hover:bg-pink-700 text-white p-4 flex flex-col items-center gap-2 shadow-md transition">
            <Gift className="h-6 w-6" />
            <div className="font-extrabold text-sm">Record Gift Purchase</div>
          </button>
        </div>

        {reminder.lastReminderSent && (
          <div className="mt-3 text-xs text-slate-500 font-bold text-center">
            Last reminder sent: {new Date(reminder.lastReminderSent).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        )}
      </section>

      {/* CHILD INTERESTS */}
      {reminder.childInterests?.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-violet-900">{reminder.childName}'s Interests</h3>
              <p className="text-xs text-violet-700 font-bold">What the birthday child loves</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {reminder.childInterests.map((i: string) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-white border-2 border-violet-300 text-violet-800 text-sm font-extrabold">
                {i}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* LAST GIFT GIVEN */}
      {reminder.lastGiftGiven && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 p-5 flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-amber-900">Last Gift Given</h3>
            <p className="text-sm text-amber-800 font-semibold italic mt-1">"{reminder.lastGiftGiven}"</p>
            {reminder.lastPurchaseDate && (
              <p className="text-xs text-amber-700 font-bold mt-1">
                on {new Date(reminder.lastPurchaseDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            <p className="text-xs text-amber-700 font-semibold mt-2">
              💡 Suggest something different this year to avoid duplication
            </p>
          </div>
        </section>
      )}

      {/* AI GIFT SUGGESTIONS (KILLER FEATURE) */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-pink-50 to-violet-50 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-700 text-white flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 inline-flex items-center gap-2">
              🎁 AI-Suggested Gifts
              <span className="px-2 py-0.5 rounded-full bg-violet-500 text-white text-[9px] font-extrabold uppercase">
                Auto-matched
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-bold">
              Perfect for turning {turningAge} • {reminder.childGender === 'BOYS' ? '👦 Boy' : reminder.childGender === 'GIRLS' ? '👧 Girl' : '⚧️ Any'}
              {suggestions?.budgetCeiling && ` • Under ${formatPKR(suggestions.budgetCeiling)}`}
            </p>
          </div>
        </div>

        {loadingSuggestions ? (
          <div className="p-10 text-center">
            <div className="h-10 w-10 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin mx-auto" />
            <p className="text-sm font-extrabold text-slate-500 mt-3">Finding perfect gifts...</p>
          </div>
        ) : suggestions && suggestions.products.length > 0 ? (
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {suggestions.products.map((p: any) => (
                <Link key={p.id} to={`/toy-products/${p.productId}`}
                  className="group rounded-2xl bg-white border-2 border-slate-200 overflow-hidden hover:border-pink-400 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  <div className="aspect-square bg-slate-100 relative overflow-hidden">
                    {p.product?.images?.[0]?.url ? (
                      <img src={p.product.images[0].url} loading="lazy" alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50">
                        <Baby className="h-10 w-10 text-pink-300" />
                      </div>
                    )}
                    {p.isBirthdayGift && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-pink-500 text-white text-[9px] font-extrabold shadow">
                        🎂 GIFT
                      </div>
                    )}
                    {p.isBestSeller && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold shadow">
                        🏆 BEST
                      </div>
                    )}
                    {p.isEducational && (
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-violet-600 text-white text-[9px] font-extrabold shadow inline-flex items-center gap-0.5">
                        <GraduationCap className="h-2.5 w-2.5" /> EDU
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="font-extrabold text-slate-900 text-xs leading-tight line-clamp-2 min-h-[2rem]">
                      {p.product?.name}
                    </div>
                    {p.brand && <div className="text-[10px] font-bold text-slate-500 mt-0.5">{p.brand}</div>}
                    <div className="mt-1.5 flex items-end justify-between">
                      <div className="text-base font-extrabold text-emerald-700 tabular-nums leading-none">
                        {formatPKR(p.retailPrice || p.product?.price || 0)}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-pink-600 group-hover:translate-x-1 transition" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Suggested Gift Packs */}
            {suggestions.giftPacks?.length > 0 && (
              <div className="mt-6 pt-6 border-t-2 border-slate-100">
                <h4 className="font-extrabold text-slate-900 mb-3 flex items-center gap-2">
                  <Gift className="h-4 w-4 text-violet-600" /> Perfect Gift Packs
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {suggestions.giftPacks.map((g: any) => (
                    <Link key={g.id} to={`/toystore/gift-packs/${g.id}/edit`}
                      className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-300 p-3 hover:shadow-md transition">
                      <div className="flex items-center gap-2 mb-2">
                        <Gift className="h-5 w-5 text-violet-700" />
                        <div className="font-extrabold text-sm text-slate-900 truncate">{g.name}</div>
                      </div>
                      <div className="text-xs font-bold text-slate-600">{g.itemCount} items</div>
                      <div className="mt-2 flex items-end justify-between">
                        <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(g.giftPackPrice)}</div>
                        {g.savingsPct > 0 && (
                          <span className="text-[10px] font-extrabold text-amber-700">Save {Number(g.savingsPct).toFixed(0)}%</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-10 text-center">
            <Package className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <div className="font-extrabold text-slate-700">No matching gifts in stock</div>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Try adjusting the child's interests or budget range
            </p>
          </div>
        )}
      </section>

      {reminder.notes && (
        <section className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-4">
          <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">Notes</div>
          <p className="text-sm text-slate-700 font-semibold">{reminder.notes}</p>
        </section>
      )}
    </div>
  );
}

function RecordPurchaseModal({ reminderId, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    giftDescription: '',
    amount: 0,
    purchaseDate: new Date().toISOString().slice(0, 10),
  });

  const record = useMutation({
    mutationFn: () => toyBirthdaysApi.recordPurchase(reminderId, form),
    onSuccess: () => {
      toast.success('Gift purchase recorded');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-pink-600 to-rose-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">🎁 Record Gift Purchase</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">Gift Description *</label>
            <input autoFocus value={form.giftDescription} onChange={(e) => setForm({ ...form, giftDescription: e.target.value })}
              placeholder="e.g. LEGO Classic Bricks Set 500 pcs"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">Amount Paid *</label>
            <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              placeholder="0"
              className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">Purchase Date</label>
            <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
          </div>
        </div>
        <div className="px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-pink-600 to-rose-700"
            onClick={() => record.mutate()} loading={record.isPending}
            disabled={!form.giftDescription.trim() || form.amount <= 0}>
            <Save className="h-4 w-4" /> Record
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    pink: 'from-pink-500 to-rose-700', blue: 'from-blue-500 to-cyan-700',
    emerald: 'from-emerald-500 to-emerald-700', violet: 'from-violet-500 to-purple-700',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1 truncate">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
