import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck, Save, X, ArrowLeft, Building2, Phone, Mail, MapPin, CreditCard,
  FileText, User, AlertTriangle, CheckCircle2, Loader2, GraduationCap,
  Keyboard, BookOpen, Wallet, MessageCircle, Sparkles, Landmark,
  Hash, Copy, Plus, Package, TrendingUp, Clock, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { suppliersApi, type UpsertSupplierPayload } from '../api/suppliers.api';
import { supplierLedgerApi } from '../api/supplier-ledger.api';
import {
  SUPPLIER_GRADIENT, Panel, Teacher, Shortcuts, Kbd, inputCls,
  fmtDate, initials, daysPhrase, waNumber,
} from '../components/SuppliersKit';

/* ═════════════════════════════════════════════════════════════
   SUPPLIER FORM — banane aur badalne ka safha
   ─────────────────────────────────────────────────────────────
   Form lamba hai magar sirf EK khana lazmi hai: naam. Baqi sab
   apni marzi se — mandi me aksar phone ke ilawa kuch pata hi
   nahi hota, aur adhoori tafseel ki wajah se supplier na banna
   asli nuqsan hai.

   Nayi cheez: "purana hisab". System se pehle jo copy par chalta
   tha wo yahin darj ho jata hai, taake khata pehle din se sahi
   ho — baad me koi yaad nahi rakhta.
   ═════════════════════════════════════════════════════════════ */

const PAYMENT_TERMS = ['Cash on delivery', '7 din', '15 din', '30 din', '45 din', '60 din', 'Mahine ke aakhir'];

const CITIES = [
  'Karachi', 'Lahore', 'Faisalabad', 'Rawalpindi', 'Gujranwala', 'Peshawar',
  'Multan', 'Hyderabad', 'Islamabad', 'Quetta', 'Sialkot', 'Sargodha',
  'Bahawalpur', 'Sukkur', 'Larkana', 'Sheikhupura', 'Rahim Yar Khan', 'Jhang',
  'Mardan', 'Gujrat', 'Kasur', 'Dera Ghazi Khan', 'Sahiwal', 'Nawabshah',
  'Okara', 'Mirpur Khas', 'Chiniot', 'Kamoke', 'Mandi Bahauddin', 'Abbottabad',
];

const BANKS = [
  'HBL', 'UBL', 'MCB', 'Allied Bank', 'Meezan Bank', 'Bank Alfalah',
  'Faysal Bank', 'Askari Bank', 'Bank of Punjab', 'National Bank',
  'Standard Chartered', 'Soneri Bank', 'JS Bank', 'Summit Bank', 'Silk Bank',
  'Habib Metro', 'Al Baraka', 'Dubai Islamic', 'BankIslami', 'Easypaisa', 'JazzCash',
];

/** 0300-1234567 — jaisa Pakistan me likha jata hai */
function formatPhoneInput(raw: string) {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('92')) d = '0' + d.slice(2);
  if (d.length > 11) d = d.slice(0, 11);
  if (d.length > 4) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return d;
}

type Form = UpsertSupplierPayload & { isActive: boolean };

const EMPTY: Form = {
  name: '', contactPerson: '', phone: '', altPhone: '', email: '', cnic: '', ntn: '',
  address: '', city: '', area: '', logoUrl: '', bankName: '', accountNumber: '',
  iban: '', paymentTerms: '', notes: '', isActive: true,
};

export default function SupplierFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const nameRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Form>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [showTeacher, setShowTeacher] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [saveAndNew, setSaveAndNew] = useState(false);
  /** Sirf naye supplier ke liye — purana hisab */
  const [opening, setOpening] = useState('');
  const [openingNote, setOpeningNote] = useState('');

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  /* ─── Edit mode: purana data ─── */
  const { data: existing, isLoading } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => suppliersApi.getOne(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      name: existing.name ?? '',
      contactPerson: existing.contactPerson ?? '',
      phone: existing.phone ?? '',
      altPhone: existing.altPhone ?? '',
      email: existing.email ?? '',
      cnic: existing.cnic ?? '',
      ntn: existing.ntn ?? '',
      address: existing.address ?? '',
      city: existing.city ?? '',
      area: existing.area ?? '',
      logoUrl: existing.logoUrl ?? '',
      bankName: existing.bankName ?? '',
      accountNumber: existing.accountNumber ?? '',
      iban: existing.iban ?? '',
      paymentTerms: existing.paymentTerms ?? '',
      notes: existing.notes ?? '',
      isActive: existing.isActive ?? true,
    });
    setDirty(false);
  }, [existing]);

  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 120); }, []);

  /* ─── Adhoora kaam zaya na ho ─── */
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  /* ─── Doosre suppliers — naam ki takrar pakadne ke liye ─── */
  const { data: allPage } = useQuery({
    queryKey: ['suppliers', 'all-names'],
    queryFn: () => suppliersApi.list({ limit: 500 }),
  });
  const others = useMemo(
    () => (allPage?.items ?? []).filter((s) => s.id !== id),
    [allPage, id],
  );

  const duplicate = useMemo(() => {
    const n = form.name?.trim().toLowerCase();
    if (!n || n.length < 3) return null;
    return others.find((s) => s.name.trim().toLowerCase() === n) ?? null;
  }, [form.name, others]);

  const phoneDuplicate = useMemo(() => {
    const p = (form.phone ?? '').replace(/\D/g, '');
    if (p.length < 10) return null;
    return others.find((s) => (s.phone ?? '').replace(/\D/g, '') === p) ?? null;
  }, [form.phone, others]);

  /* ─── Kitna poora bhara hai ─── */
  const completeness = useMemo(() => {
    const fields: Array<keyof Form> = ['name', 'contactPerson', 'phone', 'email', 'city', 'address', 'ntn', 'bankName', 'accountNumber', 'paymentTerms'];
    const filled = fields.filter((f) => String(form[f] ?? '').trim()).length;
    return Math.round((filled / fields.length) * 100);
  }, [form]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.name?.trim()) e.name = 'Naam to likhna hoga';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Email theek nahi lag raha';
    if (form.cnic && form.cnic.replace(/\D/g, '').length !== 13) e.cnic = 'CNIC 13 hindson ka hota hai';
    if (form.ntn && form.ntn.replace(/\D/g, '').length < 7) e.ntn = 'NTN chhota lag raha hai';
    const p = (form.phone ?? '').replace(/\D/g, '');
    if (p && (p.length < 10 || p.length > 11)) e.phone = 'Phone number poora nahi';
    if (opening && Number(opening) < 0) e.opening = 'Minus nahi ho sakta';
    return e;
  }, [form, opening]);

  const valid = Object.keys(errors).length === 0;

  /* ─── Save ─── */
  const mut = useMutation({
    mutationFn: async () => {
      const clean = (v?: string | null) => {
        const t = (v ?? '').trim();
        return t ? t : undefined;
      };
      const payload: any = {
        name: form.name.trim(),
        contactPerson: clean(form.contactPerson),
        phone: clean(form.phone),
        altPhone: clean(form.altPhone),
        email: clean(form.email),
        cnic: clean(form.cnic),
        ntn: clean(form.ntn),
        address: clean(form.address),
        city: clean(form.city),
        area: clean(form.area),
        logoUrl: clean(form.logoUrl),
        bankName: clean(form.bankName),
        accountNumber: clean(form.accountNumber),
        iban: clean(form.iban),
        paymentTerms: clean(form.paymentTerms),
        notes: clean(form.notes),
        isActive: form.isActive,
      };

      const saved = isEdit
        ? await suppliersApi.update(id!, payload)
        : await suppliersApi.create(payload);

      // Purana hisab sirf naye supplier par — mojooda ka khata
      // detail page se badalna chahiye, warna chupke se balance
      // badal jaye aur kisi ko pata na chale.
      const open = Number(opening) || 0;
      if (!isEdit && open > 0) {
        await supplierLedgerApi.setOpeningBalance(saved.id, {
          amount: open,
          note: openingNote.trim() || 'Purana hisab — khata shuru hone se pehle ka baqi',
        });
      }
      return saved;
    },
    onSuccess: (saved) => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['suppliers-summary'] });
      qc.invalidateQueries({ queryKey: ['supplier', id] });
      toast.success(isEdit ? 'Supplier update ho gaya ✓' : `"${saved.name}" ban gaya ✓`);

      if (saveAndNew && !isEdit) {
        setForm(EMPTY);
        setOpening('');
        setOpeningNote('');
        setTouched(new Set());
        setSaveAndNew(false);
        nameRef.current?.focus();
        return;
      }
      navigate(isEdit ? `/suppliers/${id}` : `/suppliers/${saved.id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save nahi hua'),
  });

  const submit = (andNew = false) => {
    setTouched(new Set(Object.keys(errors)));
    if (!valid) {
      toast.error(errors.name ?? 'Kuch khane theek karne hain');
      return;
    }
    setSaveAndNew(andNew);
    mut.mutate();
  };

  /* ─── Keyboard ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); submit(false); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submit(!isEdit); }
      if (e.key === 'Escape') {
        if (showTeacher) return setShowTeacher(false);
        if (showKeys) return setShowKeys(false);
      }
      const el = e.target as HTMLElement;
      const typing = /input|textarea|select/i.test(el?.tagName ?? '') || el?.isContentEditable;
      if (typing) return;
      if (e.key === '?') setShowKeys(true);
      if (e.key.toLowerCase() === 't') setShowTeacher(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const wa = waNumber(form.phone);
  const stats = existing?.stats;

  if (isEdit && isLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="h-7 w-7 animate-spin mx-auto text-teal-600 mb-3" />
        <p className="text-sm font-bold text-slate-500">Supplier aa raha hai…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-32">
      {/* ─────── HERO ─────── */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${SUPPLIER_GRADIENT} text-white p-5 sm:p-7`}>
        <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Link to="/suppliers" className="inline-flex items-center gap-1.5 text-xs font-extrabold text-white/80 hover:text-white transition">
              <ArrowLeft className="h-3.5 w-3.5" /> Suppliers
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black mt-2 flex items-center gap-2">
              {isEdit ? '✏️' : '🚚'} {isEdit ? (form.name || 'Supplier badlein') : 'Naya Supplier'}
            </h1>
            <p className="text-sm font-bold text-white/85 mt-1">
              {isEdit
                ? 'Tafseel badlein — khata alag safhe se chalta hai'
                : 'Sirf naam lazmi hai — baqi jab pata chale tab bhar dein'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTeacher(true)} title="Sikhein (T)"
              className="h-11 px-3.5 rounded-2xl bg-white/20 hover:bg-white/30 text-sm font-extrabold inline-flex items-center gap-1.5 transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <button onClick={() => setShowKeys(true)} title="Shortcuts (?)"
              className="h-11 w-11 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
              <Keyboard className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* completeness */}
        <div className="relative mt-4">
          <div className="flex items-center justify-between text-[11px] font-extrabold text-white/80 mb-1">
            <span>Tafseel kitni poori hai</span>
            <span className="tabular-nums">{completeness}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-white transition-all duration-500"
              style={{ width: `${completeness}%` }} />
          </div>
        </div>
      </div>

      {/* ─────── EDIT MODE: LIVE STATS ─────── */}
      {isEdit && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            { icon: Package, label: 'Kul bill', value: stats.totalPurchases, sub: `Ausat ${formatPKR(stats.averagePurchase)}`, tone: 'from-blue-500 to-indigo-700' },
            { icon: TrendingUp, label: 'Kul kharidari', value: formatPKR(stats.totalAmount), sub: `${formatPKR(stats.totalPaid)} diya`, tone: 'from-teal-500 to-emerald-700' },
            { icon: Wallet, label: 'Hamara baqi', value: formatPKR(Number(existing?.outstandingDue ?? 0)), sub: existing?.ledger?.daysSincePayment !== null && existing?.ledger?.daysSincePayment !== undefined ? `Adaigi ${daysPhrase(existing.ledger.daysSincePayment)}` : 'Kabhi adaigi nahi', tone: 'from-rose-500 to-red-700' },
            { icon: Clock, label: 'Aakhri maal', value: stats.lastPurchaseDate ? fmtDate(stats.lastPurchaseDate) : '—', sub: daysPhrase(stats.daysSinceLastPurchase), tone: 'from-violet-500 to-purple-700' },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl bg-[#ffffff] dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-3">
              <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${k.tone} text-white flex items-center justify-center shadow`}>
                <k.icon className="h-4 w-4" />
              </div>
              <div className="mt-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{k.label}</div>
              <div className="text-base font-black text-slate-900 dark:text-white tabular-nums truncate">{k.value}</div>
              <div className="text-[11px] font-bold text-slate-400 truncate">{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid xl:grid-cols-[1fr_360px] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          {/* ─────── 1. BUNYADI ─────── */}
          <Panel icon={Truck} title="Supplier Kaun Hai" desc="Naam ke ilawa sab apni marzi se" tone="teal">
            <div className="space-y-3">
              <div>
                <Lbl req>Supplier ka naam</Lbl>
                <input ref={nameRef} value={form.name} maxLength={150}
                  onChange={(e) => set('name', e.target.value)}
                  onBlur={() => setTouched((t) => new Set(t).add('name'))}
                  placeholder="Akbari Mandi Wholesale"
                  className={`${inputCls} h-12 text-base ${touched.has('name') && errors.name ? 'border-rose-400' : ''}`} />
                {touched.has('name') && errors.name && <Err>{errors.name}</Err>}
                {duplicate && (
                  <div className="mt-1.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-2.5 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                      Isi naam ka supplier pehle se mojood hai.{' '}
                      <Link to={`/suppliers/${duplicate.id}`} className="underline">Dekhein</Link>
                      {' '}— warna khata do jagah bat jayega.
                    </div>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Lbl hint="jis se baat hoti hai">Banda</Lbl>
                  <input value={form.contactPerson ?? ''} onChange={(e) => set('contactPerson', e.target.value)}
                    placeholder="Asif sb" className={inputCls} />
                </div>
                <div>
                  <Lbl hint="udhaar ki muddat">Payment terms</Lbl>
                  <input value={form.paymentTerms ?? ''} onChange={(e) => set('paymentTerms', e.target.value)}
                    list="pay-terms" placeholder="30 din" className={inputCls} />
                  <datalist id="pay-terms">{PAYMENT_TERMS.map((t) => <option key={t} value={t} />)}</datalist>
                  <div className="flex gap-1.5 flex-wrap mt-1.5">
                    {PAYMENT_TERMS.slice(0, 5).map((t) => (
                      <button key={t} type="button" onClick={() => set('paymentTerms', t)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border-2 transition ${
                          form.paymentTerms === t
                            ? 'bg-teal-600 border-teal-600 text-white'
                            : 'bg-[#ffffff] dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>{t}</button>
                    ))}
                  </div>
                </div>
              </div>

              {isEdit && (
                <label className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-3 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)}
                    className="h-5 w-5 rounded accent-teal-600" />
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {form.isActive ? 'Chalu hai' : 'Band hai'}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      Band supplier naye bill ki list me nazar nahi aayega — purana record mehfooz rahega.
                    </div>
                  </div>
                </label>
              )}
            </div>
          </Panel>

          {/* ─────── 2. RABTA ─────── */}
          <Panel icon={Phone} title="Rabta" desc="Phone, WhatsApp aur email" tone="blue">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl hint="WhatsApp isi par">Phone</Lbl>
                <input value={form.phone ?? ''} inputMode="tel"
                  onChange={(e) => set('phone', formatPhoneInput(e.target.value))}
                  onBlur={() => setTouched((t) => new Set(t).add('phone'))}
                  placeholder="0300-1234567" className={`${inputCls} font-mono ${touched.has('phone') && errors.phone ? 'border-rose-400' : ''}`} />
                {touched.has('phone') && errors.phone && <Err>{errors.phone}</Err>}
                {phoneDuplicate && (
                  <div className="mt-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    ⚠️ Yehi number <Link to={`/suppliers/${phoneDuplicate.id}`} className="underline">{phoneDuplicate.name}</Link> ka bhi hai
                  </div>
                )}
                {wa && (
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 hover:underline">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp: +{wa}
                  </a>
                )}
              </div>
              <div>
                <Lbl hint="landline ya doosra">Doosra phone</Lbl>
                <input value={form.altPhone ?? ''} inputMode="tel"
                  onChange={(e) => set('altPhone', formatPhoneInput(e.target.value))}
                  placeholder="042-35xxxxxx" className={`${inputCls} font-mono`} />
              </div>
              <div className="sm:col-span-2">
                <Lbl hint="bill/quotation ke liye">Email</Lbl>
                <input value={form.email ?? ''} type="email"
                  onChange={(e) => set('email', e.target.value)}
                  onBlur={() => setTouched((t) => new Set(t).add('email'))}
                  placeholder="sales@company.pk"
                  className={`${inputCls} ${touched.has('email') && errors.email ? 'border-rose-400' : ''}`} />
                {touched.has('email') && errors.email && <Err>{errors.email}</Err>}
              </div>
            </div>
          </Panel>

          {/* ─────── 3. PATA ─────── */}
          <Panel icon={MapPin} title="Pata" desc="Kahan se maal aata hai" tone="violet">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl>Sheher</Lbl>
                <input value={form.city ?? ''} onChange={(e) => set('city', e.target.value)}
                  list="cities" placeholder="Lahore" className={inputCls} />
                <datalist id="cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <Lbl hint="mandi, bazaar">Ilaqa</Lbl>
                <input value={form.area ?? ''} onChange={(e) => set('area', e.target.value)}
                  placeholder="Akbari Mandi" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <Lbl hint="poora pata">Address</Lbl>
                <textarea value={form.address ?? ''} onChange={(e) => set('address', e.target.value)}
                  rows={2} placeholder="Shop 12, Block B, Akbari Mandi, Lahore"
                  className={`${inputCls} h-auto py-2.5 resize-none`} />
              </div>
            </div>
          </Panel>

          {/* ─────── 4. KAGHAZAT ─────── */}
          <Panel icon={FileText} title="Kaghazat" desc="Tax aur shanakht — sirf agar chahiye" tone="amber">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl hint="sales tax ke liye">NTN</Lbl>
                <input value={form.ntn ?? ''} onChange={(e) => set('ntn', e.target.value)}
                  onBlur={() => setTouched((t) => new Set(t).add('ntn'))}
                  placeholder="1234567-8" className={`${inputCls} font-mono ${touched.has('ntn') && errors.ntn ? 'border-rose-400' : ''}`} />
                {touched.has('ntn') && errors.ntn && <Err>{errors.ntn}</Err>}
              </div>
              <div>
                <Lbl hint="malik ka">CNIC</Lbl>
                <input value={form.cnic ?? ''} onChange={(e) => set('cnic', e.target.value)}
                  onBlur={() => setTouched((t) => new Set(t).add('cnic'))}
                  placeholder="35202-1234567-1" className={`${inputCls} font-mono ${touched.has('cnic') && errors.cnic ? 'border-rose-400' : ''}`} />
                {touched.has('cnic') && errors.cnic && <Err>{errors.cnic}</Err>}
              </div>
            </div>
          </Panel>

          {/* ─────── 5. BANK ─────── */}
          <Panel icon={Landmark} title="Bank ki Tafseel" desc="Adaigi bhejne ke liye — yahan likh lein taake har baar poochna na pare" tone="emerald">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl>Bank</Lbl>
                <input value={form.bankName ?? ''} onChange={(e) => set('bankName', e.target.value)}
                  list="banks" placeholder="Meezan Bank" className={inputCls} />
                <datalist id="banks">{BANKS.map((b) => <option key={b} value={b} />)}</datalist>
              </div>
              <div>
                <Lbl>Account number</Lbl>
                <div className="flex gap-1.5">
                  <input value={form.accountNumber ?? ''} onChange={(e) => set('accountNumber', e.target.value)}
                    placeholder="0123456789" className={`${inputCls} font-mono`} />
                  {form.accountNumber && (
                    <button type="button" title="Copy"
                      onClick={() => { navigator.clipboard.writeText(form.accountNumber ?? ''); toast.success('Copy ho gaya'); }}
                      className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 transition">
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Lbl hint="online transfer ke liye">IBAN</Lbl>
                <input value={form.iban ?? ''} onChange={(e) => set('iban', e.target.value.toUpperCase())}
                  placeholder="PK36SCBL0000001123456702" className={`${inputCls} font-mono`} />
              </div>
            </div>
          </Panel>

          {/* ─────── 6. PURANA HISAB (sirf naya) ─────── */}
          {!isEdit && (
            <Panel icon={BookOpen} title="Purana Hisab" desc="System se pehle is supplier ko kitna dena tha" tone="violet">
              <div className="rounded-2xl bg-violet-50 dark:bg-violet-500/10 border-2 border-violet-200 dark:border-violet-500/30 p-3.5 space-y-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                  <p className="text-[12px] font-bold text-violet-900 dark:text-violet-200 leading-relaxed">
                    Agar purani copy me is supplier ka koi baqi chal raha hai to abhi daal dein.
                    Khata usi number se shuru hoga aur aage ka hisab apne aap sahi banta rahega.
                    Baad me sab bhool jate hain.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Lbl hint="hum ne dena tha">Purana baqi (Rs)</Lbl>
                    <input type="number" min={0} value={opening}
                      onChange={(e) => { setOpening(e.target.value); setDirty(true); }}
                      placeholder="0" className={`${inputCls} h-12 text-base tabular-nums`} />
                    {errors.opening && <Err>{errors.opening}</Err>}
                  </div>
                  <div>
                    <Lbl hint="optional">Note</Lbl>
                    <input value={openingNote} onChange={(e) => setOpeningNote(e.target.value)}
                      placeholder="Purani copy, Jan 2026 tak" className={inputCls} />
                  </div>
                </div>
                {Number(opening) > 0 && (
                  <div className="rounded-xl bg-[#ffffff] dark:bg-slate-900 border-2 border-violet-300 dark:border-violet-500/40 p-2.5 text-center">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-violet-600">Khata yahan se shuru hoga</div>
                    <div className="text-xl font-black text-violet-700 dark:text-violet-300 tabular-nums">
                      {formatPKR(Number(opening))}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">itna hum ne dena hai</div>
                  </div>
                )}
              </div>
            </Panel>
          )}

          {/* ─────── 7. NOTES ─────── */}
          <Panel icon={FileText} title="Apni Yaad-dasht" desc="Jo baat yaad rakhni hai" tone="slate">
            <textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)}
              rows={3} placeholder="Jumme ko band rehta hai · Cash par 2% chhoot deta hai · Delivery khud karta hai"
              className={`${inputCls} h-auto py-2.5 resize-none`} />
          </Panel>
        </div>

        {/* ─────── SIDEBAR: LIVE PREVIEW ─────── */}
        <div className="space-y-4 xl:sticky xl:top-4">
          <Panel icon={Sparkles} title="Jaisa Dikhega" desc="List me is tarah nazar aayega" tone="indigo">
            <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className={`h-1.5 ${Number(opening) > 0 ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-gradient-to-r from-teal-500 to-emerald-600'}`} />
              <div className="p-3.5">
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-white shrink-0 ${
                    form.isActive ? 'bg-gradient-to-br from-teal-600 to-emerald-700' : 'bg-slate-400'
                  }`}>
                    {form.logoUrl
                      ? <img src={form.logoUrl} alt="" className="h-full w-full object-cover rounded-2xl" />
                      : initials(form.name || '?')}
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-slate-900 dark:text-white truncate">
                      {form.name || 'Supplier ka naam'}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                      {form.contactPerson ? `👤 ${form.contactPerson}` : form.city ? `📍 ${form.city}` : 'Tafseel nahi'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap mt-2.5 text-[10px] font-extrabold">
                  {form.phone && <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">{form.phone}</span>}
                  {form.city && <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{form.city}</span>}
                  {form.paymentTerms && <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">{form.paymentTerms}</span>}
                  {form.bankName && <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">{form.bankName}</span>}
                  {!form.isActive && <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Band</span>}
                </div>
                {!isEdit && Number(opening) > 0 && (
                  <div className="mt-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 p-2 text-center">
                    <div className="text-[9px] font-extrabold uppercase text-rose-600">Hamara baqi</div>
                    <div className="text-sm font-black text-rose-700 dark:text-rose-300 tabular-nums">
                      {formatPKR(Number(opening))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Panel>

          {isEdit && (
            <Panel icon={BookOpen} title="Khata" desc="Udhaar aur adaigi alag safhe se" tone="violet">
              <Link to={`/suppliers/${id}`}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg transition">
                <BookOpen className="h-4 w-4" /> Khata kholein
              </Link>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-2 text-center">
                Baqi yahan se nahi badalta — har tabdeeli khate me darj honi chahiye taake hisab saaf rahe.
              </p>
            </Panel>
          )}

          <div className="rounded-3xl bg-[#ffffff] dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4 space-y-2">
            <button onClick={() => submit(false)} disabled={mut.isPending || !valid}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-500 hover:to-emerald-600 disabled:opacity-40 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg shadow-teal-500/30 transition active:scale-[0.98]">
              {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? 'Tabdeeli Save Karein' : 'Supplier Banayein'}
            </button>
            {!isEdit && (
              <button onClick={() => submit(true)} disabled={mut.isPending || !valid}
                className="w-full h-12 rounded-2xl bg-[#ffffff] dark:bg-slate-900 border-2 border-teal-300 dark:border-teal-500/40 text-teal-700 dark:text-teal-300 text-sm font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-40 transition">
                <Plus className="h-4 w-4" /> Save + Aik Aur
              </button>
            )}
            <Link to={isEdit ? `/suppliers/${id}` : '/suppliers'}
              className="w-full h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-extrabold inline-flex items-center justify-center gap-2 transition">
              <X className="h-4 w-4" /> Cancel
            </Link>
            <div className="flex items-center justify-center gap-2 pt-1 text-[10px] font-bold text-slate-400">
              <Kbd>Ctrl</Kbd><span>+</span><Kbd>S</Kbd><span>save</span>
              {!isEdit && (<><span className="mx-1">·</span><Kbd>Ctrl</Kbd><span>+</span><Kbd>↵</Kbd><span>save + aik aur</span></>)}
            </div>
          </div>
        </div>
      </div>

      {/* ─────── MOBILE STICKY SAVE ─────── */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#ffffff] dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-800 p-3 flex gap-2">
        <Link to={isEdit ? `/suppliers/${id}` : '/suppliers'}
          className="h-12 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-extrabold inline-flex items-center justify-center transition">
          <X className="h-4 w-4" />
        </Link>
        <button onClick={() => submit(false)} disabled={mut.isPending || !valid}
          className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-700 disabled:opacity-40 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg transition">
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? 'Save' : 'Banayein'}
        </button>
      </div>

      {/* ─────── MODALS ─────── */}
      {showTeacher && (
        <Teacher onClose={() => setShowTeacher(false)}
          title="Supplier ki form"
          subtitle="Kya zaroori hai aur kya baad me bhi ho jayega"
          steps={[
            { icon: '✍️', head: 'Sirf naam lazmi hai', body: 'Mandi me aksar poori tafseel pata hi nahi hoti. Naam likh kar supplier bana lein — phone, bank, NTN sab baad me bhar sakte hain. Adhoori tafseel ki wajah se supplier na banna asli nuqsan hai.' },
            { icon: '📖', head: 'Purana hisab ek hi dafa', body: 'Naya supplier banate waqt agar purani copy me uska baqi chal raha hai to wo abhi daal dein. Khata usi number se shuru hoga. Ye khana sirf naye supplier par aata hai — mojooda ka khata detail safhe se badalta hai taake har tabdeeli record ho.' },
            { icon: '🏦', head: 'Bank ki tafseel ek baar', body: 'Account number aur IBAN yahan likh lein — har adaigi par phone kar ke poochna nahi parega.' },
            { icon: '📞', head: 'Phone = WhatsApp', body: 'Number likhte hi WhatsApp ka link ban jata hai. Khata bhi isi number par bheja ja sakta hai.' },
            { icon: '🔁', head: 'Doosri baar na banayein', body: 'Agar isi naam ya number ka supplier pehle se hai to form foran bata deta hai — warna ek hi supplier ka khata do jagah bat jata hai aur hisab ghalat ho jata hai.' },
            { icon: '🚫', head: 'Band karna vs delete', body: 'Jis supplier se ab maal nahi aata use "band" kar dein — purana record mehfooz rehta hai aur naye bill me nazar nahi aata. Delete sirf us ka hota hai jiska koi bill hi na ho.' },
          ]}
          tips={[
            'Ctrl+S se save, Ctrl+Enter se save kar ke agla supplier.',
            'Payment terms ka chip dabayein — likhna nahi parega.',
            'Sheher aur bank ka naam type karte hi list khud aa jati hai.',
            'Upar wali patti batati hai tafseel kitni poori hai.',
          ]} />
      )}

      {showKeys && (
        <Shortcuts onClose={() => setShowKeys(false)} list={[
          ['Ctrl+S', 'Save'],
          ['Ctrl+↵', 'Save + aik aur'],
          ['T', 'Sikhein'],
          ['?', 'Ye list'],
          ['Esc', 'Band karein'],
        ]} />
      )}
    </div>
  );
}

/* ─────── chhote purzay ─────── */
function Lbl({ children, hint, req }: { children: React.ReactNode; hint?: string; req?: boolean }) {
  return (
    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
      {children}{req && <span className="text-rose-500 ml-0.5">*</span>}
      {hint && <span className="text-slate-400 normal-case font-bold ml-1">({hint})</span>}
    </label>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-1 text-[11px] font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1">
      <AlertTriangle className="h-3 w-3" /> {children}
    </div>
  );
}
