/**
 * Invoices: bills sent to shops for their plan or anything else. Create an
 * invoice, mark it paid by hand, or void it. Search and filters run on the
 * server.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Download, FilePlus2, Lightbulb, Plus, Receipt, Send, Wallet, XCircle } from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, Input, Modal, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, ViewTabs, confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminInvoicesApi, type AdminInvoice } from '@/api/admin-invoices.api';
import { formatDate, formatPKR } from '@/lib/format';
import { ListCard, StatusBadge, downloadCsv, fetchAllPages, statusLabel, useListParams } from '@/ui';
import { PERIOD_DEFAULTS, clearPeriod, periodChip, periodQuery, periodValue, setPeriod } from '../../shared/period';
import { ShopPicker, type PickedShop } from '../../shared/ShopPicker';

const TABS = ['ALL', 'PENDING', 'OVERDUE', 'PAID', 'CANCELLED'] as const;
type Tab = (typeof TABS)[number];
const num = (n: number) => n.toLocaleString('en-PK');

export default function InvoicesPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const [creating, setCreating] = useState(false);

  const list = useListParams({ tab: 'ALL', ...PERIOD_DEFAULTS });
  const { tab } = list.filters;
  const range = periodChip(list.filters);
  const query = {
    search: list.debouncedSearch || undefined,
    status: tab === 'ALL' || tab === 'OVERDUE' ? undefined : tab,
    overdue: tab === 'OVERDUE' ? true : undefined,
    ...periodQuery(list.filters),
  };

  const invoices = useQuery({
    queryKey: ['admin', 'invoices', query, list.page, list.limit],
    queryFn: () => adminInvoicesApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const stats = useQuery({ queryKey: ['admin', 'invoices', 'stats'], queryFn: adminInvoicesApi.stats, staleTime: 30_000 });
  const s = stats.data;
  const rows = invoices.data?.items ?? [];

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'invoices'] });
  const fail = (e: any) => toast.error(e?.response?.data?.message || 'Something went wrong');
  const markPaid = useMutation({ mutationFn: (id: string) => adminInvoicesApi.markPaid(id), onSuccess: () => { toast.success('Marked as paid'); refresh(); }, onError: fail });
  const voidInv = useMutation({ mutationFn: adminInvoicesApi.voidInvoice, onSuccess: () => { toast.success('Invoice voided'); refresh(); }, onError: fail });

  const onMarkPaid = async (i: AdminInvoice) => {
    if (await confirmDialog({ title: `Mark ${i.invoiceNumber} as paid?`, text: `${formatPKR(i.amountDue)} from ${i.tenant.name} is recorded as received.`, yes: 'Mark paid' })) markPaid.mutate(i.id);
  };
  const onVoid = async (i: AdminInvoice) => {
    if (await confirmDialog({ title: `Void ${i.invoiceNumber}?`, text: 'The shop no longer has to pay this invoice.', yes: 'Void invoice', danger: true })) voidInv.mutate(i.id);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages((page) => adminInvoicesApi.list({ ...query, page, limit: 100 }));
      downloadCsv<AdminInvoice>('invoices', all, [
        { label: 'Invoice', value: (i) => i.invoiceNumber },
        { label: 'Shop', value: (i) => i.tenant.name },
        { label: 'Description', value: (i) => i.description },
        { label: 'Total', value: (i) => i.total },
        { label: 'Paid', value: (i) => i.amountPaid },
        { label: 'Due', value: (i) => i.amountDue },
        { label: 'Status', value: (i) => i.status },
        { label: 'Due date', value: (i) => i.dueDate.slice(0, 10) },
        { label: 'Created', value: (i) => i.createdAt.slice(0, 10) },
      ]);
      toast.success(`${num(all.length)} invoices exported`);
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const chips = range ? [<FilterChip key="d" onRemove={() => clearPeriod(list)}>{range}</FilterChip>] : [];

  return (
    <PageShell>
      <PageHero
        title="Invoices"
        chip={s ? `${num(s.openCount)} open` : undefined}
        busy={invoices.isFetching}
        loading={stats.isLoading}
        actions={
          <>
            <button type="button" className={heroPrimaryButton} onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Create invoice</button>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting}><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={s ? [
          { label: 'Waiting to be paid', value: formatPKR(s.openAmount), hint: `${num(s.openCount)} invoices` },
          { label: 'Overdue', value: formatPKR(s.overdueAmount), hint: `${num(s.overdueCount)} invoices` },
          { label: 'Paid this month', value: formatPKR(s.paidThisMonth) },
          { label: 'Paid, all time', value: num(s.paidCount), hint: 'invoices' },
        ] : undefined}
      />

      <ViewTabs
        tabs={TABS.map((t) => ({ id: t, label: t === 'ALL' ? 'All' : statusLabel(t), count: s ? (t === 'PENDING' ? s.openCount : t === 'OVERDUE' ? s.overdueCount : null) : null }))}
        value={tab as Tab}
        onChange={(v) => list.setFilter('tab', v)}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search invoice number, shop or description" />}
        chips={chips.length ? chips : undefined}
        onClear={() => clearPeriod(list)}
      >
        <DateRangeMenu value={periodValue(list.filters)} onChange={(v) => setPeriod(list, v)} startHour={0} label="Created" />
      </FilterBar>

      <ListCard
        loading={invoices.isLoading}
        empty={!rows.length}
        emptyIcon={<Receipt className="h-6 w-6" />}
        emptyTitle="No invoices match"
        emptyText="Create an invoice to bill a shop, or change the filters."
        emptyAction={<Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Create invoice</Button>}
        page={list.page} limit={list.limit} total={invoices.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="56rem">
          <THead><Tr><Th>Invoice</Th><Th>Shop</Th><Th>For</Th><Th align="right">Total</Th><Th align="right">Due</Th><Th>Status</Th><Th>Due date</Th><Th align="right"><span className="sr-only">Actions</span></Th></Tr></THead>
          <TBody>
            {rows.map((i) => {
              const late = i.status === 'PENDING' && new Date(i.dueDate).getTime() < Date.now();
              return (
                <Tr key={i.id}>
                  <Td className="font-mono text-[0.8125rem] font-semibold text-slate-900">{i.invoiceNumber}</Td>
                  <Td><Link to={`/tenants/${i.tenant.id}`} className="font-medium text-slate-900 hover:text-brand-700">{i.tenant.name}</Link></Td>
                  <Td className="max-w-[16rem] truncate text-slate-600">{i.description || i.subscription?.plan.name || '—'}</Td>
                  <Td align="right">{formatPKR(i.total)}</Td>
                  <Td align="right"><span className={i.amountDue > 0 ? 'font-semibold text-amber-700' : 'text-slate-400'}>{formatPKR(i.amountDue)}</span></Td>
                  <Td><StatusBadge value={late ? 'OVERDUE' : i.status} /></Td>
                  <Td className="whitespace-nowrap text-slate-600">{formatDate(i.dueDate)}</Td>
                  <Td align="right">
                    {i.status === 'PENDING' && (
                      <div className="inline-flex gap-1">
                        <Button size="xs" variant="success" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => onMarkPaid(i)}>Mark paid</Button>
                        <Button size="xs" variant="critical" leftIcon={<XCircle className="h-3.5 w-3.5" />} onClick={() => onVoid(i)}>Void</Button>
                      </div>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      </ListCard>

      {creating && <CreateModal onClose={() => setCreating(false)} onDone={refresh} />}

      {guide.isOpen && (
        <PageGuide
          title="Invoices"
          description="Bills for shops. Most come from plan renewals; you can also create one by hand."
          flowTitle="How an invoice is settled"
          flow={[
            { label: 'Invoice created', icon: FilePlus2, color: '#4f46e5' },
            { label: 'Shop is told', hint: 'In their app', icon: Send, color: '#0284c7' },
            { label: 'Shop pays', hint: 'See Payment approvals', icon: Wallet, color: '#d97706' },
            { label: 'Paid', icon: CheckCircle2, color: '#059669' },
          ]}
          steps={[
            { icon: Plus, color: '#4f46e5', title: 'Create', text: 'Pick a shop, enter the amount, what it is for and the due date. The shop gets a notice.' },
            { icon: CheckCircle2, color: '#059669', title: 'Mark paid', text: 'If a shop paid you outside Nafaa, mark the invoice paid by hand.' },
            { icon: AlertTriangle, color: '#e11d48', title: 'Void', text: 'Void an invoice the shop should not pay any more. This cannot be undone.' },
          ]}
          tips={['Overdue means still unpaid after the due date.', 'Payments uploaded by shops are approved on the Payment approvals page.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

function CreateModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [shop, setShop] = useState<PickedShop | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const create = useMutation({
    mutationFn: adminInvoicesApi.create,
    onSuccess: () => { toast.success('Invoice created'); onDone(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Could not create the invoice'),
  });
  const submit = () => {
    if (!shop) return toast.error('Pick a shop');
    if (!Number(amount) || Number(amount) <= 0) return toast.error('Enter an amount');
    if (!description.trim()) return toast.error('Write what the invoice is for');
    if (!dueDate) return toast.error('Pick a due date');
    create.mutate({ tenantId: shop.id, amount: Number(amount), description: description.trim(), notes: notes || undefined, dueDate });
  };
  return (
    <Modal open onClose={onClose} title="Create invoice" description="The shop gets a notice with a link to pay."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={create.isPending}>Create invoice</Button></>}>
      <div className="space-y-4">
        <ShopPicker value={shop} onChange={setShop} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Amount (PKR)" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <Input label="What is it for" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="For example: Pro plan, 3 months" />
        <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}
