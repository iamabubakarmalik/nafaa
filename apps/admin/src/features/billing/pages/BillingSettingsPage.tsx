/**
 * Billing settings: the rules every shop's billing follows — trial length,
 * grace days after a plan ends, days to pay for an add-on, when renewal
 * bills and reminders go out, and notice before the grandfather period
 * ends. Also runs the hourly billing check on demand.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, CalendarClock, Clock, Hourglass, Lightbulb, Lock, Play, Plus, Receipt, Save, ShieldCheck, X } from 'lucide-react';
import { Alert, Button, Card, Input, PageHero, PageShell, Skeleton, confirmDialog, heroButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminBillingCatalogApi, type BillingSettings } from '@/api/admin-billing-catalog.api';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';

const KEY = ['admin', 'billing', 'settings'];

const RESULT_LABELS: Record<string, string> = {
  addOnDue: 'Add-on payment reminders and switch-offs',
  addOnEnded: 'Add-ons whose period ended',
  renewals: 'Renewal bills made',
  reminders: 'Plan reminders sent',
  grandfather: 'Grandfather notices sent',
  limits: 'Limit warnings sent',
  channels: 'Channels paused or resumed',
};

/** A list of day numbers as removable chips with an add box. */
function DayChips({ value, onChange, disabled, label, hint }: { value: number[]; onChange: (v: number[]) => void; disabled?: boolean; label: string; hint: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const n = Math.floor(Number(draft));
    if (!draft || !Number.isFinite(n) || n < 0 || n > 60) return toast.error('Enter a number of days from 0 to 60');
    onChange([...new Set([...value, n])].sort((a, b) => b - a));
    setDraft('');
  };
  return (
    <div>
      <div className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">{label}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((d) => (
          <span key={d} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pe-1.5 ps-3 text-[0.8125rem] font-medium text-brand-800 ring-1 ring-brand-200">
            {d === 0 ? 'On the day' : `${d} day${d === 1 ? '' : 's'} before`}
            {!disabled && <button type="button" aria-label={`Remove ${d}`} className="rounded-full p-0.5 hover:bg-brand-100" onClick={() => onChange(value.filter((x) => x !== d))}><X className="h-3 w-3" /></button>}
          </span>
        ))}
        {!value.length && <span className="text-[0.8125rem] text-slate-500">None</span>}
        {!disabled && (
          <span className="inline-flex items-center gap-1">
            <Input aria-label={`Add to ${label}`} type="number" min={0} max={60} size="sm" value={draft} onChange={(e) => setDraft(e.target.value)} wrapperClassName="w-20"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
            <Button size="xs" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={add}>Add</Button>
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[0.75rem] text-slate-500">{hint}</p>
    </div>
  );
}

export default function BillingSettingsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const can = useCan();
  const canManage = can('plans.manage');
  const canRun = can('billing.manage');
  const settings = useQuery({ queryKey: KEY, queryFn: adminBillingCatalogApi.settings });
  const s = settings.data;
  const [form, setForm] = useState<BillingSettings | null>(null);
  useEffect(() => { if (s) setForm(s); }, [s]);
  const dirty = useMemo(() => !!s && !!form && JSON.stringify(s) !== JSON.stringify(form), [s, form]);
  const [lastRun, setLastRun] = useState<Record<string, number> | null>(null);

  const save = useMutation({
    mutationFn: () => adminBillingCatalogApi.saveSettings(form!),
    onSuccess: (next) => { qc.setQueryData(KEY, next); setForm(next); toast.success('Billing settings saved. They apply from the next billing check.'); qc.invalidateQueries({ queryKey: ['admin', 'plans'] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const run = useMutation({
    mutationFn: adminBillingCatalogApi.runLifecycle,
    onSuccess: (r) => {
      if (!r.ran) { toast.info('The billing check is already running. Try again in a minute.'); return; }
      setLastRun(r.result);
      const total = Object.values(r.result).reduce((n, v) => n + v, 0);
      toast.success(total ? `Billing check done: ${total} change${total === 1 ? '' : 's'}` : 'Billing check done. Nothing was due.');
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const set = (patch: Partial<BillingSettings>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const field = (k: 'trialDays' | 'graceDays' | 'addOnPayDays' | 'renewalLeadDays', label: string, hint: string, max: number, min = 0) => (
    <Input label={label} type="number" min={min} max={max} value={form![k]} disabled={!canManage} hint={hint}
      onChange={(e) => set({ [k]: Number(e.target.value) || 0 } as Partial<BillingSettings>)} rightIcon={<span className="text-[0.75rem]">days</span>} />
  );

  return (
    <PageShell>
      <PageHero
        title="Billing settings"
        busy={settings.isFetching}
        loading={settings.isLoading}
        actions={
          <>
            {canManage && <button type="button" className={heroPrimaryButton} disabled={!dirty || save.isPending} onClick={() => save.mutate()}><Save className="h-4 w-4" /> Save</button>}
            {canRun && (
              <button type="button" className={heroButton} disabled={run.isPending} onClick={async () => {
                if (await confirmDialog({ title: 'Run the billing check now?', text: 'Makes renewal bills that are due, sends reminders, and switches off unpaid add-ons — the same as the hourly run. Messages are never sent twice.', yes: 'Run now' })) run.mutate();
              }}><Play className="h-4 w-4" /> {run.isPending ? 'Running…' : 'Run billing check now'}</button>
            )}
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={s ? [
          { label: 'Trial', value: `${s.trialDays} days` },
          { label: 'Grace after the end', value: `${s.graceDays} days`, hint: s.graceDays ? 'Then the app stops' : 'Stops the same day' },
          { label: 'Add-on pay window', value: `${s.addOnPayDays} days` },
          { label: 'Renewal bill', value: `${s.renewalLeadDays} days before` },
        ] : undefined}
      />

      {!canManage && <Alert tone="info" icon={<Lock className="h-4 w-4" />}>You can see these rules but not change them.</Alert>}

      {!form ? <Skeleton className="h-96 rounded-3xl" /> : (
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <Card title={<span className="inline-flex items-center gap-2"><Hourglass className="h-4 w-4 text-slate-500" /> Trial and plan end</span>} description="What a new shop gets, and what happens when a plan is not renewed.">
              <div className="grid gap-4 sm:grid-cols-2">
                {field('trialDays', 'Trial days', 'A new shop gets every feature and add-on free for this long. Also the trial plan’s length.', 90)}
                {field('graceDays', 'Grace days', 'After the plan ends, the shop keeps working this many days with a warning. Then the app stops until paid. 0 stops it the same day.', 30)}
              </div>
            </Card>
            <Card title={<span className="inline-flex items-center gap-2"><Receipt className="h-4 w-4 text-slate-500" /> Bills</span>} description="When bills are made and how long a shop has to pay them.">
              <div className="grid gap-4 sm:grid-cols-2">
                {field('addOnPayDays', 'Add-on pay days', 'An add-on a shop turns on works at once. If its bill is not paid in this many days, it switches off by itself.', 30)}
                {field('renewalLeadDays', 'Renewal bill lead', 'The renewal bill for the plan and its add-ons is made and sent this many days before the period ends.', 30, 1)}
              </div>
            </Card>
            <Card title={<span className="inline-flex items-center gap-2"><Bell className="h-4 w-4 text-slate-500" /> Reminders</span>} description="Email and in-app messages to the shop owner. Each one is sent once.">
              <div className="space-y-5">
                <DayChips label="Plan ending reminders" value={form.reminderDays} disabled={!canManage} onChange={(reminderDays) => set({ reminderDays })}
                  hint="Days before the plan ends. During grace days a reminder also goes out every day." />
                <DayChips label="Grandfather period notices" value={form.grandfatherNoticeDays} disabled={!canManage} onChange={(grandfatherNoticeDays) => set({ grandfatherNoticeDays })}
                  hint="Days before an existing shop’s free grandfather period ends, so it can choose a plan and add-ons in time." />
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card title={<span className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-slate-500" /> Billing check</span>} description="Runs every hour at 20 minutes past. It makes renewal bills, sends reminders and switches off unpaid add-ons.">
              {lastRun ? (
                <ul className="space-y-1.5 text-[0.8125rem]">
                  {Object.entries(lastRun).map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-3"><span className="text-slate-600">{RESULT_LABELS[k] ?? k}</span><b className="tabular-nums text-slate-900">{v}</b></li>
                  ))}
                </ul>
              ) : <p className="text-[0.8125rem] text-slate-500">Run it now to see what it changes. Results show here.</p>}
            </Card>
            <Card title={<span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-slate-500" /> What never happens</span>}>
              <ul className="list-disc space-y-1 ps-4 text-[0.8125rem] text-slate-600">
                <li>A shop’s data is never deleted when its plan ends.</li>
                <li>Selling at the counter is never blocked during grace days.</li>
                <li>The same reminder is never sent twice.</li>
              </ul>
            </Card>
          </div>
        </div>
      )}

      {guide.isOpen && (
        <PageGuide
          title="Billing settings"
          description="The rules that decide when bills go out and when a shop stops. They apply to every shop."
          flowTitle="A plan’s last days"
          flow={[
            { label: 'Renewal bill', hint: `${s?.renewalLeadDays ?? 7} days before`, icon: Receipt, color: '#4f46e5' },
            { label: 'Reminders', icon: Bell, color: '#0284c7' },
            { label: 'Plan ends', icon: CalendarClock, color: '#d97706' },
            { label: 'Grace days', hint: 'Still working', icon: Hourglass, color: '#db2777' },
            { label: 'App stops', hint: 'Until paid', icon: Lock, color: '#e11d48' },
          ]}
          steps={[
            { icon: Hourglass, color: '#4f46e5', title: 'Trial', text: 'New shops get everything for the trial days. Changing it does not change trials already running.' },
            { icon: CalendarClock, color: '#d97706', title: 'Grace days', text: 'How long a shop keeps working after its plan ends. Keep it short so unpaid shops do stop.' },
            { icon: Receipt, color: '#059669', title: 'Add-on pay days', text: 'Add-ons turned on mid-period work at once with a bill. Unpaid after these days, they switch off.' },
            { icon: Play, color: '#0284c7', title: 'Run now', text: 'Use it after changing a rule or a shop’s billing, instead of waiting for the next hour.' },
          ]}
          tips={['Every change here is in the audit log.', 'To give one shop more time, extend its plan in Shop 360 instead of changing these rules.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
