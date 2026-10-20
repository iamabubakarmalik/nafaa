/**
 * Website → Overview (ARCH 13 screen 1): counts by type and status, the
 * scheduled queue (PKT), last revalidation, the "needs attention" list from
 * GET /dashboard/health, the live roadmap (features shown as beta / coming)
 * and "Revalidate everything".
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, CalendarClock, RefreshCw } from 'lucide-react';
import {
  ENTRY_TYPE_META, FEATURE_STATUS_TYPES, PUBLIC_SITE_ENDPOINTS,
  type CmsDashboard, type CmsHealthReport, type PublicEntriesResponse,
} from '../contract/cms-contract';
import { PageHeader } from '../../_shared/components/PageHeader';
import { StatCard } from '../../_shared/components/StatCard';
import { CMS_BASE, cmsHttp, errorMessage, formatPkt, unwrap } from './shared/cms-http';
import { Card, Chip, IssueList, Spinner, btn } from './shared/ui';
import { FeatureStatusBadge } from './FeatureStatusBadge';

/** Base path of the Website section; M1's routes.tsx mounts the pages under it. */
const WEBSITE_BASE = '/marketing/website';

const dashboardApi = {
  summary: () => cmsHttp.get(`${CMS_BASE}/dashboard`).then((r) => unwrap<CmsDashboard>(r)),
  health: () => cmsHttp.get(`${CMS_BASE}/dashboard/health`).then((r) => unwrap<CmsHealthReport>(r)),
  revalidateAll: () => cmsHttp.post(`${CMS_BASE}/revalidate-all`).then((r) => unwrap<{ ok: boolean; error?: string }>(r)),
  roadmap: (type: string) =>
    cmsHttp.get(PUBLIC_SITE_ENDPOINTS.entries, { params: { type, status: 'coming,beta', limit: 50 } }).then((r) => unwrap<PublicEntriesResponse>(r)),
};

export function CmsDashboardPage() {
  const summary = useQuery({ queryKey: ['cms-dashboard'], queryFn: dashboardApi.summary });
  const health = useQuery({ queryKey: ['cms-dashboard-health'], queryFn: dashboardApi.health });
  const roadmap = useQuery({
    queryKey: ['cms-dashboard-roadmap'],
    queryFn: async () => (await Promise.all(FEATURE_STATUS_TYPES.map((t) => dashboardApi.roadmap(t).catch(() => ({ items: [], nextCursor: null }))))).flatMap((r) => r.items),
  });
  const revalidate = useMutation({
    mutationFn: dashboardApi.revalidateAll,
    onSuccess: (r) => (r.ok ? toast.success('Poori site refresh ho rahi hai') : toast.error(`Site refresh nahi hui: ${r.error ?? ''}`)),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const totals = (summary.data?.byType ?? []).reduce(
    (acc, t) => ({ draft: acc.draft + t.draft, scheduled: acc.scheduled + t.scheduled, published: acc.published + t.published, noindex: acc.noindex + t.noindex }),
    { draft: 0, scheduled: 0, published: 0, noindex: 0 },
  );
  const last = summary.data?.lastRevalidation;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website"
        subtitle="nafaa.pk ka content: kya live hai, kya baqi hai, kis cheez par dhyan chahiye."
        actions={
          <button className={btn.secondary} disabled={revalidate.isPending} onClick={() => confirm('Poori site ka cache refresh karein?') && revalidate.mutate()}>
            <RefreshCw className={revalidate.isPending ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Sab refresh karein
          </button>
        }
      />

      {summary.isError ? (
        <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{errorMessage(summary.error)}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Live pages" value={totals.published} />
          <StatCard label="Draft" value={totals.draft} />
          <StatCard label="Scheduled" value={totals.scheduled} />
          <StatCard label="Live magar noindex" value={totals.noindex} hint="Quality gate se neeche ya editor ne band kiya" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Type ke hisaab se">
          {summary.isLoading ? (
            <Spinner />
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-500"><th className="py-1">Type</th><th>Live</th><th>Draft</th><th>Scheduled</th><th>Noindex</th></tr>
              </thead>
              <tbody>
                {summary.data?.byType.filter((t) => t.draft + t.published + t.scheduled > 0).map((t) => (
                  <tr key={t.type} className="border-t border-neutral-100">
                    <td className="py-1.5 text-neutral-800">{ENTRY_TYPE_META[t.type].label}</td>
                    <td>{t.published}</td><td>{t.draft}</td><td>{t.scheduled}</td>
                    <td>{t.noindex ? <Chip tone="amber">{t.noindex}</Chip> : 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <div className="space-y-6">
          <Card title={<span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-blue-600" /> Scheduled (PKT)</span>}>
            {!summary.data?.scheduled.length ? (
              <p className="text-sm text-neutral-500">Kuch scheduled nahi.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {summary.data.scheduled.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <Link to={`${WEBSITE_BASE}/entries/${s.id}`} className="truncate text-neutral-800 hover:text-emerald-700">{s.title}</Link>
                    <span className="shrink-0 text-xs text-neutral-500">{formatPkt(s.publishAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Site refresh (revalidation)">
            {!last ? (
              <p className="text-sm text-neutral-500">Abhi tak koi refresh nahi.</p>
            ) : (
              <p className="text-sm">
                {last.ok ? <Chip tone="emerald">Kamyab</Chip> : <Chip tone="rose">Fail</Chip>} <span className="text-neutral-600">{formatPkt(last.at)}</span>
                {last.error && <span className="mt-1 block text-xs text-rose-700">{last.error}</span>}
              </p>
            )}
          </Card>
        </div>
      </div>

      <Card title={<span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Dhyan chahiye {health.data ? `(${health.data.items.length})` : ''}</span>}>
        {health.isLoading ? (
          <Spinner />
        ) : health.isError ? (
          <p className="text-sm text-neutral-500">{errorMessage(health.error)}</p>
        ) : !health.data?.items.length ? (
          <p className="text-sm text-emerald-700">Sab theek hai.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {health.data.items.map((item) => (
              <li key={item.entryId} className="py-3">
                <Link to={`${WEBSITE_BASE}/entries/${item.entryId}`} className="font-medium text-neutral-900 hover:text-emerald-700">{item.title}</Link>
                <span className="ml-2 text-xs text-neutral-500">{item.path}</span>
                <div className="mt-1.5"><IssueList issues={item.issues} /></div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Roadmap: site par Beta / Jald aa raha hai">
        <p className="-mt-2 mb-3 text-xs text-neutral-500">Jo features abhi bane nahi, woh site par sirf badge ke sath aur roadmap par dikhte hain, live ke taur par kabhi nahi.</p>
        {roadmap.isLoading ? (
          <Spinner />
        ) : !roadmap.data?.length ? (
          <p className="text-sm text-neutral-500">Live site par koi beta ya aane wala feature nahi.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {roadmap.data.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                <Link to={`${WEBSITE_BASE}/entries/${e.id}`} className="truncate hover:text-emerald-700">{e.title}</Link>
                <span className="flex shrink-0 items-center gap-1"><Chip>{ENTRY_TYPE_META[e.type].label}</Chip><FeatureStatusBadge status={e.status} /></span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
