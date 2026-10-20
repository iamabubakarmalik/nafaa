/**
 * Website → FAQs (ARCH 13 screen 5): list by topic with status and "Used on",
 * an editor with the 40-80 word answer counter, publish/unpublish and history.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { HelpCircle, Plus } from 'lucide-react';
import { CMS_STATUSES, countWords, createFaqBodySchema, type AdminFaq, type CmsStatus, type CreateFaqBody } from '../contract/cms-contract';
import { PageHeader } from '../../_shared/components/PageHeader';
import { EmptyState } from '../../_shared/components/EmptyState';
import { errorMessage, formatPkt, zodFieldErrors, type FieldErrors } from '../dashboard/shared/cms-http';
import { CmsStatusBadge, Chip, Drawer, Field, HistoryList, Pager, SearchInput, Spinner, Tabs, Toolbar, btn, inputCls, selectCls, useDebounced } from '../dashboard/shared/ui';
import { faqsApi } from './faqs.api';

const ANSWER_MIN = 40;
const ANSWER_MAX = 80;

function revalidationToast(ok: boolean, okText: string, error?: string) {
  if (ok) toast.success(okText);
  else toast.warning(`${okText}, lekin site update nahi hui${error ? `: ${error}` : ''}`);
}

export function FaqsPage() {
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState<CmsStatus | ''>('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminFaq | 'new' | null>(null);
  const dq = useDebounced(q);

  const topics = useQuery({ queryKey: ['cms-faq-topics'], queryFn: faqsApi.topics });
  const list = useQuery({
    queryKey: ['cms-faqs', { dq, topic, status, page }],
    queryFn: () => faqsApi.list({ q: dq, topic, status, page, limit: 30 }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="FAQs"
        subtitle="Ek sawal, kai pages. Yahan badlein to har page aur uska FAQ schema update ho jata hai."
        actions={
          <button className={btn.primary} onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> Naya FAQ
          </button>
        }
      />
      <Toolbar>
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Sawal ya jawab me dhoondein…" />
        <select className={selectCls} value={topic} onChange={(e) => { setTopic(e.target.value); setPage(1); }}>
          <option value="">Sab topics</option>
          {topics.data?.map((t) => <option key={t.key} value={t.key}>{t.label} ({t.count})</option>)}
        </select>
        <select className={selectCls} value={status} onChange={(e) => { setStatus(e.target.value as CmsStatus | ''); setPage(1); }}>
          <option value="">Sab status</option>
          {CMS_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Toolbar>

      {list.isLoading ? (
        <Spinner />
      ) : list.isError ? (
        <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{errorMessage(list.error)}</p>
      ) : !list.data?.items.length ? (
        <EmptyState icon={HelpCircle} title="Koi FAQ nahi" message="Naya FAQ banayein; publish ke baad pages par lagaya ja sakta hai." />
      ) : (
        <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {list.data.items.map((f) => {
            const words = countWords(f.answer);
            return (
              <button key={f.id} className="flex w-full flex-wrap items-start gap-3 px-4 py-3 text-left hover:bg-neutral-50" onClick={() => setEditing(f)}>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-neutral-900">{f.question}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">{f.answer}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {f.topic && <Chip tone="blue">{f.topic}</Chip>}
                  <Chip tone={words < ANSWER_MIN || words > ANSWER_MAX ? 'amber' : 'neutral'}>{words} words</Chip>
                  <Chip>{f.usedOn.length} pages</Chip>
                  <CmsStatusBadge status={f.status} changed={f.hasUnpublishedChanges} />
                </div>
              </button>
            );
          })}
        </div>
      )}
      <Pager meta={list.data?.meta} onPage={setPage} />

      {editing && <FaqEditor faq={editing === 'new' ? null : editing} topics={topics.data?.map((t) => t.key) ?? []} onClose={() => setEditing(null)} onSaved={setEditing} />}
    </div>
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
    onSuccess: (f) => { toast.success('FAQ save ho gaya'); done(f); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const publish = useMutation({
    mutationFn: () => faqsApi.publish(faq!.id),
    onSuccess: (r) => { revalidationToast(r.revalidation.ok, 'FAQ publish ho gaya', r.revalidation.error); done(r.faq); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const unpublish = useMutation({
    mutationFn: () => faqsApi.unpublish(faq!.id),
    onSuccess: (r) => { revalidationToast(r.revalidation.ok, 'FAQ unpublish ho gaya', r.revalidation.error); done(r.faq); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => faqsApi.remove(faq!.id),
    onSuccess: () => { toast.success('FAQ delete ho gaya'); qc.invalidateQueries({ queryKey: ['cms-faqs'] }); onClose(); },
    onError: (e) => toast.error(errorMessage(e, 'Ye FAQ kisi live page par laga hai, pehle wahan se hatayein')),
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
      title={faq ? 'FAQ edit' : 'Naya FAQ'}
      footer={
        <>
          {faq && faq.status !== 'PUBLISHED' && (
            <button className={btn.danger} disabled={busy} onClick={() => confirm('Ye FAQ delete karein?') && remove.mutate()}>Delete</button>
          )}
          {faq?.status === 'PUBLISHED' && (
            <button className={btn.secondary} disabled={busy} onClick={() => unpublish.mutate()}>Unpublish</button>
          )}
          <button className={btn.secondary} disabled={busy} onClick={onSave}>Draft save</button>
          {faq && (
            <button className={btn.primary} disabled={busy || dirty} title={dirty ? 'Pehle save karein' : undefined} onClick={() => publish.mutate()}>
              Publish
            </button>
          )}
        </>
      }
    >
      {faq && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
          <CmsStatusBadge status={faq.status} changed={faq.hasUnpublishedChanges} />
          {faq.publishedAt && <span>Publish: {formatPkt(faq.publishedAt)}</span>}
        </div>
      )}
      {faq && <Tabs tabs={[{ key: 'edit', label: 'Edit' }, { key: 'history', label: 'History' }] as const} value={tab} onChange={setTab} />}

      {tab === 'history' && faq ? (
        <HistoryList subject="FAQ" subjectKey={faq.id} />
      ) : (
        <>
          <Field label="Sawal" required error={errors.question}>
            <input className={inputCls} value={form.question} maxLength={300} onChange={(e) => setForm({ ...form, question: e.target.value })} />
          </Field>
          <Field
            label="Jawab"
            required
            error={errors.answer}
            hint={
              <span className={words && (words < ANSWER_MIN || words > ANSWER_MAX) ? 'text-amber-700' : ''}>
                {words} words · {ANSWER_MIN}-{ANSWER_MAX} behtar hai. Pehli line me seedha jawab dein, phir tafseel. Markdown chalta hai.
              </span>
            }
          >
            <textarea className={inputCls} rows={8} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
          </Field>
          <Field label="Topic" error={errors.topic} hint="Chhote huroof, misal: pricing, fbr, khata">
            <input className={inputCls} list="cms-faq-topics" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value.toLowerCase() })} />
            <datalist id="cms-faq-topics">{topics.map((t) => <option key={t} value={t} />)}</datalist>
          </Field>
          <Field label="Source note" error={errors.sourceNote} hint="Ye baat kahan se confirm hui (sirf admin ke liye)">
            <input className={inputCls} value={form.sourceNote} onChange={(e) => setForm({ ...form, sourceNote: e.target.value })} />
          </Field>
          {faq?.status === 'PUBLISHED' && faq.hasUnpublishedChanges && (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Site par purana jawab hai. Publish karein to naya jawab har page par lag jaye ga.</p>
          )}
          {faq && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-neutral-900">Kin pages par hai ({faq.usedOn.length})</h3>
              {faq.usedOn.length ? (
                <ul className="space-y-1 text-sm">
                  {faq.usedOn.map((p) => (
                    <li key={p.id}>
                      <span className="font-medium">{p.title}</span> <span className="text-neutral-500">{p.path}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500">Abhi kisi page par nahi.</p>
              )}
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}
