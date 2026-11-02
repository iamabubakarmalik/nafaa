/**
 * New or edited AMC (yearly service contract): customer and unit, plan,
 * period, free visits and what is covered, price and money taken now.
 * Saving a new contract posts its bill; what is not paid goes on khata.
 *
 * Keys: Ctrl+S save · Esc back.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, FileSignature, ShieldCheck, UserRound, Wallet } from 'lucide-react';
import { Button, Card, Input, Kbd, PageHero, PageShell, Skeleton, Switch, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { amcContractsApi, type ApplianceAmcType } from '../api/amc-contracts.api';
import { SerialLookup } from '../components/jobDialogs';
import { CustomerFields, emptyParty, partyErrors, type PartyDraft } from '../components/ui';
import { AMC_KEY, AMC_PLANS, MONEY_KEYS, addMonths, apiError, digits, money, todayKey } from '../components/meta';
import { t } from '@core/i18n';

const PRESETS: Record<ApplianceAmcType, { visits: number; labor: boolean; parts: boolean; gas: boolean }> = {
  BASIC: { visits: 2, labor: false, parts: false, gas: false },
  STANDARD: { visits: 3, labor: true, parts: false, gas: false },
  PREMIUM: { visits: 4, labor: true, parts: false, gas: true },
  COMPREHENSIVE: { visits: 4, labor: true, parts: true, gas: true },
};
const MONTHS = [6, 12, 24];

export default function AmcContractFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const existing = useQuery({ queryKey: [AMC_KEY, 'one', id], queryFn: () => amcContractsApi.getOne(id!), enabled: editing });

  const [party, setParty] = useState<PartyDraft>(emptyParty);
  const [serial, setSerial] = useState('');
  const [serialId, setSerialId] = useState<string | undefined>();
  const [productId, setProductId] = useState<string | undefined>();
  const [product, setProduct] = useState('');
  const [plan, setPlan] = useState<ApplianceAmcType>('STANDARD');
  const [start, setStart] = useState(todayKey());
  const [months, setMonths] = useState(12);
  const [visits, setVisits] = useState('3');
  const [labor, setLabor] = useState(true);
  const [parts, setParts] = useState(false);
  const [gas, setGas] = useState(false);
  const [autoRenew, setAutoRenew] = useState(false);
  const [price, setPrice] = useState('');
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [exclusions, setExclusions] = useState('');
  const [notes, setNotes] = useState('');
  const [tried, setTried] = useState(false);

  const c = existing.data;
  useEffect(() => {
    if (!c) return;
    setParty({ customerId: c.customerId, name: c.customerName, phone: c.customerPhone, address: c.customerAddress ?? '', area: '' });
    setSerial(c.serialNumber ?? ''); setSerialId(c.serialTrackingId); setProductId(c.productId); setProduct(c.productName ?? '');
    setPlan(c.amcType); setStart(c.startDate.slice(0, 10)); setMonths(c.durationMonths); setVisits(String(c.freeVisitsAllowed));
    setLabor(c.laborCovered); setParts(c.freePartsAllowed); setGas(c.gasRefillCovered); setAutoRenew(c.autoRenew);
    setPrice(String(Number(c.contractValue))); setPaid(String(Number(c.paidAmount))); setExclusions(c.exclusions ?? ''); setNotes(c.notes ?? '');
  }, [c]);

  const choosePlan = (p: ApplianceAmcType) => { setPlan(p); const x = PRESETS[p]; setVisits(String(x.visits)); setLabor(x.labor); setParts(x.parts); setGas(x.gas); };
  const value = Number(price) || 0;
  const taken = Number(paid) || 0;
  const pErr = partyErrors(party, false);
  const problems = [
    ...Object.values(pErr),
    product.trim().length < 2 ? t('Kis cheez ka AMC — product likhein') : '',
    !(value > 0) ? t('Contract ki qeemat likhein') : '',
    taken > value + 0.01 ? t('Mila hua paisa qeemat se zyada nahi') : '',
    !(Number(visits) >= 0) ? t('Free visits likhein') : '',
  ].filter(Boolean) as string[];
  const due = Math.max(value - taken, 0);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        amcType: plan, customerId: party.customerId, customerName: party.name.trim(), customerPhone: party.phone.trim(), customerAddress: party.address.trim() || undefined,
        productId, productName: product.trim(), serialNumber: serial.trim() || undefined, serialTrackingId: serialId,
        startDate: start, durationMonths: months, contractValue: value, paidAmount: taken, freeVisitsAllowed: Number(visits) || 0,
        laborCovered: labor, freePartsAllowed: parts, gasRefillCovered: gas, autoRenew, exclusions: exclusions.trim() || undefined, notes: notes.trim() || undefined,
      };
      return editing ? amcContractsApi.update(id!, body) : amcContractsApi.create({ ...body, paymentMethod: method });
    },
    onSuccess: (x) => {
      toast.success(editing ? t('Contract update') : t('AMC {{contractNumber}} ban gaya — bill bhi', { contractNumber: x.contractNumber }));
      [AMC_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      navigate(`/appliances/amc-contracts?id=${x.id}`);
    },
    onError: (e) => toast.error(apiError(e, t('Save nahi hua'))),
  });
  const submit = () => { setTried(true); if (!problems.length && !save.isPending) save.mutate(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 's' || e.key === 'Enter')) { e.preventDefault(); submit(); }
      if (e.key === 'Escape' && !isDialogOpen()) navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (editing && existing.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-96 rounded-2xl" /></PageShell>;
  if (editing && !c) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">{t('Contract nahi mila')}</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/appliances/amc-contracts')}>{t('Wapas')}</Button></div></PageShell>;
  // A saved contract already carries its bill; money changes go through payments.
  const billed = editing;

  return (
    <PageShell>
      <PageHero
        title={editing ? t('{{contractNumber}} — badlein', { contractNumber: c?.contractNumber }) : t('Naya AMC contract')}
        subtitle={t('Saal bhar ki service — free visits, mazdoori, gas aur parts jo cover hon')}
        back={() => navigate(-1)}
        backLabel={t('Wapas (Esc)')}
        meta={<span className="inline-flex items-center gap-1.5"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> {' '}{t('save')}</span>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={UserRound}>{t('Customer aur unit')}</T>}>
            <div className="space-y-4">
              <SerialLookup value={serial} onChange={(v) => { setSerial(v); setSerialId(undefined); }} onFound={(r) => {
                const s = r.serial!;
                setSerialId(s.id); setProductId(s.productId); setProduct(s.product?.name ?? product);
                if (s.customerName && !party.name) setParty({ ...party, customerId: s.soldToCustomerId ?? undefined, name: s.customerName, phone: s.customerPhone ?? '', address: s.deliveryAddress ?? '' });
              }} />
              <Input label={t('Product')} required value={product} onChange={(e) => { setProduct(e.target.value); setProductId(undefined); }} placeholder={t('Gree 1.5 ton inverter AC')} error={tried && product.trim().length < 2 ? t('Product likhein') : undefined} />
              <CustomerFields value={party} onChange={setParty} errors={tried ? pErr : {}} needAddress />
            </div>
          </Card>
          <Card className="rounded-2xl" title={<T icon={ShieldCheck}>{t('Plan')}</T>} description={t('Plan chunein — visits aur cover khud lag jate hain, phir badal sakte hain')}>
            <div className="grid gap-2 sm:grid-cols-4">
              {(Object.keys(AMC_PLANS) as ApplianceAmcType[]).map((p) => (
                <button key={p} type="button" onClick={() => choosePlan(p)} aria-pressed={plan === p}
                  className={cn('rounded-xl p-3 text-start ring-1', plan === p ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-800 ring-slate-200 hover:bg-slate-50')}>
                  <span className="block text-[0.875rem] font-semibold">{AMC_PLANS[p].label}</span>
                  <span className={cn('block text-[0.75rem]', plan === p ? 'text-white/75' : 'text-slate-500')}>{AMC_PLANS[p].hint}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Input label={t('Shuru')} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              <div>
                <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{t('Muddat')}</span>
                <div className="flex gap-1.5">{MONTHS.map((m) => <button key={m} type="button" onClick={() => setMonths(m)} className={cn('h-10 flex-1 rounded-lg text-[0.8125rem] font-medium ring-1', months === m ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{t('{{m}} mahine', { m })}</button>)}</div>
              </div>
              <Input label={t('Free visits')} inputMode="numeric" value={visits} onChange={(e) => setVisits(digits(e.target.value))} hint={t('Khatam: {{addMonths}}', { addMonths: addMonths(start || todayKey(), months) })} />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Switch checked={labor} onChange={(e) => setLabor(e.target.checked)} label={t('Mazdoori free')} />
              <Switch checked={gas} onChange={(e) => setGas(e.target.checked)} label={t('Gas refill free')} />
              <Switch checked={parts} onChange={(e) => setParts(e.target.checked)} label={t('Parts free')} />
              <Switch checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} label={t('Khatam par renew yaad dilayein')} />
            </div>
            <Textarea wrapperClassName="mt-3" label={t('Kya cover nahi')} rows={2} value={exclusions} onChange={(e) => setExclusions(e.target.value)} placeholder={t('Compressor, PCB, tootna, paani ka nuqsan')} />
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Wallet}>{t('Paisa')}</T>} description={billed ? t('Bill ban chuka — baqi paisa contract khol kar "Paisa lein" se') : t('Save par bill banega; jo na mile wo khata me')}>
            <div className="space-y-3">
              <Input label={t('Contract ki qeemat')} required inputMode="decimal" value={price} onChange={(e) => setPrice(money(e.target.value))} placeholder="8000" disabled={billed} error={tried && !(value > 0) ? t('Qeemat likhein') : undefined} />
              <Input label={t('Abhi kitna mila')} inputMode="decimal" value={paid} onChange={(e) => setPaid(money(e.target.value))} disabled={billed} error={taken > value + 0.01 ? t('Qeemat se zyada nahi') : undefined} />
              {!billed && taken > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
              {!billed && due > 0 && <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{t('{{due}} customer ke khata me udhaar.', { due: formatPKR(due) })}</p>}
            </div>
          </Card>
          <Card className="rounded-2xl" title={<T icon={FileSignature}>{t('Note')}</T>}>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('Sirf dukaan ke liye')} />
          </Card>
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {tried && problems.length > 0
          ? <p className="me-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problems[0]}</p>
          : <p className="me-auto text-[0.8125rem] text-slate-500">{t('{{label}} · {{months}} mahine · {{value}} visits · {{formatPKR}}', { label: AMC_PLANS[plan].label, months, value: visits || 0, formatPKR: formatPKR(value) })}</p>}
        <Button variant="secondary" onClick={() => navigate(-1)}>{t('Rehne dein')}</Button>
        <Button onClick={submit} loading={save.isPending}>{editing ? t('Save karein') : t('Contract banayein')}</Button>
      </div>
    </PageShell>
  );
}

const T = ({ icon: Icon, children }: { icon: typeof UserRound; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
