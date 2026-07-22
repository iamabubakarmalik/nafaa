import { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Trash2, Truck, Building2, CreditCard, FileText,
  MapPin, User, Phone, Mail, Hash, Copy, CheckCircle2, AlertCircle,
  Wallet, Eye, EyeOff, Sparkles, MessageCircle, Globe, Briefcase,
  ShieldCheck, Banknote, Info, X, Search,
} from 'lucide-react';
import { suppliersApi, type UpsertSupplierPayload } from '@/api/suppliers.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AvatarUpload } from '@/components/uploads';
import { toast } from 'sonner';

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

export default function SupplierFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const submitLockRef = useRef(false);

  const [form, setForm] = useState<UpsertSupplierPayload>(empty);
  const [showSensitive, setShowSensitive] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('company');

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
    }
  }, [supplier]);

  // Form completion progress
  const completionStats = useMemo(() => {
    const required = !!form.name?.trim();
    const fields = [
      form.name, form.contactPerson, form.phone, form.email,
      form.address, form.city, form.bankName, form.accountNumber,
      form.iban, form.paymentTerms, form.ntn, form.cnic, form.logoUrl,
    ];
    const filled = fields.filter((f) => f && String(f).trim().length > 0).length;
    const total = fields.length;
    const percent = Math.round((filled / total) * 100);
    return { required, filled, total, percent };
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
        if (cleanForm[k] === '' || cleanForm[k] === null) {
          cleanForm[k] = undefined;
        }
      });
      return isEdit ? suppliersApi.update(id!, cleanForm) : suppliersApi.create(cleanForm);
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => suppliersApi.remove(id!),
    onSuccess: () => {
      toast.success('Supplier deleted');
      navigate('/suppliers');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cannot delete'),
  });

  const handleSave = async () => {
    if (submitLockRef.current || saveMutation.isPending) return;
    if (!form.name.trim()) {
      toast.error('Supplier name required');
      setActiveSection('company');
      return;
    }

    // Validations
    if (form.cnic && form.cnic.replace(/\D/g, '').length !== 13) {
      toast.error('CNIC should be 13 digits');
      setActiveSection('tax');
      return;
    }
    if (form.ntn && !validateNTN(form.ntn)) {
      toast.error('NTN should be 7, 9, or 13 digits');
      setActiveSection('tax');
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Invalid email format');
      setActiveSection('company');
      return;
    }

    submitLockRef.current = true;
    try {
      const saved = await saveMutation.mutateAsync();
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier', saved.id] });
      queryClient.invalidateQueries({ queryKey: ['suppliers-summary'] });
      toast.success(isEdit ? 'Supplier updated' : 'Supplier created', {
        description: isEdit ? 'Changes saved successfully' : 'Ab purchases create kar sakte hain',
      });
      navigate(`/suppliers/${saved.id}`, { replace: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed');
    } finally {
      setTimeout(() => { submitLockRef.current = false; }, 700);
    }
  };

  const copyField = (value: string, label: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const sections = [
    { id: 'company', label: 'Company Info', icon: Building2, color: 'orange' },
    { id: 'location', label: 'Location', icon: MapPin, color: 'rose' },
    { id: 'tax', label: 'Tax Info', icon: FileText, color: 'blue' },
    { id: 'banking', label: 'Banking', icon: CreditCard, color: 'emerald' },
    { id: 'notes', label: 'Notes', icon: Info, color: 'amber' },
  ];

  return (
    <div className="space-y-6">
      <Link
        to={isEdit ? `/suppliers/${id}` : '/suppliers'}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-orange-600 font-bold"
      >
        <ArrowLeft className="h-4 w-4" /> {isEdit ? 'Back to Supplier' : 'Back to Suppliers'}
      </Link>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-extrabold">
              <Truck className="h-3.5 w-3.5 text-amber-300" />
              {isEdit ? 'Editing Supplier' : 'New Supplier'}
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              {form.name || 'New supplier'}
            </h2>
            {form.contactPerson && (
              <p className="mt-2 text-sm text-white/90 inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Contact: {form.contactPerson}
              </p>
            )}

            {/* Progress bar */}
            <div className="mt-4 max-w-md">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-white/80 font-bold">Profile Completion</span>
                <span className="font-extrabold">{completionStats.percent}%</span>
              </div>
              <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-500"
                  style={{ width: `${completionStats.percent}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-white/70 font-semibold">
                {completionStats.filled}/{completionStats.total} fields filled
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isEdit && (
              <Button
                variant="secondary"
                onClick={() => {
                  if (confirm(`Delete ${form.name}? Yeh action undo nahi ho sakta.`)) removeMutation.mutate();
                }}
                loading={removeMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white border-rose-700"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
            <Button
              onClick={handleSave}
              loading={saveMutation.isPending}
              className="bg-white text-slate-900 hover:bg-slate-100 shadow-lg"
            >
              <Save className="h-4 w-4" />
              {isEdit ? 'Save Changes' : 'Create Supplier'}
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ SECTION NAVIGATION TABS ═══ */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sections.map((s) => {
          const Icon = s.icon;
          const active = activeSection === s.id;
          const colors: Record<string, string> = {
            orange: active ? 'bg-orange-600 border-orange-600 shadow-orange-500/30' : 'border-slate-200 hover:border-orange-300',
            rose: active ? 'bg-rose-600 border-rose-600 shadow-rose-500/30' : 'border-slate-200 hover:border-rose-300',
            blue: active ? 'bg-blue-600 border-blue-600 shadow-blue-500/30' : 'border-slate-200 hover:border-blue-300',
            emerald: active ? 'bg-emerald-600 border-emerald-600 shadow-emerald-500/30' : 'border-slate-200 hover:border-emerald-300',
            amber: active ? 'bg-amber-600 border-amber-600 shadow-amber-500/30' : 'border-slate-200 hover:border-amber-300',
          };
          return (
            <button
              key={s.id}
              onClick={() => {
                setActiveSection(s.id);
                document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold whitespace-nowrap transition border-2 ${colors[s.color]} ${
                active ? 'text-white shadow-lg' : 'bg-white text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* ═══ LEFT SIDEBAR ═══ */}
        <div className="space-y-4">
          {/* Logo Upload */}
          <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-orange-600" />
              Supplier Logo
            </h3>
            <div className="flex justify-center">
              <AvatarUpload
                value={form.logoUrl}
                onChange={(url) => setForm({ ...form, logoUrl: url || '' })}
                purpose="brand-logo"
                shape="square"
                size="xl"
                fallbackText={form.name || 'S'}
              />
            </div>
            <p className="text-xs text-slate-500 mt-3 text-center font-semibold">
              Optional — Supplier company ka logo
            </p>
          </div>

          {/* Status Toggle */}
          <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Status
            </h3>
            <label className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 cursor-pointer hover:border-emerald-300 hover:shadow-sm transition group">
              <div className="flex items-center gap-2.5">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center transition ${
                  form.isActive
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {form.isActive ? <CheckCircle2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {form.isActive ? 'Active' : 'Inactive'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold">
                    {form.isActive ? 'Purchases mein dikhega' : 'Hidden from POS'}
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.isActive ?? true}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-5 w-5 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </label>
          </div>

          {/* Tips Card */}
          <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 p-5">
            <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              Pro Tips
            </h3>
            <ul className="space-y-2 text-xs text-amber-900 font-semibold">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>NTN/CNIC add karne se tax compliance easy hoti hai</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>Bank details add karein — payment ke waqt zaroori hain</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>Payment terms set karein for credit tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>WhatsApp number add karein — quick orders ke liye</span>
              </li>
            </ul>
          </div>

          {/* Quick Stats (when editing) */}
          {isEdit && supplier?.stats && (
            <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                Quick Stats
              </h3>
              <dl className="space-y-2">
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-slate-600 font-bold">Total Orders</dt>
                  <dd className="font-extrabold text-slate-900">{supplier.stats.totalPurchases}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-slate-600 font-bold">Total Spent</dt>
                  <dd className="font-extrabold text-blue-700">{new Intl.NumberFormat('en-PK').format(supplier.stats.totalAmount)}</dd>
                </div>
                {supplier.stats.outstanding > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <dt className="text-xs text-rose-700 font-bold">Outstanding</dt>
                    <dd className="font-extrabold text-rose-700">{new Intl.NumberFormat('en-PK').format(supplier.stats.outstanding)}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* ═══ MAIN FORM ═══ */}
        <div className="space-y-6">
          {/* COMPANY INFO */}
          <div
            id="section-company"
            className="rounded-3xl bg-white border-2 border-orange-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-orange-200">
              <h3 className="font-extrabold text-orange-900 flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/30">
                  <Building2 className="h-4 w-4" />
                </div>
                Company Information
                <span className="ml-auto text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">Required *</span>
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-extrabold text-slate-700 mb-1.5">
                  Supplier / Company Name <span className="text-rose-600">*</span>
                </label>
                <input
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Sun Fibre, ABC Wholesalers, etc."
                />
                <div className="text-[10px] text-slate-500 mt-1 font-semibold">
                  Yahi naam purchases aur reports mein dikhega
                </div>
              </div>

              <div>
                <label className="text-sm font-extrabold text-slate-700 mb-1.5 inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-500" />
                  Contact Person
                </label>
                <input
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition"
                  value={form.contactPerson ?? ''}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  placeholder="e.g. Mr. Ahmed, Sales Manager Sara"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-extrabold text-slate-700 mb-1.5 inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                    Phone Number
                  </label>
                  <div className="relative">
                    <input
                      className="h-11 w-full rounded-xl border-2 border-slate-200 px-4 pr-20 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition"
                      value={form.phone ?? ''}
                      onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                      placeholder="+923009998877"
                    />
                    {form.phone && (
                      <a
                        href={`https://wa.me/${form.phone.replace(/[^0-9]/g, '').replace(/^0/, '92')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 inline-flex items-center gap-1 text-[10px] font-bold transition"
                        title="Test on WhatsApp"
                      >
                        <MessageCircle className="h-3 w-3" />
                        Test
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-extrabold text-slate-700 mb-1.5 inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                    Alternate Phone
                  </label>
                  <input
                    className="h-11 w-full rounded-xl border-2 border-slate-200 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition"
                    value={form.altPhone ?? ''}
                    onChange={(e) => setForm({ ...form, altPhone: formatPhone(e.target.value) })}
                    placeholder="Optional landline / second number"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-extrabold text-slate-700 mb-1.5 inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-500" />
                  Email
                </label>
                <input
                  type="email"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition"
                  value={form.email ?? ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contact@company.com"
                />
                {form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && (
                  <div className="text-[10px] text-rose-600 font-bold mt-1 inline-flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Invalid email format
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* LOCATION */}
          <div
            id="section-location"
            className="rounded-3xl bg-white border-2 border-rose-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-rose-50 to-pink-50 border-b-2 border-rose-200">
              <h3 className="font-extrabold text-rose-900 flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/30">
                  <MapPin className="h-4 w-4" />
                </div>
                Location Details
                <span className="ml-auto text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">Optional</span>
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 mb-1.5">City</label>
                  <input
                    className="h-11 w-full rounded-xl border-2 border-slate-200 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition"
                    value={form.city ?? ''}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Karachi, Lahore, Islamabad..."
                    list="city-list"
                  />
                  <datalist id="city-list">
                    {PAKISTAN_CITIES.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 mb-1.5">Area / Locality</label>
                  <input
                    className="h-11 w-full rounded-xl border-2 border-slate-200 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition"
                    value={form.area ?? ''}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                    placeholder="Saddar, DHA Phase 5..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-extrabold text-slate-700 mb-1.5">Full Address</label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition resize-none"
                  value={form.address ?? ''}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Shop #, Street, Block, Sector..."
                />
                <div className="text-[10px] text-slate-500 mt-1 font-semibold">
                  Pura address purchases invoice par dikhega
                </div>
              </div>
            </div>
          </div>

          {/* TAX INFO */}
          <div
            id="section-tax"
            className="rounded-3xl bg-white border-2 border-blue-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-200 flex items-center justify-between">
              <h3 className="font-extrabold text-blue-900 flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
                  <FileText className="h-4 w-4" />
                </div>
                Tax Information
              </h3>
              <button
                onClick={() => setShowSensitive(!showSensitive)}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 transition"
              >
                {showSensitive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showSensitive ? 'Hide' : 'Show'} sensitive
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-extrabold text-slate-700 mb-1.5 inline-flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-slate-500" />
                    CNIC
                    <span className="text-[10px] font-bold text-slate-400">(13 digits)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSensitive ? 'text' : 'password'}
                      className="h-11 w-full rounded-xl border-2 border-slate-200 px-4 pr-20 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                      value={form.cnic ?? ''}
                      onChange={(e) => setForm({ ...form, cnic: formatCNIC(e.target.value) })}
                      placeholder="12345-6789012-3"
                      maxLength={15}
                    />
                    {form.cnic && (
                      <button
                        onClick={() => copyField(form.cnic || '', 'CNIC')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 inline-flex items-center justify-center transition"
                        title="Copy"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {form.cnic && form.cnic.replace(/\D/g, '').length !== 13 && (
                    <div className="text-[10px] text-amber-700 font-bold mt-1 inline-flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      CNIC should be 13 digits
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-extrabold text-slate-700 mb-1.5 inline-flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-slate-500" />
                    NTN
                    <span className="text-[10px] font-bold text-slate-400">(7/9/13 digits)</span>
                  </label>
                  <div className="relative">
                    <input
                      className="h-11 w-full rounded-xl border-2 border-slate-200 px-4 pr-10 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                      value={form.ntn ?? ''}
                      onChange={(e) => setForm({ ...form, ntn: e.target.value })}
                      placeholder="National Tax Number"
                    />
                    {form.ntn && (
                      <button
                        onClick={() => copyField(form.ntn || '', 'NTN')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 inline-flex items-center justify-center transition"
                        title="Copy"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {form.ntn && !validateNTN(form.ntn) && (
                    <div className="text-[10px] text-amber-700 font-bold mt-1 inline-flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      NTN should be 7, 9, or 13 digits
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BANKING */}
          <div
            id="section-banking"
            className="rounded-3xl bg-white border-2 border-emerald-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-green-50 border-b-2 border-emerald-200">
              <h3 className="font-extrabold text-emerald-900 flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
                  <CreditCard className="h-4 w-4" />
                </div>
                Banking & Payment Terms
                <span className="ml-auto text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Important</span>
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-extrabold text-slate-700 mb-1.5 inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-500" />
                  Bank Name
                </label>
                <input
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                  value={form.bankName ?? ''}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  placeholder="HBL, MCB, UBL, Meezan Bank..."
                  list="bank-list"
                />
                <datalist id="bank-list">
                  {PAKISTAN_BANKS.map((b) => <option key={b} value={b} />)}
                </datalist>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-extrabold text-slate-700 mb-1.5 inline-flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-slate-500" />
                    Account Number
                  </label>
                  <div className="relative">
                    <input
                      type={showSensitive ? 'text' : 'password'}
                      className="h-11 w-full rounded-xl border-2 border-slate-200 px-4 pr-10 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                      value={form.accountNumber ?? ''}
                      onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                      placeholder="00000000000"
                    />
                    {form.accountNumber && (
                      <button
                        onClick={() => copyField(form.accountNumber || '', 'Account')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 inline-flex items-center justify-center transition"
                        title="Copy"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-extrabold text-slate-700 mb-1.5 inline-flex items-center gap-1.5">
                    <Banknote className="h-3.5 w-3.5 text-slate-500" />
                    IBAN
                    <span className="text-[10px] font-bold text-slate-400">(24 chars)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSensitive ? 'text' : 'password'}
                      className="h-11 w-full rounded-xl border-2 border-slate-200 px-4 pr-10 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition uppercase"
                      value={form.iban ?? ''}
                      onChange={(e) => setForm({ ...form, iban: formatIBAN(e.target.value) })}
                      placeholder="PK00BANK0000000000000000"
                      maxLength={29}
                    />
                    {form.iban && (
                      <button
                        onClick={() => copyField(form.iban?.replace(/\s/g, '') || '', 'IBAN')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 inline-flex items-center justify-center transition"
                        title="Copy"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-extrabold text-slate-700 mb-2 inline-flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-slate-500" />
                  Payment Terms
                </label>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {PAYMENT_TERMS.map((t) => {
                    const active = form.paymentTerms === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setForm({ ...form, paymentTerms: active ? '' : t.value })}
                        className={`px-3 py-2.5 rounded-xl border-2 text-left transition group ${
                          active
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{t.emoji}</span>
                          <div className="min-w-0">
                            <div className={`text-xs font-extrabold truncate ${active ? 'text-white' : 'text-slate-900'}`}>
                              {t.value}
                            </div>
                            <div className={`text-[10px] font-bold ${active ? 'text-white/80' : 'text-slate-500'}`}>
                              {t.desc}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-semibold">
                  Default payment terms — purchases mein automatically apply hoga
                </p>
              </div>
            </div>
          </div>

          {/* NOTES */}
          <div
            id="section-notes"
            className="rounded-3xl bg-white border-2 border-amber-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200">
              <h3 className="font-extrabold text-amber-900 flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
                  <Info className="h-4 w-4" />
                </div>
                Internal Notes
                <span className="ml-auto text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Private</span>
              </h3>
            </div>
            <div className="p-6">
              <textarea
                rows={4}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition resize-none"
                value={form.notes ?? ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Best supplier for cotton fabric, delivery in 2 days, discount on bulk orders > 50k, prefers JazzCash for payment..."
              />
              <div className="text-[10px] text-slate-500 mt-2 font-semibold inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                Sirf aap aur aap ki team dekh sakti hai — supplier ko nahi dikhega
              </div>
            </div>
          </div>

          {/* Save Footer (Sticky) */}
          <div className="sticky bottom-4 z-10">
            <div className="rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 p-4 shadow-2xl backdrop-blur flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  completionStats.percent === 100
                    ? 'bg-emerald-100 text-emerald-700'
                    : completionStats.percent >= 50
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                }`}>
                  {completionStats.percent === 100 ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="font-extrabold text-slate-900">
                    {completionStats.percent === 100 ? 'All fields filled!' : `${completionStats.percent}% Complete`}
                  </div>
                  <div className="text-xs text-slate-600 font-semibold">
                    {completionStats.filled}/{completionStats.total} optional fields filled
                  </div>
                </div>
              </div>
              <Button
                onClick={handleSave}
                loading={saveMutation.isPending}
                size="lg"
                className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-lg shadow-orange-500/30 text-white"
              >
                <Save className="h-4 w-4" />
                {isEdit ? 'Save Changes' : 'Create Supplier'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
