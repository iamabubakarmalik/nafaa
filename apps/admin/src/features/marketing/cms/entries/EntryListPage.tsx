/**
 * Entry list (ARCH 13.2): one screen for every Website section, filtered by
 * the section's types. Status chips, SEO score, words against the gate,
 * filters, bulk publish / unpublish / archive and the "Naya" dialog.
 */
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Archive, ChevronLeft, ChevronRight, EyeOff, FileText, Plus, Rocket, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { apiErrorMessage, cmsApi, cmsKeys, type EntriesListParams } from '@/api/marketing/marketing-cms.api';
import { CMS_STATUSES, DEFAULT_QUALITY_GATES, ENTRY_TYPE_META, type AdminEntryListItem, type CmsEntryType, type CmsStatus } from '../contract/cms-contract';
import { TypeTag } from '../fields/EntryPicker';
import { Btn, Modal, inputClass } from '../fields/ui';
import { formatPkt, relativeTime, robotsReasonLabel } from '../editor/lib';
import { NewEntryDialog } from './NewEntryDialog';
import { ENTRY_SECTIONS, sectionByKey } from './sections';
import { ScoreRing, StatusChip } from './StatusChip';

const STATUS_LABEL: Record<CmsStatus, string> = { DRAFT: 'Draft', SCHEDULED: 'Scheduled', PUBLISHED: 'Live', ARCHIVED: 'Archived' };
const PAGE_SIZE = 30;

function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

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
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const dq = useDebounced(q);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newOpen, setNewOpen] = useState(false);
  const [bulk, setBulk] = useState<'publish' | 'unpublish' | 'archive' | null>(null);

  const multi = section.types.length !== 1;
  const typeParam = sp.get('type') as CmsEntryType | null;
  const type: CmsEntryType | undefined = section.types.length === 1 ? section.types[0] : typeParam && (section.types.length === 0 || section.types.includes(typeParam)) ? typeParam : undefined;
  const status = (sp.get('status') as CmsStatus | null) ?? undefined;
  const gate = (sp.get('gate') as 'below' | 'passed' | null) ?? undefined;
  const sort = (sp.get('sort') as EntriesListParams['sort'] | null) ?? 'updated';
  const page = Number(sp.get('page') ?? '1') || 1;

  const setParam = (k: string, v: string | undefined) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'page') next.delete('page');
    setSp(next, { replace: true });
  };
  useEffect(() => {
    if ((sp.get('q') ?? '') !== dq) setParam('q', dq || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  // A multi-type section without a chosen type lists its first type (the API filters one type at a time).
  const effectiveType = type ?? (section.types.length > 1 ? section.types[0] : undefined);
  const params: EntriesListParams = { type: effectiveType, status, gate, sort, q: dq || undefined, page, limit: PAGE_SIZE };
  const list = useQuery({ queryKey: cmsKeys.entries(params), queryFn: () => cmsApi.entries(params), placeholderData: keepPreviousData, retry: false });
  const config = useQuery({ queryKey: cmsKeys.config, queryFn: cmsApi.config, staleTime: 5 * 60_000, retry: false });

  const items = useMemo(() => {
    const rows = list.data?.items ?? [];
    return section.key === 'docs' ? [...rows].sort((a, b) => a.path.localeCompare(b.path)) : rows;
  }, [list.data, section.key]);
  const meta = list.data?.meta;
  const allChecked = items.length > 0 && items.every((i) => selected.has(i.id));

  const bulkRun = useMutation({
    mutationFn: (action: 'publish' | 'unpublish' | 'archive') => cmsApi.bulk({ ids: [...selected], action }),
    onSuccess: (r, action) => {
      const ok = r.results.filter((x) => x.ok).length;
      const failed = r.results.filter((x) => !x.ok);
      if (ok) toast.success(`${ok} entries: ${action} ho gayi`);
      if (failed.length) toast.error(`${failed.length} nahi huin: ${failed[0]?.issues?.[0]?.message ?? 'checks fail'}`);
      setSelected(new Set());
      setBulk(null);
      qc.invalidateQueries({ queryKey: cmsKeys.entriesAll });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const typeChips: CmsEntryType[] = section.types.length > 1 ? section.types : [];
  const Icon = section.icon;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Website</p>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{section.label}</h1>
            <p className="text-sm text-neutral-500">{section.description}</p>
          </div>
        </div>
        <Btn variant="primary" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" /> Naya
        </Btn>
      </div>

      {typeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {typeChips.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setParam('type', t)}
              className={cn('rounded-full px-3 py-1.5 text-xs font-semibold transition', effectiveType === t ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:ring-neutral-300')}
            >
              {ENTRY_TYPE_META[t].labelPlural}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title ya path…" className={cn(inputClass, 'pl-9')} />
        </div>
        {section.types.length === 0 && (
          <select value={type ?? ''} onChange={(e) => setParam('type', e.target.value || undefined)} className={cn(inputClass, 'w-auto')}>
            <option value="">Sab types</option>
            {Object.entries(ENTRY_TYPE_META).map(([t, m]) => (
              <option key={t} value={t}>
                {m.labelPlural}
              </option>
            ))}
          </select>
        )}
        <select value={status ?? ''} onChange={(e) => setParam('status', e.target.value || undefined)} className={cn(inputClass, 'w-auto')}>
          <option value="">Har status</option>
          {CMS_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select value={gate ?? ''} onChange={(e) => setParam('gate', e.target.value || undefined)} className={cn(inputClass, 'w-auto')}>
          <option value="">Quality gate: sab</option>
          <option value="below">Gate se neeche</option>
          <option value="passed">Gate paar</option>
        </select>
        <select value={sort} onChange={(e) => setParam('sort', e.target.value)} className={cn(inputClass, 'w-auto')}>
          <option value="updated">Naye update pehle</option>
          <option value="title">Title A-Z</option>
          <option value="score">SEO score</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm text-white shadow-lg">
          <span className="font-medium">{selected.size} chuni hui</span>
          <span className="mx-1 h-4 w-px bg-white/20" />
          <button type="button" onClick={() => setBulk('publish')} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 hover:bg-white/10">
            <Rocket className="h-4 w-4" /> Publish
          </button>
          <button type="button" onClick={() => setBulk('unpublish')} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 hover:bg-white/10">
            <EyeOff className="h-4 w-4" /> Unpublish
          </button>
          <button type="button" onClick={() => setBulk('archive')} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 hover:bg-white/10">
            <Archive className="h-4 w-4" /> Archive
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto rounded-lg p-1 hover:bg-white/10" aria-label="Chunav khatam">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {list.isError ? (
          <div className="p-10 text-center">
            <p className="font-medium text-neutral-800">List load nahi hui</p>
            <p className="mt-1 text-sm text-neutral-500">{apiErrorMessage(list.error)}</p>
          </div>
        ) : list.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-neutral-100">
              <FileText className="h-5 w-5 text-neutral-400" />
            </span>
            <p className="font-semibold text-neutral-800">{dq || status || gate ? 'Is filter par kuch nahi mila' : 'Abhi koi entry nahi'}</p>
            <Btn variant="primary" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" /> Pehli entry banayein
            </Btn>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" className="accent-emerald-600" checked={allChecked} onChange={() => setSelected(allChecked ? new Set() : new Set(items.map((i) => i.id)))} aria-label="Sab chunein" />
                  </th>
                  <th className="px-2 py-3">Entry</th>
                  {multi && <th className="px-3 py-3">Type</th>}
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">SEO</th>
                  <th className="px-3 py-3">Alfaaz</th>
                  <th className="px-3 py-3">Update</th>
                  <th className="px-3 py-3">Author</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
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
              </tbody>
            </table>
          </div>
        )}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2.5 text-xs text-neutral-500">
            <span>
              {meta.total} me se {(meta.page - 1) * meta.limit + 1}-{Math.min(meta.page * meta.limit, meta.total)}
            </span>
            <div className="flex gap-1">
              <Btn size="sm" variant="ghost" disabled={!meta.hasPrev} onClick={() => setParam('page', String(page - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Btn>
              <span className="px-2 py-1.5">
                {meta.page} / {meta.totalPages}
              </span>
              <Btn size="sm" variant="ghost" disabled={!meta.hasNext} onClick={() => setParam('page', String(page + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Btn>
            </div>
          </div>
        )}
      </div>

      <NewEntryDialog open={newOpen} onClose={() => setNewOpen(false)} types={type ? [type, ...section.types.filter((t) => t !== type)] : section.types} locales={config.data?.locales ?? ['en']} />
      <Modal
        open={bulk !== null}
        onClose={() => setBulk(null)}
        title={`${selected.size} entries: ${bulk ?? ''}`}
        description={bulk === 'publish' ? 'Har entry ke checks chalenge; jin me errors hain woh publish nahi hongi.' : 'Live site se hat jayengi. Redirect ke liye har entry alag se unpublish karein.'}
        width="sm"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setBulk(null)}>
              Cancel
            </Btn>
            <Btn variant={bulk === 'publish' ? 'primary' : 'danger'} loading={bulkRun.isPending} onClick={() => bulk && bulkRun.mutate(bulk)}>
              Haan, {bulk}
            </Btn>
          </>
        }
      >
        <p className="text-sm text-neutral-600">Ye kaam wapas karne ke liye har entry khol kar karna hoga.</p>
      </Modal>
    </div>
  );
}

function Row({ e, multi, indent, checked, onCheck, onOpen }: { e: AdminEntryListItem; multi: boolean; indent: number; checked: boolean; onCheck: () => void; onOpen: () => void }) {
  const gate = DEFAULT_QUALITY_GATES[e.type]?.minWords;
  const below = gate !== undefined && e.wordCount < gate;
  return (
    <tr onClick={onOpen} className={cn('cursor-pointer transition hover:bg-emerald-50/40', checked && 'bg-emerald-50/60')}>
      <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
        <input type="checkbox" className="accent-emerald-600" checked={checked} onChange={onCheck} aria-label={`${e.title} chunein`} />
      </td>
      <td className="max-w-[420px] px-2 py-3">
        <div style={{ paddingLeft: indent * 16 }}>
          <p className="truncate font-medium text-neutral-900">{e.title || 'Bina title'}</p>
          <p className="truncate font-mono text-[11px] text-neutral-500">
            {e.locale !== 'en' && <span className="mr-1 rounded bg-neutral-100 px-1 uppercase">{e.locale}</span>}
            {e.path}
          </p>
        </div>
      </td>
      {multi && (
        <td className="px-3 py-3">
          <TypeTag type={e.type} />
        </td>
      )}
      <td className="px-3 py-3">
        <StatusChip status={e.status} hasUnpublishedChanges={e.hasUnpublishedChanges} noindexReason={e.noindexReason} />
        {e.status === 'SCHEDULED' && e.publishAt && <p className="mt-0.5 text-[11px] text-blue-700">{formatPkt(e.publishAt)}</p>}
        {e.status === 'PUBLISHED' && e.noindexReason && <p className="mt-0.5 text-[11px] text-violet-700">{robotsReasonLabel(e.noindexReason)}</p>}
      </td>
      <td className="px-3 py-3">
        <ScoreRing score={e.seoScore} />
      </td>
      <td className="px-3 py-3">
        <span className={cn('tabular-nums', below ? 'text-amber-700' : 'text-neutral-700')}>{e.wordCount.toLocaleString()}</span>
        {gate !== undefined && <span className="text-[11px] text-neutral-400">/{gate}</span>}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-xs text-neutral-500" title={formatPkt(e.updatedAt)}>
        {relativeTime(e.updatedAt)}
      </td>
      <td className="px-3 py-3 text-xs text-neutral-600">{e.authorName ?? '—'}</td>
    </tr>
  );
}
