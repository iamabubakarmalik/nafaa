/**
 * FAQ tab: attach reusable FAQs (search), reorder, and create one inline.
 * A new FAQ stays a draft until it is published in the FAQ screen or with
 * "FAQs bhi publish karein" in the publish dialog.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, CircleHelp, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { apiErrorMessage, cmsApi } from '@/api/marketing/marketing-cms.api';
import { TEXT_LIMITS, countWords, isMoneyType, type AdminEntry, type AdminFaq, type PageTemplate } from '../../contract/cms-contract';
import { StatusChip } from '../../entries/StatusChip';
import { Btn, IconBtn, Section, TextArea, TextField, inputClass } from '../../fields/ui';
import type { DraftPatch } from '../useEntryDraft';

function useDebounced<T>(v: T, ms = 250) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export function FaqPanel({ entry, update }: { entry: AdminEntry; update: (p: DraftPatch) => void }) {
  const qc = useQueryClient();
  const ids = entry.faqIds ?? [];
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [topic, setTopic] = useState('');

  const all = useQuery({ queryKey: ['cms', 'faqs', 'all', entry.locale], queryFn: () => cmsApi.faqs({ locale: entry.locale, limit: 200 }), retry: false });
  const search = useQuery({ queryKey: ['cms', 'faqs', 'search', entry.locale, dq], queryFn: () => cmsApi.faqs({ locale: entry.locale, q: dq, limit: 20 }), enabled: dq.length > 1 });
  const byId = new Map<string, AdminFaq>((all.data?.items ?? []).map((f) => [f.id, f]));
  const pageTemplate = entry.type === 'PAGE' ? ((entry.data as { template?: PageTemplate }).template ?? 'default') : undefined;
  const money = isMoneyType(entry.type, pageTemplate);
  const { min, max } = TEXT_LIMITS.faqCountMoney;

  const create = useMutation({
    mutationFn: () => cmsApi.createFaq({ locale: entry.locale, question: question.trim(), answer: answer.trim(), topic: topic.trim() || null }),
    onSuccess: (faq) => {
      qc.invalidateQueries({ queryKey: ['cms', 'faqs'] });
      update({ faqIds: [...ids, faq.id] });
      setQuestion('');
      setAnswer('');
      setCreating(false);
      toast.success('FAQ ban gaya (draft) aur jur gaya');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x as string);
    update({ faqIds: next });
  };

  const answerWords = countWords(answer);

  return (
    <div className="space-y-6">
      <Section
        title={`Is page ke FAQs (${ids.length})`}
        description={money ? `Money page: ${min}-${max} FAQs behtar hain. Page par ek FAQ block hona chahiye.` : 'Page par FAQ block ho to yahi sawal dikhte hain'}
      >
        {ids.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-300 py-6 text-center">
            <CircleHelp className="h-6 w-6 text-neutral-300" />
            <p className="text-xs text-neutral-500">Abhi koi FAQ nahi juda</p>
          </div>
        )}
        <ol className="space-y-1.5">
          {ids.map((id, i) => {
            const f = byId.get(id);
            const words = f ? countWords(f.answer) : 0;
            return (
              <li key={id} className="group rounded-xl border border-neutral-200 bg-white p-2.5">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-600">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900">{f?.question ?? 'FAQ'}</p>
                    {f && <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{f.answer}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {f && <StatusChip status={f.status} hasUnpublishedChanges={f.hasUnpublishedChanges} />}
                      {f && (words < TEXT_LIMITS.faqAnswerWords.min || words > TEXT_LIMITS.faqAnswerWords.max) && (
                        <span className="text-[11px] text-amber-700">
                          Jawab {words} alfaaz ({TEXT_LIMITS.faqAnswerWords.min}-{TEXT_LIMITS.faqAnswerWords.max} behtar)
                        </span>
                      )}
                      {f && f.usedOn.length > 1 && <span className="text-[11px] text-neutral-400">{f.usedOn.length} pages par</span>}
                    </div>
                  </div>
                  <div className="flex opacity-60 group-hover:opacity-100">
                    <IconBtn label="Upar" onClick={() => move(i, i - 1)} disabled={i === 0}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn label="Neeche" onClick={() => move(i, i + 1)} disabled={i === ids.length - 1}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn label="Hatayein" danger onClick={() => update({ faqIds: ids.filter((x) => x !== id) })}>
                      <X className="h-3.5 w-3.5" />
                    </IconBtn>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section title="Mojooda FAQ jorein">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sawal ya topic se dhoondein…" className={cn(inputClass, 'pl-9')} />
        </div>
        {dq.length > 1 && (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {(search.data?.items ?? []).filter((f) => !ids.includes(f.id)).map((f) => (
              <li key={f.id}>
                <button type="button" onClick={() => update({ faqIds: [...ids, f.id] })} className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-emerald-50">
                  <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-neutral-800">{f.question}</span>
                    <span className="block text-[11px] text-neutral-500">
                      {f.topic ?? 'bina topic'} · {f.usedOn.length} pages
                    </span>
                  </span>
                  <StatusChip status={f.status} />
                </button>
              </li>
            ))}
            {search.data && search.data.items.length === 0 && <li className="px-2 py-3 text-center text-xs text-neutral-500">Kuch nahi mila</li>}
          </ul>
        )}
      </Section>

      <Section title="Naya FAQ" actions={!creating && <Btn size="sm" onClick={() => setCreating(true)}><Plus className="h-3.5 w-3.5" /> Naya</Btn>}>
        {creating && (
          <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/30 p-3">
            <TextField label="Sawal" required value={question} onChange={setQuestion} chars={{ max: 300 }} placeholder="Kya Nafaa internet ke baghair chalta hai?" />
            <TextArea label="Jawab" required value={answer} onChange={setAnswer} words={TEXT_LIMITS.faqAnswerWords} rows={4} hint="Pehle jumle me seedha jawab, phir tafseel" />
            <TextField label="Topic" mono value={topic} onChange={setTopic} placeholder="offline" />
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" size="sm" onClick={() => setCreating(false)}>
                Cancel
              </Btn>
              <Btn variant="primary" size="sm" disabled={!question.trim() || !answer.trim()} loading={create.isPending} onClick={() => create.mutate()}>
                Banayein aur jorein {answerWords > 0 && `(${answerWords} alfaaz)`}
              </Btn>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
