import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Settings as SettingsIcon, Save, Store, Receipt, Calculator, Globe,
  ShoppingCart, Package, Users, Bell, Shield, Palette, RotateCcw,
  Sparkles, ChevronRight, Zap, Database, AlertTriangle, Search,
} from 'lucide-react';
import { settingsApi, type TenantSettings } from '@/api/settings.api';
import { Button } from '@/components/ui/Button';

import BusinessProfileSection from '../sections/BusinessProfileSection';
import BusinessConfigSection from '../sections/BusinessConfigSection';
import LocalizationSection from '../sections/LocalizationSection';
import TaxSection from '../sections/TaxSection';
import ReceiptSection from '../sections/ReceiptSection';
import POSSection from '../sections/POSSection';
import InventorySection from '../sections/InventorySection';
import CustomerSection from '../sections/CustomerSection';
import NotificationsSection from '../sections/NotificationsSection';
import SecuritySection from '../sections/SecuritySection';
import AppearanceSection from '../sections/AppearanceSection';
import IntegrationsSection from '../sections/IntegrationsSection';
import BackupSection from '../sections/BackupSection';
import DangerZoneSection from '../sections/DangerZoneSection';
import { OnboardingSyncBanner } from '../components/OnboardingSyncBanner';

type SectionId =
  | 'business' | 'businessConfig' | 'localization' | 'tax' | 'receipt' | 'pos'
  | 'inventory' | 'customer' | 'notifications' | 'security'
  | 'appearance' | 'integrations' | 'backup' | 'danger';

interface SectionDef {
  id: SectionId; label: string; icon: any; color: string; desc: string; group: string;
}

const sections: SectionDef[] = [
  { id: 'business',       label: 'Business Profile',    icon: Store,        color: 'emerald', desc: 'Shop name, logo, contact',    group: 'General' },
  { id: 'businessConfig', label: 'Business Type & Features', icon: Sparkles, color: 'violet', desc: 'Industry + features toggle',  group: 'General' },
  { id: 'localization',   label: 'Localization',        icon: Globe,        color: 'blue',    desc: 'Language, currency, timezone', group: 'General' },
  { id: 'appearance',     label: 'Appearance',          icon: Palette,      color: 'cyan',    desc: 'Theme, colors',                group: 'General' },
  { id: 'tax',            label: 'Tax & Pricing',       icon: Calculator,   color: 'amber',   desc: 'GST, tax rate, rounding',     group: 'Business' },
  { id: 'receipt',        label: 'Receipt',             icon: Receipt,      color: 'violet',  desc: 'Invoice format, industry',    group: 'Business' },
  { id: 'pos',            label: 'POS Settings',        icon: ShoppingCart, color: 'pink',    desc: 'Sale flow, payments',         group: 'Business' },
  { id: 'inventory',      label: 'Inventory',           icon: Package,      color: 'cyan',    desc: 'Stock alerts, expiry',        group: 'Business' },
  { id: 'customer',       label: 'Customers & Udhaar',  icon: Users,        color: 'rose',    desc: 'Credit, loyalty',             group: 'Business' },
  { id: 'notifications',  label: 'Notifications',       icon: Bell,         color: 'orange',  desc: 'Email, SMS, WhatsApp',        group: 'Advanced' },
  { id: 'security',       label: 'Security',            icon: Shield,       color: 'rose',    desc: 'PIN, 2FA, sessions',          group: 'Advanced' },
  { id: 'integrations',   label: 'Integrations',        icon: Zap,          color: 'violet',  desc: 'FBR, Daraz, FoodPanda',       group: 'Advanced' },
  { id: 'backup',         label: 'Backup & Export',     icon: Database,     color: 'blue',    desc: 'Download your data',          group: 'Advanced' },
  { id: 'danger',         label: 'Danger Zone',         icon: AlertTriangle,color: 'rose',    desc: 'Delete shop, transfer',       group: 'Advanced' },
];

const colorMap: any = {
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-700', light: 'bg-emerald-50', border: 'border-emerald-500' },
  blue:    { bg: 'bg-blue-600',    text: 'text-blue-700',    light: 'bg-blue-50',    border: 'border-blue-500'    },
  amber:   { bg: 'bg-amber-500',   text: 'text-amber-700',   light: 'bg-amber-50',   border: 'border-amber-500'   },
  violet:  { bg: 'bg-violet-600',  text: 'text-violet-700',  light: 'bg-violet-50',  border: 'border-violet-500'  },
  pink:    { bg: 'bg-pink-600',    text: 'text-pink-700',    light: 'bg-pink-50',    border: 'border-pink-500'    },
  cyan:    { bg: 'bg-cyan-600',    text: 'text-cyan-700',    light: 'bg-cyan-50',    border: 'border-cyan-500'    },
  rose:    { bg: 'bg-rose-600',    text: 'text-rose-700',    light: 'bg-rose-50',    border: 'border-rose-500'    },
  orange:  { bg: 'bg-orange-500',  text: 'text-orange-700',  light: 'bg-orange-50',  border: 'border-orange-500'  },
};

const groups = ['General', 'Business', 'Advanced'];

export default function SettingsPage() {
  const qc = useQueryClient();
  const [active, setActive] = useState<SectionId>('business');
  const [draft, setDraft] = useState<Partial<TenantSettings & { managerPin?: string }>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      toast.success('Settings save ho gayi ✅');
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['security-score'] });
      setDraft({});
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || e?.response?.data?.message || 'Save fail'),
  });

  const resetMutation = useMutation({
    mutationFn: settingsApi.reset,
    onSuccess: () => { toast.success('Reset complete'); qc.invalidateQueries({ queryKey: ['settings'] }); setDraft({}); },
  });

  const settings = data?.settings;
  const tenant = data?.tenant;
  const merged = { ...settings, ...draft } as TenantSettings;
  const hasChanges = Object.keys(draft).length > 0;

  const set = <K extends keyof TenantSettings>(key: K, value: TenantSettings[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const onSave = () => {
    if (!hasChanges) { toast.info('Koi changes nahi hain'); return; }
    updateMutation.mutate(draft as any);
  };

  const activeSection = sections.find((s) => s.id === active)!;
  const colors = colorMap[activeSection.color];

  const filteredSections = search
    ? sections.filter((s) => s.label.toLowerCase().includes(search.toLowerCase()) || s.desc.toLowerCase().includes(search.toLowerCase()))
    : sections;

  const sectionsWithoutDraft: SectionId[] = ['businessConfig', 'integrations', 'backup', 'danger'];
  const hideSaveBar = sectionsWithoutDraft.includes(active);

  if (isLoading || !settings) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-10 w-10 text-emerald-600 animate-pulse mx-auto" />
          <p className="mt-3 text-sm font-black text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Hero */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <SettingsIcon className="h-3.5 w-3.5" />
              Shop Configuration
            </div>
            <h2 className="mt-3 text-3xl md:text-4xl font-black">Settings</h2>
            <p className="mt-1 text-sm text-white/80 font-medium">
              {tenant?.name} — apni dukan ki har cheez customize karein
            </p>
          </div>
          {hasChanges && !hideSaveBar && (
            <Button size="lg" onClick={onSave} loading={updateMutation.isPending} className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl">
              <Save className="h-4 w-4" />
              Save {Object.keys(draft).length} Change{Object.keys(draft).length > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </section>

      <OnboardingSyncBanner />

      {/* Layout */}
      <div className="grid lg:grid-cols-[300px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-4 h-fit">
          <div className="rounded-3xl bg-white border-2 border-slate-100 p-3 shadow-sm">
            <div className="relative mb-3">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search settings..."
                className="w-full h-10 pl-9 pr-3 rounded-xl border-2 border-slate-200 text-sm font-medium outline-none focus:border-emerald-500"
              />
            </div>

            {search ? (
              <div className="space-y-1">
                {filteredSections.map((s) => {
                  const Icon = s.icon;
                  const isActive = active === s.id;
                  const c = colorMap[s.color];
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActive(s.id)}
                      className={`w-full text-left rounded-xl p-2.5 flex items-center gap-2.5 transition ${
                        isActive ? `${c.light} ${c.text}` : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? c.bg + ' text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black truncate">{s.label}</div>
                      </div>
                    </button>
                  );
                })}
                {filteredSections.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-500 font-medium">
                    "{search}" ke liye kuch nahi mila
                  </div>
                )}
              </div>
            ) : (
              groups.map((group) => (
                <div key={group} className="mb-3 last:mb-0">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-1.5">{group}</div>
                  {sections.filter((s) => s.group === group).map((s) => {
                    const Icon = s.icon;
                    const isActive = active === s.id;
                    const c = colorMap[s.color];
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActive(s.id)}
                        className={`w-full text-left rounded-xl p-2.5 flex items-center gap-2.5 transition mb-1 ${
                          isActive ? `${c.light} ${c.text}` : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${isActive ? c.bg + ' text-white shadow' : 'bg-slate-100 text-slate-600'}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-black truncate">{s.label}</div>
                          <div className="text-[10px] text-slate-500 truncate font-medium">{s.desc}</div>
                        </div>
                        {isActive && <ChevronRight className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Content */}
        <main>
          <div className="rounded-3xl bg-slate-50/50 border-2 border-slate-100 overflow-hidden">
            <div className={`${colors.light} px-6 py-5 border-b-2 border-white flex items-center gap-3`}>
              <div className={`h-12 w-12 rounded-2xl ${colors.bg} text-white flex items-center justify-center shadow-md`}>
                <activeSection.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-slate-900">{activeSection.label}</h3>
                <p className="text-sm text-slate-600 font-medium">{activeSection.desc}</p>
              </div>
              {['receipt', 'tax', 'pos', 'notifications', 'appearance', 'inventory', 'customer', 'security'].includes(active) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`${activeSection.label} ko default values pe reset karein?`)) {
                      resetMutation.mutate(active);
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

            <div className="p-6">
              {active === 'business'       && <BusinessProfileSection s={merged} set={set} />}
              {active === 'businessConfig' && <BusinessConfigSection />}
              {active === 'localization'   && <LocalizationSection s={merged} set={set} />}
              {active === 'tax'            && <TaxSection s={merged} set={set} />}
              {active === 'receipt'        && <ReceiptSection s={merged} set={set} />}
              {active === 'pos'            && <POSSection s={merged} set={set} />}
              {active === 'inventory'      && <InventorySection s={merged} set={set} />}
              {active === 'customer'       && <CustomerSection s={merged} set={set} />}
              {active === 'notifications'  && <NotificationsSection s={merged} set={set} />}
              {active === 'security'       && <SecuritySection s={merged} set={set} />}
              {active === 'appearance'     && <AppearanceSection s={merged} set={set} />}
              {active === 'integrations'   && <IntegrationsSection />}
              {active === 'backup'         && <BackupSection />}
              {active === 'danger'         && <DangerZoneSection />}
            </div>
          </div>
        </main>
      </div>

      {/* Sticky save bar */}
      {hasChanges && !hideSaveBar && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-5 py-3 shadow-2xl flex items-center gap-3 border-2 border-emerald-500">
          <Sparkles className="h-4 w-4 text-amber-300" />
          <span className="text-sm font-black">
            {Object.keys(draft).length} unsaved change{Object.keys(draft).length > 1 ? 's' : ''}
          </span>
          <div className="w-px h-6 bg-emerald-400" />
          <button onClick={() => setDraft({})} className="text-xs font-black text-emerald-100 hover:text-white transition">
            Discard
          </button>
          <Button size="sm" onClick={onSave} loading={updateMutation.isPending} className="bg-white text-emerald-700 hover:bg-slate-100">
            <Save className="h-4 w-4" />
            Save All
          </Button>
        </div>
      )}
    </div>
  );
}
