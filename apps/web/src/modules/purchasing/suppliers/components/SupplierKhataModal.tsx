import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Loader2, Printer, Banknote, Plus, BookOpen, Undo2, Pencil, Trash2,
  MessageCircle, CheckCircle2, AlertTriangle, Package, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import {
  supplierLedgerApi, ledgerMeta, entryDelta,
  type SupplierLedgerEntry, type SupplierLedgerType,
} from '../api/supplier-ledger.api';

/* ═════════════════════════════════════════════════════════════
   SUPPLIER KHATA — hum ne supplier ko kitna dena hai
   ─────────────────────────────────────────────────────────────
   Customer ke khate ka ulta. Wahan "customer ne humein dena hai",
   yahan "hum ne supplier ko dena hai".

   Paper register se aane walon ke liye sab se aham cheez:
   📖 PURANA HISAB — system chalane se pehle jitna dena tha,
   wo ek dafa daal dein, phir aage ka hisab khud chalta rehta hai.
   ═════════════════════════════════════════════════════════════ */

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';
const fmtDateTime = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type Mode = 'view' | 'opening' | 'due' | 'payment' | 'return' | 'adjust' | 'print';
type FilterKind = 'all' | 'due' | 'paid';

export function SupplierKhataModal({ supplierId, onClose }: { supplierId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Meri Dukaan';
  const shopPhone = useAuthStore((s: any) => s.tenant?.phone || '');

  const [mode, setMode] = useState<Mode>('view');
  const [kind, setKind] = useState<FilterKind>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-statement', supplierId],
    queryFn: () => supplierLedgerApi.statement(supplierId),
  });

  const after = (msg: string) => {
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ['supplier-statement', supplierId] });
    qc.invalidateQueries({ queryKey: ['supplier-ledger-summary'] });
    qc.invalidateQueries({ queryKey: ['suppliers'] });
    qc.invalidateQueries({ queryKey: ['suppliers-summary'] });
    setMode('view');
  };
  const fail = (e: any) => toast.error(e?.response?.data?.message || 'Kaam nahi hua');

  const openingMut = useMutation({ mutationFn: (v: any) => supplierLedgerApi.setOpeningBalance(supplierId, v), onSuccess: () => after('Purana hisab darj ho gaya ✓'), onError: fail });
  const dueMut     = useMutation({ mutationFn: (v: any) => supplierLedgerApi.addDue(supplierId, v),            onSuccess: () => after('Udhaar darj ho gaya ✓'),      onError: fail });
  const payMut     = useMutation({ mutationFn: (v: any) => supplierLedgerApi.recordPayment(supplierId, v),      onSuccess: () => after('Adaigi darj ho gayi ✓'),      onError: fail });
  const retMut     = useMutation({ mutationFn: (v: any) => supplierLedgerApi.recordReturn(supplierId, v),       onSuccess: () => after('Wapsi darj ho gayi ✓'),       onError: fail });
  const adjMut     = useMutation({ mutationFn: (v: any) => supplierLedgerApi.adjust(supplierId, v),             onSuccess: () => after('Durusti darj ho gayi ✓'),     onError: fail });
  const delMut     = useMutation({
    mutationFn: (entryId: string) => supplierLedgerApi.removeEntry(supplierId, entryId),
    onSuccess: () => after('Entry hata di gayi — balance dobara ginn liya'), onError: fail,
  });

  /** Ek hi timeline — entries, naye se purane */
  const rows = useMemo(() => {
    const all = (data?.entries ?? []).slice().sort(
      (a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime(),
    );
    if (kind === 'all') return all;
    return all.filter((e) => (kind === 'due' ? entryDelta(e) > 0 : entryDelta(e) < 0));
  }, [data, kind]);

  const t = data?.totals;
  const s = data?.supplier;
  const hasOpening = (data?.entries ?? []).some((e) => e.type === 'OPENING_BALANCE');

  /* ═══ PRINT — supplier ko dene wala hisab ═══ */
  const printStatement = (paper: 'a4' | 'thermal' = 'a4') => {
    if (!data) return;
    const ordered = (data.entries ?? []).slice().sort(
      (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime(),
    );

    if (paper === 'thermal') {
      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(s!.name)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 80mm; }
  body { font-family: 'Courier New', monospace; padding: 5mm 4mm; color: #000; font-size: 11px; line-height: 1.4; }
  .c { text-align: center; } .b { font-weight: 700; }
  .xl { font-size: 15px; font-weight: 800; letter-spacing: 1px; } .huge { font-size: 18px; font-weight: 800; }
  .div { border-top: 1px dashed #000; margin: 7px 0; } .dbl { border-top: 2px solid #000; margin: 7px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; margin: 2px 0; }
  .row .v { font-weight: 700; white-space: nowrap; }
  .badge { display:inline-block; border:1.5px solid #000; padding:3px 10px; font-size:10px; font-weight:800; letter-spacing:1.4px; margin:5px 0; }
  .box { border: 2.5px solid #000; padding: 8px; margin: 8px 0; text-align: center; }
  .sub { font-size: 9px; }
  .sign { margin-top: 20px; border-top: 1px solid #000; padding-top: 3px; font-size: 9px; text-align: center; }
</style></head><body>
  <div class="c xl">${esc(shopName)}</div>
  ${shopPhone ? `<div class="c sub">Ph: ${esc(shopPhone)}</div>` : ''}
  <div class="div"></div>
  <div class="c"><span class="badge">SUPPLIER KHATA</span></div>
  <div class="c b" style="font-size:13px;">${esc(s!.name)}</div>
  ${s!.phone ? `<div class="c sub">${esc(s!.phone)}</div>` : ''}
  <div class="c sub">${new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</div>
  <div class="dbl"></div>
  ${ordered.map((e) => {
    const m = ledgerMeta(e.type);
    const d = entryDelta(e);
    return `<div class="row"><span>${fmtDate(e.entryDate)} ${esc(m.label)}</span><span class="v">${d > 0 ? '+' : '−'}${formatPKR(Math.abs(d))}</span></div>
      ${e.reference || e.note ? `<div class="sub">${esc(e.reference || '')}${e.reference && e.note ? ' • ' : ''}${esc(e.note || '')}</div>` : ''}`;
  }).join('')}
  <div class="dbl"></div>
  <div class="row"><span>Kul maal liya</span><span class="v">${formatPKR(t!.added)}</span></div>
  <div class="row"><span>Kul adaigi</span><span class="v">${formatPKR(t!.paid)}</span></div>
  <div class="box">
    <div class="sub b" style="letter-spacing:1.4px;">HUM NE DENA HAI</div>
    <div class="huge">${formatPKR(t!.balance)}</div>
  </div>
  <div class="sign">Supplier ke dastakhat</div>
  <div class="c b" style="margin-top:8px;font-size:10px;letter-spacing:2px;">* * SHUKRIYA * *</div>
  <script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
</body></html>`;
      const w = window.open('', '_blank', 'width=400,height=700');
      if (!w) return toast.error('Popup block hai — allow karein');
      w.document.open(); w.document.write(html); w.document.close();
      setMode('view');
      return;
    }

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(s!.name)} — Khata</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; font-size: 11px; line-height: 1.5;
    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .head { background: linear-gradient(135deg,#0f172a,#7c2d12,#c2410c); color:#fff; padding:18px 20px;
    border-radius:10px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:flex-start; gap:20px; }
  .head .shop { font-size:20px; font-weight:800; }
  .head .sub { font-size:10.5px; opacity:.9; }
  .head .badge { background:rgba(255,255,255,.2); border:1.5px solid rgba(255,255,255,.4); padding:3px 10px;
    border-radius:20px; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:1.4px; }
  .head .right { text-align:right; }
  .head .right .big { font-size:22px; font-weight:800; }
  .meta { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:14px; }
  .k { font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:1.2px; color:#64748b; }
  .v { font-weight:700; }
  table { width:100%; border-collapse:collapse; font-size:10px; }
  thead th { background:#0f172a; color:#fff; padding:7px 6px; text-align:left; font-size:9px;
    font-weight:800; text-transform:uppercase; letter-spacing:1px; }
  thead th.r { text-align:right; }
  tbody td { padding:6px; border-bottom:1px solid #e2e8f0; }
  tbody td.r { text-align:right; font-weight:800; white-space:nowrap; }
  tbody tr:nth-child(even) td { background:#f8fafc; }
  tr.grand td { background:linear-gradient(135deg,#0f172a,#c2410c) !important; color:#fff !important;
    font-weight:800; font-size:13px; padding:10px 6px; }
  .signs { display:flex; justify-content:space-between; margin-top:44px; gap:40px; }
  .sg { flex:1; border-top:1.5px solid #0f172a; padding-top:5px; text-align:center; font-size:10px; font-weight:700; }
  .foot { margin-top:16px; text-align:center; font-size:9px; color:#64748b; }
</style></head><body>
  <div class="head">
    <div>
      <div class="badge">Supplier Khata</div>
      <div class="shop" style="margin-top:6px;">${esc(shopName)}</div>
      ${shopPhone ? `<div class="sub">📞 ${esc(shopPhone)}</div>` : ''}
    </div>
    <div class="right">
      <div class="sub">Hum ne dena hai</div>
      <div class="big">${formatPKR(t!.balance)}</div>
      <div class="sub">${new Date().toLocaleDateString('en-PK', { dateStyle: 'long' })}</div>
    </div>
  </div>

  <div class="meta">
    <div>
      <div class="k">Supplier</div>
      <div class="v" style="font-size:14px;">${esc(s!.name)}</div>
      ${s!.contactPerson ? `<div class="sub">${esc(s!.contactPerson)}</div>` : ''}
      ${s!.phone ? `<div class="sub">📞 ${esc(s!.phone)}</div>` : ''}
      ${s!.address ? `<div class="sub">📍 ${esc(s!.address)}${s!.city ? `, ${esc(s!.city)}` : ''}</div>` : ''}
    </div>
    <div style="text-align:right;">
      <div class="k">Khulasa</div>
      <div class="sub">Kul maal liya: <strong>${formatPKR(t!.added)}</strong></div>
      <div class="sub">Kul adaigi: <strong>${formatPKR(t!.paid)}</strong></div>
      <div class="sub">${t!.entryCount} entries</div>
    </div>
  </div>

  <table>
    <thead><tr>
      <th>Tareekh</th><th>Kya hua</th><th>Reference / Note</th>
      <th class="r">Maal liya</th><th class="r">Adaigi</th><th class="r">Baqi</th>
    </tr></thead>
    <tbody>
      ${ordered.map((e) => {
        const m = ledgerMeta(e.type);
        const d = entryDelta(e);
        return `<tr>
          <td>${fmtDate(e.entryDate)}</td>
          <td>${m.emoji} ${esc(m.label)}</td>
          <td style="font-size:9px;color:#475569;">${esc(e.reference || '')}${e.reference && e.note ? ' • ' : ''}${esc(e.note || '')}</td>
          <td class="r" style="color:#b91c1c">${d > 0 ? formatPKR(d) : ''}</td>
          <td class="r" style="color:#065f46">${d < 0 ? formatPKR(-d) : ''}</td>
          <td class="r">${formatPKR(e.balanceAfter)}</td>
        </tr>`;
      }).join('')}
      <tr class="grand">
        <td colspan="3" style="text-align:right;padding-right:12px;">HUM NE DENA HAI</td>
        <td class="r" style="color:#fca5a5 !important;">${formatPKR(t!.added)}</td>
        <td class="r" style="color:#86efac !important;">${formatPKR(t!.paid)}</td>
        <td class="r" style="color:#fde68a !important;">${formatPKR(t!.balance)}</td>
      </tr>
    </tbody>
  </table>

  <div class="signs">
    <div class="sg">${esc(shopName)} ki janib se</div>
    <div class="sg">${esc(s!.name)} ke dastakhat</div>
  </div>
  <div class="foot">Powered by <strong>Nafaa POS</strong> — ${new Date().getFullYear()}</div>
  <script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>
</body></html>`;
    const w = window.open('', '_blank', 'width=1000,height=800');
    if (!w) return toast.error('Popup block hai — allow karein');
    w.document.open(); w.document.write(html); w.document.close();
    setMode('view');
  };

  const wa = () => {
    if (!s?.phone) return toast.error('Supplier ka phone number nahi hai');
    const digits = String(s.phone).replace(/[^0-9]/g, '');
    const phone = digits.startsWith('92') ? digits : digits.startsWith('0') ? '92' + digits.slice(1) : '92' + digits;
    const msg = `Assalam-o-Alaikum! 🙏\n\n*${shopName}* ki taraf se hisab:\n\nKul maal liya: Rs ${t!.added.toLocaleString('en-PK')}\nKul adaigi: Rs ${t!.paid.toLocaleString('en-PK')}\n\n*Baqi: Rs ${t!.balance.toLocaleString('en-PK')}*\n\nTasdeeq kar lein. Shukriya!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (isLoading || !data) {
    return (
      <Shell title="Khata khul raha hai…" onClose={onClose}>
        <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
      </Shell>
    );
  }

  return (
    <Shell
      title={s!.name}
      subtitle={
        <>
          {s!.phone ?? '—'}
          <span className="opacity-50 mx-1.5">•</span>
          Kul maal {formatPKR(s!.totalPurchased)}
        </>
      }
      badge="Supplier Khata"
      onClose={onClose}
      footer={
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setMode('print')}
            className="h-11 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1.5 transition">
            <Printer className="h-4 w-4" /> Hisab Print
          </button>
          <button onClick={wa}
            className="h-11 px-4 rounded-xl bg-green-100 dark:bg-green-500/15 hover:bg-green-200 text-green-700 dark:text-green-300 text-xs font-extrabold inline-flex items-center gap-1.5 transition">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </button>
          {!hasOpening && (
            <button onClick={() => setMode('opening')}
              className="h-11 px-4 rounded-xl border-2 border-violet-200 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 text-xs font-extrabold inline-flex items-center gap-1.5 transition">
              <BookOpen className="h-4 w-4" /> Purana Hisab
            </button>
          )}
          <button onClick={() => setMode('due')}
            className="h-11 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition">
            <Plus className="h-4 w-4" /> Maal Liya
          </button>
          <button onClick={() => setMode('payment')} disabled={t!.balance <= 0}
            className="flex-1 min-w-[140px] h-11 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-40 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 transition">
            <Banknote className="h-4 w-4" /> Paisa Dein
          </button>
        </div>
      }
    >
      {mode === 'print' && <PrintPicker onPick={printStatement} onCancel={() => setMode('view')} />}
      {mode === 'opening' && <OpeningForm pending={openingMut.isPending} onCancel={() => setMode('view')} onSubmit={(v: any) => openingMut.mutate(v)} />}
      {mode === 'due' && <AmountForm title="Maal Liya (udhaar)" hint="Bina purchase bill ke — sirf khate me darj" icon={Package} tone="amber"
        pending={dueMut.isPending} onCancel={() => setMode('view')} onSubmit={(v: any) => dueMut.mutate(v)} refLabel="Bill / reference" />}
      {mode === 'payment' && <AmountForm title="Supplier Ko Paisa Diya" hint={`Baqi: ${formatPKR(t!.balance)}`} icon={Banknote} tone="emerald"
        max={t!.balance} pending={payMut.isPending} onCancel={() => setMode('view')} onSubmit={(v: any) => payMut.mutate(v)} refLabel="Cheque / transfer ref" quick methods />}
      {mode === 'return' && <AmountForm title="Maal Wapas Kiya" hint="Hamara dena kam ho jayega" icon={Undo2} tone="blue"
        max={t!.balance} pending={retMut.isPending} onCancel={() => setMode('view')} onSubmit={(v: any) => retMut.mutate(v)} refLabel="Return note #" />}
      {mode === 'adjust' && <AdjustForm pending={adjMut.isPending} onCancel={() => setMode('view')} onSubmit={(v: any) => adjMut.mutate(v)} />}

      {mode === 'view' && (
        <div className="space-y-4">
          {/* Balance */}
          <div className={`rounded-2xl p-4 text-center ${
            t!.balance > 0
              ? 'bg-gradient-to-br from-rose-500 to-red-700 text-white shadow-lg shadow-rose-500/30'
              : 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/30'
          }`}>
            <div className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">
              {t!.balance > 0 ? 'Hum ne dena hai' : 'Hisab clear hai'}
            </div>
            <div className="text-4xl font-extrabold tabular-nums mt-1">{formatPKR(t!.balance)}</div>
            {t!.openingBalance > 0 && (
              <div className="text-[11px] font-bold opacity-80 mt-1">
                isme {formatPKR(t!.openingBalance)} purana hisab shamil hai
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Box label="Kul maal liya" value={formatPKR(t!.added)} tone="amber" />
            <Box label="Kul adaigi" value={formatPKR(t!.paid)} tone="emerald" />
          </div>

          {!hasOpening && (
            <button onClick={() => setMode('opening')}
              className="w-full rounded-2xl bg-violet-50 dark:bg-violet-500/10 border-2 border-dashed border-violet-300 dark:border-violet-500/40 p-3 text-left hover:bg-violet-100 dark:hover:bg-violet-500/15 transition">
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-5 w-5 text-violet-600 dark:text-violet-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-violet-900 dark:text-violet-200">
                    📖 Purana hisab daalein
                  </div>
                  <div className="text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                    System chalane se pehle is supplier ko jitna dena tha — ek dafa daal dein,
                    phir aage ka hisab khud chalta rahega
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* Chhote buttons */}
          <div className="flex gap-2 flex-wrap">
            <SmallBtn icon={Undo2} label="Maal wapas" onClick={() => setMode('return')} />
            <SmallBtn icon={Pencil} label="Durusti" onClick={() => setMode('adjust')} />
            {hasOpening && <SmallBtn icon={BookOpen} label="Purana hisab badlein" onClick={() => setMode('opening')} />}
          </div>

          {/* Filter chips */}
          <div className="flex gap-1.5 flex-wrap">
            {([['all', `Sab (${data.entries.length})`], ['due', '📦 Maal liya'], ['paid', '💸 Adaigi']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setKind(v as FilterKind)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border-2 transition ${
                  kind === v ? 'bg-orange-600 border-orange-600 text-white shadow'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-orange-400'
                }`}>{label}</button>
            ))}
          </div>

          {/* Timeline */}
          {rows.length === 0 ? (
            <div className="py-10 text-center">
              <BookOpen className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-sm font-extrabold text-slate-700 dark:text-slate-200">Khata abhi khali hai</p>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Purana hisab daalein ya "Maal Liya" se pehli entry banayein
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {rows.map((e) => (
                <EntryRow key={e.id} e={e}
                  canDelete={e.type !== 'PURCHASE_CREDIT' || !e.reference}
                  onDelete={() => { if (confirm('Ye entry hata dein? Balance dobara ginn liya jayega.')) delMut.mutate(e.id); }} />
              ))}
            </div>
          )}

          {/* Kharidari */}
          {data.purchases.length > 0 && (
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Is supplier se kharidari ({data.purchases.length})
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {data.purchases.slice().reverse().map((p) => {
                  const due = Math.max(p.total - p.paidAmount, 0);
                  return (
                    <div key={p.id} className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 truncate">
                          {p.purchaseNumber}
                          <span className="ml-1.5 font-bold text-slate-400">{p.items.length} cheezein</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">{fmtDate(p.purchasedAt)}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-extrabold tabular-nums text-slate-800 dark:text-slate-100">{formatPKR(p.total)}</div>
                        {due > 0 && <div className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">{formatPKR(due)} baqi</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}

/* ═════════════ SHELL ═════════════ */
function Shell({ title, subtitle, badge, onClose, children, footer }: {
  title: string; subtitle?: React.ReactNode; badge?: string;
  onClose: () => void; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 relative bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white px-5 py-4 overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-orange-400/25 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              {badge && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black border border-white/30">
                  <BookOpen className="h-3 w-3" /> {badge}
                </div>
              )}
              <h3 className="text-lg sm:text-xl font-black mt-2 truncate">{title}</h3>
              {subtitle && <div className="text-xs text-white/85 font-bold mt-0.5">{subtitle}</div>}
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="shrink-0 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-4">{footer}</div>
        )}
      </div>
    </div>
  );
}

/* ═════════════ ENTRY ROW ═════════════ */
function EntryRow({ e, canDelete, onDelete }: {
  e: SupplierLedgerEntry; canDelete: boolean; onDelete: () => void;
}) {
  const m = ledgerMeta(e.type);
  const d = entryDelta(e);
  return (
    <div className="group flex items-center gap-2.5 rounded-xl bg-white dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 px-2.5 py-2">
      <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base shrink-0">
        {m.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black border ${m.cls}`}>{m.label}</span>
          {e.reference && <span className="font-mono text-[10px] font-bold text-slate-400">{e.reference}</span>}
        </div>
        {e.note && <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">{e.note}</div>}
        <div className="text-[10px] font-bold text-slate-400">{fmtDateTime(e.entryDate)}</div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-sm font-extrabold tabular-nums ${
          d > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
        }`}>
          {d > 0 ? '+' : '−'}{formatPKR(Math.abs(d))}
        </div>
        <div className="text-[10px] font-bold text-slate-400 tabular-nums">baqi {formatPKR(e.balanceAfter)}</div>
      </div>
      {canDelete && (
        <button onClick={onDelete} title="Entry hatao"
          className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-500/15 hover:bg-rose-200 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 flex items-center justify-center transition shrink-0">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ═════════════ FORMS ═════════════ */
const inp = (extra = '', bad = false) =>
  [
    'w-full rounded-xl border-2 px-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white',
    'placeholder:text-slate-400 focus:outline-none focus:ring-2 transition',
    bad ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
        : 'border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-orange-200 dark:focus:ring-orange-500/30',
    extra,
  ].join(' ');

function Lbl({ children, hint, req }: { children: React.ReactNode; hint?: string; req?: boolean }) {
  return (
    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
      {children}{req && <span className="text-rose-500 ml-0.5">*</span>}
      {hint && <span className="text-slate-400 normal-case font-bold ml-1">({hint})</span>}
    </label>
  );
}

function FormShell({ icon: Icon, title, hint, tone, children }: any) {
  const tones: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-teal-600',
    blue: 'from-blue-500 to-indigo-600',
    violet: 'from-violet-500 to-purple-600',
  };
  return (
    <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-4">
      <div className="flex items-start gap-2.5 mb-3">
        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${tones[tone] ?? tones.amber} text-white flex items-center justify-center shadow shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{title}</h4>
          {hint && <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{hint}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function OpeningForm({ pending, onCancel, onSubmit }: any) {
  const [amount, setAmount] = useState('');
  const [entryDate, setEntryDate] = useState(toDateInput(new Date()));
  const [note, setNote] = useState('');
  const n = Number(amount) || 0;

  return (
    <FormShell icon={BookOpen} title="Purana Hisab" tone="violet"
      hint="System chalane se pehle is supplier ko jitna dena tha">
      <div className="space-y-3">
        <div className="rounded-xl bg-violet-50 dark:bg-violet-500/10 border-2 border-violet-200 dark:border-violet-500/30 p-3 text-[11px] font-bold text-violet-900 dark:text-violet-200">
          Ye <strong>sirf ek dafa</strong> daalna hota hai. Purani copy/register me jo baqi likha hai,
          wohi raqam yahan daal dein — aage ka hisab system khud chalata rahega.
        </div>
        <div>
          <Lbl req>Pehle se kitna dena tha</Lbl>
          <input type="number" min={0} autoFocus className={inp('h-14 text-2xl font-extrabold tabular-nums text-center')}
            placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <Lbl hint="kis tareekh ka hisab hai">Tareekh</Lbl>
          <input type="date" className={inp('h-11 font-bold [color-scheme:light] dark:[color-scheme:dark]')}
            value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
        </div>
        <div>
          <Lbl hint="optional">Note</Lbl>
          <input className={inp('h-11 font-semibold')} placeholder="Purani copy ka hisab — safha 12"
            value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Wapas</Button>
          <Button className="flex-[2] bg-gradient-to-r from-violet-600 to-purple-700 font-extrabold" loading={pending} disabled={n < 0}
            onClick={() => onSubmit({ amount: n, entryDate, ...(note.trim() ? { note: note.trim() } : {}) })}>
            <CheckCircle2 className="h-4 w-4" /> Darj Karein
          </Button>
        </div>
      </div>
    </FormShell>
  );
}

/** Golak ka hisab isi par tikta hai — sirf CASH wali adaigi golak se nikalti hai */
const PAY_METHODS: Array<[string, string]> = [
  ['CASH', '💵 Cash'],
  ['BANK_TRANSFER', '🏦 Bank'],
  ['CARD', '💳 Card'],
  ['JAZZCASH', 'JazzCash'],
  ['EASYPAISA', 'EasyPaisa'],
];

function AmountForm({ title, hint, icon, tone, max, pending, onCancel, onSubmit, refLabel, quick, methods }: any) {
  const [amount, setAmount] = useState(quick && max ? String(max) : '');
  const [method, setMethod] = useState('CASH');
  const [entryDate, setEntryDate] = useState(toDateInput(new Date()));
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const n = Number(amount) || 0;
  const bad = n <= 0 || (max !== undefined && n > max);
  const quicks = max ? [max, Math.round(max / 2), 10000, 5000].filter((v, i, a) => v > 0 && v <= max && a.indexOf(v) === i) : [];

  return (
    <FormShell icon={icon} title={title} hint={hint} tone={tone}>
      <div className="space-y-3">
        <div>
          <Lbl req>Raqam</Lbl>
          <input type="number" min={1} max={max} autoFocus
            className={inp('h-14 text-2xl font-extrabold tabular-nums text-center', bad && !!amount)}
            placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          {bad && !!amount && (
            <div className="mt-1 text-[11px] font-extrabold text-rose-600">
              {max !== undefined ? `1 se ${formatPKR(max)} ke darmiyan honi chahiye` : '0 se ziyada honi chahiye'}
            </div>
          )}
        </div>
        {quicks.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5">
            {quicks.map((v) => (
              <button key={v} type="button" onClick={() => setAmount(String(v))}
                className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-xs font-extrabold text-slate-700 dark:text-slate-200 tabular-nums transition">
                {v === max ? 'Poora' : v >= 1000 ? `${v / 1000}k` : v}
              </button>
            ))}
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Tareekh</Lbl>
            <input type="date" className={inp('h-11 font-bold [color-scheme:light] dark:[color-scheme:dark]')}
              value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div>
            <Lbl hint="optional">{refLabel}</Lbl>
            <input className={inp('h-11 font-bold font-mono')} value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        </div>
        {methods && (
          <div>
            <Lbl req>Paisa kaise diya</Lbl>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {PAY_METHODS.map(([v, label]) => (
                <button key={v} type="button" onClick={() => setMethod(v)}
                  className={`h-11 rounded-xl text-[11px] font-extrabold transition border-2 ${
                    method === v
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:border-emerald-400'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {method === 'CASH'
                ? 'Cash golak (cash register) se nikal jayega.'
                : 'Golak par asar nahi — ye paisa golak se nahi gaya.'}
            </p>
          </div>
        )}
        <div>
          <Lbl hint="optional">Note</Lbl>
          <input className={inp('h-11 font-semibold')} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Wapas</Button>
          <Button className={`flex-[2] font-extrabold bg-gradient-to-r ${
            tone === 'emerald' ? 'from-emerald-600 to-teal-700'
              : tone === 'blue' ? 'from-blue-600 to-indigo-700'
              : 'from-amber-500 to-orange-600'
          }`} loading={pending} disabled={bad}
            onClick={() => onSubmit({
              amount: n, entryDate,
              ...(methods ? { paymentMethod: method } : {}),
              ...(reference.trim() ? { reference: reference.trim() } : {}),
              ...(note.trim() ? { note: note.trim() } : {}),
            })}>
            <CheckCircle2 className="h-4 w-4" /> Darj Karein
          </Button>
        </div>
      </div>
    </FormShell>
  );
}

function AdjustForm({ pending, onCancel, onSubmit }: any) {
  const [dir, setDir] = useState<'up' | 'down'>('down');
  const [amount, setAmount] = useState('');
  const [entryDate, setEntryDate] = useState(toDateInput(new Date()));
  const [note, setNote] = useState('');
  const n = Number(amount) || 0;
  const signed = dir === 'up' ? n : -n;
  const bad = n <= 0 || !note.trim();

  return (
    <FormShell icon={Pencil} title="Durusti" tone="violet" hint="Discount, ghalati ya koi aur wajah">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setDir('down')}
            className={`h-12 rounded-xl text-xs font-extrabold border-2 transition ${
              dir === 'down' ? 'bg-emerald-600 border-emerald-600 text-white shadow'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}>➖ Hamara dena KAM hua</button>
          <button type="button" onClick={() => setDir('up')}
            className={`h-12 rounded-xl text-xs font-extrabold border-2 transition ${
              dir === 'up' ? 'bg-rose-600 border-rose-600 text-white shadow'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}>➕ Hamara dena BARHA</button>
        </div>
        <div>
          <Lbl req>Raqam</Lbl>
          <input type="number" min={1} autoFocus className={inp('h-14 text-2xl font-extrabold tabular-nums text-center')}
            placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <Lbl>Tareekh</Lbl>
          <input type="date" className={inp('h-11 font-bold [color-scheme:light] dark:[color-scheme:dark]')}
            value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
        </div>
        <div>
          <Lbl req hint="likhna zaroori hai">Wajah</Lbl>
          <input className={inp('h-11 font-semibold', !note.trim() && !!amount)}
            placeholder="Supplier ne 500 discount diya" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Wapas</Button>
          <Button className="flex-[2] bg-gradient-to-r from-violet-600 to-purple-700 font-extrabold" loading={pending} disabled={bad}
            onClick={() => onSubmit({ amount: signed, entryDate, note: note.trim() })}>
            <CheckCircle2 className="h-4 w-4" /> Darj Karein
          </Button>
        </div>
      </div>
    </FormShell>
  );
}

function PrintPicker({ onPick, onCancel }: { onPick: (p: 'a4' | 'thermal') => void; onCancel: () => void }) {
  return (
    <FormShell icon={Printer} title="Hisab Print Karein" tone="blue" hint="Supplier ko dene ke liye">
      <div className="space-y-2">
        <button onClick={() => onPick('a4')}
          className="w-full rounded-2xl border-2 border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 p-4 text-left hover:shadow-lg transition active:scale-[0.98]">
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">📄 A4 — poora hisab</div>
          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
            Har entry alag line par, chalta hua balance, aur dono dastakhaton ki jagah. PDF bhi bana sakte hain.
          </div>
        </button>
        <button onClick={() => onPick('thermal')}
          className="w-full rounded-2xl border-2 border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-4 text-left hover:shadow-lg transition active:scale-[0.98]">
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">🧾 80mm — chhoti parchi</div>
          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
            Usi printer se jis se receipt nikalti hai — supplier ko haath me dene ke liye.
          </div>
        </button>
        <Button variant="secondary" className="w-full" onClick={onCancel}>Wapas</Button>
      </div>
    </FormShell>
  );
}

function Box({ label, value, tone }: { label: string; value: string; tone: 'amber' | 'emerald' }) {
  const tones = {
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
  };
  return (
    <div className={`rounded-xl border-2 px-3 py-2 ${tones[tone]}`}>
      <div className="text-[9px] font-extrabold uppercase tracking-wider opacity-75">{label}</div>
      <div className="text-lg font-extrabold tabular-nums truncate">{value}</div>
    </div>
  );
}

function SmallBtn({ icon: Icon, label, onClick }: any) {
  return (
    <button onClick={onClick}
      className="h-9 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-extrabold inline-flex items-center gap-1.5 hover:border-orange-400 transition">
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
