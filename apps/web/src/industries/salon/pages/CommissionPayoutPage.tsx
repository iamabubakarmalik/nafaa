/**
 * Commission payout for one stylist: the period's billed services with the
 * commission on each, what is still owed (not paid, not returned), paying
 * it from the drawer as an expense, and the slips of earlier payouts.
 *
 * Keys: P pay · 1 owed · 2 all lines · 3 payouts · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Coins, FileText, GraduationCap, History, ListChecks, Receipt, Undo2, Wallet } from 'lucide-react';
import { HeroBack } from '@core/components/HeroBack';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Badge, Button, Card, Checkbox, DateRangeMenu, FilterBar, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, Skeleton, Table, TBody, Td, Textarea, Th, THead, Tr, ViewTabs,
  heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { staffProfilesApi, type PayoutSlip } from '../api/staff-profiles.api';
import { CardTitle, EmptyList, HeroPrint, ListSkeleton, LoadFailed } from '../components/ui';
import { SALON_KEYS, apiError, dateOf, staffName } from '../lib/meta';
import { useSalonCan } from '../lib/permissions';
import { t } from '@core/i18n';

type Tab = 'owed' | 'all' | 'payouts';

const slipDoc = (s: PayoutSlip): PrintDoc => ({
  title: t('Commission slip — {{value}}', { value: s.staffName ?? 'Stylist' }),
  subtitle: s.ref,
  meta: [
    [t('Date'), dateOf(s.paidAt)],
    [t('Amount'), formatPKR(s.amount)],
    ...(s.expense ? [[t('Payment'), s.expense.paymentMethod] as [string, string], [t('Diya'), s.expense.paidBy ?? '—'] as [string, string]] : []),
  ],
  sections: [{
    kind: 'table',
    columns: [{ label: t('Date') }, { label: t('Bill'), wideOnly: true }, { label: t('Customer'), wideOnly: true }, { label: t('Service') }, { label: t('Commission'), align: 'right' }],
    rows: s.lines.map((l) => [dateOf(l.at), l.saleNumber ?? l.appointmentNumber, l.customerName ?? '—', l.serviceName, formatPKR(l.commission)]),
    footer: ['', '', '', t('Kul'), formatPKR(s.amount)],
  }],
  footer: t('Stylist ka dastakhat: ____________________'),
});

export default function CommissionPayoutPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const can = useSalonCan();
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const [tab, setTab] = useState<Tab>('owed');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [paying, setPaying] = useState(false);
  const [slip, setSlip] = useState<PayoutSlip | null>(null);

  const period = resolveRange(range, startHour);
  const peopleQ = useQuery({ queryKey: [SALON_KEYS.staff, 'list'], queryFn: () => staffProfilesApi.list(), staleTime: 60_000 });
  const comQ = useQuery({
    queryKey: [SALON_KEYS.staff, 'commission', period?.from, period?.to, id],
    queryFn: () => staffProfilesApi.commission({ ...(period ?? {}), staffProfileId: id }),
    enabled: can.commission && !!id,
  });
  const payoutsQ = useQuery({ queryKey: [SALON_KEYS.staff, 'payouts', id], queryFn: () => staffProfilesApi.payouts(id), enabled: can.commission && !!id });
  useEffect(() => { setPicked(null); }, [period?.from, period?.to]);

  const person = peopleQ.data?.find((p) => p.id === id);
  const name = person ? staffName(person) : comQ.data?.staff[0]?.name ?? t('Stylist');
  const com = comQ.data;
  const me = com?.staff[0];
  const lines = useMemo(() => com?.lines ?? [], [com]);
  const owed = useMemo(() => lines.filter((l) => !l.paidAt && !l.returned && l.commission > 0), [lines]);
  const chosen = picked ?? new Set(owed.map((l) => l.id));
  const chosenAmount = owed.filter((l) => chosen.has(l.id)).reduce((s, l) => s + l.commission, 0);
  const toggle = (lineId: string) => setPicked(() => {
    const next = new Set(chosen);
    if (next.has(lineId)) next.delete(lineId); else next.add(lineId);
    return next;
  });

  const openSlip = useMutation({
    mutationFn: (ref: string) => staffProfilesApi.slip(ref),
    onSuccess: setSlip,
    onError: (e) => toast.error(apiError(e, t('Slip nahi khuli'))),
  });

  const canPay = can.payCommission && chosenAmount > 0 && !!period;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'p' || e.key === 'P') && canPay) { e.preventDefault(); setPaying(true); }
      if (e.key === '1') setTab('owed');
      if (e.key === '2') setTab('all');
      if (e.key === '3') setTab('payouts');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const printDoc = (): PrintDoc => ({
    title: t('Commission — {{name}}', { name }),
    subtitle: com ? rangeLabel(com.from, com.to) : '',
    meta: me ? [[t('Banti'), formatPKR(me.net)], [t('Di gayi'), formatPKR(me.paid)], [t('Baqi'), formatPKR(me.unpaid)]] : [],
    sections: [{
      kind: 'table',
      columns: [{ label: t('Date') }, { label: t('Bill'), wideOnly: true }, { label: t('Service') }, { label: t('Halat') }, { label: t('Commission'), align: 'right' }],
      rows: lines.map((l) => [dateOf(l.at), l.saleNumber, l.serviceName, l.returned ? t('Wapas') : l.paidAt ? t('Di gayi {{value}}', { value: l.payoutRef ?? '' }).trim() : t('Baqi'), formatPKR(l.commission)]),
    }],
  });

  if (!can.commission) {
    return (
      <PageShell>
        <EmptyList icon={Coins} title={t('Commission dekhne ki permission nahi')} text={t('Owner se commission.view ya commission.manage ki permission lein.')} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHero
        title={<HeroBack to="/salon/staff" label={t('Stylist')}>{t('{{name}} — commission', { name })}</HeroBack>}
        chip={<><Coins /> {' '}{t('Payout')}</>}
        meta={com ? rangeLabel(com.from, com.to) : t('Period chunein')}
        busy={comQ.isFetching && !comQ.isLoading}
        loading={comQ.isLoading}
        actions={<>
          <HeroPrint doc={printDoc} disabled={!lines.length} />
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.payCommission && (
            <button type="button" onClick={() => setPaying(true)} disabled={!canPay} title={t('Commission dein (P)')} className={cn(heroPrimaryButton, !canPay && 'opacity-60')}>
              <Wallet className="h-4 w-4" /> {' '}{t('{{chosenAmount}} dein', { chosenAmount: formatPKR(chosenAmount) })}
            </button>
          )}
        </>}
        stats={me ? [
          { label: t('Banti'), value: formatPKR(me.net) },
          { label: t('Di gayi'), value: formatPKR(me.paid) },
          { label: t('Baqi'), value: formatPKR(me.unpaid) },
        ] : []}
      />

      <KpiRow cols={4}>
        {comQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Receipt} color="#16a34a" label={t('Services')} value={me?.services ?? 0} hint={me ? t('Bill {{revenue}}', { revenue: formatPKR(me.revenue) }) : undefined} onClick={() => setTab('all')} active={tab === 'all'} />
          <KpiCard icon={Coins} color="#ca8a04" label={t('Baqi commission')} value={formatPKR(me?.unpaid ?? 0)} hint={t('{{count}} services', { count: owed.length })} onClick={() => setTab('owed')} active={tab === 'owed'} />
          <KpiCard icon={History} color="#0891b2" label={t('Di ja chuki')} value={formatPKR(me?.paid ?? 0)} hint={t('{{value}} payouts', { value: payoutsQ.data?.length ?? 0 })} onClick={() => setTab('payouts')} active={tab === 'payouts'} />
          <KpiCard icon={Undo2} color={me?.paidThenReturned ? '#e11d48' : '#64748b'} label={t('Di gayi, phir wapas')} value={formatPKR(me?.paidThenReturned ?? 0)} hint={t('Agli payout me hisaab karein')} />
        </>}
      </KpiRow>

      <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">{t('Bill ki date se. Void bill shamil nahi; wapas hui service ki commission nahi banti.')}</p>}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label={t('Period')} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} hint={<>{can.payCommission && <><Kbd>P</Kbd> {' '}{t('dein ·')}{' '} </>}<Kbd>1</Kbd>-<Kbd>3</Kbd> {' '}{t('tabs')}</>}
        tabs={[
          { id: 'owed', label: t('Baqi'), icon: Coins, count: owed.length },
          { id: 'all', label: t('Sab services'), icon: ListChecks, count: lines.length },
          { id: 'payouts', label: t('Payouts'), icon: History, count: payoutsQ.data?.length ?? null },
        ]} />

      {tab === 'payouts' ? (
        payoutsQ.isLoading ? <ListSkeleton /> : payoutsQ.isError ? <LoadFailed what={t('Payouts')} retry={() => payoutsQ.refetch()} /> : !payoutsQ.data?.length ? (
          <EmptyList icon={History} title={t('Abhi koi payout nahi')} text={t('Baqi commission chun kar \'dein\' dabayein — drawer se Expense likha jata hai aur slip print hoti hai.')} />
        ) : (
          <Card flush title={<CardTitle icon={History}>{t('Pichli payouts')}</CardTitle>}>
            <Table minWidth="36rem">
              <THead><Tr><Th>{t('Date')}</Th><Th>{t('Slip')}</Th><Th align="right">{t('Services')}</Th><Th>{t('Payment')}</Th><Th align="right">{t('Amount')}</Th><Th /></Tr></THead>
              <TBody>
                {payoutsQ.data.map((p) => (
                  <Tr key={p.ref}>
                    <Td>{dateOf(p.paidAt)}</Td>
                    <Td className="font-mono text-[0.8125rem]">{p.ref}{p.expense?.status === 'CANCELLED' && <Badge size="xs" variant="danger" className="ms-1">{t('Expense cancel')}</Badge>}</Td>
                    <Td align="right" className="tabular-nums">{p.services}</Td>
                    <Td>{p.expense?.paymentMethod ?? '—'}</Td>
                    <Td align="right" className="font-semibold tabular-nums">{formatPKR(p.amount)}</Td>
                    <Td align="right"><Button size="sm" variant="ghost" leftIcon={<FileText className="h-4 w-4" />} loading={openSlip.isPending && openSlip.variables === p.ref} onClick={() => openSlip.mutate(p.ref)}>{t('Slip')}</Button></Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>
        )
      ) : comQ.isLoading ? <ListSkeleton /> : comQ.isError ? <LoadFailed what={t('Commission')} retry={() => comQ.refetch()} /> : !(tab === 'owed' ? owed : lines).length ? (
        <EmptyList icon={Coins} title={tab === 'owed' ? t('Is period me koi baqi commission nahi') : t('Is period me koi service nahi')} text={t('Counter par har service ke saath stylist chunein — bill bante hi commission yahan aa jati hai.')} />
      ) : (
        <Card flush title={<CardTitle icon={Receipt}>{tab === 'owed' ? t('Baqi commission — jo dena hai chunein') : t('Har service')}</CardTitle>}
          actions={<span className="text-[0.875rem] font-bold tabular-nums">{formatPKR(tab === 'owed' ? chosenAmount : me?.net ?? 0)}</span>}>
          <Table minWidth="40rem">
            <THead><Tr>{tab === 'owed' && <Th className="w-10" />}<Th>{t('Date')}</Th><Th>{t('Bill')}</Th><Th>{t('Customer')}</Th><Th>{t('Service')}</Th><Th align="right">{t('Amount')}</Th><Th align="right">{t('Commission')}</Th>{tab === 'all' && <Th>{t('Halat')}</Th>}</Tr></THead>
            <TBody>
              {(tab === 'owed' ? owed : lines).map((l) => (
                <Tr key={l.id} className={l.returned ? 'bg-rose-50/40' : ''}>
                  {tab === 'owed' && <Td><Checkbox aria-label={t('Chunein')} checked={chosen.has(l.id)} onChange={() => toggle(l.id)} disabled={!can.payCommission} /></Td>}
                  <Td>{dateOf(l.at)}</Td>
                  <Td><Link to={`/salon/appointments/${l.appointmentId}`} className="text-brand-700 hover:underline">{l.saleNumber}</Link></Td>
                  <Td>{l.customerName ?? t('Walk-in')}</Td>
                  <Td>{l.serviceName}</Td>
                  <Td align="right" className="tabular-nums">{l.total ? formatPKR(l.total) : <span className="text-success-700">{t('Package')}</span>}</Td>
                  <Td align="right" className={cn('tabular-nums', l.returned && 'text-rose-700 line-through')}>{formatPKR(l.commission)}</Td>
                  {tab === 'all' && (
                    <Td>
                      {l.returned && <Badge size="xs" variant="danger">{t('Wapas')}</Badge>}
                      {l.paidAt ? (
                        <button type="button" onClick={() => l.payoutRef && openSlip.mutate(l.payoutRef)} className="ms-1"><Badge size="xs" variant="success">{t('Di gayi {{paidAt}}', { paidAt: dateOf(l.paidAt) })}</Badge></button>
                      ) : !l.returned && <Badge size="xs" variant="warning">{t('Baqi')}</Badge>}
                    </Td>
                  )}
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      {paying && period && (
        <PayModal name={name} amount={chosenAmount} count={owed.filter((l) => chosen.has(l.id)).length} periodLabel={rangeLabel(period.from, period.to)}
          onClose={() => setPaying(false)}
          onPay={async (method, note) => {
            const ids = owed.filter((l) => chosen.has(l.id)).map((l) => l.id);
            const s = await staffProfilesApi.pay({ staffProfileId: id, from: period.from, to: period.to, lineIds: ids.length === owed.length ? undefined : ids, paymentMethod: method, note });
            toast.success(t('{{amount}} commission di gayi — {{ref}}', { amount: formatPKR(s.amount), ref: s.ref }));
            setPaying(false); setPicked(null); setSlip(s);
            qc.invalidateQueries({ queryKey: [SALON_KEYS.staff] });
          }} />
      )}
      {slip && (
        <Modal open onClose={() => setSlip(null)} size="lg" title={t('Slip {{ref}}', { ref: slip.ref })} description={`${slip.staffName ?? ''} · ${dateOf(slip.paidAt)} · ${formatPKR(slip.amount)}`}
          footer={<><Button variant="secondary" onClick={() => setSlip(null)}>{t('Band karein')}</Button><PrintButton doc={() => slipDoc(slip)} label={t('Slip print')} /></>}>
          <Table minWidth="30rem">
            <THead><Tr><Th>{t('Date')}</Th><Th>{t('Bill')}</Th><Th>{t('Service')}</Th><Th align="right">{t('Commission')}</Th></Tr></THead>
            <TBody>
              {slip.lines.map((l) => (
                <Tr key={l.id}><Td>{dateOf(l.at)}</Td><Td>{l.saleNumber ?? l.appointmentNumber}</Td><Td>{l.serviceName}</Td><Td align="right" className="tabular-nums">{formatPKR(l.commission)}</Td></Tr>
              ))}
            </TBody>
          </Table>
          {slip.expense?.status === 'CANCELLED' && <p className="mt-3 text-[0.8125rem] text-rose-700">{t('Is payout ka Expense cancel ho chuka hai — paisa drawer se nahi gaya.')}</p>}
        </Modal>
      )}

      {guide.isOpen && (
        <PageGuide title={t('Commission payout — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Coins, color: '#ca8a04', title: t('Baqi commission'), text: t('Period chunein: jo services bill ho chuki aur wapas nahi hui, un ki commission yahan baqi dikhti hai.') },
            { icon: Wallet, color: '#16a34a', title: t('Dein'), text: t('Jo dena hai chunein aur "dein" dabayein. Paisa drawer (ya bank / wallet) se Expense ban kar jata hai, aur lines "di gayi" ho jati hain.') },
            { icon: FileText, color: '#0891b2', title: t('Slip'), text: t('Har payout ki slip print karein aur stylist se dastakhat lein. Pichli slips "Payouts" tab me hain.') },
            { icon: Undo2, color: '#e11d48', title: t('Wapas service'), text: t('Di gayi commission wali service baad me wapas ho to "Di gayi, phir wapas" me dikhti hai — agli payout me khud hisaab karein.') },
          ]}
          shortcuts={[['P', 'dein'], ['1', 'baqi'], ['2', t('sab services')], ['3', 'payouts'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function PayModal({ name, amount, count, periodLabel, onPay, onClose }: {
  name: string; amount: number; count: number; periodLabel: string;
  onPay: (method: PaymentMethod, note?: string) => Promise<void>; onClose: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const pay = useMutation({ mutationFn: () => onPay(method, note.trim() || undefined), onError: (e) => toast.error(apiError(e, t('Commission nahi di gayi'))) });
  return (
    <Modal open onClose={onClose} size="md" title={t('{{name}} ko {{amount}} dein', { name, amount: formatPKR(amount) })} description={t('{{count}} services · {{periodLabel}}', { count, periodLabel })}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button><Button loading={pay.isPending} onClick={() => pay.mutate()} leftIcon={<Wallet className="h-4 w-4" />}>{t('Dein {{amount}}', { amount: formatPKR(amount) })}</Button></>}>
      <div className="space-y-3">
        <PaymentMethodPicker value={method} onChange={setMethod} label={t('Kahan se diya')} />
        <Textarea label={t('Note')} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} placeholder={t('Hafta 1–7 Oct')} hint={t('Marzi hai')} />
        <p className="text-[0.75rem] text-slate-500">{t('Ye Expenses me "Staff commission" ke naam se likha jata hai aur profit me kharcha ginta hai.')}</p>
      </div>
    </Modal>
  );
}
