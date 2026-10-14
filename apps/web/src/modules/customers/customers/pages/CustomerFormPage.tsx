/**
 * Add or edit a customer, the same form for every industry. Only the name is
 * required. Warns when the phone or name is already used, formats phone and
 * CNIC as they are typed, suggests cities and areas from earlier customers,
 * and on a new customer leaves the credit limit to the shop default unless
 * one is typed. "Save + naya" clears the form for the next entry (for shops
 * copying a paper register).
 *
 * Keys: Ctrl+S or Ctrl+Enter save · Ctrl+Shift+S save + naya · Esc back · G guide.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowLeft, BookOpen, Building2, Cake, CalendarDays, CopyX, Crown, Eye, GraduationCap, IdCard, Info,
  Mail, MapPin, Phone, Plus, Save, Sparkles, UserRound, Wallet,
} from 'lucide-react';
import { Button, Card, Input, Kbd, PageShell, Skeleton, Switch, Textarea } from '@/design-system/components';
import { AvatarUpload } from '@core/components/uploads';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { directoryApi } from '@modules/customers/directory/api';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { customersApi, type CustomerGender, type UpsertCustomerPayload } from '@modules/customers/customers/api/customers.api';

interface Form {
  name: string; phone: string; email: string; cnic: string; ntn: string; address: string; city: string; area: string;
  gender: '' | CustomerGender; dateOfBirth: string; avatarUrl: string; notes: string;
  /** Kept as text so a new customer can leave it empty and get the shop default. */
  creditLimit: string; isVip: boolean; isActive: boolean;
}

const EMPTY: Form = {
  name: '', phone: '', email: '', cnic: '', ntn: '', address: '', city: '', area: '', gender: '', dateOfBirth: '', avatarUrl: '', notes: '',
  creditLimit: '', isVip: false, isActive: true,
};

const NOTE_CHIPS = ['Regular customer', 'Udhaar time par deta hai', 'Udhaar der se deta hai', 'Bulk buyer', 'Ghar par delivery', 'Sirf cash'];
const CREDIT_CHIPS = [5000, 10000, 25000, 50000, 100000];
const PK_CITIES = [
  'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot', 'Hyderabad',
  'Bahawalpur', 'Sargodha', 'Sukkur', 'Sahiwal', 'Sheikhupura', 'Jhang', 'Gujrat', 'Mardan', 'Abbottabad', 'Mirpur', 'Okara',
  'Rahim Yar Khan', 'Dera Ghazi Khan', 'Kasur', 'Chiniot', 'Nawabshah',
];
const GENDERS: Array<{ id: CustomerGender; label: string }> = [{ id: 'MALE', label: 'Mard' }, { id: 'FEMALE', label: 'Aurat' }, { id: 'OTHER', label: 'Doosra' }];

/** 12345-6789012-3 while typing. */
const formatCnic = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
};

/** +923001234567 / 923001234567 → 0300-1234567 while typing. */
const formatPhone = (v: string) => {
  let d = v.replace(/\D/g, '');
  if (d.startsWith('92')) d = `0${d.slice(2)}`;
  d = d.slice(0, 11);
  return d.length <= 4 ? d : `${d.slice(0, 4)}-${d.slice(4)}`;
};

/** Any stored format → 03001234567. */
const normalizePhone = (v: string | null | undefined) => {
  const d = String(v ?? '').replace(/\D/g, '');
  return d.startsWith('92') ? `0${d.slice(2)}` : d;
};

/** Guess from common words and names, used for "bhai / baji" in WhatsApp messages. */
const FEMALE_WORDS = ['baji', 'apa', 'aunty', 'madam', 'begum', 'khala', 'phupo', 'mrs', 'ms', 'miss', 'bibi', 'behn'];
const MALE_WORDS = ['bhai', 'chacha', 'mamu', 'uncle', 'sir', 'mr', 'haji', 'sheikh', 'baba'];
const FEMALE_NAMES = new Set([
  'faiza', 'ayesha', 'aisha', 'fatima', 'zainab', 'khadija', 'maryam', 'sana', 'sara', 'hina', 'hira', 'saba', 'nida', 'sadia', 'rabia',
  'sidra', 'saima', 'salma', 'shazia', 'amna', 'asma', 'iqra', 'kiran', 'komal', 'laiba', 'mahira', 'mahnoor', 'mehak', 'noor', 'rimsha',
  'uzma', 'zoya', 'zara', 'nimra', 'areeba', 'kanwal', 'tania', 'urooj',
]);
function guessGender(name: string): CustomerGender | null {
  const words = name.toLowerCase().trim().split(/\s+/).filter(Boolean);
  for (const w of words) {
    if (FEMALE_WORDS.includes(w)) return 'FEMALE';
    if (MALE_WORDS.includes(w)) return 'MALE';
  }
  return words[0] && FEMALE_NAMES.has(words[0]) ? 'FEMALE' : null;
}

/** Form fields → API payload. On edit an empty string clears a field; on create it is left out. */
function toPayload(f: Form, editing: boolean): UpsertCustomerPayload {
  const opt = (v: string) => (v.trim() ? v.trim() : editing ? '' : undefined);
  const limit = f.creditLimit.trim();
  return {
    name: f.name.trim(),
    phone: opt(f.phone), email: opt(f.email), cnic: opt(f.cnic), ntn: opt(f.ntn), address: opt(f.address), city: opt(f.city), area: opt(f.area),
    gender: (f.gender || (editing ? '' : undefined)) as CustomerGender | undefined,
    dateOfBirth: opt(f.dateOfBirth), avatarUrl: opt(f.avatarUrl), notes: opt(f.notes),
    creditLimit: limit ? Math.max(Number(limit) || 0, 0) : editing ? 0 : undefined,
    isVip: f.isVip, isActive: f.isActive,
  };
}

export default function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const editing = !!id;
  const lock = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const [f, setF] = useState<Form>(EMPTY);
  const [baseline, setBaseline] = useState(JSON.stringify(EMPTY));
  const [tried, setTried] = useState(false);
  const [blurred, setBlurred] = useState<Record<string, boolean>>({});
  const [phoneAck, setPhoneAck] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const blur = (k: keyof Form) => () => setBlurred((b) => (b[k] ? b : { ...b, [k]: true }));

  const customerQ = useQuery({ queryKey: ['customer', id], queryFn: () => customersApi.getOne(id!), enabled: editing });
  const customer = customerQ.data;
  const settingsQ = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get(), staleTime: 5 * 60_000, retry: false, enabled: !editing });
  const shopLimit = settingsQ.data?.settings?.defaultCreditLimit;

  useEffect(() => {
    if (!customer) return;
    const next: Form = {
      name: customer.name, phone: customer.phone ?? '', email: customer.email ?? '', cnic: customer.cnic ?? '', ntn: customer.ntn ?? '',
      address: customer.address ?? '', city: customer.city ?? '', area: customer.area ?? '', gender: customer.gender ?? '',
      dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.slice(0, 10) : '', avatarUrl: customer.avatarUrl ?? '', notes: customer.notes ?? '',
      creditLimit: customer.creditLimit ? String(customer.creditLimit) : '', isVip: customer.isVip, isActive: customer.isActive,
    };
    setF(next);
    setBaseline(JSON.stringify(next));
  }, [customer]);

  const dirty = JSON.stringify(f) !== baseline;
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  /* Duplicate checks, debounced. */
  const [phoneKey, setPhoneKey] = useState('');
  const [nameKey, setNameKey] = useState('');
  useEffect(() => { const t = setTimeout(() => setPhoneKey(normalizePhone(f.phone)), 350); return () => clearTimeout(t); }, [f.phone]);
  useEffect(() => { const t = setTimeout(() => setNameKey(f.name.trim()), 450); return () => clearTimeout(t); }, [f.name]);
  useEffect(() => setPhoneAck(false), [phoneKey]);

  const phoneReady = /^03\d{9}$/.test(phoneKey);
  const phoneDupesQ = useQuery({
    queryKey: ['customer-phone-dupe', phoneKey],
    // The directory matches any stored phone format (0300-…, +92…), unlike a plain text search.
    queryFn: () => directoryApi.list({ search: phoneKey, status: 'all', type: 'all', activity: 'all', sort: 'recent', scope: 'all' }, 1, 5),
    enabled: phoneReady,
    staleTime: 15_000,
  });
  const phoneClash = useMemo(
    () => (phoneReady ? phoneDupesQ.data?.items.find((c) => c.id !== id && normalizePhone(c.phone) === phoneKey) ?? null : null),
    [phoneReady, phoneDupesQ.data, phoneKey, id],
  );

  const nameDupesQ = useQuery({
    queryKey: ['customer-name-dupe', nameKey],
    queryFn: () => customersApi.list({ search: nameKey, page: 1, limit: 8, scope: 'all' }),
    enabled: nameKey.length >= 3,
    staleTime: 15_000,
  });
  const nameClash = useMemo(() => {
    const q = nameKey.toLowerCase();
    return (nameDupesQ.data?.items ?? []).filter((c) => c.id !== id && c.name.trim().toLowerCase() === q).slice(0, 3);
  }, [nameDupesQ.data, nameKey, id]);

  /* City and area suggestions: Pakistani cities plus what this shop already uses. */
  const poolQ = useQuery({ queryKey: ['customer-cities'], queryFn: () => customersApi.list({ page: 1, limit: 200, scope: 'all' }), staleTime: 5 * 60_000 });
  const cities = useMemo(() => {
    const s = new Set(PK_CITIES);
    (poolQ.data?.items ?? []).forEach((c) => { if (c.city?.trim()) s.add(c.city.trim()); });
    return [...s].sort();
  }, [poolQ.data]);
  const areas = useMemo(() => {
    const s = new Set<string>();
    (poolQ.data?.items ?? []).forEach((c) => { if (c.area?.trim()) s.add(c.area.trim()); });
    return [...s].sort().slice(0, 60);
  }, [poolQ.data]);

  // Format checks run only on values typed here, so an old record saved in another format can still be edited.
  const errors = useMemo(() => {
    const old = JSON.parse(baseline) as Form;
    const typed = (k: 'phone' | 'email' | 'cnic') => !!f[k].trim() && f[k] !== old[k];
    const e: Partial<Record<keyof Form, string>> = {};
    if (!f.name.trim()) e.name = 'Naam likhein';
    if (typed('phone') && !/^03\d{9}$/.test(normalizePhone(f.phone))) e.phone = 'Mobile number 03 se shuru, 11 hindsay (0300-1234567)';
    if (typed('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Email theek nahi — misaal: ali@gmail.com';
    if (typed('cnic') && f.cnic.replace(/\D/g, '').length !== 13) e.cnic = 'CNIC 13 hindsay ka hota hai';
    if (f.creditLimit.trim() && !(Number(f.creditLimit) >= 0)) e.creditLimit = 'Limit sirf number me likhein';
    if (f.dateOfBirth && f.dateOfBirth > new Date().toISOString().slice(0, 10)) e.dateOfBirth = 'Aane wali date nahi ho sakti';
    return e;
  }, [f, baseline]);
  const err = (k: keyof Form) => ((tried || blurred[k]) ? errors[k] : undefined);
  const problems = [
    ...Object.values(errors),
    ...(phoneClash && !phoneAck ? [`Yeh number pehle se ${phoneClash.name} ka hai — upar tasdeeq karein`] : []),
  ];

  const birthday = useMemo(() => {
    if (!f.dateOfBirth) return null;
    const dob = new Date(`${f.dateOfBirth}T00:00:00`);
    if (Number.isNaN(dob.getTime())) return null;
    const now = new Date();
    const had = now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
    const age = Math.max(now.getFullYear() - dob.getFullYear() - (had ? 0 : 1), 0);
    const thisMonth = dob.getMonth() === now.getMonth();
    return { age, thisMonth, today: thisMonth && dob.getDate() === now.getDate(), day: dob.getDate() };
  }, [f.dateOfBirth]);
  const genderGuess = f.gender ? null : guessGender(f.name);

  const save = useMutation({
    mutationFn: async (_andNew: boolean) => {
      const body = toPayload(f, editing);
      return editing ? customersApi.update(id!, body) : customersApi.create(body);
    },
    onSuccess: (saved, andNew) => {
      ['customers', 'customers-stats', 'customers-analytics', 'customers-for-pos', 'customer-directory', 'customer-cities'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      qc.invalidateQueries({ queryKey: ['customer', saved.id] });
      if (andNew && !editing) {
        toast.success(`${saved.name} jur gaya — agla likhein`);
        const fresh = { ...EMPTY, city: f.city, area: f.area };
        setF(fresh);
        setBaseline(JSON.stringify(fresh));
        setTried(false);
        setBlurred({});
        setTimeout(() => nameRef.current?.focus(), 50);
        return;
      }
      setBaseline(JSON.stringify(f));
      toast.success(editing ? 'Save ho gaya' : `${saved.name} jur gaya`);
      navigate(`/customers/${saved.id}`, { replace: true });
    },
    onError: (e: any) => {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'Save nahi hua — dobara koshish karein');
    },
    onSettled: () => { lock.current = false; },
  });

  const submit = useCallback((andNew = false) => {
    if (lock.current || save.isPending) return;
    setTried(true);
    if (problems.length) { toast.error(problems[0]); return; }
    lock.current = true;
    save.mutate(andNew);
  }, [problems, save]);

  const goBack = useCallback(() => {
    if (dirty && !window.confirm('Tabdeeli save nahi hui — phir bhi wapas jayein?')) return;
    navigate(editing ? `/customers/${id}` : '/customers');
  }, [dirty, navigate, editing, id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 's' || e.key === 'S' || e.key === 'Enter')) {
        e.preventDefault();
        if (!isDialogOpen()) submit(e.shiftKey && !editing);
      } else if (e.key === 'Escape' && !isDialogOpen()) {
        goBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submit, goBack, editing]);

  const addNote = (chip: string) => {
    const cur = f.notes.trim();
    if (!cur.includes(chip)) set('notes', cur ? `${cur}\n${chip}` : chip);
  };

  if (editing && customerQ.isLoading) {
    return <PageShell><Skeleton className="h-24 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div></PageShell>;
  }
  if (editing && !customer) {
    return (
      <PageShell>
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Yeh customer nahi mila</p>
          <Button className="mt-3" variant="secondary" onClick={() => navigate('/customers')}>Customers par wapas</Button>
        </div>
      </PageShell>
    );
  }

  const limit = Number(f.creditLimit) || 0;
  const saving = save.isPending;

  return (
    <PageShell>
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <button type="button" onClick={goBack} aria-label="Wapas (Esc)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{editing ? `${customer?.name} — badlein` : 'Naya customer'}</h1>
          <p className="text-[0.8125rem] text-white/75">
            {editing ? 'Jo badalna hai badlein — baqi waisa hi rahega' : 'Sirf naam zaroori hai. Phone daal dein to WhatsApp par bill aur yaad-dihani ja sakegi.'}
          </p>
        </div>
        {dirty && <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[0.75rem] font-semibold text-amber-100 ring-1 ring-amber-300/40">Save nahi hua</span>}
        <span className="hidden items-center gap-1.5 text-[0.75rem] text-white/70 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</span>
        <button type="button" onClick={guide.open} title="Guide (G)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><GraduationCap className="h-4 w-4" /></button>
      </div>

      {guide.isOpen && (
        <PageGuide title={editing ? 'Customer kaise badlein' : 'Customer kaise jorein'} onClose={guide.close}
          steps={[
            { icon: UserRound, color: '#16a34a', title: 'Naam aur phone', text: 'Sirf naam zaroori hai. Phone daalein to WhatsApp par bill aur udhaar ki yaad-dihani bhej sakenge. +92 khud 0 ban jata hai.' },
            { icon: CopyX, color: '#e11d48', title: 'Dobara na banayein', text: 'Number ya naam pehle se ho to form bata deta hai. Wahi banda ho to purana customer kholein — khata ek hi jagah rahega.' },
            { icon: Wallet, color: '#d97706', title: 'Udhaar ki limit', text: 'Is se zyada udhaar POS par nahi jayega. Naye customer par khali chhorein to dukaan ki default limit lagti hai; 0 = koi had nahi.' },
            { icon: Building2, color: '#7c3aed', title: 'Band karna', text: 'Jo customer ab nahi aata use mitane ki bajaye "Chalu customer" band kar dein — purane bill aur khata mehfooz rehte hain.' },
          ]}
          tips={['Register se data daal rahe hain? "Save + naya" dabayein — form khali ho jata hai aur shehar/ilaqa wahi rehta hai.', 'Salgirah likhein to customers ki list me is mahine wale nazar aate hain.']}
          shortcuts={[['Ctrl+S', 'save'], ...(editing ? [] : [['Ctrl+Shift+S', 'save + naya'] as [string, string]]), ['Esc', 'wapas'], ['G', 'guide']]}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={UserRound}>Customer</T>}>
            <div className="space-y-3">
              <Input ref={nameRef} autoFocus={!editing} label="Poora naam" required value={f.name} onChange={(e) => set('name', e.target.value)} onBlur={blur('name')}
                maxLength={100} placeholder="Ali Raza" size="lg" error={err('name')} hint="Bill, khata aur WhatsApp par yahi naam aata hai" />
              {nameClash.length > 0 && (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Isi naam ka customer pehle se hai:{' '}
                    {nameClash.map((c, i) => (
                      <span key={c.id}>{i > 0 && ', '}<Link to={`/customers/${c.id}`} className="font-semibold underline">{c.name}{c.phone ? ` (${c.phone})` : ''}</Link></span>
                    ))}
                    . Wahi banda hai to naya na banayein.
                  </span>
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Input label="Phone" inputMode="tel" value={f.phone} onChange={(e) => set('phone', formatPhone(e.target.value))} onBlur={blur('phone')}
                    placeholder="0300-1234567" leftIcon={<Phone className="h-4 w-4" />} error={err('phone')} className="font-mono"
                    hint="WhatsApp wala number — bill aur udhaar ki yaad-dihani isi par" />
                  {phoneClash && (
                    <div className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-900 ring-1 ring-rose-200">
                      <p className="flex items-start gap-2">
                        <CopyX className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Yeh number pehle se <Link to={`/customers/${phoneClash.id}`} className="font-semibold underline">{phoneClash.name}</Link> ka hai. Wahi banda hai to us ka khata kholein.</span>
                      </p>
                      <label className="mt-1.5 flex items-center gap-2 text-[0.75rem]">
                        <input type="checkbox" checked={phoneAck} onChange={(e) => setPhoneAck(e.target.checked)} className="h-4 w-4 accent-rose-600" />
                        Haan, yeh alag banda hai (ghar ka number saanjha hai)
                      </label>
                    </div>
                  )}
                </div>
                <Input label="Email" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} onBlur={blur('email')} placeholder="ali@gmail.com"
                  leftIcon={<Mail className="h-4 w-4" />} error={err('email')} hint="Marzi hai — A4 bill email karne ke liye" />
              </div>
              <div>
                <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Jins</p>
                <div className="flex flex-wrap gap-1.5">
                  {GENDERS.map((g) => (
                    <button key={g.id} type="button" onClick={() => set('gender', f.gender === g.id ? '' : g.id)} aria-pressed={f.gender === g.id}
                      className={cn('h-9 rounded-lg px-4 text-sm font-medium ring-1 transition', f.gender === g.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50')}>
                      {g.label}
                    </button>
                  ))}
                  {genderGuess && (
                    <button type="button" onClick={() => set('gender', genderGuess)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-50 px-3 text-[0.75rem] font-medium text-violet-800 ring-1 ring-violet-200 hover:bg-violet-100">
                      <Sparkles className="h-3.5 w-3.5" /> Naam se {genderGuess === 'FEMALE' ? 'aurat' : 'mard'} lagta hai — chunein?
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">Marzi hai — WhatsApp message me "bhai / baji" sahi lagta hai</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={MapPin}>Pata</T>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Shehar" list="customer-city-options" value={f.city} onChange={(e) => set('city', e.target.value)} placeholder="Lahore"
                leftIcon={<Building2 className="h-4 w-4" />} hint="Likhte hi purane shehar nazar aate hain — spelling ek jaisi rehti hai" />
              <Input label="Ilaqa / mohalla" list="customer-area-options" value={f.area} onChange={(e) => set('area', e.target.value)} placeholder="Gulberg"
                hint="Delivery aur ilaqe ke hisaab se list chhantne ke liye" />
              <Textarea label="Poora pata" rows={2} value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="Ghar #, gali, nishani" maxLength={255}
                wrapperClassName="sm:col-span-2" hint="A4 bill aur delivery parchi par chhapta hai" />
            </div>
            <datalist id="customer-city-options">{cities.map((c) => <option key={c} value={c} />)}</datalist>
            <datalist id="customer-area-options">{areas.map((a) => <option key={a} value={a} />)}</datalist>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Wallet}>Udhaar</T>} description="Khata aur payment Khata wale safhe par hoti hai">
            <Input label="Udhaar ki limit (Rs)" inputMode="numeric" value={f.creditLimit} onBlur={blur('creditLimit')}
              onChange={(e) => set('creditLimit', e.target.value.replace(/[^\d.]/g, ''))} leftIcon={<Wallet className="h-4 w-4" />}
              placeholder={editing ? '0' : shopLimit != null ? String(shopLimit) : 'Dukaan ki default'} error={err('creditLimit')}
              className="text-right font-semibold tabular-nums"
              hint={limit > 0
                ? `Is se zyada udhaar POS par nahi jayega (${formatPKR(limit)})`
                : !editing && !f.creditLimit.trim()
                  ? `Khali chhorein to dukaan ki default limit lagegi${shopLimit != null ? ` (${shopLimit > 0 ? formatPKR(shopLimit) : 'koi had nahi'})` : ''}`
                  : '0 = koi had nahi — naye customer par limit lagana behtar hai'} />
            <div className="mt-2 flex flex-wrap gap-1">
              {CREDIT_CHIPS.map((v) => (
                <button key={v} type="button" onClick={() => set('creditLimit', String(v))}
                  className={cn('h-7 rounded-lg px-2 text-[0.75rem] font-medium ring-1', limit === v ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
                  {formatPKR(v)}
                </button>
              ))}
              <button type="button" onClick={() => set('creditLimit', '0')}
                className={cn('h-7 rounded-lg px-2 text-[0.75rem] font-medium ring-1', f.creditLimit === '0' ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
                Koi had nahi
              </button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Crown}>Photo aur haisiyat</T>}>
            <div className="flex items-start gap-4">
              <AvatarUpload value={f.avatarUrl || null} onChange={(u) => set('avatarUrl', u ?? '')} purpose="avatar" size="lg" fallbackText={f.name || 'C'} />
              <div className="min-w-0 flex-1 space-y-3">
                <Switch checked={f.isVip} onChange={(e) => set('isVip', e.target.checked)} label="VIP customer" description="List aur POS par taj ke saath nazar aata hai" />
                <Switch checked={f.isActive} onChange={(e) => set('isActive', e.target.checked)} label="Chalu customer" description="Band ho to POS me nahi aata; purana khata mehfooz rehta hai" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Photo marzi hai — POS par pehchan aasan hoti hai</p>
          </Card>

          <Card className="rounded-2xl" title={<T icon={IdCard}>Pehchan</T>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="CNIC" inputMode="numeric" value={f.cnic} onChange={(e) => set('cnic', formatCnic(e.target.value))} onBlur={blur('cnic')}
                placeholder="35202-1234567-1" className="font-mono" error={err('cnic')} hint="Marzi hai — bara udhaar dene se pehle" />
              <Input label="NTN" value={f.ntn} onChange={(e) => set('ntn', e.target.value)} maxLength={20} className="font-mono" hint="Tax wala khareedar ho to — bill par chhapta hai" />
              <div className="sm:col-span-2">
                <Input label="Paidaish ki date" type="date" value={f.dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set('dateOfBirth', e.target.value)}
                  leftIcon={<CalendarDays className="h-4 w-4" />} error={err('dateOfBirth')} hint="Marzi hai — salgirah par mubarak ka message bhej sakein" />
                {birthday && (
                  <p className={cn('mt-1.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[0.75rem] font-medium', birthday.thisMonth ? 'bg-pink-50 text-pink-700' : 'bg-slate-100 text-slate-600')}>
                    <Cake className="h-3.5 w-3.5" />
                    {birthday.today ? `Aaj salgirah hai — ${birthday.age} saal` : birthday.thisMonth ? `Is mahine ${birthday.day} ko — ${birthday.age} saal` : `Umar ${birthday.age} saal`}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {editing && customer && (
            <Card className="rounded-2xl" title={<T icon={BookOpen}>Is ka hisaab</T>}>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <Stat k="Kul kharch" v={formatPKR(customer.totalSpent)} />
                <Stat k="Khata baqi" v={customer.balance > 0 ? formatPKR(customer.balance) : 'Saaf'} tone={customer.balance > 0 ? 'text-rose-700' : undefined} />
                <Stat k="Bill" v={String(customer._count?.sales ?? 0)} />
                <Stat k="Points" v={Number(customer.loyaltyPoints ?? 0).toLocaleString()} />
              </dl>
              <div className="mt-3 flex gap-2">
                <Link to={`/customers/${id}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 text-[0.8125rem] font-medium text-slate-700 hover:bg-slate-200"><Eye className="h-4 w-4" />Profile</Link>
                <Link to="/khata" className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 text-[0.8125rem] font-medium text-slate-700 hover:bg-slate-200"><BookOpen className="h-4 w-4" />Khata</Link>
              </div>
            </Card>
          )}

          <Card className="rounded-2xl" title="Note">
            <Textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={3} maxLength={500} placeholder="Pasand, size, khaas baatein…" hint="Sirf andar ke liye — customer ko nahi dikhta" />
            <div className="mt-2 flex flex-wrap gap-1">
              {NOTE_CHIPS.map((c) => {
                const used = f.notes.includes(c);
                return (
                  <button key={c} type="button" onClick={() => addNote(c)} disabled={used}
                    className={cn('h-7 rounded-lg px-2 text-[0.75rem] font-medium ring-1', used ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
                    {used ? '✓ ' : '+ '}{c}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {problems.length > 0 && (tried || f.name || editing)
          ? <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" />{problems[0]}</p>
          : <p className="mr-auto text-[0.8125rem] text-slate-500">{dirty ? 'Tabdeeli save nahi hui — Ctrl+S dabayein' : editing ? 'Sab save hai' : 'Sirf naam zaroori hai — baqi baad me bhi bhar sakte hain'}</p>}
        <Button variant="secondary" onClick={goBack}>Rehne dein</Button>
        {!editing && <Button variant="secondary" onClick={() => submit(true)} disabled={saving} leftIcon={<Plus className="h-4 w-4" />} title="Ctrl+Shift+S">Save + naya</Button>}
        <Button onClick={() => submit()} loading={saving} leftIcon={<Save className="h-4 w-4" />}>{editing ? 'Save karein' : 'Customer jorein'}</Button>
      </div>
    </PageShell>
  );
}

function Stat({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
      <dt className="text-[0.75rem] text-slate-500">{k}</dt>
      <dd className={cn('truncate font-semibold tabular-nums', tone ?? 'text-slate-900')}>{v}</dd>
    </div>
  );
}

const T = ({ icon: Icon, children }: { icon: typeof UserRound; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
