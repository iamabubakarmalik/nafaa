/**
 * Shop 360 "Journey" tab: where the shop came from, the app it signed up on,
 * which apps its team uses (last seen per app), the milestone checklist with
 * dates and the step it is stuck at, its health and a timeline of key events.
 * "Message on Live Support" opens the shop's support chat.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, CircleAlert, Flag, Headphones, Megaphone, RefreshCw, UserPlus } from 'lucide-react';
import { Alert, Badge, Button, Card, EmptyState, Skeleton } from '@/design-system/components';
import { adminJourneyApi, type TenantJourney } from '@/api/admin-journey.api';
import { DetailList, statusLabel } from '@/ui';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime, formatRelative, formatTimeLeft } from '@/lib/format';
import { HEALTH, PLATFORM, supportLink, utmLine } from '../lib/journey-labels';

const PLATFORM_ORDER = ['web', 'android', 'ios', 'desktop'] as const;

const when = (at: string | null) => (at ? <span title={formatDateTime(at)}>{formatRelative(at)}</span> : <span className="text-slate-400">Never</span>);

function SupportButton({ tenantId }: { tenantId: string }) {
  return (
    <Link to={supportLink(tenantId)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-[0.8125rem] font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
      <Headphones className="h-4 w-4" /> Message on Live Support
    </Link>
  );
}

function SourceCard({ j }: { j: TenantJourney }) {
  const s = j.source;
  const campaign = utmLine(s.utm);
  const firstTouch = utmLine(s.firstTouch);
  return (
    <Card title="Source" description="Where the shop came from.">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Megaphone className="h-4 w-4" /></span>
        <span className="text-[1rem] font-bold capitalize text-slate-900">{s.label}</span>
      </div>
      <DetailList items={[
        { label: 'First touch (nafaa.pk visit)', value: firstTouch, hidden: !firstTouch },
        { label: 'Campaign on signup link', value: campaign, hidden: !campaign },
        { label: 'nafaa.pk page', value: s.utm.content ? <code className="break-all text-[0.75rem]">{s.utm.content}</code> : null, hidden: !s.utm.content },
        { label: 'Button clicked', value: s.cta, hidden: !s.cta },
        { label: 'Referring site', value: s.referrerDomain, hidden: !s.referrerDomain },
        { label: 'Landing page', value: s.landingPage ? <code className="break-all text-[0.75rem]">{s.landingPage}</code> : null, hidden: !s.landingPage },
        { label: 'Referral code', value: s.referralCode ? <code>{s.referralCode}</code> : null, hidden: !s.referralCode },
        { label: 'Referred by', value: s.referredBy ? <Link to={`/tenants/${s.referredBy.id}`} className="text-brand-700 hover:underline">{s.referredBy.name}</Link> : null, hidden: !s.referredBy },
        { label: 'Partner', value: s.partner ? <Link to={`/partners/${s.partner.id}`} className="text-brand-700 hover:underline">{s.partner.code}{s.partner.via ? ` · ${s.partner.via}` : ''}</Link> : null, hidden: !s.partner },
      ]} />
      {s.label === 'unknown' && <p className="text-[0.8125rem] text-slate-500">Signed up before sources were recorded.</p>}
      {s.label === 'direct' && <p className="mt-2 text-[0.8125rem] text-slate-500">No campaign, referral or referring site: typed the address or opened the app directly.</p>}
    </Card>
  );
}

function SignupCard({ j }: { j: TenantJourney }) {
  const p = PLATFORM[j.signup.platform];
  return (
    <Card title="Signed up on" description={formatDateTime(j.signup.at)}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${p.color}1a`, color: p.color }}><p.icon className="h-4 w-4" /></span>
        <span className="text-[1rem] font-bold text-slate-900">{p.label}</span>
        {j.signup.inferred && <Badge variant="outline">inferred</Badge>}
      </div>
      <DetailList items={[
        { label: 'Signed up with', value: j.signup.method ? statusLabel(j.signup.method.toUpperCase()) : null, hidden: !j.signup.method },
        { label: 'App version', value: j.signup.appVersion, hidden: !j.signup.appVersion },
      ]} />
      {j.signup.platform === 'unknown' && <p className="text-[0.8125rem] text-slate-500">Not recorded: the shop signed up before platforms were tracked and nothing on record shows which app it used.</p>}
      {j.signup.inferred && j.signup.platform !== 'unknown' && <p className="mt-2 text-[0.75rem] text-slate-500">Worked out from the owner’s first sign-in, not recorded at signup.</p>}
    </Card>
  );
}

function HealthCard({ j }: { j: TenantJourney }) {
  const h = HEALTH[j.health.state];
  return (
    <Card title="Health" description="Active, at risk, stuck or churned.">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: h.color }} />
        <span className="text-[1rem] font-bold text-slate-900">{h.label}</span>
      </div>
      <DetailList items={[
        { label: 'Why', value: j.health.reason },
        { label: 'Stuck at', value: j.stuckAt ? <span className="font-semibold text-rose-600">{j.stuckAt.label}</span> : 'Nothing: every step done' },
        { label: 'Last important action', value: j.lastAction ? <>{j.lastAction.label} · {when(j.lastAction.at)}</> : 'None yet' },
        { label: 'Trial ends', value: j.trialEndsAt ? <span title={formatDateTime(j.trialEndsAt)}>{formatDate(j.trialEndsAt)} · {formatTimeLeft(j.trialEndsAt)}</span> : null, hidden: !j.trialEndsAt },
      ]} />
    </Card>
  );
}

function PlatformsCard({ j }: { j: TenantJourney }) {
  return (
    <Card title="Apps used" description="Last time anyone in the shop used each Nafaa app." flush>
      <div className="grid grid-cols-2 gap-3 px-4 pb-4 pt-3 sm:px-5 md:grid-cols-4">
        {j.platforms.map((p) => {
          const look = PLATFORM[p.platform];
          return (
            <div key={p.platform} className={cn('rounded-2xl p-3 ring-1', p.lastSeenAt ? 'bg-white ring-slate-200' : 'bg-slate-50 ring-slate-100')}>
              <div className="flex items-center gap-2 text-[0.8125rem] font-semibold text-slate-900"><look.icon className="h-4 w-4" style={{ color: look.color }} />{look.label}</div>
              <div className="mt-1 text-[0.8125rem] text-slate-700">{when(p.lastSeenAt)}</div>
              {p.firstSeenAt && <div className="text-[0.6875rem] text-slate-500">first {formatDate(p.firstSeenAt)}</div>}
            </div>
          );
        })}
      </div>
      {j.users.length > 0 && (
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[34rem] text-[0.8125rem]">
            <thead>
              <tr className="text-[0.75rem] text-slate-500">
                <th className="px-4 py-2 text-start font-medium sm:px-5">Person</th>
                {PLATFORM_ORDER.map((k) => <th key={k} className="px-3 py-2 text-start font-medium">{PLATFORM[k].label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {j.users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 sm:px-5"><span className="font-medium text-slate-900">{u.name}</span><span className="ms-2 text-[0.75rem] text-slate-500">{statusLabel(u.role)}</span></td>
                  {PLATFORM_ORDER.map((k) => <td key={k} className="px-3 py-2 text-slate-700">{u[k] ? when(u[k]) : <span className="text-slate-300">—</span>}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function MilestonesCard({ j }: { j: TenantJourney }) {
  const stuckKey = j.stuckAt?.key;
  return (
    <Card title="Milestones" description="Worked out from the shop’s own data. The step it is stuck at is highlighted.">
      <ol className="space-y-1.5">
        {j.milestones.map((m) => {
          const stuck = m.key === stuckKey;
          return (
            <li key={m.key} className={cn('flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[0.8125rem]', stuck && 'bg-rose-50 ring-1 ring-rose-200')}>
              {m.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : stuck ? <CircleAlert className="h-4 w-4 shrink-0 text-rose-600" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}
              <span className={cn('flex-1', m.done ? 'text-slate-900' : 'text-slate-500', m.core && 'font-medium')}>{m.label}{stuck && <span className="ms-2 text-[0.75rem] font-semibold text-rose-600">stuck here</span>}</span>
              <span className="text-[0.75rem] text-slate-500">{m.at ? <span title={formatDateTime(m.at)}>{formatDate(m.at)}</span> : m.done ? 'done' : ''}</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Setup steps{j.onboarding.finished ? ' · finished' : j.onboarding.skipped ? ' · skipped' : ''}</div>
        <div className="flex flex-wrap gap-1.5">
          {j.onboarding.steps.map((s) => (
            <Badge key={s.id} variant={s.done ? 'success' : s.label === j.onboarding.next ? 'danger' : 'default'}>{s.label}{s.required ? ' *' : ''}</Badge>
          ))}
        </div>
        {j.onboarding.next && <p className="mt-2 text-[0.75rem] text-slate-500">Next setup step: <b className="text-slate-700">{j.onboarding.next}</b>. * required.</p>}
      </div>
    </Card>
  );
}

function TimelineCard({ j }: { j: TenantJourney }) {
  return (
    <Card title="Timeline" description="Key events, oldest first." flush>
      {!j.timeline.length ? <p className="px-5 py-6 text-[0.8125rem] text-slate-500">Nothing yet.</p> : (
        <ol className="py-2">
          {j.timeline.map((t) => (
            <li key={`${t.key}:${t.at}`} className="flex gap-3 px-4 py-2 sm:px-5">
              <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                t.key === 'signup' ? 'bg-indigo-50 text-indigo-600' : t.kind === 'platform' ? 'bg-sky-50 text-sky-600' : t.key === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500')}>
                {t.key === 'signup' ? <UserPlus className="h-3.5 w-3.5" /> : <Flag className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0 flex-1 text-[0.8125rem]">
                <span className="block text-slate-900">{t.label}</span>
                <span className="block text-[0.75rem] text-slate-500">{formatDateTime(t.at)} · {formatRelative(t.at)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export default function TenantJourneyPanel({ tenantId }: { tenantId: string }) {
  const q = useQuery({ queryKey: ['admin', 'tenant', tenantId, 'journey'], queryFn: () => adminJourneyApi.tenant(tenantId) });

  if (q.isError) {
    return <EmptyState icon={<CircleAlert className="h-6 w-6" />} title="Journey could not load" description="Check the connection and try again." action={<Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => q.refetch()}>Try again</Button>} />;
  }
  if (!q.data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-80 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>
      </div>
    );
  }
  const j = q.data;
  return (
    <div className="space-y-4">
      {j.stuckAt && j.health.state !== 'active' ? (
        <Alert tone={j.health.state === 'stuck' ? 'danger' : 'warning'} title={`Stuck at: ${j.stuckAt.label}`} action={<SupportButton tenantId={j.tenantId} />}>
          {j.health.reason}. A short message often gets a shop past this step.
        </Alert>
      ) : (
        <div className="flex justify-end"><SupportButton tenantId={j.tenantId} /></div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <SourceCard j={j} />
        <SignupCard j={j} />
        <HealthCard j={j} />
      </div>
      <PlatformsCard j={j} />
      <div className="grid gap-4 lg:grid-cols-2">
        <MilestonesCard j={j} />
        <TimelineCard j={j} />
      </div>
    </div>
  );
}
