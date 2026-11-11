/**
 * Activity log: what happened in every shop (sales, edits, sign-ins, admin
 * actions), searchable by text, person and shop, filtered by kind, admin only
 * and day range. Search, filters and paging run on the server.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, Download, Lightbulb, ScrollText, Shield, Tag, User, UserCog } from 'lucide-react';
import {
  DateRangeMenu, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, heroButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminActivityApi, type ActivityRow } from '@/api/admin-activity.api';
import { ListCard, downloadCsv, fetchAllPages, statusLabel, useListParams } from '@/ui';
import { num, Pill } from '@/features/shared/kit';

const dateTime = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
const EMPTY_RANGE: DateRangeValue = { preset: 'all', custom: { from: '', to: '' } };

export default function ActivityPage() {
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const [range, setRange] = useState<DateRangeValue>(EMPTY_RANGE);
  const period = resolveRange(range, 0);
  const list = useListParams({ type: 'ALL', who: 'ALL' }, { limit: 50 });
  const { type, who } = list.filters;

  const query = { search: list.debouncedSearch || undefined, entityType: type === 'ALL' ? undefined : type, adminOnly: who === 'admin', from: period?.from, to: period?.to };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-activity', query, list.page, list.limit],
    queryFn: () => adminActivityApi.paged({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const rows = data?.items ?? [];
  const s = data?.stats;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages((page) => adminActivityApi.paged({ ...query, page, limit: 100 }));
      downloadCsv<ActivityRow>('activity', all, [
        { label: 'When', value: (l) => l.createdAt }, { label: 'Person', value: (l) => l.user?.fullName ?? 'System' }, { label: 'Role', value: (l) => l.user?.role },
        { label: 'Shop', value: (l) => l.tenant?.name }, { label: 'Action', value: (l) => l.action }, { label: 'What happened', value: (l) => l.description },
        { label: 'Kind', value: (l) => l.entityType }, { label: 'Record', value: (l) => l.entityId },
      ]);
      toast.success(`${num(all.length)} entries exported`);
    } catch { toast.error('Export failed. Try again.'); } finally { setExporting(false); }
  };

  const chips = [
    type !== 'ALL' && <FilterChip key="t" onRemove={() => list.setFilter('type', 'ALL')}>{statusLabel(type)}</FilterChip>,
    who === 'admin' && <FilterChip key="w" onRemove={() => list.setFilter('who', 'ALL')}>Admin actions</FilterChip>,
    range.preset !== 'all' && <FilterChip key="d" onRemove={() => setRange(EMPTY_RANGE)}>{period ? `${period.from} to ${period.to}` : 'Period'}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Activity log"
        chip={data ? `${num(data.meta.total)} shown` : undefined}
        busy={isFetching}
        loading={isLoading && !s}
        actions={
          <>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting}><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={s ? [{ label: 'Today', value: num(s.today) }, { label: 'Last 7 days', value: num(s.last7d) }, { label: 'All entries', value: num(s.total) }] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search what happened, person or shop" />}
        chips={chips.length ? chips : undefined}
        onClear={() => { list.clear(); setRange(EMPTY_RANGE); }}
      >
        <FilterMenu icon={Tag} label="Kind" value={type} active={type !== 'ALL'} onChange={(v) => list.setFilter('type', v)} width="w-64"
          options={[{ value: 'ALL', label: 'All kinds' }, ...(s?.entityTypes ?? []).map((e) => ({ value: e.type, label: `${statusLabel(e.type)} (${num(e.count)})` }))]} />
        <FilterMenu icon={UserCog} label="Who" value={who} active={who !== 'ALL'} onChange={(v) => list.setFilter('who', v)}
          options={[{ value: 'ALL', label: 'Everything' }, { value: 'admin', label: 'Admin actions only' }]} />
        <DateRangeMenu value={range} onChange={(v) => { setRange(v); list.setPage(1); }} startHour={0} />
      </FilterBar>

      <ListCard
        loading={isLoading}
        empty={!!error || !rows.length}
        emptyIcon={<ScrollText className="h-6 w-6" />}
        emptyTitle={error ? 'Could not load activity' : 'No activity matches'}
        emptyText={error ? 'Try again in a moment.' : 'Try another search or clear the filters.'}
        page={list.page} limit={list.limit} total={data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <ul className="divide-y divide-slate-100">
          {rows.map((log) => (
            <li key={log.id} className="px-4 py-3.5 sm:px-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">{log.action.startsWith('ADMIN_') ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{log.user?.fullName || 'System'}</span>
                    {log.user?.role && <Pill>{log.user.role.toLowerCase()}</Pill>}
                    {log.tenant && <Link to={`/tenants/${log.tenant.id}`} className="text-[0.75rem] font-semibold text-brand-700 hover:underline">{log.tenant.name}</Link>}
                    <span className="inline-flex items-center gap-1 text-[0.75rem] text-slate-500"><Clock className="h-3 w-3" />{dateTime(log.createdAt)}</span>
                  </div>
                  <div className="mt-0.5 text-[0.875rem] text-slate-700">{log.description}</div>
                  {log.entityType && <div className="mt-0.5 text-[0.75rem] text-slate-500">{statusLabel(log.entityType)}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ''}</div>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Activity log"
          description="An audit trail of what people and admins did in every shop."
          flowTitle="Where entries come from"
          flow={[
            { label: 'Someone acts', hint: 'Sale, edit, sign-in…', icon: User, color: '#4f46e5' },
            { label: 'Saved here', hint: 'With person and shop', icon: ScrollText, color: '#0284c7' },
            { label: 'You investigate', hint: 'Search and filter', icon: Tag, color: '#059669' },
          ]}
          steps={[
            { icon: Tag, color: '#4f46e5', title: 'Filter', text: 'Narrow by kind of record, by admin actions only, or by day. Days are Pakistan time.' },
            { icon: User, color: '#0284c7', title: 'Search', text: 'Search the text, the person’s name or the shop’s name.' },
            { icon: Download, color: '#059669', title: 'Export', text: 'Export CSV downloads every entry that matches, not only this page.' },
          ]}
          tips={['Admin actions have a shield icon.', 'Click a shop name to open its profile.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
