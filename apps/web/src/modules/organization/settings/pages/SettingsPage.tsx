/**
 * Settings control centre. Sections are grouped (shop, counter, customers,
 * system) and shown to staff according to their permissions; people who may
 * only view settings see every control locked. The search finds a single
 * setting, opens its section and points at it.
 */

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, Bell, Building2, CreditCard, Database, Eye, Globe, KeyRound, MessageCircle,
  Package, Percent, Plug, Receipt, Search, Settings as SettingsIcon, Shield, ShoppingBag, Store, X,
} from 'lucide-react';
import { PageHero, PageShell } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS, type PermissionKey } from '@core/lib/permissions';
import { useSettings } from '../hooks/useSettings';
import { OnboardingSyncBanner } from '../components/OnboardingSyncBanner';
import { BusinessProfileSection } from '../sections/BusinessProfileSection';
import { BusinessConfigSection } from '../sections/BusinessConfigSection';
import { LocalizationSection } from '../sections/LocalizationSection';
import { TaxSection } from '../sections/TaxSection';
import { ReceiptSection } from '../sections/ReceiptSection';
import { POSSection } from '../sections/POSSection';
import { InventorySection } from '../sections/InventorySection';
import { CustomerSection } from '../sections/CustomerSection';
import { NotificationsSection } from '../sections/NotificationsSection';
import { WhatsappSection } from '../sections/WhatsappSection';
import { SecuritySection } from '../sections/SecuritySection';
import { IntegrationsSection } from '../sections/IntegrationsSection';
import { BackupSection } from '../sections/BackupSection';
import { DangerZoneSection } from '../sections/DangerZoneSection';

type TabId =
  | 'business' | 'config' | 'localization' | 'tax' | 'receipt' | 'pos'
  | 'inventory' | 'customer' | 'notifications' | 'whatsapp' | 'security'
  | 'integrations' | 'backup' | 'danger';
type Group = 'shop' | 'counter' | 'customers' | 'system';

interface TabDef {
  id: TabId;
  label: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
  group: Group;
  /** Needed on top of settings access. */
  permission?: PermissionKey;
  danger?: boolean;
}

const TABS: TabDef[] = [
  { id: 'business', label: 'Dukaan ki maloomat', desc: 'Naam, pata, logo, rabta', icon: Store, group: 'shop' },
  { id: 'config', label: 'Karobar ki qisam', desc: 'Business type aur features', icon: Building2, group: 'shop' },
  { id: 'localization', label: 'Zubaan aur waqt', desc: 'Currency, time zone, din ka aaghaz', icon: Globe, group: 'shop' },
  { id: 'tax', label: 'Tax', desc: 'GST, tax number, hisaab', icon: Percent, group: 'shop' },
  { id: 'pos', label: 'Counter ke usool', desc: 'Payment, chhoot, PIN', icon: ShoppingBag, group: 'counter' },
  { id: 'receipt', label: 'Raseed (bill)', desc: 'Design, kaghaz, apni likhai, live preview', icon: Receipt, group: 'counter' },
  { id: 'inventory', label: 'Stock', desc: 'Kam stock, minus stock', icon: Package, group: 'counter' },
  { id: 'customer', label: 'Udhaar aur loyalty', desc: 'Credit limit, points', icon: CreditCard, group: 'customers' },
  { id: 'notifications', label: 'Notifications', desc: 'Email, kam stock, rozana report', icon: Bell, group: 'customers' },
  { id: 'whatsapp', label: 'WhatsApp paighaam', desc: 'Bill, udhaar, shukriya', icon: MessageCircle, group: 'customers' },
  { id: 'security', label: 'Security aur PIN', desc: 'Malik ka PIN, password, sessions', icon: Shield, group: 'system' },
  { id: 'integrations', label: 'Integrations', desc: 'FBR, Daraz, payments', icon: Plug, group: 'system', permission: PERMISSIONS.SETTINGS_MANAGE },
  { id: 'backup', label: 'Backup aur export', desc: 'Data download', icon: Database, group: 'system', permission: PERMISSIONS.BACKUP_MANAGE },
  { id: 'danger', label: 'Khatarnak kaam', desc: 'Malikana tabdeel, account band', icon: AlertTriangle, group: 'system', permission: PERMISSIONS.SETTINGS_MANAGE, danger: true },
];

const GROUPS: Record<Group, string> = { shop: 'Dukaan', counter: 'Counter', customers: 'Customers', system: 'Nizam' };

/** One row per setting, for the search. `find` is the text shown next to the control. */
const INDEX: Array<{ tab: TabId; find: string; words?: string }> = [
  { tab: 'business', find: 'Shop Name', words: 'naam dukaan' }, { tab: 'business', find: 'Shop Logo', words: 'logo tasveer' },
  { tab: 'business', find: 'Phone', words: 'number mobile rabta' }, { tab: 'business', find: 'Street Address', words: 'pata address' },
  { tab: 'config', find: 'Change Business Type', words: 'industry qisam' }, { tab: 'config', find: 'Active Features', words: 'features' },
  { tab: 'localization', find: 'Currency', words: 'rupay pkr' }, { tab: 'localization', find: 'Timezone', words: 'waqt time zone' },
  { tab: 'localization', find: 'Din kab shuru hota hai', words: 'business day raat' }, { tab: 'localization', find: 'Preferred Language', words: 'urdu english zubaan' },
  { tab: 'tax', find: 'Enable Tax on Sales', words: 'gst sales tax' }, { tab: 'tax', find: 'Tax Rate', words: 'gst percent' },
  { tab: 'tax', find: 'Tax Number / NTN', words: 'ntn strn' },
  { tab: 'pos', find: 'Pehle se chuna payment', words: 'cash card default payment' },
  { tab: 'pos', find: 'Har bill par customer zaroori', words: 'walk in customer' },
  { tab: 'pos', find: 'Haath se chhoot', words: 'discount' }, { tab: 'pos', find: 'Zyada se zyada chhoot', words: 'discount max limit had' },
  { tab: 'pos', find: 'Bill cancel par PIN', words: 'void pin' }, { tab: 'pos', find: 'Wapsi par PIN', words: 'refund return pin' },
  { tab: 'pos', find: 'Har chhoot par PIN', words: 'discount pin' },
  { tab: 'receipt', find: 'Kaghaz', words: 'receipt printer 58 80 a4 size' }, { tab: 'receipt', find: 'Andaaz', words: 'style design modern' },
  { tab: 'receipt', find: 'Naam ke neeche chhoti line', words: 'header tagline' }, { tab: 'receipt', find: 'Neeche apna paigham', words: 'footer message' },
  { tab: 'receipt', find: 'Wapsi ke usool', words: 'terms return policy' }, { tab: 'receipt', find: 'Background par naam', words: 'watermark rang colour' },
  { tab: 'receipt', find: 'Bill khulte hi print', words: 'auto print copies' },
  { tab: 'receipt', find: 'Paise kaise bhejein', words: 'jazzcash easypaisa bank account iban raast payment' },
  { tab: 'receipt', find: 'A4 invoice', words: 'invoice pdf tax invoice due date' },
  { tab: 'receipt', find: 'Peeche ka hissa', words: 'back terms conditions shartein' },
  { tab: 'inventory', find: 'Kam stock ki had', words: 'low stock alert' }, { tab: 'inventory', find: 'Stock khatam hone par bhi bechein', words: 'negative minus stock' },
  { tab: 'customer', find: 'Udhaar par bechna', words: 'credit khata' }, { tab: 'customer', find: 'Naye customer ki credit limit', words: 'credit limit had' },
  { tab: 'customer', find: 'Loyalty points', words: 'points inaam' }, { tab: 'customer', find: 'Points kab khatam hon', words: 'expiry points' },
  { tab: 'notifications', find: 'Email Notifications', words: 'email' }, { tab: 'notifications', find: 'Low Stock Alerts', words: 'kam stock' },
  { tab: 'notifications', find: 'Send Daily Sales Summary', words: 'rozana report' },
  { tab: 'whatsapp', find: 'WhatsApp Paighaam', words: 'message template' },
  { tab: 'security', find: 'Malik ka PIN', words: 'pin owner' }, { tab: 'security', find: 'Kaun Se Safhe Lock Ho', words: 'lock page' },
  { tab: 'security', find: 'Account ka Password', words: 'password' }, { tab: 'security', find: 'Active Sessions', words: 'login device' },
  { tab: 'integrations', find: 'Integrations', words: 'fbr daraz stripe' },
  { tab: 'backup', find: 'Export Data', words: 'backup download csv' },
  { tab: 'danger', find: 'Transfer Ownership', words: 'malik tabdeel' }, { tab: 'danger', find: 'Delete Shop Permanently', words: 'delete band' },
];

export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const canEdit = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const canManage = usePermission(PERMISSIONS.SETTINGS_MANAGE);
  const canBackup = usePermission(PERMISSIONS.BACKUP_MANAGE);
  const allowed = (t: TabDef) => !t.permission || (t.permission === PERMISSIONS.BACKUP_MANAGE ? canBackup : canManage);
  const tabs = TABS.filter(allowed);
  const can = (id: TabId) => tabs.some((t) => t.id === id);

  const fromUrl = params.get('tab') as TabId | null;
  const [active, setActive] = useState<TabId>(tabs.some((t) => t.id === fromUrl) ? fromUrl! : 'business');
  const [query, setQuery] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isFetching } = useSettings();
  const settings = data?.settings;

  useEffect(() => {
    if (params.get('tab') !== active) { params.set('tab', active); setParams(params, { replace: true }); }
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (id: TabId, find?: string) => {
    setActive(id);
    setQuery('');
    window.setTimeout(() => {
      const root = contentRef.current;
      if (!root) return;
      const needle = find?.toLowerCase();
      const target = needle
        ? [...root.querySelectorAll<HTMLElement>('[data-setting-card]')].find((el) => el.textContent?.toLowerCase().includes(needle))
        : null;
      (target ?? root).scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (target) {
        target.classList.add('ring-2', 'ring-brand-500');
        window.setTimeout(() => target.classList.remove('ring-2', 'ring-brand-500'), 1600);
      }
    }, 80);
  };

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const ok = new Set(tabs.map((t) => t.id));
    const hits = INDEX.filter((r) => ok.has(r.tab) && `${r.find} ${r.words ?? ''}`.toLowerCase().includes(q));
    const tabHits = tabs.filter((t) => `${t.label} ${t.desc}`.toLowerCase().includes(q)).map((t) => ({ tab: t.id, find: undefined as string | undefined }));
    return [...hits, ...tabHits].slice(0, 8);
  }, [query, tabs]);

  const current = TABS.find((t) => t.id === active) ?? TABS[0];
  const pinOn = !!settings?.hasManagerPin;

  return (
    <PageShell>
      <PageHero
        title="Settings"
        chip={<><SettingsIcon /> {data?.tenant?.name || settings?.shopName || 'Dukaan'}</>}
        busy={isFetching && !isLoading}
        meta="Har tabdeeli khud save hoti hai"
        loading={isLoading}
        stats={settings ? [
          { label: 'Malik ka PIN', value: pinOn ? 'Laga hua' : 'Nahi laga' },
          { label: 'Chhoot ki had', value: settings.allowDiscount ? `${settings.maxDiscountPercent}%` : 'Band' },
          { label: 'Udhaar', value: settings.allowCredit ? 'Chalu' : 'Band' },
          { label: 'Loyalty', value: settings.enableLoyalty ? 'Chalu' : 'Band' },
        ] : undefined}
      />

      <OnboardingSyncBanner />

      <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Setting dhoondein…" aria-label="Setting dhoondein"
              onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) open(results[0].tab, results[0].find); if (e.key === 'Escape') setQuery(''); }}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Saaf karein"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {query && (
              <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                {results.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-slate-500">"{query}" nahi mila</p>
                ) : results.map((r, i) => {
                  const t = TABS.find((x) => x.id === r.tab)!;
                  return (
                    <button key={i} type="button" onClick={() => open(r.tab, r.find)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-slate-50">
                      <t.icon className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900">{r.find ?? t.label}</span>
                        <span className="block truncate text-[0.6875rem] text-slate-500">{t.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Phones: one scrolling row of sections */}
          <nav aria-label="Settings sections" className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:hidden">
            {tabs.map((t) => (
              <button key={t.id} type="button" onClick={() => open(t.id)} aria-current={active === t.id ? 'page' : undefined}
                className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem] font-medium ring-1 transition',
                  active === t.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200')}>
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </nav>

          {/* Desktop: grouped list */}
          <nav aria-label="Settings sections" className="mt-3 hidden space-y-4 lg:block">
            {(Object.keys(GROUPS) as Group[]).map((g) => {
              const list = tabs.filter((t) => t.group === g);
              if (!list.length) return null;
              return (
                <div key={g}>
                  <p className="mb-1 px-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">{GROUPS[g]}</p>
                  <div className="space-y-0.5">
                    {list.map((t) => {
                      const on = active === t.id;
                      return (
                        <button key={t.id} type="button" onClick={() => open(t.id)} aria-current={on ? 'page' : undefined}
                          className={cn('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition',
                            on ? 'bg-brand-50 text-brand-800' : t.danger ? 'text-rose-700 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-100')}>
                          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                            on ? 'bg-brand-600 text-white' : t.danger ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500')}>
                            <t.icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{t.label}</span>
                            <span className={cn('block truncate text-[0.6875rem]', on ? 'text-brand-700/80' : 'text-slate-500')}>{t.desc}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <div ref={contentRef} className="min-w-0 scroll-mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', current.danger ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-700')}>
              <current.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">{GROUPS[current.group]}</p>
              <h2 className="text-lg font-semibold leading-tight text-slate-900">{current.label}</h2>
            </div>
            {!pinOn && settings && active !== 'security' && (
              <button type="button" onClick={() => open('security', 'Malik ka PIN')}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[0.75rem] font-medium text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100">
                <KeyRound className="h-3.5 w-3.5" /> Malik ka PIN lagayein
              </button>
            )}
          </div>

          {!canEdit && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
              <Eye className="h-4 w-4 shrink-0" /> Aap settings sirf dekh sakte hain — badalne ki ijazat malik se lein.
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}</div>
          ) : !settings ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <SettingsIcon className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-900">Settings load nahi huin</p>
              <p className="mt-1 text-sm text-slate-500">Page dobara kholein ya internet dekhein</p>
            </div>
          ) : (
            // A disabled fieldset locks every control for people who may only look.
            <fieldset disabled={!canEdit} className="min-w-0 space-y-4">
              {active === 'business' && <BusinessProfileSection settings={settings} />}
              {active === 'config' && <BusinessConfigSection />}
              {active === 'localization' && <LocalizationSection settings={settings} />}
              {active === 'tax' && <TaxSection settings={settings} />}
              {active === 'receipt' && <ReceiptSection settings={settings} />}
              {active === 'pos' && <POSSection settings={settings} onOpenSecurity={() => open('security', 'Malik ka PIN')} />}
              {active === 'inventory' && <InventorySection settings={settings} />}
              {active === 'customer' && <CustomerSection settings={settings} />}
              {active === 'notifications' && <NotificationsSection settings={settings} />}
              {active === 'whatsapp' && <WhatsappSection settings={settings} />}
              {active === 'security' && <SecuritySection settings={settings} />}
              {active === 'integrations' && can('integrations') && <IntegrationsSection />}
              {active === 'backup' && can('backup') && <BackupSection />}
              {active === 'danger' && can('danger') && <DangerZoneSection />}
            </fieldset>
          )}
        </div>
      </div>
    </PageShell>
  );
}
