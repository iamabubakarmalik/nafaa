/**
 * One supplier: what we owe and since when, the khata statement for any
 * period (with print), their bills, how their rates moved, and contact and
 * bank details. Pay, buy, order and message from the top.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Banknote, BookOpen, ClipboardList, Landmark, MessageCircle, Pencil, Phone, Printer, ShoppingCart, Trash2, TrendingDown, TrendingUp,
} from 'lucide-react';
import { Avatar, Button, DateRangeMenu, Modal, Tabs, resolveRange, type DateRangeValue } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { esc } from '@core/receipt/html';
import { printHtml } from '@core/receipt/print';
import { getReceiptSetup } from '@core/receipt/setup';
import { purchasesApi } from '../../purchases/api/purchases.api';
import { STATUS } from '../../purchases/pages/PurchasesListPage';
import { suppliersApi } from '../api/suppliers.api';
import { entryDelta, ledgerMeta, supplierLedgerApi } from '../api/supplier-ledger.api';
import { SupplierMoneyModal, type MoneyKind } from '../components/SupplierMoneyModal';

type Tab = 'khata' | 'bills' | 'rates' | 'info';
const day = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canEdit = usePermission(PERMISSIONS.SUPPLIERS_EDIT);
  const canBuy = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const [tab, setTab] = useState<Tab>('khata');
  const [money, setMoney] = useState<MoneyKind | null>(null);
  const [deleting, setDeleting] = useState(false);
  const q = useQuery({ queryKey: ['supplier', id], queryFn: () => suppliersApi.getOne(id!), enabled: !!id });
  const s = q.data;

  if (q.isLoading) return <div className="flex justify-center py-24"><div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /></div>;
  if (!s) return <div className="py-20 text-center"><p className="font-semibold text-slate-900">Supplier nahi mila</p><Button className="mt-4" variant="secondary" onClick={() => navigate('/suppliers')}>Wapas</Button></div>;

  const phone = (s.phone ?? '').replace(/\D/g, '').replace(/^0/, '92');
  const since = s.ledger.daysSincePayment;

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-10">
      <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-6">
        <div className="flex flex-wrap items-start gap-3">
          <button type="button" onClick={() => navigate('/suppliers')} aria-label="Wapas" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
          <Avatar name={s.name} url={s.logoUrl ?? undefined} size={52} className="ring-2 ring-white/40" />
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold">{s.name}{!s.isActive && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[0.75rem] font-medium">Band</span>}</h1>
            <p className="text-[0.8125rem] text-white/75">{[s.contactPerson, s.phone, s.city].filter(Boolean).join(' · ') || 'Rabta darj nahi'}</p>
            {s.paymentTerms && <p className="mt-0.5 text-[0.75rem] text-white/60">Shart: {s.paymentTerms}</p>}
          </div>
          <div className="text-right">
            <p className="text-[0.75rem] text-white/70">Dena hai</p>
            <p className="text-3xl font-bold tabular-nums">{formatPKR(s.outstandingDue)}</p>
            {s.outstandingDue > 0 && since != null && <p className={cn('text-[0.75rem]', since > 60 ? 'text-amber-200' : 'text-white/70')}>Aakhri adaigi {since} din pehle</p>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {canEdit && <HeroBtn primary onClick={() => setMoney('payment')}><Banknote className="h-4 w-4" /> Adaigi</HeroBtn>}
          {canBuy && <HeroBtn onClick={() => navigate(`/purchases/new?supplier=${s.id}`)}><ShoppingCart className="h-4 w-4" /> Kharidari</HeroBtn>}
          {canBuy && <HeroBtn onClick={() => navigate(`/purchases/new?order=1&supplier=${s.id}`)}><ClipboardList className="h-4 w-4" /> Order</HeroBtn>}
          {s.phone && <a href={`tel:${s.phone}`} className={heroBtnCls(false)}><Phone className="h-4 w-4" /> Call</a>}
          {s.phone && <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className={heroBtnCls(false)}><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
          {canEdit && <HeroBtn onClick={() => setMoney('due')}><BookOpen className="h-4 w-4" /> Khata entry</HeroBtn>}
          {canEdit && <Link to={`/suppliers/${s.id}/edit`} className={heroBtnCls(false)}><Pencil className="h-4 w-4" /> Badlein</Link>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
          <Stat label="Kul kharidari" value={formatPKR(s.stats.totalAmount)} hint={`${s.stats.totalPurchases} bill`} />
          <Stat label="Kul diye" value={formatPKR(s.ledger.paymentsMade + s.stats.totalPaid)} />
          <Stat label="Aksar bill" value={formatPKR(s.stats.averagePurchase)} />
          <Stat label="Aakhri maal" value={s.stats.daysSinceLastPurchase == null ? '—' : `${s.stats.daysSinceLastPurchase} din pehle`} />
        </div>
      </div>

      <Tabs value={tab} onChange={setTab} label="Supplier"
        items={[{ value: 'khata', label: 'Khata' }, { value: 'bills', label: 'Kharidari', count: s._count.purchases }, { value: 'rates', label: 'Rates' }, { value: 'info', label: 'Tafseel' }]} />

      {tab === 'khata' && <Khata supplierId={s.id} name={s.name} canEdit={canEdit} />}
      {tab === 'bills' && <Bills supplierId={s.id} />}
      {tab === 'rates' && <Rates history={s.priceHistory} />}
      {tab === 'info' && (
        <div className="grid gap-3 md:grid-cols-2">
          <Card title="Rabta">
            <KV k="Rabta" v={s.contactPerson} /><KV k="Phone" v={s.phone} /><KV k="Doosra phone" v={s.altPhone} /><KV k="Email" v={s.email} />
            <KV k="Pata" v={[s.address, s.area, s.city].filter(Boolean).join(', ')} /><KV k="CNIC" v={s.cnic} /><KV k="NTN" v={s.ntn} />
          </Card>
          <Card title="Bank" icon={<Landmark className="h-4 w-4" />}>
            <KV k="Bank" v={s.bankName} /><KV k="Account #" v={s.accountNumber} mono /><KV k="IBAN" v={s.iban} mono />
            <KV k="Shart" v={s.paymentTerms} />
            {s.notes && <p className="mt-2 border-t border-slate-100 pt-2 text-[0.8125rem] text-slate-600">{s.notes}</p>}
          </Card>
          {canEdit && (
            <div className="md:col-span-2">
              <Button variant="secondary" onClick={() => setDeleting(true)} leftIcon={<Trash2 className="h-4 w-4 text-rose-600" />}>Supplier mitayein</Button>
            </div>
          )}
        </div>
      )}

      {money && <SupplierMoneyModal supplier={s} initial={money} onClose={() => setMoney(null)} />}
      {deleting && <DeleteModal id={s.id} name={s.name} onClose={() => setDeleting(false)} onDone={() => { qc.invalidateQueries({ queryKey: ['suppliers'] }); navigate('/suppliers'); }} />}
    </div>
  );
}

const heroBtnCls = (primary: boolean) => cn('inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold transition',
  primary ? 'bg-white text-brand-800 hover:bg-brand-50' : 'bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25');
function HeroBtn({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return <button type="button" onClick={onClick} className={heroBtnCls(!!primary)}>{children}</button>;
}
function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div><p className="text-[0.75rem] text-white/70">{label}</p><p className="font-semibold tabular-nums">{value}{hint && <span className="ml-1 text-[0.6875rem] font-normal text-white/60">{hint}</span>}</p></div>;
}
function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="mb-2 flex items-center gap-1.5 font-semibold text-slate-900">{icon}{title}</p>{children}</div>;
}
function KV({ k, v, mono }: { k: string; v?: string | null; mono?: boolean }) {
  return <div className="flex justify-between gap-3 border-t border-slate-50 py-1.5 text-sm first:border-0"><span className="text-slate-500">{k}</span><span className={cn('text-right text-slate-900', mono && 'font-mono')}>{v || '—'}</span></div>;
}

function Khata({ supplierId, name, canEdit }: { supplierId: string; name: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const period = resolveRange(range, startHour);
  const q = useQuery({ queryKey: ['supplier-statement', supplierId, period?.from, period?.to], queryFn: () => supplierLedgerApi.statement(supplierId, period ?? undefined) });
  const st = q.data;
  const rows = useMemo(() => [...(st?.entries ?? [])].sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.createdAt.localeCompare(a.createdAt)), [st]);
  const remove = useMutation({
    mutationFn: (entryId: string) => supplierLedgerApi.removeEntry(supplierId, entryId),
    onSuccess: () => { toast.success('Entry hata di'); ['supplier', 'supplier-statement', 'suppliers'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hata'),
  });

  const print = () => {
    if (!st) return;
    const shop = getReceiptSetup().shop;
    const body = [...rows].reverse().map((e) => {
      const m = ledgerMeta(e.type);
      const dlt = entryDelta(e);
      return `<tr><td>${day(e.entryDate)}</td><td>${esc(m.label)}${e.reference ? ` · ${esc(e.reference)}` : ''}${e.note ? `<div class="n">${esc(e.note)}</div>` : ''}</td><td class="r">${dlt > 0 ? formatPKR(dlt) : ''}</td><td class="r">${dlt < 0 ? formatPKR(-dlt) : ''}</td><td class="r b">${formatPKR(e.balanceAfter)}</td></tr>`;
    }).join('');
    printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>Khata ${esc(name)}</title><style>
      @page{size:A4;margin:14mm}*{box-sizing:border-box;margin:0;padding:0}body{font:12px Arial,sans-serif;color:#0f172a}
      h1{font-size:20px}h2{font-size:14px;color:#475569;margin:2px 0 14px}.top{display:flex;justify-content:space-between;border-bottom:3px solid #0f766e;padding-bottom:10px;margin-bottom:12px}
      table{width:100%;border-collapse:collapse}th{background:#0f766e;color:#fff;text-align:left;padding:7px;font-size:11px}td{padding:7px;border-bottom:1px solid #e2e8f0;vertical-align:top}
      .r{text-align:right;white-space:nowrap}.b{font-weight:700}.n{color:#64748b;font-size:11px}.sum{margin-top:12px;text-align:right;font-size:16px;font-weight:700}
      .f{margin-top:24px;color:#64748b;font-size:10px;text-align:center}</style></head><body>
      <div class="top"><div><h1>${esc(shop.name)}</h1><div>${esc(shop.address ?? '')} ${esc(shop.phone ?? '')}</div></div><div style="text-align:right"><h1>Supplier khata</h1><h2>${esc(name)}</h2><div>${period ? `${period.from} — ${period.to}` : 'Shuru se aaj tak'}</div></div></div>
      <table><thead><tr><th>Tareekh</th><th>Tafseel</th><th class="r">Dena barha</th><th class="r">Diye / kam</th><th class="r">Baqi</th></tr></thead><tbody>${body}</tbody></table>
      <div class="sum">Abhi dena hai: ${formatPKR(st.supplier.outstandingDue)}</div>
      <div class="f">Nafaa POS · 0324-1772933 · nafaa.pk</div></body></html>`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="all" />
        <Button variant="secondary" size="sm" onClick={print} disabled={!st} leftIcon={<Printer className="h-4 w-4" />}>Statement print</Button>
        {st && (
          <div className="ml-auto flex flex-wrap gap-x-4 text-sm">
            <span>Barha <b className="tabular-nums text-amber-700">{formatPKR(st.totals.added)}</b></span>
            <span>Diye <b className="tabular-nums text-emerald-700">{formatPKR(st.totals.paid)}</b></span>
          </div>
        )}
      </div>
      {q.isLoading ? <div className="h-40 animate-pulse rounded-2xl bg-slate-100" /> : !rows.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Is muddat me koi entry nahi</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-slate-50 text-left text-[0.75rem] uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2">Tareekh</th><th className="px-3 py-2">Tafseel</th><th className="px-3 py-2 text-right">Dena barha</th><th className="px-3 py-2 text-right">Diye / kam</th><th className="px-3 py-2 text-right">Baqi</th><th className="w-8" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((e) => {
                const m = ledgerMeta(e.type);
                const dlt = entryDelta(e);
                const manual = !(e.type === 'PURCHASE_CREDIT' && e.reference) && !(e.type === 'PURCHASE_RETURN' && e.reference?.startsWith('PO-'));
                return (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">{day(e.entryDate)}</td>
                    <td className="px-3 py-2"><span className="font-medium text-slate-900">{m.emoji} {m.label}</span>{e.reference && <span className="ml-1 text-slate-500">· {e.reference}</span>}{e.note && <p className="text-[0.75rem] text-slate-500">{e.note}</p>}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-700">{dlt > 0 ? formatPKR(dlt) : ''}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{dlt < 0 ? formatPKR(-dlt) : ''}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatPKR(e.balanceAfter)}</td>
                    <td className="px-1">{canEdit && manual && (
                      <button type="button" aria-label="Entry hatayein" onClick={() => { if (confirm('Yeh entry hata dein?')) remove.mutate(e.id); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Bills({ supplierId }: { supplierId: string }) {
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['purchase-list', { supplierId, page }], queryFn: () => purchasesApi.page({ supplierId, page, limit: 20, status: 'all' }) });
  const d = q.data;
  if (q.isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />;
  if (!d?.items.length) return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Is supplier se abhi koi kharidari nahi</div>;
  return (
    <div className="space-y-2">
      {d.items.map((p) => (
        <Link key={p.id} to={`/purchases/${p.id}`} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 hover:border-slate-300">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">{p.purchaseNumber}<span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] ring-1', STATUS[p.status].tone)}>{STATUS[p.status].label}</span></p>
            <p className="truncate text-[0.8125rem] text-slate-500">{day(p.purchasedAt)} · {p.items.map((i) => i.itemName).slice(0, 3).join(', ')}{p.items.length > 3 ? ` +${p.items.length - 3}` : ''}</p>
          </div>
          <p className="font-semibold tabular-nums">{formatPKR(p.status === 'PENDING' ? p.total : p.receivedValue)}</p>
        </Link>
      ))}
      {d.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
          <span className="text-sm text-slate-600">{page} / {d.pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= d.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
        </div>
      )}
    </div>
  );
}

function Rates({ history }: { history: Array<{ productId: string; productName: string; unit: string; points: Array<{ date: string; costPrice: number; quantity: number }>; firstCost: number; lastCost: number; changePct: number }> }) {
  if (!history?.length) return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Rates ka record abhi nahi</div>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {history.map((h) => {
        const max = Math.max(...h.points.map((p) => p.costPrice), 1);
        const min = Math.min(...h.points.map((p) => p.costPrice));
        const up = h.changePct > 0.5;
        const down = h.changePct < -0.5;
        return (
          <div key={h.productId} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="truncate font-medium text-slate-900">{h.productName}</p><p className="text-[0.75rem] text-slate-500">{h.points.length} dafa · fi {h.unit}</p></div>
              <span className={cn('inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold', up ? 'bg-rose-50 text-rose-700' : down ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                {up ? <TrendingUp className="h-3 w-3" /> : down ? <TrendingDown className="h-3 w-3" /> : null}{h.changePct > 0 ? '+' : ''}{h.changePct.toFixed(0)}%
              </span>
            </div>
            <div className="mt-3 flex h-16 items-end gap-1" aria-hidden>
              {h.points.slice(-24).map((p, i) => (
                <div key={i} title={`${p.date}: ${formatPKR(p.costPrice)}`} className="flex-1 rounded-t bg-brand-500/70" style={{ height: `${Math.max(((p.costPrice - min * 0.9) / (max - min * 0.9 || 1)) * 100, 8)}%` }} />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[0.75rem] text-slate-500"><span>Pehli {formatPKR(h.firstCost)}</span><span>Ab {formatPKR(h.lastCost)}</span></div>
          </div>
        );
      })}
    </div>
  );
}

function DeleteModal({ id, name, onClose, onDone }: { id: string; name: string; onClose: () => void; onDone: () => void }) {
  const mut = useMutation({
    mutationFn: () => suppliersApi.remove(id),
    onSuccess: () => { toast.success('Supplier mit gaya'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi mita'),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`${name} mitayein?`} description="Jis supplier se kharidari ho chuki ya baqi ho, woh nahi mitta — use 'Badlein' se band kar dein."
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button variant="danger" loading={mut.isPending} onClick={() => mut.mutate()}>Mitayein</Button></>}>
      <p className="text-sm text-slate-600">Yeh wapas nahi hota.</p>
    </Modal>
  );
}
