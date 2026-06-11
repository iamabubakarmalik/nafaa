import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Trash2, Crown, User, MapPin, CreditCard,
} from 'lucide-react';
import { customersApi, type UpsertCustomerPayload } from '@/api/customers.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AvatarUpload } from '@/components/uploads';
import { toast } from 'sonner';

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

export default function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const submitLockRef = useRef(false);

  const [form, setForm] = useState<UpsertCustomerPayload>(empty);

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

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Clean payload: convert empty strings to undefined
      const cleanForm: any = { ...form };
      const stringFields = ['phone', 'email', 'cnic', 'address', 'city', 'area', 'notes', 'avatarUrl', 'dateOfBirth'];
      stringFields.forEach((k) => {
        if (cleanForm[k] === '' || cleanForm[k] === null) {
          cleanForm[k] = undefined;
        }
      });
      return isEdit ? customersApi.update(id!, cleanForm) : customersApi.create(cleanForm);
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => customersApi.remove(id!),
    onSuccess: () => {
      toast.success('Customer deleted');
      navigate('/customers');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail'),
  });

  const handleSave = async () => {
    if (submitLockRef.current || saveMutation.isPending) return;
    if (!form.name.trim()) {
      toast.error('Name required');
      return;
    }
    submitLockRef.current = true;
    try {
      const saved = await saveMutation.mutateAsync();
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      queryClient.invalidateQueries({ queryKey: ['customer', saved.id] });
      toast.success(isEdit ? 'Customer updated' : 'Customer created');
      navigate(`/customers/${saved.id}`, { replace: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed');
    } finally {
      setTimeout(() => { submitLockRef.current = false; }, 700);
    }
  };

  return (
    <div className="space-y-6">
      <Link to={isEdit ? `/customers/${id}` : '/customers'} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 font-bold">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <User className="h-3.5 w-3.5 text-amber-300" />
              {isEdit ? 'Editing Customer' : 'New Customer'}
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">{form.name || 'New customer'}</h2>
            {form.phone && <p className="mt-1 text-sm text-white/80 font-mono">{form.phone}</p>}
          </div>
          <div className="flex gap-2 flex-wrap">
            {isEdit && (
              <Button
                variant="secondary"
                onClick={() => {
                  if (confirm(`Delete ${form.name}? Yeh action undo nahi ho sakta.`)) removeMutation.mutate();
                }}
                loading={removeMutation.isPending}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
            <Button onClick={handleSave} loading={saveMutation.isPending} className="bg-white text-slate-900 hover:bg-slate-100">
              <Save className="h-4 w-4" /> {isEdit ? 'Save Changes' : 'Create Customer'}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-4">
          <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              Photo
            </h3>
            <AvatarUpload
              value={form.avatarUrl}
              onChange={(url) => setForm({ ...form, avatarUrl: url || '' })}
              purpose="avatar"
              shape="circle"
              size="xl"
              fallbackText={form.name || 'C'}
            />
            <p className="text-xs text-slate-500 mt-3">Optional — improves recognition</p>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              Flags
            </h3>
            <label className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 cursor-pointer hover:shadow-sm transition">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-600" />
                <div>
                  <div className="text-sm font-extrabold text-slate-900">VIP Customer</div>
                  <div className="text-[10px] text-amber-700 font-semibold">Premium tier</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.isVip ?? false}
                onChange={(e) => setForm({ ...form, isVip: e.target.checked })}
                className="h-5 w-5 rounded"
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:shadow-sm transition">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Active</div>
                <div className="text-[10px] text-slate-500 font-semibold">Show in POS & lists</div>
              </div>
              <input
                type="checkbox"
                checked={form.isActive ?? true}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-5 w-5 rounded"
              />
            </label>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" /> Personal Info
            </h3>

            <Input
              label="Full Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ali Raza"
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Phone" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+923001112233" />
              <Input label="Email" type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ali@example.com" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="CNIC" value={form.cnic ?? ''} onChange={(e) => setForm({ ...form, cnic: e.target.value })} placeholder="12345-6789012-3" />
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Date of Birth</label>
                <input
                  type="date"
                  value={form.dateOfBirth ?? ''}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Gender</label>
              <div className="flex gap-2 flex-wrap">
                {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm({ ...form, gender: form.gender === g ? undefined : g })}
                    className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition ${
                      form.gender === g
                        ? 'bg-blue-600 border-blue-600 text-white shadow'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                    }`}
                  >
                    {g === 'MALE' ? '👨 Male' : g === 'FEMALE' ? '👩 Female' : '🧑 Other'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-rose-600" /> Location
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="City" value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Lahore" />
              <Input label="Area" value={form.area ?? ''} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Gulberg" />
            </div>

            <Input label="Full Address" value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House #, Street, Area" />
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" /> Credit & Notes
            </h3>

            <Input
              label="Credit Limit (PKR)"
              type="number"
              value={String(form.creditLimit ?? 0)}
              onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })}
              hint="Maximum khata (udhaar) allowed. 0 = unlimited."
            />

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Notes</label>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.notes ?? ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Internal notes — preferences, important details..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
