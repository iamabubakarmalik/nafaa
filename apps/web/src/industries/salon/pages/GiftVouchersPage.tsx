/**
 * Gift vouchers: sell one (paid in full, its own bill in Sales), print it
 * for the customer, see what each voucher still holds and which bills it
 * paid for, and cancel a lost one. Vouchers are spent at the salon counter
 * by typing the code on the bill.
 *
 * Keys: N sell voucher · / search · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlarmClock, Ban, Filter, GraduationCap, Plus, Printer, Receipt, Ticket, Wallet } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Badge, Button, FilterBar, FilterChip, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton,
  heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { giftVouchersApi, type GiftVoucher, type VoucherStatus } from '../api/gift-vouchers.api';
import { CustomerField, emptyCustomer, type CustomerValue } from '../components/fields';
import { EmptyList, HeroPrint, ListSkeleton, LoadFailed } from '../components/ui';
import { SALON_KEYS, apiError, dateOf, dayKey } from '../lib/meta';
import { useSalonCan } from '../lib/permissions';

type Status = VoucherStatus | '';
const STATUS_LABEL: Record<VoucherStatus, string> = { ACTIVE: 'Chalu', USED: 'Poora istemal', EXPIRED: 'Muddat khatam', CANCELLED: 'Cancel' };
const STATUS_TONE: Record<VoucherStatus, 'success' | 'default' | 'warning' | 'danger'> = { ACTIVE: 'success', USED: 'default', EXPIRED: 'warning', CANCELLED: 'danger' };
const DAY = 86_400_000;

/** The slip handed to the customer. */
const voucherDoc = (v: GiftVoucher): PrintDoc => ({
  title: 'Gift voucher',
  subtitle: v.code,
  meta: [['Code', v.code], ['Amount', formatPKR(v.amount)], ...(v.expiryDate ? [['Aakhri din', dateOf(v.expiryDate)] as [string, string]] : [])],
  sections: [
    {
      kind: 'rows',
      rows: [
        { label: 'Voucher', value: formatPKR(v.amount), strong: true },
        { label: 'Baqi balance', value: formatPKR(v.balance) },
        ...(v.customer ? [{ label: 'Kis ke liye', value: v.customer.name }] : []),
      ],
    },
    { kind: 'text', text: 'Bill par ye code batayein — amount bill se kat jati hai. Thora thora kai visits me bhi istemal ho sakta hai.' },
  ],
  footer: v.sale ? `Bill ${v.sale.saleNumber}` : undefined,
});

export default function GiftVouchersPage() {
  const qc = useQueryClient();
  const can = useSalonCan();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>('ACTIVE');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selling, setSelling] = useState(false);
  const [sold, setSold] = useState<GiftVoucher | null>(null);
  const [cancel, setCancel] = useState<GiftVoucher | null>(null);
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);

  const listQ = useQuery({
    queryKey: [SALON_KEYS.vouchers, status, query],
    queryFn: () => giftVouchersApi.list({ status: status || undefined, search: query || undefined }),
    placeholderData: (p) => p,
  });
  const activeQ = useQuery({ queryKey: [SALON_KEYS.vouchers, 'ACTIVE', ''], queryFn: () => giftVouchersApi.list({ status: 'ACTIVE' }) });
  const rows = listQ.data?.items ?? [];
  const totals = activeQ.data?.totals;
  const ending = (activeQ.data?.items ?? []).filter((v) => v.expiryDate && new Date(v.expiryDate).getTime() - Date.now() < 30 * DAY);

  const cancelIt = useMutation({
    mutationFn: (v: GiftVoucher) => giftVouchersApi.cancel(v.id),
    onSuccess: (v) => { toast.success(`${v.code} cancel ho gaya`); qc.invalidateQueries({ queryKey: [SALON_KEYS.vouchers] }); setCancel(null); },
    onError: (e) => toast.error(apiError(e, 'Cancel nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && can.bill) { e.preventDefault(); setSelling(true); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const printDoc = (): PrintDoc => ({
    title: 'Gift vouchers',
    subtitle: status ? STATUS_LABEL[status] : 'Sab',
    meta: [['Vouchers', String(rows.length)], ['Baqi balance', formatPKR(rows.reduce((s, v) => s + v.balance, 0))]],
    sections: [{
      kind: 'table',
      columns: [{ label: 'Code' }, { label: 'Customer', wideOnly: true }, { label: 'Halat' }, { label: 'Aakhri din', wideOnly: true }, { label: 'Amount', align: 'right' }, { label: 'Baqi', align: 'right' }],
      rows: rows.map((v) => [v.code, v.customer?.name ?? '—', STATUS_LABEL[v.status], v.expiryDate ? dateOf(v.expiryDate) : '—', formatPKR(v.amount), formatPKR(v.balance)]),
    }],
  });

  return (
    <PageShell>
      <PageHero
        title="Gift vouchers"
        chip={<><Ticket /> Salon</>}
        meta="Voucher bechein, customer bill par code bataye — amount kat jati hai"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={activeQ.isLoading}
        actions={<>
          <HeroPrint doc={printDoc} disabled={!rows.length} />
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.bill && <button type="button" onClick={() => setSelling(true)} title="Voucher bechein (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Voucher bechein</button>}
        </>}
        stats={[
          { label: 'Chalu vouchers', value: totals?.active ?? '—' },
          { label: 'Customers ke paas', value: totals ? formatPKR(totals.balance) : '—', hint: 'Abhi istemal hona hai' },
        ]}
      />

      <KpiRow cols={3}>
        {activeQ.isLoading ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Ticket} color="#16a34a" label="Chalu" value={totals?.active ?? 0} hint={totals ? `${formatPKR(totals.sold)} ke voucher` : undefined} onClick={() => setStatus('ACTIVE')} active={status === 'ACTIVE'} />
          <KpiCard icon={Wallet} color="#0891b2" label="Baqi balance" value={formatPKR(totals?.balance ?? 0)} hint="Ye services customers ko deni hain" />
          <KpiCard icon={AlarmClock} color={ending.length ? '#d97706' : '#64748b'} label="30 din me khatam" value={ending.length} hint="Customer ko yaad dilayein" />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Code, customer ka naam ya phone…" />}
        chips={query || status !== 'ACTIVE' ? <>
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          {status !== 'ACTIVE' && <FilterChip onRemove={() => setStatus('ACTIVE')}>{status ? STATUS_LABEL[status] : 'Sab'}</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setStatus('ACTIVE'); }}>
        <FilterMenu icon={Filter} label={status ? STATUS_LABEL[status] : 'Sab'} value={status} active={status !== 'ACTIVE'} onChange={setStatus}
          options={[{ value: 'ACTIVE', label: 'Chalu' }, { value: 'USED', label: 'Poora istemal' }, { value: 'EXPIRED', label: 'Muddat khatam' }, { value: 'CANCELLED', label: 'Cancel' }, { value: '', label: 'Sab' }]} />
      </FilterBar>

      {listQ.isLoading ? <ListSkeleton /> : listQ.isError ? <LoadFailed what="Vouchers" retry={() => listQ.refetch()} /> : !rows.length ? (
        <EmptyList icon={Ticket} title={query ? 'Is search me koi voucher nahi' : 'Koi voucher nahi'} text="Eid, shaadi ya birthday ke tohfe ke liye voucher bechein. Customer counter par code bataye to bill se amount kat jati hai.">
          {can.bill && <Button onClick={() => setSelling(true)} leftIcon={<Plus className="h-4 w-4" />}>Voucher bechein</Button>}
        </EmptyList>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {rows.map((v) => <VoucherRow key={v.id} v={v} canCancel={can.bill} onCancel={() => setCancel(v)} />)}
        </ul>
      )}

      {selling && <SellModal onClose={() => setSelling(false)} onSold={(v) => { setSelling(false); setSold(v); }} />}
      {sold && (
        <Modal open onClose={() => setSold(null)} size="sm" title={`Voucher ${sold.code}`} description={`${formatPKR(sold.amount)} — bill Sales me aa gaya`}
          footer={<><Button variant="secondary" onClick={() => setSold(null)}>Theek hai</Button><PrintButton doc={() => voucherDoc(sold)} label="Voucher print" /></>}>
          <p className="rounded-2xl bg-success-50 py-6 text-center text-3xl font-bold tracking-widest text-success-800 ring-1 ring-success-100">{sold.code}</p>
          <p className="mt-3 text-[0.8125rem] text-slate-600">Ye code customer ko dein. Counter par bill me "Gift voucher code" me likhein.</p>
        </Modal>
      )}
      {cancel && (
        <Modal open onClose={() => setCancel(null)} size="sm" title={`${cancel.code} cancel karein?`}
          description="Voucher band ho jayega aur counter par nahi chalega. Paisa wapas dena ho to Sales history me is voucher ka bill void ya return karein — voucher khud cancel ho jata hai."
          footer={<><Button variant="secondary" onClick={() => setCancel(null)}>Rehne dein</Button><Button variant="danger" loading={cancelIt.isPending} onClick={() => cancelIt.mutate(cancel)} leftIcon={<Ban className="h-4 w-4" />}>Cancel karein</Button></>}>
          <p className="text-[0.875rem] text-slate-700">Baqi balance: <span className="font-semibold">{formatPKR(cancel.balance)}</span></p>
        </Modal>
      )}

      {guide.isOpen && (
        <PageGuide title="Gift vouchers — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Ticket, color: '#16a34a', title: 'Voucher bechein', text: 'Amount aur aakhri din likhein, poora paisa lein. Bill Sales me aaj ki tareekh me aata hai, aur code print kar ke customer ko dein.' },
            { icon: Receipt, color: '#db2777', title: 'Counter par', text: 'Bill me "Gift voucher code" likhein — balance dikhta hai. Poora ya thora sa istemal karein; baqi agli dafa chalta hai.' },
            { icon: Wallet, color: '#0891b2', title: 'Wapas', text: 'Voucher se paid bill void ho, ya us ki service wapas ho, to voucher ka paisa wapas voucher me aa jata hai.' },
            { icon: Printer, color: '#64748b', title: 'Print', text: 'Har voucher ka slip dobara print ho sakta hai — list me "Print" dabayein.' },
          ]}
          shortcuts={[['N', 'bechein'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function VoucherRow({ v, canCancel, onCancel }: { v: GiftVoucher; canCancel: boolean; onCancel: () => void }) {
  const [open, setOpen] = useState(false);
  const detailQ = useQuery({ queryKey: [SALON_KEYS.vouchers, 'one', v.id], queryFn: () => giftVouchersApi.getOne(v.id), enabled: open });
  const dead = v.sale && ['VOIDED', 'FULLY_RETURNED'].includes(v.sale.status);
  return (
    <li className="px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[0.9375rem] font-semibold tracking-wide text-slate-900">{v.code}</span>
            <Badge size="xs" variant={STATUS_TONE[v.status]}>{STATUS_LABEL[v.status]}</Badge>
            {dead && <Badge size="xs" variant="danger">Bill {v.sale!.status === 'VOIDED' ? 'void' : 'wapas'}</Badge>}
          </p>
          <p className="text-[0.8125rem] text-slate-600">
            {v.customer ? `${v.customer.name}${v.customer.phone ? ` · ${v.customer.phone}` : ''}` : 'Kisi ke naam nahi'} · {dateOf(v.createdAt)} ko bika
            {v.expiryDate ? ` · ${dateOf(v.expiryDate)} tak` : ''}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-success-500" style={{ width: `${v.amount ? (v.used / v.amount) * 100 : 0}%` }} /></div>
            <span className="text-[0.75rem] text-slate-600">{formatPKR(v.used)} istemal</span>
          </div>
        </div>
        <div className="text-right text-[0.8125rem]">
          <p className="font-semibold tabular-nums text-slate-900">{formatPKR(v.balance)} baqi</p>
          <p className="text-slate-500">{formatPKR(v.amount)} ka voucher</p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setOpen((x) => !x)}>{open ? 'Band' : 'Bills'}</Button>
          <PrintButton size="sm" doc={() => voucherDoc(v)} />
          {canCancel && v.status === 'ACTIVE' && <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>}
        </div>
      </div>
      {open && (
        <div className="mt-2 rounded-xl bg-slate-50 p-3 text-[0.8125rem]">
          {detailQ.isLoading ? <Skeleton className="h-8 rounded-lg" /> : !detailQ.data?.uses.length ? (
            <p className="text-slate-500">Abhi kisi bill par istemal nahi hua</p>
          ) : (
            <ul className="space-y-1">
              {detailQ.data.uses.map((u) => (
                <li key={u.saleId} className="flex justify-between gap-2">
                  <span>{u.saleNumber} · {dateOf(u.at)}{u.status === 'VOIDED' ? ' · void' : ''}</span>
                  <span className="tabular-nums">{formatPKR(u.amount)}{u.givenBack > 0 && <span className="text-success-700"> · {formatPKR(u.givenBack)} wapas</span>}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function SellModal({ onClose, onSold }: { onClose: () => void; onSold: (v: GiftVoucher) => void }) {
  const qc = useQueryClient();
  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [amount, setAmount] = useState('');
  const [until, setUntil] = useState(dayKey(new Date(Date.now() + 180 * DAY)));
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const n = Number(amount) || 0;
  const error = n < 100 ? 'Amount kam az kam Rs 100' : n > 1_000_000 ? 'Amount bohat zyada hai' : until && until < dayKey(new Date()) ? 'Aakhri din aaj ya baad ka chunein' : undefined;
  const save = useMutation({
    mutationFn: () => giftVouchersApi.sell({ amount: n, customerId: customer.customerId || undefined, expiryDate: until || undefined, paymentMethod: method }),
    onSuccess: (v) => { toast.success(`${v.code} becha gaya`); qc.invalidateQueries({ queryKey: [SALON_KEYS.vouchers] }); onSold(v); },
    onError: (e) => toast.error(apiError(e, 'Voucher nahi bika')),
  });
  return (
    <Modal open onClose={onClose} size="md" title="Gift voucher bechein" description="Poora paisa abhi lein — bill Sales me aaj ki tareekh me aata hai"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()} leftIcon={<Wallet className="h-4 w-4" />}>Bechein {n > 0 ? formatPKR(n) : ''}</Button></>}>
      <div className="space-y-3">
        <Input label="Amount" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} placeholder="5000" error={amount !== '' ? error : undefined} />
        <Input label="Aakhri din" type="date" value={until} onChange={(e) => setUntil(e.target.value)} hint="Khali chhorein to koi aakhri din nahi" />
        <CustomerField value={customer} onChange={setCustomer} compact hint="Marzi hai — jis ke liye voucher hai" />
        <PaymentMethodPicker value={method} onChange={setMethod} />
      </div>
    </Modal>
  );
}
