/**
 * Report settings: when the business day and week start, how reports open
 * (financial year, default period, comparison, round-off), which money
 * figures staff may see, and the automatic daily closing summary (time,
 * channels, recipients, lines, preview, send now, WhatsApp).
 * The day start hour lives in "Zubaan aur waqt"; this section links to it.
 */

import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bell, CalendarDays, Clock, Copy, Eye, Landmark, ListChecks, Lock, Mail, MessageCircle, Send, ShieldCheck, Smartphone, Sunrise, Users, Vault,
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
import { Alert, ChoiceGroup, Divider, Field, SectionCard, Select, StatPill, TextInput, Toggle } from '../components/UI';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { dailySummaryApi, type DailySummary, type DailySummaryStatus } from '../api/daily-summary.api';
import { reportsConfigApi, type ReportsConfig, type ReportsConfigPatch, type SummaryChannel, type SummaryPart } from '../api/reports-config.api';
import { SaveStatusBar } from './_SaveStatus';

const WEEK_STARTS = [
  { value: 'monday', label: 'Monday', desc: 'Aam hisaab' },
  { value: 'saturday', label: 'Saturday', desc: 'Kuch markets' },
  { value: 'sunday', label: 'Sunday', desc: 'Itwaar se' },
];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PERIODS = [
  { value: 'auto', label: 'Har report ka apna', desc: 'Jaise abhi hai' },
  { value: 'today', label: 'Aaj' },
  { value: 'yesterday', label: 'Kal' },
  { value: 'week', label: '7 din' },
  { value: 'month', label: '30 din' },
  { value: 'thisMonth', label: 'Is mahine' },
  { value: 'lastMonth', label: 'Pichhla mahina' },
  { value: 'fiscalYear', label: 'Maali saal', desc: 'Upar wale mahine se aaj tak' },
];
const COMPARES = [
  { value: 'prev', label: 'Pichli period', desc: 'Itne hi din, is se pehle' },
  { value: 'year', label: 'Pichla saal', desc: 'Nafa nuqsan me; baaki me pichli muddat' },
  { value: 'off', label: 'Muqabla band', desc: 'Report khud on kar sakti hai' },
];
const ROUNDS = [
  { value: 'paisa', label: 'Paise tak', desc: 'Rs 1,234.50' },
  { value: 'rupee', label: 'Poore rupay', desc: 'Rs 1,235' },
];
const FIGURES: Array<{ id: ReportFigure; label: string; desc: string; icon: typeof Bell }> = [
  { id: 'profit', label: 'Profit aur cost', desc: 'Profit, margin aur maal ki cost. Phir bhi sirf unhe jin ke paas "Cost aur profit dekhein" ki permission hai.', icon: Landmark },
  { id: 'drawer', label: 'Galle ka hisaab', desc: 'Galle me kitna hona chahiye, kitna gina, kam/zyada aur cash in/out.', icon: Vault },
];
const PARTS: Array<{ id: SummaryPart; label: string }> = [
  { id: 'returns', label: 'Return' },
  { id: 'voids', label: 'Cancel bill' },
  { id: 'discount', label: 'Discount' },
  { id: 'payments', label: 'Paisa kaise aaya' },
  { id: 'drawer', label: 'Galla abhi aur farq' },
  { id: 'profit', label: 'Profit' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'khata', label: 'Udhaar diya / wapas aaya' },
  { id: 'lowStock', label: 'Kam stock' },
  { id: 'topItems', label: 'Sab se zyada bika' },
  { id: 'topStaff', label: 'Sab se zyada sale wala banda' },
  { id: 'branches', label: 'Branch war sale' },
  { id: 'trend', label: 'Is hafte / is mahine' },
];
const QUICK_TIMES = ['20:00', '21:00', '22:00', '23:00'];
const ROLE_LABEL: Record<string, string> = { OWNER: 'Malik', MANAGER: 'Manager', CASHIER: 'Cashier', STAFF: 'Staff' };

/** 0 → "raat 12 baje", 14 → "dopahar 2 baje" */
function hourLabel(h: number) {
  const n = ((Math.trunc(h) % 24) + 24) % 24;
  const t12 = n % 12 === 0 ? 12 : n % 12;
  const part = n < 5 ? 'raat' : n < 12 ? 'subah' : n < 16 ? 'dopahar' : n < 19 ? 'shaam' : 'raat';
  return `${part} ${t12} baje`;
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
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Save nahi hua');
    },
    onSuccess: (next) => {
      qc.setQueryData(['reports-config'], next);
      qc.invalidateQueries({ queryKey: [REPORT_PREFS_KEY] });
      qc.invalidateQueries({ queryKey: ['daily-summary'] });
    },
  });
  return { config: query.data, loading: query.isLoading, save: (patch: ReportsConfigPatch) => save.mutate(patch), saving: save.isPending };
}

export function ReportsSection({ settings, onOpenLocalization, onOpenNotifications }: {
  settings: TenantSettings;
  onOpenLocalization: () => void;
  onOpenNotifications: () => void;
}) {
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

      <SectionCard title="Report ka din aur hafta" desc="Har report, dashboard aur rozana hisaab inhi par chalta hai" icon={CalendarDays} color="sky">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sky-700 ring-1 ring-slate-200">
              <Sunrise className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Din kab shuru hota hai: {hourLabel(startHour)}</p>
              <p className="text-xs text-slate-500">
                Time zone {draft.timezone}. {startHour === 0 ? 'Din raat 12 baje badalta hai.' : `Is se pehle ki sale pichhle din me ginti hai.`}
              </p>
            </div>
          </div>
          <button type="button" onClick={onOpenLocalization}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">
            Badlein →
          </button>
        </div>

        <Divider />

        <Field label="Hafta kis din shuru hota hai" hint={'Rozana report me "is hafte" ki sale isi din se gini jaati hai.'}>
          <ChoiceGroup value={(draft.firstDayOfWeek || 'monday').toLowerCase()} onChange={(v) => set('firstDayOfWeek', v)} columns={3}
            options={WEEK_STARTS} />
        </Field>
      </SectionCard>

      <SectionCard title="Report kaise khulein" desc="Har report pehli dafa kis period aur muqable ke saath khule" icon={ListChecks} color="indigo">
        {!cfg ? <ConfigSkeleton /> : (
          <>
            <Field label="Maali saal kis mahine se shuru hota hai"
              hint={`Pakistan me tax ka saal July se shuru hota hai. "Maali saal" period isi mahine se gini jaati hai — abhi ${dayLabel(fiscalYearStart(today, cfg.fiscalYearStartMonth))} ${fiscalYearStart(today, cfg.fiscalYearStartMonth).slice(0, 4)} se.`}>
              <div className="max-w-xs">
                <Select value={String(cfg.fiscalYearStartMonth)} onChange={(v) => rc.save({ fiscalYearStartMonth: Number(v) })}
                  options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
              </div>
            </Field>

            <Divider />
            <Field label="Report kis period se khule"
              hint="Reports, Profit-loss, Staff, Customers, Nigrani, Profit by product aur Stock report pehli dafa isi period ke saath khulte hain. Safhe par period badlein to wohi chalti hai.">
              <ChoiceGroup value={cfg.defaultPeriod} onChange={(v) => rc.save({ defaultPeriod: v })} columns={4} options={PERIODS} />
            </Field>

            <Divider />
            <Field label="Muqabla" hint="Har number pichli period se milaya jaye ya nahi. Jis ne kisi report par khud muqabla badla ho, us ke browser me wohi rehta hai.">
              <ChoiceGroup value={cfg.compareDefault} onChange={(v) => rc.save({ compareDefault: v })} columns={3} options={COMPARES} />
            </Field>

            <Divider />
            <Field label="Amount kaise dikhe" hint="Sirf reports aur rozana report me dikhane ka tareeqa. Hisaab aur bill paise tak hi rehte hain.">
              <ChoiceGroup value={cfg.roundOff} onChange={(v) => rc.save({ roundOff: v })} columns={2} options={ROUNDS} />
            </Field>
          </>
        )}
      </SectionCard>

      <SectionCard title="Staff ko kaun se figures dikhein" desc="Malik ke ilawa sab ke liye, reports me" icon={ShieldCheck} color="rose"
        badge={!owner ? <StatPill label="" value="Sirf malik" tone="slate" icon={Lock} /> : undefined}>
        {!cfg ? <ConfigSkeleton /> : (
          <>
            {FIGURES.map((f) => (
              <Toggle key={f.id} icon={f.icon} label={f.label} desc={f.desc} disabled={!owner}
                checked={cfg.staffFigures.includes(f.id)}
                onChange={(v) => rc.save({ staffFigures: toggleIn(cfg.staffFigures, f.id, v) })} />
            ))}
            <Alert tone="blue" icon={ShieldCheck}>
              Ye sirf dikhane ka usool hai — kisi ko nayi permission nahi deta. Band karne par server hi ye figures nahi bhejta: reports, din ka hisaab,
              rozana report aur un ke print/CSV me. Malik ko hamesha sab dikhta hai. Nigrani me galle ka farq dikhta rehta hai, wo chori pakadne ke liye hai.
              {canTeam && <> <Link to="/team" className="font-semibold underline underline-offset-2">Permissions Team me</Link></>}
            </Alert>
          </>
        )}
      </SectionCard>

      <SectionCard title="Rozana closing report" desc="Din ke aakhir me poora hisaab khud aap ke paas aata hai" icon={Bell} color="amber"
        badge={<StatPill label="" value={on ? 'Chalu' : 'Band'} tone={on ? 'emerald' : 'slate'} />}>
        <Toggle checked={on} onChange={(v) => set('notifyDailySummary', v)} icon={Bell}
          label="Rozana report bhejein"
          desc="Har din ek dafa, chune hue waqt par. Jis din na sale hui na expense, us din nahi aati." />

        {on && (
          <>
            <Divider />
            <Field label="Kis waqt bhejein" error={validTime ? undefined : 'Waqt HH:MM shakal me likhein, jaise 21:00'}
              hint={`Dukaan ke time zone ke mutabiq. Din shuru hone ke 6 ghante ke andar ka waqt rakhein to pichhle din ka hisaab aata hai.`}>
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-36">
                  <TextInput type="time" value={time} onChange={(v) => set('dailySummaryTime', v)} prefix={<Clock className="h-4 w-4" />} />
                </div>
                {QUICK_TIMES.map((t) => (
                  <button key={t} type="button" onClick={() => set('dailySummaryTime', t)}
                    className={cn('rounded-full px-3 py-1.5 text-[0.8125rem] font-medium ring-1 transition',
                      time === t ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                    {timeLabel(t)}
                  </button>
                ))}
              </div>
            </Field>

            {st?.nextRunAt && !dirty && (
              <p className="mt-3 text-xs text-slate-600">
                Agli report: <span className="font-semibold text-slate-900">
                  {new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: st.timezone }).format(new Date(st.nextRunAt))}
                </span>{' '}
                ({dayLabel(st.nextDay)} ka hisaab)
              </p>
            )}

            <Divider label="Kahan milti hai" />
            {!cfg ? <ConfigSkeleton /> : (
              <Channels cfg={cfg} emailOn={draft.emailNotifications} onSave={rc.save} onOpenNotifications={onOpenNotifications} />
            )}
          </>
        )}
      </SectionCard>

      <SectionCard title="Kis ko milti hai" desc="Malik, aur har woh banda jis ke paas 'Reports dekhna' ki permission hai — in me se jinhein aap chunein" icon={Users} color="violet"
        badge={st ? <StatPill label="Log" value={st.recipients.filter((p) => p.selected).length} tone="blue" /> : undefined}>
        {!canReports ? (
          <p className="text-sm text-slate-500">Ye list dekhne ke liye 'Reports dekhna' ki permission chahiye.</p>
        ) : status.isLoading || !cfg ? (
          <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-100" />)}</div>
        ) : (
          <Recipients cfg={cfg} people={st?.recipients ?? []} emailOn={!!st?.emailOn && cfg.summary.channels.includes('email')} onSave={rc.save} />
        )}
        <Alert tone="blue" icon={ShieldCheck}>
          Profit sirf unhein dikhta hai jin ke paas 'Cost dekhna' ki permission hai aur upar staff ke liye profit chalu hai. Branch se juda manager sirf apni branch ka hisaab paata hai.
          {canTeam && <> <Link to="/team" className="font-semibold underline underline-offset-2">Team me permission badlein</Link></>}
        </Alert>
      </SectionCard>

      <SectionCard title="Report me kya ho" desc="Bikri aur bill hamesha; baaki jo aap chunein" icon={ListChecks} color="cyan">
        {!cfg ? <ConfigSkeleton /> : (
          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {PARTS.map((p) => {
              const checked = cfg.summary.include.includes(p.id);
              return (
                <label key={p.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-slate-800 hover:bg-slate-50">
                  <input type="checkbox" checked={checked} className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                    onChange={(e) => rc.save({ summary: { include: toggleIn(cfg.summary.include, p.id, e.target.checked) } })} />
                  {p.label}
                </label>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500">Profit aur galla har bande ko apni permission aur staff wale usool ke mutabiq hi milta hai.</p>
      </SectionCard>

      {canReports && <PreviewCard settings={draft} today={st?.today} recent={st?.recent ?? []} />}
    </div>
  );
}

function ConfigSkeleton() {
  return <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-100" />)}</div>;
}

function Channels({ cfg, emailOn, onSave, onOpenNotifications }: {
  cfg: ReportsConfig; emailOn: boolean; onSave: (p: ReportsConfigPatch) => void; onOpenNotifications: () => void;
}) {
  const has = (c: SummaryChannel) => cfg.summary.channels.includes(c);
  const setChannel = (c: SummaryChannel, v: boolean) => onSave({ summary: { channels: toggleIn(cfg.summary.channels, c, v) } });
  return (
    <>
      <Toggle icon={Smartphone} label="App notification" checked disabled onChange={() => undefined}
        desc="Hamesha jaati hai — ghanti me aur mobile app par push." />
      <Toggle icon={Mail} label="Email" checked={has('email')} onChange={(v) => setChannel('email', v)}
        desc={<>Har chune hue bande ki tasdeeq shuda email par.{has('email') && !emailOn && <> <span className="font-semibold text-amber-700">Dukaan ki email band hai —</span> <button type="button" onClick={onOpenNotifications} className="font-semibold text-brand-700 underline-offset-2 hover:underline">Email settings</button></>}</>} />
      <Toggle icon={MessageCircle} label="WhatsApp" checked={has('whatsapp')} onChange={(v) => setChannel('whatsapp', v)}
        desc="App notification me 'WhatsApp par bhejein' ka button aata hai. Dabane par WhatsApp khulta hai, paighaam likha hua milta hai — bhejna aap ke haath me." />
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
      <Toggle icon={Users} label="Sab ko bhejein" checked={everyone}
        desc="Chalu ho to aage jo bhi 'Reports dekhna' ki permission paye, usay bhi khud milne lagegi."
        onChange={(v) => onSave({ summary: { recipientIds: v ? null : people.map((p) => p.id) } })} />
      <ul className="divide-y divide-slate-100">
        {people.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2 py-2.5">
            <input type="checkbox" aria-label={`${p.name} ko bhejein`} disabled={everyone} checked={everyone || chosen.has(p.id)}
              onChange={(e) => pick(p.id, e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-brand-600 disabled:opacity-50" />
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
              {p.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{p.name}</p>
              <p className="text-xs text-slate-500">
                {ROLE_LABEL[p.role] ?? p.role} · {p.branch ? `Sirf ${p.branch}` : 'Sab branches'}
                {emailOn && <> · {p.hasEmail ? 'email bhi' : 'email tasdeeq nahi'}</>}
              </p>
            </div>
            <StatPill label="" value={p.seesProfit ? 'Munafa bhi' : 'Munafa nahi'} tone={p.seesProfit ? 'emerald' : 'slate'} />
            {!p.seesDrawer && <StatPill label="" value="Galla nahi" tone="slate" />}
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
      toast.success(r.sent ? `${r.sent} logon ko bhej di${r.emailed ? ` · ${r.emailed} ko email bhi` : ''}` : 'Koi lene wala nahi mila');
      qc.invalidateQueries({ queryKey: ['daily-summary', 'status'] });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Bhejna nahi hua');
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
      toast.success('Copy ho gaya');
    } catch {
      toast.error('Copy nahi hua');
    }
  };

  return (
    <SectionCard title="Preview aur abhi bhejein" desc="Aap ki branch ka hisaab, bilkul waisa jaisa notification me jata hai" icon={Eye} color="emerald"
      action={
        <div role="tablist" className="inline-flex rounded-lg bg-slate-100 p-0.5">
          {(['today', 'yesterday'] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={which === k} onClick={() => setWhich(k)}
              className={cn('rounded-md px-2.5 py-1 text-[0.8125rem] font-medium transition',
                which === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
              {k === 'today' ? 'Aaj' : 'Kal'}
            </button>
          ))}
        </div>
      }>
      {preview.isLoading || (which === 'yesterday' && !date) ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : preview.isError || !data ? (
        <p className="py-6 text-center text-sm text-slate-500">Preview nahi bana. Thori der baad dobara kholein.</p>
      ) : (
        <>
          <Figures s={data.summary} costHidden={costHidden} drawerHidden={data.drawerHidden} />

          {data.summary.topItems.length > 0 && (
            <>
              <Divider label="Sab se zyada bika" />
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

          <Divider label="Paighaam" />
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-[0.8125rem] leading-relaxed text-slate-800 ring-1 ring-slate-200">
            {body}
          </pre>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => send.mutate()} disabled={send.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">
              <Send className="h-4 w-4" /> {send.isPending ? 'Bhej rahe hain…' : 'Abhi sab ko bhejein'}
            </button>
            {waHref && (
              <a href={waHref} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-50">
                <MessageCircle className="h-4 w-4" /> WhatsApp par bhejein
              </a>
            )}
            <button type="button" onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">
              <Copy className="h-4 w-4" /> Copy
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            "Abhi sab ko bhejein" chune hue logon ko chune hue tareeqon se bhejta hai. Har banda apni permission ke mutabiq hisaab dekhta hai.
            {phone ? ' WhatsApp dukaan ke apne number par khulta hai.' : ' Settings me dukaan ka WhatsApp number likhein to WhatsApp seedha usi par khulega.'}
          </p>
        </>
      )}

      {recent.length > 0 && (
        <>
          <Divider label="Pichhli reports" />
          <ul className="space-y-1 text-xs text-slate-600">
            {recent.slice(0, 5).map((r, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2">
                <span>{dayLabel(r.day)} ka hisaab · {r.auto ? 'Khud gayi' : 'Haath se bheji'}</span>
                <span className="tabular-nums">
                  {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(r.at))} · {r.people} log
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
      label: 'Sale',
      value: formatPKR(s.sales.net),
      hint: change === null ? `${s.sales.bills} bill, return ke baad` : `${s.sales.bills} bill · kal se ${change > 0 ? '+' : ''}${change}%`,
      tone: change === null ? undefined : change >= 0 ? 'up' : 'down',
    },
    { label: 'Return', value: formatPKR(s.sales.returns), hint: `${s.sales.returnCount} return` + (s.sales.voidedCount ? `, ${s.sales.voidedCount} bill cancel` : '') },
    { label: 'Cash aaya', value: formatPKR(s.money.cashSales), hint: `Online ${formatPKR(s.money.nonCash)}` },
    drawerHidden ? {
      label: 'Galla abhi',
      value: <span className="inline-flex items-center gap-1 text-slate-400"><Lock className="h-3.5 w-3.5" /> Chhupa</span>,
      hint: 'Malik ne staff se chhupaya',
    } : {
      label: 'Galla abhi',
      value: s.money.drawerNow === null ? '—' : formatPKR(s.money.drawerNow),
      hint: s.money.drawerNow === null ? (s.money.closedDrawers ? `${s.money.closedDrawers} galla band hua` : 'Koi galla khula nahi') : `${s.money.openDrawers} khula galla`,
    },
    {
      label: 'Profit',
      value: profitShown ? formatPKR(s.grossProfit) : <span className="inline-flex items-center gap-1 text-slate-400"><Lock className="h-3.5 w-3.5" /> Chhupa</span>,
      hint: profitShown && s.netProfit !== undefined ? `Kharchon ke baad ${formatPKR(s.netProfit)}` : 'Cost dekhne ki permission se',
    },
    { label: 'Expenses', value: formatPKR(s.expenses.total), hint: s.expenses.top[0] ? `Zyada: ${s.expenses.top[0].name}` : `${s.expenses.count} expenses` },
    { label: 'Udhaar', value: formatPKR(s.sales.credit), hint: `Wapas aaya ${formatPKR(s.money.khataCollected)}` },
    { label: 'Kam stock', value: `${s.lowStock.out + s.lowStock.low}`, hint: `${s.lowStock.out} khatam, ${s.lowStock.low} kam` },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-slate-200 p-3">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">{t.label}</p>
            <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-slate-900">{t.value}</p>
            <p className={cn('mt-0.5 truncate text-[0.6875rem]', t.tone === 'up' ? 'text-emerald-700' : t.tone === 'down' ? 'text-rose-700' : 'text-slate-500')}>{t.hint}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Is hafte ({dayLabel(s.compare.weekStart)} se) {formatPKR(s.compare.weekToDate)} · Is mahine {formatPKR(s.compare.monthToDate)} · Pichhle hafte isi din {formatPKR(s.compare.lastWeekSameDay)}
      </p>
      {s.branches.length > 0 && (
        <p className="mt-1 text-xs text-slate-500">Branches: {s.branches.map((b) => `${b.name} ${formatPKR(b.sales)}`).join(' · ')}</p>
      )}
    </>
  );
}
