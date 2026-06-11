import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Trash2, Truck, Building2, CreditCard, FileText, MapPin,
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

const PAYMENT_TERMS = ['Net 7 days', 'Net 15 days', 'Net 30 days', 'Net 45 days', 'Net 60 days', 'Cash on delivery', 'Advance payment'];

export default function SupplierFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const submitLockRef = useRef(false);

  const [form, setForm] = useState<UpsertSupplierPayload>(empty);

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

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Clean payload: empty strings -> undefined
      const cleanForm: any = { ...form };
      const stringFields = ['phone', 'altPhone', 'email', 'cnic', 'ntn', 'address', 'city', 'area', 'logoUrl', 'bankName', 'accountNumber', 'iban', 'paymentTerms', 'notes', 'contactPerson'];
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
    if (!form.name.trim()) return toast.error('Name required');
    submitLockRef.current = true;
    try {
      const saved = await saveMutation.mutateAsync();
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier', saved.id] });
      toast.success(isEdit ? 'Supplier updated' : 'Supplier created');
      navigate(`/suppliers/${saved.id}`, { replace: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed');
    } finally {
      setTimeout(() => { submitLockRef.current = false; }, 700);
    }
  };

  return (
    <div className="space-y-6">
      <Link to={isEdit ? `/suppliers/${id}` : '/suppliers'} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-orange-600 font-bold">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Truck className="h-3.5 w-3.5 text-amber-300" />
              {isEdit ? 'Editing Supplier' : 'New Supplier'}
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">{form.name || 'New supplier'}</h2>
            {form.contactPerson && <p className="mt-1 text-sm text-white/80">Contact: {form.contactPerson}</p>}
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
              <Save className="h-4 w-4" /> {isEdit ? 'Save Changes' : 'Create Supplier'}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-4">
          <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-orange-600" />
              Logo
            </h3>
            <AvatarUpload
              value={form.logoUrl}
              onChange={(url) => setForm({ ...form, logoUrl: url || '' })}
              purpose="brand-logo"
              shape="square"
              size="xl"
              fallbackText={form.name || 'S'}
            />
            <p className="text-xs text-slate-500 mt-3">Optional — supplier ka logo</p>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3">Status</h3>
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:shadow-sm transition">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Active</div>
                <div className="text-[10px] text-slate-500 font-semibold">Show in purchases form</div>
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
              <Building2 className="h-4 w-4 text-orange-600" /> Company Info
            </h3>
            <Input
              label="Supplier Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="ABC Wholesalers, Sun Fibre, etc."
            />
            <Input
              label="Contact Person"
              value={form.contactPerson ?? ''}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              placeholder="Mr. Ahmed, Sales Manager"
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Phone"
                value={form.phone ?? ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+923009998877"
              />
              <Input
                label="Alternate Phone"
                value={form.altPhone ?? ''}
                onChange={(e) => setForm({ ...form, altPhone: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={form.email ?? ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="contact@abc.com (optional)"
            />
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-rose-600" /> Location
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="City"
                value={form.city ?? ''}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Karachi, Lahore..."
              />
              <Input
                label="Area"
                value={form.area ?? ''}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                placeholder="Saddar, DHA..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Address</label>
              <textarea
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.address ?? ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Shop #, Street, Area"
              />
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" /> Tax Info
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="CNIC"
                value={form.cnic ?? ''}
                onChange={(e) => setForm({ ...form, cnic: e.target.value })}
                placeholder="12345-6789012-3"
              />
              <Input
                label="NTN"
                value={form.ntn ?? ''}
                onChange={(e) => setForm({ ...form, ntn: e.target.value })}
                placeholder="National Tax Number"
              />
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" /> Banking & Payment
            </h3>
            <Input
              label="Bank Name"
              value={form.bankName ?? ''}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              placeholder="HBL, MCB, UBL, Meezan Bank..."
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Account Number"
                value={form.accountNumber ?? ''}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                placeholder="00000000000"
              />
              <Input
                label="IBAN"
                value={form.iban ?? ''}
                onChange={(e) => setForm({ ...form, iban: e.target.value })}
                placeholder="PK00BANK0000000000000000"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Payment Terms</label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_TERMS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, paymentTerms: form.paymentTerms === t ? '' : t })}
                    className={`px-3 py-1.5 rounded-full border-2 text-xs font-bold transition ${
                      form.paymentTerms === t
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1.5">Kab tak payment karni hogi</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Notes</label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.notes ?? ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Internal notes — preferences, delivery info, special discounts..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
