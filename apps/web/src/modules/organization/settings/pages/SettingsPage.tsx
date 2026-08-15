import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Settings as SettingsIcon, Store, Building2, Bell, Shield, Palette,
  Receipt, ShoppingBag, Package, Users, Percent, Sparkles,
  Plug, Database, AlertTriangle, Search, X, ChevronRight,
  Loader2, CheckCircle2, Globe,
} from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { OnboardingSyncBanner } from '../components/OnboardingSyncBanner';

// Sections
import { BusinessProfileSection } from '../sections/BusinessProfileSection';
import { BusinessConfigSection } from '../sections/BusinessConfigSection';
import { LocalizationSection } from '../sections/LocalizationSection';
import { TaxSection } from '../sections/TaxSection';
import { ReceiptSection } from '../sections/ReceiptSection';
import { POSSection } from '../sections/POSSection';
import { InventorySection } from '../sections/InventorySection';
import { CustomerSection } from '../sections/CustomerSection';
import { NotificationsSection } from '../sections/NotificationsSection';
import { SecuritySection } from '../sections/SecuritySection';
import { AppearanceSection } from '../sections/AppearanceSection';
import { IntegrationsSection } from '../sections/IntegrationsSection';
import { BackupSection } from '../sections/BackupSection';
import { DangerZoneSection } from '../sections/DangerZoneSection';

type TabId =
  | 'business' | 'config' | 'localization' | 'tax' | 'receipt' | 'pos'
  | 'inventory' | 'customer' | 'notifications' | 'security' | 'appearance'
  | 'integrations' | 'backup' | 'danger';

interface TabDef {
  id: TabId;
  label: string;
  desc: string;
  icon: any;
  color: string;
  group: 'business' | 'operations' | 'customer' | 'system';
  keywords: string[];
  danger?: boolean;
}

const TABS: TabDef[] = [
  // ── Business
  { id: 'business',     label: 'Business Profile',  desc: 'Naam, address, logo, contact',       icon: Store,      color: 'emerald', group: 'business',   keywords: ['profile', 'shop', 'name', 'address', 'logo', 'phone'] },
  { id: 'config',       label: 'Business Config',   desc: 'Type & feature toggles',              icon: Building2,  color: 'indigo',  group: 'business',   keywords: ['type', 'features', 'variants', 'combo', 'imei'] },
  { id: 'localization', label: 'Localization',      desc: 'Language, currency, timezone',        icon: Globe,      color: 'violet',  group: 'business',   keywords: ['language', 'currency', 'timezone', 'urdu', 'pkr'] },
  { id: 'tax',          label: 'Tax & Pricing',     desc: 'GST, taxes, markup, rounding',        icon: Percent,    color: 'amber',   group: 'business',   keywords: ['tax', 'gst', 'markup', 'price', 'rounding'] },

  // ── Operations
  { id: 'receipt',      label: 'Receipt & Invoice', desc: 'Print size, header, footer',          icon: Receipt,     color: 'sky',     group: 'operations', keywords: ['receipt', 'invoice', 'print', 'header', 'footer'] },
  { id: 'pos',          label: 'POS',               desc: 'Checkout behavior, discounts',        icon: ShoppingBag, color: 'blue',    group: 'operations', keywords: ['pos', 'checkout', 'discount', 'barcode'] },
  { id: 'inventory',    label: 'Inventory',         desc: 'Stock alerts, expiry, reorder',       icon: Package,     color: 'cyan',    group: 'operations', keywords: ['inventory', 'stock', 'expiry', 'reorder', 'low'] },

  // ── Customer
  { id: 'customer',     label: 'Customers',         desc: 'Udhaar, loyalty points',              icon: Users,       color: 'pink',    group: 'customer',   keywords: ['customer', 'credit', 'udhaar', 'loyalty', 'points'] },
  { id: 'notifications',label: 'Notifications',     desc: 'Email, SMS, WhatsApp, push',          icon: Bell,        color: 'rose',    group: 'customer',   keywords: ['notification', 'email', 'sms', 'whatsapp', 'push'] },

  // ── System
  { id: 'security',     label: 'Security',          desc: 'PIN, 2FA, sessions, activity',        icon: Shield,      color: 'emerald', group: 'system',     keywords: ['security', 'pin', '2fa', 'password', 'sessions'] },
  { id: 'appearance',   label: 'Appearance',        desc: 'Theme, colors, compact mode',         icon: Palette,     color: 'violet',  group: 'system',     keywords: ['theme', 'dark', 'light', 'color', 'brand'] },
  { id: 'integrations', label: 'Integrations',      desc: 'FBR, Daraz, WhatsApp, Stripe...',     icon: Plug,        color: 'orange',  group: 'system',     keywords: ['fbr', 'daraz', 'whatsapp', 'stripe', 'zapier', 'webhook', 'integration'] },
  { id: 'backup',       label: 'Backup & Export',   desc: 'Data export, backups',                icon: Database,    color: 'slate',   group: 'system',     keywords: ['backup', 'export', 'download', 'csv', 'json'] },
  { id: 'danger',       label: 'Danger Zone',       desc: 'Transfer ownership, delete account',  icon: AlertTriangle, color: 'rose',   group: 'system',     keywords: ['delete', 'danger', 'transfer', 'ownership'], danger: true },
];

const GROUP_META: Record<string, { label: string; icon: any }> = {
  business:   { label: 'Business',   icon: Store },
  operations: { label: 'Operations', icon: ShoppingBag },
  customer:   { label: 'Customers',  icon: Users },
  system:     { label: 'System',     icon: SettingsIcon },
};

function gradFor(color: string): string {
  const map: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-700',
    blue:    'from-blue-500 to-blue-700',
    sky:     'from-sky-500 to-cyan-700',
    amber:   'from-amber-500 to-orange-600',
    orange:  'from-orange-500 to-red-600',
    violet:  'from-violet-500 to-purple-700',
    indigo:  'from-indigo-500 to-indigo-700',
    rose:    'from-rose-500 to-red-600',
    pink:    'from-pink-500 to-fuchsia-600',
    cyan:    'from-cyan-500 to-teal-600',
    slate:   'from-slate-500 to-slate-700',
  };
  return map[color] || map.emerald;
}

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabId) || 'business';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching } = useSettings();

  useEffect(() => {
    if (searchParams.get('tab') !== activeTab) {
      searchParams.set('tab', activeTab);
      setSearchParams(searchParams, { replace: true });
    }
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const filteredTabs = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return TABS;
    return TABS.filter((t) =>
      t.label.toLowerCase().includes(q) ||
      t.desc.toLowerCase().includes(q) ||
      t.keywords.some((k) => k.includes(q))
    );
  }, [search]);

  const groupedTabs = useMemo(() => {
    const g: Record<string, TabDef[]> = { business: [], operations: [], customer: [], system: [] };
    filteredTabs.forEach((t) => g[t.group].push(t));
    return g;
  }, [filteredTabs]);

  const currentTab = TABS.find((t) => t.id === activeTab)!;
  const settings = data?.settings;
  const tenant = data?.tenant;

  return (
    <div className="space-y-4 pb-8">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-cyan-700 dark:from-slate-950 dark:via-emerald-950 dark:to-cyan-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <SettingsIcon className="h-3.5 w-3.5 text-amber-300" />
              Settings & Configuration
              {isFetching && !isLoading && <Loader2 className="h-3 w-3 animate-spin text-emerald-300" />}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
              ⚙️ {tenant?.name || settings?.shopName || 'Business Settings'}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              Business config, POS, receipts, integrations — sab kuch aik jagah
              <span className="opacity-50 mx-2">•</span>
              <span className="text-emerald-300">{TABS.length} sections</span>
              <span className="opacity-50 mx-2">•</span>
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> Auto-save
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <SettingsIcon className="h-4 w-4" /> Sections
            </button>
          </div>
        </div>
      </section>

      {/* Onboarding sync banner */}
      <OnboardingSyncBanner />

      {/* ═══ LAYOUT ═══ */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block">
          <SidebarNav
            groupedTabs={groupedTabs}
            activeTab={activeTab}
            onSelect={setActiveTab}
            search={search}
            setSearch={setSearch}
          />
        </aside>

        {/* Sidebar drawer (mobile) */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          >
            <div
              className="absolute inset-y-0 left-0 w-[320px] max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex items-center justify-between">
                <h2 className="font-extrabold text-slate-900 dark:text-white">Settings Sections</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition"
                >
                  <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </button>
              </div>
              <div className="p-3">
                <SidebarNav
                  groupedTabs={groupedTabs}
                  activeTab={activeTab}
                  onSelect={(id) => {
                    setActiveTab(id);
                    setSidebarOpen(false);
                  }}
                  search={search}
                  setSearch={setSearch}
                  embedded
                />
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div ref={contentRef} className="min-w-0 space-y-4">
          {/* Section header bar */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 px-4 py-3 flex items-center gap-3">
            <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${gradFor(currentTab.color)} text-white flex items-center justify-center shadow-md shrink-0`}>
              <currentTab.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-widest flex items-center gap-1">
                <span>{GROUP_META[currentTab.group].label}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-emerald-600 dark:text-emerald-400">Active</span>
              </div>
              <h2 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">
                {currentTab.label}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                {currentTab.desc}
              </p>
            </div>
            {isFetching && !isLoading && (
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 border-2 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold">
                <Loader2 className="h-3 w-3 animate-spin" /> Syncing
              </div>
            )}
          </div>

          {/* Loading / Empty / Content */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : !settings ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {activeTab === 'business'      && <BusinessProfileSection settings={settings} />}
              {activeTab === 'config'        && <BusinessConfigSection />}
              {activeTab === 'localization'  && <LocalizationSection settings={settings} />}
              {activeTab === 'tax'           && <TaxSection settings={settings} />}
              {activeTab === 'receipt'       && <ReceiptSection settings={settings} />}
              {activeTab === 'pos'           && <POSSection settings={settings} />}
              {activeTab === 'inventory'     && <InventorySection settings={settings} />}
              {activeTab === 'customer'      && <CustomerSection settings={settings} />}
              {activeTab === 'notifications' && <NotificationsSection settings={settings} />}
              {activeTab === 'security'      && <SecuritySection settings={settings} />}
              {activeTab === 'appearance'    && <AppearanceSection settings={settings} />}
              {activeTab === 'integrations'  && <IntegrationsSection />}
              {activeTab === 'backup'        && <BackupSection />}
              {activeTab === 'danger'        && <DangerZoneSection />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SIDEBAR NAV
   ═════════════════════════════════════════════════════════════ */
function SidebarNav({
  groupedTabs,
  activeTab,
  onSelect,
  search,
  setSearch,
  embedded,
}: {
  groupedTabs: Record<string, TabDef[]>;
  activeTab: TabId;
  onSelect: (id: TabId) => void;
  search: string;
  setSearch: (v: string) => void;
  embedded?: boolean;
}) {
  const totalMatches = Object.values(groupedTabs).reduce((s, arr) => s + arr.length, 0);
  return (
    <div className={embedded ? '' : 'sticky top-4 space-y-3'}>
      {/* Search */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search settings..."
          className="h-11 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-9 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
          >
            <X className="h-3.5 w-3.5 text-slate-500" />
          </button>
        )}
      </div>

      {search && (
        <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
          {totalMatches} match{totalMatches !== 1 ? 'es' : ''}
        </div>
      )}

      {/* Groups */}
      <nav className="space-y-4">
        {Object.entries(groupedTabs).map(([groupKey, tabs]) => {
          if (tabs.length === 0) return null;
          const meta = GROUP_META[groupKey];
          return (
            <div key={groupKey}>
              <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-500 dark:text-slate-400 mb-1.5 px-2 flex items-center gap-1.5">
                <meta.icon className="h-3 w-3" />
                {meta.label}
              </div>
              <div className="space-y-1">
                {tabs.map((tab) => {
                  const active = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => onSelect(tab.id)}
                      className={[
                        'w-full text-left px-2.5 py-2 rounded-xl transition-all active:scale-[0.98] group flex items-center gap-2.5',
                        active
                          ? `bg-gradient-to-r ${gradFor(tab.color)} text-white shadow-md`
                          : tab.danger
                            ? 'hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-700 dark:text-rose-400'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200',
                      ].join(' ')}
                    >
                      <div
                        className={[
                          'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition',
                          active
                            ? 'bg-white/20 backdrop-blur'
                            : tab.danger
                              ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                              : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700',
                        ].join(' ')}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-extrabold leading-tight truncate">
                          {tab.label}
                        </div>
                        <div
                          className={[
                            'text-[10px] font-semibold leading-tight mt-0.5 truncate',
                            active ? 'text-white/80' : 'text-slate-500 dark:text-slate-400',
                          ].join(' ')}
                        >
                          {tab.desc}
                        </div>
                      </div>
                      {active && <ChevronRight className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {totalMatches === 0 && (
          <div className="text-center py-8 px-4">
            <Search className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
              "{search}" ke liye kuch nahi mila
            </p>
            <button
              onClick={() => setSearch('')}
              className="mt-2 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Clear search
            </button>
          </div>
        )}
      </nav>

      {/* Auto-save hint */}
      {!embedded && (
        <div className="mt-6 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3 flex items-start gap-2">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-200 leading-snug">
            <strong>Auto-save on:</strong> koi bhi change karo, 800ms baad khud save ho jayega. Save button ki zaroorat nahi.
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════ EMPTY STATE ══════════ */
function EmptyState() {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 p-10 text-center">
      <div className="h-16 w-16 rounded-3xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center">
        <SettingsIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="mt-4 font-extrabold text-slate-900 dark:text-white">
        Settings load nahi ho rahi
      </h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-semibold">
        Page refresh karein ya support se rabta karein
      </p>
    </div>
  );
}
