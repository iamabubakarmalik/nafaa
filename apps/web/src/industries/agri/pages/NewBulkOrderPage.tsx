import { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Plus, Minus, Trash2, User, Search, Package, X,
  Truck, Calendar, Sprout, Tractor, Wallet, ShieldAlert, Scale,
  GraduationCap, AlertTriangle, CheckCircle2, Layers, Wheat,
  Calculator, MapPin, Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { bulkOrdersApi } from '../api/bulk-orders.api';
import { agriProductsApi, type AgriProductProfile } from '../api/products.api';
import { farmersApi } from '../api/farmers.api';
import { stockReportApi } from '@modules/inventory/stock-report/api/stock-report.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { certStatus, isMeasured, agriUnitLabel, SEASONS } from '../lib/agriUnits';
import {
  deriveAgriKind, prettyAgriKind, AGRI_KIND_EMOJI, needsGovtReg, type AgriKind,
} from '../lib/agriCategory';

/* ═════════════════════════════════════════════════════════════
   NAYA BARA ORDER
   ─────────────────────────────────────────────────────────────
   Bara order counter ki bikri jaisa nahi hota. Farmer aata hai,
   apna raqba batata hai, aur poochta hai: "paanch acre ke liye
   kitni bori chahiye?" Achha dukaan-daar wahin hisab laga kar
   batata hai.

   Is liye is safhe me teen cheezein hain jo pehle nahi thin:

     📐 RAQBA SE HISAB — product ke andar "kitni miqdar per acre"
        bhara ho, to raqba likhte hi tadaad khud aa jati hai.

     📦 STOCK KA MILAN — order me jitna maal daala ja raha hai
        utna gudaam me hai ya nahi. Order to ban jata hai, magar
        pata hona chahiye ke mangwana parega.

     🛡️ REGISTRATION — jis beej ya dawa ki meyaad khatam ho
        chuki, wo order me daali hi nahi ja sakti. Poora order
        ban kar delivery ke din pata chale, us se behtar hai ke
        abhi ruk jaye.

   Aur bori ka hisab: order bori me banta hai, magar sath hi kilo
   bhi dikhta hai — dukaan-daar bori ginta hai, farmer kilo.
   ═════════════════════════════════════════════════════════════ */

const COMMON_CROPS = [
  'Gandum', 'Chawal', 'Kapas', 'Ganna', 'Makai', 'Aloo',
  'Tamatar', 'Pyaz', 'Mirch', 'Dalein', 'Chara', 'Chana', 'Sarson',
];

const TRANSPORT = ['Tractor trolley', 'Truck', 'Pickup', 'Rickshaw', 'Bail gaari', 'Khud le jayenge'];

interface OrderItem {
  productId?: string;
  productName: string;
  category?: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  discount: number;
  batchNumber?: string;
  /* Sirf dikhane ke liye — API me nahi jate */
  packSize?: number;
  packUnit?: string;
  stock?: number;
  kind?: AgriKind;
  rate?: string;
}

const fmtQty = (q: number) => Number(q || 0).toFixed(Number(q || 0) % 1 === 0 ? 0 : 2);

/**
 * "2 bori per acre" jaisi line se number nikalna.
 *
 * Dukaan-daar ye khana apne alfaz me bharta hai — "2 bag/acre",
 * "50 kg per acre", "2-3 bori fi acre". Pehla number hi miqdar
 * hota hai; na mile to andaza nahi lagate, khali chhor dete hain.
 */
function perAcreFrom(rate?: string): number | null {
  if (!rate) return null;
  const m = String(rate).match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Khali khane hata do — server par season/farmerId enum aur id hain, khali string un me nahi jaati */
function blankToUndefined<T extends Record<string, any>>(obj: T): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = typeof v === 'string' && v.trim() === '' ? undefined : v;
  return out;
}

export default function NewBulkOrderPage() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<any>({
    farmerId: '', customerId: '', customerName: '', customerPhone: '',
    deliveryDate: '', season: '', cropTarget: '', landAreaAcres: '',
    isDelivery: false, deliveryAddress: '', deliveryCharges: 0,
    transportType: '', vehicleNumber: '',
    bulkDiscount: 0, taxAmount: 0, otherCharges: 0,
    isCredit: false, creditDueDate: '',
    advisorNotes: '', farmerNotes: '',
  });

  const [items, setItems] = useState<OrderItem[]>([]);
  const [farmerSearch, setFarmerSearch] = useState('');
  const [showFarmerPicker, setShowFarmerPicker] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [farmer, setFarmer] = useState<any>(null);
  const [showTeacher, setShowTeacher] = useState(false);
  const [blocked, setBlocked] = useState<any>(null);

  const { data: farmers = [] } = useQuery({
    queryKey: ['farmers-for-bulk-order', farmerSearch],
    queryFn: () => farmersApi.list({ search: farmerSearch || undefined }),
    enabled: showFarmerPicker,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['agri-profiles-all'],
    queryFn: () => agriProductsApi.list({}).catch(() => [] as AgriProductProfile[]),
    staleTime: 5 * 60_000,
  });

  const { data: stock } = useQuery({
    queryKey: ['agri-stock-report'],
    queryFn: () => stockReportApi.generate({ stockStatus: 'all', isActive: true }).catch(() => null),
    staleTime: 60_000,
  });

  /** Har product + uska stock, registration aur bori ka hisab */
  const catalog = useMemo(() => {
    const stockBy = new Map<string, any>();
    (stock?.rows ?? []).forEach((r: any) => stockBy.set(r.productId, r));

    return (profiles as any[])
      .filter((p) => p.product?.name)
      .map((p) => {
        const kind = (p.category as AgriKind) ?? deriveAgriKind(p.product?.category?.name, p.product?.name);
        const cert = certStatus(p.govtRegExpiry);
        const unit = p.product?.unit ?? 'bag';
        const packSizeRaw = Number(p.packSize || 0);
        const row = stockBy.get(p.productId);
        return {
          productId: p.productId,
          name: p.product?.name ?? 'Cheez',
          categoryName: p.product?.category?.name ?? '',
          price: Number(p.product?.price || 0),
          unit, kind, cert,
          blocked: needsGovtReg(kind) && cert.state === 'expired',
          certSoon: needsGovtReg(kind) && cert.state === 'soon',
          restricted: !!p.isRestricted,
          packSize: packSizeRaw > 0 && !isMeasured(unit) ? packSizeRaw : 0,
          packUnit: String(p.packUnit || 'kg'),
          stock: Number(row?.stock ?? 0),
          crops: p.targetCrops ?? [],
          rate: p.applicationRate || undefined,
          season: p.season ?? null,
          bulkPct: Number(p.bulkDiscountPct || 0),
          bulkMin: Number(p.bulkDiscountThreshold || 0),
        };
      });
  }, [profiles, stock]);

  const pickerList = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    let list = catalog;
    if (form.cropTarget) {
      /* Jo fasal chuni hai, us ka maal pehle — farmer isi ke liye aaya hai */
      const c = form.cropTarget.trim().toLowerCase();
      list = [...list].sort((a, b) => {
        const am = a.crops.some((x: string) => x.toLowerCase().includes(c)) ? 0 : 1;
        const bm = b.crops.some((x: string) => x.toLowerCase().includes(c)) ? 0 : 1;
        return am - bm;
      });
    }
    if (q) {
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q)
        || p.categoryName.toLowerCase().includes(q)
        || p.crops.some((c: string) => c.toLowerCase().includes(q)));
    }
    /* Jo bik nahi sakta wo aakhir me */
    return [...list].sort((a, b) => Number(a.blocked) - Number(b.blocked));
  }, [catalog, pickerSearch, form.cropTarget]);

  /* ── Hisab ── */
  const subtotal = items.reduce((s, it) => s + (it.quantity * it.pricePerUnit) - it.discount, 0);
  const total = Math.max(
    subtotal + Number(form.deliveryCharges || 0) + Number(form.taxAmount || 0)
    + Number(form.otherCharges || 0) - Number(form.bulkDiscount || 0),
    0,
  );

  /* Stock se zyada order — rukawat nahi, magar batana zaroori hai */
  const shortItems = useMemo(
    () => items.filter((it) => it.stock !== undefined && it.quantity > it.stock),
    [items],
  );

  /* Udhaar ki hadd — farmer ki limit is order ke baad tut to nahi rahi */
  const creditWarn = useMemo(() => {
    if (!form.isCredit || !farmer) return null;
    const limit = Number(farmer.creditLimit || 0);
    if (limit <= 0) return null;
    const already = Number(farmer.currentBalance || 0);
    const after = already + total;
    return after > limit
      ? { limit, already, after, over: after - limit }
      : null;
  }, [form.isCredit, farmer, total]);

  const acres = Number(form.landAreaAcres || 0);

  const addProduct = (p: any) => {
    if (p.blocked) { setBlocked(p); return; }
    if (p.restricted && !confirm(
      `⚠️ ${p.name} restricted hai.\n\nKharidne wale ka license dekh lein.\n\nAage barhein?`,
    )) return;

    /* Raqba likha ho aur miqdar bhari ho to tadaad khud bhar dete hain */
    const perAcre = perAcreFrom(p.rate);
    const qty = acres > 0 && perAcre ? Number((perAcre * acres).toFixed(2)) : 1;

    setItems((prev) => [...prev, {
      productId: p.productId,
      productName: p.name,
      category: p.kind,
      quantity: qty,
      unit: p.unit,
      pricePerUnit: p.price,
      discount: 0,
      packSize: p.packSize, packUnit: p.packUnit,
      stock: p.stock, kind: p.kind, rate: p.rate,
    }]);
    setShowPicker(false);
    setPickerSearch('');
    if (qty > 1) toast.success(`${p.name} — ${fmtQty(qty)} ${agriUnitLabel(p.unit)} (${acres} acre ke hisab se)`);
  };

  const addCustom = () => setItems((prev) => [...prev, {
    productName: '', quantity: 1, unit: 'bag', pricePerUnit: 0, discount: 0,
  }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, patch: Partial<OrderItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  /** Raqba badla to jin cheezon par miqdar likhi hai, un ki tadaad dobara */
  const recalcFromAcres = () => {
    if (acres <= 0) return toast.error('Pehle raqba likhein');
    let n = 0;
    setItems((prev) => prev.map((it) => {
      const perAcre = perAcreFrom(it.rate);
      if (!perAcre) return it;
      n += 1;
      return { ...it, quantity: Number((perAcre * acres).toFixed(2)) };
    }));
    if (n > 0) toast.success(`${n} cheezon ki tadaad ${acres} acre ke hisab se lag gayi`);
    else toast.error('Kisi cheez par "kitni miqdar" likhi hi nahi');
  };

  const errors: string[] = [];
  if (items.length === 0) errors.push('Kam az kam ek cheez daalein');
  if (!form.customerName.trim() && !form.farmerId) errors.push('Farmer chunein ya naam likhein');
  if (items.some((it) => !it.productName.trim())) errors.push('Har cheez ka naam likhein');
  if (items.some((it) => it.quantity <= 0)) errors.push('Tadaad 0 nahi ho sakti');
  if (items.some((it) => it.pricePerUnit <= 0)) errors.push('Har cheez ka rate likhein');
  if (form.isCredit && !form.farmerId) errors.push('Udhaar ke liye register shuda farmer chunna zaroori hai');
  const valid = errors.length === 0;

  const create = useMutation({
    mutationFn: () => bulkOrdersApi.create({
      /* Khali khane bhejna mana hai — season database me enum hai,
         khali string us me nahi jaati aur poora order ruk jata hai. */
      ...blankToUndefined(form),
      landAreaAcres: form.landAreaAcres ? Number(form.landAreaAcres) : null,
      deliveryCharges: Number(form.deliveryCharges) || 0,
      bulkDiscount: Number(form.bulkDiscount) || 0,
      taxAmount: Number(form.taxAmount) || 0,
      otherCharges: Number(form.otherCharges) || 0,
      /* Sirf wo khane jo API janti hai — baqi dikhane ke liye thay */
      items: items
        .filter((it) => it.productName.trim() && it.quantity > 0)
        .map((it) => ({
          productId: it.productId,
          productName: it.productName.trim(),
          category: it.category,
          quantity: Number(it.quantity),
          unit: it.unit,
          pricePerUnit: Number(it.pricePerUnit),
          discount: Number(it.discount) || 0,
          total: Number(it.quantity) * Number(it.pricePerUnit) - (Number(it.discount) || 0),
          batchNumber: it.batchNumber || undefined,
        })),
    }),
    onSuccess: (order: any) => {
      toast.success(`Order ${order.orderNumber} ban gaya`);
      navigate('/agri/bulk-orders');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Order nahi bana'),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (blocked) return setBlocked(null);
        if (showPicker) return setShowPicker(false);
        if (showTeacher) return setShowTeacher(false);
        return;
      }
      if (showPicker || blocked) return;
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'a') { e.preventDefault(); setShowPicker(true); }
      if (k === 'g') setShowTeacher(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showPicker, showTeacher, blocked]);

  useEffect(() => {
    if (showPicker) setTimeout(() => searchRef.current?.focus(), 80);
  }, [showPicker]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}
      {blocked && <BlockedModal p={blocked} onClose={() => setBlocked(null)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-lime-700 text-white p-5 sm:p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-lime-400/25 blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/agri/bulk-orders')}
              className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0 transition">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-0.5 text-[10px] font-black border border-white/25 uppercase tracking-widest">
                <Tractor className="h-2.5 w-2.5 text-lime-300" /> Bara order
              </div>
              <h1 className="mt-1 text-2xl font-black">📦 Naya Order</h1>
            </div>
          </div>
          <div className="flex gap-2 items-center shrink-0">
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!valid}
              className="bg-white text-emerald-700 hover:bg-emerald-50">
              <Save className="h-4 w-4" /> Order banayein
            </Button>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4 lg:gap-6">
        <div className="space-y-4">
          {/* ═══ FARMER ═══ */}
          <Card icon={User} title="Farmer">
            {farmer ? (
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Tractor className="h-5 w-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 dark:text-white truncate">{farmer.fullName}</div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                      {farmer.farmerNumber}{farmer.phone ? ` · ${farmer.phone}` : ''}
                      {farmer.village ? ` · ${farmer.village}` : ''}
                    </div>
                  </div>
                  <button onClick={() => {
                    setFarmer(null);
                    setForm({ ...form, farmerId: '', customerId: '', customerName: '', customerPhone: '' });
                  }} className="text-xs font-extrabold text-emerald-600 hover:underline shrink-0">Badlein</button>
                </div>
                {Number(farmer.currentBalance) > 0 && (
                  <div className="mt-2 rounded-xl bg-white dark:bg-slate-800 px-2.5 py-1.5 text-[11px] font-extrabold text-amber-700 dark:text-amber-400">
                    Purana udhaar {formatPKR(farmer.currentBalance)}
                    {Number(farmer.creditLimit) > 0 && ` · hadd ${formatPKR(farmer.creditLimit)}`}
                  </div>
                )}
                {!farmer.customerId && (
                  <div className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 px-2.5 py-1.5 text-[11px] font-bold text-amber-900 dark:text-amber-200">
                    Is farmer ka khata jura hua nahi — udhaar theek se darj nahi hoga.{' '}
                    <Link to="/agri/farmers" className="underline font-black">Farmers safhe se jorein</Link>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button onClick={() => setShowFarmerPicker((v) => !v)}
                  className="w-full h-12 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-extrabold text-slate-600 dark:text-slate-300 hover:border-emerald-400 inline-flex items-center justify-center gap-2 transition">
                  <Search className="h-4 w-4" /> Register shuda farmer dhoondein
                </button>
                {showFarmerPicker && (
                  <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/5 p-3 space-y-2">
                    <input autoFocus value={farmerSearch} onChange={(e) => setFarmerSearch(e.target.value)}
                      placeholder="Naam, phone, CNIC, gaon…" className={inp} />
                    <div className="max-h-52 overflow-y-auto space-y-1">
                      {farmers.length === 0 ? (
                        <p className="text-xs font-bold text-slate-400 text-center py-3">Koi farmer nahi mila</p>
                      ) : farmers.map((f: any) => (
                        <button key={f.id}
                          onClick={() => {
                            setFarmer(f);
                            setForm({
                              ...form, farmerId: f.id, customerId: f.customerId || '',
                              customerName: f.fullName, customerPhone: f.phone,
                              ...(f.landAreaAcres && !form.landAreaAcres ? { landAreaAcres: String(f.landAreaAcres) } : {}),
                            });
                            setShowFarmerPicker(false);
                          }}
                          className="w-full px-3 py-2 flex items-center gap-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-left transition">
                          <Tractor className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-extrabold text-slate-900 dark:text-white truncate">{f.fullName}</span>
                            <span className="block text-[10px] font-bold text-slate-500 truncate">
                              {f.farmerNumber} · {f.village || f.district || 'Gaon nahi'}
                              {f.landAreaAcres ? ` · ${f.landAreaAcres} acre` : ''}
                            </span>
                          </span>
                          {Number(f.currentBalance) > 0 && (
                            <span className="text-[10px] font-black text-amber-600 shrink-0">
                              {formatPKR(f.currentBalance)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Naam (agar register nahi)">
                    <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                      placeholder="Farmer ka naam" className={inp} />
                  </Field>
                  <Field label="Phone" opt>
                    <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                      placeholder="03XX-XXXXXXX" className={inp} />
                  </Field>
                </div>
              </>
            )}
          </Card>

          {/* ═══ FASAL AUR RAQBA ═══ */}
          <Card icon={Sprout} title="Fasal aur raqba" tone="lime">
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Mausam" opt>
                <select value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} className={inp}>
                  <option value="">— Chunein —</option>
                  {SEASONS.map((s) => <option key={s.v} value={s.v}>{s.e} {s.l}</option>)}
                </select>
              </Field>
              <Field label="Kis fasal ke liye" opt>
                <input value={form.cropTarget} onChange={(e) => setForm({ ...form, cropTarget: e.target.value })}
                  placeholder="Gandum" className={inp} />
              </Field>
              <Field label="Raqba (acre)" opt>
                <input type="number" step="0.1" min={0} value={form.landAreaAcres}
                  onChange={(e) => setForm({ ...form, landAreaAcres: e.target.value })}
                  placeholder="5" className={`${inp} tabular-nums`} />
              </Field>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {COMMON_CROPS.map((c) => (
                <button key={c} type="button"
                  onClick={() => setForm({ ...form, cropTarget: form.cropTarget === c ? '' : c })}
                  className={`h-9 px-3 rounded-xl border-2 text-xs font-extrabold transition ${
                    form.cropTarget === c
                      ? 'border-lime-500 bg-lime-50 dark:bg-lime-500/15 text-lime-700 dark:text-lime-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-lime-400'
                  }`}>🌾 {c}</button>
              ))}
            </div>

            {acres > 0 && (
              <div className="rounded-2xl bg-lime-50 dark:bg-lime-500/10 border-2 border-lime-200 dark:border-lime-500/30 p-3 flex items-center gap-3 flex-wrap">
                <Calculator className="h-4 w-4 text-lime-600 shrink-0" />
                <p className="flex-1 min-w-[200px] text-[12px] font-bold text-lime-900 dark:text-lime-200">
                  <strong>{acres} acre</strong> likha hua hai. Jin cheezon par "kitni miqdar per acre"
                  bhari hai, un ki tadaad khud lag sakti hai.
                </p>
                <button type="button" onClick={recalcFromAcres}
                  className="h-9 px-3 rounded-xl bg-lime-600 hover:bg-lime-700 text-white text-xs font-black shrink-0 transition">
                  Tadaad laga do
                </button>
              </div>
            )}
          </Card>

          {/* ═══ CHEEZEIN ═══ */}
          <Card icon={Package} title={`Cheezein (${items.length})`}
            action={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={addCustom}>
                  <Plus className="h-3.5 w-3.5" /> Apni
                </Button>
                <Button size="sm" onClick={() => setShowPicker(true)}
                  className="bg-gradient-to-r from-emerald-600 to-lime-700">
                  <Package className="h-3.5 w-3.5" /> Maal se <kbd className="hidden sm:inline text-[9px] opacity-70 ml-1">A</kbd>
                </Button>
              </div>
            }>
            {items.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
                <Package className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Abhi koi cheez nahi</p>
                <p className="text-xs font-bold text-slate-400 mt-1">
                  "Maal se" dabayein — stock, rate aur bori ka hisab khud aa jayega
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, i) => (
                  <ItemRow key={i} item={item} index={i}
                    onChange={(patch: Partial<OrderItem>) => updateItem(i, patch)}
                    onRemove={() => removeItem(i)} />
                ))}
              </div>
            )}

            {shortItems.length > 0 && (
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0 text-[12px] font-bold text-amber-900 dark:text-amber-200">
                  <strong>{shortItems.length} cheezein</strong> gudaam me itni nahi hain. Order to ban
                  jayega, magar delivery se pehle mangwani parengi:
                  <div className="mt-1 flex flex-wrap gap-1">
                    {shortItems.map((it, n) => (
                      <span key={n} className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[11px] font-extrabold">
                        {it.productName} — chahiye {fmtQty(it.quantity)}, hai {fmtQty(it.stock ?? 0)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* ═══ DELIVERY ═══ */}
          <Card icon={Truck} title="Pahunchana hai?">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isDelivery}
                onChange={(e) => setForm({ ...form, isDelivery: e.target.checked })}
                className="h-5 w-5 rounded accent-emerald-600" />
              <span className="flex-1">
                <span className="block text-sm font-extrabold text-slate-900 dark:text-white">Haan, khet tak pahunchana hai</span>
                <span className="block text-xs font-bold text-slate-500 dark:text-slate-400">Bori bhari hoti hai — aksar dukaan hi pahunchati hai</span>
              </span>
            </label>

            {form.isDelivery && (
              <div className="space-y-3 pl-8">
                <Field label="Pata">
                  <textarea rows={2} value={form.deliveryAddress}
                    onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                    placeholder="Gaon, nishani…" className={`${inp} h-auto py-2 resize-none`} />
                </Field>
                <div className="grid sm:grid-cols-3 gap-2">
                  <Field label="Kab">
                    <input type="datetime-local" value={form.deliveryDate}
                      onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} className={inp} />
                  </Field>
                  <Field label="Kis par">
                    <select value={form.transportType}
                      onChange={(e) => setForm({ ...form, transportType: e.target.value })} className={inp}>
                      <option value="">— Chunein —</option>
                      {TRANSPORT.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Gaari number" opt>
                    <input value={form.vehicleNumber}
                      onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                      placeholder="ABC-123" className={inp} />
                  </Field>
                </div>
                <Field label="Kiraya" opt>
                  <input type="number" min={0} value={form.deliveryCharges}
                    onChange={(e) => setForm({ ...form, deliveryCharges: e.target.value })}
                    placeholder="0" className={`${inp} tabular-nums`} />
                </Field>
              </div>
            )}
          </Card>

          {/* ═══ UDHAAR ═══ */}
          <Card icon={Wallet} title="Udhaar" tone="amber">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isCredit}
                onChange={(e) => setForm({ ...form, isCredit: e.target.checked })}
                className="h-5 w-5 rounded accent-amber-600" />
              <span className="flex-1">
                <span className="block text-sm font-extrabold text-amber-800 dark:text-amber-300">Udhaar par ja raha hai</span>
                <span className="block text-xs font-bold text-slate-500 dark:text-slate-400">Farmer katai ke baad dega</span>
              </span>
            </label>

            {form.isCredit && (
              <div className="pl-8 space-y-3">
                <Field label="Kab tak dega">
                  <input type="date" value={form.creditDueDate}
                    onChange={(e) => setForm({ ...form, creditDueDate: e.target.value })}
                    className="h-11 w-full rounded-xl border-2 border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition" />
                  <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Katai ki tareekh rakhein — usi waqt farmer ke paas paisa aata hai
                  </p>
                </Field>

                {!form.farmerId && (
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-2.5 text-[11px] font-bold text-rose-800 dark:text-rose-300">
                    Udhaar ke liye register shuda farmer chunna zaroori hai — warna baad me pata
                    nahi chalega ke kis se lena hai.
                  </div>
                )}

                {creditWarn && (
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-2.5 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300">
                      Udhaar ki hadd tut rahi hai: purana {formatPKR(creditWarn.already)} + ye order{' '}
                      {formatPKR(total)} = <strong>{formatPKR(creditWarn.after)}</strong>, hadd{' '}
                      {formatPKR(creditWarn.limit)} hai ({formatPKR(creditWarn.over)} zyada).
                      Order ban jayega — magar soch lein.
                    </span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* ═══ NOTE ═══ */}
          <Card icon={Wheat} title="Note" >
            <Field label="Aap ki raay — farmer ko kya batana hai" opt>
              <textarea rows={2} value={form.advisorNotes}
                onChange={(e) => setForm({ ...form, advisorNotes: e.target.value })}
                placeholder="Kitni miqdar, kab daalna hai…" className={`${inp} h-auto py-2 resize-none`} />
            </Field>
            <Field label="Farmer ne kya kaha" opt>
              <textarea rows={2} value={form.farmerNotes}
                onChange={(e) => setForm({ ...form, farmerNotes: e.target.value })}
                placeholder="Koi khaas farmaish…" className={`${inp} h-auto py-2 resize-none`} />
            </Field>
          </Card>
        </div>

        {/* ═══ SIDEBAR ═══ */}
        <aside className="space-y-4">
          <div className="lg:sticky lg:top-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-emerald-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase tracking-widest font-black text-white/70 mb-3">💰 Hisab</div>
              <div className="space-y-1.5 text-sm">
                <Line label="Cheezein" value={String(items.length)} />
                <Line label="Bina kiraye" value={formatPKR(subtotal)} />
                {form.isDelivery && Number(form.deliveryCharges) > 0 && (
                  <Line label="Kiraya" value={`+${formatPKR(Number(form.deliveryCharges))}`} tone="sky" />
                )}
                {Number(form.taxAmount) > 0 && <Line label="Tax" value={`+${formatPKR(Number(form.taxAmount))}`} />}
                {Number(form.otherCharges) > 0 && <Line label="Doosra kharch" value={`+${formatPKR(Number(form.otherCharges))}`} />}
                {Number(form.bulkDiscount) > 0 && (
                  <Line label="Thok chhoot" value={`−${formatPKR(Number(form.bulkDiscount))}`} tone="amber" />
                )}
              </div>

              <div className="mt-3 space-y-2">
                <MiniField label="Thok chhoot" value={form.bulkDiscount}
                  onChange={(v: string) => setForm({ ...form, bulkDiscount: v })} />
                <MiniField label="Tax" value={form.taxAmount}
                  onChange={(v: string) => setForm({ ...form, taxAmount: v })} />
                <MiniField label="Doosra kharch" value={form.otherCharges}
                  onChange={(v: string) => setForm({ ...form, otherCharges: v })} />
              </div>

              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center gap-2">
                <span className="text-sm font-black text-emerald-300">KUL</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-300 tabular-nums">{formatPKR(total)}</span>
              </div>

              {form.isCredit && total > 0 && (
                <div className="mt-2 rounded-xl bg-amber-400/20 border border-amber-300/40 px-2.5 py-1.5 text-[11px] font-black text-amber-200">
                  Poora {formatPKR(total)} udhaar jayega
                </div>
              )}
            </div>

            {!valid && (
              <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3">
                <div className="text-[11px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-300 mb-1">
                  Ye reh gaya hai
                </div>
                <ul className="space-y-0.5">
                  {errors.map((e) => (
                    <li key={e} className="text-[12px] font-bold text-rose-800 dark:text-rose-300">• {e}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!valid}
              size="lg" className="w-full bg-gradient-to-r from-emerald-600 to-lime-700">
              <Save className="h-5 w-5" /> Order banayein
            </Button>
          </div>
        </aside>
      </div>

      {/* ═══ MAAL CHUNEIN ═══ */}
      {showPicker && (
        <PickerModal list={pickerList} search={pickerSearch} setSearch={setPickerSearch}
          searchRef={searchRef} acres={acres} crop={form.cropTarget}
          onPick={addProduct} onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
}

/* ════════════════ CHHOTE HISSE ════════════════ */

const inp = 'h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition';

const TONES: Record<string, string> = {
  emerald: 'from-emerald-600 to-lime-700',
  lime: 'from-lime-600 to-emerald-700',
  amber: 'from-amber-500 to-orange-600',
};

function Card({ icon: Icon, title, action, tone = 'emerald', children }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <header className="px-4 sm:px-5 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-8 w-8 rounded-xl bg-gradient-to-br ${TONES[tone]} text-white flex items-center justify-center shrink-0`}>
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-black text-slate-900 dark:text-white truncate">{title}</h2>
        </div>
        {action}
      </header>
      <div className="p-4 sm:p-5 space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, opt, children }: any) {
  return (
    <label className="block">
      <span className="block mb-1 text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label} {opt && <span className="text-slate-400 normal-case font-bold">(marzi)</span>}
      </span>
      {children}
    </label>
  );
}

function Line({ label, value, tone }: any) {
  const c = tone === 'amber' ? 'text-amber-300' : tone === 'sky' ? 'text-sky-300' : 'text-white';
  return (
    <div className="flex justify-between gap-2">
      <span className="text-white/70 font-bold">{label}</span>
      <span className={`font-black tabular-nums ${c}`}>{value}</span>
    </div>
  );
}

function MiniField({ label, value, onChange }: any) {
  return (
    <label className="flex items-center gap-2">
      <span className="flex-1 text-[11px] font-bold text-white/70">{label}</span>
      <input type="number" min={0} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="h-8 w-24 rounded-lg bg-white/10 border border-white/20 px-2 text-right text-xs font-black text-white tabular-nums placeholder:text-white/40 focus:outline-none focus:border-emerald-400 transition" />
    </label>
  );
}

/* ── Ek cheez ki line ──
   Bori aur kilo dono ek sath — dukaan-daar bori ginta hai,
   farmer kilo me sochta hai. */
function ItemRow({ item, index, onChange, onRemove }: any) {
  const line = Math.max(item.quantity * item.pricePerUnit - (item.discount || 0), 0);
  const packSize = Number(item.packSize || 0);
  const totalLoose = packSize > 0 ? item.quantity * packSize : 0;
  const short = item.stock !== undefined && item.quantity > item.stock;
  const perAcre = perAcreFrom(item.rate);

  return (
    <div className={`rounded-2xl border-2 p-3 space-y-2.5 transition ${
      short
        ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-500/5'
        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
    }`}>
      <div className="flex items-center gap-2">
        <span className="h-7 w-7 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        {item.productId ? (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {item.kind ? `${AGRI_KIND_EMOJI[item.kind as AgriKind]} ` : ''}{item.productName}
            </div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
              {item.kind ? prettyAgriKind(item.kind as AgriKind) : ''}
              {item.stock !== undefined && ` · gudaam me ${fmtQty(item.stock)} ${agriUnitLabel(item.unit)}`}
            </div>
          </div>
        ) : (
          <input value={item.productName} onChange={(e) => onChange({ productName: e.target.value })}
            placeholder="Cheez ka naam" className="flex-1 min-w-0 h-9 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition" />
        )}
        <button onClick={onRemove} title="Hata dein"
          className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-500/20 flex items-center justify-center shrink-0 transition">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <span className="block mb-0.5 text-[9px] font-black uppercase text-slate-400">Tadaad</span>
          <div className="flex items-center rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <button onClick={() => onChange({ quantity: Math.max(0.5, item.quantity - 1) })}
              className="h-9 w-8 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center shrink-0 transition">
              <Minus className="h-3 w-3 text-slate-500" />
            </button>
            <input type="number" step="0.5" min={0} value={item.quantity}
              onChange={(e) => onChange({ quantity: Number(e.target.value) })}
              className="h-9 w-full min-w-0 text-center text-sm font-black text-slate-900 dark:text-white bg-transparent tabular-nums focus:outline-none" />
            <button onClick={() => onChange({ quantity: item.quantity + 1 })}
              className="h-9 w-8 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center shrink-0 transition">
              <Plus className="h-3 w-3 text-slate-500" />
            </button>
          </div>
        </div>
        <div>
          <span className="block mb-0.5 text-[9px] font-black uppercase text-slate-400">Kis hisab se</span>
          {item.productId ? (
            <div className="h-9 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 flex items-center text-xs font-black text-slate-600 dark:text-slate-300 truncate">
              {agriUnitLabel(item.unit)}
            </div>
          ) : (
            <input value={item.unit} onChange={(e) => onChange({ unit: e.target.value })}
              placeholder="bori"
              className="h-9 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition" />
          )}
        </div>
        <div>
          <span className="block mb-0.5 text-[9px] font-black uppercase text-slate-400">Rate</span>
          <input type="number" min={0} value={item.pricePerUnit}
            onChange={(e) => onChange({ pricePerUnit: Number(e.target.value) })}
            className="h-9 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-sm font-black text-slate-900 dark:text-white tabular-nums focus:outline-none focus:border-emerald-500 transition" />
        </div>
        <div>
          <span className="block mb-0.5 text-[9px] font-black uppercase text-slate-400">Chhoot</span>
          <input type="number" min={0} value={item.discount}
            onChange={(e) => onChange({ discount: Number(e.target.value) })}
            className="h-9 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-sm font-black text-amber-600 tabular-nums focus:outline-none focus:border-amber-500 transition" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {packSize > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-500/15 text-[10px] font-black text-sky-700 dark:text-sky-300">
              <Scale className="h-2.5 w-2.5" />
              1 {agriUnitLabel(item.unit)} = {packSize} {item.packUnit} · kul {fmtQty(totalLoose)} {item.packUnit}
            </span>
          )}
          {perAcre && (
            <span className="px-2 py-0.5 rounded-md bg-lime-100 dark:bg-lime-500/15 text-[10px] font-black text-lime-700 dark:text-lime-300">
              📐 {item.rate}
            </span>
          )}
          {short && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/15 text-[10px] font-black text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-2.5 w-2.5" /> Stock kam — mangwana parega
            </span>
          )}
        </div>
        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
          {formatPKR(line)}
        </span>
      </div>
    </div>
  );
}

/* ── Maal chunne ka safha ── */
function PickerModal({ list, search, setSearch, searchRef, acres, crop, onPick, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-3xl max-h-[90vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        <header className="p-4 bg-gradient-to-r from-emerald-600 to-lime-700 text-white shrink-0">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-base font-black inline-flex items-center gap-2">
              <Package className="h-5 w-5" /> Apna maal chunein
            </h3>
            <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Naam, category ya fasal se dhoondein…"
              className="h-11 w-full rounded-xl bg-white/15 border-2 border-white/25 pl-10 pr-3 text-sm font-bold text-white placeholder:text-white/50 focus:outline-none focus:border-white/60 transition" />
          </div>
          {(crop || acres > 0) && (
            <p className="mt-2 text-[11px] font-bold text-white/80">
              {crop && <>🌾 <strong>{crop}</strong> ka maal upar hai. </>}
              {acres > 0 && <>📐 {acres} acre ke hisab se tadaad khud bharegi.</>}
            </p>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {list.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-extrabold text-slate-500">Kuch nahi mila</p>
            </div>
          ) : list.map((p: any) => (
            <button key={p.productId} onClick={() => onPick(p)}
              className={`w-full p-3 rounded-2xl border-2 flex items-center gap-3 text-left transition ${
                p.blocked
                  ? 'border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/5 opacity-75'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5'
              }`}>
              <span className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg shrink-0">
                {AGRI_KIND_EMOJI[p.kind as AgriKind]}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-extrabold text-slate-900 dark:text-white truncate">{p.name}</span>
                <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                  {p.categoryName || prettyAgriKind(p.kind)}
                  {p.packSize > 0 && ` · 1 ${agriUnitLabel(p.unit)} = ${p.packSize} ${p.packUnit}`}
                  {p.crops.length > 0 && ` · ${p.crops.slice(0, 3).join(', ')}`}
                </span>
                <span className="mt-1 flex flex-wrap gap-1">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                    p.stock <= 0 ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    Stock {fmtQty(p.stock)}
                  </span>
                  {p.blocked && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black">
                      🚫 Registration khatam
                    </span>
                  )}
                  {p.certSoon && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[9px] font-black">
                      ⏳ {p.cert.days} din
                    </span>
                  )}
                  {p.restricted && (
                    <span className="px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 text-[9px] font-black">
                      🪪 License
                    </span>
                  )}
                  {p.rate && (
                    <span className="px-1.5 py-0.5 rounded bg-lime-100 dark:bg-lime-500/15 text-lime-700 dark:text-lime-300 text-[9px] font-black">
                      📐 {p.rate}
                    </span>
                  )}
                </span>
              </span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                {formatPKR(p.price)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Jo bik hi nahi sakta ── */
function BlockedModal({ p, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="p-5 bg-gradient-to-br from-rose-600 to-red-700 text-white text-center">
          <ShieldAlert className="h-12 w-12 mx-auto mb-2" />
          <h3 className="text-lg font-black">Ye cheez nahi bik sakti</h3>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm font-extrabold text-slate-900 dark:text-white text-center">{p.name}</p>
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3">
            <p className="text-[12px] font-bold text-rose-800 dark:text-rose-300">{p.cert.text}</p>
          </div>
          <p className="text-[12px] font-bold text-slate-600 dark:text-slate-400">
            {p.kind === 'FERTILIZER' || String(p.kind).includes('SEED')
              ? 'Seed Act ke tehat meyaad khatam hone ke baad bechna ghair-qanooni hai.'
              : 'Agricultural Pesticides Ordinance ke tehat meyaad khatam hone ke baad bechna ghair-qanooni hai.'}
            {' '}Pehle registration renew karwayein.
          </p>
          <div className="flex gap-2">
            <Link to={`/agri-products/${p.productId}`}
              className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black inline-flex items-center justify-center gap-1.5 transition">
              <CheckCircle2 className="h-4 w-4" /> Renew karein
            </Link>
            <button onClick={onClose}
              className="h-11 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-black transition">
              Theek hai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sikhein ── */
function Teacher({ onClose }: any) {
  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[88vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        <header className="p-5 bg-gradient-to-br from-amber-500 to-orange-600 text-white shrink-0 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black inline-flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> Bara order kaise banta hai
            </h3>
            <p className="text-xs font-bold text-white/80 mt-0.5">Ek baar parh lein, phir aasan hai</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {[
            { i: User, t: 'Pehle farmer chunein', d: 'Register shuda farmer chunenge to uska purana udhaar, gaon aur raqba khud aa jayega. Udhaar par order sirf register shuda farmer ka ban sakta hai — warna baad me pata nahi chalega ke kis se lena hai.' },
            { i: MapPin, t: 'Raqba likhein', d: 'Farmer ka raqba (acre) likh dein. Jin cheezon par "kitni miqdar per acre" bhari hai, un ki tadaad khud lag jayegi — "Tadaad laga do" dabane se.' },
            { i: Package, t: 'Maal daalein', d: 'Apne stock se chunein — rate, stock aur bori ka hisab khud aa jayega. Jo cheez list me nahi, uske liye "Apni" dabayein.' },
            { i: Scale, t: 'Bori aur kilo', d: 'Har line ke neeche neela khana dekhein: 1 bori = 50 kg · kul 250 kg. Aap bori ginte hain, farmer kilo samajhta hai — dono saath dikhte hain.' },
            { i: ShieldAlert, t: 'Registration', d: 'Jis beej ya dawa ki registration khatam ho gayi, wo order me daali hi nahi ja sakti. Pehle renew karwayein. Jis par "License" likha hai, kharidne wale ka license dekh lein.' },
            { i: Layers, t: 'Stock kam ho to', d: 'Peela nishan lagta hai ke gudaam me itna maal nahi. Order phir bhi ban jayega — bas delivery se pehle mangwa lein.' },
            { i: Truck, t: 'Delivery', d: 'Bori bhari hoti hai, aksar dukaan hi khet tak pahunchati hai. Gaari aur kiraya likh dein taake baad me jhagra na ho.' },
            { i: Calendar, t: 'Udhaar ki tareekh', d: 'Katai ki tareekh rakhein — usi waqt farmer ke paas paisa aata hai. Agar udhaar ki hadd tut rahi ho to laal nishan aa jayega.' },
          ].map((s, n) => (
            <div key={n} className="flex gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-lime-700 text-white flex items-center justify-center shrink-0">
                <s.i className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white">{s.t}</p>
                <p className="text-[12px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">{s.d}</p>
              </div>
            </div>
          ))}
          <div className="rounded-2xl bg-slate-900 dark:bg-slate-800 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Tez tareeqa</p>
            <div className="flex flex-wrap gap-2">
              {[['A', 'Maal chunein'], ['G', 'Ye safha'], ['Esc', 'Band karein']].map(([k, l]) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/80">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/15 font-black">{k}</kbd> {l}
                </span>
              ))}
            </div>
          </div>
        </div>
        <footer className="p-4 border-t-2 border-slate-100 dark:border-slate-800 shrink-0">
          <Button onClick={onClose} className="w-full bg-gradient-to-r from-emerald-600 to-lime-700">
            Samajh gaya
          </Button>
        </footer>
      </div>
    </div>
  );
}
