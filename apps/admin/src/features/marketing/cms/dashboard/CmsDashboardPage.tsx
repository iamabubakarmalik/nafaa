/**
 * Website overview: counts by type and status, the scheduled queue (Pakistan
 * time), last site refresh, the "needs attention" list from
 * GET /dashboard/health, the roadmap (features shown as beta or coming soon)
 * and "Refresh whole site".
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, CalendarClock, CheckCircle, FileText, Globe, Lightbulb, PenLine, RefreshCw, Rocket } from 'lucide-react';
import { PageHero, PageShell, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  ENTRY_TYPE_META, FEATURE_STATUS_TYPES, PUBLIC_SITE_ENDPOINTS,
  type CmsDashboard, type CmsHealthReport, type PublicEntriesResponse,
} from '../contract/cms-contract';
import { confirmDialog } from '@/design-system/components';
import { CMS_BASE, cmsHttp, errorMessage, formatPkt, unwrap } from './shared/cms-http';
import { Card, Chip, IssueList, Spinner } from './shared/ui';
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
  const guide = usePageGuide();
  const summary = useQuery({ queryKey: ['cms-dashboard'], queryFn: dashboardApi.summary });
  const health = useQuery({ queryKey: ['cms-dashboard-health'], queryFn: dashboardApi.health });
  const roadmap = useQuery({
    queryKey: ['cms-dashboard-roadmap'],
    queryFn: async () => (await Promise.all(FEATURE_STATUS_TYPES.map((t) => dashboardApi.roadmap(t).catch(() => ({ items: [], nextCursor: null }))))).flatMap((r) => r.items),
  });
  const revalidate = useMutation({
    mutationFn: dashboardApi.revalidateAll,
    onSuccess: (r) => (r.ok ? toast.success('The whole site is refreshing') : toast.error(`Site refresh failed: ${r.error ?? ''}`)),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const totals = (summary.data?.byType ?? []).reduce(
    (acc, t) => ({ draft: acc.draft + t.draft, scheduled: acc.scheduled + t.scheduled, published: acc.published + t.published, noindex: acc.noindex + t.noindex }),
    { draft: 0, scheduled: 0, published: 0, noindex: 0 },
  );
  const last = summary.data?.lastRevalidation;

  return (
    <PageShell>
      <PageHero
        title="Website"
        chip="nafaa.pk content"
        busy={summary.isFetching}
        loading={summary.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} disabled={revalidate.isPending} onClick={async () => {
              if (await confirmDialog({ title: 'Refresh the whole site?', text: 'The site cache is cleared and every page is rebuilt.', yes: 'Refresh site' })) revalidate.mutate();
            }}>
              <RefreshCw className={revalidate.isPending ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh whole site
            </button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={summary.data ? [
          { label: 'Live pages', value: totals.published },
          { label: 'Drafts', value: totals.draft },
          { label: 'Scheduled', value: totals.scheduled },
          { label: 'Live but noindex', value: totals.noindex, hint: 'Below the quality gate, or switched off by an editor' },
        ] : undefined}
      />

      {summary.isError && <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{errorMessage(summary.error)}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="By type">
          {summary.isLoading ? (
            <Spinner />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500"><th className="py-1 font-medium">Type</th><th className="font-medium">Live</th><th className="font-medium">Draft</th><th className="font-medium">Scheduled</th><th className="font-medium">Noindex</th></tr>
                </thead>
                <tbody>
                  {summary.data?.byType.filter((t) => t.draft + t.published + t.scheduled > 0).map((t) => (
                    <tr key={t.type} className="border-t border-slate-100">
                      <td className="py-1.5 text-slate-800">{ENTRY_TYPE_META[t.type].label}</td>
                      <td>{t.published}</td><td>{t.draft}</td><td>{t.scheduled}</td>
                      <td>{t.noindex ? <Chip tone="amber">{t.noindex}</Chip> : 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card title={<span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-blue-600" /> Scheduled (Pakistan time)</span>}>
            {!summary.data?.scheduled.length ? (
              <p className="text-sm text-slate-500">Nothing is scheduled.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {summary.data.scheduled.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <Link to={`${WEBSITE_BASE}/entries/${s.id}`} className="truncate text-slate-800 hover:text-brand-700">{s.title}</Link>
                    <span className="shrink-0 text-xs text-slate-500">{formatPkt(s.publishAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Site refresh">
            {!last ? (
              <p className="text-sm text-slate-500">No refresh yet.</p>
            ) : (
              <p className="text-sm">
                {last.ok ? <Chip tone="emerald">Succeeded</Chip> : <Chip tone="rose">Failed</Chip>} <span className="text-slate-600">{formatPkt(last.at)}</span>
                {last.error && <span className="mt-1 block text-xs text-rose-700">{last.error}</span>}
              </p>
            )}
          </Card>
        </div>
      </div>

      <Card title={<span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Needs attention {health.data ? `(${health.data.items.length})` : ''}</span>}>
        {health.isLoading ? (
          <Spinner />
        ) : health.isError ? (
          <p className="text-sm text-slate-500">{errorMessage(health.error)}</p>
        ) : !health.data?.items.length ? (
          <p className="text-sm text-brand-700">All clear.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {health.data.items.map((item) => (
              <li key={item.entryId} className="py-3">
                <Link to={`${WEBSITE_BASE}/entries/${item.entryId}`} className="font-medium text-slate-900 hover:text-brand-700">{item.title}</Link>
                <span className="ml-2 text-xs text-slate-500">{item.path}</span>
                <div className="mt-1.5"><IssueList issues={item.issues} /></div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Roadmap: Beta and coming soon on the site">
        <p className="-mt-2 mb-3 text-xs text-slate-500">Features that are not built yet appear on the site only with a badge and on the roadmap, never as live.</p>
        {roadmap.isLoading ? (
          <Spinner />
        ) : !roadmap.data?.length ? (
          <p className="text-sm text-slate-500">No beta or upcoming features on the live site.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {roadmap.data.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <Link to={`${WEBSITE_BASE}/entries/${e.id}`} className="truncate hover:text-brand-700">{e.title}</Link>
                <span className="flex shrink-0 items-center gap-1"><Chip>{ENTRY_TYPE_META[e.type].label}</Chip><FeatureStatusBadge status={e.status} /></span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {guide.isOpen && (
        <PageGuide
          title="Website"
          description="The content of the public Nafaa website, edited here."
          flowTitle="From edit to live"
          flow={[
            { label: 'Edit an entry', hint: 'Pages, blog, cities…', icon: PenLine, color: '#4f46e5' },
            { label: 'Check quality', hint: 'Issues and SEO', icon: CheckCircle, color: '#d97706' },
            { label: 'Publish or schedule', hint: 'Pakistan time', icon: Rocket, color: '#0284c7' },
            { label: 'Site refreshes', hint: 'Live on nafaa.pk', icon: Globe, color: '#059669' },
          ]}
          steps={[
            { icon: AlertTriangle, color: '#d97706', title: 'Needs attention', text: 'Entries with problems are listed here with the exact issue. Open one to fix it.' },
            { icon: CalendarClock, color: '#0284c7', title: 'Scheduled', text: 'Entries waiting for their publish time, shown in Pakistan time.' },
            { icon: FileText, color: '#4f46e5', title: 'Sections', text: 'Use the Website menu on the left to open pages, industries, cities, blog and more.' },
            { icon: RefreshCw, color: '#059669', title: 'Refresh whole site', text: 'Use it only when the site looks out of date. Normal publishing refreshes by itself.' },
          ]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
