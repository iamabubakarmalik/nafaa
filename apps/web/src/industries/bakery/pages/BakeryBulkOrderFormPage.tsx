import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag, ArrowLeft, Plus, Minus, Trash2, Search, X, CheckCircle2,
  Building2, Calendar, Truck, Wrench, Wallet, AlertTriangle, GraduationCap,
  Loader2, Package, Info, Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { bulkOrdersApi } from '../api/bulk-orders.api';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';

/* ═════════════════════════════════════════════════════════════
   NAYA / EDIT BARA ORDER
   ─────────────────────────────────────────────────────────────
   Theek hua (paisa bachane wali kharabiyan):

   1. EDIT PAR PAYMENTS NAHI MITTIN. Pehle har save par
      `paidAmount = advance` jata tha — list se "Paisa mila" ke
      zariye darj hua saara paisa ur jata tha. Ab edit me paisa
      bheja hi nahi jata; wo sirf "Paisa mila" se badalta hai.

   2. Edit ki rakam ab list me nazar aati hai. List
      `finalPrice ?? quotedPrice` dikhati hai — pehle sirf
      quotedPrice badalta tha. Ab dono saath.

   3. Event ka WAQT ab tareekh me juR ta hai. Pehle raat 8 baje
      ka event subah 5 baje se "late" ginta tha.

   4. Edit kholne par tareekh maqami din se bharti hai (pehle UTC
      ki wajah se raat ke event ka din ek peeche aa jata tha).

   5. Advance ke saath naya order khud "Pakka hua".
   ═════════════════════════════════════════════════════════════ */

const LIST = '/bakery/bulk-orders';

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
  unit?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
/** ISO → maqami 'YYYY-MM-DD' aur 'HH:mm' */
function splitLocal(iso?: string): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}
/** Maqami tareekh + waqt → ISO. Waqt na ho to din ka aakhir (late ki ghalat warning na aaye) */
function joinLocal(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '23:59').split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0).toISOString();
}

export default function BakeryBulkOrderFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showTeacher, setShowTeacher] = useState(false);
  const [search, setSearch] = useState('');
  const [f, setF] = useState({
    organizationName: '', contactPerson: '', contactPhone: '', contactEmail: '',
    orderType: 'WEDDING', eventDate: '', eventTime: '', venue: '',
    totalGuests: '' as number | '', advancePaid: '' as number | '',
    requiresDelivery: false, deliveryAddress: '',
    requiresSetup: false, setupTime: '', specialInstructions: '',
  });
  const [lines, setLines] = useState<Line[]>([]);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  /* ── Edit me purana order ── */
  const existingQ = useQuery({ queryKey: ['bulk-order', id], queryFn: () => bulkOrdersApi.getOne(id!), enabled: isEdit });
  const existing: any = existingQ.data;
  const locked = isEdit && existing && ['DELIVERED', 'CANCELLED'].includes(existing.status);
  const alreadyPaid = Number(existing?.paidAmount || 0);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!isEdit || !existing || hydrated) return;
    const { date, time } = splitLocal(existing.eventDate);
    set({
      organizationName: existing.organizationName ?? '',
      contactPerson: existing.contactPerson ?? '',
      contactPhone: existing.contactPhone ?? '',
      contactEmail: existing.contactEmail ?? '',
      orderType: existing.orderType ?? 'WEDDING',
      eventDate: date,
      eventTime: existing.eventTime ?? time,
      venue: existing.venue ?? '',
      totalGuests: existing.totalGuests ?? '',
      requiresDelivery: !!existing.requiresDelivery,
      deliveryAddress: existing.deliveryAddress ?? '',
      requiresSetup: !!existing.requiresSetup,
      setupTime: existing.setupTime ?? '',
      specialInstructions: existing.specialInstructions ?? '',
    });
    setLines(Array.isArray(existing.items)
      ? existing.items.map((i: any) => ({
          productId: i.productId, name: i.name ?? i.productName ?? '',
          qty: Number(i.qty ?? i.quantity) || '', rate: Number(i.rate ?? i.price) || '', unit: i.unit,
        }))
      : []);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, existing, hydrated]);

  const productsQ = useQuery({
    queryKey: ['bakery-all-products'],
    queryFn: () => fetchAllProducts({ isActive: undefined }),
    staleTime: 60_000,
  });
  const products: any[] = (productsQ.data?.items ?? []).filter((p: any) => p.isActive !== false);
  const productBy = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const q = search.trim().toLowerCase();
  const options = useMemo(() => {
    const chosen = new Set(lines.map((l) => l.productId).filter(Boolean));
    return products
      .filter((p) => !chosen.has(p.id) && (q ? `${p.name} ${p.sku ?? ''} ${p.barcode ?? ''}`.toLowerCase().includes(q) : true))
      .slice(0, 14);
  }, [products, q, lines]);

  const updateLine = (idx: number, patch: Partial<Line>) => setLines((xs) => xs.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  /* ── Hisab ── */
  const total = useMemo(() => lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.rate || 0), 0), [lines]);
  const totalItems = useMemo(() => lines.reduce((s, l) => s + Number(l.qty || 0), 0), [lines]);
  const advance = isEdit ? alreadyPaid : Number(f.advancePaid) || 0;
  const due = Math.max(total - advance, 0);
  const advancePct = total > 0 ? (advance / total) * 100 : 0;
  const eventIso = f.eventDate ? joinLocal(f.eventDate, f.eventTime) : '';
  const isPast = eventIso && new Date(eventIso).getTime() < Date.now();

  const errors = useMemo(() => {
    const e: string[] = [];
    if (locked) e.push('Ye order mukammal / cancel ho chuka — ab badla nahi ja sakta');
    if (!f.organizationName.trim()) e.push('Kis ka order hai — naam likhein');
    if (!f.contactPhone.trim()) e.push('Phone number zaroori hai');
    else if (f.contactPhone.replace(/\D/g, '').length < 10) e.push('Phone number poora likhein');
    if (!f.eventDate) e.push('Event ki tareekh chunein');
    if (lines.length === 0) e.push('Kam se kam ek cheez daalein');
    lines.forEach((l) => {
      if (!l.name.trim()) e.push('Har line ka naam likhein');
      else if (Number(l.qty || 0) <= 0) e.push(`"${l.name}" ki tadaad likhein`);
      else if (Number(l.rate || 0) <= 0) e.push(`"${l.name}" ka rate likhein`);
    });
    if (f.requiresDelivery && !f.deliveryAddress.trim() && !f.venue.trim()) e.push('Pahunchana hai to pata ya jagah likhein');
    if (!isEdit && advance > total) e.push('Advance kul rakam se zyada nahi ho sakta');
    if (isEdit && total < alreadyPaid) e.push(`${formatPKR(alreadyPaid)} pehle hi mil chuka hai — kul rakam is se kam nahi ho sakti`);
    return [...new Set(e)];
  }, [f, lines, advance, total, isEdit, alreadyPaid, locked]);

  const mut = useMutation({
    mutationFn: async () => {
      const base: any = {
        organizationName: f.organizationName.trim(),
        contactPerson: f.contactPerson.trim() || undefined,
        contactPhone: f.contactPhone.trim(),
        contactEmail: f.contactEmail.trim() || undefined,
        orderType: f.orderType,
        eventDate: eventIso,
        eventTime: f.eventTime || undefined,
        venue: f.venue.trim() || undefined,
        totalGuests: f.totalGuests === '' ? undefined : Number(f.totalGuests),
        totalItems,
        items: lines.map((l) => ({
          productId: l.productId,
          name: l.name.trim(),
          qty: Number(l.qty) || 0,
          rate: Number(l.rate) || 0,
          unit: l.unit,
          total: Number(l.qty || 0) * Number(l.rate || 0),
        })),
        quotedPrice: total,
        requiresDelivery: f.requiresDelivery,
        deliveryAddress: f.requiresDelivery ? (f.deliveryAddress.trim() || f.venue.trim()) : undefined,
        requiresSetup: f.requiresSetup,
        setupTime: f.requiresSetup ? (f.setupTime || undefined) : undefined,
        specialInstructions: f.specialInstructions.trim() || undefined,
      };

      if (isEdit) {
        /* Paisa yahan se KABHI nahi — sirf "Paisa mila" se.
           finalPrice pehle se ho to wo bhi, warna list purani rakam dikhati. */
        if (existing?.finalPrice != null) base.finalPrice = total;
        return bulkOrdersApi.update(id!, base);
      }

      const created: any = await bulkOrdersApi.create({ ...base, advancePaid: advance, paidAmount: advance });
      /* Advance aaya = order pakka */
      if (advance > 0 && created?.id && ['ENQUIRY', 'QUOTED', undefined].includes(created?.status)) {
        try { await bulkOrdersApi.updateStatus(created.id, 'CONFIRMED'); } catch { /* halat baad me bhi badal sakti hai */ }
      }
      return created;
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Order update ho gaya' : advance > 0 ? 'Bara order ban gaya — pakka' : 'Bara order ban gaya');
      qc.invalidateQueries({ queryKey: ['bulk-orders'] });
      qc.invalidateQueries({ queryKey: ['bulk-order', id] });
      navigate(LIST);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save nahi hua'),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) setShowTeacher(false);
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && errors.length === 0 && !mut.isPending) { e.preventDefault(); mut.mutate(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, errors.length, mut]);

  if (isEdit && existingQ.isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link to={LIST} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-amber-600 transition">
          <ArrowLeft className="h-4 w-4" /> Bare orders
        </Link>
        <button onClick={() => setShowTeacher(true)}
          className="h-10 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 transition">
          <GraduationCap className="h-4 w-4" /> Sikhein
        </button>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-yellow-700 text-white p-5 sm:p-6 shadow-2xl">
        <div className="absolute -top-20 -right-16 h-60 w-60 rounded-full bg-amber-400/25 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
            <ShoppingBag className="h-3.5 w-3.5 text-amber-300" /> Bakery · Bara order{isEdit && existing?.orderNumber ? ` · ${existing.orderNumber}` : ''}
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black leading-tight">{isEdit ? 'Order me tabdeeli' : '🎪 Naya Bara Order'}</h1>
          <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">Shadi, daftar ki party, school ka function — rate khud jama hota rahega</p>
        </div>
      </section>

      {locked && (
        <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 p-3 flex gap-2">
          <Lock className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
            Ye order <strong>{existing.status === 'DELIVERED' ? 'de diya ja chuka' : 'cancel ho chuka'}</strong> hai
            {existing.status === 'DELIVERED' ? ' aur is ka bill ban chuka' : ''} — ab badla nahi ja sakta.
          </p>
        </div>
      )}

      <div className="grid xl:grid-cols-[1fr_340px] gap-4 items-start">
        <fieldset disabled={!!locked} className="min-w-0 space-y-4 disabled:opacity-70">
          <Card icon={Building2} title="Kis ka order hai">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Idara / naam *" value={f.organizationName} autoFocus={!isEdit}
                onChange={(e) => set({ organizationName: e.target.value })} placeholder="Malik Shadi Hall, ABC School…" />
              <Input label="Rabta karne wala" value={f.contactPerson} onChange={(e) => set({ contactPerson: e.target.value })} placeholder="Aslam sahib" />
              <Input label="Phone *" value={f.contactPhone} inputMode="tel" onChange={(e) => set({ contactPhone: e.target.value })} placeholder="03001234567" />
              <Input label="Email" value={f.contactEmail} type="email" onChange={(e) => set({ contactEmail: e.target.value })} />
            </div>
            <div>
              <Lbl>Kis qism ka</Lbl>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {ORDER_TYPES.map((t) => (
                  <button key={t.value} type="button" onClick={() => set({ orderType: t.value })}
                    className={`h-11 px-2 rounded-xl border-2 text-[11px] font-black inline-flex items-center justify-center gap-1 transition ${
                      f.orderType === t.value ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-400'
                    }`}>{t.emoji} {t.label}</button>
                ))}
              </div>
            </div>
          </Card>

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
                onChange={(e) => set({ totalGuests: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="300" />
            </div>
            {!f.eventTime && f.eventDate && (
              <p className="text-[11px] font-bold text-slate-500">Waqt na likha to din ke aakhir tak ka mana jayega.</p>
            )}
            {isPast && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-2.5 flex gap-2 text-[11px] font-bold text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" /> Ye waqt guzar chuka hai — tareekh sahi hai?
              </div>
            )}
            <Input label="Jagah" value={f.venue} onChange={(e) => set({ venue: e.target.value })} placeholder="Shalimar Marquee, Gulberg" />
            <div className="grid sm:grid-cols-2 gap-3">
              <Toggle icon={Truck} label="Pahunchana hai" hint="Hum le kar jayenge" value={f.requiresDelivery} onChange={(v: boolean) => set({ requiresDelivery: v })} />
              <Toggle icon={Wrench} label="Setup bhi karna hai" hint="Mez lagana, sajana" value={f.requiresSetup} onChange={(v: boolean) => set({ requiresSetup: v })} />
            </div>
            {f.requiresDelivery && (
              <Input label="Pahunchane ka pata" value={f.deliveryAddress} onChange={(e) => set({ deliveryAddress: e.target.value })}
                placeholder={f.venue ? `Khali chhoren to "${f.venue}"` : 'Pura pata'} />
            )}
            {f.requiresSetup && (
              <div>
                <Lbl>Setup ka waqt</Lbl>
                <input type="time" value={f.setupTime} onChange={(e) => set({ setupTime: e.target.value })} className={`${inp} [color-scheme:light] dark:[color-scheme:dark]`} />
              </div>
            )}
          </Card>

          <Card icon={Package} title="Kya kya chahiye">
            {lines.length > 0 && (
              <div className="space-y-2">
                {lines.map((l, idx) => {
                  const p = l.productId ? productBy.get(l.productId) : undefined;
                  return (
                    <div key={idx} className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <input value={l.name} onChange={(e) => updateLine(idx, { name: e.target.value })} placeholder="Cheez ka naam"
                          className="h-10 flex-1 min-w-0 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-sm font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" />
                        <button type="button" onClick={() => setLines((xs) => xs.filter((_, i) => i !== idx))}
                          className="h-10 w-10 rounded-lg bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 hover:border-rose-400 transition">
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="inline-flex items-center">
                          <button type="button" onClick={() => updateLine(idx, { qty: Math.max(Number(l.qty || 0) - 1, 0) || '' })}
                            className="h-10 w-9 rounded-l-lg border-2 border-r-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center"><Minus className="h-3.5 w-3.5" /></button>
                          <input type="number" min={0} step="any" value={l.qty}
                            onChange={(e) => updateLine(idx, { qty: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Tadaad"
                            className="h-10 w-20 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm font-extrabold text-center tabular-nums focus:outline-none focus:border-amber-500" />
                          <button type="button" onClick={() => updateLine(idx, { qty: Number(l.qty || 0) + 1 })}
                            className="h-10 w-9 rounded-r-lg border-2 border-l-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center"><Plus className="h-3.5 w-3.5" /></button>
                        </div>
                        <span className="text-[11px] font-black text-slate-500 w-10">{l.unit ?? p?.unit ?? ''}</span>
                        <span className="text-slate-400 font-black">×</span>
                        <input type="number" min={0} step="any" value={l.rate}
                          onChange={(e) => updateLine(idx, { rate: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Rate"
                          className="h-10 w-28 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm font-extrabold text-center tabular-nums focus:outline-none focus:border-amber-500" />
                        <span className="ml-auto text-sm font-black tabular-nums text-slate-900 dark:text-white">{formatPKR(Number(l.qty || 0) * Number(l.rate || 0))}</span>
                      </div>
                      <div className="text-[10px] font-bold">
                        {p ? (
                          <span className="text-emerald-700 dark:text-emerald-400">
                            ✓ Apne maal se jura — dete waqt stock ghatega · abhi stock {Number(Number(p.shopStock ?? p.stock ?? 0).toFixed(2))} {p.unit}
                            {p.price && Number(l.rate) !== Number(p.price) ? ` · counter rate ${formatPKR(p.price)}` : ''}
                          </span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400">Haath ki line — stock nahi ghatega (dete waqt jor sakte hain)</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Apni cheezon me se chunein — naam, SKU, barcode…" className={`${inp} pl-9`} />
            </div>
            {options.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {options.map((p) => (
                  <button key={p.id} type="button"
                    onClick={() => { setLines((xs) => [...xs, { productId: p.id, name: p.name, qty: '', rate: Number(p.price) || '', unit: p.unit }]); setSearch(''); }}
                    className="h-9 px-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-400 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition">
                    <Plus className="h-3.5 w-3.5 text-amber-500" /> {p.name}
                    <span className="text-[10px] text-slate-400 tabular-nums">{formatPKR(p.price)}/{p.unit}</span>
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setLines((xs) => [...xs, { name: '', qty: '', rate: '' }])}
              className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black inline-flex items-center justify-center gap-1.5 hover:border-amber-400 transition">
              <Plus className="h-4 w-4" /> Haath se line daalein
            </button>
            <Input label="Koi khaas baat" value={f.specialInstructions} onChange={(e) => set({ specialInstructions: e.target.value })}
              placeholder="Cake par idare ka logo, sugar-free bhi chahiye…" />
          </Card>
        </fieldset>

        <aside className="xl:sticky xl:top-4 xl:self-start space-y-3">
          <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 text-white p-5 shadow-xl">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Kul rakam</div>
            <div className="mt-1 text-3xl font-black tabular-nums">{formatPKR(total)}</div>
            <div className="mt-1 text-[11px] font-bold text-white/70">{lines.length} line · {Number(totalItems.toFixed(2))} cheezein</div>
          </div>

          <Card icon={Wallet} title={isEdit ? 'Paisa' : 'Advance'}>
            {isEdit ? (
              <div className="rounded-2xl bg-sky-50 dark:bg-sky-500/10 border-2 border-sky-200 dark:border-sky-500/30 p-3 flex gap-2">
                <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-sky-900 dark:text-sky-200">
                  Ab tak <strong>{formatPKR(alreadyPaid)}</strong> mil chuka. Naya paisa list ke <strong>"Paisa mila"</strong> se darj
                  karein — yahan se paisa nahi badalta, taake purani payments na mitein.
                </p>
              </div>
            ) : (
              <>
                <Input label="Abhi kitna mil raha hai" type="number" value={f.advancePaid}
                  onChange={(e) => set({ advancePaid: e.target.value === '' ? '' : Number(e.target.value) })} />
                {total > 0 && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {[0.5, 0.3, 1].map((pc) => (
                      <button key={pc} type="button" onClick={() => set({ advancePaid: Math.round(total * pc) })}
                        className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-[11px] font-black text-slate-700 dark:text-slate-200 transition">
                        {pc === 1 ? 'Poora' : `${pc * 100}%`}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3 space-y-1">
              <Line2 label="Kul" value={formatPKR(total)} />
              <Line2 label={isEdit ? 'Mil chuka' : 'Advance'} value={formatPKR(advance)} tone="emerald" />
              <Line2 label="Baqi rahega" value={formatPKR(due)} tone="amber" />
            </div>
            {!isEdit && total > 0 && advancePct < 30 && (
              <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3 flex gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-rose-900 dark:text-rose-200">
                  Advance sirf {advancePct.toFixed(0)}% hai. Itna bara saamaan apni jeb se khareedna parega — kam se kam 50% lena behtar hai.
                </p>
              </div>
            )}
            {!isEdit && advance > 0 && (
              <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">✓ Advance ke saath order khud "Pakka hua" ho jayega.</p>
            )}
          </Card>

          {errors.length > 0 && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-extrabold text-amber-900 dark:text-amber-200">Ye reh gaya hai</span>
              </div>
              <ul className="space-y-0.5">{errors.map((e, i) => <li key={i} className="text-[12px] font-bold text-amber-800 dark:text-amber-300">• {e}</li>)}</ul>
            </div>
          )}

          <Button className="w-full h-14 text-base font-extrabold bg-gradient-to-r from-amber-600 to-yellow-700"
            disabled={errors.length > 0 || mut.isPending} loading={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            {isEdit ? 'Save karein' : 'Order banayein'} <kbd className="hidden sm:inline text-[9px] opacity-70">Ctrl+Enter</kbd>
          </Button>
        </aside>
      </div>

      {showTeacher && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={() => setShowTeacher(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b-2 border-amber-200 dark:border-amber-500/30 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-500/15 dark:to-yellow-500/15 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Bara order kaise lein</h3>
              <button onClick={() => setShowTeacher(false)} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center"><X className="h-4 w-4 text-slate-600 dark:text-slate-300" /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <Tip icon={Building2} title="Kis ka order">Idare ka naam aur phone zaroori. Baat karne wala koi aur ho to uska naam alag likh lein.</Tip>
              <Tip icon={Package} title="Cheezein">
                Apni list se chunein to rate bhar jata hai aur <strong>dete waqt stock ghatta hai</strong>. Haath ki line ka stock nahi ghatta.
              </Tip>
              <Tip icon={Calendar} title="Waqt zaroor likhein">Waqt se hi "late" ka hisab lagta hai. Na likhein to din ke aakhir tak mana jata hai.</Tip>
              <Tip icon={Wallet} title="Advance">
                Naye order par advance yahin. Baad ka har paisa list ke "Paisa mila" se — edit se paisa kabhi nahi badalta.
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
      <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-amber-600" /><h3 className="font-black text-slate-900 dark:text-white">{title}</h3></div>
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
      <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${value ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}><Icon className="h-4 w-4" /></span>
      <span className="min-w-0">
        <span className="block text-[13px] font-extrabold text-slate-900 dark:text-white leading-tight">{label}</span>
        <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{hint}</span>
      </span>
    </button>
  );
}

function Line2({ label, value, tone }: any) {
  const tones: Record<string, string> = { emerald: 'text-emerald-600 dark:text-emerald-400', amber: 'text-amber-600 dark:text-amber-400' };
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
      <div className="h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0"><Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}
