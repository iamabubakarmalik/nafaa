import { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Trash2, Truck, Building2, CreditCard, FileText,
  MapPin, User, Phone, Mail, Hash, Copy, CheckCircle2, AlertCircle,
  Wallet, Eye, EyeOff, Sparkles, MessageCircle, Briefcase,
  ShieldCheck, Banknote, Info, X, GraduationCap,
} from 'lucide-react';
import { suppliersApi, type UpsertSupplierPayload } from '@modules/purchasing/suppliers/api/suppliers.api';
import { Button } from '@core/ui/Button';
import { AvatarUpload } from '@core/components/uploads';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════
   NAFAA SUPPLIER FORM — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌍 GLOBAL — 35+ industries sab me same supplier fields
   🌙 Dark mode complete (har section + sidebar + sticky footer)
   🎓 Teacher modal — form bharne ka tareeqa sikhata hai
   ⌨️  Ctrl+S / Ctrl+Enter = save • Esc = wapas
   ⚠️ Unsaved changes warning • 📱 Mobile stack layout
   ═════════════════════════════════════════════════════════════ */

const empty: UpsertSupplierPayload = {
  name: '',
  isActive: true,
};

const PAYMENT_TERMS = [
  { value: 'Cash on delivery', emoji: '💵', desc: 'Foran payment' },
  { value: 'Advance payment', emoji: '🎯', desc: 'Pehle pay' },
  { value: 'Net 7 days', emoji: '📅', desc: 'Hafta mein' },
  { value: 'Net 15 days', emoji: '🗓️', desc: '15 din' },
  { value: 'Net 30 days', emoji: '📆', desc: '1 mahina' },
  { value: 'Net 45 days', emoji: '⏳', desc: '45 din' },
  { value: 'Net 60 days', emoji: '⌛', desc: '2 mahine' },
];

const PAKISTAN_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan',
  'Hyderabad', 'Gujranwala', 'Peshawar', 'Quetta', 'Sialkot', 'Sargodha',
  'Bahawalpur', 'Sukkur', 'Larkana', 'Sheikhupura', 'Mirpur Khas', 'Gujrat',
  'Jhang', 'Mardan', 'Kasur', 'Dera Ghazi Khan', 'Sahiwal', 'Okara',
];

const PAKISTAN_BANKS = [
  'HBL (Habib Bank)', 'UBL (United Bank)', 'MCB Bank', 'Bank Alfalah',
  'Meezan Bank', 'Allied Bank', 'Faysal Bank', 'Standard Chartered',
  'Bank of Punjab', 'Soneri Bank', 'Askari Bank', 'JS Bank',
  'Habib Metropolitan', 'Bank Al Habib', 'Summit Bank', 'NBP (National Bank)',
  'Dubai Islamic Bank', 'BankIslami', 'Sindh Bank', 'Bank Makramah',
];

// Helpers
const formatCNIC = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
};

const formatIBAN = (value: string): string => {
  const cleaned = value.replace(/\s/g, '').toUpperCase().slice(0, 24);
  return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
};

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('92')) return `+${digits.slice(0, 12)}`;
  if (digits.startsWith('0')) return digits.slice(0, 11);
  return digits.slice(0, 11);
};

const validateNTN = (ntn: string) => {
  const cleaned = ntn.replace(/\D/g, '');
  return cleaned.length === 7 || cleaned.length === 9 || cleaned.length === 13;
};

/* Shared input style — dark aware */
const inputCls =
  'h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition';

const focusCls = (color: string) =>
  `focus:ring-2 focus:ring-${color}-500/30 focus:border-${color}-500`;

export default function SupplierFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const submitLockRef = useRef(false);
  const dirtyRef = useRef(false);

  const [form, setForm] = useState<UpsertSupplierPayload>(empty);
  const [showSensitive, setShowSensitive] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('company');
  const [showTeacher, setShowTeacher] = useState(false);

  const { data: supplier } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => suppliersApi.getOne(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name,
        contactPerson: supplier.contactPerson ?? '',
        phone: supplier.phone ?? '',
        altPhone: supplier.altPhone ?? '',
        email: supplier.email ?? '',
        cnic: supplier.cnic ?? '',
        ntn: supplier.ntn ?? '',
        address: supplier.address ?? '',
        city: supplier.city ?? '',
        area: supplier.area ?? '',
        logoUrl: supplier.logoUrl ?? '',
        bankName: supplier.bankName ?? '',
        accountNumber: supplier.accountNumber ?? '',
        iban: supplier.iban ?? '',
        paymentTerms: supplier.paymentTerms ?? '',
        notes: supplier.notes ?? '',
        isActive: supplier.isActive,
      });
      dirtyRef.current = false;
    }
  }, [supplier]);

  /* Dirty tracking — kuch bhi change ho to yaad rakho */
  const set = (patch: Partial<UpsertSupplierPayload>) => {
    dirtyRef.current = true;
    setForm((f) => ({ ...f, ...patch }));
  };

  // Form completion progress
  const completionStats = useMemo(() => {
    const fields = [
      form.name, form.contactPerson, form.phone, form.email,
      form.address, form.city, form.bankName, form.accountNumber,
      form.iban, form.paymentTerms, form.ntn, form.cnic, form.logoUrl,
    ];
    const filled = fields.filter((f) => f && String(f).trim().length > 0).length;
    const total = fields.length;
    return { filled, total, percent: Math.round((filled / total) * 100) };
  }, [form]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const cleanForm: any = { ...form };
      const stringFields = [
        'phone', 'altPhone', 'email', 'cnic', 'ntn', 'address', 'city',
        'area', 'logoUrl', 'bankName', 'accountNumber', 'iban',
        'paymentTerms', 'notes', 'contactPerson',
      ];
      stringFields.forEach((k) => {
        if (cleanForm[k] === '' || cleanForm[k] === null) cleanForm[k] = undefined;
      });
      return isEdit ? suppliersApi.update(id!, cleanForm) : suppliersApi.create(cleanForm);
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => suppliersApi.remove(id!),
    onSuccess: () => {
      toast.success('Supplier delete ho gaya');
      navigate('/suppliers');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete nahi hua — iska purchase record hai'),
  });

  const handleSave = async () => {
    if (submitLockRef.current || saveMutation.isPending) return;
    if (!form.name.trim()) {
      toast.error('Supplier ka naam zaroori hai');
      setActiveSection('company');
      document.getElementById('section-company')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (form.cnic && form.cnic.replace(/\D/g, '').length !== 13) {
      toast.error('CNIC 13 digits ka hona chahiye');
      setActiveSection('tax');
      document.getElementById('section-tax')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (form.ntn && !validateNTN(form.ntn)) {
      toast.error('NTN 7, 9 ya 13 digits ka hona chahiye');
      setActiveSection('tax');
      document.getElementById('section-tax')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Email format theek nahi');
      setActiveSection('company');
      document.getElementById('section-company')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    submitLockRef.current = true;
    try {
      const saved = await saveMutation.mutateAsync();
      dirtyRef.current = false;
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier', saved.id] });
      queryClient.invalidateQueries({ queryKey: ['suppliers-summary'] });
      toast.success(isEdit ? 'Supplier update ho gaya' : 'Supplier ban gaya', {
        description: isEdit ? 'Changes save ho gaye' : 'Ab is se purchases bana sakte ho',
      });
      navigate(`/suppliers/${saved.id}`, { replace: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save nahi hua');
    } finally {
      setTimeout(() => { submitLockRef.current = false; }, 700);
    }
  };

  const goBack = () => {
    if (dirtyRef.current && !confirm('⚠️ Changes save nahi huay — wapas jao gay to sab ur jayega.\n\nPakka nikle?')) return;
    navigate(isEdit ? `/suppliers/${id}` : '/suppliers');
  };

  const copyField = (value: string, label: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    toast.success(`${label} copy ho gaya`);
  };

  /* ─── Keyboard: Ctrl+S/Ctrl+Enter = save, Esc = back ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) { setShowTeacher(false); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 's' || e.key === 'Enter')) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, form, saveMutation.isPending]);

  /* ─── Unsaved changes — browser close/refresh warning ─── */
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  /* Body scroll lock jab teacher khula ho */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = showTeacher ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher]);

  const sections = [
    { id: 'company', label: 'Company Info', icon: Building2, activeCls: 'bg-orange-600 border-orange-600 shadow-orange-500/30', idleCls: 'hover:border-orange-300 dark:hover:border-orange-500/50' },
    { id: 'location', label: 'Location', icon: MapPin, activeCls: 'bg-rose-600 border-rose-600 shadow-rose-500/30', idleCls: 'hover:border-rose-300 dark:hover:border-rose-500/50' },
    { id: 'tax', label: 'Tax Info', icon: FileText, activeCls: 'bg-blue-600 border-blue-600 shadow-blue-500/30', idleCls: 'hover:border-blue-300 dark:hover:border-blue-500/50' },
    { id: 'banking', label: 'Banking', icon: CreditCard, activeCls: 'bg-emerald-600 border-emerald-600 shadow-emerald-500/30', idleCls: 'hover:border-emerald-300 dark:hover:border-emerald-500/50' },
    { id: 'notes', label: 'Notes', icon: Info, activeCls: 'bg-amber-600 border-amber-600 shadow-amber-500/30', idleCls: 'hover:border-amber-300 dark:hover:border-amber-500/50' },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <SupplierFormTeacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ BACK ═══ */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={goBack}
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> {isEdit ? 'Supplier pe Wapas' : 'Sab Suppliers'}
        </button>
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">
          <KbdLight>Ctrl</KbdLight>+<KbdLight>S</KbdLight> Save
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 dark:from-slate-950 dark:via-orange-950 dark:to-amber-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-orange-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Truck className="h-3.5 w-3.5 text-amber-300" />
              {isEdit ? 'Supplier Edit' : 'Naya Supplier'}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight truncate">
              {form.name || 'Naya supplier'}
            </h1>
            {form.contactPerson && (
              <p className="mt-1.5 text-sm text-white/90 inline-flex items-center gap-1.5 font-semibold">
                <User className="h-3.5 w-3.5" /> Contact: {form.contactPerson}
              </p>
            )}

            {/* Progress bar */}
            <div className="mt-4 max-w-md">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-white/80 font-bold">Profile Completion</span>
                <span className="font-extrabold tabular-nums">{completionStats.percent}%</span>
              </div>
              <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-500"
                  style={{ width: `${completionStats.percent}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-white/70 font-semibold">
                {completionStats.filled}/{completionStats.total} fields bhare • Sirf <strong className="text-amber-300">naam</strong> zaroori hai
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
              title="Form kaise bharein?"
            >
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            {isEdit && (
              <button
                onClick={() => {
                  if (confirm(`"${form.name}" delete karein?\n\nYe action undo nahi ho sakta — purchase history me naam reh jayega lekin supplier chala jayega.`)) removeMutation.mutate();
                }}
                disabled={removeMutation.isPending}
                className="h-11 px-3 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Delete</span>
              </button>
            )}
            <Button
              onClick={handleSave}
              loading={saveMutation.isPending}
              className="bg-white text-slate-900 hover:bg-slate-100 shadow-2xl font-extrabold"
            >
              <Save className="h-4 w-4" /> {isEdit ? 'Save Changes' : 'Supplier Banao'}
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ SECTION NAV TABS ═══ */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map((s) => {
          const Icon = s.icon;
          const active = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => {
                setActiveSection(s.id);
                document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold whitespace-nowrap transition border-2 ${
                active
                  ? `${s.activeCls} text-white shadow-lg`
                  : `bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 ${s.idleCls}`
              }`}
            >
              <Icon className="h-4 w-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-4 sm:gap-5">
        {/* ═══ LEFT SIDEBAR ═══ */}
        <div className="space-y-4">
          {/* Logo Upload */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <h3 className="font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              Supplier Logo
            </h3>
            <div className="flex justify-center">
              <AvatarUpload
                value={form.logoUrl}
                onChange={(url) => set({ logoUrl: url || '' })}
                purpose="brand-logo"
                shape="square"
                size="xl"
                fallbackText={form.name || 'S'}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center font-semibold">
              Optional — company ka logo
            </p>
          </div>

          {/* Status Toggle */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <h3 className="font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Status
            </h3>
            <label className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-800/30 border-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-500/50 transition">
              <div className="flex items-center gap-2.5">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center transition ${
                  form.isActive
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  {form.isActive ? <CheckCircle2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {form.isActive ? 'Active' : 'Inactive'}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                    {form.isActive ? 'Purchases me dikhega' : 'List me chhupa rahega'}
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.isActive ?? true}
                onChange={(e) => set({ isActive: e.target.checked })}
                className="h-5 w-5 rounded accent-emerald-600"
              />
            </label>
          </div>

          {/* Tips Card */}
          <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-200 dark:border-amber-500/40 p-5">
            <h3 className="font-extrabold text-amber-900 dark:text-amber-200 mb-3 flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Pro Tips
            </h3>
            <ul className="space-y-2 text-xs text-amber-900 dark:text-amber-200/90 font-semibold">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>Sirf <strong>naam</strong> likh ke bhi save ho jata hai — baqi baad me</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>Phone = WhatsApp — Low Stock se reminders isi pe jayenge</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>Payment terms set karo — udhaar tracking easy hogi</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>Bank details chhupe rehte hain — "Show sensitive" se dekho</span>
              </li>
            </ul>
          </div>

          {/* Quick Stats (edit mode) */}
          {isEdit && (supplier as any)?.stats && (
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <h3 className="font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Quick Stats
              </h3>
              <dl className="space-y-2">
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-slate-600 dark:text-slate-400 font-bold">Total Orders</dt>
                  <dd className="font-extrabold text-slate-900 dark:text-white tabular-nums">{(supplier as any).stats.totalPurchases}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-slate-600 dark:text-slate-400 font-bold">Total Spent</dt>
                  <dd className="font-extrabold text-blue-700 dark:text-blue-400 tabular-nums">
                    {new Intl.NumberFormat('en-PK').format((supplier as any).stats.totalAmount)}
                  </dd>
                </div>
                {(supplier as any).stats.outstanding > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                    <dt className="text-xs text-rose-700 dark:text-rose-400 font-bold">Outstanding</dt>
                    <dd className="font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">
                      {new Intl.NumberFormat('en-PK').format((supplier as any).stats.outstanding)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* ═══ MAIN FORM ═══ */}
        <div className="space-y-4 sm:space-y-5 min-w-0">
          {/* COMPANY INFO */}
          <div id="section-company" className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-orange-200 dark:border-orange-500/30 shadow-sm overflow-hidden scroll-mt-4">
            <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 border-b-2 border-orange-200 dark:border-orange-500/30">
              <h3 className="font-extrabold text-orange-900 dark:text-orange-200 flex items-center gap-2 text-sm">
                <div className="h-9 w-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/30 shrink-0">
                  <Building2 className="h-4 w-4" />
                </div>
                Company Information
                <span className="ml-auto text-[10px] font-extrabold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-500/20 px-2 py-0.5 rounded-full shrink-0">Required *</span>
              </h3>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                  Supplier / Company ka Naam <span className="text-rose-600">*</span>
                </label>
                <input
                  autoFocus={!isEdit}
                  className={`${inputCls} ${focusCls('orange')}`}
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="Sun Fibre, ABC Wholesalers..."
                />
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                  Yahi naam purchases aur reports me dikhega
                </div>
              </div>

              <div>
                <label className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  Contact Person
                </label>
                <input
                  className={`${inputCls} ${focusCls('orange')}`}
                  value={form.contactPerson ?? ''}
                  onChange={(e) => set({ contactPerson: e.target.value })}
                  placeholder="Mr. Ahmed, Sales Manager Sara..."
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    Phone (WhatsApp)
                  </label>
                  <div className="relative">
                    <input
                      className={`${inputCls} ${focusCls('orange')} pr-20`}
                      value={form.phone ?? ''}
                      onChange={(e) => set({ phone: formatPhone(e.target.value) })}
                      placeholder="03009998877"
                    />
                    {form.phone && (
                      <a
                        href={`https://wa.me/${form.phone.replace(/[^0-9]/g, '').replace(/^0/, '92')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 rounded-lg bg-green-100 dark:bg-green-500/20 hover:bg-green-200 dark:hover:bg-green-500/30 text-green-700 dark:text-green-300 inline-flex items-center gap-1 text-[10px] font-bold transition"
                        title="WhatsApp test"
                      >
                        <MessageCircle className="h-3 w-3" /> Test
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    Doosra Phone
                  </label>
                  <input
                    className={`${inputCls} ${focusCls('orange')}`}
                    value={form.altPhone ?? ''}
                    onChange={(e) => set({ altPhone: formatPhone(e.target.value) })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  Email
                </label>
                <input
                  type="email"
                  className={`${inputCls} ${focusCls('orange')}`}
                  value={form.email ?? ''}
                  onChange={(e) => set({ email: e.target.value })}
                  placeholder="contact@company.com"
                />
                {form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && (
                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-1 inline-flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Email format theek nahi
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* LOCATION */}
          <div id="section-location" className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-rose-200 dark:border-rose-500/30 shadow-sm overflow-hidden scroll-mt-4">
            <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10 border-b-2 border-rose-200 dark:border-rose-500/30">
              <h3 className="font-extrabold text-rose-900 dark:text-rose-200 flex items-center gap-2 text-sm">
                <div className="h-9 w-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/30 shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                Location
                <span className="ml-auto text-[10px] font-extrabold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-500/20 px-2 py-0.5 rounded-full shrink-0">Optional</span>
              </h3>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Sheher</label>
                  <input
                    className={`${inputCls} ${focusCls('rose')}`}
                    value={form.city ?? ''}
                    onChange={(e) => set({ city: e.target.value })}
                    placeholder="Karachi, Lahore..."
                    list="city-list"
                  />
                  <datalist id="city-list">
                    {PAKISTAN_CITIES.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Area / Mohalla</label>
                  <input
                    className={`${inputCls} ${focusCls('rose')}`}
                    value={form.area ?? ''}
                    onChange={(e) => set({ area: e.target.value })}
                    placeholder="Saddar, DHA Phase 5..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Poora Address</label>
                <textarea
                  rows={3}
                  className={`w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none transition ${focusCls('rose')}`}
                  value={form.address ?? ''}
                  onChange={(e) => set({ address: e.target.value })}
                  placeholder="Shop #, Street, Block, Sector..."
                />
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                  Purchase invoices pe ye address dikhega
                </div>
              </div>
            </div>
          </div>

          {/* TAX INFO */}
          <div id="section-tax" className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-blue-200 dark:border-blue-500/30 shadow-sm overflow-hidden scroll-mt-4">
            <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 border-b-2 border-blue-200 dark:border-blue-500/30 flex items-center justify-between gap-2">
              <h3 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2 text-sm">
                <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30 shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                Tax Information
              </h3>
              <button
                onClick={() => setShowSensitive(!showSensitive)}
                className="text-xs font-extrabold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-200 inline-flex items-center gap-1 transition shrink-0"
              >
                {showSensitive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showSensitive ? 'Chhupao' : 'Dikhao'}
              </button>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 inline-flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    CNIC <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">(13 digits)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSensitive ? 'text' : 'password'}
                      className={`${inputCls} ${focusCls('blue')} pr-10 font-mono`}
                      value={form.cnic ?? ''}
                      onChange={(e) => set({ cnic: formatCNIC(e.target.value) })}
                      placeholder="12345-6789012-3"
                      maxLength={15}
                    />
                    {form.cnic && (
                      <button
                        onClick={() => copyField(form.cnic || '', 'CNIC')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-500/20 hover:bg-blue-200 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 inline-flex items-center justify-center transition"
                        title="Copy"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {form.cnic && form.cnic.replace(/\D/g, '').length !== 13 && (
                    <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold mt-1 inline-flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> 13 digits hone chahiye
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 inline-flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    NTN <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">(7/9/13 digits)</span>
                  </label>
                  <div className="relative">
                    <input
                      className={`${inputCls} ${focusCls('blue')} pr-10 font-mono`}
                      value={form.ntn ?? ''}
                      onChange={(e) => set({ ntn: e.target.value })}
                      placeholder="National Tax Number"
                    />
                    {form.ntn && (
                      <button
                        onClick={() => copyField(form.ntn || '', 'NTN')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-500/20 hover:bg-blue-200 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 inline-flex items-center justify-center transition"
                        title="Copy"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {form.ntn && !validateNTN(form.ntn) && (
                    <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold mt-1 inline-flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> 7, 9 ya 13 digits hone chahiye
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BANKING */}
          <div id="section-banking" className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-emerald-200 dark:border-emerald-500/30 shadow-sm overflow-hidden scroll-mt-4">
            <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border-b-2 border-emerald-200 dark:border-emerald-500/30">
              <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2 text-sm">
                <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 shrink-0">
                  <CreditCard className="h-4 w-4" />
                </div>
                Banking & Payment Terms
                <span className="ml-auto text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">Optional</span>
              </h3>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  Bank ka Naam
                </label>
                <input
                  className={`${inputCls} ${focusCls('emerald')}`}
                  value={form.bankName ?? ''}
                  onChange={(e) => set({ bankName: e.target.value })}
                  placeholder="HBL, Meezan, UBL..."
                  list="bank-list"
                />
                <datalist id="bank-list">
                  {PAKISTAN_BANKS.map((b) => <option key={b} value={b} />)}
                </datalist>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 inline-flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    Account Number
                  </label>
                  <div className="relative">
                    <input
                      type={showSensitive ? 'text' : 'password'}
                      className={`${inputCls} ${focusCls('emerald')} pr-10 font-mono`}
                      value={form.accountNumber ?? ''}
                      onChange={(e) => set({ accountNumber: e.target.value })}
                      placeholder="00000000000"
                    />
                    {form.accountNumber && (
                      <button
                        onClick={() => copyField(form.accountNumber || '', 'Account')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 inline-flex items-center justify-center transition"
                        title="Copy"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 inline-flex items-center gap-1.5">
                    <Banknote className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    IBAN <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">(24 chars)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSensitive ? 'text' : 'password'}
                      className={`${inputCls} ${focusCls('emerald')} pr-10 font-mono uppercase`}
                      value={form.iban ?? ''}
                      onChange={(e) => set({ iban: formatIBAN(e.target.value) })}
                      placeholder="PK00BANK0000000000000000"
                      maxLength={29}
                    />
                    {form.iban && (
                      <button
                        onClick={() => copyField(form.iban?.replace(/\s/g, '') || '', 'IBAN')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 inline-flex items-center justify-center transition"
                        title="Copy"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-2 inline-flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  Payment Terms
                </label>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {PAYMENT_TERMS.map((t) => {
                    const active = form.paymentTerms === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => set({ paymentTerms: active ? '' : t.value })}
                        className={`px-3 py-2.5 rounded-xl border-2 text-left transition ${
                          active
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{t.emoji}</span>
                          <div className="min-w-0">
                            <div className={`text-xs font-extrabold truncate ${active ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                              {t.value}
                            </div>
                            <div className={`text-[10px] font-bold ${active ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                              {t.desc}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-semibold">
                  Purchases me ye automatically yaad rahega
                </p>
              </div>
            </div>
          </div>

          {/* NOTES */}
          <div id="section-notes" className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-amber-200 dark:border-amber-500/30 shadow-sm overflow-hidden scroll-mt-4">
            <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-b-2 border-amber-200 dark:border-amber-500/30">
              <h3 className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2 text-sm">
                <div className="h-9 w-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
                  <Info className="h-4 w-4" />
                </div>
                Internal Notes
                <span className="ml-auto text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded-full shrink-0">Private</span>
              </h3>
            </div>
            <div className="p-5 sm:p-6">
              <textarea
                rows={4}
                className={`w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none transition ${focusCls('amber')}`}
                value={form.notes ?? ''}
                onChange={(e) => set({ notes: e.target.value })}
                placeholder="Best supplier for X, delivery 2 din me, bulk discount 50k+ pe, JazzCash prefer karta hai..."
              />
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-semibold inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                Sirf tum aur tumhari team dekh sakti ho — supplier ko nahi dikhega
              </div>
            </div>
          </div>

          {/* STICKY SAVE FOOTER */}
          <div className="sticky bottom-4 z-10">
            <div className="rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-900 dark:to-slate-800 border-2 border-orange-300 dark:border-orange-500/40 p-4 shadow-2xl backdrop-blur flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  completionStats.percent === 100
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : completionStats.percent >= 50
                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                }`}>
                  {completionStats.percent === 100 ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {completionStats.percent === 100 ? 'Sab fields bhare huay! 🎉' : `${completionStats.percent}% Complete`}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                    {dirtyRef.current ? '● Unsaved changes hain' : 'Sirf naam zaroori hai'}
                  </div>
                </div>
              </div>
              <Button
                onClick={handleSave}
                loading={saveMutation.isPending}
                size="lg"
                className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-lg shadow-orange-500/30 text-white font-extrabold"
              >
                <Save className="h-4 w-4" /> {isEdit ? 'Save Changes' : 'Supplier Banao'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SUPPLIER FORM TEACHER — Universal guide
   ═════════════════════════════════════════════════════════════ */
function SupplierFormTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-orange-300 dark:border-orange-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-orange-200 dark:border-orange-500/30 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/15 dark:to-amber-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-orange-900 dark:text-orange-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Supplier Form — Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>Sirf NAAM zaroori hai</strong> — baqi sab optional! Naam likho, save karo, kaam shuru.
            Baqi details baad me kabhi bhi add kar sakte ho.
          </p>

          <div className="rounded-2xl border-2 border-orange-200 dark:border-orange-500/30 bg-orange-50/60 dark:bg-orange-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>📱 Phone = WhatsApp</strong> — sahi number likho, Low Stock reminders isi pe jate hain ("Test" button se check karo)</TipRow>
            <TipRow><strong>🗓️ Payment Terms</strong> — "Net 15" = 15 din baad paisa. Udhar suppliers ke liye set karo</TipRow>
            <TipRow><strong>🔒 Sensitive fields</strong> — CNIC, account, IBAN chhupe rehte hain, "Dikhao" se khulte hain</TipRow>
            <TipRow><strong>📊 Progress bar</strong> — jitna zyada bharo, utna complete profile (100% ka maza hi alag!)</TipRow>
            <TipRow><strong>⌨️ Ctrl+S</strong> — kahin se bhi foran save &nbsp;•&nbsp; <strong>Esc</strong> — guide band</TipRow>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            💡 <strong>Sab se tez tareeqa:</strong> Naam + Phone likho → Save → ho gaya!
            Bank/tax wali cheezein sirf un suppliers ke liye jinhe online payment karte ho.
          </div>

          <Button
            className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 font-extrabold shadow-lg shadow-orange-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya — Form Bharo!
          </Button>
        </div>
      </div>
    </div>
  );
}

function TipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function KbdLight({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono font-bold shadow-sm">
      {children}
    </kbd>
  );
}
