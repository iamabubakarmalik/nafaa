/**
 * Abuse reports queue: buyers report a Nafaa Stores website (scam, fake
 * products, not delivered …) from the "Report this store" link. The team
 * reviews each report, acts on the store from its page (password mode or
 * suspend) and closes the report as actioned or dismissed with a note.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Eye, Flag, Lightbulb, ShieldAlert, Store, XCircle } from 'lucide-react';
import {
  Button, Drawer, FilterBar, FilterChip, PageHero, PageShell, Table, TBody, Td, Th, THead, Tabs, Textarea, Tr, confirmDialog, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminStoresApi, type AbuseReportRow, type ReportStatus } from '@/api/admin-stores.api';
import { DetailList, ListCard, useListParams } from '@/ui';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { formatRelative, num } from '@/lib/format';
import { ReportStatusBadge, StoreStatusBadge, dateTime, reasonLabel } from '../components/StoresUi';

const PAGE_SIZE = 50;
type TabValue = 'ALL' | ReportStatus;

export default function StoreReportsPage() {
  const guide = usePageGuide();
  const can = useCan();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useListParams({ status: 'OPEN', storeId: '' }, { limit: PAGE_SIZE });
  const status = list.filters.status as TabValue;
  const storeId = list.filters.storeId;
  const query = { status: status === 'ALL' ? undefined : status, storeId: storeId || undefined };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-store-reports', query, list.page],
    queryFn: () => adminStoresApi.reports({ ...query, page: list.page }),
    placeholderData: keepPreviousData,
  });
  const rows = data?.items ?? [];
  const counts = data?.counts;
  const open = rows.find((r) => r.id === openId) ?? null;
  const storeName = storeId ? rows[0]?.store.name ?? 'One store' : null;

  return (
    <PageShell>
      <PageHero
        title="Abuse reports"
        chip={counts ? `${num(counts.OPEN + counts.REVIEWING)} to review` : undefined}
        busy={isFetching}
        loading={isLoading}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={counts ? [
          { label: 'Open', value: num(counts.OPEN) },
          { label: 'Reviewing', value: num(counts.REVIEWING) },
          { label: 'Actioned', value: num(counts.ACTIONED) },
          { label: 'Dismissed', value: num(counts.DISMISSED) },
        ] : undefined}
      />

      <Tabs<TabValue> value={status} onChange={(v) => list.setFilter('status', v)} label="Report status" items={[
        { value: 'OPEN', label: 'Open', count: counts?.OPEN || undefined, tone: 'warning' },
        { value: 'REVIEWING', label: 'Reviewing', count: counts?.REVIEWING || undefined },
        { value: 'ACTIONED', label: 'Actioned' },
        { value: 'DISMISSED', label: 'Dismissed' },
        { value: 'ALL', label: 'All' },
      ]} />

      {storeId && (
        <FilterBar chips={[<FilterChip key="st" onRemove={() => list.setFilter('storeId', '')}>Store: {storeName}</FilterChip>]} onClear={list.clear} />
      )}

      <ListCard
        loading={isLoading}
        empty={!!error || !rows.length}
        emptyIcon={<Flag className="h-6 w-6" />}
        emptyTitle={error ? 'Could not load reports' : status === 'OPEN' ? 'No open reports' : 'No reports here'}
        emptyText={error ? 'The stores service may not be running yet.' : 'Reports from buyers show up here as they come in.'}
        page={list.page} limit={PAGE_SIZE} total={data?.total} onPage={list.setPage}
      >
        <Table minWidth="60rem">
          <THead>
            <Tr><Th>Reason</Th><Th>Store</Th><Th>Details</Th><Th>Reporter</Th><Th>Received</Th><Th>Status</Th></Tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.id} interactive onClick={() => setOpenId(r.id)}>
                <Td className="font-semibold text-slate-900">{reasonLabel(r.reason)}</Td>
                <Td>
                  <Link to={`/stores/${r.store.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-slate-800 hover:text-brand-700">{r.store.name}</Link>
                  <div className="mt-0.5"><StoreStatusBadge status={r.store.status} suspended={r.store.suspended} /></div>
                </Td>
                <Td><div className="max-w-[20rem] truncate text-slate-700" title={r.details ?? ''}>{r.details || <span className="text-slate-400">No details</span>}</div></Td>
                <Td>
                  <div className="text-slate-800">{r.reporterName || <span className="text-slate-400">Anonymous</span>}</div>
                  {r.contact && <div className="text-[0.75rem] text-slate-500">{r.contact}</div>}
                </Td>
                <Td className="whitespace-nowrap">{formatRelative(r.createdAt)}</Td>
                <Td><ReportStatusBadge status={r.status} /></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      <ReportDrawer report={open} canManage={can('stores.manage')} onClose={() => setOpenId(null)}
        onSaved={() => { void qc.invalidateQueries({ queryKey: ['admin-store-reports'] }); void qc.invalidateQueries({ queryKey: ['admin-stores-overview'] }); }} />

      {guide.isOpen && (
        <PageGuide
          title="Abuse reports"
          description="Reports buyers send about a store from its website."
          flowTitle="How a report is handled"
          flow={[
            { label: 'Open', hint: 'Buyer reports', icon: Flag, color: '#d97706' },
            { label: 'Reviewing', hint: 'Team checks', icon: Eye, color: '#0284c7' },
            { label: 'Act on store', hint: 'Lock or suspend', icon: ShieldAlert, color: '#e11d48' },
            { label: 'Close', hint: 'Actioned or dismissed', icon: CheckCircle2, color: '#059669' },
          ]}
          steps={[
            { icon: Eye, color: '#0284c7', title: 'Open a report', text: 'Click a row to read the details, the page the buyer was on and how to contact them.' },
            { icon: Store, color: '#4f46e5', title: 'Check the store', text: 'Open the store page to see its orders and other reports, then force password mode or suspend it if needed.' },
            { icon: CheckCircle2, color: '#059669', title: 'Close it', text: 'Mark the report actioned or dismissed with a short note, so the team knows what was done.' },
          ]}
          tips={['Reports are limited per visitor, but one buyer can still send several. Look for patterns across reports.', 'The reporter is not told the outcome.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

function ReportDrawer({ report, canManage, onClose, onSaved }: { report: AbuseReportRow | null; canManage: boolean; onClose: () => void; onSaved: () => void }) {
  const [note, setNote] = useState('');
  useEffect(() => { setNote(report?.adminNote ?? ''); }, [report?.id, report?.adminNote]);
  const save = useMutation({
    mutationFn: (status: ReportStatus) => adminStoresApi.updateReport(report!.id, { status, adminNote: note.trim() }),
    onSuccess: (_r, status) => { toast.success(status === 'ACTIONED' ? 'Report closed as actioned' : status === 'DISMISSED' ? 'Report dismissed' : status === 'REVIEWING' ? 'Marked as reviewing' : 'Report reopened'); onSaved(); if (status === 'ACTIONED' || status === 'DISMISSED') onClose(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const setStatus = async (status: ReportStatus) => {
    if (status === 'DISMISSED' && !(await confirmDialog({ title: 'Dismiss this report?', text: 'Use this when the report is wrong or there is nothing to act on. You can reopen it later.', yes: 'Dismiss' }))) return;
    if (status === 'ACTIONED' && !(await confirmDialog({ title: 'Close as actioned?', text: 'Use this after acting on the store (password mode, suspend, or a talk with the shop). Add a note on what was done.', yes: 'Close as actioned' }))) return;
    save.mutate(status);
  };
  const closed = report?.status === 'ACTIONED' || report?.status === 'DISMISSED';

  return (
    <Drawer open={!!report} onClose={onClose} title={report ? reasonLabel(report.reason) : ''} description={report ? `${report.store.name} · ${dateTime(report.createdAt)}` : undefined} size="lg"
      footer={report && canManage ? (
        <div className="flex flex-wrap justify-end gap-2">
          {closed ? (
            <Button variant="secondary" loading={save.isPending} onClick={() => setStatus('OPEN')}>Reopen</Button>
          ) : (
            <>
              {report.status === 'OPEN' && <Button variant="secondary" disabled={save.isPending} onClick={() => setStatus('REVIEWING')}>Mark reviewing</Button>}
              <Button variant="secondary" leftIcon={<XCircle className="h-4 w-4" />} disabled={save.isPending} onClick={() => setStatus('DISMISSED')}>Dismiss</Button>
              <Button leftIcon={<CheckCircle2 className="h-4 w-4" />} disabled={save.isPending} onClick={() => setStatus('ACTIONED')}>Close as actioned</Button>
            </>
          )}
        </div>
      ) : undefined}>
      {report && (
        <div className="space-y-5 p-4 sm:p-5">
          <DetailList cols={2} items={[
            { label: 'Status', value: <ReportStatusBadge status={report.status} /> },
            { label: 'Store', value: <span className="inline-flex flex-wrap items-center gap-1.5"><Link to={`/stores/${report.store.id}`} className="font-medium text-brand-700 hover:underline">{report.store.name}</Link><StoreStatusBadge status={report.store.status} suspended={report.store.suspended} /></span> },
            { label: 'Reporter', value: report.reporterName || 'Anonymous' },
            { label: 'Contact', value: report.contact },
            { label: 'Page', value: report.pageUrl ? <a href={report.pageUrl} target="_blank" rel="noreferrer" className="break-all text-brand-700 hover:underline">{report.pageUrl}</a> : null },
            { label: 'Closed', value: report.resolvedAt ? dateTime(report.resolvedAt) : null, hidden: !report.resolvedAt },
          ]} />
          <div>
            <h3 className="mb-1 text-[0.75rem] font-medium text-slate-500">What the buyer wrote</h3>
            <p className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 text-[0.875rem] text-slate-800 ring-1 ring-slate-100">{report.details || 'No details given.'}</p>
          </div>
          {canManage
            ? <Textarea label="Team note (internal)" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was checked and what was done" hint="Saved with the next status change." />
            : report.adminNote && <DetailList items={[{ label: 'Team note', value: report.adminNote }]} />}
          <p className="text-[0.75rem] text-slate-500">To lock or suspend the website, open the store page. Closing a report does not change the store.</p>
        </div>
      )}
    </Drawer>
  );
}
