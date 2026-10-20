/**
 * Website → Redirects (ARCH 13 screen 8): search and filters, add/edit,
 * CSV import (dry run first) and export, "Test a URL", hits and warnings.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Download, FlaskConical, Plus, Upload } from 'lucide-react';
import {
  CMS_REDIRECT_SOURCES, createRedirectBodySchema, patchRedirectBodySchema, redirectImportRowSchema,
  type AdminRedirect, type CmsRedirectSource, type RedirectImportResult, type RedirectStatus, type RedirectTestResult, type RedirectWarning,
} from '../contract/cms-contract';
import { PageHeader } from '../../_shared/components/PageHeader';
import { DataTable } from '../../_shared/components/DataTable';
import { errorIssues, errorMessage, formatPkt, zodFieldErrors, type FieldErrors } from '../dashboard/shared/cms-http';
import { Card, Chip, EntryRefSelect, Field, IssueList, Modal, Pager, SearchInput, Toggle, Toolbar, btn, inputCls, selectCls, useDebounced } from '../dashboard/shared/ui';
import { parseCsv, redirectsApi, type RedirectListParams } from './redirects.api';

const WARNING_TEXT: Record<RedirectWarning, string> = {
  chain: 'Chain (redirect se redirect)',
  loop: 'Loop',
  target_unpublished: 'Target page live nahi',
  target_404: 'Target 404',
};

const SOURCE_TEXT: Record<CmsRedirectSource, string> = {
  MANUAL: 'Haath se',
  SLUG_CHANGE: 'Slug badla',
  UNPUBLISH: 'Unpublish',
  IMPORT: 'Import',
};

export function RedirectsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [source, setSource] = useState<RedirectListParams['source']>('');
  const [active, setActive] = useState<RedirectListParams['active']>('');
  const [pattern, setPattern] = useState<RedirectListParams['pattern']>('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminRedirect | 'new' | null>(null);
  const [importing, setImporting] = useState(false);
  const dq = useDebounced(q);

  const list = useQuery({
    queryKey: ['cms-redirects', { dq, source, active, pattern, page }],
    queryFn: () => redirectsApi.list({ q: dq, source, active, pattern, page, limit: 50 }),
  });

  const exportCsv = async () => {
    try {
      const csv = await redirectsApi.exportCsv();
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `redirects-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Redirects"
        subtitle="Purane links ko naye pages par bhejein (301), ya hamesha ke liye band (410)."
        actions={
          <>
            <button className={btn.secondary} onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</button>
            <button className={btn.secondary} onClick={() => setImporting(true)}><Upload className="h-4 w-4" /> Import CSV</button>
            <button className={btn.primary} onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Naya redirect</button>
          </>
        }
      />

      <RedirectTester />

      <Toolbar>
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Path dhoondein…" />
        <select className={selectCls} value={source} onChange={(e) => { setSource(e.target.value as CmsRedirectSource | ''); setPage(1); }}>
          <option value="">Sab sources</option>
          {CMS_REDIRECT_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_TEXT[s]}</option>)}
        </select>
        <select className={selectCls} value={active} onChange={(e) => { setActive(e.target.value as RedirectListParams['active']); setPage(1); }}>
          <option value="">Active + band</option>
          <option value="true">Sirf active</option>
          <option value="false">Sirf band</option>
        </select>
        <select className={selectCls} value={pattern} onChange={(e) => { setPattern(e.target.value as RedirectListParams['pattern']); setPage(1); }}>
          <option value="">Exact + pattern</option>
          <option value="false">Sirf exact</option>
          <option value="true">Sirf pattern</option>
        </select>
      </Toolbar>

      <DataTable<AdminRedirect>
        loading={list.isLoading}
        data={list.data?.items ?? []}
        keyExtractor={(r) => r.id}
        onRowClick={(r) => setEditing(r)}
        empty={<div className="p-8 text-center text-sm text-neutral-500">{list.isError ? errorMessage(list.error) : 'Koi redirect nahi.'}</div>}
        columns={[
          {
            key: 'fromPath',
            header: 'Purana path',
            render: (r) => (
              <div className="space-y-1">
                <code className="text-xs text-neutral-900">{r.fromPath}</code>
                <div className="flex flex-wrap gap-1">
                  {r.isPattern && <Chip tone="blue">pattern</Chip>}
                  {!r.isActive && <Chip>band</Chip>}
                  {r.warnings.map((w) => <Chip key={w} tone={w === 'loop' || w === 'target_404' ? 'rose' : 'amber'}>{WARNING_TEXT[w]}</Chip>)}
                </div>
              </div>
            ),
          },
          {
            key: 'toPath',
            header: 'Naya path',
            render: (r) => (r.statusCode === 410 ? <span className="text-xs text-neutral-500">— (410 Gone)</span> : <code className="text-xs">{r.toPath ?? (r.entryId ? `entry:${r.entryId}` : '—')}</code>),
          },
          { key: 'statusCode', header: 'Code', render: (r) => <Chip tone={r.statusCode === 410 ? 'rose' : r.statusCode === 302 ? 'amber' : 'emerald'}>{r.statusCode}</Chip> },
          { key: 'source', header: 'Source', render: (r) => <span className="text-xs">{SOURCE_TEXT[r.source]}</span> },
          { key: 'hits', header: 'Hits', render: (r) => <span className="text-xs">{r.hits.toLocaleString()}{r.lastHitAt && <span className="block text-neutral-400">{formatPkt(r.lastHitAt)}</span>}</span> },
        ]}
      />
      <Pager meta={list.data?.meta} onPage={setPage} />

      {editing && (
        <RedirectForm
          redirect={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['cms-redirects'] }); setEditing(null); }}
        />
      )}
      <RedirectImportDialog open={importing} onClose={() => setImporting(false)} onDone={() => qc.invalidateQueries({ queryKey: ['cms-redirects'] })} />
    </div>
  );
}

function RedirectTester() {
  const [path, setPath] = useState('');
  const test = useMutation({ mutationFn: (p: string) => redirectsApi.test(p), onError: (e) => toast.error(errorMessage(e)) });
  const r: RedirectTestResult | undefined = test.data;
  return (
    <Card title={<span className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-emerald-600" /> URL test karein</span>}>
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
            <p className="text-neutral-600">Koi redirect rule nahi lagta.</p>
          )}
          {r.hops.length > 0 && (
            <p className="flex flex-wrap items-center gap-1 text-xs text-neutral-600">
              {r.hops.map((h, i) => (
                <span key={`${h}-${i}`} className="flex items-center gap-1">{i > 0 && <ArrowRight className="h-3 w-3" />}<code>{h}</code></span>
              ))}
            </p>
          )}
          {r.finalPath && <p>Aakhri path: <code className="text-xs">{r.finalPath}</code></p>}
          {r.servesEntry ? <p className="text-emerald-700">Page khulta hai: {r.servesEntry.title}</p> : r.matched?.statusCode !== 410 && <p className="text-amber-700">Is path par koi live page nahi.</p>}
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
    onSuccess: () => { toast.success('Redirect save ho gaya'); onSaved(); },
    onError: (e: unknown) => {
      const fe = (e as { fieldErrors?: FieldErrors }).fieldErrors;
      if (fe) return setErrors(fe);
      setErrors({});
      toast.error(errorMessage(e));
    },
  });
  const remove = useMutation({
    mutationFn: () => redirectsApi.remove(redirect!.id),
    onSuccess: () => { toast.success('Redirect delete ho gaya'); onSaved(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const apiIssues = save.error ? errorIssues(save.error) : [];

  return (
    <Modal
      open
      onClose={onClose}
      title={redirect ? 'Redirect edit' : 'Naya redirect'}
      footer={
        <>
          {redirect && <button className={btn.danger} disabled={remove.isPending} onClick={() => confirm('Ye redirect delete karein?') && remove.mutate()}>Delete</button>}
          <button className={btn.ghost} onClick={onClose}>Cancel</button>
          <button className={btn.primary} disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Save ho raha hai…' : 'Save'}</button>
        </>
      }
    >
      {redirect && redirect.warnings.length > 0 && (
        <div className="flex flex-wrap gap-1">{redirect.warnings.map((w) => <Chip key={w} tone="amber">{WARNING_TEXT[w]}</Chip>)}</div>
      )}
      <Field label="Purana path" required error={errors.fromPath} hint={form.isPattern ? ':naam ek hissa pakarta hai, * sirf aakhir me. Misal: /lahore/:industry' : 'Misal: /blog/purana-post'}>
        <input className={inputCls} value={form.fromPath} onChange={(e) => setForm({ ...form, fromPath: e.target.value })} />
      </Field>
      <div className="flex flex-wrap gap-4">
        <Toggle checked={form.isPattern} onChange={(v) => setForm({ ...form, isPattern: v })} label="Pattern hai" />
        {redirect && <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Active" />}
      </div>
      <Field label="Code">
        <select className={selectCls + ' w-full'} value={form.statusCode} onChange={(e) => setForm({ ...form, statusCode: Number(e.target.value) as RedirectStatus })}>
          <option value={301}>301 · Hamesha ke liye muntaqil</option>
          <option value={302}>302 · Aarzi</option>
          <option value={410}>410 · Page khatam (koi target nahi)</option>
        </select>
      </Field>
      {form.statusCode !== 410 && (
        <>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5"><input type="radio" checked={target === 'path'} onChange={() => setTarget('path')} /> Path ya URL</label>
            <label className="flex items-center gap-1.5"><input type="radio" checked={target === 'entry'} onChange={() => setTarget('entry')} /> CMS page</label>
          </div>
          {target === 'path' ? (
            <Field label="Naya path" required error={errors.toPath} hint={form.isPattern ? 'Pattern ke :naam yahan bhi istemal ho sakte hain' : 'Misal: /pos-software/lahore'}>
              <input className={inputCls} value={form.toPath} onChange={(e) => setForm({ ...form, toPath: e.target.value })} />
            </Field>
          ) : (
            <Field label="CMS page" required error={errors.toPath ?? errors.entryId} hint="Page ka path badle to redirect khud sahi jagah jaye ga">
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
      else errs.push(`Line ${i + (hasHeader ? 2 : 1)}: ${parsed.error.issues[0]?.message ?? 'ghalat'}`);
    });
    setRows(out);
    setParseErrors(errs);
  };

  const run = useMutation({
    mutationFn: (dryRun: boolean) => redirectsApi.import({ rows, dryRun }),
    onSuccess: (data, dryRun) => {
      setResult({ dryRun, data });
      if (!dryRun) { toast.success(`${data.created} naye, ${data.updated} update`); onDone(); }
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
          <button className={btn.ghost} onClick={close}>Band karein</button>
          <button className={btn.secondary} disabled={!rows.length || run.isPending} onClick={() => run.mutate(true)}>Pehle check (dry run)</button>
          <button className={btn.primary} disabled={!rows.length || run.isPending || !result?.dryRun} title={!result?.dryRun ? 'Pehle dry run chalayein' : undefined} onClick={() => run.mutate(false)}>
            Import karein
          </button>
        </>
      }
    >
      <p className="text-sm text-neutral-600">
        Columns: <code className="text-xs">from,to,status,note</code>. Status khali ho to 301. 410 ke liye "to" khali chhorein.
      </p>
      <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {rows.length > 0 && <p className="text-sm text-neutral-700">{rows.length} rows tayyar.</p>}
      {parseErrors.length > 0 && (
        <ul className="max-h-32 overflow-y-auto rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{parseErrors.map((e) => <li key={e}>{e}</li>)}</ul>
      )}
      {result && (
        <div className="rounded-lg bg-neutral-50 p-3 text-sm">
          <p className="font-medium">{result.dryRun ? 'Dry run nateeja (abhi kuch save nahi hua):' : 'Import ho gaya:'}</p>
          <p>Naye: {result.data.created} · Update: {result.data.updated} · Chhore: {result.data.skipped} · Ghaltiyan: {result.data.errors.length}</p>
          {result.data.errors.length > 0 && (
            <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-rose-700">{result.data.errors.map((e) => <li key={`${e.row}-${e.message}`}>Row {e.row}: {e.message}</li>)}</ul>
          )}
        </div>
      )}
    </Modal>
  );
}
