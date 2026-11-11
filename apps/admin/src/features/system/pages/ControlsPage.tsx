/**
 * Platform switches: maintenance mode for the merchant apps, new shop signups
 * and Nafaa AI. Each switch takes effect on every server within 15 seconds.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bot, Clock, Lightbulb, Lock, Power, Server, Store, UserPlus, Wrench } from 'lucide-react';
import { Alert, Button, Card, Input, PageHero, PageShell, Skeleton, Switch, Textarea, confirmDialog, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminSystemApi, type SystemControls } from '@/api/admin-system.api';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { formatDateTime, formatRelative } from '@/lib/format';
import { StatusBadge } from '@/ui';

const KEY = ['admin', 'system', 'controls'];

/** ISO → value for <input type="datetime-local"> in the browser's time. */
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};

export default function ControlsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const can = useCan();
  const canManage = can('system.manage');
  const controls = useQuery({ queryKey: KEY, queryFn: adminSystemApi.controls, refetchInterval: 30_000 });
  const c = controls.data;

  const [message, setMessage] = useState('');
  const [until, setUntil] = useState('');
  useEffect(() => {
    if (!c) return;
    setMessage(c.maintenance.message);
    setUntil(toLocalInput(c.maintenance.until));
  }, [c?.maintenance.message, c?.maintenance.until]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = (next: SystemControls, text: string) => { qc.setQueryData(KEY, next); toast.success(text); };
  const maintenance = useMutation({
    mutationFn: (on: boolean) => adminSystemApi.setMaintenance({ on, message, until: until ? new Date(until).toISOString() : null }),
    onSuccess: (next, on) => done(next, on ? (c?.maintenance.on ? 'Maintenance notice updated' : 'Maintenance mode is on') : 'Maintenance mode is off. Shops can work again.'),
    onError: (e) => toast.error(apiError(e)),
  });
  const signups = useMutation({
    mutationFn: adminSystemApi.setSignups,
    onSuccess: (next) => done(next, next.signupsOpen ? 'New signups are open' : 'New signups are closed'),
    onError: (e) => toast.error(apiError(e)),
  });
  const ai = useMutation({
    mutationFn: adminSystemApi.setAi,
    onSuccess: (next) => done(next, next.aiEnabled ? 'Nafaa AI is on' : 'Nafaa AI is off'),
    onError: (e) => toast.error(apiError(e)),
  });

  const toggleMaintenance = async (on: boolean) => {
    if (on && !(await confirmDialog({
      title: 'Turn on maintenance mode?',
      text: 'Every shop is stopped from using the web, desktop and mobile apps until you turn it off. Offline sales stay on their devices and sync later. The admin panel, online stores and webhooks keep working.',
      yes: 'Turn on',
      danger: true,
    }))) return;
    maintenance.mutate(on);
  };
  const toggleSignups = async (open: boolean) => {
    if (!open && !(await confirmDialog({ title: 'Close new signups?', text: 'New shops cannot register until you open signups again. Existing shops are not affected.', yes: 'Close signups', danger: true }))) return;
    signups.mutate(open);
  };
  const toggleAi = async (enabled: boolean) => {
    if (!enabled && !(await confirmDialog({ title: 'Turn off Nafaa AI?', text: 'Shops will see that Nafaa AI is paused. Their saved chats stay.', yes: 'Turn off', danger: true }))) return;
    ai.mutate(enabled);
  };

  const m = c?.maintenance;
  const dirtyNotice = !!m && (message !== m.message || until !== toLocalInput(m.until));

  return (
    <PageShell>
      <PageHero
        title="Platform switches"
        chip={m?.on ? 'Maintenance on' : undefined}
        busy={controls.isFetching}
        loading={controls.isLoading}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={c ? [
          { label: 'Merchant apps', value: c.maintenance.on ? 'Stopped' : 'Running', hint: c.maintenance.on && c.maintenance.startedAt ? `since ${formatRelative(c.maintenance.startedAt)}` : undefined },
          { label: 'New signups', value: c.signupsOpen ? 'Open' : 'Closed' },
          { label: 'Nafaa AI', value: c.aiEnabled ? 'On' : 'Off' },
          { label: 'Paused jobs', value: c.pausedJobs.length, hint: 'Background jobs' },
        ] : undefined}
      />

      {!canManage && <Alert tone="info" icon={<Lock className="h-4 w-4" />}>You can see these switches but not change them.</Alert>}

      {!c ? <Skeleton className="h-96 rounded-3xl" /> : (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card
            className="xl:col-span-2"
            title={<span className="inline-flex items-center gap-2"><Wrench className="h-4 w-4 text-slate-500" /> Maintenance mode</span>}
            description="Stops every shop from using the merchant apps while you fix or upgrade something."
            actions={<StatusBadge value={m!.on ? 'ACTIVE' : 'INACTIVE'} label={m!.on ? 'On' : 'Off'} variant={m!.on ? 'danger' : 'default'} />}
          >
            <div className="space-y-4">
              {m!.on && (
                <Alert tone="danger" title="Shops are stopped right now">
                  Turned on {m!.startedAt ? `${formatRelative(m!.startedAt)} (${formatDateTime(m!.startedAt)})` : 'recently'}. Turn it off as soon as the work is done.
                </Alert>
              )}
              <Textarea label="Message shops see" rows={3} maxLength={500} value={message} disabled={!canManage} onChange={(e) => setMessage(e.target.value)}
                hint="Shown in the app banner and on the sign-in screen. Leave it as is for the standard message." />
              <Input type="datetime-local" label="Expected back at (optional)" value={until} disabled={!canManage} onChange={(e) => setUntil(e.target.value)} wrapperClassName="sm:max-w-xs" />

              <div>
                <p className="mb-1.5 text-[0.75rem] font-medium text-slate-500">Preview</p>
                <div className="flex items-start gap-3 rounded-xl bg-slate-900 px-4 py-3 text-white">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15"><Wrench className="h-4 w-4" /></span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Nafaa is under maintenance{until ? <span className="font-normal text-white/80"> · Until about {new Date(until).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span> : null}</p>
                    <p className="mt-0.5 text-xs text-white/85">{message || '—'}</p>
                  </div>
                </div>
              </div>

              {canManage && (
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                  {m!.on ? (
                    <>
                      <Button variant="danger" leftIcon={<Power className="h-4 w-4" />} loading={maintenance.isPending && maintenance.variables === false} onClick={() => toggleMaintenance(false)}>Turn off maintenance</Button>
                      <Button variant="secondary" disabled={!dirtyNotice} loading={maintenance.isPending && maintenance.variables === true} onClick={() => maintenance.mutate(true)}>Update message</Button>
                    </>
                  ) : (
                    <Button variant="danger" leftIcon={<Wrench className="h-4 w-4" />} loading={maintenance.isPending} onClick={() => toggleMaintenance(true)}>Turn on maintenance</Button>
                  )}
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <Card title={<span className="inline-flex items-center gap-2"><UserPlus className="h-4 w-4 text-slate-500" /> New shop signups</span>} description="Whether new shops can create an account.">
              <Switch checked={c.signupsOpen} disabled={!canManage || signups.isPending} onChange={(e) => toggleSignups(e.target.checked)}
                label={c.signupsOpen ? 'Open' : 'Closed'} description={c.signupsOpen ? 'Anyone can sign up from the website and apps.' : 'Sign-up forms show that registration is paused.'} />
            </Card>
            <Card title={<span className="inline-flex items-center gap-2"><Bot className="h-4 w-4 text-slate-500" /> Nafaa AI</span>} description="The assistant inside the merchant apps.">
              <Switch checked={c.aiEnabled} disabled={!canManage || ai.isPending} onChange={(e) => toggleAi(e.target.checked)}
                label={c.aiEnabled ? 'On' : 'Off'} description={c.aiEnabled ? 'Shops can ask Nafaa AI questions.' : 'Shops see that Nafaa AI is paused.'} />
              <Link to="/ai-usage" className="mt-3 inline-block text-[0.8125rem] font-medium text-brand-700 hover:underline">See Nafaa AI usage</Link>
            </Card>
            <Card title={<span className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-slate-500" /> Background jobs</span>} description="Syncs, reminders and clean-ups that run on a schedule.">
              <p className="text-[0.8125rem] text-slate-600">{c.pausedJobs.length ? `${c.pausedJobs.length} paused.` : 'All running.'}</p>
              <Link to="/system/jobs" className="mt-2 inline-block text-[0.8125rem] font-medium text-brand-700 hover:underline">Open background jobs</Link>
            </Card>
          </div>
        </div>
      )}

      {guide.isOpen && (
        <PageGuide
          title="Platform switches"
          description="Switches that change how the whole platform behaves. Each one applies to every server within 15 seconds."
          flowTitle="What maintenance mode stops"
          flow={[
            { label: 'You turn it on', icon: Wrench, color: '#e11d48' },
            { label: 'Merchant apps', hint: 'Show the banner', icon: Store, color: '#d97706' },
            { label: 'Still running', hint: 'Admin, stores, webhooks', icon: Server, color: '#059669' },
          ]}
          steps={[
            { icon: Wrench, color: '#e11d48', title: 'Maintenance', text: 'Shops cannot sign in or use the apps. They stay signed in, and offline sales sync when you turn it off.' },
            { icon: UserPlus, color: '#4f46e5', title: 'Signups', text: 'Close signups to stop new shops during an incident or a launch. Existing shops are not affected.' },
            { icon: Bot, color: '#0284c7', title: 'Nafaa AI', text: 'Turn off the assistant if it misbehaves or costs run high.' },
          ]}
          tips={['Admins signed in as a shop can still use the merchant app during maintenance, to check things.', 'Every change is recorded in the audit log.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
