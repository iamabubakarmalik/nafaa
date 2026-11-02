/**
 * Quotes (estimates): what was offered, sent, accepted or turned down, and
 * which became a job. A quote is sent on WhatsApp or printed; once the
 * customer agrees it becomes a job card with the same lines.
 *
 * Keys: N new quote · / search · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Briefcase, CheckCircle2, Clock, Download, FileText, Filter, GraduationCap, MessageCircle, Pencil, Plus, Printer, Send, XCircle } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, FilterChip, FilterMenu, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { quotesApi, type Quote, type QuoteInput, type QuoteView } from '../api/quotes.api';
import { QuoteModal } from '../components/QuoteModal';
import { printQuote, quoteMessage } from '../components/slips';
import { JOB_KEY, QUOTE_KEY, TONES, apiError, dayOnly, waLink } from '../components/meta';
import { t as tr } from '@core/i18n';

const VIEWS: Array<{ id: QuoteView; label: string }> = [
  { id: 'open', label: tr('Jawab ka intezar') }, { id: 'draft', label: tr('Kacha') }, { id: 'sent', label: tr('Bheja gaya') }, { id: 'accepted', label: tr('Haan — job baqi') },
  { id: 'converted', label: tr('Job ban gayi') }, { id: 'rejected', label: tr('Mana') }, { id: 'expired', label: tr('Purana') }, { id: 'all', label: tr('Sab') },
];
const stateOf = (q: Quote) =>
  q.convertedJobId ? { label: tr('Job ban gayi'), tone: TONES.slate }
    : q.isExpired ? { label: tr('Purana'), tone: TONES.slate }
      : q.status === 'ACCEPTED' ? { label: tr('Haan'), tone: TONES.green }
        : q.status === 'REJECTED' ? { label: tr('Mana'), tone: TONES.rose }
          : q.status === 'DRAFT' ? { label: tr('Kacha'), tone: TONES.slate }
            : { label: q.status === 'REVISED' ? tr('Badal kar bheja') : tr('Bheja gaya'), tone: TONES.blue };

export default function QuotesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales } = useMasked();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const canManage = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  useReceiptSetup();
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<QuoteView>('open');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Quote | null | 'new'>(null);
  const [rejecting, setRejecting] = useState<Quote | null>(null);
  const [reason, setReason] = useState('');
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);

  const listQ = useQuery({ queryKey: [QUOTE_KEY, view, query], queryFn: () => quotesApi.list({ view, search: query || undefined }), placeholderData: (p) => p });
  const allQ = useQuery({ queryKey: [QUOTE_KEY, 'all'], queryFn: () => quotesApi.list({ view: 'all' }), staleTime: 30_000 });
  const rows = listQ.data ?? [];
  const all = allQ.data ?? [];
  const waiting = all.filter((q) => ['SENT', 'REVISED', 'DRAFT'].includes(q.status) && !q.convertedJobId && !q.isExpired);
  const won = all.filter((q) => q.status === 'ACCEPTED');
  const decided = won.length + all.filter((q) => q.status === 'REJECTED').length;

  const refresh = () => qc.invalidateQueries({ queryKey: [QUOTE_KEY] });
  const run = <V,>(fn: (v: V) => Promise<unknown>, ok: string) => ({
    mutationFn: fn, onSuccess: () => { toast.success(ok); refresh(); }, onError: (e: unknown) => toast.error(apiError(e, tr('Nahi hua'))),
  });
  const save = useMutation({
    mutationFn: (v: QuoteInput) => (editing && editing !== 'new' ? quotesApi.update(editing.id, v) : quotesApi.create(v)),
    onSuccess: (q) => { toast.success(tr('{{quoteNumber}} save ho gaya', { quoteNumber: q.quoteNumber })); refresh(); setEditing(null); },
    onError: (e) => toast.error(apiError(e, tr('Save nahi hua'))),
  });
  const send = useMutation(run((q: Quote) => quotesApi.send(q.id), tr('Bheja gaya likh diya')));
  const accept = useMutation(run((q: Quote) => quotesApi.accept(q.id), tr('Customer ne haan kar di')));
  const reject = useMutation({
    mutationFn: () => quotesApi.reject(rejecting!.id, reason.trim() || undefined),
    onSuccess: () => { toast.success(tr('Mana likh diya')); refresh(); setRejecting(null); },
    onError: (e) => toast.error(apiError(e, tr('Nahi hua'))),
  });
  const convert = useMutation({
    mutationFn: (q: Quote) => quotesApi.convert(q.id),
    onSuccess: (job) => { toast.success(tr('Job {{jobNumber}} ban gayi', { jobNumber: job.jobNumber })); refresh(); qc.invalidateQueries({ queryKey: [JOB_KEY] }); navigate(`/services-biz/jobs/${job.id}`); },
    onError: (e) => toast.error(apiError(e, tr('Job nahi bani'))),
  });
  const shareWa = (q: Quote) => {
    const link = waLink(q.customerPhone, quoteMessage(q, shopName));
    if (!link) { toast.error(tr('Customer ka phone nahi')); return; }
    window.open(link, '_blank', 'noreferrer');
    if (['DRAFT', 'REVISED'].includes(q.status)) send.mutate(q);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); setEditing('new'); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage]);

  const exportCsv = () => downloadCsv('quotes.csv', [
    [tr('Quote'), tr('Date'), tr('Customer'), tr('Phone'), tr('Kaam'), tr('Visit'), tr('Kaam'), tr('Parts'), tr('Aur'), tr('Discount'), tr('Kul'), tr('Halat'), tr('Kab tak')],
    ...rows.map((q) => [q.quoteNumber, dayOnly(q.createdAt), q.customerName, q.customerPhone, q.serviceName, q.visitCharge, q.labourCharge, q.partsCharge, q.otherCharges, q.discount, q.totalAmount, stateOf(q).label, q.validUntil ? dayOnly(q.validUntil) : '']),
  ]);
  const editable = (q: Quote) => canManage && !q.convertedJobId && ['DRAFT', 'SENT', 'REVISED'].includes(q.status);

  return (
    <PageShell>
      <PageHero
        title={tr('Quotes')}
        chip={<><FileText /> {' '}{tr('Andaza')}</>}
        meta={tr('Kaam se pehle kharcha batayein — haan ho to ek click me job')}
        loading={allQ.isLoading}
        busy={listQ.isFetching && !listQ.isLoading}
        actions={<>
          <button type="button" onClick={exportCsv} disabled={!rows.length} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">{tr('CSV')}</span></button>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setEditing('new')} title={tr('Naya (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Naya quote')}</button>}
        </>}
        stats={[
          { label: tr('Jawab ka intezar'), value: waiting.length, hint: waiting.length ? sales(waiting.reduce((s, q) => s + q.totalAmount, 0)) : undefined },
          { label: tr('Haan'), value: won.length },
          { label: tr('Kitne % haan'), value: decided ? `${Math.round((won.length / decided) * 100)}%` : '—' },
        ]}
      />

      <KpiRow cols={4}>
        {allQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Send} color="#2563eb" label={tr('Bheja — jawab baqi')} value={all.filter((q) => ['SENT', 'REVISED'].includes(q.status) && !q.isExpired && !q.convertedJobId).length} onClick={() => setView('sent')} active={view === 'sent'} />
          <KpiCard icon={CheckCircle2} color="#16a34a" label={tr('Haan — job baqi')} value={all.filter((q) => q.status === 'ACCEPTED' && !q.convertedJobId).length} onClick={() => setView('accepted')} active={view === 'accepted'} />
          <KpiCard icon={Briefcase} color="#7c3aed" label={tr('Job ban gayi')} value={all.filter((q) => q.convertedJobId).length} onClick={() => setView('converted')} active={view === 'converted'} />
          <KpiCard icon={Clock} color="#64748b" label={tr('Purane')} value={all.filter((q) => q.isExpired).length} hint={tr('Dobara baat karein')} onClick={() => setView('expired')} active={view === 'expired'} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Quote #, customer, phone, kaam…')} label={tr('Search')} />}
        chips={query ? <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip> : undefined}
        onClear={() => setSearch('')}>
        <FilterMenu icon={Filter} label={VIEWS.find((v) => v.id === view)?.label ?? tr('Halat')} value={view} active={view !== 'open'} onChange={setView} options={VIEWS.map((v) => ({ value: v.id, label: v.label }))} />
      </FilterBar>
      <ViewTabs value="list" onChange={() => undefined} hint={<>{canManage && <><Kbd>N</Kbd> {' '}{tr('naya ·')}{' '} </>}<Kbd>/</Kbd> {' '}{tr('search')}</>} tabs={[{ id: 'list', label: tr('Quotes'), icon: FileText, count: rows.length }]} />

      {listQ.isLoading ? <Skeleton className="h-64 rounded-3xl" /> : !rows.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{query ? tr('Kuch nahi mila') : tr('Is list me koi quote nahi')}</p>
          <p className="mt-1 text-sm text-slate-500">{tr('Bara kaam ho (installation, wiring, plumbing) to pehle quote dein — customer ko yaqeen hota hai.')}</p>
          {canManage && <Button className="mt-4" onClick={() => setEditing('new')} leftIcon={<Plus className="h-4 w-4" />}>{tr('Naya quote')}</Button>}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {rows.map((q) => {
            const s = stateOf(q);
            return (
              <li key={q.id} className="flex flex-wrap items-start gap-3 px-3 py-3 sm:px-4">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FileText className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-semibold text-slate-900">{q.serviceName}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', s.tone)}>{s.label}</span>
                    <span className="font-mono text-[0.6875rem] text-slate-400">{q.quoteNumber}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[0.8125rem] text-slate-600">{[q.customerName, q.customerPhone].filter(Boolean).join(' · ')}</p>
                  <p className="mt-0.5 text-[0.75rem] text-slate-500">{dayOnly(q.createdAt)}{q.validUntil ? tr(' · {{validUntil}} tak', { validUntil: dayOnly(q.validUntil) }) : ''}{q.rejectionReason ? ` · ${q.rejectionReason}` : ''}</p>
                </div>
                <div className="shrink-0 text-end">
                  <p className="font-semibold tabular-nums text-slate-900">{sales(q.totalAmount)}</p>
                  <div className="mt-1 flex flex-wrap justify-end gap-1">
                    <button type="button" onClick={() => printQuote(q, shopName)} aria-label={tr('Print')} title={tr('Print')} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Printer className="h-3.5 w-3.5" /></button>
                    {q.customerPhone && <button type="button" onClick={() => shareWa(q)} aria-label={tr('WhatsApp')} title={tr('WhatsApp par bhejein')} className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50"><MessageCircle className="h-3.5 w-3.5" /></button>}
                    {editable(q) && <button type="button" onClick={() => setEditing(q)} aria-label={tr('Badlein')} title={tr('Badlein')} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>}
                  </div>
                </div>
                {canManage && !q.convertedJobId && !['REJECTED', 'EXPIRED'].includes(q.status) && (
                  <div className="flex w-full flex-wrap justify-end gap-1.5 border-t border-slate-100 pt-2 sm:w-auto sm:border-0 sm:pt-0">
                    {q.status === 'DRAFT' && <Button size="sm" variant="ghost" leftIcon={<Send className="h-3.5 w-3.5" />} onClick={() => send.mutate(q)}>{tr('Bheja')}</Button>}
                    {q.status !== 'ACCEPTED' && <Button size="sm" variant="ghost" leftIcon={<XCircle className="h-3.5 w-3.5" />} onClick={() => { setReason(''); setRejecting(q); }}>{tr('Mana')}</Button>}
                    {q.status !== 'ACCEPTED' && <Button size="sm" variant="secondary" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => accept.mutate(q)}>{tr('Haan')}</Button>}
                    <Button size="sm" leftIcon={<Briefcase className="h-3.5 w-3.5" />} loading={convert.isPending && convert.variables?.id === q.id} onClick={() => convert.mutate(q)}>{tr('Job banayein')}</Button>
                  </div>
                )}
                {q.convertedJobId && <Link to={`/services-biz/jobs/${q.convertedJobId}`} className="w-full text-end text-[0.8125rem] font-semibold text-brand-700 hover:underline sm:w-auto">{tr('Job dekhein →')}</Link>}
              </li>
            );
          })}
        </ul>
      )}

      {editing && <QuoteModal quote={editing === 'new' ? null : editing} pending={save.isPending} onSave={(v) => save.mutate(v)} onClose={() => setEditing(null)} />}
      {rejecting && (
        <Modal open onClose={() => setRejecting(null)} size="sm" title={tr('Mana — {{quoteNumber}}', { quoteNumber: rejecting.quoteNumber })}
          footer={<><Button variant="secondary" onClick={() => setRejecting(null)}>{tr('Rehne dein')}</Button><Button variant="danger" loading={reject.isPending} onClick={() => reject.mutate()}>{tr('Mana likhein')}</Button></>}>
          <Input label={tr('Wajah')} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus placeholder={tr('Mehnga laga')} hint={tr('Agli dafa ke liye — marzi hai')} />
        </Modal>
      )}

      {guide.isOpen && (
        <PageGuide title={tr('Quotes — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: tr('Quote banayein'), text: tr('Rate list se kaam chunein — visit aur kaam ki line khud ban jati hai. Parts aur aur kharcha line se jorein.') },
            { icon: MessageCircle, color: '#22c55e', title: tr('Bhejein'), text: tr('WhatsApp button se poora quote customer ko jata hai aur "Bheja gaya" likh jata hai. Print bhi kar sakte hain.') },
            { icon: Briefcase, color: '#7c3aed', title: tr('Haan ho to job'), text: tr('"Job banayein" se isi kharche ki job card banti hai — parts bhi saath. Advance job par lein.') },
          ]}
          tips={[tr('Quote paisa nahi — Sales ya galla me nahi aata. Paisa job ke advance ya bill par.')]}
          shortcuts={[['N', tr('naya quote')], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
