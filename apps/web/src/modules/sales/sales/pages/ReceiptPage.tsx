/**
 * The bill page for every industry (/sales/:id/receipt). Shows the receipt
 * exactly as it prints in the shop's design, switches paper (58 / 80 / A4),
 * prints (or saves as PDF), shares on WhatsApp, lists each part of a split
 * payment, and offers return, cancel and the industry's extra prints.
 * Opened with ?auto=1 after a sale it prints by itself when the shop turned
 * auto print on; ?autoprint=1 always prints.
 *
 * Keys: P print · W WhatsApp · D PDF · R return · G guide · Esc back.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Ban, CalendarClock, Copy, FileDown, GraduationCap, MessageCircle, Palette, Printer, ReceiptText, RotateCcw, Share2,
  Wallet, WifiOff, Wrench,
} from 'lucide-react';
import {
  Button, Card, Kbd, Modal, PageHero, PageShell, Segmented, Skeleton, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { ReceiptPreview } from '@core/receipt/ReceiptPreview';
import { printReceipt } from '@core/receipt/print';
import { devicePaper, getReceiptSetup, setDevicePaper, useReceiptSetup } from '@core/receipt/setup';
import type { ReceiptPaper, ReceiptRowDoc } from '@core/receipt/types';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { ReturnModal } from '@modules/sales/returns/components/ReturnModal';
import { FbrReceiptBadge } from '@integrations/fbr';
import { loadReceipt, type LoadedReceipt } from '../../receipt/industryReceipt';
import { receiptText } from '../../receipt/fromSale';

const PAPERS = [{ value: '58', label: '58mm' }, { value: '80', label: '80mm' }, { value: 'A4', label: 'A4' }] as const;
const VOID_REASONS = ['Ghalat bill bana', 'Customer ne liya hi nahi', 'Demo / test bill', 'Do dafa ban gaya'];
const num = (v: unknown) => Number(v ?? 0) || 0;

/**
 * Adds the industry's rows under the bill header (table, token, waiter…)
 * before the bill is shown or printed. Rows whose label the bill already
 * has are skipped; a failed lookup leaves the plain bill.
 */
async function withIndustryRows(r: LoadedReceipt, rowsFor?: (sale: { id: string; saleNumber?: string }) => Promise<ReceiptRowDoc[]>): Promise<LoadedReceipt> {
  if (!rowsFor || !r.sale?.id || !navigator.onLine) return r;
  const rows = await rowsFor(r.sale).catch(() => [] as ReceiptRowDoc[]);
  const have = new Set((r.doc.infoRows ?? []).map((x) => x.label));
  const fresh = rows.filter((x) => x?.value && !have.has(x.label));
  return fresh.length ? { ...r, doc: { ...r.doc, infoRows: [...(r.doc.infoRows ?? []), ...fresh] } } : r;
}

export default function ReceiptPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const industry = useCurrentIndustry();
  const setupQ = useReceiptSetup();
  const setup = setupQ.data ?? getReceiptSetup();
  const canVoid = usePermission(PERMISSIONS.SALES_VOID);
  const canReturn = usePermission(PERMISSIONS.RETURNS_CREATE);
  const canDesign = usePermission(PERMISSIONS.SETTINGS_EDIT);

  const fromUrl = params.get('paper');
  const [paper, setPaperState] = useState<ReceiptPaper | null>(fromUrl === '58' || fromUrl === '80' || fromUrl === 'A4' ? fromUrl : devicePaper());
  // A paper picked here is remembered for this device (its printer).
  const setPaper = (p: ReceiptPaper) => { setPaperState(p); setDevicePaper(p); };
  const shownPaper = paper ?? setup.design.paper;
  const [copies, setCopies] = useState<number | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [returning, setReturning] = useState(false);
  const printed = useRef(false);

  const q = useQuery({
    queryKey: ['sale-receipt', id, industry?.id],
    queryFn: async () => withIndustryRows(await loadReceipt(id!, industry?.id, setup), industry?.receipt?.infoRows),
    enabled: !!id,
  });
  const data = q.data;
  const doc = data?.doc;
  const sale = data?.sale;

  const voided = sale?.status === 'VOIDED';
  const offline = doc?.stamp === 'OFFLINE';
  const isJewelry = !!sale?.invoiceNumber && !sale?.saleNumber;
  const mayReturn = !!sale && !isJewelry && !voided && !offline && canReturn;
  const mayVoid = !!sale && !isJewelry && !voided && !offline && canVoid;

  const print = (p: ReceiptPaper = shownPaper) => {
    if (!doc) return;
    printReceipt(doc, { paper: p, setup, copies: copies ?? setup.design.copies });
  };
  const savePdf = () => {
    if (!doc) return;
    toast.info('Print window me "Save as PDF" chunein');
    printReceipt(doc, { paper: 'A4', setup, copies: 1 });
  };

  // Print once when opened right after a sale.
  useEffect(() => {
    if (!doc || printed.current) return;
    const wanted = params.get('autoprint') === '1' || (params.get('auto') === '1' && setup.design.autoPrint);
    if (!wanted) return;
    printed.current = true;
    const t = window.setTimeout(() => print(), 400);
    return () => window.clearTimeout(t);
  }, [doc]); // eslint-disable-line react-hooks/exhaustive-deps

  const whatsapp = () => {
    if (!doc) return;
    const phone = (doc.customerPhone ?? '').replace(/\D/g, '').replace(/^0/, '92');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(receiptText(doc, setup.shop.name, setup.design.payAccounts))}`, '_blank', 'noopener');
  };
  const share = async () => {
    if (!doc) return;
    const text = receiptText(doc, setup.shop.name, setup.design.payAccounts);
    if (navigator.share) { try { await navigator.share({ title: `Bill ${doc.saleNumber}`, text }); return; } catch { /* closed */ } }
    await navigator.clipboard?.writeText(text);
    toast.success('Bill copy ho gaya');
  };
  const copyLink = async () => { await navigator.clipboard?.writeText(window.location.href.split('?')[0]); toast.success('Link copy ho gaya'); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isDialogOpen()) return;
      if (e.key === 'Escape') { navigate(-1); return; }
      if (isTyping()) return;
      const k = e.key.toLowerCase();
      if (k === 'p') { e.preventDefault(); print(); }
      else if (k === 'w') { e.preventDefault(); whatsapp(); }
      else if (k === 'd') { e.preventDefault(); savePdf(); }
      else if (k === 'r' && mayReturn) { e.preventDefault(); setReturning(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['sale-receipt', id] });
    ['sales-list', 'sales-history', 'sales-summary', 'dashboard-overview', 'product-catalog', 'customer-directory'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };

  if (q.isLoading) {
    return (
      <PageShell className="px-4 pt-4">
        <Skeleton className="h-36 rounded-3xl" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]"><Skeleton className="h-[32rem] rounded-3xl" /><Skeleton className="h-96 rounded-2xl" /></div>
      </PageShell>
    );
  }
  if (q.isError || !doc || !sale || !data) {
    return (
      <PageShell className="px-4 pt-4">
        <div className="mx-auto max-w-md rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <ReceiptText className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">Bill nahi mila</p>
          <p className="mt-1 text-sm text-slate-500">{navigator.onLine ? 'Shayad cancel ho gaya ya link ghalat hai' : 'Internet nahi — yeh bill is device par save nahi'}</p>
          <Button className="mt-4" variant="secondary" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="h-4 w-4" />}>Wapas</Button>
        </div>
      </PageShell>
    );
  }

  const change = num(sale.changeAmount);
  const received = Math.max(doc.paid - change, 0);
  const due = Math.max(doc.total - received, 0);
  const parts = doc.payments?.length
    ? doc.payments
    : doc.paid > 0 ? [{ label: doc.paymentLabel.replace(/^Paid \((.*)\)$/, '$1'), amount: doc.paid }] : [];
  const when = doc.date.toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <PageShell className="px-4 pt-4">
      <PageHero
        title={`Bill ${doc.saleNumber}`}
        chip={<><CalendarClock />{when}</>}
        meta={[doc.customerName, doc.cashierName && `Cashier: ${doc.cashierName}`, doc.branchName].filter(Boolean).join(' · ')}
        actions={<>
          <button type="button" onClick={() => navigate(-1)} title="Wapas (Esc)" aria-label="Wapas" className={heroIconButton}><ArrowLeft className="h-4 w-4" /></button>
          <button type="button" onClick={whatsapp} title="WhatsApp (W)" className={heroButton}><MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">WhatsApp</span></button>
          <button type="button" onClick={savePdf} title="PDF (D)" className={heroButton}><FileDown className="h-4 w-4" /><span className="hidden sm:inline">PDF</span></button>
          <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={() => print()} title="Print (P)" className={heroPrimaryButton}><Printer className="h-4 w-4" />Print {shownPaper === 'A4' ? 'A4' : `${shownPaper}mm`}</button>
        </>}
        stats={[
          { label: `Total · ${doc.lines.length} cheez`, value: formatPKR(doc.total) },
          { label: 'Mila', value: formatPKR(received), hint: change > 0 ? `${formatPKR(change)} change wapas` : undefined },
          ...(due > 0 ? [{ label: 'Udhaar', value: formatPKR(due) }] : []),
          ...(doc.discount > 0 ? [{ label: 'Discount', value: formatPKR(doc.discount) }] : []),
        ]}
      />

      {voided && <Banner tone="rose" icon={<Ban className="h-4 w-4" />}>Yeh bill cancel ho chuka hai — print par "CANCEL" chhapega.</Banner>}
      {offline && <Banner tone="amber" icon={<WifiOff className="h-4 w-4" />}>Yeh bill abhi internet ka intezar kar raha hai; net aate hi server par chala jayega. Return aur cancel us ke baad honge.</Banner>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="overflow-x-auto rounded-3xl bg-slate-100 p-4 ring-1 ring-slate-200/80 sm:p-8">
          <ReceiptPreview doc={doc} setup={setup} paper={shownPaper} zoom={shownPaper === 'A4' ? 0.86 : 1} />
        </div>

        <aside className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Printer}>Print</T>} description="Kaghaz is device ke printer ke liye yaad rehta hai">
            <div className="space-y-3">
              <Segmented label="Kaghaz" value={shownPaper} onChange={(v) => setPaper(v as ReceiptPaper)} items={PAPERS.map((p) => ({ value: p.value, label: p.label }))} />
              <label className="flex items-center justify-between gap-2 text-sm text-slate-700">
                Copies
                <select value={copies ?? setup.design.copies} onChange={(e) => setCopies(Number(e.target.value))} aria-label="Copies"
                  className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm">
                  {[1, 2, 3].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <Button className="w-full" onClick={() => print()} leftIcon={<Printer className="h-4 w-4" />}>Print <Kbd className="ml-1 border-white/30 bg-white/15 text-white">P</Kbd></Button>
              {canDesign && (
                <Link to="/settings?tab=receipt" className="flex items-center gap-2 text-[0.8125rem] font-medium text-brand-700 hover:underline">
                  <Palette className="h-4 w-4" /> Bill ka design badlein
                </Link>
              )}
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Wallet}>Payment</T>} description={parts.length > 1 ? `${parts.length} tareeqon se mila` : undefined}>
            <dl className="space-y-1.5 text-sm">
              {parts.length === 0 && <Row k="Payment" v="Kuch nahi mila" tone="text-amber-700" />}
              {parts.map((p, i) => <Row key={`${p.label}-${i}`} k={p.label} v={formatPKR(p.amount)} />)}
              {change > 0 && <Row k="Change wapas diya" v={`−${formatPKR(change)}`} />}
              <div className="my-1 border-t border-dashed border-slate-200" />
              <Row k="Mila" v={formatPKR(received)} strong />
              {due > 0 && <Row k="Udhaar (khata me)" v={formatPKR(due)} tone="text-amber-700" strong />}
              {num(doc.previousDue) > 0 && <Row k="Pichla baqi" v={formatPKR(num(doc.previousDue))} />}
            </dl>
            {!isJewelry && !offline && <FbrReceiptBadge saleId={sale.id} className="mt-3" />}
          </Card>

          <Card className="rounded-2xl" title={<T icon={ReceiptText}>Aur kaam</T>}>
            <div className="-mx-2 space-y-0.5">
              <Action icon={<MessageCircle className="h-4 w-4 text-emerald-600" />} label="WhatsApp par bhejein" hint="W" onClick={whatsapp} />
              <Action icon={<FileDown className="h-4 w-4" />} label="PDF save karein (A4)" hint="D" onClick={savePdf} />
              <Action icon={<Share2 className="h-4 w-4" />} label="Share / copy" onClick={share} />
              <Action icon={<Copy className="h-4 w-4" />} label="Link copy" onClick={copyLink} />
              {data.actions.map((a) => <Action key={a.key} icon={<Wrench className="h-4 w-4" />} label={a.label} onClick={a.run} />)}
              {mayReturn && <Action icon={<RotateCcw className="h-4 w-4 text-amber-600" />} label="Return" hint="R" onClick={() => setReturning(true)} />}
              {mayVoid && <Action icon={<Ban className="h-4 w-4 text-rose-600" />} label="Bill cancel (void) karein" onClick={() => setVoiding(true)} danger />}
            </div>
          </Card>
        </aside>
      </div>

      {guide.isOpen && (
        <PageGuide title="Bill ka safha" onClose={guide.close}
          steps={[
            { icon: Printer, color: '#2563eb', title: 'Print', text: 'Upar 58mm, 80mm ya A4 chunein aur Print dabayein. Jo kaghaz chunein woh is device ke liye yaad rehta hai.' },
            { icon: MessageCircle, color: '#16a34a', title: 'WhatsApp aur PDF', text: 'WhatsApp par bill ka text customer ke number par jata hai. PDF ke liye print window me "Save as PDF" chunein.' },
            { icon: Wallet, color: '#d97706', title: 'Payment', text: 'Bill kai tareeqon se mila ho (Cash + Card waghera) to har hissa alag nazar aata hai, change aur udhaar bhi.' },
            { icon: RotateCcw, color: '#e11d48', title: 'Return aur cancel', text: 'Kuch maal wapas aaye to Return. Poora bill ghalat bana ho to cancel karein — stock aur khata wapas ho jate hain.' },
          ]}
          shortcuts={[['P', 'print'], ['W', 'WhatsApp'], ['D', 'PDF'], ['R', 'return'], ['Esc', 'wapas']]}
        />
      )}
      {returning && <ReturnModal sale={sale} onClose={() => setReturning(false)} onDone={() => { setReturning(false); refresh(); }} />}
      {voiding && <VoidModal id={sale.id} onClose={() => setVoiding(false)} onDone={() => { setVoiding(false); refresh(); }} />}
    </PageShell>
  );
}

const T = ({ icon: Icon, children }: { icon: typeof Printer; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;

function Row({ k, v, tone, strong }: { k: string; v: string; tone?: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className={cn('text-slate-500', strong && 'font-medium text-slate-700')}>{k}</dt>
      <dd className={cn('tabular-nums', strong ? 'font-semibold' : 'font-medium', tone ?? 'text-slate-900')}>{v}</dd>
    </div>
  );
}

function Action({ icon, label, hint, onClick, danger }: { icon: React.ReactNode; label: string; hint?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition', danger ? 'text-rose-700 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50')}>
      {icon}<span className="flex-1">{label}</span>{hint && <Kbd>{hint}</Kbd>}
    </button>
  );
}

function Banner({ tone, icon, children }: { tone: 'rose' | 'amber'; icon: React.ReactNode; children: React.ReactNode }) {
  const cls = tone === 'rose' ? 'bg-rose-50 text-rose-800 ring-rose-100' : 'bg-amber-50 text-amber-800 ring-amber-100';
  return <div className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm ring-1 ${cls}`}>{icon}{children}</div>;
}

function VoidModal({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const mut = useMutation({
    mutationFn: () => salesApi.voidSale(id, reason.trim()),
    onSuccess: () => { toast.success('Bill cancel ho gaya — stock wapas aa gaya'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Cancel nahi hua'),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Bill cancel karein?"
      description="Stock wapas aa jayega, udhaar aur points ulat jayenge. Yeh wapas nahi hota."
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button variant="danger" loading={mut.isPending} disabled={!reason.trim()} onClick={() => mut.mutate()}>Cancel karein</Button></>}>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {VOID_REASONS.map((r) => (
          <button key={r} type="button" onClick={() => setReason(r)} aria-pressed={reason === r}
            className={`rounded-full px-3 py-1 text-[0.8125rem] ring-1 transition ${reason === r ? 'bg-rose-600 text-white ring-rose-600' : 'text-slate-600 ring-slate-200 hover:ring-slate-300'}`}>{r}</button>
        ))}
      </div>
      <input data-autofocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Wajah likhein" aria-label="Wajah"
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-rose-500" />
      <p className="mt-1.5 text-xs text-slate-500">Wajah record me rehti hai — baad me pata chale kis ne aur kyun cancel kiya</p>
    </Modal>
  );
}
