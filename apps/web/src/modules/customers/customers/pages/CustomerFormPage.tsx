import { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Trash2, Crown, User, MapPin, CreditCard,
  GraduationCap, X, CheckCircle2, AlertTriangle, Phone, Mail,
  CalendarDays, Wallet, Sparkles, Keyboard,
} from 'lucide-react';
import { customersApi, type UpsertCustomerPayload } from '@modules/customers/customers/api/customers.api';
import { Button } from '@core/ui/Button';
import { AvatarUpload } from '@core/components/uploads';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════
   NAFAA CUSTOMER FORM — FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌙 Dark mode complete • 🎓 Teacher modal
   ✅ Inline validation (naam / phone / CNIC / email)
   🗑️  Delete confirm modal (no raw confirm())
   ⌨️  Ctrl+S = save • Esc = back
   📊 Live summary sidebar • 🧹 Auto-clean empty fields
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

export default function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const submitLockRef = useRef(false);

  const [form, setForm] = useState<UpsertCustomerPayload>(empty);
  const [touched, setTouched] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const { data: customer } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getOne(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (customer) {
      setForm({
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
      });
    }
  }, [customer]);

  /* ─── Validation ─── */
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.name?.trim()) e.name = 'Naam zaroori hai';
    if (form.phone && !/^(\+?92|0)?3[0-9]{9}$/.test(String(form.phone).replace(/[\s-]/g, ''))) {
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

  /* ─── Mutations ─── */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const cleanForm: any = { ...form };
      const stringFields = ['phone', 'email', 'cnic', 'address', 'city', 'area', 'notes', 'avatarUrl', 'dateOfBirth'];
      stringFields.forEach((k) => {
        if (cleanForm[k] === '' || cleanForm[k] === null) cleanForm[k] = undefined;
      });
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

  const handleSave = async () => {
    if (submitLockRef.current || saveMutation.isPending) return;
    setTouched(true);
    if (Object.keys(errors).length > 0) {
      toast.error(errors.name || 'Form mein ghalati hai — red fields theek karo');
      return;
    }
    submitLockRef.current = true;
    try {
      const saved = await saveMutation.mutateAsync();
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      queryClient.invalidateQueries({ queryKey: ['customer', saved.id] });
      queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
      toast.success(isEdit ? 'Customer update ho gaya ✓' : 'Customer ban gaya ✓');
      navigate(`/customers/${saved.id}`, { replace: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save nahi hua');
    } finally {
      setTimeout(() => { submitLockRef.current = false; }, 700);
    }
  };

  /* ─── Keyboard: Ctrl+S save, Esc back ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        if (showTeacher) setShowTeacher(false);
        else if (showDelete) setShowDelete(false);
        else navigate(isEdit ? `/customers/${id}` : '/customers');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

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

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 sm:pb-10">
      {/* ═══ MODALS ═══ */}
      {showTeacher && <CustomerFormTeacher isEdit={isEdit} onClose={() => setShowTeacher(false)} />}
      {showDelete && (
        <DeleteConfirmModal
          name={form.name}
          loading={removeMutation.isPending}
          onClose={() => setShowDelete(false)}
          onConfirm={() => removeMutation.mutate()}
        />
      )}

      {/* ═══ BACK + TEACHER ═══ */}
      <div className="flex items-center justify-between">
        <Link
          to={isEdit ? `/customers/${id}` : '/customers'}
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-extrabold transition"
        >
          <ArrowLeft className="h-4 w-4" /> Wapas
        </Link>
        <button
          onClick={() => setShowTeacher(true)}
          className="h-9 px-3 rounded-xl bg-amber-100 dark:bg-amber-500/15 hover:bg-amber-200 dark:hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 text-xs font-extrabold inline-flex items-center gap-1.5 border-2 border-amber-200 dark:border-amber-500/30 transition"
        >
          <GraduationCap className="h-4 w-4" /> Guide
        </button>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 dark:from-slate-950 dark:via-blue-950 dark:to-cyan-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold shadow-2xl ring-2 ring-white/20 shrink-0 ${
              form.isVip ? 'bg-gradient-to-br from-amber-400 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600'
            }`}>
              {form.isVip ? <Crown className="h-7 w-7" /> : (form.name?.charAt(0).toUpperCase() || <User className="h-7 w-7" />)}
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest">
                <User className="h-3.5 w-3.5 text-amber-300" />
                {isEdit ? 'Customer Edit' : 'Naya Customer'}
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold leading-tight truncate">
                {form.name || 'Naya customer'}
              </h1>
              {form.phone && <p className="mt-0.5 text-sm text-white/80 font-mono font-bold">{form.phone}</p>}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap shrink-0">
            {isEdit && (
              <button
                onClick={() => setShowDelete(true)}
                disabled={removeMutation.isPending}
                className="h-11 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-300/30 text-rose-100 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="h-11 px-5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xl disabled:opacity-60 transition"
            >
              {saveMutation.isPending ? (
                <><span className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4" /> {isEdit ? 'Save Karo' : 'Customer Banao'}</>
              )}
            </button>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Keyboard className="h-3 w-3 text-white/50" />
          <Kbd>Ctrl+S</Kbd><span className="text-white/60">Save</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Esc</Kbd><span className="text-white/60">Wapas</span>
        </div>
      </section>

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
            {/* Progress bar */}
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
              <SummaryRow ok={!!form.city} label="City / Area" />
              <SummaryRow ok={!!form.address} label="Address" />
              <SummaryRow ok={(form.creditLimit ?? 0) > 0} label="Credit limit set" optional />
            </div>
            {form.phone && (
              <div className="mt-3 rounded-xl bg-white/5 border border-white/10 p-2.5 text-[11px] font-bold text-white/80 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                WhatsApp reminders chalenge ✓
              </div>
            )}
          </div>
        </div>

        {/* ─── FORM SECTIONS ─── */}
        <div className="space-y-4 sm:space-y-5">
          {/* Personal Info */}
          <Section icon={<User className="h-4 w-4 text-blue-600 dark:text-blue-400" />} title="Personal Info">
            <Field label="Poora Naam" required error={showErr('name')}>
              <input
                autoFocus={!isEdit}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onBlur={() => setTouched(true)}
                placeholder="Ali Raza"
                className={inputCls('h-12 text-base font-extrabold', !!showErr('name'))}
              />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Phone" error={showErr('phone')} hint="WhatsApp ke liye">
                <input
                  value={form.phone ?? ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0300-1234567"
                  className={inputCls('h-11 font-bold font-mono', !!showErr('phone'))}
                />
              </Field>
              <Field label="Email" error={showErr('email')} hint="optional">
                <input
                  type="email"
                  value={form.email ?? ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ali@example.com"
                  className={inputCls('h-11 font-bold', !!showErr('email'))}
                />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="CNIC" error={showErr('cnic')} hint="auto-format">
                <input
                  value={form.cnic ?? ''}
                  onChange={(e) => setForm({ ...form, cnic: formatCnic(e.target.value) })}
                  placeholder="12345-6789012-3"
                  className={inputCls('h-11 font-bold font-mono', !!showErr('cnic'))}
                />
              </Field>
              <Field label="Date of Birth" hint="birthday offers ke liye">
                <div className="relative">
                  <CalendarDays className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={form.dateOfBirth ?? ''}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    className={inputCls('h-11 font-bold pl-10 [color-scheme:light] dark:[color-scheme:dark]')}
                  />
                </div>
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
            </Field>
          </Section>

          {/* Location */}
          <Section icon={<MapPin className="h-4 w-4 text-rose-600 dark:text-rose-400" />} title="Location">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="City">
                <input
                  value={form.city ?? ''}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Lahore"
                  className={inputCls('h-11 font-bold')}
                />
              </Field>
              <Field label="Area / Mohalla">
                <input
                  value={form.area ?? ''}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  placeholder="Gulberg"
                  className={inputCls('h-11 font-bold')}
                />
              </Field>
            </div>
            <Field label="Poora Address">
              <input
                value={form.address ?? ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Ghar #, Gali, Area"
                className={inputCls('h-11 font-bold')}
              />
            </Field>
          </Section>

          {/* Credit & Notes */}
          <Section icon={<CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />} title="Credit & Notes">
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
              {(form.creditLimit ?? 0) > 0 && (
                <div className="mt-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  ✓ Is customer ko max <strong>{formatPKR(form.creditLimit ?? 0)}</strong> tak udhaar milega
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
            </Field>
          </Section>
        </div>
      </div>

      {/* ═══ STICKY SAVE BAR (mobile) ═══ */}
      <div className="fixed bottom-0 inset-x-0 z-30 sm:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t-2 border-slate-200 dark:border-slate-800 p-3 flex gap-2">
        <Link to={isEdit ? `/customers/${id}` : '/customers'} className="flex-1">
          <Button variant="secondary" className="w-full font-extrabold">
            <X className="h-4 w-4" /> Cancel
          </Button>
        </Link>
        <Button
          className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700 font-extrabold shadow-lg shadow-blue-500/40"
          onClick={handleSave}
          loading={saveMutation.isPending}
        >
          <Save className="h-4 w-4" /> {isEdit ? 'Save' : 'Banao'}
        </Button>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   DELETE CONFIRM MODAL
   ═════════════════════════════════════════════════════════════ */
function DeleteConfirmModal({ name, loading, onClose, onConfirm }: any) {
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
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
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
            <TipRow><strong>📱 Phone sab se important</strong> — isi se WhatsApp udhaar reminders aur thank-you messages jate hain</TipRow>
            <TipRow><strong>💳 Credit Limit</strong> — is se zyada udhaar nahi jayega, POS khud rok dega. 0 = unlimited</TipRow>
            <TipRow><strong>👑 VIP flag</strong> — premium customers ko alag nishani milti hai (amber card + crown)</TipRow>
            <TipRow><strong>🆔 CNIC khud format</strong> hota hai — sirf numbers likho, dashes apne aap</TipRow>
            <TipRow><strong>📊 Summary card</strong> — sidebar mein profile kitni % complete hai, live dikhta hai</TipRow>
            <TipRow><strong>⌨️ Ctrl+S</strong> — save &nbsp;•&nbsp; <strong>Esc</strong> — wapas</TipRow>
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
function Section({ icon, title, children }: any) {
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm dark:shadow-black/20 space-y-4">
      <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm">{icon} {title}</h3>
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

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm">
      {children}
    </kbd>
  );
}
