/**
 * Security & PIN: the security score with what is still missing, the owner's
 * PIN, pages locked behind it, the account password, devices that are signed
 * in (each can be signed out) and the latest security-related activity.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Activity, AlertTriangle, Award, CheckCircle2, Lock, LogOut, RefreshCw, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@core/lib/cn';
import { IconButton, confirmDialog } from '@/design-system/components';
import { settingsApi } from '../api/settings.api';
import { useSecurityScore } from '../hooks/useSettings';
import { SectionCard, StatPill } from '../components/UI';
import { OwnerPinCard, PageLocksCard } from './_OwnerPin';
import { AccountPasswordCard } from './_AccountPassword';

const when = (v?: string) => (v ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(v)) : '');

export function SecuritySection() {
  const { data: score } = useSecurityScore();
  const { data: sessions, refetch: refetchSessions, isFetching: sessionsLoading } = useQuery({
    queryKey: ['tenant-sessions'],
    queryFn: settingsApi.listSessions,
  });
  const { data: activity } = useQuery({
    queryKey: ['activity-log'],
    queryFn: () => settingsApi.activityLog({ limit: 20 }),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => settingsApi.revokeSession(id),
    onSuccess: () => {
      toast.success('Device se logout ho gaya');
      refetchSessions();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Logout nahi hua'),
  });

  const pct = score?.score ?? 0;
  const tone = pct >= 80 ? 'emerald' : pct >= 50 ? 'amber' : 'rose';
  const bar = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', rose: 'bg-rose-500' }[tone];
  const level = score ? ({ STRONG: 'Mazboot', MEDIUM: 'Darmiyana', WEAK: 'Kamzor' } as const)[score.level] : '';

  return (
    <div className="space-y-4">
      {score && (
        <SectionCard title="Security score" desc="Jitne kaam poore, utna store mehfooz" icon={Award} color={tone}
          badge={<StatPill label="" value={level} tone={tone} />}>
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-4xl font-bold tabular-nums leading-none text-slate-900">{pct}<span className="text-xl text-slate-400">%</span></p>
            <div className="min-w-[12rem] flex-1">
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className={cn('h-full rounded-full transition-all duration-700', bar)} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {score.recommendations.length ? `${score.recommendations.length} kaam baqi hain` : 'Sab kaam poore — shabaash!'}
              </p>
            </div>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {score.checks.map((c) => (
              <li key={c.key} className={cn('flex items-center gap-2.5 rounded-xl px-3 py-2.5 ring-1', c.done ? 'bg-white ring-slate-200' : 'bg-amber-50/60 ring-amber-100')}>
                {c.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />}
                <span className={cn('min-w-0 flex-1 text-sm', c.done ? 'text-slate-800' : 'text-slate-600')}>{c.label}</span>
                <span className={cn('text-xs font-semibold tabular-nums', c.done ? 'text-emerald-700' : 'text-slate-400')}>+{c.weight}%</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <OwnerPinCard />
      <PageLocksCard />
      <AccountPasswordCard />

      <SectionCard title="Active devices" desc={sessions?.length ? `${sessions.length} device par login hai` : 'Jin devices par login hai'} icon={Smartphone} color="blue"
        action={
          <IconButton label="Dobara load karein" onClick={() => refetchSessions()} variant="secondary">
            <RefreshCw className={cn('h-4 w-4', sessionsLoading && 'animate-spin')} />
          </IconButton>
        }>
        {!sessions?.length ? (
          <p className="text-sm text-slate-500">Koi aur device login nahi hai.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sessions.map((s: any) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Smartphone className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{s.deviceName || 'Device'}</p>
                  <p className="truncate text-xs text-slate-500">
                    {s.user?.fullName || 'User'} · {s.location || s.ipAddress || 'Jagah maloom nahi'}{s.lastActiveAt ? ` · aakhri dafa ${when(s.lastActiveAt)}` : ''}
                  </p>
                </div>
                <IconButton label="Is device se logout" variant="secondary" disabled={revoke.isPending}
                  className="text-rose-600 hover:bg-rose-50"
                  onClick={async () => (await confirmDialog({ title: 'Is device se logout karein?', text: 'Wahan dobara login karna hoga.', danger: true })) && revoke.mutate(s.id)}>
                  <LogOut className="h-4 w-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {!!activity?.length && (
        <SectionCard title="Haal ki activity" desc="Aakhri 20 kaam" icon={Activity} color="violet"
          action={<Link to="/activity-log" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Poora log →</Link>}>
          <ul className="max-h-96 space-y-1 overflow-y-auto pr-1">
            {activity.map((a: any) => (
              <li key={a.id} className="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Lock className="h-3.5 w-3.5" /></span>
                <div className="min-w-0 flex-1 text-xs">
                  <p className="truncate font-semibold text-slate-800">{a.action}</p>
                  {a.description && <p className="truncate text-slate-500">{a.description}</p>}
                  <p className="mt-0.5 text-[0.6875rem] text-slate-400">{a.user?.fullName || 'System'} · {when(a.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
