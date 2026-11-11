/**
 * Website redirects: search and filters, add/edit,
 * CSV import (dry run first) and export, "Test a URL", hits and warnings.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Asterisk, Download, FlaskConical, Globe, Lightbulb, Link2Off, Plus, Power, Tag, Upload } from 'lucide-react';
import { FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, confirmDialog, heroButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { ListCard, downloadCsv, fetchAllPages, useListParams } from '@/ui';
import {
  CMS_REDIRECT_SOURCES, createRedirectBodySchema, patchRedirectBodySchema, redirectImportRowSchema,
  type AdminRedirect, type CmsRedirectSource, type RedirectImportResult, type RedirectStatus, type RedirectTestResult, type RedirectWarning,
} from '../contract/cms-contract';
import { errorIssues, errorMessage, formatPkt, zodFieldErrors, type FieldErrors } from '../dashboard/shared/cms-http';
import { Card, Chip, EntryRefSelect, Field, IssueList, Modal, Toggle, btn, inputCls, selectCls } from '../dashboard/shared/ui';
import { parseCsv, redirectsApi, type RedirectListParams } from './redirects.api';

const WARNING_TEXT: Record<RedirectWarning, string> = {
  chain: 'Chain (a redirect to a redirect)',
  loop: 'Loop',
  target_unpublished: 'Target page is not live',
  target_404: 'Target 404',
};

const SOURCE_TEXT: Record<CmsRedirectSource, string> = {
  MANUAL: 'Added by hand',
  SLUG_CHANGE: 'Slug changed',
  UNPUBLISH: 'Unpublish',
  IMPORT: 'Import',
};

export function RedirectsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const list = useListParams({ source: 'ALL', active: 'ALL', pattern: 'ALL' });
  const { source, active, pattern } = list.filters;
  const [editing, setEditing] = useState<AdminRedirect | 'new' | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const query: RedirectListParams = {
    q: list.debouncedSearch,
    source: source === 'ALL' ? '' : (source as CmsRedirectSource),
    active: active === 'ALL' ? '' : (active as 'true' | 'false'),
    pattern: pattern === 'ALL' ? '' : (pattern as 'true' | 'false'),
  };

  const redirects = useQuery({
    queryKey: ['cms-redirects', query, list.page, list.limit],
    queryFn: () => redirectsApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const allCount = useQuery({ queryKey: ['cms-redirects', 'count', 'all'], queryFn: () => redirectsApi.list({ limit: 1 }), staleTime: 60_000 });
  const activeCount = useQuery({ queryKey: ['cms-redirects', 'count', 'active'], queryFn: () => redirectsApi.list({ active: 'true', limit: 1 }), staleTime: 60_000 });
  const patternCount = useQuery({ queryKey: ['cms-redirects', 'count', 'pattern'], queryFn: () => redirectsApi.list({ pattern: 'true', limit: 1 }), staleTime: 60_000 });
  const rows = redirects.data?.items ?? [];
  const total = allCount.data?.meta.total ?? 0;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages((page) => redirectsApi.list({ ...query, page, limit: 100 }));
      downloadCsv<AdminRedirect>('redirects', all, [
        { label: 'from', value: (r) => r.fromPath },
        { label: 'to', value: (r) => r.toPath },
        { label: 'status', value: (r) => r.statusCode },
        { label: 'note', value: (r) => r.note },
        { label: 'source', value: (r) => r.source },
        { label: 'active', value: (r) => (r.isActive ? 'yes' : 'no') },
        { label: 'hits', value: (r) => r.hits },
      ]);
      toast.success(`${all.length} redirects exported`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  const chips = [
    source !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('source', 'ALL')}>{SOURCE_TEXT[source as CmsRedirectSource]}</FilterChip>,
    active !== 'ALL' && <FilterChip key="a" onRemove={() => list.setFilter('active', 'ALL')}>{active === 'true' ? 'Active only' : 'Switched off only'}</FilterChip>,
    pattern !== 'ALL' && <FilterChip key="p" onRemove={() => list.setFilter('pattern', 'ALL')}>{pattern === 'true' ? 'Patterns only' : 'Exact only'}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Redirects"
        chip={redirects.data ? `${redirects.data.meta.total} shown` : undefined}
        busy={redirects.isFetching}
        loading={allCount.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} disabled={exporting} onClick={exportCsv}><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <button type="button" className={heroButton} onClick={() => setImporting(true)}><Upload className="h-4 w-4" /> Import CSV</button>
            <button type="button" className={heroPrimaryButton} onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> New redirect</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={[
          { label: 'Redirects', value: total },
          { label: 'Active', value: activeCount.data?.meta.total ?? 0, hint: `${Math.max(0, total - (activeCount.data?.meta.total ?? 0))} switched off` },
          { label: 'Patterns', value: patternCount.data?.meta.total ?? 0 },
        ]}
      />

      <RedirectTester />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search path" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="Source" value={source} active={source !== 'ALL'} onChange={(v) => list.setFilter('source', v)}
          options={[{ value: 'ALL', label: 'All sources' }, ...CMS_REDIRECT_SOURCES.map((s) => ({ value: s, label: SOURCE_TEXT[s] }))]} />
        <FilterMenu icon={Power} label="State" value={active} active={active !== 'ALL'} onChange={(v) => list.setFilter('active', v)}
          options={[{ value: 'ALL', label: 'Active and off' }, { value: 'true', label: 'Active only' }, { value: 'false', label: 'Switched off only' }]} />
        <FilterMenu icon={Asterisk} label="Match" value={pattern} active={pattern !== 'ALL'} onChange={(v) => list.setFilter('pattern', v)}
          options={[{ value: 'ALL', label: 'Exact and pattern' }, { value: 'false', label: 'Exact only' }, { value: 'true', label: 'Pattern only' }]} />
      </FilterBar>

      <ListCard
        loading={redirects.isLoading}
        empty={redirects.isError || !rows.length}
        emptyIcon={<ArrowRight className="h-6 w-6" />}
        emptyTitle={redirects.isError ? 'Redirects did not load' : 'No redirects'}
        emptyText={redirects.isError ? errorMessage(redirects.error) : 'Redirects send visitors from an old link to a new page.'}
        page={list.page} limit={list.limit} total={redirects.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="50rem">
          <THead><Tr><Th>Old path</Th><Th>New path</Th><Th>Code</Th><Th>Source</Th><Th align="right">Hits</Th></Tr></THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.id} interactive onClick={() => setEditing(r)}>
                <Td>
                  <div className="space-y-1">
                    <code className="text-[0.75rem] text-slate-900">{r.fromPath}</code>
                    <div className="flex flex-wrap gap-1">
                      {r.isPattern && <Chip tone="blue">pattern</Chip>}
                      {!r.isActive && <Chip>off</Chip>}
                      {r.warnings.map((w) => <Chip key={w} tone={w === 'loop' || w === 'target_404' ? 'rose' : 'amber'}>{WARNING_TEXT[w]}</Chip>)}
                    </div>
                  </div>
                </Td>
                <Td>{r.statusCode === 410 ? <span className="text-[0.75rem] text-slate-500">— (410 Gone)</span> : <code className="text-[0.75rem]">{r.toPath ?? (r.entryId ? `entry:${r.entryId}` : '—')}</code>}</Td>
                <Td><Chip tone={r.statusCode === 410 ? 'rose' : r.statusCode === 302 ? 'amber' : 'emerald'}>{r.statusCode}</Chip></Td>
                <Td className="text-[0.8125rem]">{SOURCE_TEXT[r.source]}</Td>
                <Td align="right"><span className="tabular-nums">{r.hits.toLocaleString()}</span>{r.lastHitAt && <span className="block text-[0.75rem] text-slate-400">{formatPkt(r.lastHitAt)}</span>}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {editing && (
        <RedirectForm
          redirect={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['cms-redirects'] }); setEditing(null); }}
        />
      )}
      <RedirectImportDialog open={importing} onClose={() => setImporting(false)} onDone={() => qc.invalidateQueries({ queryKey: ['cms-redirects'] })} />

      {guide.isOpen && (
        <PageGuide
          title="Redirects"
          description="Send visitors from old links to new pages, or tell search engines a page is gone for good."
          flowTitle="When a link changes"
          flow={[
            { label: 'Old link', hint: 'Still shared or indexed', icon: Link2Off, color: '#e11d48' },
            { label: 'Redirect rule', hint: '301 or 410', icon: ArrowRight, color: '#4f46e5' },
            { label: 'New page', hint: 'Visitor lands here', icon: Globe, color: '#059669' },
          ]}
          steps={[
            { icon: ArrowRight, color: '#4f46e5', title: '301 and 302', text: '301 is permanent and passes SEO value. 302 is temporary. 410 says the page is gone.' },
            { icon: FlaskConical, color: '#0284c7', title: 'Test a URL', text: 'Type any path in the test box to see which rule matches and where it ends.' },
            { icon: Upload, color: '#d97706', title: 'Import', text: 'Import a CSV with from, to, status and note. A dry run checks it before anything is saved.' },
            { icon: Download, color: '#059669', title: 'Export', text: 'Export CSV downloads every redirect that matches the filters.' },
          ]}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

function RedirectTester() {
  const [path, setPath] = useState('');
  const test = useMutation({ mutationFn: (p: string) => redirectsApi.test(p), onError: (e) => toast.error(errorMessage(e)) });
  const r: RedirectTestResult | undefined = test.data;
  return (
    <Card title={<span className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-brand-600" /> Test a URL</span>}>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); path.trim() && test.mutate(path.trim()); }}>
        <input className={inputCls + ' flex-1'} value={path} placeholder="/lahore/pharmacy" onChange={(e) => setPath(e.target.value)} />
        <button className={btn.secondary} disabled={test.isPending}>Test</button>
      </form>
      {r && (
        <div className="mt-3 space-y-1 text-sm">
          {r.matched ? (
            <p>
              Rule: <code className="text-xs">{r.matched.fromPath}</code> ({r.matched.statusCode})
            </p>
          ) : (
            <p className="text-slate-600">No redirect rule matches.</p>
          )}
          {r.hops.length > 0 && (
            <p className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
              {r.hops.map((h, i) => (
                <span key={`${h}-${i}`} className="flex items-center gap-1">{i > 0 && <ArrowRight className="h-3 w-3" />}<code>{h}</code></span>
              ))}
            </p>
          )}
          {r.finalPath && <p>Final path: <code className="text-xs">{r.finalPath}</code></p>}
          {r.servesEntry ? <p className="text-brand-700">The page opens: {r.servesEntry.title}</p> : r.matched?.statusCode !== 410 && <p className="text-amber-700">There is no live page at this path.</p>}
        </div>
      )}
    </Card>
  );
}

interface FormState {
  fromPath: string;
  toPath: string;
  entryId: string | null;
  statusCode: RedirectStatus;
  isPattern: boolean;
  isActive: boolean;
  note: string;
}

function RedirectForm({ redirect, onClose, onSaved }: { redirect: AdminRedirect | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>({ fromPath: '', toPath: '', entryId: null, statusCode: 301, isPattern: false, isActive: true, note: '' });
  const [target, setTarget] = useState<'path' | 'entry'>('path');
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!redirect) return;
    setForm({
      fromPath: redirect.fromPath,
      toPath: redirect.toPath ?? '',
      entryId: redirect.entryId,
      statusCode: redirect.statusCode,
      isPattern: redirect.isPattern,
      isActive: redirect.isActive,
      note: redirect.note ?? '',
    });
    setTarget(redirect.entryId && !redirect.toPath ? 'entry' : 'path');
  }, [redirect?.id]);

  const save = useMutation({
    mutationFn: async () => {
      const base = {
        fromPath: form.fromPath,
        toPath: form.statusCode === 410 || target === 'entry' ? null : form.toPath.trim() || null,
        entryId: form.statusCode === 410 || target === 'path' ? null : form.entryId,
        statusCode: form.statusCode,
        isPattern: form.isPattern,
        note: form.note.trim() || null,
      };
      if (redirect) {
        const parsed = patchRedirectBodySchema.safeParse({ ...base, isActive: form.isActive });
        if (!parsed.success) throw { fieldErrors: zodFieldErrors(parsed.error) };
        return redirectsApi.update(redirect.id, parsed.data);
      }
      const parsed = createRedirectBodySchema.safeParse(base);
      if (!parsed.success) throw { fieldErrors: zodFieldErrors(parsed.error) };
      return redirectsApi.create(parsed.data);
    },
    onSuccess: () => { toast.success('Redirect saved'); onSaved(); },
    onError: (e: unknown) => {
      const fe = (e as { fieldErrors?: FieldErrors }).fieldErrors;
      if (fe) return setErrors(fe);
      setErrors({});
      toast.error(errorMessage(e));
    },
  });
  const remove = useMutation({
    mutationFn: () => redirectsApi.remove(redirect!.id),
    onSuccess: () => { toast.success('Redirect deleted'); onSaved(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const apiIssues = save.error ? errorIssues(save.error) : [];

  return (
    <Modal
      open
      onClose={onClose}
      title={redirect ? 'Edit redirect' : 'New redirect'}
      footer={
        <>
          {redirect && <button className={btn.danger} disabled={remove.isPending} onClick={async () => (await confirmDialog({ title: 'Delete this redirect?', yes: 'Delete', danger: true })) && remove.mutate()}>Delete</button>}
          <button className={btn.ghost} onClick={onClose}>Cancel</button>
          <button className={btn.primary} disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save'}</button>
        </>
      }
    >
      {redirect && redirect.warnings.length > 0 && (
        <div className="flex flex-wrap gap-1">{redirect.warnings.map((w) => <Chip key={w} tone="amber">{WARNING_TEXT[w]}</Chip>)}</div>
      )}
      <Field label="Old path" required error={errors.fromPath} hint={form.isPattern ? ':name matches one segment, * only at the end. Example: /lahore/:industry' : 'Example: /blog/old-post'}>
        <input className={inputCls} value={form.fromPath} onChange={(e) => setForm({ ...form, fromPath: e.target.value })} />
      </Field>
      <div className="flex flex-wrap gap-4">
        <Toggle checked={form.isPattern} onChange={(v) => setForm({ ...form, isPattern: v })} label="This is a pattern" />
        {redirect && <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Active" />}
      </div>
      <Field label="Code">
        <select className={selectCls + ' w-full'} value={form.statusCode} onChange={(e) => setForm({ ...form, statusCode: Number(e.target.value) as RedirectStatus })}>
          <option value={301}>301 · Moved permanently</option>
          <option value={302}>302 · Temporary</option>
          <option value={410}>410 · Gone (no target)</option>
        </select>
      </Field>
      {form.statusCode !== 410 && (
        <>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5"><input type="radio" checked={target === 'path'} onChange={() => setTarget('path')} /> Path or URL</label>
            <label className="flex items-center gap-1.5"><input type="radio" checked={target === 'entry'} onChange={() => setTarget('entry')} /> CMS page</label>
          </div>
          {target === 'path' ? (
            <Field label="New path" required error={errors.toPath} hint={form.isPattern ? 'Pattern :names can be used here too' : 'Example: /pos-software/lahore'}>
              <input className={inputCls} value={form.toPath} onChange={(e) => setForm({ ...form, toPath: e.target.value })} />
            </Field>
          ) : (
            <Field label="CMS page" required error={errors.toPath ?? errors.entryId} hint="If the page path changes later, the redirect follows it">
              <EntryRefSelect value={form.entryId} onChange={(id) => setForm({ ...form, entryId: id })} />
            </Field>
          )}
        </>
      )}
      <Field label="Note" error={errors.note}>
        <input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      </Field>
      <IssueList issues={apiIssues} />
    </Modal>
  );
}

function RedirectImportDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState<{ from: string; to?: string; status: RedirectStatus; note?: string }[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [result, setResult] = useState<{ dryRun: boolean; data: RedirectImportResult } | null>(null);

  const reset = () => { setRows([]); setParseErrors([]); setResult(null); };
  const close = () => { reset(); onClose(); };

  const onFile = async (file: File) => {
    reset();
    const table = parseCsv(await file.text());
    const header = table[0]?.map((h) => h.trim().toLowerCase()) ?? [];
    const hasHeader = header.includes('from');
    const idx = (name: string, fallback: number) => (hasHeader ? header.indexOf(name) : fallback);
    const [fi, ti, si, ni] = [idx('from', 0), idx('to', 1), idx('status', 2), idx('note', 3)];
    const out: typeof rows = [];
    const errs: string[] = [];
    table.slice(hasHeader ? 1 : 0).forEach((cells, i) => {
      const raw = {
        from: cells[fi]?.trim() ?? '',
        to: ti >= 0 && cells[ti]?.trim() ? cells[ti]!.trim() : undefined,
        status: si >= 0 && cells[si]?.trim() ? cells[si]!.trim() : undefined,
        note: ni >= 0 && cells[ni]?.trim() ? cells[ni]!.trim() : undefined,
      };
      const parsed = redirectImportRowSchema.safeParse(raw);
      if (parsed.success) out.push(parsed.data);
      else errs.push(`Line ${i + (hasHeader ? 2 : 1)}: ${parsed.error.issues[0]?.message ?? 'invalid'}`);
    });
    setRows(out);
    setParseErrors(errs);
  };

  const run = useMutation({
    mutationFn: (dryRun: boolean) => redirectsApi.import({ rows, dryRun }),
    onSuccess: (data, dryRun) => {
      setResult({ dryRun, data });
      if (!dryRun) { toast.success(`${data.created} new, ${data.updated} updated`); onDone(); }
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Modal
      open={open}
      onClose={close}
      title="Redirects import (CSV)"
      footer={
        <>
          <button className={btn.ghost} onClick={close}>Close</button>
          <button className={btn.secondary} disabled={!rows.length || run.isPending} onClick={() => run.mutate(true)}>Check first (dry run)</button>
          <button className={btn.primary} disabled={!rows.length || run.isPending || !result?.dryRun} title={!result?.dryRun ? 'Run a dry run first' : undefined} onClick={() => run.mutate(false)}>
            Import
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        Columns: <code className="text-xs">from,to,status,note</code>. An empty status means 301. For 410, leave "to" empty.
      </p>
      <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {rows.length > 0 && <p className="text-sm text-slate-700">{rows.length} rows ready.</p>}
      {parseErrors.length > 0 && (
        <ul className="max-h-32 overflow-y-auto rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{parseErrors.map((e) => <li key={e}>{e}</li>)}</ul>
      )}
      {result && (
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-medium">{result.dryRun ? 'Dry run result (nothing saved yet):' : 'Imported:'}</p>
          <p>New: {result.data.created} · Updated: {result.data.updated} · Skipped: {result.data.skipped} · Errors: {result.data.errors.length}</p>
          {result.data.errors.length > 0 && (
            <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-rose-700">{result.data.errors.map((e) => <li key={`${e.row}-${e.message}`}>Row {e.row}: {e.message}</li>)}</ul>
          )}
        </div>
      )}
    </Modal>
  );
}
