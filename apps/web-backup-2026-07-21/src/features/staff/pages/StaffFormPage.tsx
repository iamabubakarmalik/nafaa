import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Trash2, User, Phone, Briefcase, Wallet,
  Building2, FileText, Camera, AlertCircle,
} from 'lucide-react';
import {
  staffApi, type CreateStaffPayload, type SalaryType, type StaffGender, type StaffStatus,
} from '@/api/staff.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AvatarUpload } from '@/components/uploads';
import { toast } from 'sonner';
import { formatPKR } from '@/lib/format';

type Tab = 'personal' | 'job' | 'salary' | 'documents' | 'bank' | 'emergency';

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'job', label: 'Job Details', icon: Briefcase },
  { id: 'salary', label: 'Salary', icon: Wallet },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'bank', label: 'Bank Details', icon: Building2 },
  { id: 'emergency', label: 'Emergency Contact', icon: Phone },
];

const emptyForm: CreateStaffPayload = {
  fullName: '',
  phone: '',
  designation: '',
  joinDate: new Date().toISOString().split('T')[0],
  salaryType: 'MONTHLY',
  baseSalary: 0,
  workingHoursPerDay: 8,
  workingDaysPerMonth: 26,
  status: 'ACTIVE',
};

export default function StaffFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const submitLockRef = useRef(false);

  const [tab, setTab] = useState<Tab>('personal');
  const [form, setForm] = useState<CreateStaffPayload>(emptyForm);

  const { data: staff } = useQuery({
    queryKey: ['staff', id],
    queryFn: () => staffApi.getOne(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (staff) {
      setForm({
        fullName: staff.fullName,
        fatherName: staff.fatherName ?? undefined,
        gender: staff.gender ?? undefined,
        dateOfBirth: staff.dateOfBirth ? staff.dateOfBirth.split('T')[0] : undefined,
        cnic: staff.cnic ?? undefined,
        phone: staff.phone,
        altPhone: staff.altPhone ?? undefined,
        email: staff.email ?? undefined,
        address: staff.address ?? undefined,
        city: staff.city ?? undefined,
        emergencyName: staff.emergencyName ?? undefined,
        emergencyPhone: staff.emergencyPhone ?? undefined,
        emergencyRelation: staff.emergencyRelation ?? undefined,
        designation: staff.designation,
        department: staff.department ?? undefined,
        joinDate: staff.joinDate.split('T')[0],
        status: staff.status,
        salaryType: staff.salaryType,
        baseSalary: staff.baseSalary,
        workingHoursPerDay: staff.workingHoursPerDay,
        workingDaysPerMonth: staff.workingDaysPerMonth,
        bankName: staff.bankName ?? undefined,
        accountNumber: staff.accountNumber ?? undefined,
        iban: staff.iban ?? undefined,
        avatarUrl: staff.avatarUrl ?? undefined,
        cnicFrontUrl: staff.cnicFrontUrl ?? undefined,
        cnicBackUrl: staff.cnicBackUrl ?? undefined,
        notes: staff.notes ?? undefined,
      });
    }
  }, [staff]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isEdit) return staffApi.update(id!, form);
      return staffApi.create(form);
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => staffApi.remove(id!),
    onSuccess: () => {
      toast.success('Staff terminated');
      navigate('/staff');
    },
  });

  const handleSave = async () => {
    if (submitLockRef.current || saveMutation.isPending) return;

    if (!form.fullName.trim()) {
      toast.error('Full name required');
      setTab('personal');
      return;
    }
    if (!form.phone.trim()) {
      toast.error('Phone required');
      setTab('personal');
      return;
    }
    if (!form.designation.trim()) {
      toast.error('Designation required');
      setTab('job');
      return;
    }

    submitLockRef.current = true;
    try {
      const saved = await saveMutation.mutateAsync();
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      toast.success(isEdit ? 'Staff updated' : 'Staff added successfully');
      if (!isEdit) navigate(`/staff/${saved.id}`, { replace: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed');
    } finally {
      setTimeout(() => { submitLockRef.current = false; }, 700);
    }
  };

  const salaryLabel = {
    MONTHLY: 'Monthly Salary (PKR)',
    DAILY: 'Per Day Rate (PKR)',
    HOURLY: 'Per Hour Rate (PKR)',
    PER_TASK: 'Per Task Rate (PKR)',
    COMMISSION: 'Commission Rate (%)',
    HYBRID: 'Base Amount (PKR)',
  }[form.salaryType];

  return (
    <div className="space-y-6">
      <Link to="/staff" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600">
        <ArrowLeft className="h-4 w-4" /> Back to Staff
      </Link>

      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-violet-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <User className="h-3.5 w-3.5" />
              {isEdit ? 'Editing Staff' : 'New Staff'}
            </div>
            <h1 className="mt-3 text-3xl font-bold">{form.fullName || 'New Employee'}</h1>
            {form.designation && <p className="mt-1 text-sm text-white/80">{form.designation}</p>}
          </div>

          <div className="flex gap-2 flex-wrap">
            {isEdit && staff?.status !== 'TERMINATED' && (
              <Button
                variant="secondary"
                className="bg-rose-500/20 hover:bg-rose-500/30 text-white border-rose-400/30"
                onClick={() => {
                  if (confirm(`Terminate "${form.fullName}"? Sale history preserved.`)) {
                    removeMutation.mutate();
                  }
                }}
              >
                <Trash2 className="h-4 w-4" /> Terminate
              </Button>
            )}
            <Button
              onClick={handleSave}
              loading={saveMutation.isPending}
              className="bg-white text-violet-900 hover:bg-slate-100"
            >
              <Save className="h-4 w-4" />
              {isEdit ? 'Save Changes' : 'Create Staff'}
            </Button>
          </div>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition ${
                tab === t.id
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-violet-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid xl:grid-cols-[1fr_360px] gap-6 items-stretch">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          {tab === 'personal' && (
            <div className="space-y-5 max-w-4xl">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Profile Photo</label>
                <AvatarUpload
                  value={form.avatarUrl ?? null}
                  onChange={(url) => setForm({ ...form, avatarUrl: url ?? undefined })}
                  purpose="avatar"
                  size="xl"
                  fallbackText={form.fullName || 'S'}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name *"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Muhammad Ali"
                />
                <Input
                  label="Father's Name"
                  value={form.fatherName ?? ''}
                  onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gender</label>
                  <select
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    value={form.gender ?? ''}
                    onChange={(e) => setForm({ ...form, gender: (e.target.value || undefined) as StaffGender })}
                  >
                    <option value="">Select</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <Input
                  label="Date of Birth"
                  type="date"
                  value={form.dateOfBirth ?? ''}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                />
                <Input
                  label="CNIC"
                  value={form.cnic ?? ''}
                  onChange={(e) => setForm({ ...form, cnic: e.target.value })}
                  placeholder="42101-1234567-1"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Primary Phone *"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="03001234567"
                />
                <Input
                  label="Alternate Phone"
                  value={form.altPhone ?? ''}
                  onChange={(e) => setForm({ ...form, altPhone: e.target.value })}
                />
              </div>

              <Input
                label="Email"
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="City"
                  value={form.city ?? ''}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Lahore, Karachi, etc."
                />
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address</label>
                  <input
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                    value={form.address ?? ''}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'job' && (
            <div className="space-y-5 max-w-4xl">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Designation *"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  placeholder="Cashier, Manager, Helper..."
                />
                <Input
                  label="Department"
                  value={form.department ?? ''}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="Sales, Inventory, Accounts..."
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Join Date *"
                  type="date"
                  value={form.joinDate}
                  onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                />
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                  <select
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    value={form.status ?? 'ACTIVE'}
                    onChange={(e) => setForm({ ...form, status: e.target.value as StaffStatus })}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="RESIGNED">Resigned</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
                <textarea
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.notes ?? ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional information about employee..."
                />
              </div>
            </div>
          )}

          {tab === 'salary' && (
            <div className="space-y-5 max-w-4xl">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Salary Type *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {([
                    { v: 'MONTHLY', l: 'Monthly', d: 'Fixed monthly amount' },
                    { v: 'DAILY', l: 'Daily', d: 'Per day rate' },
                    { v: 'HOURLY', l: 'Hourly', d: 'Per hour rate' },
                    { v: 'PER_TASK', l: 'Per Task', d: 'Per completed task' },
                    { v: 'COMMISSION', l: 'Commission', d: '% of sales' },
                    { v: 'HYBRID', l: 'Hybrid', d: 'Base + commission' },
                  ] as { v: SalaryType; l: string; d: string }[]).map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setForm({ ...form, salaryType: opt.v })}
                      className={`p-3 rounded-xl border-2 text-left transition ${
                        form.salaryType === opt.v
                          ? 'border-violet-500 bg-violet-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-violet-300'
                      }`}
                    >
                      <div className={`font-bold text-sm ${form.salaryType === opt.v ? 'text-violet-700' : 'text-slate-900'}`}>
                        {opt.l}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{opt.d}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label={`${salaryLabel} *`}
                  type="number"
                  step="0.01"
                  value={form.baseSalary}
                  onChange={(e) => setForm({ ...form, baseSalary: Number(e.target.value) })}
                />
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-center">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-emerald-700 font-bold">Preview</div>
                    <div className="text-2xl font-extrabold text-emerald-900 mt-1">
                      {form.salaryType === 'COMMISSION'
                        ? `${form.baseSalary}%`
                        : formatPKR(form.baseSalary)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Working Hours per Day"
                  type="number"
                  value={form.workingHoursPerDay ?? 8}
                  onChange={(e) => setForm({ ...form, workingHoursPerDay: Number(e.target.value) })}
                />
                <Input
                  label="Working Days per Month"
                  type="number"
                  value={form.workingDaysPerMonth ?? 26}
                  onChange={(e) => setForm({ ...form, workingDaysPerMonth: Number(e.target.value) })}
                  hint="Typically 26 (excludes Sundays)"
                />
              </div>
            </div>
          )}

          {tab === 'bank' && (
            <div className="space-y-5 max-w-4xl">
              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  Bank details are encrypted and only used for salary payments via bank transfer
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Bank Name"
                  value={form.bankName ?? ''}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  placeholder="HBL, MCB, UBL, etc."
                />
                <Input
                  label="Account Number"
                  value={form.accountNumber ?? ''}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                />
              </div>

              <Input
                label="IBAN"
                value={form.iban ?? ''}
                onChange={(e) => setForm({ ...form, iban: e.target.value })}
                placeholder="PK36SCBL0000001123456702"
              />
            </div>
          )}

          {tab === 'emergency' && (
            <div className="space-y-5 max-w-4xl">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Contact Name"
                  value={form.emergencyName ?? ''}
                  onChange={(e) => setForm({ ...form, emergencyName: e.target.value })}
                  placeholder="Spouse, parent, sibling..."
                />
                <Input
                  label="Relation"
                  value={form.emergencyRelation ?? ''}
                  onChange={(e) => setForm({ ...form, emergencyRelation: e.target.value })}
                  placeholder="Father, Mother, Brother..."
                />
              </div>

              <Input
                label="Contact Phone"
                value={form.emergencyPhone ?? ''}
                onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
                placeholder="03XXXXXXXXX"
              />
            </div>
          )}

          {tab === 'documents' && (
            <div className="space-y-5 max-w-4xl">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">CNIC Front</label>
                  <AvatarUpload
                    value={form.cnicFrontUrl ?? null}
                    onChange={(url) => setForm({ ...form, cnicFrontUrl: url ?? undefined })}
                    purpose="document"
                    size="xl"
                    shape="square"
                    fallbackText="F"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">CNIC Back</label>
                  <AvatarUpload
                    value={form.cnicBackUrl ?? null}
                    onChange={(url) => setForm({ ...form, cnicBackUrl: url ?? undefined })}
                    purpose="document"
                    size="xl"
                    shape="square"
                    fallbackText="B"
                  />
                </div>
              </div>

              {isEdit && (
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
                  📎 Additional documents can be added from the staff profile page after saving
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preview Sidebar */}
        <aside className="flex flex-col gap-4">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-gradient-to-r from-slate-900 to-violet-700 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-widest font-bold text-white/90">Live Preview</div>
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="p-5 text-center">
              {form.avatarUrl ? (
                <img
                  src={form.avatarUrl}
                  alt={form.fullName}
                  className="h-24 w-24 rounded-3xl object-cover mx-auto border-2 border-slate-200"
                />
              ) : (
                <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-violet-500 to-violet-700 mx-auto flex items-center justify-center text-white text-3xl font-extrabold shadow-lg">
                  {(form.fullName || 'S').charAt(0).toUpperCase()}
                </div>
              )}

              <h3 className="mt-3 font-extrabold text-slate-900 truncate">
                {form.fullName || 'New Employee'}
              </h3>
              {form.designation && (
                <div className="text-sm font-bold text-violet-700">{form.designation}</div>
              )}
              {form.department && (
                <div className="text-xs text-slate-500 mt-0.5">{form.department}</div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-left">
                {form.phone && (
                  <div className="flex items-center gap-2 text-xs">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-700 truncate">{form.phone}</span>
                  </div>
                )}
                {form.email && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-700 truncate">{form.email}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  {form.salaryType.replace('_', ' ')}
                </div>
                <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                  {form.salaryType === 'COMMISSION'
                    ? `${form.baseSalary}%`
                    : formatPKR(form.baseSalary)}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
