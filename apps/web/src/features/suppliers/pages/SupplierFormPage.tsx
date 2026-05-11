import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Trash2, Truck, Building2, CreditCard, FileText,
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

export default function SupplierFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

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
    mutationFn: () =>
      isEdit ? suppliersApi.update(id!, form) : suppliersApi.create(form),
    onSuccess: (saved) => {
      toast.success(isEdit ? 'Supplier updated' : 'Supplier created');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      navigate(`/suppliers/${saved.id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const removeMutation = useMutation({
    mutationFn: () => suppliersApi.remove(id!),
    onSuccess: () => {
      toast.success('Deleted');
      navigate('/suppliers');
    },
  });

  return (
    <div className="space-y-6">
      <Link to={isEdit ? `/suppliers/${id}` : '/suppliers'} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-orange-600">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <section className="rounded-3xl bg-gradient-to-br from-orange-900 to-amber-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Truck className="h-3.5 w-3.5" />
              {isEdit ? 'Editing Supplier' : 'New Supplier'}
            </div>
            <h2 className="mt-3 text-3xl font-bold">{form.name || 'New supplier'}</h2>
          </div>
          <div className="flex gap-2">
            {isEdit && (
              <Button
                variant="secondary"
                onClick={() => {
                  if (confirm(`Delete ${form.name}?`)) removeMutation.mutate();
                }}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
            <Button
              onClick={() => {
                if (!form.name.trim()) return toast.error('Name required');
                saveMutation.mutate();
              }}
              loading={saveMutation.isPending}
              className="bg-white text-slate-900 hover:bg-slate-100"
            >
              <Save className="h-4 w-4" /> {isEdit ? 'Save' : 'Create'}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[300px_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Logo</h3>
          <AvatarUpload
            value={form.logoUrl}
            onChange={(url) => setForm({ ...form, logoUrl: url || '' })}
            purpose="brand-logo"
            shape="square"
            size="xl"
            fallbackText={form.name || 'S'}
          />
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
              placeholder="ABC Wholesalers"
            />
            <Input
              label="Contact Person"
              value={form.contactPerson ?? ''}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              placeholder="Mr. Ahmed"
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
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={form.email ?? ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="contact@abc.com"
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="City"
                value={form.city ?? ''}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <Input
                label="Area"
                value={form.area ?? ''}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              />
            </div>
            <Input
              label="Full Address"
              value={form.address ?? ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
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
              placeholder="HBL, MCB, UBL..."
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Account Number"
                value={form.accountNumber ?? ''}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
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
                {['Net 7 days', 'Net 15 days', 'Net 30 days', 'Cash on delivery', 'Advance payment'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, paymentTerms: form.paymentTerms === t ? '' : t })}
                    className={`px-3 py-1.5 rounded-full border-2 text-xs font-bold transition ${
                      form.paymentTerms === t
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Notes</label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.notes ?? ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Internal notes..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
