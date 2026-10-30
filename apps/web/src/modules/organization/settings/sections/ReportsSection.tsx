/**
 * Report settings: when the business day and week start, how reports open
 * (financial year, default period, comparison, round-off), which money
 * figures staff may see, and the automatic daily closing summary (time,
 * channels, recipients, lines, preview, send now, WhatsApp).
 * The day start hour lives in "Language & time"; this page links to it.
 */

import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bell, CalendarDays, Clock, Copy, Eye, HandCoins, Landmark, ListChecks, Lock, Mail, MessageCircle, Send, ShieldCheck, Smartphone, Sunrise, Users, Vault,
} from 'lucide-react';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS, isOwner } from '@core/lib/permissions';
import { businessDayKey } from '@core/lib/business-day';
import { useAuthStore } from '@core/stores/auth.store';
import { useCostHidden } from '@core/security/HiddenValue';
import { waNumber } from '@core/lib/whatsapp/templates';
import { REPORT_PREFS_KEY, fiscalYearStart, type ReportFigure } from '@modules/reports/prefs';
import { ChoiceGroup, Divider, Field, SectionCard, Toggle } from '../components/SettingsBlocks';
import { Alert, Avatar, Badge, Button, Checkbox, Input, Segmented, Select, Skeleton } from '@/design-system/components';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { dailySummaryApi, type DailySummary, type DailySummaryStatus } from '../api/daily-summary.api';
import { reportsConfigApi, type ReportsConfig, type ReportsConfigPatch, type SummaryChannel, type SummaryPart } from '../api/reports-config.api';
import { SettingLink } from '../components/SettingsFrame';
import { SaveStatusBar } from './_SaveStatus';
import { t as tr } from '@core/i18n';

const WEEK_STARTS = [
  { value: 'monday', label: tr('Monday'), desc: tr('Aam hisaab') },
  { value: 'saturday', label: tr('Saturday'), desc: tr('Kuch markets') },
  { value: 'sunday', label: tr('Sunday'), desc: tr('Itwaar se') },
];
const MONTHS = [tr('January'), tr('February'), tr('March'), tr('April'), tr('May'), tr('June'), tr('July'), tr('August'), tr('September'), tr('October'), tr('November'), tr('December')];
const PERIODS = [
  { value: 'auto', label: tr('Har report ka apna'), desc: tr('Jaise abhi hai') },
  { value: 'today', label: tr('Aaj') },
  { value: 'yesterday', label: tr('Kal') },
  { value: 'week', label: tr('7 din') },
  { value: 'month', label: tr('30 din') },
  { value: 'thisMonth', label: tr('Is mahine') },
  { value: 'lastMonth', label: tr('Pichhla mahina') },
  { value: 'fiscalYear', label: tr('Maali saal'), desc: tr('Upar wale mahine se aaj tak') },
];
const COMPARES = [
  { value: 'prev', label: tr('Pichli period'), desc: tr('Itne hi din, is se pehle') },
  { value: 'year', label: tr('Pichla saal'), desc: tr('Profit-loss me; baaki me pichli period') },
  { value: 'off', label: tr('Muqabla band'), desc: tr('Report khud on kar sakti hai') },
];
const ROUNDS = [
  { value: 'paisa', label: tr('Paise tak'), desc: tr('Rs 1,234.50') },
  { value: 'rupee', label: tr('Poore rupay'), desc: tr('Rs 1,235') },
];
const FIGURES: Array<{ id: ReportFigure; label: string; desc: string; icon: typeof Bell }> = [
  { id: 'profit', label: tr('Profit aur cost'), desc: tr('Profit, margin aur maal ki cost. Phir bhi sirf unhe jin ke paas "Cost aur profit dekhein" ki permission hai.'), icon: Landmark },
  { id: 'drawer', label: tr('Galle ka hisaab'), desc: tr('Galle me kitna hona chahiye, kitna gina, kam/zyada aur cash in/out.'), icon: Vault },
];
const PARTS: Array<{ id: SummaryPart; label: string }> = [
  { id: 'returns', label: tr('Return') },
  { id: 'voids', label: tr('Cancel bill') },
  { id: 'discount', label: tr('Discount') },
  { id: 'payments', label: tr('Paisa kaise aaya') },
  { id: 'drawer', label: tr('Galla abhi aur farq') },
  { id: 'profit', label: tr('Profit') },
  { id: 'expenses', label: tr('Expenses') },
  { id: 'khata', label: tr('Udhaar diya / wapas aaya') },
  { id: 'lowStock', label: tr('Kam stock') },
  { id: 'topItems', label: tr('Sab se zyada bika') },
  { id: 'topStaff', label: tr('Sab se zyada sale wala banda') },
  { id: 'branches', label: tr('Branch war sale') },
  { id: 'trend', label: tr('Is hafte / is mahine') },
];
const CREDIT_PROFIT = [
  { value: 'paid', label: tr('Paisa milne par (recommended)'), desc: tr('Udhaar bill ka profit tab ginein jab customer paisa de') },
  { value: 'bill', label: tr('Bill bante hi'), desc: tr('Udhaar bill ka poora profit bill ke din hi gin lein') },
];
const QUICK_TIMES = ['20:00', '21:00', '22:00', '23:00'];
const ROLE_LABEL: Record<string, string> = { OWNER: tr('Malik'), MANAGER: tr('Manager'), CASHIER: tr('Cashier'), STAFF: tr('Staff') };

/** 0 → "raat 12 baje", 14 → "dopahar 2 baje" */
function hourLabel(h: number) {
  const n = ((Math.trunc(h) % 24) + 24) % 24;
  const t12 = n % 12 === 0 ? 12 : n % 12;
  const part = n < 5 ? 'raat' : n < 12 ? 'subah' : n < 16 ? 'dopahar' : n < 19 ? 'shaam' : 'raat';
  return tr('{{part}} {{t12}} baje', { part, t12 });
}

/** "21:30" → "raat 9:30 baje" */
function timeLabel(value: string) {
  const [h, m] = value.split(':').map(Number);
  if (!Number.isFinite(h)) return value;
  const base = hourLabel(h);
  return m ? base.replace(' baje', `:${String(m).padStart(2, '0')} baje`) : base;
}

function shiftKey(key: string, days: number) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function dayLabel(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

function pct(now: number, before: number) {
  if (!before) return null;
  return Math.round(((now - before) / Math.abs(before)) * 100);
}

const toggleIn = <T,>(list: T[], item: T, on: boolean) => (on ? [...new Set([...list, item])] : list.filter((x) => x !== item));

/** Settings → Reports config: read once, each change saved at once and shown before the server answers. */
function useReportSettings() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['reports-config'], queryFn: reportsConfigApi.get, staleTime: 60_000 });
  const save = useMutation({
    mutationFn: reportsConfigApi.update,
    onMutate: async (patch: ReportsConfigPatch) => {
      await qc.cancelQueries({ queryKey: ['reports-config'] });
      const before = qc.getQueryData<ReportsConfig>(['reports-config']);
      if (before) qc.setQueryData<ReportsConfig>(['reports-config'], { ...before, ...patch, summary: { ...before.summary, ...(patch.summary ?? {}) } });
      return { before };
    },
    onError: (e: any, _p, ctx) => {
      if (ctx?.before) qc.setQueryData(['reports-config'], ctx.before);
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || tr('Save nahi hua'));
    },
    onSuccess: (next, patch) => {
      qc.setQueryData(['reports-config'], next);
      qc.invalidateQueries({ queryKey: [REPORT_PREFS_KEY] });
      qc.invalidateQueries({ queryKey: ['daily-summary'] });
      // The khata profit basis changes the headline profit on every screen.
      if (patch.creditProfit) qc.invalidateQueries();
    },
  });
  return { config: query.data, loading: query.isLoading, save: (patch: ReportsConfigPatch) => save.mutate(patch), saving: save.isPending };
}

export function ReportsSection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);
  const canReports = usePermission(PERMISSIONS.REPORTS_VIEW);
  const canTeam = usePermission(PERMISSIONS.TEAM_VIEW);
  const owner = isOwner(useAuthStore((s) => s.user?.role) as string | undefined);
  const rc = useReportSettings();
  const cfg = rc.config;
  const status = useQuery({
    queryKey: ['daily-summary', 'status', draft.dailySummaryTime, draft.notifyDailySummary, draft.firstDayOfWeek],
    queryFn: dailySummaryApi.status,
    enabled: canReports && !dirty,
    staleTime: 30_000,
  });
  const st = status.data;
  const startHour = Number(draft.businessDayStartHour ?? 0);
  const on = draft.notifyDailySummary;
  const time = draft.dailySummaryTime || '21:00';
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  const today = businessDayKey(new Date(), startHour);

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving || rc.saving} dirty={dirty} />

      <SectionCard title={tr('Report ka din aur hafta')} desc={tr('Har report, dashboard aur rozana hisaab inhi par chalta hai')} icon={CalendarDays} color="sky">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sky-700 ring-1 ring-slate-200">
              <Sunrise className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{tr('Din kab shuru hota hai: {{startHour}}', { startHour: hourLabel(startHour) })}</p>
              <p className="text-xs text-slate-500">
                {tr('Time zone {{timezone}}. {{value}}', { timezone: draft.timezone, value: startHour === 0 ? tr('Din raat 12 baje badalta hai.') : tr('Is se pehle ki sale pichhle din me ginti hai.') })}
              </p>
            </div>
          </div>
          <SettingLink to="/settings/language" find={tr('Din kab shuru hota hai')}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">
            {tr('Badlein →')}
          </SettingLink>
        </div>

        <Divider />

        <Field label={tr('Hafta kis din shuru hota hai')} hint={tr('Rozana report me "is hafte" ki sale isi din se gini jaati hai.')}>
          <ChoiceGroup value={(draft.firstDayOfWeek || 'monday').toLowerCase()} onChange={(v) => set('firstDayOfWeek', v)} columns={3}
            options={WEEK_STARTS} />
        </Field>
      </SectionCard>

      <SectionCard title={tr('Report kaise khulein')} desc={tr('Har report pehli dafa kis period aur muqable ke saath khule')} icon={ListChecks} color="indigo">
        {!cfg ? <ConfigSkeleton /> : (
          <>
            <Field label={tr('Maali saal kis mahine se shuru hota hai')}
              hint={tr('Pakistan me tax ka saal July se shuru hota hai. "Maali saal" period isi mahine se gini jaati hai — abhi {{value}} {{value2}} se.', { value: dayLabel(fiscalYearStart(today, cfg.fiscalYearStartMonth)), value2: fiscalYearStart(today, cfg.fiscalYearStartMonth).slice(0, 4) })}>
              <div className="max-w-xs">
                <Select value={String(cfg.fiscalYearStartMonth)} onChange={(e) => rc.save({ fiscalYearStartMonth: Number(e.target.value) })} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
              </div>
            </Field>

            <Divider />
            <Field label={tr('Report kis period se khule')}
              hint={tr('Reports, Profit-loss, Staff, Customers, Nigrani, Profit by product aur Stock report pehli dafa isi period ke saath khulte hain. Safhe par period badlein to wohi chalti hai.')}>
              <ChoiceGroup value={cfg.defaultPeriod} onChange={(v) => rc.save({ defaultPeriod: v })} columns={4} options={PERIODS} />
            </Field>

            <Divider />
            <Field label={tr('Muqabla')} hint={tr('Har number pichli period se milaya jaye ya nahi. Jis ne kisi report par khud muqabla badla ho, us ke browser me wohi rehta hai.')}>
              <ChoiceGroup value={cfg.compareDefault} onChange={(v) => rc.save({ compareDefault: v })} columns={3} options={COMPARES} />
            </Field>

            <Divider />
            <Field label={tr('Amount kaise dikhe')} hint={tr('Sirf reports aur rozana report me dikhane ka tareeqa. Hisaab aur bill paise tak hi rehte hain.')}>
              <ChoiceGroup value={cfg.roundOff} onChange={(v) => rc.save({ roundOff: v })} columns={2} options={ROUNDS} />
            </Field>
          </>
        )}
      </SectionCard>

      <SectionCard id="credit-profit" title={tr('Udhaar ka profit kab ginein')} desc={tr('Khate (udhaar) par bike maal ka profit headline me kab aaye')} icon={HandCoins} color="emerald">
        {!cfg ? <ConfigSkeleton /> : (
          <>
            <Field label={tr('Headline profit')} hint={tr('Dashboard, din ka hisaab, reports, Profit-loss, rozana report aur Nafaa AI sab isi ko maante hain.')}>
              <ChoiceGroup value={cfg.creditProfit ?? 'paid'} onChange={(v) => rc.save({ creditProfit: v as 'paid' | 'bill' })} columns={2} options={CREDIT_PROFIT} />
            </Field>
            <Alert className="mt-3" tone="info" icon={<HandCoins className="h-4 w-4" />}>
              {tr('Dono figures hamesha saath dikhte hain:')}{' '} <b>{tr('Haath mein aaya profit')}</b> {' '}{tr('(jis ka paisa aa gaya) aur')}{' '} <b>{tr('Udhaar mein profit')}</b> {' '}{tr('(jo abhi aana hai). Kuch chhupta nahi — bill ka profit = haath mein + udhaar mein. Cash ya online wala hissa bill ke din hi ginta hai; khate wala hissa customer ke paisa dene par, purane khate se shuru ho kar tareekh ke hisaab se.')}
            </Alert>
          </>
        )}
      </SectionCard>

      <SectionCard title={tr('Staff ko kaun se figures dikhein')} desc={tr('Malik ke ilawa sab ke liye, reports me')} icon={ShieldCheck} color="rose"
        badge={!owner ? <Badge size="xs" variant="default"><Lock className="h-3 w-3" />{tr('Sirf malik')}</Badge> : undefined}>
        {!cfg ? <ConfigSkeleton /> : (
          <>
            {FIGURES.map((f) => (
              <Toggle key={f.id} icon={f.icon} label={f.label} desc={f.desc} disabled={!owner}
                checked={cfg.staffFigures.includes(f.id)}
                onChange={(v) => rc.save({ staffFigures: toggleIn(cfg.staffFigures, f.id, v) })} />
            ))}
            <Alert className="mt-3" tone="info" icon={<ShieldCheck className="h-4 w-4" />}>
              {tr('Ye sirf dikhane ka usool hai — kisi ko nayi permission nahi deta. Band karne par server hi ye figures nahi bhejta: reports, din ka hisaab, rozana report aur un ke print/CSV me. Malik ko hamesha sab dikhta hai. Nigrani me galle ka farq dikhta rehta hai, wo chori pakadne ke liye hai.')}
              {canTeam && <> <Link to="/staff?tab=roles" className="font-semibold underline underline-offset-2">{tr('Roles & permissions')}</Link></>}
            </Alert>
          </>
        )}
      </SectionCard>

      <SectionCard title={tr('Rozana closing report')} desc={tr('Din ke aakhir me poora hisaab khud aap ke paas aata hai')} icon={Bell} color="amber"
        badge={<Badge size="xs" variant={on ? 'success' : 'default'}>{on ? tr('Chalu') : tr('Band')}</Badge>}>
        <Toggle checked={on} onChange={(v) => set('notifyDailySummary', v)} icon={Bell}
          label={tr('Rozana report bhejein')}
          desc={tr('Har din ek dafa, chune hue waqt par. Jis din na sale hui na expense, us din nahi aati.')} />

        {on && (
          <>
            <Divider />
            <Field label={tr('Kis waqt bhejein')} error={validTime ? undefined : tr('Waqt HH:MM shakal me likhein, jaise 21:00')}
              hint={tr('Dukaan ke time zone ke mutabiq. Din shuru hone ke 6 ghante ke andar ka waqt rakhein to pichhle din ka hisaab aata hai.')}>
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-36">
                  <Input type="time" value={time ?? ''} onChange={(e) => set('dailySummaryTime', e.target.value)} leftIcon={<Clock className="h-4 w-4" />} />
                </div>
                {QUICK_TIMES.map((t) => (
                  <button key={t} type="button" onClick={() => set('dailySummaryTime', t)}
                    className={cn('rounded-full px-3 py-1.5 text-[0.8125rem] font-medium ring-1 transition',
                      time === t ? 'bg-brand-600 text-brand-fg ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                    {timeLabel(t)}
                  </button>
                ))}
              </div>
            </Field>

            {st?.nextRunAt && !dirty && (
              <p className="mt-3 text-xs text-slate-600">
                {tr('Agli report:')}{' '} <span className="font-semibold text-slate-900">
                  {new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: st.timezone }).format(new Date(st.nextRunAt))}
                </span>{' '}{tr('({{nextDay}} ka hisaab)', { nextDay: dayLabel(st.nextDay) })}
              </p>
            )}

            <Divider label={tr('Kahan milti hai')} />
            {!cfg ? <ConfigSkeleton /> : (
              <Channels cfg={cfg} emailOn={draft.emailNotifications} onSave={rc.save} />
            )}
          </>
        )}
      </SectionCard>

      <SectionCard title={tr('Kis ko milti hai')} desc={tr('Malik, aur har woh banda jis ke paas \'Reports dekhna\' ki permission hai — in me se jinhein aap chunein')} icon={Users} color="violet"
        badge={st ? <Badge size="xs" variant="info"><span className="opacity-70">{tr('Log')}</span>{st.recipients.filter((p) => p.selected).length}</Badge> : undefined}>
        {!canReports ? (
          <p className="text-sm text-slate-500">{tr('Ye list dekhne ke liye \'Reports dekhna\' ki permission chahiye.')}</p>
        ) : status.isLoading || !cfg ? (
          <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-11" />)}</div>
        ) : (
          <Recipients cfg={cfg} people={st?.recipients ?? []} emailOn={!!st?.emailOn && cfg.summary.channels.includes('email')} onSave={rc.save} />
        )}
        <Alert className="mt-3" tone="info" icon={<ShieldCheck className="h-4 w-4" />}>
          {tr('Profit sirf unhein dikhta hai jin ke paas \'Cost dekhna\' ki permission hai aur upar staff ke liye profit chalu hai. Branch se juda manager sirf apni branch ka hisaab paata hai.')}
          {canTeam && <> <Link to="/staff?tab=roles" className="font-semibold underline underline-offset-2">{tr('Permission badlein')}</Link></>}
        </Alert>
      </SectionCard>

      <SectionCard title={tr('Report me kya ho')} desc={tr('Sale aur bill hamesha; baaki jo aap chunein')} icon={ListChecks} color="cyan">
        {!cfg ? <ConfigSkeleton /> : (
          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {PARTS.map((p) => {
              const checked = cfg.summary.include.includes(p.id);
              return (
                <Checkbox key={p.id} label={p.label} checked={checked} className="rounded-lg px-2 py-2 hover:bg-slate-50"
                  onChange={(e) => rc.save({ summary: { include: toggleIn(cfg.summary.include, p.id, e.target.checked) } })} />
              );
            })}
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500">{tr('Profit aur galla har bande ko apni permission aur staff wale usool ke mutabiq hi milta hai.')}</p>
      </SectionCard>

      {canReports && <PreviewCard settings={draft} today={st?.today} recent={st?.recent ?? []} />}
    </div>
  );
}

function ConfigSkeleton() {
  return <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-11" />)}</div>;
}

function Channels({ cfg, emailOn, onSave }: {
  cfg: ReportsConfig; emailOn: boolean; onSave: (p: ReportsConfigPatch) => void;
}) {
  const has = (c: SummaryChannel) => cfg.summary.channels.includes(c);
  const setChannel = (c: SummaryChannel, v: boolean) => onSave({ summary: { channels: toggleIn(cfg.summary.channels, c, v) } });
  return (
    <>
      <Toggle icon={Smartphone} label={tr('App notification')} checked disabled onChange={() => undefined}
        desc={tr('Hamesha jaati hai — ghanti me aur mobile app par push.')} />
      <Toggle icon={Mail} label={tr('Email')} checked={has('email')} onChange={(v) => setChannel('email', v)}
        desc={<>{tr('Har chune hue bande ki tasdeeq shuda email par.')}{has('email') && !emailOn && <> <span className="font-semibold text-amber-700">{tr('Dukaan ki email band hai —')}</span> <Link to="/settings/notifications" className="font-semibold text-brand-700 underline-offset-2 hover:underline">{tr('Email settings')}</Link></>}</>} />
      <Toggle icon={MessageCircle} label={tr('WhatsApp')} checked={has('whatsapp')} onChange={(v) => setChannel('whatsapp', v)}
        desc={tr('App notification me \'WhatsApp par bhejein\' ka button aata hai. Dabane par WhatsApp khulta hai, message likha hua milta hai — bhejna aap ke haath me.')} />
    </>
  );
}

function Recipients({ cfg, people, emailOn, onSave }: {
  cfg: ReportsConfig; people: DailySummaryStatus['recipients']; emailOn: boolean; onSave: (p: ReportsConfigPatch) => void;
}) {
  const everyone = cfg.summary.recipientIds === null;
  const chosen = new Set(cfg.summary.recipientIds ?? people.map((p) => p.id));
  const pick = (id: string, v: boolean) => {
    const next = people.map((p) => p.id).filter((x) => (x === id ? v : chosen.has(x)));
    onSave({ summary: { recipientIds: next } });
  };
  return (
    <>
      <Toggle icon={Users} label={tr('Sab ko bhejein')} checked={everyone}
        desc={tr('Chalu ho to aage jo bhi \'Reports dekhna\' ki permission paye, usay bhi khud milne lagegi.')}
        onChange={(v) => onSave({ summary: { recipientIds: v ? null : people.map((p) => p.id) } })} />
      <ul className="divide-y divide-slate-200">
        {people.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2 py-2.5">
            <Checkbox aria-label={tr('{{name}} ko bhejein', { name: p.name })} disabled={everyone} checked={everyone || chosen.has(p.id)}
              onChange={(e) => pick(p.id, e.target.checked)} />
            <Avatar name={p.name} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{p.name}</p>
              <p className="text-xs text-slate-500">
                {ROLE_LABEL[p.role] ?? p.role} · {p.branch ? tr('Sirf {{branch}}', { branch: p.branch }) : tr('Sab branches')}
                {emailOn && <> · {p.hasEmail ? tr('email bhi') : tr('email tasdeeq nahi')}</>}
              </p>
            </div>
            <Badge size="xs" variant={p.seesProfit ? 'success' : 'default'}>{p.seesProfit ? tr('Profit bhi') : tr('Profit nahi')}</Badge>
            {!p.seesDrawer && <Badge size="xs" variant="default">{tr('Galla nahi')}</Badge>}
          </li>
        ))}
      </ul>
    </>
  );
}

function PreviewCard({ settings, today, recent }: {
  settings: TenantSettings;
  today?: string;
  recent: Array<{ day: string; at: string; auto: boolean; people: number }>;
}) {
  const qc = useQueryClient();
  const [which, setWhich] = useState<'today' | 'yesterday'>('today');
  // Without the status call the server picks the current business day.
  const date = which === 'today' ? today : today ? shiftKey(today, -1) : undefined;
  const costHidden = useCostHidden();
  const preview = useQuery({
    queryKey: ['daily-summary', 'preview', date],
    queryFn: () => dailySummaryApi.preview(date),
    enabled: which === 'today' || !!date,
    staleTime: 60_000,
  });
  const send = useMutation({
    mutationFn: () => dailySummaryApi.send(date),
    onSuccess: (r) => {
      toast.success(r.sent ? tr('{{sent}} logon ko bhej di{{value}}', { sent: r.sent, value: r.emailed ? tr(' · {{emailed}} ko email bhi', { emailed: r.emailed }) : '' }) : tr('Koi lene wala nahi mila'));
      qc.invalidateQueries({ queryKey: ['daily-summary', 'status'] });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || tr('Bhejna nahi hua'));
    },
  });

  const data = preview.data;
  // Profit lines stay out of the copy while cost is hidden on this screen.
  const body = data ? (costHidden ? data.message.body.split('\n').filter((l) => !l.startsWith('Profit')).join('\n') : data.message.body) : '';
  const phone = waNumber(settings.shopWhatsapp || settings.shopPhone);
  const waHref = body ? (phone ? `https://wa.me/${phone}?text=${encodeURIComponent(body)}` : `https://wa.me/?text=${encodeURIComponent(body)}`) : undefined;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      toast.success(tr('Copy ho gaya'));
    } catch {
      toast.error(tr('Copy nahi hua'));
    }
  };

  return (
    <SectionCard title={tr('Preview aur abhi bhejein')} desc={tr('Aap ki branch ka hisaab, bilkul waisa jaisa notification me jata hai')} icon={Eye} color="emerald"
      action={
        <Segmented label={tr('Kis din ka hisaab')} value={which} onChange={setWhich}
          items={[{ value: 'today', label: tr('Aaj') }, { value: 'yesterday', label: tr('Kal') }]} />
      }>
      {preview.isLoading || (which === 'yesterday' && !date) ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : preview.isError || !data ? (
        <p className="py-6 text-center text-sm text-slate-500">{tr('Preview nahi bana. Thori der baad dobara kholein.')}</p>
      ) : (
        <>
          <Figures s={data.summary} costHidden={costHidden} drawerHidden={data.drawerHidden} />

          {data.summary.topItems.length > 0 && (
            <>
              <Divider label={tr('Sab se zyada bika')} />
              <ul className="space-y-1.5">
                {data.summary.topItems.map((it, i) => {
                  const top = data.summary.topItems[0].revenue || 1;
                  return (
                    <li key={i} className="text-sm">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-slate-800">{it.name}</span>
                        <span className="shrink-0 tabular-nums text-slate-600">{it.qty} · {formatPKR(it.revenue)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(4, (it.revenue / top) * 100)}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <Divider label={tr('Message')} />
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-[0.8125rem] leading-relaxed text-slate-800 ring-1 ring-slate-200">
            {body}
          </pre>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => send.mutate()} loading={send.isPending} leftIcon={<Send className="h-4 w-4" />}>
              {send.isPending ? tr('Bhej rahe hain…') : tr('Abhi sab ko bhejein')}
            </Button>
            {waHref && (
              <a href={waHref} target="_blank" rel="noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-success-200 bg-white px-4 text-sm font-semibold text-success-700 shadow-sm transition hover:bg-success-50">
                <MessageCircle className="h-4 w-4" /> {' '}{tr('WhatsApp par bhejein')}
              </a>
            )}
            <Button variant="secondary" onClick={copy} leftIcon={<Copy className="h-4 w-4" />}>{tr('Copy')}</Button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {tr('"Abhi sab ko bhejein" chune hue logon ko chune hue tareeqon se bhejta hai. Har banda apni permission ke mutabiq hisaab dekhta hai.{{value}}', { value: phone ? tr(' WhatsApp dukaan ke apne number par khulta hai.') : tr(' Settings me dukaan ka WhatsApp number likhein to WhatsApp seedha usi par khulega.') })}
          </p>
        </>
      )}

      {recent.length > 0 && (
        <>
          <Divider label={tr('Pichhli reports')} />
          <ul className="space-y-1 text-xs text-slate-600">
            {recent.slice(0, 5).map((r, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2">
                <span>{tr('{{day}} ka hisaab · {{value}}', { day: dayLabel(r.day), value: r.auto ? tr('Khud gayi') : tr('Haath se bheji') })}</span>
                <span className="tabular-nums">
                  {tr('{{value}} · {{people}} log', { value: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(r.at)), people: r.people })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </SectionCard>
  );
}

function Figures({ s, costHidden, drawerHidden }: { s: DailySummary; costHidden: boolean; drawerHidden: boolean }) {
  const change = pct(s.sales.net, s.compare.previousDay);
  const profitShown = !costHidden && s.grossProfit !== undefined;
  const tiles: Array<{ label: string; value: ReactNode; hint: string; tone?: 'up' | 'down' }> = [
    {
      label: tr('Sale'),
      value: formatPKR(s.sales.net),
      hint: change === null ? tr('{{bills}} bill, return ke baad', { bills: s.sales.bills }) : tr('{{bills}} bill · kal se {{value}}{{change}}%', { bills: s.sales.bills, value: change > 0 ? '+' : '', change }),
      tone: change === null ? undefined : change >= 0 ? 'up' : 'down',
    },
    { label: tr('Return'), value: formatPKR(s.sales.returns), hint: tr('{{returnCount}} return{{value}}', { returnCount: s.sales.returnCount, value: s.sales.voidedCount ? tr(', {{voidedCount}} bill cancel', { voidedCount: s.sales.voidedCount }) : '' }) },
    { label: tr('Cash aaya'), value: formatPKR(s.money.cashSales), hint: tr('Online {{nonCash}}', { nonCash: formatPKR(s.money.nonCash) }) },
    drawerHidden ? {
      label: tr('Galla abhi'),
      value: <span className="inline-flex items-center gap-1 text-slate-400"><Lock className="h-3.5 w-3.5" /> {' '}{tr('Chhupa')}</span>,
      hint: tr('Malik ne staff se chhupaya'),
    } : {
      label: tr('Galla abhi'),
      value: s.money.drawerNow === null ? '—' : formatPKR(s.money.drawerNow),
      hint: s.money.drawerNow === null ? (s.money.closedDrawers ? tr('{{closedDrawers}} galla band hua', { closedDrawers: s.money.closedDrawers }) : tr('Koi galla khula nahi')) : tr('{{openDrawers}} khula galla', { openDrawers: s.money.openDrawers }),
    },
    {
      label: tr('Profit'),
      value: profitShown ? formatPKR(s.grossProfit) : <span className="inline-flex items-center gap-1 text-slate-400"><Lock className="h-3.5 w-3.5" /> {' '}{tr('Chhupa')}</span>,
      hint: profitShown && s.netProfit !== undefined ? tr('Kharchon ke baad {{netProfit}}', { netProfit: formatPKR(s.netProfit) }) : tr('Cost dekhne ki permission se'),
    },
    { label: tr('Expenses'), value: formatPKR(s.expenses.total), hint: s.expenses.top[0] ? tr('Zyada: {{name}}', { name: s.expenses.top[0].name }) : tr('{{count}} expenses', { count: s.expenses.count }) },
    { label: tr('Udhaar'), value: formatPKR(s.sales.credit), hint: tr('Wapas aaya {{khataCollected}}', { khataCollected: formatPKR(s.money.khataCollected) }) },
    { label: tr('Kam stock'), value: `${s.lowStock.out + s.lowStock.low}`, hint: tr('{{out}} khatam, {{low}} kam', { out: s.lowStock.out, low: s.lowStock.low }) },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-slate-200 p-3">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">{t.label}</p>
            <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-slate-900">{t.value}</p>
            <p className={cn('mt-0.5 truncate text-[0.6875rem]', t.tone === 'up' ? 'text-success-700' : t.tone === 'down' ? 'text-rose-700' : 'text-slate-500')}>{t.hint}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {tr('Is hafte ({{weekStart}} se) {{weekToDate}} · Is mahine {{monthToDate}} · Pichhle hafte isi din {{lastWeekSameDay}}', { weekStart: dayLabel(s.compare.weekStart), weekToDate: formatPKR(s.compare.weekToDate), monthToDate: formatPKR(s.compare.monthToDate), lastWeekSameDay: formatPKR(s.compare.lastWeekSameDay) })}
      </p>
      {s.branches.length > 0 && (
        <p className="mt-1 text-xs text-slate-500">{tr('Branches: {{value}}', { value: s.branches.map((b) => `${b.name} ${formatPKR(b.sales)}`).join(' · ') })}</p>
      )}
    </>
  );
}
