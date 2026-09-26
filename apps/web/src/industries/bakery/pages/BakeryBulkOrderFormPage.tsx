import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag, ArrowLeft, Plus, Trash2, Search, X, CheckCircle2,
  Building2, Calendar, Truck, Wrench, Wallet, AlertTriangle,
  GraduationCap, Loader2, Users, MapPin, Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { bulkOrdersApi } from '../api/bulk-orders.api';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';

/* ═════════════════════════════════════════════════════════════
   NAYA BARA ORDER
   ─────────────────────────────────────────────────────────────
   Ye safha pehle tha hi nahi. Backend me bara order banane ka
   raasta maujood tha, magar screen par kahin se banaya nahi ja
   sakta tha — list sirf dekhne ke liye thi.

   Do cheezein jaan-boojh kar samne rakhi hain, kyunke inhi se
   bakery ka paisa bachta hai:

     • Rate khud jama hota hai — jitni cheezein daalein, neeche
       kul rakam apne aap banti rehti hai.
     • Advance — 50% ka button saamne hai, aur na daalein to
       warning aa jati hai.
   ═════════════════════════════════════════════════════════════ */

const ORDER_TYPES = [
  { value: 'WEDDING', label: 'Shadi', emoji: '💍' },
  { value: 'BIRTHDAY', label: 'Birthday', emoji: '🎂' },
  { value: 'CORPORATE', label: 'Daftar', emoji: '🏢' },
  { value: 'SCHOOL', label: 'School', emoji: '🎓' },
  { value: 'RELIGIOUS', label: 'Mazhabi', emoji: '🕌' },
  { value: 'PARTY', label: 'Party', emoji: '🎉' },
  { value: 'CATERING', label: 'Catering', emoji: '🍽️' },
  { value: 'OTHER', label: 'Aur koi', emoji: '📦' },
];

interface Line {
  productId?: string;
  name: string;
  qty: number | '';
  rate: number | '';
}

export default function BakeryBulkOrderFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showTeacher, setShowTeacher] = useState(false);
  const [search, setSearch] = useState('');
  const [f, setF] = useState({
    organizationName: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    orderType: 'WEDDING',
    eventDate: '',
    eventTime: '',
    venue: '',
    totalGuests: '' as number | '',
    advancePaid: '' as number | '',
    requiresDelivery: false,
    deliveryAddress: '',
    requiresSetup: false,
    setupTime: '',
    specialInstructions: '',
  });
  const [lines, setLines] = useState<Line[]>([]);
  const set = (p: any) => setF((x) => ({ ...x, ...p }));

  /* ── Edit me purana order bhar do ── */
  const existingQ = useQuery({
    queryKey: ['bulk-order', id],
    queryFn: () => bulkOrdersApi.getOne(id!),
    enabled: isEdit,
  });

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const o = existingQ.data as any;
    if (!isEdit || !o || hydrated) return;
    set({
      organizationName: o.organizationName ?? '',
      contactPerson: o.contactPerson ?? '',
      contactPhone: o.contactPhone ?? '',
      contactEmail: o.contactEmail ?? '',
      orderType: o.orderType ?? 'WEDDING',
      eventDate: o.eventDate ? String(o.eventDate).slice(0, 10) : '',
      eventTime: o.eventTime ?? '',
      venue: o.venue ?? '',
      totalGuests: o.totalGuests ?? '',
      advancePaid: o.advancePaid ?? '',
      requiresDelivery: !!o.requiresDelivery,
      deliveryAddress: o.deliveryAddress ?? '',
      requiresSetup: !!o.requiresSetup,
      setupTime: o.setupTime ?? '',
      specialInstructions: o.specialInstructions ?? '',
    });
    setLines(Array.isArray(o.items)
      ? o.items.map((i: any) => ({
          productId: i.productId, name: i.name ?? i.productName ?? '',
          qty: Number(i.qty ?? i.quantity) || '', rate: Number(i.rate ?? i.price) || '',
        }))
      : []);
    setHydrated(true);
  }, [isEdit, existingQ.data, hydrated]);

  const productsQ = useQuery({
    queryKey: ['bakery-all-products'],
    queryFn: () => fetchAllProducts({ isActive: true }),
  });
  const products = productsQ.data?.items ?? [];
  const chosen = new Set(lines.map((l) => l.productId).filter(Boolean));
  const q = search.trim().toLowerCase();
  const options = useMemo(
    () => products.filter((p) => !chosen.has(p.id) && (q ? p.name.toLowerCase().includes(q) : true)).slice(0, 12),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, q, lines],
  );

  /* ── Hisab ── */
  const total = useMemo(
    () => lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.rate || 0), 0),
    [lines],
  );
  const totalItems = useMemo(() => lines.reduce((s, l) => s + Number(l.qty || 0), 0), [lines]);
  const advance = Number(f.advancePaid) || 0;
  const due = Math.max(total - advance, 0);
  const advancePct = total > 0 ? (advance / total) * 100 : 0;

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!f.organizationName.trim()) e.push('Kis ka order hai — naam likhein');
    if (!f.contactPhone.trim()) e.push('Phone number zaroori hai');
    if (!f.eventDate) e.push('Event ki tareekh chunein');
    if (lines.length === 0) e.push('Kam se kam ek cheez daalein');
    lines.forEach((l) => {
      if (!l.name.trim()) e.push('Har line ka naam likhein');
      else if (Number(l.qty || 0) <= 0) e.push(`"${l.name}" ki tadaad likhein`);
      else if (Number(l.rate || 0) <= 0) e.push(`"${l.name}" ka rate likhein`);
    });
    if (f.requiresDelivery && !f.deliveryAddress.trim()) e.push('Pahunchana hai to pata likhein');
    if (advance > total) e.push('Advance kul rakam se zyada nahi ho sakta');
    return [...new Set(e)];
  }, [f, lines, advance, total]);

  const mut = useMutation({
    mutationFn: () => {
      const payload = {
        organizationName: f.organizationName.trim(),
        contactPerson: f.contactPerson || undefined,
        contactPhone: f.contactPhone.trim(),
        contactEmail: f.contactEmail || undefined,
        orderType: f.orderType,
        eventDate: new Date(f.eventDate).toISOString(),
        eventTime: f.eventTime || undefined,
        venue: f.venue || undefined,
        totalGuests: f.totalGuests === '' ? undefined : Number(f.totalGuests),
        totalItems,
        items: lines.map((l) => ({
          productId: l.productId,
          name: l.name.trim(),
          qty: Number(l.qty) || 0,
          rate: Number(l.rate) || 0,
          total: Number(l.qty || 0) * Number(l.rate || 0),
        })),
        quotedPrice: total,
        advancePaid: advance,
        paidAmount: advance,
        requiresDelivery: f.requiresDelivery,
        deliveryAddress: f.requiresDelivery ? f.deliveryAddress : undefined,
        requiresSetup: f.requiresSetup,
        setupTime: f.requiresSetup ? (f.setupTime || undefined) : undefined,
        specialInstructions: f.specialInstructions || undefined,
      };
      return isEdit ? bulkOrdersApi.update(id!, payload) : bulkOrdersApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Order update ho gaya' : 'Bara order ban gaya');
      qc.invalidateQueries({ queryKey: ['bulk-orders'] });
      navigate('/bakery/bulk-orders');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save nahi hua'),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) setShowTeacher(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link to="/bakery/bulk-orders" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-amber-600 transition">
          <ArrowLeft className="h-4 w-4" /> Bare orders
        </Link>
        <button onClick={() => setShowTeacher(true)}
          className="h-10 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 transition">
          <GraduationCap className="h-4 w-4" /> Sikhein
        </button>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-yellow-700 text-white p-5 sm:p-6 shadow-2xl">
        <div className="absolute -top-20 -right-16 h-60 w-60 rounded-full bg-amber-400/25 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
            <ShoppingBag className="h-3.5 w-3.5 text-amber-300" /> Bakery · Bara order
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black leading-tight">
            {isEdit ? 'Order me tabdeeli' : '🎪 Naya Bara Order'}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
            Shadi, daftar ki party, school ka function — rate khud jama hota rahega
          </p>
        </div>
      </section>

      <div className="grid xl:grid-cols-[1fr_340px] gap-4 items-start">
        <div className="min-w-0 space-y-4">
          {/* ── Kis ka order ── */}
          <Card icon={Building2} title="Kis ka order hai">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Idara / naam *" value={f.organizationName} autoFocus
                onChange={(e) => set({ organizationName: e.target.value })}
                placeholder="Malik Shadi Hall, ABC School…" />
              <Input label="Rabta karne wala" value={f.contactPerson}
                onChange={(e) => set({ contactPerson: e.target.value })} placeholder="Aslam sahib" />
              <Input label="Phone *" value={f.contactPhone}
                onChange={(e) => set({ contactPhone: e.target.value })} placeholder="03001234567" />
              <Input label="Email" value={f.contactEmail}
                onChange={(e) => set({ contactEmail: e.target.value })} />
            </div>

            <div>
              <Lbl>Kis qism ka</Lbl>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {ORDER_TYPES.map((t) => (
                  <button key={t.value} type="button" onClick={() => set({ orderType: t.value })}
                    className={`h-11 px-2 rounded-xl border-2 text-[11px] font-black inline-flex items-center justify-center gap-1 transition ${
                      f.orderType === t.value
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-400'
                    }`}>{t.emoji} {t.label}</button>
                ))}
              </div>
            </div>
          </Card>

          {/* ── Kab aur kahan ── */}
          <Card icon={Calendar} title="Kab aur kahan">
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Lbl>Event ki tareekh *</Lbl>
                <input type="date" value={f.eventDate} onChange={(e) => set({ eventDate: e.target.value })}
                  className={`${inp} [color-scheme:light] dark:[color-scheme:dark]`} />
              </div>
              <div>
                <Lbl>Waqt</Lbl>
                <input type="time" value={f.eventTime} onChange={(e) => set({ eventTime: e.target.value })}
                  className={`${inp} [color-scheme:light] dark:[color-scheme:dark]`} />
              </div>
              <Input label="Kitne mehmaan" type="number" value={f.totalGuests}
                onChange={(e) => set({ totalGuests: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="300" />
            </div>
            <Input label="Jagah" value={f.venue} onChange={(e) => set({ venue: e.target.value })}
              placeholder="Shalimar Marquee, Gulberg" />

            <div className="grid sm:grid-cols-2 gap-3">
              <Toggle icon={Truck} label="Pahunchana hai" hint="Hum le kar jayenge"
                value={f.requiresDelivery} onChange={(v: boolean) => set({ requiresDelivery: v })} />
              <Toggle icon={Wrench} label="Setup bhi karna hai" hint="Mez lagana, sajana"
                value={f.requiresSetup} onChange={(v: boolean) => set({ requiresSetup: v })} />
            </div>

            {f.requiresDelivery && (
              <Input label="Pahunchane ka pata *" value={f.deliveryAddress}
                onChange={(e) => set({ deliveryAddress: e.target.value })} />
            )}
            {f.requiresSetup && (
              <div>
                <Lbl>Setup ka waqt</Lbl>
                <input type="time" value={f.setupTime} onChange={(e) => set({ setupTime: e.target.value })}
                  className={`${inp} [color-scheme:light] dark:[color-scheme:dark]`} />
              </div>
            )}
          </Card>

          {/* ── Kya kya chahiye ── */}
          <Card icon={Package} title="Kya kya chahiye">
            {lines.length > 0 && (
              <div className="space-y-2">
                {lines.map((l, idx) => (
                  <div key={idx} className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <input value={l.name}
                        onChange={(e) => setLines((xs) => xs.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
                        placeholder="Cheez ka naam"
                        className="h-10 flex-1 min-w-0 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-sm font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" />
                      <button onClick={() => setLines((xs) => xs.filter((_, i) => i !== idx))}
                        className="h-10 w-10 rounded-lg bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 hover:border-rose-400 transition">
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" min={0} step="any" value={l.qty}
                        onChange={(e) => setLines((xs) => xs.map((x, i) => (i === idx ? { ...x, qty: e.target.value === '' ? '' : Number(e.target.value) } : x)))}
                        placeholder="Tadaad"
                        className="h-10 w-24 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm font-extrabold text-center tabular-nums focus:outline-none focus:border-amber-500" />
                      <span className="text-slate-400 font-black">×</span>
                      <input type="number" min={0} step="any" value={l.rate}
                        onChange={(e) => setLines((xs) => xs.map((x, i) => (i === idx ? { ...x, rate: e.target.value === '' ? '' : Number(e.target.value) } : x)))}
                        placeholder="Rate"
                        className="h-10 w-28 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm font-extrabold text-center tabular-nums focus:outline-none focus:border-amber-500" />
                      <span className="ml-auto text-sm font-black tabular-nums text-slate-900 dark:text-white">
                        {formatPKR(Number(l.qty || 0) * Number(l.rate || 0))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Apni cheezon me se chunein…"
                className={`${inp} pl-9`} />
            </div>

            {options.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {options.map((p) => (
                  <button key={p.id}
                    onClick={() => { setLines((xs) => [...xs, { productId: p.id, name: p.name, qty: '', rate: Number(p.price) || '' }]); setSearch(''); }}
                    className="h-9 px-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-400 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition">
                    <Plus className="h-3.5 w-3.5 text-amber-500" /> {p.name}
                    <span className="text-[10px] text-slate-400 tabular-nums">{formatPKR(p.price)}</span>
                  </button>
                ))}
              </div>
            )}

            <button onClick={() => setLines((xs) => [...xs, { name: '', qty: '', rate: '' }])}
              className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black inline-flex items-center justify-center gap-1.5 hover:border-amber-400 transition">
              <Plus className="h-4 w-4" /> Haath se line daalein
            </button>

            <Input label="Koi khaas baat" value={f.specialInstructions}
              onChange={(e) => set({ specialInstructions: e.target.value })}
              placeholder="Cake par idare ka logo, sugar-free bhi chahiye…" />
          </Card>
        </div>

        {/* ── Khulasa ── */}
        <aside className="xl:sticky xl:top-4 xl:self-start space-y-3">
          <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 text-white p-5 shadow-xl">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Kul rakam</div>
            <div className="mt-1 text-3xl font-black tabular-nums">{formatPKR(total)}</div>
            <div className="mt-1 text-[11px] font-bold text-white/70">
              {lines.length} line · {totalItems} cheezein
            </div>
          </div>

          <Card icon={Wallet} title="Advance">
            <Input label="Abhi kitna mil raha hai" type="number" value={f.advancePaid}
              onChange={(e) => set({ advancePaid: e.target.value === '' ? '' : Number(e.target.value) })} />
            {total > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                {[0.5, 0.3, 1].map((pc) => (
                  <button key={pc} onClick={() => set({ advancePaid: Math.round(total * pc) })}
                    className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-[11px] font-black text-slate-700 dark:text-slate-200 transition">
                    {pc === 1 ? 'Poora' : `${pc * 100}%`}
                  </button>
                ))}
              </div>
            )}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3 space-y-1">
              <Line2 label="Kul" value={formatPKR(total)} />
              <Line2 label="Advance" value={formatPKR(advance)} tone="emerald" />
              <Line2 label="Baqi rahega" value={formatPKR(due)} tone="amber" />
            </div>

            {total > 0 && advancePct < 30 && (
              <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3 flex gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-rose-900 dark:text-rose-200">
                  Advance sirf {advancePct.toFixed(0)}% hai. Itna bara saamaan apni jeb se
                  khareedna parega — kam se kam 50% lena behtar hai.
                </p>
              </div>
            )}
          </Card>

          {errors.length > 0 && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-extrabold text-amber-900 dark:text-amber-200">Ye reh gaya hai</span>
              </div>
              <ul className="space-y-0.5">
                {errors.map((e, i) => (
                  <li key={i} className="text-[12px] font-bold text-amber-800 dark:text-amber-300">• {e}</li>
                ))}
              </ul>
            </div>
          )}

          <Button className="w-full h-14 text-base font-extrabold bg-gradient-to-r from-amber-600 to-yellow-700"
            disabled={errors.length > 0 || mut.isPending} loading={mut.isPending}
            onClick={() => mut.mutate()}>
            {mut.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            {isEdit ? 'Save karein' : 'Order banayein'}
          </Button>
        </aside>
      </div>

      {showTeacher && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={() => setShowTeacher(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b-2 border-amber-200 dark:border-amber-500/30 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-500/15 dark:to-yellow-500/15 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <GraduationCap className="h-5 w-5" /> Bara order kaise lein
              </h3>
              <button onClick={() => setShowTeacher(false)} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <Tip icon={Building2} title="Kis ka order">
                Idare ka naam aur phone zaroori hai. Bare order me aksar baat karne wala koi
                aur hota hai — uska naam alag likh lein.
              </Tip>
              <Tip icon={Package} title="Cheezein daalna">
                Apni list me se chunein to rate khud bhar jata hai. Jo cheez list me nahi, uske
                liye <strong>"Haath se line daalein"</strong>.
              </Tip>
              <Tip icon={Wallet} title="Advance sab se ahem">
                Neeche kul rakam khud banti rehti hai. <strong>50% ka button</strong> saamne hai —
                advance 30% se kam ho to warning aa jati hai, kyunke itna bara saamaan apni jeb
                se khareedna parega.
              </Tip>
              <Tip icon={Truck} title="Pahunchana aur setup">
                Dono par nishan laga dein — waqt ka hisab lagate waqt ye bhool jana aam hai, aur
                phir aakhri din bhaag-daur hoti hai.
              </Tip>
              <Button className="w-full" onClick={() => setShowTeacher(false)}>Samajh gaya</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ CHHOTE HISSE ═══ */
const inp = 'h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500';

function Card({ icon: Icon, title, children }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-amber-600" />
        <h3 className="font-black text-slate-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">{children}</label>;
}

function Toggle({ icon: Icon, label, hint, value, onChange }: any) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`text-left rounded-2xl border-2 p-3 flex items-start gap-2.5 transition ${
        value ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-300'
      }`}>
      <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
        value ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
      }`}><Icon className="h-4 w-4" /></span>
      <span className="min-w-0">
        <span className="block text-[13px] font-extrabold text-slate-900 dark:text-white leading-tight">{label}</span>
        <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{hint}</span>
      </span>
    </button>
  );
}

function Line2({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-sm font-black tabular-nums ${tone ? tones[tone] : 'text-slate-900 dark:text-white'}`}>{value}</span>
    </div>
  );
}

function Tip({ icon: Icon, title, children }: any) {
  return (
    <div className="flex gap-2.5">
      <div className="h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}
