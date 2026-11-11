/**
 * Website FAQs: list by topic with status and "Used on", an editor with the
 * 40-80 word answer counter, publish / unpublish and history. Search, filters
 * and paging run on the server.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, FileText, Gauge, Globe, HelpCircle, Lightbulb, PenLine, Plus, Rocket, Tag } from 'lucide-react';
import { FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, confirmDialog, heroButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { ListCard, downloadCsv, fetchAllPages, statusLabel, useListParams } from '@/ui';
import { CMS_STATUSES, countWords, createFaqBodySchema, type AdminFaq, type CmsStatus, type CreateFaqBody } from '../contract/cms-contract';
import { errorMessage, formatPkt, zodFieldErrors, type FieldErrors } from '../dashboard/shared/cms-http';
import { CmsStatusBadge, Chip, Drawer, Field, HistoryList, Tabs, btn, inputCls } from '../dashboard/shared/ui';
import { faqsApi } from './faqs.api';

const ANSWER_MIN = 40;
const ANSWER_MAX = 80;

function revalidationToast(ok: boolean, okText: string, error?: string) {
  if (ok) toast.success(okText);
  else toast.warning(`${okText}, but the site was not updated${error ? `: ${error}` : ''}`);
}

export function FaqsPage() {
  const guide = usePageGuide();
  const list = useListParams({ topic: 'ALL', status: 'ALL' });
  const { topic, status } = list.filters;
  const [editing, setEditing] = useState<AdminFaq | 'new' | null>(null);
  const [exporting, setExporting] = useState(false);
  const query = { q: list.debouncedSearch, topic: topic === 'ALL' ? '' : topic, status: (status === 'ALL' ? '' : status) as CmsStatus | '' };

  const topics = useQuery({ queryKey: ['cms-faq-topics'], queryFn: faqsApi.topics });
  const faqs = useQuery({
    queryKey: ['cms-faqs', query, list.page, list.limit],
    queryFn: () => faqsApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const rows = faqs.data?.items ?? [];
  const total = (topics.data ?? []).reduce((n, t) => n + t.count, 0);
  const chips = [
    topic !== 'ALL' && <FilterChip key="t" onRemove={() => list.setFilter('topic', 'ALL')}>{topic}</FilterChip>,
    status !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{statusLabel(status)}</FilterChip>,
  ].filter(Boolean);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages((page) => faqsApi.list({ ...query, page, limit: 100 }));
      downloadCsv<AdminFaq>('website-faqs', all, [
        { label: 'Question', value: (f) => f.question },
        { label: 'Answer', value: (f) => f.answer },
        { label: 'Topic', value: (f) => f.topic },
        { label: 'Status', value: (f) => f.status },
        { label: 'Words', value: (f) => countWords(f.answer) },
        { label: 'Used on pages', value: (f) => f.usedOn.length },
      ]);
      toast.success(`${all.length} FAQs exported`);
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageShell>
      <PageHero
        title="FAQs"
        chip={faqs.data ? `${faqs.data.meta.total} shown` : undefined}
        busy={faqs.isFetching}
        loading={topics.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} disabled={exporting} onClick={exportCsv}><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <button type="button" className={heroPrimaryButton} onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> New FAQ</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={topics.data ? [
          { label: 'FAQs', value: total },
          { label: 'Topics', value: topics.data.length },
          { label: 'Shown', value: faqs.data?.meta.total ?? 0, hint: 'With the filters applied' },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search questions and answers" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="Topic" value={topic} active={topic !== 'ALL'} onChange={(v) => list.setFilter('topic', v)}
          options={[{ value: 'ALL', label: 'All topics' }, ...(topics.data ?? []).map((t) => ({ value: t.key, label: `${t.label} (${t.count})` }))]} />
        <FilterMenu icon={Gauge} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)}
          options={[{ value: 'ALL', label: 'All statuses' }, ...CMS_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))]} />
      </FilterBar>

      <ListCard
        loading={faqs.isLoading}
        empty={faqs.isError || !rows.length}
        emptyIcon={<HelpCircle className="h-6 w-6" />}
        emptyTitle={faqs.isError ? 'FAQs did not load' : 'No FAQs'}
        emptyText={faqs.isError ? errorMessage(faqs.error) : 'Create a FAQ. After publishing it can be used on pages.'}
        page={list.page} limit={list.limit} total={faqs.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="48rem">
          <THead><Tr><Th>Question</Th><Th>Topic</Th><Th align="right">Words</Th><Th align="right">Used on</Th><Th>Status</Th></Tr></THead>
          <TBody>
            {rows.map((f) => {
              const words = countWords(f.answer);
              return (
                <Tr key={f.id} interactive onClick={() => setEditing(f)}>
                  <Td className="max-w-md">
                    <div className="truncate font-semibold text-slate-900">{f.question}</div>
                    <div className="truncate text-[0.75rem] text-slate-500">{f.answer}</div>
                  </Td>
                  <Td>{f.topic ? <Chip tone="blue">{f.topic}</Chip> : <span className="text-slate-400">—</span>}</Td>
                  <Td align="right"><Chip tone={words < ANSWER_MIN || words > ANSWER_MAX ? 'amber' : 'neutral'}>{words}</Chip></Td>
                  <Td align="right" className="tabular-nums">{f.usedOn.length} pages</Td>
                  <Td><CmsStatusBadge status={f.status} changed={f.hasUnpublishedChanges} /></Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      </ListCard>

      {editing && <FaqEditor faq={editing === 'new' ? null : editing} topics={topics.data?.map((t) => t.key) ?? []} onClose={() => setEditing(null)} onSaved={setEditing} />}

      {guide.isOpen && (
        <PageGuide
          title="FAQs"
          description="One question, used on many pages. Change it here and every page and its FAQ schema update."
          flowTitle="From question to page"
          flow={[
            { label: 'Write FAQ', hint: 'Question and answer', icon: PenLine, color: '#4f46e5' },
            { label: 'Publish', hint: '40 to 80 words', icon: Rocket, color: '#0284c7' },
            { label: 'Add to pages', hint: 'In the page editor', icon: FileText, color: '#d97706' },
            { label: 'Live everywhere', hint: 'One change updates all', icon: Globe, color: '#059669' },
          ]}
          steps={[
            { icon: PenLine, color: '#4f46e5', title: 'Answer first', text: 'Give the direct answer in the first line, then the detail. Aim for 40 to 80 words.' },
            { icon: Rocket, color: '#0284c7', title: 'Draft or publish', text: 'Save as a draft while you work. Publish when it is ready; the site updates by itself.' },
            { icon: FileText, color: '#d97706', title: 'Used on', text: 'The list shows how many pages use each FAQ. A FAQ used on a live page cannot be deleted.' },
          ]}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

function FaqEditor({ faq, topics, onClose, onSaved }: { faq: AdminFaq | null; topics: string[]; onClose: () => void; onSaved: (f: AdminFaq) => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'edit' | 'history'>('edit');
  const [form, setForm] = useState({ question: '', answer: '', topic: '', sourceNote: '' });
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    setForm({ question: faq?.question ?? '', answer: faq?.answer ?? '', topic: faq?.topic ?? '', sourceNote: faq?.sourceNote ?? '' });
    setErrors({});
  }, [faq?.id, faq?.updatedAt]);

  const done = (f: AdminFaq) => {
    qc.invalidateQueries({ queryKey: ['cms-faqs'] });
    qc.invalidateQueries({ queryKey: ['cms-faq-topics'] });
    qc.invalidateQueries({ queryKey: ['cms-history', 'FAQ', f.id] });
    onSaved(f);
  };

  const save = useMutation({
    mutationFn: (body: CreateFaqBody) => (faq ? faqsApi.update(faq.id, body) : faqsApi.create(body)),
    onSuccess: (f) => { toast.success('FAQ saved'); done(f); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const publish = useMutation({
    mutationFn: () => faqsApi.publish(faq!.id),
    onSuccess: (r) => { revalidationToast(r.revalidation.ok, 'FAQ published', r.revalidation.error); done(r.faq); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const unpublish = useMutation({
    mutationFn: () => faqsApi.unpublish(faq!.id),
    onSuccess: (r) => { revalidationToast(r.revalidation.ok, 'FAQ unpublished', r.revalidation.error); done(r.faq); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => faqsApi.remove(faq!.id),
    onSuccess: () => { toast.success('FAQ deleted'); qc.invalidateQueries({ queryKey: ['cms-faqs'] }); onClose(); },
    onError: (e) => toast.error(errorMessage(e, 'This FAQ is used on a live page. Remove it from that page first.')),
  });

  const onSave = () => {
    const parsed = createFaqBodySchema.safeParse({
      question: form.question,
      answer: form.answer,
      topic: form.topic.trim() || null,
      sourceNote: form.sourceNote.trim() || null,
    });
    if (!parsed.success) return setErrors(zodFieldErrors(parsed.error));
    setErrors({});
    save.mutate(parsed.data);
  };

  const words = countWords(form.answer);
  const dirty = !!faq && (form.question !== faq.question || form.answer !== faq.answer || (form.topic || null) !== faq.topic || (form.sourceNote || null) !== faq.sourceNote);
  const busy = save.isPending || publish.isPending || unpublish.isPending || remove.isPending;

  return (
    <Drawer
      open
      onClose={onClose}
      title={faq ? 'Edit FAQ' : 'New FAQ'}
      footer={
        <>
          {faq && faq.status !== 'PUBLISHED' && (
            <button className={btn.danger} disabled={busy} onClick={async () => (await confirmDialog({ title: 'Delete this FAQ?', yes: 'Delete', danger: true })) && remove.mutate()}>Delete</button>
          )}
          {faq?.status === 'PUBLISHED' && (
            <button className={btn.secondary} disabled={busy} onClick={() => unpublish.mutate()}>Unpublish</button>
          )}
          <button className={btn.secondary} disabled={busy} onClick={onSave}>Save draft</button>
          {faq && (
            <button className={btn.primary} disabled={busy || dirty} title={dirty ? 'Save first' : undefined} onClick={() => publish.mutate()}>
              Publish
            </button>
          )}
        </>
      }
    >
      {faq && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <CmsStatusBadge status={faq.status} changed={faq.hasUnpublishedChanges} />
          {faq.publishedAt && <span>Published: {formatPkt(faq.publishedAt)}</span>}
        </div>
      )}
      {faq && <Tabs tabs={[{ key: 'edit', label: 'Edit' }, { key: 'history', label: 'History' }] as const} value={tab} onChange={setTab} />}

      {tab === 'history' && faq ? (
        <HistoryList subject="FAQ" subjectKey={faq.id} />
      ) : (
        <>
          <Field label="Question" required error={errors.question}>
            <input className={inputCls} value={form.question} maxLength={300} onChange={(e) => setForm({ ...form, question: e.target.value })} />
          </Field>
          <Field
            label="Answer"
            required
            error={errors.answer}
            hint={
              <span className={words && (words < ANSWER_MIN || words > ANSWER_MAX) ? 'text-amber-700' : ''}>
                {words} words · {ANSWER_MIN}-{ANSWER_MAX} is best. Give the direct answer in the first line, then the detail. Markdown works.
              </span>
            }
          >
            <textarea className={inputCls} rows={8} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
          </Field>
          <Field label="Topic" error={errors.topic} hint="Lowercase, for example: pricing, fbr, khata">
            <input className={inputCls} list="cms-faq-topics" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value.toLowerCase() })} />
            <datalist id="cms-faq-topics">{topics.map((t) => <option key={t} value={t} />)}</datalist>
          </Field>
          <Field label="Source note" error={errors.sourceNote} hint="Where this was confirmed (for admins only)">
            <input className={inputCls} value={form.sourceNote} onChange={(e) => setForm({ ...form, sourceNote: e.target.value })} />
          </Field>
          {faq?.status === 'PUBLISHED' && faq.hasUnpublishedChanges && (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">The site still shows the old answer. Publish to show the new answer on every page.</p>
          )}
          {faq && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Used on pages ({faq.usedOn.length})</h3>
              {faq.usedOn.length ? (
                <ul className="space-y-1 text-sm">
                  {faq.usedOn.map((p) => (
                    <li key={p.id}>
                      <span className="font-medium">{p.title}</span> <span className="text-slate-500">{p.path}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Not used on any page yet.</p>
              )}
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}
