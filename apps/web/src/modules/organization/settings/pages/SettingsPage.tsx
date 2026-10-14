/**
 * Settings overview (/settings): the counter rules at a glance, a setup
 * health checklist with a link to fix each item, a search over every page and
 * single setting, and a card per settings folder with its pages.
 *
 * Old links of the form /settings?tab=<id> are sent to the page that now
 * holds that tab.
 */

import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight, Award, BookOpen, ChevronRight, CircleCheck, CircleDashed, HeartPulse, KeyRound, Percent, Search, SearchX, X,
} from 'lucide-react';
import { cn } from '@core/lib/cn';
import { KpiCard, KpiRow } from '@/design-system/components';
import { useAuthStore } from '@core/stores/auth.store';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useReceiptSetup } from '@core/receipt/setup';
import { backupApi } from '@modules/backup/api/backup.api';
import { searchSettings, visibleSettingsGroups, type SettingsHit } from '@app/shell/navigation/nav-config';
import { useSecurityScore, useSettings } from '../hooks/useSettings';
import { OnboardingSyncBanner } from '../components/OnboardingSyncBanner';
import { SETTING_FIND_KEY } from '../components/SettingsFrame';

/** Where each tab of the old single settings page lives now. */
const OLD_TABS: Record<string, string> = {
  business: '/settings/store',
  config: '/settings/business-type',
  localization: '/settings/language',
  tax: '/settings/tax',
  reports: '/settings/reports',
  pos: '/settings/counter',
  receipt: '/settings/receipt',
  inventory: '/settings/stock',
  customer: '/settings/credit-loyalty',
  notifications: '/settings/notifications',
  whatsapp: '/settings/whatsapp',
  security: '/settings/security',
  integrations: '/integrations',
  backup: '/settings/data-export',
  danger: '/settings/danger',
};

type Check = { key: string; label: string; hint: string; done: boolean; to: string; find?: string };

export default function SettingsPage() {
  const [params] = useSearchParams();
  const oldTab = params.get('tab');
  if (oldTab && OLD_TABS[oldTab]) return <Navigate to={OLD_TABS[oldTab]} replace />;
  return <SettingsOverview />;
}

function SettingsOverview() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canBackup = usePermission(PERMISSIONS.BACKUP_MANAGE);
  const { data, isLoading } = useSettings();
  const { data: score } = useSecurityScore();
  const receipt = useReceiptSetup();
  const backup = useQuery({ queryKey: ['backup-summary'], queryFn: backupApi.summary, enabled: canBackup, staleTime: 60_000 });
  const [q, setQ] = useState('');

  const s = data?.settings;
  const groups = useMemo(() => visibleSettingsGroups(user?.role, user?.permissions), [user?.role, user?.permissions]);
  const hits = useMemo(() => searchSettings(q, groups), [q, groups]);
  const open = (hit: SettingsHit) => navigate(hit.to, hit.find ? { state: { [SETTING_FIND_KEY]: hit.find } } : undefined);
  const go = (to: string, find?: string) => navigate(to, find ? { state: { [SETTING_FIND_KEY]: find } } : undefined);

  const checks = useMemo<Check[]>(() => {
    if (!s) return [];
    const design = receipt.data?.design;
    const list: Check[] = [
      { key: 'logo', label: 'Store ka logo', hint: s.logoUrl ? 'Bill aur invoice par lag raha hai' : 'Bill par logo se store pehchana jata hai', done: !!s.logoUrl, to: '/settings/store', find: 'Store logo' },
      { key: 'contact', label: 'Phone aur pata', hint: s.shopPhone && s.shopAddress ? 'Bill par chhap rahe hain' : 'Customer ko bill par rabta nazar aaye', done: !!(s.shopPhone && s.shopAddress), to: '/settings/store', find: 'Contact' },
      { key: 'pin', label: 'Malik ka PIN', hint: s.hasManagerPin ? 'Cost aur locked pages mehfooz hain' : 'PIN ke bagair Cost aur Profit sab ko dikhta hai', done: !!s.hasManagerPin, to: '/settings/security', find: 'Malik ka PIN' },
      { key: 'counter-pins', label: 'Bill cancel aur Return par PIN', hint: s.requirePinForVoid && s.requirePinForRefund ? 'Counter par chori ka raasta band' : 'Cashier bina pooche bill cancel ya Return na kar sake', done: !!(s.requirePinForVoid && s.requirePinForRefund), to: '/settings/counter', find: 'Malik ka PIN kab maangein' },
      {
        key: 'tax', label: 'Tax ki maloomat',
        hint: s.enableTax ? (s.taxNumber ? `${s.taxRate}% ${s.taxLabel || 'tax'} · NTN laga hai` : 'Tax chalu hai magar NTN nahi likha') : 'Tax band hai — GST registered hain to chalu karein',
        done: !s.enableTax || !!s.taxNumber, to: '/settings/tax', find: s.enableTax ? 'Tax number (NTN)' : 'Sale par tax',
      },
      { key: 'receipt', label: 'Receipt par apna message', hint: design?.footer || design?.terms ? 'Bill ke neeche aap ki likhai aati hai' : 'Return ke usool ya shukriya ki line likhein', done: !!(design?.footer || design?.terms), to: '/settings/receipt', find: 'Neeche apna message' },
      { key: 'report', label: 'Rozana closing report', hint: s.notifyDailySummary ? `Roz ${s.dailySummaryTime || '21:00'} par aati hai` : 'Din ka poora hisaab khud aap ke paas aaye', done: !!s.notifyDailySummary, to: '/settings/reports', find: 'Rozana closing report' },
    ];
    const email = score?.checks.find((c) => c.key === 'emailVerified');
    if (email) list.push({ key: 'email', label: 'Email tasdeeq', hint: email.done ? 'Password reset aur reports email par aa sakti hain' : 'Email tasdeeq karein — password bhoolne par kaam aati hai', done: email.done, to: '/profile' });
    if (canBackup && backup.data) {
      const at = backup.data.lastBackup?.at;
      const days = at ? Math.floor((Date.now() - new Date(at).getTime()) / 86_400_000) : null;
      list.push({ key: 'backup', label: 'Haal ka backup', hint: days == null ? 'Abhi tak koi backup nahi liya' : days === 0 ? 'Aaj backup liya' : `Aakhri backup ${days} din pehle`, done: days != null && days <= 7, to: '/backup' });
    }
    return list;
  }, [s, receipt.data, score, canBackup, backup.data]);

  const done = checks.filter((c) => c.done).length;
  const pct = checks.length ? Math.round((done / checks.length) * 100) : 0;
  const ordered = [...checks.filter((c) => !c.done), ...checks.filter((c) => c.done)];

  return (
    <div className="space-y-5">
      <OnboardingSyncBanner />

      {s ? (
        <KpiRow cols={4}>
          <KpiCard icon={KeyRound} color={s.hasManagerPin ? '#059669' : '#d97706'} label="Malik ka PIN" value={s.hasManagerPin ? 'Laga hua' : 'Nahi laga'}
            hint="Security & PIN" onClick={() => go('/settings/security', 'Malik ka PIN')} />
          <KpiCard icon={Percent} color="#d97706" label="Discount ki had" value={s.allowDiscount ? `${s.maxDiscountPercent}%` : 'Band'}
            hint="Counter rules" onClick={() => go('/settings/counter', 'Discount')} />
          <KpiCard icon={BookOpen} color="#7c3aed" label="Udhaar" value={s.allowCredit ? 'Chalu' : 'Band'}
            hint={s.allowCredit ? (s.defaultCreditLimit ? `Naye customer ki had Rs ${Number(s.defaultCreditLimit).toLocaleString()}` : 'Koi had nahi') : 'Credit & loyalty'}
            onClick={() => go('/settings/credit-loyalty', 'Udhaar')} />
          <KpiCard icon={Award} color="#db2777" label="Loyalty" value={s.enableLoyalty ? 'Chalu' : 'Band'}
            hint="Credit & loyalty" onClick={() => go('/settings/credit-loyalty', 'Loyalty points')} />
        </KpiRow>
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[4.75rem] animate-pulse rounded-2xl bg-slate-100" />)}</div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Settings search karein"
              placeholder="Koi bhi setting dhoondein — PIN, logo, Discount, GST, printer…"
              onKeyDown={(e) => { if (e.key === 'Enter' && hits[0]) open(hits[0]); if (e.key === 'Escape') setQ(''); }}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-11 text-[0.9375rem] text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            {q && (
              <button type="button" onClick={() => setQ('')} aria-label="Search saaf karein"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {q.trim() ? (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {hits.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <SearchX className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 font-semibold text-slate-800">“{q.trim()}” nahi mila</p>
                  <p className="mt-0.5 text-sm text-slate-500">Koi aur lafz likhein, jaise “PIN”, “logo” ya “Discount”</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {hits.map((h) => (
                    <li key={`${h.to}|${h.find ?? ''}`}>
                      <button type="button" onClick={() => open(h)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><h.icon className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">{h.label}</span>
                          <span className="block truncate text-xs text-slate-500">{h.find ? h.sub : `Page · ${h.sub}`}</span>
                        </span>
                        {h.external ? <ArrowUpRight className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {groups.map((g) => (
                <section key={g.id} className={cn('flex flex-col rounded-2xl border bg-white shadow-sm', g.danger ? 'border-rose-200' : 'border-slate-200')}>
                  <header className="flex items-start gap-3 px-4 pb-2 pt-4">
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', g.danger ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-700')}>
                      <g.icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className={cn('text-[0.9375rem] font-semibold', g.danger ? 'text-rose-700' : 'text-slate-900')}>{g.title}</h2>
                      <p className="text-xs leading-snug text-slate-500">{g.desc}</p>
                    </div>
                  </header>
                  <ul className="flex-1 px-2 pb-2">
                    {g.items.map((i) => (
                      <li key={i.to}>
                        <Link to={i.to} className="group flex items-center gap-2 rounded-xl px-2 py-2 transition hover:bg-slate-50">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-800 group-hover:text-brand-700">{i.label}</span>
                            <span className="block truncate text-xs text-slate-500">{i.desc}</span>
                          </span>
                          {i.external
                            ? <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-brand-600" />
                            : <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        <aside className="min-w-0 xl:sticky xl:top-20 xl:self-start">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><HeartPulse className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[0.9375rem] font-semibold text-slate-900">Setup ki sehat</h2>
                  <p className="text-xs text-slate-500">{checks.length ? `${done} / ${checks.length} kaam poore` : 'Check ho raha hai…'}</p>
                </div>
                <span className={cn('text-2xl font-bold tabular-nums', pct >= 80 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-600' : 'text-rose-600')}>{pct}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={cn('h-full rounded-full transition-all duration-700', pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${pct}%` }} />
              </div>
            </header>
            {!checks.length ? (
              <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-100" />)}</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {ordered.map((c) => (
                  <li key={c.key}>
                    <button type="button" onClick={() => go(c.to, c.find)} className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50">
                      {c.done
                        ? <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                        : <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />}
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-sm font-semibold', c.done ? 'text-slate-700' : 'text-slate-900')}>{c.label}</span>
                        <span className="block text-xs leading-snug text-slate-500">{c.hint}</span>
                      </span>
                      {!c.done && <span className="mt-0.5 shrink-0 text-xs font-semibold text-brand-700">Theek karein</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
