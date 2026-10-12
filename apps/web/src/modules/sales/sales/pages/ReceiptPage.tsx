/**
 * The bill page for every industry (/sales/:id/receipt). Shows the receipt
 * exactly as it prints in the shop's design, switches paper (58 / 80 / A4),
 * prints (or saves as PDF), shares on WhatsApp, and offers return, cancel
 * and the industry's extra prints. Opened with ?auto=1 after a sale it
 * prints by itself when the shop turned auto print on; ?autoprint=1 always
 * prints.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Ban, Copy, FileDown, MessageCircle, Palette, Printer, ReceiptText, RotateCcw, Share2, WifiOff, Wrench,
} from 'lucide-react';
import { Button, Modal, Segmented } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { ReceiptPreview } from '@core/receipt/ReceiptPreview';
import { printReceipt } from '@core/receipt/print';
import { devicePaper, getReceiptSetup, setDevicePaper, useReceiptSetup } from '@core/receipt/setup';
import type { ReceiptPaper } from '@core/receipt/types';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { ReturnModal } from '@modules/sales/returns/components/ReturnModal';
import { FbrReceiptBadge } from '@integrations/fbr';
import { loadReceipt } from '../../receipt/industryReceipt';
import { receiptText } from '../../receipt/fromSale';

const PAPERS = [{ value: '58', label: '58mm' }, { value: '80', label: '80mm' }, { value: 'A4', label: 'A4' }] as const;
const VOID_REASONS = ['Ghalat bill bana', 'Customer ne liya hi nahi', 'Demo / test bill', 'Do dafa ban gaya'];

export default function ReceiptPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
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
    queryFn: () => loadReceipt(id!, industry?.id, setup),
    enabled: !!id,
  });
  const data = q.data;
  const doc = data?.doc;
  const sale = data?.sale;

  const print = () => {
    if (!doc) return;
    printReceipt(doc, { paper: shownPaper, setup, copies: copies ?? setup.design.copies });
  };

  // Print once when opened right after a sale.
  useEffect(() => {
    if (!doc || printed.current) return;
    const wanted = params.get('autoprint') === '1' || (params.get('auto') === '1' && setup.design.autoPrint);
    if (!wanted) return;
    printed.current = true;
    const t = window.setTimeout(print, 400);
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

  // P prints, W WhatsApp.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); print(); }
      if (e.key === 'w' || e.key === 'W') { e.preventDefault(); whatsapp(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['sale-receipt', id] });
    ['sales-list', 'sales-history', 'sales-summary', 'dashboard-overview', 'product-catalog', 'customer-directory'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };

  if (q.isLoading) {
    return <div className="flex justify-center py-24"><div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /></div>;
  }
  if (q.isError || !doc || !sale) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <ReceiptText className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900">Bill nahi mila</p>
        <p className="mt-1 text-sm text-slate-500">{navigator.onLine ? 'Shayad mita diya gaya ya link ghalat hai' : 'Internet nahi — yeh bill is device par save nahi'}</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="h-4 w-4" />}>Wapas</Button>
      </div>
    );
  }

  const voided = sale.status === 'VOIDED';
  const offline = doc.stamp === 'OFFLINE';
  const due = Math.max(doc.total - doc.paid, 0);
  const isJewelry = !!sale.invoiceNumber && !sale.saleNumber;

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-10">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => navigate(-1)} aria-label="Wapas"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="mr-auto min-w-0">
          <h1 className="truncate text-lg font-semibold text-slate-900">Bill {doc.saleNumber}</h1>
          <p className="text-[0.8125rem] text-slate-500">{doc.date.toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}{doc.customerName ? ` · ${doc.customerName}` : ''}</p>
        </div>
        <Segmented label="Kaghaz" value={shownPaper} onChange={(v) => setPaper(v as ReceiptPaper)} items={PAPERS.map((p) => ({ value: p.value, label: p.label }))} />
        <Button onClick={print} leftIcon={<Printer className="h-4 w-4" />}>Print <kbd className="ml-1 hidden rounded bg-white/20 px-1 text-[0.6875rem] sm:inline">P</kbd></Button>
      </div>

      {voided && <Banner tone="rose" icon={<Ban className="h-4 w-4" />}>Yeh bill cancel ho chuka hai — print par "CANCEL" chhapega.</Banner>}
      {offline && <Banner tone="amber" icon={<WifiOff className="h-4 w-4" />}>Yeh bill abhi internet ka intezar kar raha hai; net aate hi server par chala jayega.</Banner>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Paper */}
        <div className="overflow-x-auto rounded-3xl bg-slate-100 p-4 sm:p-8">
          <ReceiptPreview doc={doc} setup={setup} paper={shownPaper} zoom={shownPaper === 'A4' ? 0.86 : 1} />
        </div>

        {/* Side panel */}
        <aside className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[0.75rem] text-slate-500">Total</p>
            <p className="text-2xl font-bold tabular-nums text-slate-900">{formatPKR(doc.total)}</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row k="Mila" v={formatPKR(doc.paid)} />
              {due > 0 && <Row k="Udhaar" v={formatPKR(due)} tone="text-amber-700" />}
              {doc.discount > 0 && <Row k="Chhoot" v={formatPKR(doc.discount)} />}
              <Row k="Cheezein" v={String(doc.lines.length)} />
              {doc.cashierName && <Row k="Cashier" v={doc.cashierName} />}
              {doc.branchName && <Row k="Branch" v={doc.branchName} />}
            </dl>
            {!isJewelry && !offline && <FbrReceiptBadge saleId={sale.id} className="mt-3" />}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-2">
            <Action icon={<MessageCircle className="h-4 w-4 text-emerald-600" />} label="WhatsApp par bhejein" hint="W" onClick={whatsapp} />
            <Action icon={<Share2 className="h-4 w-4" />} label="Share / copy" onClick={share} />
            <Action icon={<FileDown className="h-4 w-4" />} label="PDF save karein" hint="Print me 'Save as PDF'" onClick={() => printReceipt(doc, { paper: 'A4', setup, copies: 1 })} />
            <Action icon={<Copy className="h-4 w-4" />} label="Link copy" onClick={copyLink} />
            {data.actions.map((a) => <Action key={a.key} icon={<Wrench className="h-4 w-4" />} label={a.label} onClick={a.run} />)}
            {!isJewelry && !voided && canReturn && <Action icon={<RotateCcw className="h-4 w-4 text-amber-600" />} label="Wapsi (return)" onClick={() => setReturning(true)} disabled={offline} />}
            {!isJewelry && !voided && canVoid && <Action icon={<Ban className="h-4 w-4 text-rose-600" />} label="Bill cancel karein" onClick={() => setVoiding(true)} disabled={offline} danger />}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <label className="flex items-center justify-between gap-2 text-sm text-slate-700">
              Copies
              <select value={copies ?? setup.design.copies} onChange={(e) => setCopies(Number(e.target.value))}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm">
                {[1, 2, 3].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            {canDesign && (
              <Link to="/settings?tab=receipt" className="mt-3 flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline">
                <Palette className="h-4 w-4" /> Bill ka design badlein
              </Link>
            )}
          </div>
        </aside>
      </div>

      {returning && <ReturnModal sale={sale} onClose={() => setReturning(false)} onDone={() => { setReturning(false); refresh(); }} />}
      {voiding && <VoidModal id={sale.id} onClose={() => setVoiding(false)} onDone={() => { setVoiding(false); refresh(); }} />}
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className={`font-medium tabular-nums ${tone ?? 'text-slate-900'}`}>{v}</dd></div>;
}

function Action({ icon, label, hint, onClick, disabled, danger }: { icon: React.ReactNode; label: string; hint?: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition disabled:opacity-40 ${danger ? 'text-rose-700 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'}`}>
      {icon}<span className="flex-1">{label}</span>{hint && <span className="text-[0.6875rem] text-slate-400">{hint}</span>}
    </button>
  );
}

function Banner({ tone, icon, children }: { tone: 'rose' | 'amber'; icon: React.ReactNode; children: React.ReactNode }) {
  const cls = tone === 'rose' ? 'bg-rose-50 text-rose-800 ring-rose-100' : 'bg-amber-50 text-amber-800 ring-amber-100';
  return <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ${cls}`}>{icon}{children}</div>;
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
    </Modal>
  );
}
