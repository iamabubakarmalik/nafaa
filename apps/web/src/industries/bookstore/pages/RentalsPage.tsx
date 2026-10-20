/**
 * Book rentals. Issuing takes the copy off the shelf, bills the rent and
 * puts the deposit in the drawer; returning brings it back, bills any late
 * fine out of the deposit and hands the rest back; a lost copy is billed at
 * its price. Rent and fine bills appear in Sales, the deposit in the cash
 * register, so the day book and reports match.
 *
 * Keys: N new · / search · G guide.
 */

import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, BookOpen, Clock, GraduationCap, Plus, Receipt, RotateCcw, Timer, Wallet, XCircle } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { rentalsApi, type BookRental } from '../api/rentals.api';
import { useBookFacts } from '../hooks/useBookFacts';
import { useProductCatalog } from '@modules/pos/engine';
import { KEYS, apiError, decimal, digits } from '../lib/meta';
import { ConfirmModal, EmptyBox, cardAction, cardDanger, cardLink, useDebounced, usePageKeys, useSaveKey } from '../components/ui';

type Tab = 'out' | 'late' | 'closed' | 'all';
const DAY = 86_400_000;

/** Whole days a rental is past its due date (0 when on time). */
const lateDays = (r: BookRental) => Math.max(Math.floor((Date.now() - new Date(r.dueDate).getTime()) / DAY), 0);
const isOut = (r: BookRental) => r.status === 'ACTIVE' || r.status === 'OVERDUE';
const STATUS: Record<string, { label: string; tone: string }> = {
  ACTIVE: { label: 'Bahar hai', tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  OVERDUE: { label: 'Late', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  RETURNED: { label: 'Wapas', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  LOST: { label: 'Gum', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  DAMAGED: { label: 'Kharab', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  CANCELLED: { label: 'Cancel', tone: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

export default function RentalsPage() {
  const qc = useQueryClient();
  const canUse = usePermission(PERMISSIONS.POS_USE);
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('out');
  const [issue, setIssue] = useState(false);
  const [back, setBack] = useState<BookRental | null>(null);
  const [lost, setLost] = useState<BookRental | null>(null);
  const [cancel, setCancel] = useState<BookRental | null>(null);

  const listQ = useQuery({ queryKey: [KEYS.rentals], queryFn: () => rentalsApi.list() });
  const all = useMemo(() => listQ.data ?? [], [listQ.data]);
  const out = all.filter(isOut);
  const late = out.filter((r) => lateDays(r) > 0);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = tab === 'out' ? all.filter(isOut) : tab === 'late' ? all.filter((r) => isOut(r) && lateDays(r) > 0) : tab === 'closed' ? all.filter((r) => !isOut(r)) : all;
    return base.filter((r) => !q || [r.rentalNumber, r.customerName, r.customerPhone].some((v) => v?.toLowerCase().includes(q)));
  }, [all, tab, search]);
  const deposits = out.reduce((s, r) => s + r.depositAmount, 0);
  const finesDue = late.reduce((s, r) => s + lateDays(r) * r.finePerDay, 0);

  const facts = useBookFacts();
  const { items } = useProductCatalog();
  const names = useMemo(() => new Map(items.map((i) => [i.id, i.name])), [items]);

  const refresh = () => { void qc.invalidateQueries({ queryKey: [KEYS.rentals] }); void qc.invalidateQueries({ queryKey: ['products'] }); };
  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => rentalsApi.create(body),
    onSuccess: (r) => { toast.success(`${r.rentalNumber} — kitab di gayi`); setIssue(false); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Rental nahi bani')),
  });
  const ret = useMutation({
    mutationFn: ({ r, body }: { r: BookRental; body: Record<string, unknown> }) => rentalsApi.return(r.id, body),
    onSuccess: (r) => { toast.success(r.fineAmount > 0 ? `Wapas — jurmana ${formatPKR(r.fineAmount)} deposit se kata` : 'Kitab wapas, deposit lauta dein'); setBack(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Wapsi nahi hui')),
  });
  const markLost = useMutation({
    mutationFn: (r: BookRental) => rentalsApi.markLost(r.id),
    onSuccess: () => { toast.success('Kitab gum likhi gayi — qeemat ka bill ban gaya'); setLost(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const doCancel = useMutation({
    mutationFn: (r: BookRental) => rentalsApi.cancel(r.id),
    onSuccess: () => { toast.success('Rental cancel — kitab shelf par, deposit wapas'); setCancel(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });

  usePageKeys(searchRef, canUse ? { n: () => setIssue(true) } : {});

  return (
    <PageShell>
      <PageHero
        title="Book rentals"
        chip={<><Timer /> Kiraye par kitaben</>}
        meta="Kaun si kitab kis ke paas hai, kab wapas aani hai aur kitna deposit pada hai"
        loading={listQ.isLoading}
        actions={<>
          <Link to="/sales" className={heroButton}><Receipt className="h-4 w-4" /><span className="hidden sm:inline">Bill</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canUse && <button type="button" onClick={() => setIssue(true)} title="Kitab dein (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Kitab dein</button>}
        </>}
        stats={[
          { label: 'Bahar', value: out.length },
          { label: 'Late', value: late.length },
          { label: 'Deposit pada', value: sales(deposits) },
        ]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={BookOpen} color="#0891b2" label="Bahar kitaben" value={out.reduce((s, r) => s + r.quantity, 0)} onClick={() => setTab('out')} active={tab === 'out'} />
        <KpiCard icon={AlertTriangle} color="#e11d48" label="Late" value={late.length} onClick={() => setTab('late')} active={tab === 'late'} hint="Waqt guzar gaya" />
        <KpiCard icon={Wallet} color="#16a34a" label="Deposit drawer me" value={sales(deposits)} hint="Wapsi par lautana hai" />
        <KpiCard icon={Clock} color="#d97706" label="Jurmana ban raha" value={sales(finesDue)} hint="Aaj tak ka" />
      </KpiRow>

      <ViewTabs<Tab> tabs={[
        { id: 'out', label: 'Bahar', count: out.length }, { id: 'late', label: 'Late', count: late.length },
        { id: 'closed', label: 'Band', count: all.length - out.length }, { id: 'all', label: 'Sab', count: all.length },
      ]} value={tab} onChange={setTab} />
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Rental number, naam ya phone" label="Search" />} />

      {listQ.isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-3xl" />)}</div>
        : rows.length === 0 ? (
          <EmptyBox icon={Timer} title={search ? 'Koi rental nahi mili' : tab === 'late' ? 'Koi kitab late nahi' : 'Abhi koi kitab bahar nahi'}
            text="Kitab ke editor me 'Kiraye par' laga kar hafte ka kiraya aur deposit likhein, phir yahan se kitab dein."
            action={canUse && !search && tab === 'out' ? <Button onClick={() => setIssue(true)} leftIcon={<Plus className="h-4 w-4" />}>Kitab dein</Button> : undefined} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((r) => {
              const days = isOut(r) ? lateDays(r) : 0;
              const st = days > 0 ? STATUS.OVERDUE : STATUS[r.status] ?? STATUS.ACTIVE;
              return (
                <li key={r.id} className={cn('rounded-3xl bg-white p-4 shadow-sm ring-1', days > 0 ? 'ring-rose-200' : 'ring-slate-200/80')}>
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><BookOpen className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{names.get(r.productId) ?? 'Kitab'}{r.quantity > 1 ? ` × ${r.quantity}` : ''}</p>
                      <p className="truncate text-[0.75rem] text-slate-500">{r.rentalNumber} · {[r.customerName, r.customerPhone].filter(Boolean).join(' · ') || 'Customer'}</p>
                    </div>
                    <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', st.tone)}>{st.label}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-2.5 text-center text-[0.75rem]">
                    <div><dt className="text-slate-500">Wapsi</dt><dd className="text-[0.875rem] font-bold text-slate-900">{new Date(r.dueDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</dd></div>
                    <div><dt className="text-slate-500">Deposit</dt><dd className="text-[0.875rem] font-bold tabular-nums text-slate-900">{sales(r.depositAmount)}</dd></div>
                    <div><dt className="text-slate-500">{isOut(r) ? 'Jurmana' : 'Kata'}</dt><dd className={cn('text-[0.875rem] font-bold tabular-nums', (isOut(r) ? days * r.finePerDay : r.fineAmount) > 0 ? 'text-rose-600' : 'text-slate-900')}>{sales(isOut(r) ? days * r.finePerDay : r.fineAmount)}</dd></div>
                  </dl>
                  {days > 0 && <p className="mt-2 text-[0.75rem] font-medium text-rose-600">{days} din late · {sales(r.finePerDay)} roz</p>}
                  {canUse && isOut(r) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => setBack(r)} className={cardLink}><RotateCcw className="h-3.5 w-3.5" />Wapas aayi</button>
                      <button type="button" onClick={() => setLost(r)} className={cardAction}><AlertTriangle className="h-3.5 w-3.5" />Gum</button>
                      <button type="button" onClick={() => setCancel(r)} className={`ml-auto ${cardDanger}`}><XCircle className="h-3.5 w-3.5" />Cancel</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

      <p className="hidden items-center gap-1 px-1 text-[0.75rem] text-slate-500 sm:flex">{canUse && <><Kbd>N</Kbd> kitab dein · </>}<Kbd>/</Kbd> search · <Kbd>G</Kbd> guide</p>

      {issue && <IssueModal facts={facts} names={names} pending={create.isPending} onSave={(b) => create.mutate(b)} onClose={() => setIssue(false)} />}
      {back && <ReturnModal rental={back} pending={ret.isPending} onSave={(body) => ret.mutate({ r: back, body })} onClose={() => setBack(null)} />}
      {lost && <ConfirmModal title="Kitab gum ho gayi?" text={`Kitab ki qeemat ka bill banega; pehle deposit (${formatPKR(lost.depositAmount)}) se katega, baqi customer ke khata me.`} confirm="Gum likhein" danger pending={markLost.isPending} onConfirm={() => markLost.mutate(lost)} onClose={() => setLost(null)} />}
      {cancel && <ConfirmModal title="Rental cancel karein?" text="Ghalti se di gayi kitab: shelf par wapas aur deposit lautaya jata hai. Kiraye ka bill Sales me rehta hai — wapas karna ho to wahan void karein." confirm="Cancel karein" danger pending={doCancel.isPending} onConfirm={() => doCancel.mutate(cancel)} onClose={() => setCancel(null)} />}

      {guide.isOpen && (
        <PageGuide title="Book rentals — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#0891b2', title: 'Kitab dein', text: 'Kitab, customer, din, kiraya aur deposit likhein. Kitab stock se nikalti hai, kiraye ka bill banta hai aur deposit drawer me jata hai.' },
            { icon: RotateCcw, color: '#16a34a', title: 'Wapas', text: 'Wapsi par kitab stock me aati hai. Late ho to jurmana deposit se katta hai; baqi deposit drawer se lauta dein.' },
            { icon: AlertTriangle, color: '#e11d48', title: 'Gum', text: 'Kitab na aaye to "Gum": qeemat ka bill deposit se, kam pare to khata me.' },
          ]}
          shortcuts={[['N', 'kitab dein'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function IssueModal({ facts, names, pending, onSave, onClose }: {
  facts: ReturnType<typeof useBookFacts>; names: Map<string, string>; pending: boolean; onSave: (b: Record<string, unknown>) => void; onClose: () => void;
}) {
  const rentable = useMemo(() => [...facts.values()].filter((f) => f.kind === 'BOOK' && f.isRentable && names.has(f.productId)), [facts, names]);
  const [productId, setProductId] = useState('');
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim(), 250);
  const custQ = useQuery({ queryKey: ['customers', 'rental-pick', term], queryFn: () => customersApi.list({ search: term, limit: 8 }), enabled: term.length >= 2 });
  const [customer, setCustomer] = useState<{ id: string; name: string; phone?: string | null } | null>(null);
  const [v, setV] = useState({ name: '', phone: '', cnic: '', weeks: '2', rent: '', deposit: '', fine: '50', qty: '1', method: 'CASH', note: '' });
  const set = (p: Partial<typeof v>) => setV((x) => ({ ...x, ...p }));
  const [tried, setTried] = useState(false);

  const pick = (id: string) => {
    setProductId(id);
    const f = facts.get(id);
    if (f?.kind === 'BOOK') set({ rent: String((f.rentalPricePerWeek || 0) * (Number(v.weeks) || 1)), deposit: String(f.rentalDeposit || 0) });
  };
  const weeks = Math.max(Number(v.weeks) || 1, 1);
  const errors = {
    product: !productId ? 'Kitab chunein' : undefined,
    customer: !customer && !v.name.trim() ? 'Customer chunein ya naam likhein' : undefined,
    rent: !(Number(v.rent) >= 0) ? 'Kiraya sahi likhein' : undefined,
  };
  const submit = () => {
    setTried(true);
    if (Object.values(errors).some(Boolean) || pending) return;
    onSave({
      productId, customerId: customer?.id, customerName: customer?.name ?? v.name.trim(), customerPhone: customer?.phone ?? (v.phone.trim() || undefined),
      customerCnic: v.cnic.trim() || undefined, quantity: Number(v.qty) || 1, rentalDays: weeks * 7, rentalPrice: Number(v.rent) || 0,
      depositAmount: Number(v.deposit) || 0, finePerDay: Number(v.fine) || 0, paymentMethod: v.method, notes: v.note.trim() || undefined,
    });
  };
  useSaveKey(submit);
  return (
    <Modal open onClose={onClose} size="lg" title="Kitab kiraye par dein" description="Ctrl+S se save"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={submit} loading={pending}>Kitab dein — {formatPKR((Number(v.rent) || 0) + (Number(v.deposit) || 0))} lein</Button></>}>
      <div className="space-y-4">
        <Select label="Kitab" required value={productId} onChange={(e) => pick(e.target.value)} placeholder={rentable.length ? 'Chunein' : 'Koi kitab kiraye wali nahi'} error={tried ? errors.product : undefined}
          options={rentable.map((f) => ({ value: f.productId, label: names.get(f.productId) ?? f.productId }))} hint="Kitab ke editor me 'Kiraye par' lagi kitaben" />
        {customer ? (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
            <span className="text-[0.875rem] font-medium">{customer.name}{customer.phone ? ` · ${customer.phone}` : ''}</span>
            <button type="button" onClick={() => setCustomer(null)} className="text-[0.8125rem] font-semibold text-brand-700">Badlein</button>
          </div>
        ) : (
          <div>
            <Input label="Customer dhoondein" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Naam ya phone" error={tried ? errors.customer : undefined} hint="Na mile to neeche naam aur phone likhein" />
            {(custQ.data?.items ?? []).length > 0 && (
              <ul className="mt-1 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                {(custQ.data?.items ?? []).map((c) => (
                  <li key={c.id}><button type="button" onClick={() => { setCustomer({ id: c.id, name: c.name, phone: c.phone }); setQ(''); }} className="w-full px-3 py-2 text-left text-[0.875rem] hover:bg-slate-50">{c.name}{c.phone ? ` · ${c.phone}` : ''}</button></li>
                ))}
              </ul>
            )}
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Input label="Naam" value={v.name} onChange={(e) => set({ name: e.target.value })} />
              <Input label="Phone" inputMode="tel" value={v.phone} onChange={(e) => set({ phone: e.target.value })} />
              <Input label="CNIC" value={v.cnic} onChange={(e) => set({ cnic: e.target.value })} placeholder="Marzi hai" />
            </div>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="Kitne hafte" inputMode="numeric" value={v.weeks} onChange={(e) => {
            const w = digits(e.target.value);
            const f = facts.get(productId);
            set({ weeks: w, ...(f?.kind === 'BOOK' && f.rentalPricePerWeek ? { rent: String(f.rentalPricePerWeek * Math.max(Number(w) || 1, 1)) } : {}) });
          }} />
          <Input label="Kiraya" inputMode="decimal" value={v.rent} onChange={(e) => set({ rent: decimal(e.target.value) })} error={errors.rent} hint="Abhi liya jata hai" />
          <Input label="Deposit" inputMode="decimal" value={v.deposit} onChange={(e) => set({ deposit: decimal(e.target.value) })} hint="Wapsi par lautega" />
          <Input label="Jurmana / din" inputMode="decimal" value={v.fine} onChange={(e) => set({ fine: decimal(e.target.value) })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Adad" inputMode="numeric" value={v.qty} onChange={(e) => set({ qty: digits(e.target.value) })} />
          <Select label="Kiraya kaise" value={v.method} onChange={(e) => set({ method: e.target.value })} options={[{ value: 'CASH', label: 'Cash' }, { value: 'CARD', label: 'Card' }, { value: 'BANK_TRANSFER', label: 'Bank / wallet' }]} hint="Deposit hamesha cash drawer me" />
          <Input label="Note" value={v.note} onChange={(e) => set({ note: e.target.value })} placeholder="Kitab ki haalat" />
        </div>
      </div>
    </Modal>
  );
}

function ReturnModal({ rental, pending, onSave, onClose }: { rental: BookRental; pending: boolean; onSave: (b: Record<string, unknown>) => void; onClose: () => void }) {
  const days = lateDays(rental);
  const fine = days * rental.finePerDay;
  const [waive, setWaive] = useState(false);
  const [condition, setCondition] = useState('Theek');
  const [notes, setNotes] = useState('');
  const charged = waive ? 0 : fine;
  const back = Math.max(rental.depositAmount - charged, 0);
  const owed = Math.max(charged - rental.depositAmount, 0);
  const submit = () => !pending && onSave({ conditionOnReturn: condition, damageNotes: notes.trim() || undefined, waiveFine: waive });
  useSaveKey(submit);
  return (
    <Modal open onClose={onClose} size="md" title={`${rental.rentalNumber} — wapsi`} description={rental.customerName ?? undefined}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={submit} loading={pending}>Wapas lein</Button></>}>
      <div className="space-y-4">
        <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center text-[0.8125rem]">
          <div><dt className="text-slate-500">Late</dt><dd className="font-bold">{days} din</dd></div>
          <div><dt className="text-slate-500">Jurmana</dt><dd className={cn('font-bold tabular-nums', charged > 0 && 'text-rose-600')}>{formatPKR(charged)}</dd></div>
          <div><dt className="text-slate-500">Deposit wapas</dt><dd className="font-bold tabular-nums text-emerald-700">{formatPKR(back)}</dd></div>
        </dl>
        {owed > 0 && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">Jurmana deposit se {formatPKR(owed)} zyada — ye customer ke khata me jayega.</p>}
        {fine > 0 && (
          <label className="flex items-center gap-2 text-[0.875rem]"><input type="checkbox" checked={waive} onChange={(e) => setWaive(e.target.checked)} className="h-4 w-4 rounded" />Jurmana maaf karein</label>
        )}
        <Select label="Kitab ki haalat" value={condition} onChange={(e) => setCondition(e.target.value)} options={['Theek', 'Thori kharab', 'Bohat kharab'].map((x) => ({ value: x, label: x }))} />
        <Input label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Safha phata, cover kharab" />
      </div>
    </Modal>
  );
}
