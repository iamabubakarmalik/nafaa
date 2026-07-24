import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MapPin, Plus, Edit, Home, Briefcase, MapPinned, Check } from 'lucide-react';
import { profileApi } from '@/features/profile/api/profile.api';
import { Button, Card, Input, Badge } from '@/ui';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import type { CustomerAddress } from '@/types';

interface AddressSelectorProps {
  selectedId?: string;
  onSelect: (address: CustomerAddress) => void;
}

const typeIcon: Record<string, any> = {
  HOME: Home,
  OFFICE: Briefcase,
  OTHER: MapPinned,
};

export function AddressSelector({ selectedId, onSelect }: AddressSelectorProps) {
  const qc = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: profileApi.listAddresses,
  });

  // Auto-select default when addresses load
  if (addresses && !selectedId) {
    const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
    if (defaultAddr) {
      setTimeout(() => onSelect(defaultAddr), 0);
    }
  }

  if (isLoading) {
    return <div className="skeleton h-24 rounded-2xl" />;
  }

  if (!addresses?.length && !showAddForm) {
    return (
      <Card className="p-8 text-center border-dashed border-2">
        <MapPin className="h-8 w-8 text-content-subtle mx-auto mb-2" />
        <p className="text-sm font-bold text-content mb-1">No delivery address yet</p>
        <p className="text-xs text-content-muted mb-4">Add an address to continue</p>
        <Button variant="gradient" onClick={() => setShowAddForm(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Add address
        </Button>
      </Card>
    );
  }

  if (showAddForm) {
    return (
      <AddressForm
        initial={editingAddress || undefined}
        onSave={(newAddr) => {
          setShowAddForm(false);
          setEditingAddress(null);
          onSelect(newAddr);
        }}
        onCancel={() => {
          setShowAddForm(false);
          setEditingAddress(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-2">
      {addresses?.map((addr) => {
        const Icon = typeIcon[addr.addressType] || MapPinned;
        const isSelected = selectedId === addr.id;
        return (
          <button
            key={addr.id}
            type="button"
            onClick={() => onSelect(addr)}
            className={cn(
              'w-full text-left p-4 rounded-2xl border-2 transition-all',
              isSelected
                ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40 shadow-brand/30'
                : 'border-border bg-surface hover:border-brand-300',
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                isSelected ? 'bg-brand-600 text-white' : 'bg-surface-muted text-content-muted',
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm">{addr.label}</span>
                  {addr.isDefault && <Badge variant="brand" size="sm">Default</Badge>}
                </div>
                <div className="text-xs text-content-muted mt-1 line-clamp-2">
                  {addr.fullName} · {addr.phone}
                </div>
                <div className="text-xs text-content mt-0.5 line-clamp-2">
                  {addr.addressLine1}
                  {addr.addressLine2 && `, ${addr.addressLine2}`}
                  {addr.area && `, ${addr.area}`}, {addr.city}
                </div>
                {addr.deliveryNotes && (
                  <div className="text-2xs text-content-subtle mt-1 italic line-clamp-1">
                    Note: {addr.deliveryNotes}
                  </div>
                )}
              </div>
              {isSelected && (
                <div className="h-6 w-6 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setShowAddForm(true)}
        className="w-full p-4 rounded-2xl border-2 border-dashed border-border hover:border-brand-400 transition text-content-muted hover:text-brand-600 flex items-center justify-center gap-2 font-bold text-sm"
      >
        <Plus className="h-4 w-4" />
        Add new address
      </button>
    </div>
  );
}

function AddressForm({ initial, onSave, onCancel }: {
  initial?: CustomerAddress;
  onSave: (a: CustomerAddress) => void;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    label: initial?.label || 'Home',
    fullName: initial?.fullName || '',
    phone: initial?.phone || '',
    addressLine1: initial?.addressLine1 || '',
    addressLine2: initial?.addressLine2 || '',
    landmark: initial?.landmark || '',
    city: initial?.city || '',
    area: initial?.area || '',
    addressType: (initial?.addressType || 'HOME') as any,
    deliveryNotes: initial?.deliveryNotes || '',
    isDefault: initial?.isDefault || false,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      initial
        ? profileApi.updateAddress(initial.id, form)
        : profileApi.createAddress(form as any),
    onSuccess: (addr) => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      toast.success(initial ? 'Address updated' : 'Address added');
      onSave(addr);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <Card className="p-5 space-y-4 animate-slide-down">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-lg">{initial ? 'Edit address' : 'New address'}</h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(['HOME', 'OFFICE', 'OTHER'] as const).map((t) => {
          const Icon = typeIcon[t];
          const active = form.addressType === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setForm({ ...form, addressType: t, label: t === 'HOME' ? 'Home' : t === 'OFFICE' ? 'Office' : form.label })}
              className={cn(
                'h-14 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition',
                active ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40' : 'border-border bg-surface',
              )}
            >
              <Icon className={cn('h-4 w-4', active ? 'text-brand-600' : 'text-content-muted')} />
              <span className={cn('text-2xs font-black', active ? 'text-brand-600' : 'text-content-muted')}>
                {t === 'HOME' ? 'Home' : t === 'OFFICE' ? 'Office' : 'Other'}
              </span>
            </button>
          );
        })}
      </div>

      <Input
        label="Label"
        placeholder="e.g. Home, Office"
        value={form.label}
        onChange={(e) => setForm({ ...form, label: e.target.value })}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Recipient name"
          placeholder="Full name"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
        <Input
          label="Phone"
          placeholder="03001234567"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </div>

      <Input
        label="Address line 1"
        placeholder="Street address, house #"
        value={form.addressLine1}
        onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
      />

      <Input
        label="Address line 2 (optional)"
        placeholder="Apartment, suite, etc."
        value={form.addressLine2}
        onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Area / Sector"
          placeholder="e.g. Model Town, F-8"
          value={form.area}
          onChange={(e) => setForm({ ...form, area: e.target.value })}
        />
        <Input
          label="City"
          placeholder="e.g. Lahore"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        />
      </div>

      <Input
        label="Landmark (optional)"
        placeholder="e.g. Near KFC, opposite mosque"
        value={form.landmark}
        onChange={(e) => setForm({ ...form, landmark: e.target.value })}
      />

      <Input
        label="Delivery notes (optional)"
        placeholder="e.g. Ring bell twice, dog is friendly"
        value={form.deliveryNotes}
        onChange={(e) => setForm({ ...form, deliveryNotes: e.target.value })}
      />

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
          className="h-4 w-4 rounded"
        />
        <span className="text-sm font-bold">Set as default</span>
      </label>

      <div className="flex gap-2">
        <Button variant="ghost" size="lg" fullWidth onClick={onCancel}>Cancel</Button>
        <Button
          variant="gradient"
          size="lg"
          fullWidth
          loading={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {initial ? 'Update' : 'Save address'}
        </Button>
      </div>
    </Card>
  );
}
