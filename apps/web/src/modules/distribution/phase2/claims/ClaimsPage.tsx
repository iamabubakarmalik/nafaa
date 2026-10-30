/**
 * Principal claims (Distribution → Claims). Three views:
 *   Claim karna hai  what each company owes back for a period: claimable
 *                    scheme Discount, free goods at cost and damaged / expired
 *                    market returns at cost; make a claim from it.
 *   Claims           claims made: statement (print, CSV), submit to the
 *                    company, record money received, cancel.
 *   Principals       which brands belong to which company.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, CheckCircle2, Download, FileText, HandCoins, Pencil, Printer, Send, Tags, XCircle } from 'lucide-react';
import {
  Button, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, Select, Skeleton, Table, TBody, Td, Th, THead, Tr, ViewTabs, confirmDialog,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { moneyApi } from '@modules/finance/money/api/money.api';
import { DIST_KEY, distError } from '../../api/distribution.api';
import { CLAIM_STATUS_LABEL, phase2Api, type ClaimLine, type ClaimStatus, type ReceiveClaim } from '../../api/phase2.api';
import { DistributionGate } from '../../components/DistributionGate';
import { Empty, Panel, Pill } from '../../components/parts';
import { useMoney } from '../../hooks/useDistribution';
import { dayKeyLabel, dayYearLabel, trim, type Tone } from '../../lib/meta';
import { downloadClaimCsv, printClaimStatement } from './claimPrint';

type Tab = 'pending' | 'claims' | 'principals';
const KEY = [DIST_KEY, 'claims'] as const;
const STATUS_TONE: Record<ClaimStatus, Tone> = { DRAFT: 'amber', SUBMITTED: 'blue', RECEIVED: 'green', CANCELLED: 'slate' };

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ClaimsPage() {
  return <DistributionGate><PageShell><ClaimsBody /></PageShell></DistributionGate>;
}

function ClaimsBody() {
  const money = useMoney();
  const [tab, setTab] = useState<Tab>('pending');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayKey());
  const pendingQ = useQuery({ queryKey: [...KEY, 'pending', from, to], queryFn: () => phase2Api.pendingClaims({ from, to }) });
  const claimsQ = useQuery({ queryKey: [...KEY, 'list'], queryFn: () => phase2Api.claims() });
  const [make, setMake] = useState<{ supplierId: string; name: string | null } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const claims = claimsQ.data?.claims ?? [];
  const open = claims.filter((c) => c.status === 'DRAFT' || c.status === 'SUBMITTED');
  return (
    <>
      <PageHero
        title="Claims"
        chip={<><FileText />Company claims</>}
        meta="Scheme Discount, free maal aur kharab / expiry maal — company se wapas lena"
        loading={pendingQ.isLoading}
        stats={[
          { label: 'Claim karna hai', value: money(pendingQ.data?.total ?? 0), hint: pendingQ.data ? `${dayKeyLabel(pendingQ.data.from)} – ${dayKeyLabel(pendingQ.data.to)}` : undefined },
          { label: 'Khule claims', value: String(open.length), hint: money(open.reduce((s, c) => s + c.balance, 0)) },
          { label: 'Mil chuka', value: money(claims.reduce((s, c) => s + c.receivedAmount, 0)) },
        ]}
      />

      <ViewTabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'pending', label: 'Claim karna hai', icon: HandCoins, count: pendingQ.data?.principals.length ?? null },
        { id: 'claims', label: 'Claims', icon: FileText, count: claims.length || null },
        { id: 'principals', label: 'Principals', icon: Building2 },
      ]} />

      {tab === 'pending' && (
        <Panel flush title="Har company ka hisab" sub="Sirf settle hui Invoices aur approve hue market returns"
          right={<div className="flex flex-wrap items-center gap-2">
            <Input aria-label="Se" type="date" size="sm" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
            <Input aria-label="Tak" type="date" size="sm" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} />
          </div>}>
          {!pendingQ.data ? <div className="p-4"><Skeleton className="h-40 rounded-2xl" /></div>
            : !pendingQ.data.principals.length ? <Empty icon={<HandCoins className="h-5 w-5" />} text="Is period me claim karne ko kuch nahi. Scheme par 'company claim' lagi ho aur principal chuna ho, tab hi yahan aata hai." /> : (
              <div className="overflow-x-auto pb-2">
                <Table minWidth="44rem" className="[&_table]:text-[0.8125rem]">
                  <THead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                    <Tr><Th className="px-4 py-2 sm:px-5">Company</Th><Th className="px-3 py-2 text-right">Scheme Discount</Th><Th className="px-3 py-2 text-right">Free maal (cost)</Th>
                      <Th className="px-3 py-2 text-right">Kharab / expiry</Th><Th className="px-3 py-2 text-right">Total</Th><Th className="px-4 py-2 sm:px-5" /></Tr>
                  </THead>
                  <TBody className="divide-y divide-slate-100">
                    {pendingQ.data.principals.map((p) => (
                      <Tr key={p.supplierId}>
                        <Td className="px-4 py-2.5 sm:px-5"><div className="font-semibold text-slate-900">{p.supplierName ?? 'Company'}</div><div className="text-[0.75rem] text-slate-500">{p.lines} lines</div></Td>
                        <Td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{money(p.schemeDiscount)}</Td>
                        <Td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{money(p.freeGoodsValue)}</Td>
                        <Td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{money(p.returnsValue)}</Td>
                        <Td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">{money(p.total)}</Td>
                        <Td className="whitespace-nowrap px-4 py-2.5 text-right sm:px-5"><Button size="sm" onClick={() => setMake({ supplierId: p.supplierId, name: p.supplierName })}>New claim</Button></Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
        </Panel>
      )}

      {tab === 'claims' && (
        <Panel flush title="Claims" sub="Kholein — statement print, CSV, company ko dein, paisa likhein">
          {!claimsQ.data ? <div className="p-4"><Skeleton className="h-40 rounded-2xl" /></div>
            : !claims.length ? <Empty icon={<FileText className="h-5 w-5" />} text="Abhi koi claim nahi bana." /> : (
              <div className="overflow-x-auto pb-2">
                <Table minWidth="48rem" className="[&_table]:text-[0.8125rem]">
                  <THead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                    <Tr><Th className="px-4 py-2 sm:px-5">Claim</Th><Th className="px-3 py-2">Company</Th><Th className="px-3 py-2">Period</Th><Th className="px-3 py-2">Status</Th>
                      <Th className="px-3 py-2 text-right">Total</Th><Th className="px-3 py-2 text-right">Mila</Th><Th className="px-4 py-2 text-right sm:px-5">Baqi</Th></Tr>
                  </THead>
                  <TBody className="divide-y divide-slate-100">
                    {claims.map((c) => (
                      <Tr key={c.id} className="cursor-pointer hover:bg-slate-50/80" onClick={() => setOpenId(c.id)}>
                        <Td className="px-4 py-2.5 font-semibold text-slate-900 sm:px-5">{c.number}{c.reference && <div className="text-[0.75rem] font-normal text-slate-500">Ref {c.reference}</div>}</Td>
                        <Td className="px-3 py-2.5">{c.supplierName ?? '—'}</Td>
                        <Td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{dayKeyLabel(c.fromKey)} – {dayKeyLabel(c.toKey)}</Td>
                        <Td className="px-3 py-2.5"><Pill tone={STATUS_TONE[c.status]}>{CLAIM_STATUS_LABEL[c.status]}</Pill></Td>
                        <Td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums">{money(c.total)}</Td>
                        <Td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{money(c.receivedAmount)}</Td>
                        <Td className={cn('whitespace-nowrap px-4 py-2.5 text-right tabular-nums sm:px-5', c.balance > 0 && c.status !== 'CANCELLED' && 'font-semibold text-amber-700')}>{c.status === 'CANCELLED' ? '—' : money(c.balance)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
        </Panel>
      )}

      {tab === 'principals' && <Principals />}

      {make && <MakeClaim supplierId={make.supplierId} name={make.name} from={from} to={to} onClose={() => setMake(null)} onMade={(id) => { setMake(null); setTab('claims'); setOpenId(id); }} />}
      {openId && <ClaimView id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

function LinesTable({ lines }: { lines: ClaimLine[] }) {
  const money = useMoney();
  const schemes = lines.filter((l) => l.kind === 'SCHEME');
  const returns = lines.filter((l) => l.kind === 'RETURN');
  return (
    <div className="space-y-4">
      {schemes.length > 0 && (
        <div>
          <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Scheme Discount aur free maal ({schemes.length})</p>
          <div className="max-h-72 overflow-auto rounded-xl ring-1 ring-slate-200">
            <Table minWidth="40rem" className="[&_table]:text-[0.75rem]">
              <THead className="text-left text-[0.6875rem] uppercase text-slate-400"><Tr><Th className="px-2 py-1.5">Invoice</Th><Th className="px-2 py-1.5">Customer</Th><Th className="px-2 py-1.5">Item / scheme</Th><Th className="px-2 py-1.5 text-right">Discount</Th><Th className="px-2 py-1.5 text-right">Free</Th><Th className="px-2 py-1.5 text-right">Total</Th></Tr></THead>
              <TBody className="divide-y divide-slate-100">
                {schemes.map((l) => (
                  <Tr key={l.refId}>
                    <Td className="whitespace-nowrap px-2 py-1.5">{l.invoiceNumber ?? l.docNumber}<div className="text-slate-500">{dayYearLabel(l.date)}</div></Td>
                    <Td className="px-2 py-1.5">{l.customerName}</Td>
                    <Td className="px-2 py-1.5">{l.productName}<div className="text-slate-500">{l.schemeName}</div></Td>
                    <Td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{l.discount ? money(l.discount) : '—'}</Td>
                    <Td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{l.freeQty ? <>{trim(l.freeQty)} pcs<div className="text-slate-500">{money(l.freeValue)}</div></> : '—'}</Td>
                    <Td className="whitespace-nowrap px-2 py-1.5 text-right font-semibold tabular-nums">{money(l.total)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
        </div>
      )}
      {returns.length > 0 && (
        <div>
          <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Market return — kharab / expiry ({returns.length})</p>
          <div className="max-h-60 overflow-auto rounded-xl ring-1 ring-slate-200">
            <Table minWidth="34rem" className="[&_table]:text-[0.75rem]">
              <THead className="text-left text-[0.6875rem] uppercase text-slate-400"><Tr><Th className="px-2 py-1.5">Return</Th><Th className="px-2 py-1.5">Customer</Th><Th className="px-2 py-1.5">Item</Th><Th className="px-2 py-1.5 text-right">Qty</Th><Th className="px-2 py-1.5 text-right">Cost</Th></Tr></THead>
              <TBody className="divide-y divide-slate-100">
                {returns.map((l) => (
                  <Tr key={l.refId}>
                    <Td className="whitespace-nowrap px-2 py-1.5">{l.docNumber}<div className="text-slate-500">{dayYearLabel(l.date)}</div></Td>
                    <Td className="px-2 py-1.5">{l.customerName}</Td>
                    <Td className="px-2 py-1.5">{l.productName}<div className="text-slate-500">{l.condition === 'EXPIRED' ? 'Expiry' : 'Kharab'}</div></Td>
                    <Td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{trim(l.qty)}</Td>
                    <Td className="whitespace-nowrap px-2 py-1.5 text-right font-semibold tabular-nums">{money(l.returnValue)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

function MakeClaim({ supplierId, name, from, to, onClose, onMade }: { supplierId: string; name: string | null; from: string; to: string; onClose: () => void; onMade: (id: string) => void }) {
  const qc = useQueryClient();
  const money = useMoney();
  const [note, setNote] = useState('');
  const q = useQuery({ queryKey: [...KEY, 'preview', supplierId, from, to], queryFn: () => phase2Api.claimPreview({ supplierId, from, to }) });
  const make = useMutation({
    mutationFn: () => phase2Api.createClaim({ supplierId, from, to, ...(note.trim() && { note: note.trim() }) }),
    onSuccess: (s) => { qc.invalidateQueries({ queryKey: KEY }); toast.success(`Claim ${s.claim.number} ban gaya`); onMade(s.claim.id); },
    onError: (e) => toast.error(distError(e)),
  });
  return (
    <Modal open onClose={onClose} size="xl" title={`Claim — ${name ?? 'Company'}`} description={`${dayKeyLabel(from)} se ${dayKeyLabel(to)} tak`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={make.isPending} disabled={!q.data?.lines.length} onClick={() => make.mutate()}>Claim banayein{q.data ? ` · ${money(q.data.total)}` : ''}</Button></>}>
      {!q.data ? <Skeleton className="h-48 rounded-2xl" /> : !q.data.lines.length ? <Empty text="Kuch claim karne ko nahi." /> : (
        <div className="space-y-4">
          <KpiRow cols={4}>
            <KpiCard icon={HandCoins} color="#2563eb" label="Scheme Discount" value={money(q.data.schemeDiscount)} />
            <KpiCard icon={Tags} color="#16a34a" label="Free maal (cost)" value={money(q.data.freeGoodsValue)} />
            <KpiCard icon={XCircle} color="#e11d48" label="Kharab / expiry" value={money(q.data.returnsValue)} />
            <KpiCard icon={FileText} color="#7c3aed" label="Total" value={money(q.data.total)} />
          </KpiRow>
          <LinesTable lines={q.data.lines} />
          <Input label="Note (marzi se)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          <p className="text-[0.75rem] text-slate-500">Claim banne ke baad ye lines kisi aur claim me nahi aayengi. Cancel karne par wapas aa jati hain.</p>
        </div>
      )}
    </Modal>
  );
}

function ClaimView({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const money = useMoney();
  const q = useQuery({ queryKey: [...KEY, 'one', id], queryFn: () => phase2Api.claim(id) });
  const [submitting, setSubmitting] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const done = (msg: string) => { qc.invalidateQueries({ queryKey: KEY }); toast.success(msg); };
  const cancel = useMutation({ mutationFn: () => phase2Api.cancelClaim(id), onSuccess: () => done('Claim cancel ho gaya'), onError: (e) => toast.error(distError(e)) });
  const s = q.data;
  const c = s?.claim;
  const live = c && (c.status === 'DRAFT' || c.status === 'SUBMITTED');
  return (
    <Modal open onClose={onClose} size="xl" title={c ? `${c.number} — ${s?.supplier?.name ?? 'Company'}` : 'Claim'}
      description={c ? `${dayKeyLabel(c.fromKey)} – ${dayKeyLabel(c.toKey)}${c.reference ? ` · Company ref ${c.reference}` : ''}` : undefined}
      footer={c && <>
        {live && !c.receivedAmount && (
          <Button variant="ghost" className="mr-auto text-rose-700" loading={cancel.isPending}
            onClick={async () => { if (await confirmDialog({ title: 'Cancel this claim?', text: 'Lines dobara claim karne ke liye khul jayengi.', danger: true, yes: 'Cancel claim' })) cancel.mutate(); }}>
            Cancel karein
          </Button>
        )}
        <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={() => s && downloadClaimCsv(s)}>CSV</Button>
        <Button variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={() => s && printClaimStatement(s)}>Print</Button>
        {c.status === 'DRAFT' && <Button variant="secondary" leftIcon={<Send className="h-4 w-4" />} onClick={() => setSubmitting(true)}>Company ko diya</Button>}
        {live && <Button leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setReceiving(true)}>Paisa mila</Button>}
      </>}>
      {!s || !c ? <Skeleton className="h-48 rounded-2xl" /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={STATUS_TONE[c.status]}>{CLAIM_STATUS_LABEL[c.status]}</Pill>
            {c.createdByName && <span className="text-[0.75rem] text-slate-500">Banaya {c.createdByName}, {dayYearLabel(c.createdAt)}</span>}
            {c.note && <span className="text-[0.75rem] text-slate-500">· {c.note}</span>}
          </div>
          <KpiRow cols={4}>
            <KpiCard icon={FileText} color="#7c3aed" label="Total" value={money(c.total)} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Mila" value={money(c.receivedAmount)} />
            <KpiCard icon={HandCoins} color="#d97706" label="Baqi" value={money(c.balance)} />
            <KpiCard icon={Tags} color="#2563eb" label="Lines" value={String(c.lines.length)} />
          </KpiRow>
          <LinesTable lines={c.lines} />
          {s.receipts.length > 0 && (
            <div className="rounded-xl bg-success-50 px-3 py-2 text-[0.8125rem] text-success-800 ring-1 ring-success-200">
              {s.receipts.map((r) => <div key={r.id}>{r.incomeNumber}: {money(r.amount)} · {dayYearLabel(r.incomeDate)} · {RECEIVED_VIA[r.receivedVia] ?? r.receivedVia}</div>)}
              <div className="mt-0.5 text-[0.75rem]">Doosri aamdani (Other income) me likha gaya — profit me shamil.</div>
            </div>
          )}
        </div>
      )}
      {submitting && c && <SubmitModal id={id} onClose={() => setSubmitting(false)} onDone={() => { setSubmitting(false); done('Claim company ko diya gaya'); }} />}
      {receiving && c && <ReceiveModal id={id} balance={c.balance} onClose={() => setReceiving(false)} onDone={() => { setReceiving(false); done('Paisa likh diya'); }} />}
    </Modal>
  );
}

const RECEIVED_VIA: Record<string, string> = { SUPPLIER_KHATA: 'Supplier khate me adjust', CASH_DRAWER: 'Cash (galla)', ACCOUNT: 'Bank / account' };

function SubmitModal({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [reference, setReference] = useState('');
  const m = useMutation({ mutationFn: () => phase2Api.submitClaim(id, { ...(reference.trim() && { reference: reference.trim() }) }), onSuccess: onDone, onError: (e) => toast.error(distError(e)) });
  return (
    <Modal open onClose={onClose} size="sm" title="Company ko diya"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={() => m.mutate()}>Save</Button></>}>
      <Input label="Company ka claim number (marzi se)" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={60} autoFocus />
    </Modal>
  );
}

function ReceiveModal({ id, balance, onClose, onDone }: { id: string; balance: number; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<ReceiveClaim>({ amount: Math.max(0, Math.round(balance)), receivedVia: 'SUPPLIER_KHATA' });
  const accountsQ = useQuery({ queryKey: ['money-accounts', 'picker'], queryFn: () => moneyApi.moneyAccounts(), staleTime: 5 * 60_000, retry: false });
  const accounts = accountsQ.data?.accounts ?? [];
  const m = useMutation({
    mutationFn: () => phase2Api.receiveClaim(id, { ...form, amount: Number(form.amount), ...(form.receivedVia !== 'ACCOUNT' && { moneyAccountId: undefined }) }),
    onSuccess: onDone, onError: (e) => toast.error(distError(e)),
  });
  const vias = [
    { value: 'SUPPLIER_KHATA', label: 'Supplier khate me adjust (hum ne kam dena)' },
    { value: 'CASH_DRAWER', label: 'Cash mila (galla)' },
    ...(accounts.length ? [{ value: 'ACCOUNT', label: 'Bank / account me aaya' }] : []),
  ];
  return (
    <Modal open onClose={onClose} size="md" title="Company se paisa mila" description="Doosri aamdani (Scheme claim) me likha jayega"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={m.isPending} disabled={!(Number(form.amount) > 0) || (form.receivedVia === 'ACCOUNT' && !form.moneyAccountId)} onClick={() => m.mutate()}>Save</Button></>}>
      <div className="space-y-4">
        <Input label="Amount (Rs)" type="number" inputMode="decimal" min={1} value={form.amount ? String(form.amount) : ''} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} autoFocus
          hint={`Baqi: Rs ${Math.round(balance).toLocaleString('en-PK')}`} />
        <Select label="Kaise mila" value={form.receivedVia} onChange={(e) => setForm((f) => ({ ...f, receivedVia: e.target.value as ReceiveClaim['receivedVia'] }))} options={vias} />
        {form.receivedVia === 'ACCOUNT' && (
          <Select label="Account" value={form.moneyAccountId ?? ''} onChange={(e) => setForm((f) => ({ ...f, moneyAccountId: e.target.value || undefined }))}
            options={[{ value: '', label: 'Chunein' }, ...accounts.map((a) => ({ value: a.id, label: a.bankName ? `${a.name} (${a.bankName})` : a.name }))]} />
        )}
        <Input label="Date" type="date" value={form.date ?? ''} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value || undefined }))} hint="Khali = aaj" />
        <Input label="Note" value={form.note ?? ''} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} maxLength={300} />
      </div>
    </Modal>
  );
}

function Principals() {
  const q = useQuery({ queryKey: [DIST_KEY, 'principals'], queryFn: phase2Api.principals });
  const [edit, setEdit] = useState<{ id: string; name: string; brandIds: string[] } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const suppliers = q.data?.suppliers ?? [];
  const shown = showAll ? suppliers : suppliers.filter((s) => s.isPrincipal);
  return (
    <Panel flush title="Principals (companies)" sub="Item ka principal us ke brand se tay hota hai — brand ko company se jodein"
      right={<Button size="sm" variant="secondary" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Sirf principals' : 'Sab suppliers'}</Button>}>
      {!q.data ? <div className="p-4"><Skeleton className="h-40 rounded-2xl" /></div>
        : !shown.length ? <Empty icon={<Building2 className="h-5 w-5" />} text="Abhi kisi supplier ke brands nahi jode. 'Sab suppliers' dabayein aur company ke brands chunein." /> : (
          <ul className="divide-y divide-slate-100">
            {shown.map((s) => (
              <li key={s.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Building2 className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{s.name}</p>
                  <p className="text-[0.75rem] text-slate-500">{s.brandNames.length ? s.brandNames.join(', ') : 'Koi brand nahi'}{s.schemes ? ` · ${s.schemes} schemes` : ''}</p>
                </div>
                <Button size="sm" variant="secondary" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEdit({ id: s.id, name: s.name, brandIds: s.brandIds })}>Brands</Button>
              </li>
            ))}
          </ul>
        )}
      {edit && q.data && <BrandsModal supplier={edit} brands={q.data.brands} suppliers={suppliers} onClose={() => setEdit(null)} />}
    </Panel>
  );
}

function BrandsModal({ supplier, brands, suppliers, onClose }: {
  supplier: { id: string; name: string; brandIds: string[] }; brands: Array<{ id: string; name: string; supplierId: string | null }>;
  suppliers: Array<{ id: string; name: string }>; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [picked, setPicked] = useState<string[]>(supplier.brandIds);
  const [search, setSearch] = useState('');
  const owner = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);
  const list = brands.filter((b) => !search.trim() || b.name.toLowerCase().includes(search.trim().toLowerCase()));
  const save = useMutation({
    mutationFn: () => phase2Api.setPrincipalBrands(supplier.id, picked),
    onSuccess: (r) => { qc.setQueryData([DIST_KEY, 'principals'], r); toast.success('Brands save ho gaye'); onClose(); },
    onError: (e) => toast.error(distError(e)),
  });
  return (
    <Modal open onClose={onClose} size="lg" title={`${supplier.name} ke brands`} description="Jo brand kisi aur company par hai, chunne se yahan aa jayega"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save karein ({picked.length})</Button></>}>
      <div className="space-y-3">
        <Input aria-label="Brand dhoondein" placeholder="Brand dhoondein" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
        {!brands.length ? <p className="text-[0.8125rem] text-slate-500">Koi brand nahi bana — pehle Products me brands banayein.</p> : (
          <div className="flex max-h-80 flex-wrap gap-1.5 overflow-y-auto">
            {list.map((b) => {
              const on = picked.includes(b.id);
              const other = b.supplierId && b.supplierId !== supplier.id ? owner.get(b.supplierId) : null;
              return (
                <button key={b.id} type="button" aria-pressed={on} onClick={() => setPicked((x) => (on ? x.filter((i) => i !== b.id) : [...x, b.id]))}
                  className={cn('rounded-full px-2.5 py-1 text-[0.75rem] ring-1 transition', on ? 'bg-brand-600 text-white ring-brand-600' : 'text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                  {b.name}{other && !on ? <span className="opacity-60"> · {other}</span> : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

