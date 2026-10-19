/**
 * One panel's statement for a period: every fee bill on the company's khata
 * (patient, token, doctor) and every payment received. Payments are taken
 * with the shared khata dialog; the statement and each payment receipt
 * print through the shared print module.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Building2, CalendarDays, GraduationCap, Receipt, Wallet } from 'lucide-react';
import {
  Badge, Button, Card, EmptyState, Input, KpiCard, KpiRow, PageHero, PageShell, Skeleton, Table, TBody, THead, Td, Th, Tr, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { HeroBack } from '@core/components/HeroBack';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { PrintButton, type PrintDoc } from '@core/print';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { KhataActionModal } from '@modules/customers/directory/components/KhataActionModal';
import { panelsApi, type PanelPayment, type PanelStatement } from '../api/panels.api';
import { FEE_METHODS, dateTime, dayBounds, dayKey, drName, shortDate } from '../lib/meta';

const methodLabel = (m?: string | null) => FEE_METHODS.find((x) => x.value === m)?.label ?? 'Cash';

function statementDoc(s: PanelStatement, from: string, to: string): PrintDoc {
  const live = s.bills.filter((b) => b.status !== 'VOIDED');
  return {
    title: `Panel statement — ${s.panel.name}`,
    subtitle: `${shortDate(from)} se ${shortDate(to)} tak`,
    meta: [['Baqi', formatPKR(s.customer?.balance ?? 0)], ['Credit limit', s.panel.creditLimit > 0 ? formatPKR(s.panel.creditLimit) : 'Had nahi']],
    sections: [
      { kind: 'rows', title: 'Khulasa', rows: [
        { label: 'Bills', value: formatPKR(s.totals.billed) },
        { label: 'Khata me gaya', value: formatPKR(s.totals.onKhata) },
        { label: 'Payment aayi', value: formatPKR(s.totals.received) },
        { label: 'Aaj tak baqi', value: formatPKR(s.customer?.balance ?? 0), strong: true },
      ] },
      { kind: 'table', title: 'Bills', columns: [{ label: 'Date' }, { label: 'Bill' }, { label: 'Mareez' }, { label: 'Doctor', wideOnly: true }, { label: 'Amount', align: 'right' }],
        rows: live.map((b) => [shortDate(b.createdAt), b.saleNumber, b.patient ? `${b.patient.fullName} (${b.patient.mrn})${b.patient.insuranceNumber ? ` · ${b.patient.insuranceNumber}` : ''}` : (b.line ?? '—'), drName(b.doctor) || '—', formatPKR(b.total - b.returned)]),
        footer: ['', '', '', 'Kul', formatPKR(s.totals.billed)] },
      { kind: 'table', title: 'Payments', columns: [{ label: 'Date' }, { label: 'Tareeqa' }, { label: 'Note', wideOnly: true }, { label: 'Amount', align: 'right' }],
        rows: s.payments.map((p) => [shortDate(p.createdAt), methodLabel(p.paymentMethod), p.note ?? p.reference ?? '', formatPKR(p.amount)]),
        footer: ['', '', 'Kul', formatPKR(s.totals.received)] },
    ],
    footer: (s.customer?.balance ?? 0) > 0 ? 'Baraye meherbani baqi amount jald ada karein. Shukriya!' : 'Shukriya!',
  };
}

function receiptDoc(panelName: string, p: PanelPayment): PrintDoc {
  return {
    title: 'Payment receipt',
    subtitle: panelName,
    meta: [['Date', dateTime(p.createdAt)]],
    sections: [{ kind: 'rows', rows: [
      { label: 'Company', value: panelName },
      { label: 'Tareeqa', value: methodLabel(p.paymentMethod) },
      ...(p.note || p.reference ? [{ label: 'Note', value: p.note ?? p.reference ?? '' }] : []),
      ...(p.createdBy?.fullName ? [{ label: 'Wasool kiya', value: p.createdBy.fullName }] : []),
      { label: 'Amount mila', value: formatPKR(p.amount), strong: true },
      { label: 'Ab baqi', value: formatPKR(p.balanceAfter) },
    ] }],
    footer: 'Shukriya!',
  };
}

export default function PanelStatementPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canKhata = usePermission(PERMISSIONS.KHATA_MANAGE);
  const [from, setFrom] = useState(() => dayKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [to, setTo] = useState(dayKey());
  const [paying, setPaying] = useState(false);
  const range = { from: dayBounds(from).from, to: dayBounds(to).to };
  const q = useQuery({ queryKey: ['clinic-panel-statement', id, range.from, range.to], queryFn: () => panelsApi.statement(id, range.from, range.to), placeholderData: (p) => p });
  const reload = () => { qc.invalidateQueries({ queryKey: ['clinic-panel-statement', id] }); qc.invalidateQueries({ queryKey: ['clinic-panels'] }); };

  if (q.isLoading) return <PageShell><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></PageShell>;
  if (!q.data) return <PageShell><EmptyState title="Panel nahi mila" action={<Button onClick={() => navigate('/clinic/panels')}>Panels</Button>} /></PageShell>;
  const s = q.data;
  const balance = s.customer?.balance ?? 0;

  return (
    <PageShell>
      {paying && s.customer && (
        <KhataActionModal action="payment" customer={{ id: s.customer.id, name: s.panel.name, balance }} money={money} onClose={() => setPaying(false)} onDone={() => { setPaying(false); reload(); }} />
      )}
      {guide.isOpen && (
        <PageGuide title="Panel statement" onClose={guide.close}
          steps={[
            { icon: CalendarDays, color: '#2563eb', title: 'Muddat', text: 'Tareekhen chunein — us muddat ke bill aur payments dikhte hain.' },
            { icon: Wallet, color: '#16a34a', title: 'Payment', text: 'Company ne paise diye to "Payment lein" — cheque ya bank bhi. Phir receipt print karein.' },
            { icon: BookOpen, color: '#d97706', title: 'Statement', text: 'Print / PDF se company ko har mareez ke bill ki list bhejein.' },
          ]}
          shortcuts={[['G', 'guide']]} />
      )}

      <PageHero title={<HeroBack to="/clinic/panels" label="Panels">{s.panel.name}</HeroBack>} chip={<><Building2 />{s.panel.isActive ? 'Chalu' : 'Band'}</>}
        busy={q.isFetching} meta={s.panel.creditLimit > 0 ? `Credit limit ${money(s.panel.creditLimit)}` : 'Credit limit nahi'}
        actions={<>
          {s.customer && <Link to={`/customers/${s.customer.id}`} className={heroButton}><BookOpen className="h-4 w-4" />Poora khata</Link>}
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canKhata && s.customer && balance > 0 && <button type="button" onClick={() => setPaying(true)} className={heroPrimaryButton}><Wallet className="h-4 w-4" />Payment lein</button>}
        </>}
        stats={[
          { label: 'Aaj tak baqi', value: money(balance) },
          { label: 'Bills', value: String(s.bills.filter((b) => b.status !== 'VOIDED').length) },
        ]} />

      <div className="flex flex-wrap items-end gap-2">
        <Input label="Kab se" type="date" value={from} onChange={(e) => setFrom(e.target.value || from)} wrapperClassName="w-44" />
        <Input label="Kab tak" type="date" value={to} onChange={(e) => setTo(e.target.value || to)} wrapperClassName="w-44" />
        <PrintButton doc={() => statementDoc(s, range.from, range.to)} label="Statement" disabled={!s.customer} />
      </div>

      <KpiRow cols={3}>
        <KpiCard icon={Receipt} color="#2563eb" label="Bills" value={money(s.totals.billed)} hint={`Khata me ${money(s.totals.onKhata)}`} />
        <KpiCard icon={Wallet} color="#16a34a" label="Payment aayi" value={money(s.totals.received)} />
        <KpiCard icon={BookOpen} color="#d97706" label="Aaj tak baqi" value={money(balance)} />
      </KpiRow>

      {!s.customer ? (
        <Card><EmptyState title="Abhi koi bill nahi" description="Panel wale mareez ki pehli fees par is company ka khata khud banega." /></Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <Card title="Bills" description="Har mareez ki fees jo company ke khata me gayi">
            {s.bills.length === 0 ? <p className="px-6 py-10 text-center text-[0.875rem] text-slate-500">Is muddat me koi bill nahi</p> : (
              <Table minWidth="44rem">
                <THead><Tr><Th>Date</Th><Th>Mareez</Th><Th>Doctor</Th><Th align="right">Amount</Th></Tr></THead>
                <TBody>
                  {s.bills.map((b) => (
                    <Tr key={b.id} interactive={!!b.appointment} onClick={() => b.appointment && navigate(`/clinic/appointments/${b.appointment.id}`)}>
                      <Td className="whitespace-nowrap"><p className="font-semibold text-slate-900">{shortDate(b.createdAt)}</p><p className="text-[0.75rem] text-slate-500">{b.saleNumber}{b.appointment?.tokenNumber != null && ` · Token ${b.appointment.tokenNumber}`}</p></Td>
                      <Td>{b.patient ? <><p className="font-medium text-slate-900">{b.patient.fullName}</p><p className="text-[0.75rem] text-slate-500">{[b.patient.mrn, b.patient.insuranceNumber].filter(Boolean).join(' · ')}</p></> : <span className="text-slate-500">{b.line ?? '—'}</span>}</Td>
                      <Td>{drName(b.doctor) || '—'}</Td>
                      <Td align="right">
                        <p className="font-semibold">{money(b.total - b.returned)}</p>
                        {b.status === 'VOIDED' ? <Badge size="xs" variant="default">Void</Badge> : b.returned > 0 ? <Badge size="xs" variant="warning">{money(b.returned)} wapas</Badge> : null}
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
          <Card title="Payments" description="Company se wasooli">
            {s.payments.length === 0 ? <p className="px-6 py-10 text-center text-[0.875rem] text-slate-500">Is muddat me koi payment nahi</p> : (
              <ul className="divide-y divide-slate-100">
                {s.payments.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{money(p.amount)} <span className="font-normal text-slate-500">· {methodLabel(p.paymentMethod)}</span></p>
                      <p className="truncate text-[0.75rem] text-slate-500">{shortDate(p.createdAt)}{p.note ? ` · ${p.note}` : ''} · baqi {money(p.balanceAfter)}</p>
                    </div>
                    <PrintButton size="sm" label="Receipt" doc={() => receiptDoc(s.panel.name, p)} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </PageShell>
  );
}
