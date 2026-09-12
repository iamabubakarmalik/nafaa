import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Trash2, Crown, User, MapPin, CreditCard,
  GraduationCap, X, CheckCircle2, AlertTriangle, Phone, Mail,
  CalendarDays, Wallet, Sparkles, Keyboard, Star, Cake, CopyX,
  MessageCircle, Eye, BookOpen, ShoppingBag, Plus, Building2, Info,
} from 'lucide-react';
import { customersApi, type UpsertCustomerPayload } from '@modules/customers/customers/api/customers.api';
import { Button } from '@core/ui/Button';
import { AvatarUpload } from '@core/components/uploads';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════
   NAFAA CUSTOMER FORM — GLOBAL (har industry me ek jaisa)
   ─────────────────────────────────────────────────────────────
   ⚠️ Duplicate phone AUR duplicate naam dono ka guard
   📱 Phone khud format hota hai • +92 / 92 apne aap 0 banta hai
   👤 Naam se gender ka andaza — 1 click me set
   🏙️ City suggestions (Pakistan ke sheher + aap ke purane sheher)
   💳 Credit limit quick chips • 💬 WhatsApp message ka live preview
   💾 "Save aur Naya" — paper khata se data daalne walon ke liye
   🛡️ Bina save kiye page chhoro to warning
   📊 Edit mode: live kharch / khata / sales stats + khata ka link
   🎓 Teacher • 🌙 Dark/Light • ⌨️ Ctrl+S • Ctrl+Enter • Esc
   ═════════════════════════════════════════════════════════════ */

const empty: UpsertCustomerPayload = {
  name: '',
  phone: '',
  email: '',
  cnic: '',
  address: '',
  city: '',
  area: '',
  notes: '',
  creditLimit: 0,
  isVip: false,
  isActive: true,
};

/* CNIC auto-format: 12345-6789012-3 */
const formatCnic = (v: string) => {
  const d = v.replace(/[^0-9]/g, '').slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
};

/* Phone auto-format: +923001234567 / 923001234567 → 0300-1234567 */
const formatPhoneInput = (v: string) => {
  let d = v.replace(/[^0-9]/g, '');
  if (d.startsWith('92')) d = '0' + d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 4) return d;
  return `${d.slice(0, 4)}-${d.slice(4)}`;
};

const NOTE_CHIPS = [
  'Regular customer ✓',
  'Udhaar time pe deta hai 👍',
  'Udhaar der se deta hai ⚠️',
  'Rate pe nakhre karta hai 😅',
  'Bulk buyer — discount do',
  'Ghar pe delivery chahiye',
  'Sirf cash deal karta hai',
  'Purana gahak — 5 saal se',
];

const CREDIT_CHIPS = [0, 5000, 10000, 25000, 50000, 100000];

const PK_CITIES = [
  'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar',
  'Quetta', 'Gujranwala', 'Sialkot', 'Hyderabad', 'Bahawalpur', 'Sargodha', 'Sukkur',
  'Sahiwal', 'Sheikhupura', 'Jhang', 'Gujrat', 'Mardan', 'Abbottabad', 'Mirpur',
  'Okara', 'Rahim Yar Khan', 'Dera Ghazi Khan', 'Kasur', 'Chiniot', 'Nawabshah',
];

const cleanPhone = (v: string) => String(v || '').replace(/[\s-]/g, '');
const normalizePhone = (v: string) => {
  const d = cleanPhone(v);
  if (d.startsWith('+92')) return '0' + d.slice(3);
  if (d.startsWith('92')) return '0' + d.slice(2);
  return d;
};

/* ─── Naam se gender ka andaza (WhatsApp "bhai / baji" ke liye) ─── */
const FEMALE_KEYWORDS = ['baji', 'apa', 'aunty', 'madam', 'begum', 'khala', 'phupo', 'mrs', 'ms', 'miss', 'bibi', 'behn'];
const MALE_KEYWORDS = ['bhai', 'chacha', 'mamu', 'uncle', 'sir', 'mr', 'haji', 'sheikh', 'baba'];
const FEMALE_NAMES = new Set([
  'faiza','ayesha','aisha','fatima','zainab','khadija','maryam','sana','sara','hina','hira','saba','nida',
  'sadia','rabia','sidra','saima','salma','shazia','amna','asma','iqra','kiran','komal','laiba','mahira',
  'mahnoor','mehak','noor','rimsha','uzma','zoya','zara','nimra','areeba','kanwal','tania','urooj',
]);
function guessGender(name: string): 'MALE' | 'FEMALE' | null {
  if (!name) return null;
  const tokens = name.toLowerCase().trim().split(/\s+/);
  for (const t of tokens) {
    if (FEMALE_KEYWORDS.includes(t)) return 'FEMALE';
    if (MALE_KEYWORDS.includes(t)) return 'MALE';
  }
  if (FEMALE_NAMES.has(tokens[0])) return 'FEMALE';
  return null;
}

export default function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const submitLockRef = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<UpsertCustomerPayload>(empty);
  const [baseline, setBaseline] = useState<string>(JSON.stringify(empty));
  const [touched, setTouched] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [phoneCheck, setPhoneCheck] = useState('');
  const [nameCheck, setNameCheck] = useState('');

  const { data: customer } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getOne(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (customer) {
      const next: UpsertCustomerPayload = {
        name: customer.name,
        phone: customer.phone ?? '',
        email: customer.email ?? '',
        cnic: customer.cnic ?? '',
        address: customer.address ?? '',
        city: customer.city ?? '',
        area: customer.area ?? '',
        gender: customer.gender ?? undefined,
        dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.slice(0, 10) : '',
        avatarUrl: customer.avatarUrl ?? '',
        notes: customer.notes ?? '',
        creditLimit: customer.creditLimit,
        isVip: customer.isVip,
        isActive: customer.isActive,
      };
      setForm(next);
      setBaseline(JSON.stringify(next));
    }
  }, [customer]);

  const dirty = JSON.stringify(form) !== baseline;

  /* ─── 🛡️ Bina save kiye tab band karne par warning ─── */
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  /* ─── ⚠️ Duplicate phone check (debounced) ─── */
  useEffect(() => {
    const t = setTimeout(() => setPhoneCheck(cleanPhone(form.phone ?? '')), 350);
    return () => clearTimeout(t);
  }, [form.phone]);

  const phoneNormalized = normalizePhone(phoneCheck);
  const canCheckPhone = phoneNormalized.length === 11 && phoneNormalized.startsWith('03');

  const { data: phoneDupes } = useQuery({
    queryKey: ['customer-phone-dupe', phoneNormalized],
    queryFn: () => customersApi.list({ search: phoneNormalized, page: 1, limit: 5 }),
    enabled: canCheckPhone,
    staleTime: 15_000,
  });

  const duplicatePhoneCustomer = useMemo(() => {
    if (!canCheckPhone || !phoneDupes?.items) return null;
    return phoneDupes.items.find(
      (c: any) => normalizePhone(c.phone) === phoneNormalized && c.id !== id,
    ) ?? null;
  }, [phoneDupes, phoneNormalized, canCheckPhone, id]);

  /* ─── ⚠️ Duplicate NAAM check (sirf naye customer par) ─── */
  useEffect(() => {
    const t = setTimeout(() => setNameCheck((form.name ?? '').trim()), 450);
    return () => clearTimeout(t);
  }, [form.name]);

  const { data: nameDupes } = useQuery({
    queryKey: ['customer-name-dupe', nameCheck],
    queryFn: () => customersApi.list({ search: nameCheck, page: 1, limit: 5 }),
    enabled: !isEdit && nameCheck.length >= 3,
    staleTime: 15_000,
  });

  const sameNameCustomers = useMemo(() => {
    if (isEdit || !nameDupes?.items) return [];
    const q = nameCheck.toLowerCase();
    return nameDupes.items.filter((c: any) => c.name.toLowerCase() === q).slice(0, 3);
  }, [nameDupes, nameCheck, isEdit]);

  /* ─── City suggestions: Pakistan ke sheher + aap ke purane sheher ─── */
  const { data: cityPool } = useQuery({
    queryKey: ['customer-cities'],
    queryFn: () => customersApi.list({ page: 1, limit: 200, scope: 'all' }),
    staleTime: 5 * 60_000,
  });
  const cityOptions = useMemo(() => {
    const set = new Set<string>(PK_CITIES);
    (cityPool?.items ?? []).forEach((c: any) => { if (c.city?.trim()) set.add(c.city.trim()); });
    return [...set].sort();
  }, [cityPool]);
  const areaOptions = useMemo(() => {
    const set = new Set<string>();
    (cityPool?.items ?? []).forEach((c: any) => { if (c.area?.trim()) set.add(c.area.trim()); });
    return [...set].sort().slice(0, 60);
  }, [cityPool]);

  /* ─── Validation ─── */
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.name?.trim()) e.name = 'Naam zaroori hai';
    if (form.phone && !/^(\+?92|0)?3[0-9]{9}$/.test(cleanPhone(form.phone))) {
      e.phone = 'Sahi mobile likho (03XX-XXXXXXX)';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Sahi email likho';
    }
    if (form.cnic && String(form.cnic).replace(/-/g, '').length !== 13) {
      e.cnic = 'CNIC 13 digits ka hota hai';
    }
    return e;
  }, [form]);

  const showErr = (k: string) => (touched && errors[k] ? errors[k] : undefined);
  const errorCount = Object.keys(errors).length;

  /* ─── 🎂 Birthday info ─── */
  const birthdayInfo = useMemo(() => {
    if (!form.dateOfBirth) return null;
    const dob = new Date(form.dateOfBirth + 'T00:00:00');
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const hadBirthday =
      today.getMonth() > dob.getMonth() ||
      (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
    if (!hadBirthday) age -= 1;
    const isThisMonth = dob.getMonth() === today.getMonth();
    const isToday = isThisMonth && dob.getDate() === today.getDate();
    return { age: Math.max(age, 0), isThisMonth, isToday, day: dob.getDate() };
  }, [form.dateOfBirth]);

  /* ─── Gender suggestion ─── */
  const genderGuess = useMemo(
    () => (form.gender ? null : guessGender(form.name ?? '')),
    [form.name, form.gender],
  );

  /* ─── Mutations ─── */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const cleanForm: any = { ...form };
      const stringFields = ['phone', 'email', 'cnic', 'address', 'city', 'area', 'notes', 'avatarUrl', 'dateOfBirth'];
      stringFields.forEach((k) => {
        if (cleanForm[k] === '' || cleanForm[k] === null) cleanForm[k] = undefined;
      });
      if (cleanForm.name) cleanForm.name = String(cleanForm.name).trim();
      return isEdit ? customersApi.update(id!, cleanForm) : customersApi.create(cleanForm);
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => customersApi.remove(id!),
    onSuccess: () => {
      toast.success('Customer delete ho gaya');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      navigate('/customers');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail — sales history ho sakti hai'),
  });

  /** @param andNew true ho to save ke baad form khali karke agla customer likhne ke liye tayyar */
  const handleSave = useCallback(async (andNew = false) => {
    if (submitLockRef.current || saveMutation.isPending) return;
    setTouched(true);
    if (Object.keys(errors).length > 0) {
      toast.error(errors.name || 'Form mein ghalati hai — red fields theek karo');
      return;
    }
    if (duplicatePhoneCustomer && !isEdit) {
      toast.error(`Ye number pehle se "${duplicatePhoneCustomer.name}" ka hai!`);
      return;
    }
    submitLockRef.current = true;
    try {
      const saved = await saveMutation.mutateAsync();
      setBaseline(JSON.stringify(form));
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      queryClient.invalidateQueries({ queryKey: ['customers-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['customer', saved.id] });
      queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
      if (andNew && !isEdit) {
        toast.success(`"${saved.name}" ban gaya ✓ — agla likho`);
        const fresh = { ...empty, city: form.city, area: form.area };
        setForm(fresh);
        setBaseline(JSON.stringify(fresh));
        setTouched(false);
        setTimeout(() => nameRef.current?.focus(), 50);
        return;
      }
      toast.success(isEdit ? 'Customer update ho gaya ✓' : 'Customer ban gaya ✓');
      navigate(`/customers/${saved.id}`, { replace: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save nahi hua');
    } finally {
      setTimeout(() => { submitLockRef.current = false; }, 700);
    }
  }, [errors, duplicatePhoneCustomer, isEdit, saveMutation, queryClient, navigate, form]);

  const goBack = useCallback(() => {
    if (dirty && !window.confirm('Tabdeeliyan save nahi hui — phir bhi wapas jayein?')) return;
    navigate(isEdit ? `/customers/${id}` : '/customers');
  }, [dirty, navigate, isEdit, id]);

  /* ─── Keyboard: Ctrl+S / Ctrl+Enter save, Esc back ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'Enter')) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        if (showTeacher) setShowTeacher(false);
        else if (showDelete) setShowDelete(false);
        else goBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave, goBack, showTeacher, showDelete]);

  /* Completeness % for summary card */
  const completeness = useMemo(() => {
    let score = 0;
    if (form.name?.trim()) score += 30;
    if (form.phone) score += 25;
    if (form.avatarUrl) score += 15;
    if (form.city) score += 10;
    if (form.address) score += 10;
    if (form.email || form.cnic || form.dateOfBirth) score += 10;
    return score;
  }, [form]);

  const addNoteChip = (chip: string) => {
    const cur = (form.notes ?? '').trim();
    if (cur.includes(chip)) return;
    setForm({ ...form, notes: cur ? `${cur}\n${chip}` : chip });
  };

  /* WhatsApp preview — gender ke hisaab se */
  const waPreview = useMemo(() => {
    const sal = form.gender === 'FEMALE' ? ' baji' : form.gender === 'MALE' ? ' bhai' : '';
    const nm = form.name?.trim() || 'Gahak';
    return `Assalam-o-Alaikum ${nm}${sal}! 🙏 Aap ka hisaab baqi hai — jab moqa mile ada kar dein. Shukriya!`;
  }, [form.name, form.gender]);

  const saving = saveMutation.isPending;

  return (
    <div className="space-y-4 sm:space-y-5 pb-28 sm:pb-24">
      {/* ═══ MODALS ═══ */}
      {showTeacher && <CustomerFormTeacher isEdit={isEdit} onClose={() => setShowTeacher(false)} />}
      {showDelete && (
        <DeleteConfirmModal
          name={form.name}
          balance={customer?.balance ?? 0}
          loading={removeMutation.isPending}
          onClose={() => setShowDelete(false)}
          onConfirm={() => removeMutation.mutate()}
        />
      )}

      {/* ═══ BACK + TEACHER ═══ */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={goBack}
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-extrabold transition"
        >
          <ArrowLeft className="h-4 w-4" /> Wapas
        </button>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/15 border-2 border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-extrabold">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Save nahi hua
            </span>
          )}
          <button
            onClick={() => setShowTeacher(true)}
            className="h-9 px-3 rounded-xl bg-amber-100 dark:bg-amber-500/15 hover:bg-amber-200 dark:hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 text-xs font-extrabold inline-flex items-center gap-1.5 border-2 border-amber-200 dark:border-amber-500/30 transition"
          >
            <GraduationCap className="h-4 w-4" /> Guide
          </button>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 dark:from-slate-950 dark:via-blue-950 dark:to-cyan-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold shadow-2xl ring-2 ring-white/20 shrink-0 overflow-hidden ${
              form.isVip ? 'bg-gradient-to-br from-amber-400 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600'
            }`}>
              {form.avatarUrl ? (
                <img src={form.avatarUrl} className="h-full w-full object-cover" alt="" />
              ) : form.isVip ? (
                <Crown className="h-7 w-7" />
              ) : (
                form.name?.charAt(0).toUpperCase() || <User className="h-7 w-7" />
              )}
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest">
                <User className="h-3.5 w-3.5 text-amber-300" />
                {isEdit ? 'Customer Edit' : 'Naya Customer'}
                {birthdayInfo?.isThisMonth && (
                  <><span className="opacity-40">•</span><span className="text-pink-300">🎂 Is mahine salgirah!</span></>
                )}
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold leading-tight truncate">
                {form.name || 'Naya customer'}
              </h1>
              <p className="mt-0.5 text-sm text-white/80 font-bold flex items-center gap-2 flex-wrap">
                {form.phone && <span className="font-mono">{form.phone}</span>}
                {birthdayInfo && (
                  <span className="text-pink-200">🎂 {birthdayInfo.age} saal</span>
                )}
                {isEdit && Number(customer?.balance ?? 0) > 0 && (
                  <span className="text-rose-300">Khata: {formatPKR(customer!.balance)}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap shrink-0">
            {isEdit && (
              <>
                <Link to={`/customers/${id}`}>
                  <button className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition">
                    <Eye className="h-4 w-4" /> <span className="hidden sm:inline">Detail</span>
                  </button>
                </Link>
                <button
                  onClick={() => setShowDelete(true)}
                  disabled={removeMutation.isPending}
                  className="h-11 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-300/30 text-rose-100 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </>
            )}
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="h-11 px-5 rounded-xl bg-[#ffffff] text-slate-900 hover:bg-slate-100 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xl disabled:opacity-60 transition"
            >
              {saving ? (
                <><span className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4" /> {isEdit ? 'Save Karo' : 'Customer Banao'}</>
              )}
            </button>
          </div>
        </div>

        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Keyboard className="h-3 w-3 text-white/50" />
          <Kbd>Ctrl+S</Kbd><span className="text-white/60">Save</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Ctrl+Enter</Kbd><span className="text-white/60">Save</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Esc</Kbd><span className="text-white/60">Wapas</span>
        </div>
      </section>

      {/* ═══ ERROR SUMMARY ═══ */}
      {touched && errorCount > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs font-bold text-rose-800 dark:text-rose-200">
            <div className="font-extrabold text-sm mb-1">{errorCount} cheez theek karni hai:</div>
            <ul className="list-disc list-inside space-y-0.5">
              {Object.entries(errors).map(([k, v]) => <li key={k}>{v}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* ═══ MAIN GRID ═══ */}
      <div className="grid lg:grid-cols-[320px_1fr] gap-4 sm:gap-5 items-start">
        {/* ─── SIDEBAR ─── */}
        <div className="space-y-4 lg:sticky lg:top-4">
          {/* Photo */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-5 shadow-sm dark:shadow-black/20">
            <h3 className="font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Photo
            </h3>
            <AvatarUpload
              value={form.avatarUrl}
              onChange={(url) => setForm({ ...form, avatarUrl: url || '' })}
              purpose="avatar"
              shape="circle"
              size="xl"
              fallbackText={form.name || 'C'}
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-3 text-center">
              Optional — POS pe pehchan asaan hoti hai
            </p>
          </div>

          {/* Flags */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-5 shadow-sm dark:shadow-black/20 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <Crown className="h-4 w-4 text-amber-500" /> Flags
            </h3>
            <FlagToggle
              checked={form.isVip ?? false}
              onChange={(v: boolean) => setForm({ ...form, isVip: v })}
              icon={<Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
              title="VIP Customer"
              sub="Premium tier — khaas treatment"
              activeCls="from-amber-50 to-orange-50 dark:from-amber-500/15 dark:to-orange-500/10 border-amber-300 dark:border-amber-500/40"
            />
            <FlagToggle
              checked={form.isActive ?? true}
              onChange={(v: boolean) => setForm({ ...form, isActive: v })}
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
              title="Active"
              sub="POS aur lists mein dikhega"
              activeCls="from-emerald-50 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/10 border-emerald-300 dark:border-emerald-500/40"
            />
          </div>

          {/* 📊 Live stats (edit mode) */}
          {isEdit && customer && (
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-5 shadow-sm dark:shadow-black/20">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm mb-3">
                <ShoppingBag className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Is Ka Hisaab
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <MiniStat label="Kul Kharch" value={formatPKR(customer.totalSpent)} tone="emerald" />
                <MiniStat label="Khata Baqi" value={customer.balance > 0 ? formatPKR(customer.balance) : 'Clear ✓'} tone={customer.balance > 0 ? 'rose' : 'slate'} />
                <MiniStat label="Sales" value={String(customer._count?.sales ?? 0)} tone="blue" />
                <MiniStat label="Points" value={Number(customer.loyaltyPoints ?? 0).toLocaleString()} tone="amber" />
              </div>
              {customer.stats?.averageSale > 0 && (
                <p className="mt-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center">
                  Har bar ausatan {formatPKR(customer.stats.averageSale)} ka saudaa
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link to={`/customers/${id}`}
                  className="h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-extrabold inline-flex items-center justify-center gap-1.5 transition">
                  <Eye className="h-3.5 w-3.5" /> Poori Detail
                </Link>
                <Link to="/khata"
                  className="h-9 rounded-xl bg-rose-100 dark:bg-rose-500/15 hover:bg-rose-200 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 text-[11px] font-extrabold inline-flex items-center justify-center gap-1.5 transition">
                  <BookOpen className="h-3.5 w-3.5" /> Khata
                </Link>
              </div>
            </div>
          )}

          {/* Live summary */}
          <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 dark:from-slate-800/60 dark:to-slate-900/80 border-2 border-slate-700 dark:border-slate-700 p-5 shadow-lg text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-300" /> Profile Summary
              </h3>
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                completeness >= 70 ? 'bg-emerald-500/20 text-emerald-300' : completeness >= 40 ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-white/60'
              }`}>
                {completeness}%
              </span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  completeness >= 70 ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : completeness >= 40 ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-white/30'
                }`}
                style={{ width: `${completeness}%` }}
              />
            </div>
            <div className="mt-3 space-y-1.5 text-[11px] font-bold">
              <SummaryRow ok={!!form.phone} label="Phone (WhatsApp ke liye)" />
              <SummaryRow ok={!!form.dateOfBirth} label="Birthday (salgirah wishes)" />
              <SummaryRow ok={!!form.city} label="City / Area" />
              <SummaryRow ok={!!form.address} label="Address" />
              <SummaryRow ok={(form.creditLimit ?? 0) > 0} label="Credit limit set" optional />
            </div>
            {form.phone && (
              <div className="mt-3 rounded-xl bg-white/5 border border-white/10 p-2.5 space-y-1.5">
                <div className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageCircle className="h-3 w-3" /> WhatsApp preview
                </div>
                <p className="text-[11px] font-semibold text-white/80 leading-relaxed">{waPreview}</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── FORM SECTIONS ─── */}
        <div className="space-y-4 sm:space-y-5">
          {/* Personal Info */}
          <Section icon={<User className="h-4 w-4 text-blue-600 dark:text-blue-400" />} title="Personal Info" badge="Zaroori">
            <Field label="Poora Naam" required error={showErr('name')}>
              <input
                ref={nameRef}
                autoFocus={!isEdit}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onBlur={() => setTouched(true)}
                placeholder="Ali Raza"
                maxLength={80}
                className={inputCls('h-12 text-base font-extrabold', !!showErr('name'))}
              />
              {sameNameCustomers.length > 0 && (
                <div className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-2.5 flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Isi naam ka customer pehle se hai:{' '}
                    {sameNameCustomers.map((c: any, i: number) => (
                      <span key={c.id}>
                        {i > 0 && ', '}
                        <Link to={`/customers/${c.id}`} className="font-black underline hover:text-amber-700">
                          {c.name}{c.phone ? ` (${c.phone})` : ''}
                        </Link>
                      </span>
                    ))}
                    . Wahi banda hai to naya mat banao.
                  </div>
                </div>
              )}
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Phone" error={showErr('phone')} hint="WhatsApp ke liye">
                <div className="relative">
                  <Phone className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    value={form.phone ?? ''}
                    onChange={(e) => setForm({ ...form, phone: formatPhoneInput(e.target.value) })}
                    placeholder="0300-1234567"
                    inputMode="tel"
                    className={inputCls('h-11 font-bold font-mono pl-10', !!showErr('phone') || !!duplicatePhoneCustomer)}
                  />
                </div>
                {/* ⚠️ DUPLICATE PHONE WARNING */}
                {duplicatePhoneCustomer && (
                  <div className="mt-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-2.5 flex items-start gap-2">
                    <CopyX className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="text-xs font-bold text-rose-800 dark:text-rose-200">
                      Ye number pehle se{' '}
                      <Link to={`/customers/${duplicatePhoneCustomer.id}`} className="font-black underline hover:text-rose-600">
                        {duplicatePhoneCustomer.name}
                      </Link>{' '}
                      ka hai! Same banda hai to wahi use karo.
                    </div>
                  </div>
                )}
              </Field>
              <Field label="Email" error={showErr('email')} hint="optional">
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={form.email ?? ''}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="ali@example.com"
                    className={inputCls('h-11 font-bold pl-10', !!showErr('email'))}
                  />
                </div>
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="CNIC" error={showErr('cnic')} hint="auto-format">
                <div className="relative">
                  <CreditCard className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    value={form.cnic ?? ''}
                    onChange={(e) => setForm({ ...form, cnic: formatCnic(e.target.value) })}
                    placeholder="12345-6789012-3"
                    inputMode="numeric"
                    className={inputCls('h-11 font-bold font-mono pl-10', !!showErr('cnic'))}
                  />
                </div>
              </Field>
              <Field label="Date of Birth" hint="birthday wishes ke liye">
                <div className="relative">
                  <CalendarDays className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={form.dateOfBirth ?? ''}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    className={inputCls('h-11 font-bold pl-10 [color-scheme:light] dark:[color-scheme:dark]')}
                  />
                </div>
                {birthdayInfo && (
                  <div className={`mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold ${
                    birthdayInfo.isToday
                      ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300'
                      : birthdayInfo.isThisMonth
                        ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    <Cake className="h-3 w-3" />
                    {birthdayInfo.isToday
                      ? `🎉 AAJ salgirah hai — ${birthdayInfo.age} saal!`
                      : birthdayInfo.isThisMonth
                        ? `Is mahine ${birthdayInfo.day} ko — ${birthdayInfo.age} saal ke honge`
                        : `Age: ${birthdayInfo.age} saal`}
                  </div>
                )}
              </Field>
            </div>

            <Field label="Gender">
              <div className="flex gap-2 flex-wrap">
                {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm({ ...form, gender: form.gender === g ? undefined : g })}
                    className={`h-11 px-5 rounded-xl border-2 text-sm font-extrabold transition ${
                      form.gender === g
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-300 dark:hover:border-blue-500/50'
                    }`}
                  >
                    {g === 'MALE' ? '👨 Male' : g === 'FEMALE' ? '👩 Female' : '🧑 Other'}
                  </button>
                ))}
              </div>
              {genderGuess ? (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, gender: genderGuess })}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-100 dark:bg-violet-500/15 border-2 border-violet-300 dark:border-violet-500/40 text-violet-800 dark:text-violet-200 text-[11px] font-extrabold hover:bg-violet-200 dark:hover:bg-violet-500/25 transition"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Naam se lagta hai {genderGuess === 'FEMALE' ? '👩 Female' : '👨 Male'} — set karein?
                </button>
              ) : (
                <div className="mt-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  💡 WhatsApp reminders me "bhai / baji" sahi lagane ke liye
                </div>
              )}
            </Field>
          </Section>

          {/* Location */}
          <Section icon={<MapPin className="h-4 w-4 text-rose-600 dark:text-rose-400" />} title="Location" badge="Delivery ke liye">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="City" hint="likhte hi suggestions">
                <div className="relative">
                  <Building2 className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    list="nafaa-city-options"
                    value={form.city ?? ''}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Lahore"
                    className={inputCls('h-11 font-bold pl-10')}
                  />
                </div>
                <datalist id="nafaa-city-options">
                  {cityOptions.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
              <Field label="Area / Mohalla">
                <input
                  list="nafaa-area-options"
                  value={form.area ?? ''}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  placeholder="Gulberg"
                  className={inputCls('h-11 font-bold')}
                />
                <datalist id="nafaa-area-options">
                  {areaOptions.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
            </div>
            <Field label="Poora Address">
              <textarea
                rows={2}
                value={form.address ?? ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Ghar #, Gali, Area, Landmark"
                className={inputCls('py-2 font-semibold resize-none')}
              />
            </Field>
          </Section>

          {/* Credit & Notes */}
          <Section icon={<CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />} title="Credit & Notes" badge="Udhaar control">
            <Field label="Credit Limit (PKR)" hint="0 = unlimited udhaar">
              <div className="relative">
                <Wallet className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="number"
                  min={0}
                  value={String(form.creditLimit ?? 0)}
                  onChange={(e) => setForm({ ...form, creditLimit: Math.max(0, Number(e.target.value) || 0) })}
                  className={inputCls('h-12 text-base font-extrabold pl-10 tabular-nums')}
                />
              </div>
              <div className="mt-2 flex gap-1.5 flex-wrap">
                {CREDIT_CHIPS.map((v) => {
                  const active = (form.creditLimit ?? 0) === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm({ ...form, creditLimit: v })}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border-2 transition ${
                        active
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                      }`}
                    >
                      {v === 0 ? '♾️ Unlimited' : formatPKR(v)}
                    </button>
                  );
                })}
              </div>
              {(form.creditLimit ?? 0) > 0 ? (
                <div className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  ✓ Is customer ko max <strong>{formatPKR(form.creditLimit ?? 0)}</strong> tak udhaar milega — is se upar POS khud rok dega
                </div>
              ) : (
                <div className="mt-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                  ⚠️ Limit 0 hai — jitna marzi udhaar chala jayega. Naye gahak ke liye limit lagana behtar hai.
                </div>
              )}
            </Field>

            <Field label="Notes" hint="internal — customer ko nahi dikhta">
              <textarea
                rows={4}
                value={form.notes ?? ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Pasand, size, khaas baatein..."
                className={inputCls('py-2 font-semibold resize-none')}
              />
              {/* 📝 Quick note chips */}
              <div className="mt-2 flex gap-1.5 flex-wrap">
                {NOTE_CHIPS.map((chip) => {
                  const used = (form.notes ?? '').includes(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => addNoteChip(chip)}
                      disabled={used}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition ${
                        used
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-300 dark:border-emerald-500/40'
                          : 'bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-500/50'
                      }`}
                    >
                      {used ? '✓ ' : '+ '}{chip}
                    </button>
                  );
                })}
              </div>
            </Field>
          </Section>
        </div>
      </div>

      {/* ═══ STICKY ACTION BAR — mobile aur desktop dono pe ═══ */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t-2 border-slate-200 dark:border-slate-800 p-3">
        <div className="mx-auto max-w-6xl flex items-center gap-2">
          <button onClick={goBack}
            className="h-12 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition shrink-0">
            <X className="h-4 w-4" /> <span className="hidden sm:inline">Cancel</span>
          </button>

          <div className="hidden md:block flex-1 text-xs font-bold text-slate-500 dark:text-slate-400 truncate px-2">
            {errorCount > 0 && touched
              ? <span className="text-rose-600 dark:text-rose-400">{errorCount} field theek karni hai</span>
              : dirty
                ? 'Tabdeeliyan save nahi hui — Ctrl+S dabao'
                : isEdit ? 'Sab save hai ✓' : 'Sirf naam zaroori hai — baqi baad me bhi bhar sakte ho'}
          </div>

          {!isEdit && (
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="h-12 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg shadow-emerald-500/30 disabled:opacity-50 transition"
              title="Save karke foran agla customer likho"
            >
              <Plus className="h-4 w-4" /> Save + <span className="hidden sm:inline">Naya</span>
            </button>
          )}

          <Button
            className="flex-1 md:flex-none md:px-8 h-12 bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 font-extrabold shadow-lg shadow-blue-500/40"
            onClick={() => handleSave()}
            loading={saving}
          >
            <Save className="h-4 w-4" /> {isEdit ? 'Save Karo' : 'Customer Banao'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   DELETE CONFIRM MODAL — balance warning ke sath
   ═════════════════════════════════════════════════════════════ */
function DeleteConfirmModal({ name, balance, loading, onClose, onConfirm }: any) {
  const hasBalance = Number(balance ?? 0) > 0;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-500/40 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-rose-500 to-red-700 text-white mx-auto flex items-center justify-center shadow-lg shadow-rose-500/40">
            <Trash2 className="h-7 w-7" />
          </div>
          <h3 className="mt-3 text-lg font-extrabold text-slate-900 dark:text-white">
            "{name}" delete karein?
          </h3>
          {hasBalance && (
            <div className="mt-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-3 text-xs font-extrabold text-rose-800 dark:text-rose-200 flex items-center justify-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {formatPKR(balance)} udhaar baqi hai — pehle wusooli karo!
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Ye action undo nahi ho sakta. Sales history mehfooz rahegi — sirf customer record hatega.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 bg-gradient-to-r from-rose-600 to-red-700 font-extrabold shadow-lg shadow-rose-500/40"
              onClick={onConfirm}
              loading={loading}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   🎓 FORM TEACHER
   ═════════════════════════════════════════════════════════════ */
function CustomerFormTeacher({ isEdit, onClose }: { isEdit: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-blue-200 dark:border-blue-500/30 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/15 dark:to-cyan-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> {isEdit ? 'Customer Edit Kaise Karein?' : 'Naya Customer Kaise Banayein?'}
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Sirf <strong>naam zaroori</strong> hai — baqi sab optional. Lekin jitna zyada bharo ge, utna zyada faida:
          </p>

          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>📱 Phone sab se important</strong> — WhatsApp reminders isi se jate hain. Number khud format ho jata hai, <strong>+92 / 92 apne aap 0</strong> ban jata hai. Agar number pehle se kisi ka hai to <strong>foran warning</strong> milegi</TipRow>
            <TipRow><strong>👥 Naam bhi check hota hai</strong> — same naam ka gahak pehle se ho to upar bata diya jata hai, taake do bar entry na ho</TipRow>
            <TipRow><strong>🎂 Birthday likho</strong> — age khud niklegi aur list page pe birthday strip me customer dikhega (1-click wish!)</TipRow>
            <TipRow><strong>👤 Gender</strong> — is se WhatsApp me "bhai / baji" sahi lagta hai. Naam se andaza bhi ho jata hai — 1 click me set</TipRow>
            <TipRow><strong>🏙️ City / Area</strong> — likhte hi purane sheher suggest hote hain, spelling ek jaisi rehti hai</TipRow>
            <TipRow><strong>💳 Credit Limit</strong> — is se zyada udhaar nahi jayega, POS khud rok dega. Neeche chips se 1 click me set (0 = unlimited)</TipRow>
            <TipRow><strong>📝 Notes chips</strong> — 1 click me ready notes ("Regular customer", "Bulk buyer"...)</TipRow>
            <TipRow><strong>👑 VIP flag</strong> — premium customers ko amber card + crown milta hai</TipRow>
          </div>

          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-black text-emerald-800 dark:text-emerald-200 mb-1">⚡ Tez Kaam</div>
            <TipRow><strong>💾 "Save + Naya"</strong> — purani copy/register se data daal rahe ho? Save hote hi form khali ho jata hai aur cursor naam pe aa jata hai. City/Area wahi rehte hain</TipRow>
            <TipRow><strong>🛡️ Bina save kiye</strong> page chhodne ki koshish karo to warning milti hai — mehnat zaya nahi hoti</TipRow>
            <TipRow><strong>📊 Edit mode me</strong> sidebar pe live kharch, khata, sales aur points nazar aate hain — sath hi khata page ka link</TipRow>
            <TipRow><strong>⌨️ Ctrl+S</strong> ya <strong>Ctrl+Enter</strong> — save &nbsp;•&nbsp; <strong>Esc</strong> — wapas</TipRow>
          </div>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 text-xs font-semibold text-amber-900 dark:text-amber-200 flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <span><strong>Yaad rakho:</strong> Phone ke baghair WhatsApp reminders nahi ja sakte — udhaar wusooli mushkil ho jati hai!</span>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 font-extrabold shadow-lg shadow-blue-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */
function Section({ icon, title, badge, children }: any) {
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm dark:shadow-black/20 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm">{icon} {title}</h3>
        {badge && (
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, hint, error, children }: any) {
  return (
    <div>
      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
        {hint && <span className="text-slate-400 dark:text-slate-500 normal-case font-bold ml-1">({hint})</span>}
      </label>
      {children}
      {error && (
        <div className="mt-1 text-xs font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> {error}
        </div>
      )}
    </div>
  );
}

function FlagToggle({ checked, onChange, icon, title, sub, activeCls }: any) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition text-left ${
        checked
          ? `bg-gradient-to-br ${activeCls}`
          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {icon}
        <div>
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">{title}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{sub}</div>
        </div>
      </div>
      <div className={`h-6 w-11 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'rose' | 'blue' | 'amber' | 'slate' }) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
    rose: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400',
    blue: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400',
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400',
    slate: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300',
  };
  return (
    <div className={`rounded-xl border px-2.5 py-2 ${tones[tone]}`}>
      <div className="text-[9px] font-extrabold uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-sm font-extrabold truncate tabular-nums">{value}</div>
    </div>
  );
}

function SummaryRow({ ok, label, optional }: any) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
      ) : (
        <div className="h-3.5 w-3.5 rounded-full border-2 border-white/25 shrink-0" />
      )}
      <span className={ok ? 'text-white/90' : 'text-white/50'}>
        {label}{optional && !ok && <span className="text-white/30"> (optional)</span>}
      </span>
    </div>
  );
}

function inputCls(extra = '', error = false) {
  return [
    'w-full rounded-xl border-2 px-3',
    'bg-white dark:bg-slate-800',
    'text-slate-900 dark:text-white',
    'placeholder:text-slate-400 dark:placeholder:text-slate-500',
    error
      ? 'border-rose-400 dark:border-rose-500/60 focus:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-500/30'
      : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-200 dark:focus:ring-blue-500/30',
    'focus:outline-none focus:ring-2 transition',
    extra,
  ].join(' ');
}

function TipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

/**
 * <span> hai, <kbd> nahi — index.css ka global `html.dark kbd {}` rule
 * specificity me utility classes ko hara deta tha aur chip ghayab ho jati thi.
 */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm text-[10px]">
      {children}
    </span>
  );
}
