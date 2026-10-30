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
import { IconButton, Input, KpiCard, KpiRow, Skeleton } from '@/design-system/components';
import { useAuthStore } from '@core/stores/auth.store';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useReceiptSetup } from '@core/receipt/setup';
import { backupApi } from '@modules/backup/api/backup.api';
import { searchSettings, visibleSettingsGroups, type SettingsHit } from '@app/shell/navigation/nav-config';
import { useSecurityScore, useSettings } from '../hooks/useSettings';
import { OnboardingSyncBanner } from '../components/OnboardingSyncBanner';
import { SETTING_FIND_KEY } from '../components/SettingsFrame';
import { t } from '@core/i18n';

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
      { key: 'logo', label: t('Store ka logo'), hint: s.logoUrl ? t('Bill aur invoice par lag raha hai') : t('Bill par logo se store pehchana jata hai'), done: !!s.logoUrl, to: '/settings/store', find: t('Store logo') },
      { key: 'contact', label: t('Phone aur pata'), hint: s.shopPhone && s.shopAddress ? t('Bill par chhap rahe hain') : t('Customer ko bill par rabta nazar aaye'), done: !!(s.shopPhone && s.shopAddress), to: '/settings/store', find: t('Contact') },
      { key: 'pin', label: t('Malik ka PIN'), hint: s.hasManagerPin ? t('Cost aur locked pages mehfooz hain') : t('PIN ke bagair Cost aur Profit sab ko dikhta hai'), done: !!s.hasManagerPin, to: '/settings/security', find: t('Malik ka PIN') },
      { key: 'counter-pins', label: t('Bill cancel aur Return par PIN'), hint: s.requirePinForVoid && s.requirePinForRefund ? t('Counter par chori ka raasta band') : t('Cashier bina pooche bill cancel ya Return na kar sake'), done: !!(s.requirePinForVoid && s.requirePinForRefund), to: '/settings/counter', find: t('Malik ka PIN kab maangein') },
      {
        key: 'tax', label: t('Tax ki maloomat'),
        hint: s.enableTax ? (s.taxNumber ? t('{{taxRate}}% {{value}} · NTN laga hai', { taxRate: s.taxRate, value: s.taxLabel || 'tax' }) : t('Tax chalu hai magar NTN nahi likha')) : t('Tax band hai — GST registered hain to chalu karein'),
        done: !s.enableTax || !!s.taxNumber, to: '/settings/tax', find: s.enableTax ? t('Tax number (NTN)') : t('Sale par tax'),
      },
      { key: 'receipt', label: t('Receipt par apna message'), hint: design?.footer || design?.terms ? t('Bill ke neeche aap ki likhai aati hai') : t('Return ke usool ya shukriya ki line likhein'), done: !!(design?.footer || design?.terms), to: '/settings/receipt', find: t('Neeche apna message') },
      { key: 'report', label: t('Rozana closing report'), hint: s.notifyDailySummary ? t('Roz {{value}} par aati hai', { value: s.dailySummaryTime || '21:00' }) : t('Din ka poora hisaab khud aap ke paas aaye'), done: !!s.notifyDailySummary, to: '/settings/reports', find: t('Rozana closing report') },
    ];
    const email = score?.checks.find((c) => c.key === 'emailVerified');
    if (email) list.push({ key: 'email', label: t('Email tasdeeq'), hint: email.done ? t('Password reset aur reports email par aa sakti hain') : t('Email tasdeeq karein — password bhoolne par kaam aati hai'), done: email.done, to: '/profile' });
    if (canBackup && backup.data) {
      const at = backup.data.lastBackup?.at;
      const days = at ? Math.floor((Date.now() - new Date(at).getTime()) / 86_400_000) : null;
      list.push({ key: 'backup', label: t('Haal ka backup'), hint: days == null ? t('Abhi tak koi backup nahi liya') : days === 0 ? t('Aaj backup liya') : t('Aakhri backup {{days}} din pehle', { days }), done: days != null && days <= 7, to: '/backup' });
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
          <KpiCard icon={KeyRound} color={s.hasManagerPin ? '#059669' : '#d97706'} label={t('Malik ka PIN')} value={s.hasManagerPin ? t('Laga hua') : t('Nahi laga')}
            hint={t('Security & PIN')} onClick={() => go('/settings/security', t('Malik ka PIN'))} />
          <KpiCard icon={Percent} color="#d97706" label={t('Discount ki had')} value={s.allowDiscount ? `${s.maxDiscountPercent}%` : t('Band')}
            hint={t('Counter rules')} onClick={() => go('/settings/counter', t('Discount'))} />
          <KpiCard icon={BookOpen} color="#7c3aed" label={t('Udhaar')} value={s.allowCredit ? t('Chalu') : t('Band')}
            hint={s.allowCredit ? (s.defaultCreditLimit ? t('Naye customer ki had Rs {{defaultCreditLimit}}', { defaultCreditLimit: Number(s.defaultCreditLimit).toLocaleString() }) : t('Koi had nahi')) : t('Credit & loyalty')}
            onClick={() => go('/settings/credit-loyalty', t('Udhaar'))} />
          <KpiCard icon={Award} color="#db2777" label={t('Loyalty')} value={s.enableLoyalty ? t('Chalu') : t('Band')}
            hint={t('Credit & loyalty')} onClick={() => go('/settings/credit-loyalty', t('Loyalty points'))} />
        </KpiRow>
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[4.75rem]" />)}</div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-4">
          <Input size="lg" value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('Settings search karein')}
            placeholder={t('Koi bhi setting dhoondein — PIN, logo, Discount, GST, printer…')}
            onKeyDown={(e) => { if (e.key === 'Enter' && hits[0]) open(hits[0]); if (e.key === 'Escape') setQ(''); }}
            leftIcon={<Search className="h-5 w-5" />}
            rightIcon={q ? (
              <IconButton label={t('Search saaf karein')} size="sm" onClick={() => setQ('')} className="-me-2">
                <X className="h-4 w-4" />
              </IconButton>
            ) : undefined} />

          {q.trim() ? (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {hits.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <SearchX className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 font-semibold text-slate-800">{t('“{{value}}” nahi mila', { value: q.trim() })}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{t('Koi aur lafz likhein, jaise “PIN”, “logo” ya “Discount”')}</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {hits.map((h) => (
                    <li key={`${h.to}|${h.find ?? ''}`}>
                      <button type="button" onClick={() => open(h)} className="flex w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-slate-50">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><h.icon className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">{h.label}</span>
                          <span className="block truncate text-xs text-slate-500">{h.find ? h.sub : t('Page · {{sub}}', { sub: h.sub })}</span>
                        </span>
                        {h.external ? <ArrowUpRight className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400 rtl-flip" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {groups.map((g) => (
                <section key={g.id} className={cn('flex flex-col rounded-xl border bg-white shadow-sm', g.danger ? 'border-rose-200' : 'border-slate-200')}>
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
                            : <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600 rtl-flip" />}
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
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success-50 text-success-700"><HeartPulse className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[0.9375rem] font-semibold text-slate-900">{t('Setup ki sehat')}</h2>
                  <p className="text-xs text-slate-500">{checks.length ? t('{{done}} / {{count}} kaam poore', { done, count: checks.length }) : t('Check ho raha hai…')}</p>
                </div>
                <span className={cn('text-2xl font-bold tabular-nums', pct >= 80 ? 'text-success-700' : pct >= 50 ? 'text-amber-700' : 'text-rose-700')}>{pct}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={cn('h-full rounded-full transition-all duration-700', pct >= 80 ? 'bg-success-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${pct}%` }} />
              </div>
            </header>
            {!checks.length ? (
              <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-11" />)}</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {ordered.map((c) => (
                  <li key={c.key}>
                    <button type="button" onClick={() => go(c.to, c.find)} className="flex w-full items-start gap-3 px-4 py-3 text-start transition hover:bg-slate-50">
                      {c.done
                        ? <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-success-600" />
                        : <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />}
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-sm font-semibold', c.done ? 'text-slate-700' : 'text-slate-900')}>{c.label}</span>
                        <span className="block text-xs leading-snug text-slate-500">{c.hint}</span>
                      </span>
                      {!c.done && <span className="mt-0.5 shrink-0 text-xs font-semibold text-brand-700">{t('Theek karein')}</span>}
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
