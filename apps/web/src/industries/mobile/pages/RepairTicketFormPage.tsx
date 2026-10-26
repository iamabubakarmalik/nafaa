/**
 * Repair job card: the customer, the phone (IMEI, lock code, SIM and memory
 * card left with it), what is wrong, who will fix it, when it will be ready,
 * the estimate and any advance taken now. Scanning the IMEI shows if the
 * phone was sold here or repaired before under a warranty that still runs.
 *
 * Keys: Ctrl+Enter save · Esc back · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CalendarClock, GraduationCap, KeyRound, Printer, ScanLine, ShieldCheck, Smartphone, UserRound, Wallet, Wrench } from 'lucide-react';
import { Button, Card, Input, Kbd, PageHero, PageShell, Skeleton, Switch, Textarea, heroIconButton } from '@/design-system/components';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { imeiApi } from '../api/imei.api';
import { repairsApi, type RepairPriority, type RepairTicketPayload } from '../api/repairs.api';
import { EMPTY_PERSON, PersonFields, personErrors, type Person } from '../components/PersonFields';
import { printJobCard } from '../components/slips';
import { METHODS, MONEY_KEYS, PRIORITIES, REPAIR_KEY, apiError, dayOnly, digits, money, priorityOf } from '../components/meta';

const BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Oppo', 'Vivo', 'Infinix', 'Tecno', 'Realme', 'OnePlus', 'Huawei', 'Nokia'];
const ISSUES = ['Screen toot gayi', 'Touch nahi chal raha', 'Charge nahi hota', 'Battery jaldi khatam', 'Paani laga', 'On nahi hota', 'Awaz nahi aati', 'Mic kharab', 'Camera kharab', 'Network nahi', 'Software / hang', 'Back glass'];
const WARRANTY = [0, 7, 15, 30, 90];
const pad = (n: number) => String(n).padStart(2, '0');
const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

interface Draft {
  brand: string; model: string; color: string; imei1: string; imei2: string; passcode: string; hasSimCard: boolean; hasMemoryCard: boolean;
  issue: string; priority: RepairPriority; technician: string; readyAt: string; estimate: string; advance: string; method: PaymentMethod;
  warrantyDays: number; warrantyOf: string; phoneClaim: boolean; notes: string;
}
const EMPTY: Draft = {
  brand: '', model: '', color: '', imei1: '', imei2: '', passcode: '', hasSimCard: false, hasMemoryCard: false, issue: '', priority: 'NORMAL',
  technician: '', readyAt: '', estimate: '', advance: '', method: 'CASH', warrantyDays: 7, warrantyOf: '', phoneClaim: false, notes: '',
};

export default function RepairTicketFormPage() {
  const { id } = useParams();
  const editing = !!id;
  // "Warranty claim" on a delivered job opens this form with that job's id.
  const claimOfId = useSearchParams()[0].get('warrantyOf') ?? '';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const shopId = useShopParam();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const guide = usePageGuide();
  useReceiptSetup();
  const lock = useRef(false);
  const [f, setF] = useState<Draft>(EMPTY);
  const [person, setPerson] = useState<Person>(EMPTY_PERSON);
  const [loaded, setLoaded] = useState(false);
  const [touched, setTouched] = useState(false);
  const [scan, setScan] = useState(false);
  const set = (patch: Partial<Draft>) => setF((x) => ({ ...x, ...patch }));

  const ticketQ = useQuery({ queryKey: [REPAIR_KEY, 'one', id], queryFn: () => repairsApi.getOne(id!), enabled: editing });
  const techQ = useQuery({ queryKey: [REPAIR_KEY, 'technicians'], queryFn: () => repairsApi.technicians(), staleTime: 5 * 60_000 });
  const t = ticketQ.data;
  useEffect(() => {
    if (!t || loaded) return;
    setF({
      ...EMPTY, brand: t.deviceBrand, model: t.deviceModel, color: t.deviceColor ?? '', imei1: t.imei1 ?? '', imei2: t.imei2 ?? '', passcode: t.passcode ?? '',
      hasSimCard: t.hasSimCard, hasMemoryCard: t.hasMemoryCard, issue: t.reportedIssue, priority: t.priority, technician: t.technicianName ?? '',
      readyAt: t.estimatedReadyAt ? localInput(new Date(t.estimatedReadyAt)) : '', estimate: t.estimatedCost ? String(t.estimatedCost) : '',
      warrantyDays: t.warrantyDays, notes: t.notes ?? '',
    });
    setPerson({ customerId: t.customerId ?? '', name: t.customerName, phone: t.customerPhone, cnic: t.customerCnic ?? '', address: t.customerAddress ?? '' });
    setLoaded(true);
  }, [t, loaded]);

  const claimQ = useQuery({ queryKey: [REPAIR_KEY, 'one', claimOfId], queryFn: () => repairsApi.getOne(claimOfId), enabled: !editing && !!claimOfId });
  const claimOf = claimQ.data;
  useEffect(() => {
    if (!claimOf || loaded) return;
    setF({
      ...EMPTY, brand: claimOf.deviceBrand, model: claimOf.deviceModel, color: claimOf.deviceColor ?? '', imei1: claimOf.imei1 ?? '', imei2: claimOf.imei2 ?? '',
      passcode: claimOf.passcode ?? '', issue: claimOf.diagnosedIssue || claimOf.reportedIssue, technician: claimOf.technicianName ?? '',
      warrantyOf: claimOf.ticketNumber, estimate: '0', warrantyDays: claimOf.warrantyDays,
    });
    setPerson({ customerId: claimOf.customerId ?? '', name: claimOf.customerName, phone: claimOf.customerPhone, cnic: claimOf.customerCnic ?? '', address: claimOf.customerAddress ?? '' });
    setLoaded(true);
  }, [claimOf, loaded]);

  // What this shop knows about the IMEI: sold here, repaired before.
  const imeiQ = useQuery({ queryKey: ['mobile-imei-lookup', f.imei1], queryFn: () => imeiApi.lookup(f.imei1), enabled: !editing && f.imei1.length === 15, retry: false });
  const soldHere = imeiQ.data?.newPhones.find((p) => p.status === 'SOLD');
  const lastRepair = imeiQ.data?.repairs[0];
  const claimable = imeiQ.data?.repairs.find((r) => r.warrantyActive);
  useEffect(() => {
    const p = soldHere?.product;
    if (p && !f.model) set({ brand: p.brand?.name ?? f.brand, model: p.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soldHere?.id]);

  const closed = editing && !!t && (t.status === 'DELIVERED' || t.status === 'CANCELLED' || !!t.saleId);
  const pErr = personErrors(person);
  const problems = useMemo(() => {
    const out: string[] = [];
    const pe = Object.values(pErr)[0];
    if (pe) out.push(`Customer: ${pe}`);
    if (!f.brand.trim()) out.push('Phone ka brand likhein');
    if (!f.model.trim()) out.push('Phone ka model likhein');
    if (f.imei1 && !/^\d{15}$/.test(f.imei1)) out.push('IMEI me 15 number hon (ya khali chhorein)');
    if (f.imei2 && !/^\d{15}$/.test(f.imei2)) out.push('IMEI 2 me 15 number hon');
    if (!f.issue.trim()) out.push('Kya kharabi hai — likhein');
    if (f.readyAt && !editing && new Date(f.readyAt).getTime() < Date.now() - 60_000) out.push('Tayyar hone ka waqt guzra hua hai');
    if (!editing && n(f.advance) > 0 && n(f.estimate) > 0 && n(f.advance) > n(f.estimate)) out.push('Advance andaze se zyada nahi ho sakta');
    return out;
  }, [f, pErr, editing]);

  const save = useMutation({
    mutationFn: async () => {
      if (problems.length) throw new Error(problems[0]);
      const opt = (v: string) => (v.trim() ? v.trim() : undefined);
      const body: RepairTicketPayload = {
        deviceBrand: f.brand.trim(), deviceModel: f.model.trim(), deviceColor: opt(f.color), imei1: opt(f.imei1), imei2: opt(f.imei2), passcode: opt(f.passcode),
        hasSimCard: f.hasSimCard, hasMemoryCard: f.hasMemoryCard, customerId: person.customerId || undefined, customerName: person.name.trim(),
        customerPhone: person.phone.trim(), customerCnic: opt(person.cnic), customerAddress: opt(person.address), reportedIssue: f.issue.trim(),
        priority: f.priority, technicianName: opt(f.technician), estimatedReadyAt: f.readyAt ? new Date(f.readyAt).toISOString() : undefined,
        estimatedCost: n(f.estimate), warrantyDays: f.warrantyDays,
        notes: opt([f.phoneClaim && soldHere ? `Phone warranty claim: bill ${soldHere.sale?.saleNumber ?? ''}` : '', f.notes].filter(Boolean).join('\n')),
      };
      if (editing) return repairsApi.update(id!, closed ? { notes: body.notes, customerCnic: body.customerCnic, customerAddress: body.customerAddress } as Partial<RepairTicketPayload> : body);
      return repairsApi.create({
        ...body, shopId, advancePaid: n(f.advance) || undefined, advanceMethod: n(f.advance) ? f.method : undefined, warrantyOf: f.warrantyOf || undefined,
      });
    },
    onSuccess: (ticket) => {
      [REPAIR_KEY, 'repair-stats', ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      if (editing) toast.success('Save ho gaya');
      else toast.success(`Job ${ticket.ticketNumber} ban gaya`, { action: { label: 'Parchi print', onClick: () => printJobCard(ticket, shopName) }, duration: 8000 });
      navigate(`/repair-tickets/${ticket.id}`, { replace: true });
    },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
    onSettled: () => { lock.current = false; },
  });
  const submit = () => { setTouched(true); if (lock.current || save.isPending) return; if (problems.length) { toast.error(problems[0]); return; } lock.current = true; save.mutate(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === 's')) { e.preventDefault(); submit(); }
      if (e.key === 'Escape' && !isDialogOpen()) navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (editing && ticketQ.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-[32rem] rounded-2xl" /></PageShell>;
  if (editing && !t) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Ye job nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/repair-tickets')}>Repairs par wapas</Button></div></PageShell>;

  const chip = (on: boolean) => cn('h-8 rounded-lg px-2.5 text-[0.8125rem] font-medium ring-1', on ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50');
  const techs = (techQ.data ?? []).slice(0, 8);
  const quickReady = [['2 ghante', 2], ['Shaam tak', 0], ['Kal', 24], ['2 din', 48]] as const;

  return (
    <PageShell>
      {scan && <BarcodeScanner onDetected={(c: string) => { const x = digits(c); if (x.length === 15) { set({ imei1: x }); setScan(false); } }} onClose={() => setScan(false)} />}
      <PageHero
        title={editing ? `${t?.ticketNumber} — badlein` : claimOf ? `Warranty claim — ${claimOf.ticketNumber}` : 'Naya repair job'}
        subtitle={closed ? 'Band job — sirf note aur customer ki tafseel badalti hai' : editing ? 'Paise yahan se nahi badalte — job ke safhe par "Advance" aur "Part" se' : 'Phone lein, parchi dein — tayyar hone par customer ko batayein'}
        back={() => navigate(-1)}
        backLabel="Wapas (Esc)"
        meta={<span className="inline-flex items-center gap-1.5"><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save</span>}
        actions={<button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={UserRound}>Customer</T>}>
            <PersonFields value={person} onChange={setPerson} withAddress errors={touched ? pErr : {}} />
          </Card>

          <Card className="rounded-2xl" title={<T icon={Smartphone}>Phone</T>}>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="IMEI" inputMode="numeric" maxLength={15} value={f.imei1} onChange={(e) => set({ imei1: digits(e.target.value) })} className="font-mono" disabled={closed}
                  rightIcon={<button type="button" onClick={() => setScan(true)} aria-label="Scan"><ScanLine className="h-4 w-4" /></button>} hint="*#06# — purana record isi se milta hai" />
                <Input label="IMEI 2" inputMode="numeric" maxLength={15} value={f.imei2} onChange={(e) => set({ imei2: digits(e.target.value) })} className="font-mono" disabled={closed} hint="Marzi hai" />
              </div>
              {(soldHere || lastRepair) && (
                <div className="space-y-1 rounded-xl bg-sky-50 px-3 py-2 text-[0.8125rem] text-sky-900 ring-1 ring-sky-200">
                  {soldHere && <p>Ye phone isi dukaan se bika: {soldHere.sale?.saleNumber} · {dayOnly(soldHere.soldAt)}{soldHere.warranty.active ? ` · phone warranty ${soldHere.warranty.daysLeft} din baqi` : ''}</p>}
                  {lastRepair && <p>Pichli repair: {lastRepair.ticketNumber} ({dayOnly(lastRepair.receivedAt)}) — {lastRepair.diagnosedIssue || lastRepair.reportedIssue}</p>}
                </div>
              )}
              {soldHere?.warranty.active && !claimable && !editing && (
                <Switch checked={f.phoneClaim} onChange={(e) => set(e.target.checked ? { phoneClaim: true, estimate: '0' } : { phoneClaim: false })}
                  label={`Phone ki warranty — bill ${soldHere.sale?.saleNumber ?? ''}`} description={`Dukaan ki warranty ${soldHere.warranty.daysLeft} din baqi — kaam muft, job card par likha jayega`} />
              )}
              {claimOf && !editing && claimOf.ticketNumber !== claimable?.ticketNumber && (
                <Switch checked={f.warrantyOf === claimOf.ticketNumber} onChange={(e) => set(e.target.checked ? { warrantyOf: claimOf.ticketNumber, estimate: '0' } : { warrantyOf: '' })}
                  label={`Warranty claim — ${claimOf.ticketNumber}`} description={claimOf.warrantyEnds ? `Repair warranty ${dayOnly(claimOf.warrantyEnds)} tak — wahi kharabi muft theek hogi` : 'Is job ki warranty nahi thi'} />
              )}
              {claimable && !editing && (
                <Switch checked={f.warrantyOf === claimable.ticketNumber} onChange={(e) => set(e.target.checked ? { warrantyOf: claimable.ticketNumber, estimate: '0' } : { warrantyOf: '' })}
                  label={`Warranty claim — ${claimable.ticketNumber}`} description={`Repair warranty ${dayOnly(claimable.warrantyEnds)} tak — wahi kharabi muft theek hogi`} />
              )}
              <div>
                <Input label="Brand" required value={f.brand} onChange={(e) => set({ brand: e.target.value })} placeholder="Samsung" disabled={closed} />
                {!closed && <div className="mt-1.5 flex flex-wrap gap-1">{BRANDS.map((b) => <button key={b} type="button" onClick={() => set({ brand: b })} className={chip(f.brand === b)}>{b}</button>)}</div>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Model" required value={f.model} onChange={(e) => set({ model: e.target.value })} placeholder="Galaxy A54" disabled={closed} />
                <Input label="Rang" value={f.color} onChange={(e) => set({ color: e.target.value })} hint="Marzi hai" disabled={closed} />
              </div>
              <Input label="Lock code / pattern" value={f.passcode} onChange={(e) => set({ passcode: e.target.value })} leftIcon={<KeyRound className="h-4 w-4" />} hint="Customer ki marzi se — check ke liye" disabled={closed} />
              <div className="grid gap-2 sm:grid-cols-2">
                <Switch checked={f.hasSimCard} onChange={(e) => set({ hasSimCard: e.target.checked })} label="SIM phone me hai" disabled={closed} />
                <Switch checked={f.hasMemoryCard} onChange={(e) => set({ hasMemoryCard: e.target.checked })} label="Memory card phone me hai" disabled={closed} />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Wrench}>Kharabi</T>}>
            <div className="space-y-3">
              <Textarea label="Customer kya keh raha hai" required rows={2} value={f.issue} onChange={(e) => set({ issue: e.target.value })} placeholder="Screen toot gayi, touch nahi chal raha" disabled={closed} />
              {!closed && <div className="flex flex-wrap gap-1">{ISSUES.map((x) => <button key={x} type="button" onClick={() => set({ issue: f.issue ? `${f.issue}, ${x}` : x })} className="h-7 rounded-lg bg-slate-100 px-2 text-[0.75rem] font-medium text-slate-700 hover:bg-slate-200">{x}</button>)}</div>}
              <Textarea label="Phone ki halat (nishan, crack)" rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Back par crack pehle se, frame pe nishan" hint="Baad me jhagra na ho — pehle likh lein" />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={CalendarClock}>Kaam</T>}>
            <div className="space-y-3">
              <div>
                <span className="text-[0.8125rem] font-medium text-slate-700">Kitni jaldi</span>
                <div className="mt-1.5 flex flex-wrap gap-1">{PRIORITIES.map((p) => <button key={p} type="button" disabled={closed} onClick={() => set({ priority: p })} className={chip(f.priority === p)}>{priorityOf(p).label}</button>)}</div>
              </div>
              <div>
                <Input label="Technician" value={f.technician} onChange={(e) => set({ technician: e.target.value })} placeholder="Usman" disabled={closed} />
                {!closed && techs.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {techs.map((x) => <button key={x.name} type="button" onClick={() => set({ technician: x.name })} className={chip(f.technician === x.name)}>{x.name}{x.open ? ` · ${x.open}` : ''}</button>)}
                  </div>
                )}
              </div>
              <div>
                <Input label="Kab tayyar hoga" type="datetime-local" value={f.readyAt} onChange={(e) => set({ readyAt: e.target.value })} disabled={closed} />
                {!closed && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {quickReady.map(([label, h]) => (
                      <button key={label} type="button" onClick={() => { const d = new Date(); if (h) d.setHours(d.getHours() + h); else d.setHours(19, 0, 0, 0); set({ readyAt: localInput(d) }); }} className="h-7 rounded-lg bg-slate-100 px-2 text-[0.75rem] font-medium text-slate-700 hover:bg-slate-200">{label}</button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <span className="text-[0.8125rem] font-medium text-slate-700">Repair ki warranty</span>
                <div className="mt-1.5 flex flex-wrap gap-1">{WARRANTY.map((w) => <button key={w} type="button" disabled={closed} onClick={() => set({ warrantyDays: w })} className={chip(f.warrantyDays === w)}>{w ? `${w} din` : 'Koi nahi'}</button>)}</div>
                <p className="mt-1 text-[0.75rem] text-slate-500">Phone wapas dene ke din se ginti</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Wallet}>Paise</T>}>
            <div className="space-y-3">
              <Input label="Andaza" inputMode="decimal" value={f.estimate} onChange={(e) => set({ estimate: money(e.target.value) })} disabled={closed || !!f.warrantyOf || f.phoneClaim}
                hint={f.warrantyOf || f.phoneClaim ? 'Warranty claim — muft' : 'Customer ko bataya gaya kharcha; check ke baad badal sakta hai'} />
              {!editing && (
                <>
                  <Input label="Advance (abhi liya)" inputMode="decimal" value={f.advance} onChange={(e) => set({ advance: money(e.target.value) })} hint="Customer ke khata me jama hota hai, bill me kat jata hai" />
                  {n(f.advance) > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {METHODS.map((m) => <button key={m.value} type="button" onClick={() => set({ method: m.value })} className={chip(f.method === m.value)}>{m.label}</button>)}
                    </div>
                  )}
                </>
              )}
              {editing && t && <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">Mila: <b className="tabular-nums text-slate-900">{formatPKR(t.paidAmount)}</b> · advance aur parts job ke safhe se</p>}
              <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-100">
                <span className="text-[0.8125rem] font-medium text-brand-900">Baqi (andaze se)</span>
                <span className="text-lg font-bold tabular-nums text-brand-900">{formatPKR(Math.max(n(f.estimate) - (editing ? Number(t?.paidAmount ?? 0) : n(f.advance)), 0))}</span>
              </div>
            </div>
          </Card>
          {editing && t && (
            <Button variant="secondary" className="w-full" leftIcon={<Printer className="h-4 w-4" />} onClick={() => printJobCard(t, shopName)}>Parchi dobara print</Button>
          )}
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {problems.length > 0 && (touched || editing)
          ? <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problems[0]}</p>
          : <p className="mr-auto text-[0.8125rem] text-slate-500">{f.brand || 'Phone'} {f.model}{f.estimate ? <> · andaza <b className="tabular-nums text-slate-900">{formatPKR(n(f.estimate))}</b></> : null}{f.warrantyOf || f.phoneClaim ? ' · warranty claim' : ''}</p>}
        <Button variant="secondary" onClick={() => navigate(-1)}>Rehne dein</Button>
        <Button onClick={submit} loading={save.isPending}>{editing ? 'Save karein' : 'Job banayein'}</Button>
      </div>

      {guide.isOpen && (
        <PageGuide title="Repair job — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: UserRound, color: '#2563eb', title: 'Customer', text: 'Naam aur phone zaroori — purane customer ko chunein to advance aur udhaar usi ke khata me jate hain.' },
            { icon: ScanLine, color: '#7c3aed', title: 'IMEI', text: 'IMEI likhne se pata chalta hai ke phone yahan se bika tha ya pehle repair hua. Repair warranty chal rahi ho to "Warranty claim" lagayein.' },
            { icon: Wrench, color: '#ea580c', title: 'Kharabi aur halat', text: 'Customer jo kehta hai wo likhein, aur phone par pehle se jo nishan hain wo bhi — baad me jhagra nahi hota.' },
            { icon: Wallet, color: '#16a34a', title: 'Advance', text: 'Advance lene se customer ke khata me jama hota hai; phone wapas dete waqt bill me kat jata hai.' },
            { icon: ShieldCheck, color: '#0891b2', title: 'Warranty', text: 'Repair warranty phone wapas dene ke din se chalti hai. Usi kharabi par dobara aaye to muft.' },
          ]}
          tips={['Save ke baad parchi print karein — customer isi parchi se phone wapas leta hai.', 'Job banane ke liye "Repairs sambhalna" ki permission chahiye.']}
          shortcuts={[['Ctrl+Enter', 'save'], ['Esc', 'wapas'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

const n = (v: string) => Number(v) || 0;
const T = ({ icon: Icon, children }: { icon: typeof Smartphone; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
