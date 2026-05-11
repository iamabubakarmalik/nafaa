import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Settings as SettingsIcon, Save, Store, Receipt, Calculator, Globe,
  ShoppingCart, Package, Users, Bell, Shield, Palette, RotateCcw,
  Sparkles, ChevronRight,
} from 'lucide-react';
import { settingsApi, type TenantSettings } from '@/api/settings.api';
import { Button } from '@/components/ui/Button';

import BusinessProfileSection from '../sections/BusinessProfileSection';
import LocalizationSection from '../sections/LocalizationSection';
import TaxSection from '../sections/TaxSection';
import ReceiptSection from '../sections/ReceiptSection';
import POSSection from '../sections/POSSection';
import InventorySection from '../sections/InventorySection';
import CustomerSection from '../sections/CustomerSection';
import NotificationsSection from '../sections/NotificationsSection';
import SecuritySection from '../sections/SecuritySection';
import AppearanceSection from '../sections/AppearanceSection';

type SectionId =
  | 'business' | 'localization' | 'tax' | 'receipt' | 'pos'
  | 'inventory' | 'customer' | 'notifications' | 'security' | 'appearance';

const sections = [
  { id: 'business' as const, label: 'Business Profile', icon: Store, color: 'emerald', desc: 'Shop name, logo, contact' },
  { id: 'localization' as const, label: 'Localization', icon: Globe, color: 'blue', desc: 'Language, currency, timezone' },
  { id: 'tax' as const, label: 'Tax & Pricing', icon: Calculator, color: 'amber', desc: 'GST, tax rate, rounding' },
  { id: 'receipt' as const, label: 'Receipt', icon: Receipt, color: 'violet', desc: 'Invoice format, header/footer' },
  { id: 'pos' as const, label: 'POS Settings', icon: ShoppingCart, color: 'pink', desc: 'Sale flow, payments' },
  { id: 'inventory' as const, label: 'Inventory', icon: Package, color: 'cyan', desc: 'Stock alerts, expiry' },
  { id: 'customer' as const, label: 'Customers & Udhaar', icon: Users, color: 'indigo', desc: 'Credit, loyalty' },
  { id: 'notifications' as const, label: 'Notifications', icon: Bell, color: 'orange', desc: 'Email, SMS, push' },
  { id: 'security' as const, label: 'Security', icon: Shield, color: 'rose', desc: 'PIN, 2FA, sessions' },
  { id: 'appearance' as const, label: 'Appearance', icon: Palette, color: 'teal', desc: 'Theme, colors' },
];

const colorMap: Record<string, { bg: string; text: string; border: string; light: string }> = {
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-700', border: 'border-emerald-500', light: 'bg-emerald-50' },
  blue: { bg: 'bg-blue-600', text: 'text-blue-700', border: 'border-blue-500', light: 'bg-blue-50' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-500', light: 'bg-amber-50' },
  violet: { bg: 'bg-violet-600', text: 'text-violet-700', border: 'border-violet-500', light: 'bg-violet-50' },
  pink: { bg: 'bg-pink-600', text: 'text-pink-700', border: 'border-pink-500', light: 'bg-pink-50' },
  cyan: { bg: 'bg-cyan-600', text: 'text-cyan-700', border: 'border-cyan-500', light: 'bg-cyan-50' },
  indigo: { bg: 'bg-indigo-600', text: 'text-indigo-700', border: 'border-indigo-500', light: 'bg-indigo-50' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-500', light: 'bg-orange-50' },
  rose: { bg: 'bg-rose-600', text: 'text-rose-700', border: 'border-rose-500', light: 'bg-rose-50' },
  teal: { bg: 'bg-teal-600', text: 'text-teal-700', border: 'border-teal-500', light: 'bg-teal-50' },
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<SectionId>('business');
  const [draft, setDraft] = useState<Partial<TenantSettings & { managerPin?: string }>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      toast.success('Settings save ho gayi ✅');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setDraft({});
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || e?.response?.data?.message || 'Save fail'),
  });

  const resetMutation = useMutation({
    mutationFn: settingsApi.reset,
    onSuccess: () => {
      toast.success('Reset complete');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setDraft({});
    },
  });

  const settings = data?.settings;
  const tenant = data?.tenant;
  const merged = { ...settings, ...draft } as TenantSettings;
  const hasChanges = Object.keys(draft).length > 0;

  const set = <K extends keyof TenantSettings>(key: K, value: TenantSettings[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const onSave = () => {
    if (!hasChanges) {
      toast.info('Koi changes nahi hain');
      return;
    }
    updateMutation.mutate(draft as any);
  };

  const activeSection = sections.find((s) => s.id === active)!;
  const colors = colorMap[activeSection.color];

  if (isLoading || !settings) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Sparkles className="h-10 w-10 text-emerald-600 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-slate-700 text-white p-6 shadow-soft relative overflow-hidden">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
              <SettingsIcon className="h-3.5 w-3.5" />
              Shop Configuration
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Settings</h2>
            <p className="mt-1 text-sm text-white/80">
              {tenant?.name} — apni dukan ki har cheez customize karein
            </p>
          </div>
          {hasChanges && (
            <Button
              size="lg"
              onClick={onSave}
              loading={updateMutation.isPending}
              className="bg-white text-slate-900 hover:bg-slate-100"
            >
              <Save className="h-4 w-4" />
              Save Changes ({Object.keys(draft).length})
            </Button>
          )}
        </div>
      </section>

      {/* Layout: sidebar + content */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-4 h-fit">
          <div className="rounded-2xl bg-white border border-slate-200 p-2 shadow-sm">
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              const c = colorMap[s.color];
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`w-full text-left rounded-xl p-3 flex items-center gap-3 transition mb-1 ${
                    isActive ? `${c.light} ${c.text}` : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                      isActive ? c.bg + ' text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{s.label}</div>
                    <div className="text-[11px] text-slate-500 truncate">{s.desc}</div>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content */}
        <main>
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            {/* Section header */}
            <div className={`${colors.light} px-6 py-5 border-b border-slate-200 flex items-center gap-3`}>
              <div className={`h-12 w-12 rounded-2xl ${colors.bg} text-white flex items-center justify-center`}>
                <activeSection.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-extrabold text-slate-900">{activeSection.label}</h3>
                <p className="text-sm text-slate-600">{activeSection.desc}</p>
              </div>
              {['receipt', 'tax', 'pos', 'notifications', 'appearance'].includes(active) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`${activeSection.label} ko default values pe reset karein?`)) {
                      resetMutation.mutate(active as any);
                    }
                  }}
                  disabled={resetMutation.isPending}
                  className="text-slate-600 hover:bg-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
            </div>

            {/* Section body */}
            <div className="p-6">
              {active === 'business' && <BusinessProfileSection s={merged} set={set} />}
              {active === 'localization' && <LocalizationSection s={merged} set={set} />}
              {active === 'tax' && <TaxSection s={merged} set={set} />}
              {active === 'receipt' && <ReceiptSection s={merged} set={set} />}
              {active === 'pos' && <POSSection s={merged} set={set} />}
              {active === 'inventory' && <InventorySection s={merged} set={set} />}
              {active === 'customer' && <CustomerSection s={merged} set={set} />}
              {active === 'notifications' && <NotificationsSection s={merged} set={set} />}
              {active === 'security' && <SecuritySection s={merged} set={set} />}
              {active === 'appearance' && <AppearanceSection s={merged} set={set} />}
            </div>
          </div>

          {/* Save bar (sticky bottom) */}
          {hasChanges && (
            <div className="sticky bottom-4 mt-4 rounded-2xl bg-emerald-600 text-white p-4 shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span className="text-sm font-bold">
                  {Object.keys(draft).length} unsaved change{Object.keys(draft).length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraft({})}
                  className="text-white hover:bg-emerald-700"
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={onSave}
                  loading={updateMutation.isPending}
                  className="bg-white text-emerald-700 hover:bg-slate-100"
                >
                  <Save className="h-4 w-4" />
                  Save All
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
