/**
 * Live now: who is using Nafaa at this moment (active in the last 5 minutes)
 * and from which app, today's sign-ups with their exact time and setup
 * progress, and the latest sign-ins. Refreshes every 30 seconds.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, Globe, Lightbulb, LogIn, Monitor, RefreshCw, Search, ShieldCheck, Smartphone, Store, UserPlus, Users } from 'lucide-react';
import { KpiCard, KpiRow, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminPresenceApi } from '@/api/admin-presence.api';
import { formatDateTime, formatRelative, num } from '@/lib/format';
import { industryForType } from '@/lib/industries';
import { LastSeen, ListCard, StatusBadge, statusLabel } from '@/ui';

const timeOnly = (d: string) => new Date(d).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' });

export default function LiveNowPage() {
  const navigate = useNavigate();
  const guide = usePageGuide();
  const [q, setQ] = useState('');
  const live = useQuery({ queryKey: ['admin', 'live'], queryFn: adminPresenceApi.live, refetchInterval: 30_000, refetchIntervalInBackground: false });
  const d = live.data;
  const online = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (d?.online ?? []).filter((u) => !needle || `${u.fullName} ${u.email} ${u.tenant.name} ${u.tenant.slug}`.toLowerCase().includes(needle));
  }, [d, q]);

  return (
    <PageShell>
      <PageHero
        title="Live now"
        chip="Updates every 30 seconds"
        busy={live.isFetching}
        loading={live.isLoading}
        meta={d ? `As of ${timeOnly(d.at)}` : undefined}
        actions={
          <>
            <button type="button" className={heroButton} onClick={() => live.refetch()}><RefreshCw className="h-4 w-4" /> Refresh</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={d ? [
          { label: 'People online', value: num(d.counts.onlineUsers), hint: `in ${num(d.counts.onlineShops)} shops` },
          { label: 'Shops active today', value: num(d.counts.activeTodayShops), hint: `${num(d.counts.activeTodayUsers)} people` },
          { label: 'Signed up today', value: num(d.counts.signupsToday) },
          { label: 'Nafaa team online', value: num(d.staffOnline.length) },
        ] : undefined}
      />

      {d && (
        <KpiRow cols={4}>
          <KpiCard icon={Globe} color="#4f46e5" label="On the web app" value={num(d.counts.web)} />
          <KpiCard icon={Monitor} color="#0891b2" label="On the desktop app" value={num(d.counts.desktop)} />
          <KpiCard icon={Smartphone} color="#7c3aed" label="On the mobile app" value={num(d.counts.mobile)} />
          <KpiCard icon={ShieldCheck} color="#e11d48" label="Team online" value={num(d.staffOnline.length)} hint={d.staffOnline.map((s) => s.fullName).join(', ') || 'Nobody'} />
        </KpiRow>
      )}

      <ListCard
        title={`Online now (${num(online.length)})`}
        actions={<div className="w-64"><SearchField value={q} onChange={setQ} placeholder="Filter by name or shop" /></div>}
        loading={live.isLoading}
        empty={!online.length}
        emptyIcon={<Activity className="h-6 w-6" />}
        emptyTitle={q ? 'Nobody matches' : 'Nobody is online right now'}
        emptyText="People appear here while they use any Nafaa app."
      >
        <Table minWidth="48rem">
          <THead><Tr><Th>Person</Th><Th>Shop</Th><Th>Role</Th><Th>Using</Th><Th align="right">Signed in</Th></Tr></THead>
          <TBody>
            {online.map((u) => (
              <Tr key={u.id} interactive onClick={() => navigate(`/tenants/${u.tenant.id}`)}>
                <Td><div className="font-semibold text-slate-900">{u.fullName}</div><div className="text-[0.75rem] text-slate-500">{u.email}</div></Td>
                <Td><div className="text-slate-900">{u.tenant.name}</div><div className="text-[0.75rem] text-slate-500">{industryForType(u.tenant.businessType ?? 'NONE').label}</div></Td>
                <Td>{statusLabel(u.role)}</Td>
                <Td><LastSeen at={u.lastSeenAt} via={u.lastSeenVia} /></Td>
                <Td align="right" className="text-slate-500">{u.lastLoginAt ? formatRelative(u.lastLoginAt) : '—'}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <ListCard title={`Signed up today (${num(d?.signups.length ?? 0)})`} loading={live.isLoading} empty={!d?.signups.length} emptyIcon={<UserPlus className="h-6 w-6" />} emptyTitle="No sign-ups yet today">
          <Table minWidth="34rem">
            <THead><Tr><Th>Time</Th><Th>Shop</Th><Th>Setup</Th><Th align="right">Last active</Th></Tr></THead>
            <TBody>
              {(d?.signups ?? []).map((t) => (
                <Tr key={t.id} interactive onClick={() => navigate(`/tenants/${t.id}`)}>
                  <Td className="whitespace-nowrap font-semibold text-slate-900" title={formatDateTime(t.createdAt)}>{timeOnly(t.createdAt)}</Td>
                  <Td>
                    <div className="text-slate-900">{t.name}</div>
                    <div className="text-[0.75rem] text-slate-500">{[t.owner?.fullName, t.phone ?? t.owner?.phone, industryForType(t.businessType ?? 'NONE').label].filter(Boolean).join(' · ')}</div>
                  </Td>
                  <Td>{t.setup?.isCompleted ? <StatusBadge value="COMPLETED" label="Done" /> : t.setup?.isSkipped ? <StatusBadge value="SKIPPED" label="Skipped" /> : <StatusBadge value="PENDING" label={`Step ${t.setup?.currentStep ?? 1}`} />}</Td>
                  <Td align="right"><LastSeen at={t.lastActiveAt} compact /></Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </ListCard>

        <ListCard title="Latest sign-ins" loading={live.isLoading} empty={!d?.signIns.length} emptyIcon={<LogIn className="h-6 w-6" />} emptyTitle="No sign-ins yet">
          <Table minWidth="30rem">
            <THead><Tr><Th>Person</Th><Th>Shop</Th><Th align="right">Signed in</Th></Tr></THead>
            <TBody>
              {(d?.signIns ?? []).map((u) => (
                <Tr key={u.id} interactive onClick={() => navigate(`/tenants/${u.tenant.id}`)}>
                  <Td><div className="font-medium text-slate-900">{u.fullName}</div><div className="text-[0.75rem] text-slate-500">{statusLabel(u.role)}</div></Td>
                  <Td className="text-slate-700">{u.tenant.name}</Td>
                  <Td align="right" className="whitespace-nowrap text-slate-500" title={u.lastLoginAt ? formatDateTime(u.lastLoginAt) : undefined}>{u.lastLoginAt ? formatRelative(u.lastLoginAt) : '—'}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </ListCard>
      </div>

      <p className="text-center text-[0.75rem] text-slate-400">
        “Online” means the person’s app talked to Nafaa in the last 5 minutes. <Link to="/tenants?sort=active" className="font-medium text-brand-700 hover:underline">See all shops by last activity</Link>
      </p>

      {guide.isOpen && (
        <PageGuide
          title="Live now"
          description="A live view of who is using Nafaa, refreshed every 30 seconds."
          flowTitle="How someone shows as online"
          flow={[
            { label: 'Opens any Nafaa app', hint: 'Web, desktop or mobile', icon: Store, color: '#4f46e5' },
            { label: 'App talks to Nafaa', hint: 'Recorded once a minute', icon: Activity, color: '#0891b2' },
            { label: 'Online for 5 minutes', hint: 'Then “last active”', icon: Users, color: '#059669' },
          ]}
          steps={[
            { icon: Users, color: '#4f46e5', title: 'Online now', text: 'Click a person to open their shop’s full profile.' },
            { icon: UserPlus, color: '#059669', title: 'New today', text: 'Every shop that signed up today, with the exact time and how far setup has got. A good list for welcome calls.' },
            { icon: Search, color: '#0891b2', title: 'Find someone', text: 'Filter the online list by name, email or shop.' },
          ]}
          tips={['When you use “Sign in as shop”, that does not count as the shop being active.', 'Times are Pakistan time.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
