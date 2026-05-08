import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, Save, Store, Receipt, Calculator } from 'lucide-react';
import { settingsApi } from '@/api/settings.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const [form, setForm] = useState({
    shopName: '',
    shopAddress: '',
    shopPhone: '',
    shopEmail: '',
    logoUrl: '',
    taxRate: '0',
    taxNumber: '',
    receiptHeader: '',
    receiptFooter: '',
    enableTax: false,
  });

  useEffect(() => {
    if (data?.settings) {
      setForm({
        shopName: data.settings.shopName || data.tenant?.name || '',
        shopAddress: data.settings.shopAddress || '',
        shopPhone: data.settings.shopPhone || '',
        shopEmail: data.settings.shopEmail || '',
        logoUrl: data.settings.logoUrl || '',
        taxRate: String(data.settings.taxRate || 0),
        taxNumber: data.settings.taxNumber || '',
        receiptHeader: data.settings.receiptHeader || '',
        receiptFooter: data.settings.receiptFooter || '',
        enableTax: data.settings.enableTax || false,
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      toast.success('Settings save ho gayi');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Save fail ho gaya');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      shopName: form.shopName.trim(),
      shopAddress: form.shopAddress.trim() || undefined,
      shopPhone: form.shopPhone.trim() || undefined,
      shopEmail: form.shopEmail.trim() || undefined,
      logoUrl: form.logoUrl.trim() || undefined,
      taxRate: Number(form.taxRate || 0),
      taxNumber: form.taxNumber.trim() || undefined,
      receiptHeader: form.receiptHeader.trim() || undefined,
      receiptFooter: form.receiptFooter.trim() || undefined,
      enableTax: form.enableTax,
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <SettingsIcon className="h-3.5 w-3.5" />
              Shop Configuration
            </div>
            <h2 className="mt-3 text-3xl font-bold">Settings</h2>
            <p className="mt-2 text-sm text-white/80">
              Apni shop ki branding, tax rate aur receipt design configure karein.
            </p>
          </div>
          <Button size="lg" onClick={handleSave} loading={updateMutation.isPending} className="bg-white text-slate-900 hover:bg-slate-100">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Shop Information</h3>
              <p className="text-sm text-slate-500">Branding aur contact details</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Shop Name"
              value={form.shopName}
              onChange={(e) => setForm({ ...form, shopName: e.target.value })}
              placeholder="Ahmad Bakery"
            />
            <Input
              label="Address"
              value={form.shopAddress}
              onChange={(e) => setForm({ ...form, shopAddress: e.target.value })}
              placeholder="Main Bazaar, Lahore"
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Phone"
                value={form.shopPhone}
                onChange={(e) => setForm({ ...form, shopPhone: e.target.value })}
                placeholder="+923001234567"
              />
              <Input
                label="Email"
                type="email"
                value={form.shopEmail}
                onChange={(e) => setForm({ ...form, shopEmail: e.target.value })}
                placeholder="shop@example.com"
              />
            </div>
            <Input
              label="Logo URL"
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
              hint="Receipt aur dashboard pe logo dikhega"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-11 w-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Tax Settings</h3>
                <p className="text-sm text-slate-500">GST / Sales tax configuration</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.enableTax}
                  onChange={(e) => setForm({ ...form, enableTax: e.target.checked })}
                  className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm font-medium text-slate-700">Tax enabled karein</span>
              </label>

              <Input
                label="Tax Rate (%)"
                type="number"
                value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                placeholder="17"
              />
              <Input
                label="Tax Number / NTN"
                value={form.taxNumber}
                onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
                placeholder="1234567-8"
              />
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-11 w-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Receipt Customization</h3>
                <p className="text-sm text-slate-500">Header aur footer messages</p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Receipt Header"
                value={form.receiptHeader}
                onChange={(e) => setForm({ ...form, receiptHeader: e.target.value })}
                placeholder="Welcome to our store"
              />
              <Input
                label="Receipt Footer"
                value={form.receiptFooter}
                onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                placeholder="Shukriya! Phir tashreef laaiye"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSave} loading={updateMutation.isPending}>
          <Save className="h-4 w-4" />
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
