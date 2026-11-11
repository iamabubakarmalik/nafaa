/**
 * Entry list: one screen for every Website section, filtered by the
 * section's types. Status chips, SEO score, words against the quality gate,
 * filters, bulk publish / unpublish / archive and the "New" dialog. Search,
 * filters and paging run on the server and live in the address.
 */
import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Archive, ArrowDownUp, Download, EyeOff, FileText, Gauge, Layers, Lightbulb, PenLine, Plus, Rocket, Tag, X, Globe, CheckCircle } from 'lucide-react';
import {
  Checkbox, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Segmented, Table, TBody, Td, Th, THead, Tr, confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@/lib/cn';
import { apiErrorMessage, cmsApi, cmsKeys, type EntriesListParams } from '@/api/marketing/marketing-cms.api';
import { CMS_STATUSES, DEFAULT_QUALITY_GATES, ENTRY_TYPE_META, type AdminEntryListItem, type CmsEntryType, type CmsStatus } from '../contract/cms-contract';
import { ListCard, downloadCsv, fetchAllPages, statusLabel, useListParams } from '@/ui';
import { TypeTag } from '../fields/EntryPicker';
import { formatPkt, relativeTime, robotsReasonLabel } from '../editor/lib';
import { CMS_BASE, cmsHttp, unwrap } from '../dashboard/shared/cms-http';
import type { CmsDashboard } from '../contract/cms-contract';
import { NewEntryDialog } from './NewEntryDialog';
import { ENTRY_SECTIONS, sectionByKey } from './sections';
import { ScoreRing, StatusChip } from './StatusChip';

const STATUS_LABEL: Record<CmsStatus, string> = { DRAFT: 'Draft', SCHEDULED: 'Scheduled', PUBLISHED: 'Live', ARCHIVED: 'Archived' };
const SORTS = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'score', label: 'SEO score' },
] as const;
const num = (n: number) => n.toLocaleString('en-PK');

export function EntryListPage() {
  const { section: sectionKey } = useParams();
  const section = sectionByKey(sectionKey);
  if (!section) return <Navigate to="/marketing/website/pages" replace />;
  return <EntryList key={section.key} sectionKey={section.key} />;
}

function EntryList({ sectionKey }: { sectionKey: string }) {
  const section = sectionByKey(sectionKey) ?? (ENTRY_SECTIONS[0] as NonNullable<ReturnType<typeof sectionByKey>>);
  const nav = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const list = useListParams({ type: 'ALL', status: 'ALL', gate: 'ALL', sort: 'updated' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newOpen, setNewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const multi = section.types.length !== 1;
  const typeParam = list.filters.type === 'ALL' ? null : (list.filters.type as CmsEntryType);
  const type: CmsEntryType | undefined = section.types.length === 1 ? section.types[0] : typeParam && (section.types.length === 0 || section.types.includes(typeParam)) ? typeParam : undefined;
  const status = list.filters.status === 'ALL' ? undefined : (list.filters.status as CmsStatus);
  const gate = list.filters.gate === 'ALL' ? undefined : (list.filters.gate as 'below' | 'passed');
  const sort = list.filters.sort as NonNullable<EntriesListParams['sort']>;

  // A multi-type section without a chosen type lists its first type (the API filters one type at a time).
  const effectiveType = type ?? (section.types.length > 1 ? section.types[0] : undefined);
  const params: EntriesListParams = { type: effectiveType, status, gate, sort, q: list.debouncedSearch || undefined, page: list.page, limit: list.limit };
  const entries = useQuery({ queryKey: cmsKeys.entries(params), queryFn: () => cmsApi.entries(params), placeholderData: keepPreviousData, retry: false });
  const config = useQuery({ queryKey: cmsKeys.config, queryFn: cmsApi.config, staleTime: 5 * 60_000, retry: false });
  const summary = useQuery({ queryKey: ['cms-dashboard'], queryFn: () => cmsHttp.get(`${CMS_BASE}/dashboard`).then((r) => unwrap<CmsDashboard>(r)), staleTime: 60_000 });

  const items = useMemo(() => {
    const rows = entries.data?.items ?? [];
    return section.key === 'docs' ? [...rows].sort((a, b) => a.path.localeCompare(b.path)) : rows;
  }, [entries.data, section.key]);
  const meta = entries.data?.meta;
  const allChecked = items.length > 0 && items.every((i) => selected.has(i.id));

  const bulkRun = useMutation({
    mutationFn: (action: 'publish' | 'unpublish' | 'archive') => cmsApi.bulk({ ids: [...selected], action }),
    onSuccess: (r, action) => {
      const ok = r.results.filter((x) => x.ok).length;
      const failed = r.results.filter((x) => !x.ok);
      if (ok) toast.success(`${ok} entries: ${action} done`);
      if (failed.length) toast.error(`${failed.length} failed: ${failed[0]?.issues?.[0]?.message ?? 'checks failed'}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: cmsKeys.entriesAll });
      qc.invalidateQueries({ queryKey: ['cms-dashboard'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const askBulk = async (action: 'publish' | 'unpublish' | 'archive') => {
    const ok = await confirmDialog({
      title: `${statusLabel(action)} ${selected.size} entries?`,
      text: action === 'publish' ? 'Each entry is checked first. Entries with errors are not published.' : 'They leave the live site. To add a redirect, unpublish each entry on its own.',
      yes: statusLabel(action),
      danger: action !== 'publish',
    });
    if (ok) bulkRun.mutate(action);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages((page) => cmsApi.entries({ ...params, page, limit: 100 }));
      downloadCsv<AdminEntryListItem>(`website-${section.key}`, all, [
        { label: 'Title', value: (e) => e.title },
        { label: 'Path', value: (e) => e.path },
        { label: 'Type', value: (e) => ENTRY_TYPE_META[e.type]?.label ?? e.type },
        { label: 'Status', value: (e) => e.status },
        { label: 'SEO score', value: (e) => e.seoScore },
        { label: 'Words', value: (e) => e.wordCount },
        { label: 'Language', value: (e) => e.locale },
        { label: 'Updated', value: (e) => e.updatedAt.slice(0, 10) },
        { label: 'Author', value: (e) => e.authorName },
      ]);
      toast.success(`${num(all.length)} entries exported`);
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const types = section.types.length ? section.types : (Object.keys(ENTRY_TYPE_META) as CmsEntryType[]);
  const counts = (summary.data?.byType ?? []).filter((t) => types.includes(t.type)).reduce(
    (a, t) => ({ published: a.published + t.published, draft: a.draft + t.draft, scheduled: a.scheduled + t.scheduled, noindex: a.noindex + t.noindex }),
    { published: 0, draft: 0, scheduled: 0, noindex: 0 },
  );
  const Icon = section.icon;
  const chips = [
    section.types.length === 0 && type && <FilterChip key="t" onRemove={() => list.setFilter('type', 'ALL')}>{ENTRY_TYPE_META[type].labelPlural}</FilterChip>,
    status && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{STATUS_LABEL[status]}</FilterChip>,
    gate && <FilterChip key="g" onRemove={() => list.setFilter('gate', 'ALL')}>{gate === 'below' ? 'Below quality gate' : 'Passed quality gate'}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title={section.label}
        chip={meta ? `${num(meta.total)} entries` : undefined}
        meta={section.description}
        busy={entries.isFetching}
        loading={summary.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} disabled={exporting} onClick={exportCsv}><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <button type="button" className={heroPrimaryButton} onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> New</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={summary.data ? [
          { label: 'Live', value: num(counts.published), hint: counts.noindex ? `${num(counts.noindex)} noindex` : undefined },
          { label: 'Drafts', value: num(counts.draft) },
          { label: 'Scheduled', value: num(counts.scheduled) },
          { label: 'Section', value: <span className="inline-flex items-center gap-1.5"><Icon className="h-4 w-4" />{section.types.length || 'All'} {section.types.length === 1 ? 'type' : 'types'}</span> },
        ] : undefined}
      />

      {section.types.length > 1 && (
        <div className="overflow-x-auto">
          <Segmented value={effectiveType ?? section.types[0]!} onChange={(t) => list.setFilter('type', t)} label="Entry type" items={section.types.map((t) => ({ value: t, label: ENTRY_TYPE_META[t].labelPlural }))} />
        </div>
      )}

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search title or path" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        {section.types.length === 0 && (
          <FilterMenu icon={Layers} label="Type" value={list.filters.type} active={!!type} onChange={(v) => list.setFilter('type', v)} width="w-60"
            options={[{ value: 'ALL', label: 'All types' }, ...Object.entries(ENTRY_TYPE_META).map(([t, m]) => ({ value: t, label: m.labelPlural }))]} />
        )}
        <FilterMenu icon={Tag} label="Status" value={list.filters.status} active={!!status} onChange={(v) => list.setFilter('status', v)}
          options={[{ value: 'ALL', label: 'All statuses' }, ...CMS_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]} />
        <FilterMenu icon={Gauge} label="Quality gate" value={list.filters.gate} active={!!gate} onChange={(v) => list.setFilter('gate', v)}
          options={[{ value: 'ALL', label: 'All entries' }, { value: 'below', label: 'Below the gate' }, { value: 'passed', label: 'Passed the gate' }]} />
        <FilterMenu icon={ArrowDownUp} label="Sort" value={sort} onChange={(v) => list.setFilter('sort', v)} options={[...SORTS]} align="right" />
      </FilterBar>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">
          <span className="font-medium">{selected.size} selected</span>
          <span className="mx-1 h-4 w-px bg-white/20" />
          <button type="button" onClick={() => askBulk('publish')} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 hover:bg-white/10"><Rocket className="h-4 w-4" /> Publish</button>
          <button type="button" onClick={() => askBulk('unpublish')} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 hover:bg-white/10"><EyeOff className="h-4 w-4" /> Unpublish</button>
          <button type="button" onClick={() => askBulk('archive')} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 hover:bg-white/10"><Archive className="h-4 w-4" /> Archive</button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto rounded-lg p-1 hover:bg-white/10" aria-label="Clear selection"><X className="h-4 w-4" /></button>
        </div>
      )}

      <ListCard
        loading={entries.isLoading}
        empty={entries.isError || items.length === 0}
        emptyIcon={<FileText className="h-6 w-6" />}
        emptyTitle={entries.isError ? 'The list did not load' : list.debouncedSearch || status || gate ? 'Nothing matches these filters' : 'No entries yet'}
        emptyText={entries.isError ? apiErrorMessage(entries.error) : undefined}
        emptyAction={!entries.isError && !(list.debouncedSearch || status || gate) ? <button type="button" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline" onClick={() => setNewOpen(true)}>Create the first entry</button> : undefined}
        page={list.page} limit={list.limit} total={meta?.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="58rem">
          <THead>
            <Tr>
              <Th className="w-10"><Checkbox checked={allChecked} onChange={() => setSelected(allChecked ? new Set() : new Set(items.map((i) => i.id)))} aria-label="Select all" /></Th>
              <Th>Entry</Th>
              {multi && <Th>Type</Th>}
              <Th>Status</Th><Th>SEO</Th><Th>Words</Th><Th>Updated</Th><Th>Author</Th>
            </Tr>
          </THead>
          <TBody>
            {items.map((e) => (
              <Row
                key={e.id}
                e={e}
                multi={multi}
                indent={section.key === 'docs' ? Math.max(0, e.path.split('/').filter(Boolean).length - 1) : 0}
                checked={selected.has(e.id)}
                onCheck={() => {
                  const next = new Set(selected);
                  if (next.has(e.id)) next.delete(e.id);
                  else next.add(e.id);
                  setSelected(next);
                }}
                onOpen={() => nav(`/marketing/website/entries/${e.id}`)}
              />
            ))}
          </TBody>
        </Table>
      </ListCard>

      <NewEntryDialog open={newOpen} onClose={() => setNewOpen(false)} types={type ? [type, ...section.types.filter((t) => t !== type)] : section.types} locales={config.data?.locales ?? ['en']} />

      {guide.isOpen && (
        <PageGuide
          title={section.label}
          description={`${section.description}. Every entry here is a page or item on the public website.`}
          flowTitle="Life of an entry"
          flow={[
            { label: 'Draft', hint: 'Write and save', icon: PenLine, color: '#64748b' },
            { label: 'Quality check', hint: 'SEO and words', icon: CheckCircle, color: '#d97706' },
            { label: 'Publish or schedule', hint: 'Pakistan time', icon: Rocket, color: '#0284c7' },
            { label: 'Live', hint: 'On nafaa.pk', icon: Globe, color: '#059669' },
          ]}
          steps={[
            { icon: Plus, color: '#4f46e5', title: 'New', text: 'Create an entry. It starts as a draft, so nothing goes live by accident.' },
            { icon: Gauge, color: '#d97706', title: 'Quality gate', text: 'Each type has a minimum word count. Entries below it are published as noindex.' },
            { icon: Rocket, color: '#0284c7', title: 'Bulk actions', text: 'Tick rows to publish, unpublish or archive many entries at once. You are asked to confirm.' },
            { icon: Download, color: '#059669', title: 'Export', text: 'Export CSV downloads every entry that matches the filters.' },
          ]}
          tips={['Press / to jump to the search box.', 'Filters stay in the address, so you can share the link.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

function Row({ e, multi, indent, checked, onCheck, onOpen }: { e: AdminEntryListItem; multi: boolean; indent: number; checked: boolean; onCheck: () => void; onOpen: () => void }) {
  const gate = DEFAULT_QUALITY_GATES[e.type]?.minWords;
  const below = gate !== undefined && e.wordCount < gate;
  return (
    <Tr interactive onClick={onOpen} className={cn(checked && 'bg-brand-50/60')}>
      <Td onClick={(ev) => ev.stopPropagation()}>
        <Checkbox checked={checked} onChange={onCheck} aria-label={`Select ${e.title}`} />
      </Td>
      <Td className="max-w-[420px]">
        <div style={{ paddingLeft: indent * 16 }}>
          <p className="truncate font-medium text-slate-900">{e.title || 'Untitled'}</p>
          <p className="truncate font-mono text-[11px] text-slate-500">
            {e.locale !== 'en' && <span className="mr-1 rounded bg-slate-100 px-1 uppercase">{e.locale}</span>}
            {e.path}
          </p>
        </div>
      </Td>
      {multi && (
        <Td>
          <TypeTag type={e.type} />
        </Td>
      )}
      <Td>
        <StatusChip status={e.status} hasUnpublishedChanges={e.hasUnpublishedChanges} noindexReason={e.noindexReason} />
        {e.status === 'SCHEDULED' && e.publishAt && <p className="mt-0.5 text-[11px] text-blue-700">{formatPkt(e.publishAt)}</p>}
        {e.status === 'PUBLISHED' && e.noindexReason && <p className="mt-0.5 text-[11px] text-violet-700">{robotsReasonLabel(e.noindexReason)}</p>}
      </Td>
      <Td>
        <ScoreRing score={e.seoScore} />
      </Td>
      <Td>
        <span className={cn('tabular-nums', below ? 'text-amber-700' : 'text-slate-700')}>{e.wordCount.toLocaleString()}</span>
        {gate !== undefined && <span className="text-[11px] text-slate-400">/{gate}</span>}
      </Td>
      <Td className="whitespace-nowrap text-xs text-slate-500" title={formatPkt(e.updatedAt)}>
        {relativeTime(e.updatedAt)}
      </Td>
      <Td className="text-xs text-slate-600">{e.authorName ?? '—'}</Td>
    </Tr>
  );
}
