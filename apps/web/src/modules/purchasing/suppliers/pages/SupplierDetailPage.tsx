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
  Banknote, BookOpen, ClipboardList, GraduationCap, Landmark, MessageCircle, Pencil, Phone, ShoppingCart, Trash2, TrendingDown, TrendingUp,
} from 'lucide-react';
import { Avatar, Button, Card as DsCard, DateRangeMenu, Modal, PageHero, PageShell, Table, TBody, THead, Td, Th, Tr, Tabs, heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue, confirmDialog } from '@/design-system/components';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { PAYMENT_COLORS, PAYMENT_LABELS, useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { SupplierDetail } from '../api/suppliers.api';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { PrintButton } from '@core/print';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { statementDoc } from '../../print';
import { purchasesApi } from '../../purchases/api/purchases.api';
import { STATUS } from '../../purchases/pages/PurchasesListPage';
import { suppliersApi } from '../api/suppliers.api';
import { entryDelta, ledgerMeta, supplierLedgerApi } from '../api/supplier-ledger.api';
import { SupplierMoneyModal, type MoneyKind } from '../components/SupplierMoneyModal';
import { t as tr } from '@core/i18n';

type Tab = 'khata' | 'bills' | 'rates' | 'analytics' | 'info';
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
  const guide = usePageGuide();
  const q = useQuery({ queryKey: ['supplier', id], queryFn: () => suppliersApi.getOne(id!), enabled: !!id });
  const s = q.data;

  if (q.isLoading) return <div className="flex justify-center py-24"><div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /></div>;
  if (!s) return <div className="py-20 text-center"><p className="font-semibold text-slate-900">{tr('Supplier nahi mila')}</p><Button className="mt-4" variant="secondary" onClick={() => navigate('/suppliers')}>{tr('Wapas')}</Button></div>;

  const phone = (s.phone ?? '').replace(/\D/g, '').replace(/^0/, '92');
  const since = s.ledger.daysSincePayment;

  return (
    <PageShell>
      <PageHero
        back="/suppliers"
        backLabel={tr('Suppliers par wapas')}
        title={<span className="inline-flex min-w-0 items-center gap-2.5"><Avatar name={s.name} url={s.logoUrl ?? undefined} size={36} className="shrink-0 ring-2 ring-white/40" /><span className="truncate">{s.name}</span></span>}
        chip={!s.isActive ? tr('Band') : undefined}
        subtitle={<>{[s.contactPerson, s.phone, s.city].filter(Boolean).join(' · ') || tr('Rabta darj nahi')}{s.paymentTerms && <span className="text-white/60"> {' '}{tr('· Shart: {{paymentTerms}}', { paymentTerms: s.paymentTerms })}</span>}</>}
        actions={<>
          {canEdit && <button type="button" onClick={() => setMoney('payment')} className={heroPrimaryButton}><Banknote className="h-4 w-4" /> {' '}{tr('Payment')}</button>}
          {canBuy && <button type="button" onClick={() => navigate(`/purchases/new?supplier=${s.id}`)} className={heroButton}><ShoppingCart className="h-4 w-4" /> {' '}{tr('Purchase')}</button>}
          {canBuy && <button type="button" onClick={() => navigate(`/purchases/new?order=1&supplier=${s.id}`)} className={heroButton}><ClipboardList className="h-4 w-4" /> {' '}{tr('Order')}</button>}
          {s.phone && <a href={`tel:${s.phone}`} className={heroButton}><Phone className="h-4 w-4" /> {' '}{tr('Call')}</a>}
          {s.phone && <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className={heroButton}><MessageCircle className="h-4 w-4" /> {' '}{tr('WhatsApp')}</a>}
          {canEdit && <button type="button" onClick={() => setMoney('due')} className={heroButton}><BookOpen className="h-4 w-4" /> {' '}{tr('Khata entry')}</button>}
          {canEdit && <Link to={`/suppliers/${s.id}/edit`} className={heroButton}><Pencil className="h-4 w-4" /> {' '}{tr('Badlein')}</Link>}
          <button type="button" onClick={guide.open} title={tr('Guide')} aria-label={tr('Guide')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: tr('Dena hai'), value: formatPKR(s.outstandingDue), hint: s.outstandingDue > 0 && since != null ? <span className={since > 60 ? 'text-amber-200' : undefined}>{tr('aakhri payment {{since}} din pehle', { since })}</span> : undefined },
          { label: tr('Kul purchase'), value: formatPKR(s.stats.totalAmount), hint: tr('{{totalPurchases}} bill', { totalPurchases: s.stats.totalPurchases }) },
          { label: tr('Kul diye'), value: formatPKR(s.ledger.paymentsMade + s.stats.totalPaid) },
          { label: tr('Aksar bill'), value: formatPKR(s.stats.averagePurchase) },
          { label: tr('Aakhri maal'), value: s.stats.daysSinceLastPurchase == null ? '—' : tr('{{daysSinceLastPurchase}} din pehle', { daysSinceLastPurchase: s.stats.daysSinceLastPurchase }) },
        ]}
      />

      <Tabs value={tab} onChange={setTab} label={tr('Supplier')}
        items={[{ value: 'khata', label: tr('Khata') }, { value: 'bills', label: tr('Purchase'), count: s._count.purchases }, { value: 'rates', label: tr('Rates') }, { value: 'analytics', label: tr('Analytics') }, { value: 'info', label: tr('Details') }]} />

      {tab === 'khata' && <Khata supplierId={s.id} name={s.name} canEdit={canEdit} />}
      {tab === 'bills' && <Bills supplierId={s.id} />}
      {tab === 'rates' && <Rates history={s.priceHistory} />}
      {tab === 'analytics' && <Analytics s={s} />}
      {tab === 'info' && (
        <div className="grid gap-3 md:grid-cols-2">
          <Card title={tr('Rabta')}>
            <KV k={tr('Rabta')} v={s.contactPerson} /><KV k={tr('Phone')} v={s.phone} /><KV k={tr('Doosra phone')} v={s.altPhone} /><KV k={tr('Email')} v={s.email} />
            <KV k={tr('Pata')} v={[s.address, s.area, s.city].filter(Boolean).join(', ')} /><KV k={tr('CNIC')} v={s.cnic} /><KV k={tr('NTN')} v={s.ntn} />
          </Card>
          <Card title={tr('Bank')} icon={<Landmark className="h-4 w-4" />}>
            <KV k={tr('Bank')} v={s.bankName} /><KV k={tr('Account #')} v={s.accountNumber} mono /><KV k={tr('IBAN')} v={s.iban} mono />
            <KV k={tr('Shart')} v={s.paymentTerms} />
            {s.notes && <p className="mt-2 border-t border-slate-100 pt-2 text-[0.8125rem] text-slate-600">{s.notes}</p>}
          </Card>
          {canEdit && (
            <div className="md:col-span-2">
              <Button variant="secondary" onClick={() => setDeleting(true)} leftIcon={<Trash2 className="h-4 w-4 text-rose-600" />}>{tr('Supplier mitayein')}</Button>
            </div>
          )}
        </div>
      )}

      {guide.isOpen && (
        <PageGuide title={tr('{{name}} — kya kya hota hai', { name: s.name })} onClose={guide.close}
          steps={[
            { icon: Banknote, color: '#16a34a', title: tr('Payment'), text: tr('"Payment" se supplier ko diya paisa darj karein — cash, bank ya JazzCash. Dena utna kam ho jata hai aur cash register me bhi aata hai.') },
            { icon: BookOpen, color: '#2563eb', title: tr('Khata'), text: tr('Har entry date ke saath: maal liya, paisa diya, maal wapas, correction. "Baqi" khane me har entry ke baad ka hisaab.') },
            { icon: ShoppingCart, color: '#d97706', title: tr('Purchase aur order'), text: tr('Yahin se is supplier ka naya bill ya order — supplier pehle se chuna hota hai.') },
            { icon: TrendingUp, color: '#db2777', title: tr('Rates'), text: tr('Har cheez ki qeemat har dafa kitni thi — mehngi ho rahi ho to laal nishan.') },
          ]}
          tips={[tr('Haath se ki gayi entry ghalat ho to khate me us ke aage 🗑 se hata sakte hain; bill wali entries bill se hi badalti hain.'), tr('"Khata entry" se purana hisaab, bagair bill ka udhaar ya correction bhi darj hoti hai.'), tr('Statement print se A4, PDF ya thermal — supplier ko WhatsApp par bhej kar hisaab milayein.')]}
          shortcuts={[['G', tr('guide')]]}
        />
      )}
      {money && <SupplierMoneyModal supplier={s} initial={money} onClose={() => setMoney(null)} />}
      {deleting && <DeleteModal id={s.id} name={s.name} onClose={() => setDeleting(false)} onDone={() => { qc.invalidateQueries({ queryKey: ['suppliers'] }); navigate('/suppliers'); }} />}
    </PageShell>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <DsCard className="rounded-2xl" title={<span className="flex items-center gap-1.5">{icon}{title}</span>}>{children}</DsCard>;
}
function KV({ k, v, mono }: { k: string; v?: string | null; mono?: boolean }) {
  return <div className="flex justify-between gap-3 border-t border-slate-50 py-1.5 text-sm first:border-0"><span className="text-slate-500">{k}</span><span className={cn('text-end text-slate-900', mono && 'font-mono')}>{v || '—'}</span></div>;
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
    onSuccess: () => { toast.success(tr('Entry hata di')); ['supplier', 'supplier-statement', 'suppliers'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e: any) => toast.error(e?.response?.data?.message || tr('Nahi hata')),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="all" />
        <PrintButton size="sm" label={tr('Statement')} disabled={!st} doc={() => statementDoc(st!, period ? `${period.from} — ${period.to}` : tr('Shuru se aaj tak'))} />
        {st && (
          <div className="ms-auto flex flex-wrap gap-x-4 text-sm">
            <span>{tr('Barha')}{' '} <b className="tabular-nums text-amber-700">{formatPKR(st.totals.added)}</b></span>
            <span>{tr('Diye')}{' '} <b className="tabular-nums text-success-700">{formatPKR(st.totals.paid)}</b></span>
          </div>
        )}
      </div>
      {q.isLoading ? <div className="h-40 animate-pulse rounded-2xl bg-slate-100" /> : !rows.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">{tr('Is period me koi entry nahi')}</div>
      ) : (
        <DsCard flush className="overflow-hidden rounded-2xl">
          <Table minWidth="40rem">
            <THead>
              <Tr><Th className="px-3 py-2">{tr('Date')}</Th><Th className="px-3 py-2">{tr('Details')}</Th><Th align="right" className="px-3 py-2">{tr('Dena barha')}</Th><Th align="right" className="px-3 py-2">{tr('Diye / kam')}</Th><Th align="right" className="px-3 py-2">{tr('Baqi')}</Th><Th className="w-8 px-0" /></Tr>
            </THead>
            <TBody>
              {rows.map((e) => {
                const m = ledgerMeta(e.type);
                const dlt = entryDelta(e);
                const manual = !(e.type === 'PURCHASE_CREDIT' && e.reference) && !(e.type === 'PURCHASE_RETURN' && e.reference?.startsWith('PO-'));
                return (
                  <Tr key={e.id}>
                    <Td className="whitespace-nowrap px-3 py-2 text-slate-600">{day(e.entryDate)}</Td>
                    <Td className="px-3 py-2"><span className="font-medium text-slate-900">{m.emoji} {m.label}</span>{e.reference && <span className="ms-1 text-slate-500">· {e.reference}</span>}{e.note && <p className="text-[0.75rem] text-slate-500">{tr(e.note)}</p>}</Td>
                    <Td align="right" className="px-3 py-2 text-amber-700">{dlt > 0 ? formatPKR(dlt) : ''}</Td>
                    <Td align="right" className="px-3 py-2 text-success-700">{dlt < 0 ? formatPKR(-dlt) : ''}</Td>
                    <Td align="right" className="px-3 py-2 font-semibold text-slate-900">{formatPKR(e.balanceAfter)}</Td>
                    <Td className="px-1">{canEdit && manual && (
                      <button type="button" aria-label={tr('Entry hatayein')} onClick={async () => { if ((await confirmDialog({ title: tr('Yeh entry hata dein?'), danger: true }))) remove.mutate(e.id); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}</Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </DsCard>
      )}
    </div>
  );
}

function Bills({ supplierId }: { supplierId: string }) {
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['purchase-list', { supplierId, page }], queryFn: () => purchasesApi.page({ supplierId, page, limit: 20, status: 'all' }) });
  const d = q.data;
  if (q.isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />;
  if (!d?.items.length) return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">{tr('Is supplier se abhi koi purchase nahi')}</div>;
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
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>{tr('Pichla')}</Button>
          <span className="text-sm text-slate-600">{page} / {d.pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= d.pages} onClick={() => setPage((x) => x + 1)}>{tr('Agla')}</Button>
        </div>
      )}
    </div>
  );
}

function Rates({ history }: { history: Array<{ productId: string; productName: string; unit: string; points: Array<{ date: string; costPrice: number; quantity: number }>; firstCost: number; lastCost: number; changePct: number }> }) {
  if (!history?.length) return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">{tr('Rates ka record abhi nahi')}</div>;
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
              <div className="min-w-0"><p className="truncate font-medium text-slate-900">{h.productName}</p><p className="text-[0.75rem] text-slate-500">{tr('{{count}} dafa · fi {{unit}}', { count: h.points.length, unit: h.unit })}</p></div>
              <span className={cn('inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold', up ? 'bg-rose-50 text-rose-700' : down ? 'bg-success-50 text-success-700' : 'bg-slate-100 text-slate-600')}>
                {up ? <TrendingUp className="h-3 w-3" /> : down ? <TrendingDown className="h-3 w-3" /> : null}{h.changePct > 0 ? '+' : ''}{h.changePct.toFixed(0)}%
              </span>
            </div>
            <div className="mt-3 flex h-16 items-end gap-1" aria-hidden>
              {h.points.slice(-24).map((p, i) => (
                <div key={i} title={`${p.date}: ${formatPKR(p.costPrice)}`} className="flex-1 rounded-t bg-brand-500/70" style={{ height: `${Math.max(((p.costPrice - min * 0.9) / (max - min * 0.9 || 1)) * 100, 8)}%` }} />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[0.75rem] text-slate-500"><span>{tr('Pehli {{firstCost}}', { firstCost: formatPKR(h.firstCost) })}</span><span>{tr('Ab {{lastCost}}', { lastCost: formatPKR(h.lastCost) })}</span></div>
          </div>
        );
      })}
    </div>
  );
}

function DeleteModal({ id, name, onClose, onDone }: { id: string; name: string; onClose: () => void; onDone: () => void }) {
  const mut = useMutation({
    mutationFn: () => suppliersApi.remove(id),
    onSuccess: () => { toast.success(tr('Supplier mit gaya')); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || tr('Nahi mita')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={tr('{{name}} mitayein?', { name })} description={tr('Jis supplier se purchase ho chuki ya baqi ho, woh nahi mitta — use \'Badlein\' se band kar dein.')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button variant="danger" loading={mut.isPending} onClick={() => mut.mutate()}>{tr('Mitayein')}</Button></>}>
      <p className="text-sm text-slate-600">{tr('Yeh wapas nahi hota.')}</p>
    </Modal>
  );
}

function Analytics({ s }: { s: SupplierDetail }) {
  const theme = useChartTheme();
  const tip = theme.tooltip;
  const top = (s.topProducts ?? []) as Array<{ productId: string; product?: { name: string; unit: string }; quantity: number; total: number; orderCount: number }>;
  return (
    <div className="space-y-4">
      <DsCard className="rounded-2xl" title={tr('12 mahine — purchase aur payment')}>
        <div className="h-[16.25rem]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={s.months12} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} />
              <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
              <Tooltip formatter={(v, n) => [formatPKR(Number(v)), n]} {...tip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="total" name="Kharidari" fill={theme.primary} radius={[6, 6, 0, 0]} />
              <Bar dataKey="paid" name="Diye" fill={theme.profit} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DsCard>
      <div className="grid gap-4 lg:grid-cols-3">
        <DsCard className="rounded-2xl lg:col-span-2" title={tr('Pichle 30 din')}>
          <div className="h-[13.75rem]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={s.trend30Days} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <defs><linearGradient id="sup-30" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={theme.primary} stopOpacity={0.3} /><stop offset="100%" stopColor={theme.primary} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="date" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={16} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip formatter={(v) => [formatPKR(Number(v)), tr('Purchase')]} {...tip} />
                <Area type="monotone" dataKey="total" stroke={theme.primary} strokeWidth={2.25} fill="url(#sup-30)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DsCard>
        <DsCard className="rounded-2xl" title={tr('Payment kaise ki')}>
          {!s.paymentBreakdown.length ? <p className="py-10 text-center text-sm text-slate-500">{tr('Abhi koi payment nahi')}</p> : (
            <>
              <div className="h-[9.375rem]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={s.paymentBreakdown} dataKey="total" nameKey="paymentMethod" innerRadius={42} outerRadius={64} paddingAngle={2} stroke="none">
                      {s.paymentBreakdown.map((p) => <Cell key={p.paymentMethod} fill={PAYMENT_COLORS[p.paymentMethod] ?? '#64748b'} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [formatPKR(Number(v)), PAYMENT_LABELS[String(n)] ?? n]} {...tip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1 text-[0.8125rem]">
                {s.paymentBreakdown.map((p) => (
                  <li key={p.paymentMethod} className="flex justify-between"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PAYMENT_COLORS[p.paymentMethod] ?? '#64748b' }} />{PAYMENT_LABELS[p.paymentMethod] ?? p.paymentMethod}</span><span className="tabular-nums">{formatPKR(p.total)}</span></li>
                ))}
              </ul>
            </>
          )}
        </DsCard>
      </div>
      <DsCard className="rounded-2xl" title={tr('Is supplier se sab se zyada liya')}>
        {!top.length ? <p className="py-10 text-center text-sm text-slate-500">{tr('Abhi koi purchase nahi')}</p> : (
          <ul className="divide-y divide-slate-100">
            {top.map((t) => (
              <li key={t.productId} className="flex justify-between gap-2 py-2 text-sm">
                <span className="min-w-0"><span className="block truncate font-medium text-slate-900">{t.product?.name ?? '—'}</span><span className="text-[0.75rem] text-slate-500">{tr('{{value}} {{value2}} · {{orderCount}} bill', { value: Number(t.quantity.toFixed(2)), value2: t.product?.unit ?? '', orderCount: t.orderCount })}</span></span>
                <span className="shrink-0 font-semibold tabular-nums">{formatPKR(t.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </DsCard>
    </div>
  );
}
