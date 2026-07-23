import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MapPin, Plus, Home, Building2, MapPinned, ArrowLeft,
  Edit2, Trash2, CheckCircle2, Phone, X, Star,
} from 'lucide-react';
import { profileApi } from '../api/profile.api';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';
import { Modal } from '@shared/ui/Modal';
import { EmptyState } from '@shared/ui/EmptyState';
import { SkeletonCard } from '@shared/ui/Skeleton';
import { Badge } from '@shared/ui/Badge';
import { cn } from '@lib/cn';

const ADDRESS_TYPES = [
  { key: 'HOME', label: 'Home', icon: Home, color: 'brand' },
  { key: 'OFFICE', label: 'Office', icon: Building2, color: 'info' },
  { key: 'OTHER', label: 'Other', icon: MapPinned, color: 'accent' },
];

export default function AddressesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    city: '',
    area: '',
    addressType: 'HOME' as 'HOME' | 'OFFICE' | 'OTHER',
    isDefault: false,
  });

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['market-addresses'],
    queryFn: profileApi.addresses,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['market-addresses'] });

  const addMutation = useMutation({
    mutationFn: (data: any) => profileApi.addAddress(data),
    onSuccess: () => {
      toast.success('Address add ho gaya! 📍');
      resetForm();
      invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => profileApi.updateAddress(id, data),
    onSuccess: () => {
      toast.success('Address update ho gaya');
      resetForm();
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => profileApi.deleteAddress(id),
    onSuccess: () => { toast.success('Address delete ho gaya'); invalidate(); },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => profileApi.setDefault(id),
    onSuccess: () => { toast.success('Default set ho gaya ⭐'); invalidate(); },
  });

  const resetForm = () => {
    setModalOpen(false);
    setEditingId(null);
    setFormData({
      label: '', fullName: '', phone: '', addressLine1: '', addressLine2: '',
      landmark: '', city: '', area: '', addressType: 'HOME', isDefault: false,
    });
  };

  const openEditModal = (addr: any) => {
    setEditingId(addr.id);
    setFormData({
      label: addr.label,
      fullName: addr.fullName,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || '',
      landmark: addr.landmark || '',
      city: addr.city,
      area: addr.area,
      addressType: addr.addressType,
      isDefault: addr.isDefault,
    });
    setModalOpen(true);
  };

  const openAddModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label.trim()) return toast.error('Label likhein (e.g. Home)');
    if (!formData.fullName.trim()) return toast.error('Full name likhein');
    if (!/^(\+92|0)?3\d{9}$/.test(formData.phone)) return toast.error('Sahi PK number');
    if (!formData.addressLine1.trim()) return toast.error('Address line likhein');
    if (!formData.city.trim()) return toast.error('City likhein');
    if (!formData.area.trim()) return toast.error('Area likhein');

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      addMutation.mutate(formData);
    }
  };

  return (
    <div className="pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <Button
          variant="gradient"
          size="sm"
          onClick={openAddModal}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
        >
          Add New
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <MapPin className="h-6 w-6 text-brand-600" />
          My Addresses
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {addresses?.length || 0} saved addresses
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : !addresses?.length ? (
        <EmptyState
          emoji="📍"
          title="Koi address nahi"
          description="Delivery ke liye address save karein"
          size="lg"
          action={<Button variant="primary" size="lg" onClick={openAddModal} leftIcon={<Plus className="h-4 w-4" />}>Add Address</Button>}
        />
      ) : (
        <div className="space-y-3">
          {addresses.map((addr: any) => {
            const type = ADDRESS_TYPES.find((t) => t.key === addr.addressType) || ADDRESS_TYPES[0];
            const TypeIcon = type.icon;
            return (
              <div
                key={addr.id}
                className={cn(
                  'p-4 rounded-2xl border-2 shadow-soft transition',
                  addr.isDefault
                    ? 'bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-950/30 dark:to-emerald-950/30 border-brand-400'
                    : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'h-11 w-11 rounded-xl flex items-center justify-center shrink-0',
                    addr.addressType === 'HOME' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400' :
                    addr.addressType === 'OFFICE' ? 'bg-info-100 text-info-700 dark:bg-info-900/40 dark:text-info-400' :
                    'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-400',
                  )}>
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {addr.label}
                      </span>
                      <Badge variant="default" size="xs">{type.label}</Badge>
                      {addr.isDefault && (
                        <Badge variant="brand" size="xs">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          DEFAULT
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-semibold">
                      {addr.fullName}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" />
                      {addr.phone}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {addr.addressLine1}
                      {addr.addressLine2 && `, ${addr.addressLine2}`}
                      {addr.landmark && (
                        <span className="text-slate-500"> (near {addr.landmark})</span>
                      )}
                      <br />
                      {addr.area}, {addr.city}
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex items-center gap-2">
                      {!addr.isDefault && (
                        <button
                          onClick={() => setDefaultMutation.mutate(addr.id)}
                          className="text-[11px] font-extrabold text-brand-700 dark:text-brand-400 hover:underline"
                        >
                          Set as Default
                        </button>
                      )}
                      <div className="ml-auto flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(addr)}
                          className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 flex items-center justify-center"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete karna hai?')) deleteMutation.mutate(addr.id);
                          }}
                          className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-rose-100 dark:hover:bg-rose-900/30 flex items-center justify-center group"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-slate-600 group-hover:text-rose-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={resetForm}
        title={editingId ? 'Edit Address' : 'New Address'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button
              variant="gradient"
              loading={addMutation.isPending || updateMutation.isPending}
              onClick={handleSubmit}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              {editingId ? 'Update' : 'Save Address'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Type selector */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Address Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ADDRESS_TYPES.map((t) => {
                const Icon = t.icon;
                const active = formData.addressType === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFormData({ ...formData, addressType: t.key as any })}
                    className={cn(
                      'p-3 rounded-xl border-2 transition text-center',
                      active
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                        : 'border-slate-200 dark:border-neutral-700 hover:border-slate-300',
                    )}
                  >
                    <Icon className={cn('h-5 w-5 mx-auto mb-1', active ? 'text-brand-600' : 'text-slate-500')} />
                    <div className={cn('text-xs font-extrabold', active ? 'text-brand-700' : 'text-slate-700 dark:text-slate-300')}>
                      {t.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Label"
            placeholder="e.g. Home, Mom's House, Office"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Full Name"
              placeholder="Ahmad Ali"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
            <Input
              label="Phone"
              placeholder="03001234567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          <Input
            label="Address Line 1"
            placeholder="House #, Street name"
            value={formData.addressLine1}
            onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
            required
          />

          <Input
            label="Address Line 2 (optional)"
            placeholder="Apartment, floor, block"
            value={formData.addressLine2}
            onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Area / Sector"
              placeholder="F-8, Model Town"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              required
            />
            <Input
              label="City"
              placeholder="Lahore"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
            />
          </div>

          <Input
            label="Landmark (optional)"
            placeholder="Near main mosque, in front of park"
            value={formData.landmark}
            onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
            hint="Rider ko dhoondhne mein aasan hoga"
          />

          <label className="flex items-center gap-2 pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="h-4 w-4 accent-brand-600 rounded"
            />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Set as default address
            </span>
          </label>
        </form>
      </Modal>
    </div>
  );
}
