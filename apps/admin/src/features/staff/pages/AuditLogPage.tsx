/**
 * Audit log: every change made in the admin panel, every sign-in (and failed
 * attempt) and every "sign in as a shop", newest first. Filter by person,
 * kind of change, failures and dates; export the filtered log as CSV.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CalendarRange, Download, Lightbulb, ListFilter, ScrollText, ShieldCheck, User, Users } from 'lucide-react';
import {
  DateRangeMenu, Drawer, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, heroButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminStaffApi, type AuditEntry } from '@/api/admin-staff.api';
import { formatRelative } from '@/lib/format';
import { DetailList, ListCard, StatusBadge, downloadCsv, fetchAllPages, useListParams } from '@/ui';

const METHODS = [
  { value: 'ALL', label: 'All kinds' },
  { value: 'POST', label: 'Created / actions' },
  { value: 'PATCH', label: 'Edited' },
  { value: 'PUT', label: 'Replaced' },
  { value: 'DELETE', label: 'Deleted' },
];
const METHOD_WORD: Record<string, string> = { POST: 'Action', PATCH: 'Edit', PUT: 'Edit', DELETE: 'Delete', GET: 'Viewed' };

/** "/api/admin/tenants/123/status" → "tenants › status" */
const where = (path: string) => path.replace(/^\/api\/admin\/?/, '').split('/').filter((p) => !/^[0-9a-f-]{16,}$/i.test(p)).join(' › ') || 'admin';
const nextDay = (key: string) => { const d = new Date(`${key}T00:00:00+05:00`); d.setDate(d.getDate() + 1); return d.toISOString(); };

export default function AuditLogPage() {
  const guide = usePageGuide();
  const list = useListParams({ actor: 'ALL', method: 'ALL', failed: '0', period: 'month' }, { limit: 50 });
  const { actor, method, failed, period } = list.filters;
  const [custom, setCustom] = useState({ from: '', to: '' });
  const range: DateRangeValue = { preset: period as DateRangeValue['preset'], custom };
  const days = resolveRange(range, 0);
  const [open, setOpen] = useState<AuditEntry | null>(null);
  const [exporting, setExporting] = useState(false);

  const members = useQuery({ queryKey: ['admin', 'staff', 'members'], queryFn: adminStaffApi.members, staleTime: 5 * 60_000 });
  const people = [...(members.data?.superAdmins ?? []).map((u) => ({ id: u.userId, name: u.fullName })), ...(members.data?.staff ?? []).map((m) => ({ id: m.userId, name: m.fullName }))];

  const query = {
    actorId: actor === 'ALL' ? undefined : actor,
    method: method === 'ALL' ? undefined : method,
    failed: failed === '1',
    search: list.debouncedSearch || undefined,
    from: days ? new Date(`${days.from}T00:00:00+05:00`).toISOString() : undefined,
    to: days ? nextDay(days.to) : undefined,
  };
  const log = useQuery({
    queryKey: ['admin', 'audit', query, list.page, list.limit],
    queryFn: () => adminStaffApi.audit({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const rows = log.data?.items ?? [];

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages((page) => adminStaffApi.audit({ ...query, page, limit: 100 }));
      downloadCsv<AuditEntry>('audit-log', all, [
        { label: 'When', value: (r) => r.createdAt },
        { label: 'Who', value: (r) => r.actorEmail },
        { label: 'Action', value: (r) => r.action },
        { label: 'Method', value: (r) => r.method },
        { label: 'Path', value: (r) => r.path },
        { label: 'Target', value: (r) => r.targetId },
        { label: 'Result', value: (r) => r.statusCode },
        { label: 'Note', value: (r) => r.summary },
        { label: 'IP', value: (r) => r.ip },
      ]);
      toast.success(`${all.length} entries exported`);
    } catch { toast.error('Export failed. Try again.'); } finally { setExporting(false); }
  };

  const chips = [
    actor !== 'ALL' && <FilterChip key="a" onRemove={() => list.setFilter('actor', 'ALL')}>{people.find((p) => p.id === actor)?.name ?? 'Person'}</FilterChip>,
    method !== 'ALL' && <FilterChip key="m" onRemove={() => list.setFilter('method', 'ALL')}>{METHODS.find((m) => m.value === method)?.label}</FilterChip>,
    failed === '1' && <FilterChip key="f" onRemove={() => list.setFilter('failed', '0')}>Failed only</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Audit log"
        chip={log.data ? `${log.data.meta.total.toLocaleString('en-PK')} ${log.data.meta.total === 1 ? 'entry' : 'entries'}` : undefined}
        busy={log.isFetching}
        loading={log.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting}><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={log.data ? [
          { label: 'Entries in view', value: log.data.meta.total.toLocaleString('en-PK') },
          { label: 'Failed on this page', value: rows.filter((r) => (r.statusCode ?? 0) >= 400).length },
          { label: 'People on this page', value: new Set(rows.map((r) => r.actorEmail)).size },
        ] : undefined}
      />

      <FilterBar search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search page, action, email or record id" />} chips={chips.length ? chips : undefined} onClear={list.clear}>
        <FilterMenu icon={Users} label="Who" value={actor} active={actor !== 'ALL'} onChange={(v) => list.setFilter('actor', v)} options={[{ value: 'ALL', label: 'Everyone' }, ...people.map((p) => ({ value: p.id, label: p.name }))]} />
        <FilterMenu icon={ListFilter} label="Kind" value={method} active={method !== 'ALL'} onChange={(v) => list.setFilter('method', v)} options={METHODS} />
        <FilterMenu icon={AlertTriangle} label="Result" value={failed} active={failed === '1'} onChange={(v) => list.setFilter('failed', v)} options={[{ value: '0', label: 'All results' }, { value: '1', label: 'Failed only' }]} />
        <DateRangeMenu value={range} startHour={0} onChange={(v) => { if (v.preset === 'custom') setCustom(v.custom); list.setFilter('period', v.preset); }} />
      </FilterBar>

      <ListCard
        loading={log.isLoading}
        empty={!rows.length}
        emptyIcon={<ScrollText className="h-6 w-6" />}
        emptyTitle="Nothing logged for these filters"
        page={list.page} limit={list.limit} total={log.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="56rem">
          <THead><Tr><Th>When</Th><Th>Who</Th><Th>What</Th><Th>Where</Th><Th align="right">Result</Th></Tr></THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.id} interactive onClick={() => setOpen(r)}>
                <Td className="whitespace-nowrap text-slate-500" title={new Date(r.createdAt).toLocaleString('en-PK')}>{formatRelative(r.createdAt)}</Td>
                <Td><span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-slate-400" />{r.actorEmail ?? 'Unknown'}</span></Td>
                <Td><span className="font-medium text-slate-900">{r.action.startsWith('auth.') ? r.action.replace('auth.', 'sign-in · ').replace('_', ' ') : `${METHOD_WORD[r.method] ?? r.method} · ${r.action}`}</span></Td>
                <Td className="max-w-[18rem] truncate text-slate-500">{where(r.path)}</Td>
                <Td align="right"><StatusBadge value={(r.statusCode ?? 0) >= 400 ? 'FAILED' : 'OK'} label={String(r.statusCode ?? '—')} /></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      <Drawer open={!!open} onClose={() => setOpen(null)} title="Audit entry" description={open ? new Date(open.createdAt).toLocaleString('en-PK') : undefined} icon={<ScrollText className="h-5 w-5" />} size="lg">
        {open && (
          <div className="space-y-4">
            <DetailList cols={2} items={[
              { label: 'Who', value: open.actorEmail },
              { label: 'Permission used', value: <code className="text-[0.8125rem]">{open.action}</code> },
              { label: 'Request', value: <code className="break-all text-[0.8125rem]">{open.method} {open.path}</code> },
              { label: 'Record', value: open.targetId ? <code className="break-all text-[0.8125rem]">{open.targetType} · {open.targetId}</code> : null },
              { label: 'Result', value: open.statusCode },
              { label: 'Note', value: open.summary },
              { label: 'IP address', value: open.ip },
              { label: 'Device', value: open.userAgent },
            ]} />
            {open.metadata != null && (
              <div>
                <div className="mb-1 text-[0.75rem] font-medium text-slate-500">What was sent (passwords and codes hidden)</div>
                <pre className="max-h-96 overflow-auto rounded-xl bg-slate-50 p-3 text-[0.75rem] text-slate-700 ring-1 ring-slate-200">{JSON.stringify(open.metadata, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {guide.isOpen && (
        <PageGuide
          title="Audit log"
          description="A permanent record of who changed what in the admin panel."
          flowTitle="What gets recorded"
          flow={[
            { label: 'Sign-ins', hint: 'And failed tries', icon: ShieldCheck, color: '#4f46e5' },
            { label: 'Every change', hint: 'Create, edit, delete', icon: ListFilter, color: '#0284c7' },
            { label: 'Sign in as a shop', hint: 'Always logged', icon: User, color: '#e11d48' },
          ]}
          steps={[
            { icon: Users, color: '#4f46e5', title: 'Filter by person', text: 'See everything one team member did.' },
            { icon: CalendarRange, color: '#0284c7', title: 'Pick dates', text: 'Days follow Pakistan time.' },
            { icon: ScrollText, color: '#059669', title: 'Open an entry', text: 'Shows the record it touched and what was sent. Passwords and codes are never stored.' },
          ]}
          tips={['Just looking at pages is not logged; only changes are.', 'Entries cannot be edited or deleted from the admin panel.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
