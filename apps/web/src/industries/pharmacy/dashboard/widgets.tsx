/** Pharmacy-only dashboard widgets. */

import { Bell, CalendarX, CheckCircle2, ClipboardCheck, Clock, FileText, Pill, ShieldAlert, Snowflake, Thermometer } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { fmtQty, IconBubble, ListRow, MetricTile, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import { MoneyNote, type AttentionItem } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { usePharmacyOps } from './usePharmacyOps';

/** Pharmacy headline numbers, offered next to the common ones. */
export const pharmacyKpis: KpiDef[] = [
  {
    id: 'pharmacy-expiry', label: 'Expiry qareeb', icon: CalendarX, tone: 'danger',
    useValue: () => {
      const { expiry, loading } = usePharmacyOps();
      return {
        loading, to: '/pharmacy/expiring', value: expiry.month.length, alert: expiry.expired.length > 0,
        hint: expiry.expired.length ? `${expiry.expired.length} expire ho chuke` : '30 din me',
      };
    },
  },
  {
    id: 'pharmacy-expiry-value', label: 'Expiry wala maal', icon: Clock, tone: 'warning', sensitive: true,
    useValue: () => {
      const { expiry, loading } = usePharmacyOps();
      const { cost } = useMasked();
      return { loading, to: '/pharmacy/expiring', value: cost(expiry.atRiskValue), hint: 'cost, 30 din me', alert: expiry.expiredValue > 0 };
    },
  },
  {
    id: 'pharmacy-rx', label: 'Nuskhe baqi', icon: FileText, tone: 'info',
    useValue: () => {
      const { rx, loading } = usePharmacyOps();
      return { loading, to: '/pharmacy/prescriptions', value: rx.pending, hint: `${rx.verified} dene ko tayyar · ${rx.dispensedToday} aaj diye` };
    },
  },
  {
    id: 'pharmacy-refills', label: 'Refill yaad dihani', icon: Bell, tone: 'neutral',
    useValue: () => {
      const { refillsDue, loading } = usePharmacyOps();
      return { loading, to: '/pharmacy/prescriptions', value: refillsDue, hint: 'aaj aur kal' };
    },
  },
  {
    id: 'pharmacy-cold-chain', label: 'Temperature masla', icon: Thermometer, tone: 'danger',
    useValue: () => {
      const { tempBreaches, coldChain, loading } = usePharmacyOps();
      return { loading, to: '/pharmacy/temperature-log', value: tempBreaches, alert: tempBreaches > 0, hint: `7 din · ${coldChain} thandi dawai` };
    },
  },
];

export function usePharmacyAttention(): AttentionItem[] {
  const { expiry, rx, refillsDue, tempBreaches } = usePharmacyOps();
  const { cost } = useMasked();
  const items: AttentionItem[] = [];

  if (expiry.expired.length) items.push({ icon: CalendarX, level: 'danger', text: `${expiry.expired.length} batch expire ho chuke (${cost(expiry.expiredValue)}) — shelf se hata dein, bechna mana hai`, to: '/pharmacy/expiring', cta: 'Expiry dekhein' });
  if (tempBreaches) items.push({ icon: Thermometer, level: 'danger', text: `Pichle 7 din me ${tempBreaches} baar fridge ka temperature hadd se bahar gaya`, to: '/pharmacy/temperature-log', cta: 'Temp log' });
  if (expiry.week.length) items.push({ icon: Clock, level: 'warning', text: `${expiry.week.length} batch agle 7 din me expire hoga — pehle bechein ya supplier ko wapas karein`, to: '/pharmacy/expiring', cta: 'Jaldi nikaalein' });
  if (rx.pending) items.push({ icon: FileText, level: 'warning', text: `${rx.pending} nuskhe pharmacist ke check ka intezar kar rahe hain`, to: '/pharmacy/prescriptions', cta: 'Check karein' });
  if (rx.verified) items.push({ icon: ClipboardCheck, level: 'info', text: `${rx.verified} nuskhe check ho gaye — dawai deni hai`, to: '/pharmacy/prescriptions', cta: 'Dawai dein' });
  if (refillsDue) items.push({ icon: Bell, level: 'info', text: `${refillsDue} customers ki dawai khatam hone wali hai — refill ki yaad dila dein`, to: '/pharmacy/prescriptions', cta: 'Dekhein' });
  return items;
}

/** Batches past or near expiry, soonest first. */
export function PharmacyExpiry() {
  const { expiry } = usePharmacyOps();
  const { cost, costHidden } = useMasked();
  return (
    <WidgetCard
      title="Expiry ki fehrist"
      icon={CalendarX}
      description={expiry.atRiskValue > 0 && !costHidden ? `${formatPKR(expiry.atRiskValue)} ka maal 30 din me` : `${expiry.watch} batch 90 din me`}
      to="/pharmacy/expiring"
      flush
    >
      <RowList empty="Koi dawai expire hone ke qareeb nahi" emptyIcon={CheckCircle2}>
        {expiry.list.map((b) => {
          const gone = b.daysLeft <= 0;
          const urgent = b.daysLeft <= 7;
          return (
            <ListRow
              key={b.id}
              to={`/pharmacy-medicines/${b.productId}`}
              leading={<IconBubble icon={Pill} tone={gone ? 'danger' : urgent ? 'warning' : 'neutral'} />}
              title={b.product?.name ?? 'Dawai'}
              meta={<span><span className="font-mono">{b.batchNumber}</span> · {fmtQty(b.quantity)} baqi{b.value ? ` · ${cost(b.value)}` : ''}</span>}
              value={<Badge variant={gone ? 'danger' : urgent ? 'warning' : b.daysLeft <= 30 ? 'info' : 'default'} size="xs">{gone ? 'Expired' : `${b.daysLeft} din`}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

/** Prescription workflow: waiting for check → ready to dispense → dispensed today. */
export function PharmacyPrescriptions() {
  const { rx } = usePharmacyOps();
  return (
    <WidgetCard title="Nuskhe" icon={FileText} description="Check → dawai dena → mukammal" to="/pharmacy/prescriptions">
      <div className="grid gap-2">
        <MetricTile icon={Clock} tone="warning" label="Check baqi" value={rx.pending} hint="Pharmacist ka intezar" to="/pharmacy/prescriptions" alert={rx.pending > 5} />
        <MetricTile icon={ClipboardCheck} tone="info" label="Dene ko tayyar" value={rx.verified} hint="Check ho chuke" to="/pharmacy/prescriptions" />
        <MetricTile icon={CheckCircle2} tone="success" label="Aaj diye" value={rx.dispensedToday} hint="Mukammal nuskhe" />
      </div>
    </WidgetCard>
  );
}

/** Regulatory side: cold chain, controlled drugs, refills. */
export function PharmacyCompliance() {
  const { tempBreaches, coldChain, controlled, refillsDue } = usePharmacyOps();
  return (
    <WidgetCard title="Hifazat aur register" icon={ShieldAlert} description="Fridge, controlled dawai aur refill">
      <div className="grid grid-cols-2 gap-2">
        <MetricTile icon={Thermometer} tone={tempBreaches ? 'danger' : 'success'} label="Temp masla" value={tempBreaches} hint="Pichle 7 din" to="/pharmacy/temperature-log" alert={tempBreaches > 0} />
        <MetricTile icon={Snowflake} tone="info" label="Thandi dawai" value={coldChain} hint="Fridge wali" to="/pharmacy/temperature-log" />
        <MetricTile icon={ShieldAlert} tone="danger" label="Controlled" value={controlled} hint="Register zaroori" to="/pharmacy/controlled-log" />
        <MetricTile icon={Bell} tone="warning" label="Refill" value={refillsDue} hint="Aaj aur kal" to="/pharmacy/prescriptions" />
      </div>
    </WidgetCard>
  );
}

/** Expired and soon-to-expire stock, called out under the money map. */
export function usePharmacyMoneyNotes() {
  const { expiry } = usePharmacyOps();
  if (expiry.atRiskValue <= 0) return null;
  return (
    <MoneyNote
      tone="danger"
      icon={CalendarX}
      title={`${formatPKR(expiry.atRiskValue)} ki dawai 30 din me expire ho jayegi`}
      text={expiry.expiredValue > 0 ? `Is me ${formatPKR(expiry.expiredValue)} ki pehle hi expire ho chuki — supplier ko wapas karein ya likh dein` : 'Pehle ye bechein, ya supplier se return ki baat karein'}
      to="/pharmacy/expiring"
      cta="Expiry dekhein"
    />
  );
}
