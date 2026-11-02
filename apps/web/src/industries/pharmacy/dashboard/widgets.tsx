/** Pharmacy-only dashboard widgets. */

import { Bell, CalendarX, CheckCircle2, ClipboardCheck, Clock, FileText, Pill, ShieldAlert, Snowflake, Thermometer } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { fmtQty, IconBubble, ListRow, MetricTile, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import { MoneyNote, type AttentionItem } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { usePharmacyOps } from './usePharmacyOps';
import { t } from '@core/i18n';

/** Pharmacy headline numbers, offered next to the common ones. */
export const pharmacyKpis: KpiDef[] = [
  {
    id: 'pharmacy-expiry', label: t('Expiry qareeb'), icon: CalendarX, tone: 'danger',
    useValue: () => {
      const { expiry, loading } = usePharmacyOps();
      return {
        loading, to: '/pharmacy/expiring', value: expiry.month.length, alert: expiry.expired.length > 0,
        hint: expiry.expired.length ? t('{{count}} expire ho chuke', { count: expiry.expired.length }) : t('30 din me'),
      };
    },
  },
  {
    id: 'pharmacy-expiry-value', label: t('Expiry wala maal'), icon: Clock, tone: 'warning', sensitive: true,
    useValue: () => {
      const { expiry, loading } = usePharmacyOps();
      const { cost } = useMasked();
      return { loading, to: '/pharmacy/expiring', value: cost(expiry.atRiskValue), hint: t('cost, 30 din me'), alert: expiry.expiredValue > 0 };
    },
  },
  {
    id: 'pharmacy-rx', label: t('Nuskhe baqi'), icon: FileText, tone: 'info',
    useValue: () => {
      const { rx, loading } = usePharmacyOps();
      return { loading, to: '/pharmacy/prescriptions', value: rx.pending, hint: t('{{verified}} dene ko tayyar · {{dispensedToday}} aaj diye', { verified: rx.verified, dispensedToday: rx.dispensedToday }) };
    },
  },
  {
    id: 'pharmacy-refills', label: t('Refill yaad dihani'), icon: Bell, tone: 'neutral',
    useValue: () => {
      const { refillsDue, loading } = usePharmacyOps();
      return { loading, to: '/pharmacy/prescriptions', value: refillsDue, hint: t('aaj aur kal') };
    },
  },
  {
    id: 'pharmacy-cold-chain', label: t('Temperature masla'), icon: Thermometer, tone: 'danger',
    useValue: () => {
      const { tempBreaches, coldChain, loading } = usePharmacyOps();
      return { loading, to: '/pharmacy/temperature-log', value: tempBreaches, alert: tempBreaches > 0, hint: t('7 din · {{coldChain}} thandi dawai', { coldChain }) };
    },
  },
];

export function usePharmacyAttention(): AttentionItem[] {
  const { expiry, rx, refillsDue, tempBreaches } = usePharmacyOps();
  const { cost } = useMasked();
  const items: AttentionItem[] = [];

  if (expiry.expired.length) items.push({ icon: CalendarX, level: 'danger', text: t('{{count}} batch expire ho chuke ({{expiredValue}}) — shelf se hata dein, bechna mana hai', { count: expiry.expired.length, expiredValue: cost(expiry.expiredValue) }), to: '/pharmacy/expiring', cta: t('Expiry dekhein') });
  if (tempBreaches) items.push({ icon: Thermometer, level: 'danger', text: t('Pichle 7 din me {{tempBreaches}} baar fridge ka temperature hadd se bahar gaya', { tempBreaches }), to: '/pharmacy/temperature-log', cta: t('Temp log') });
  if (expiry.week.length) items.push({ icon: Clock, level: 'warning', text: t('{{count}} batch agle 7 din me expire hoga — pehle bechein ya supplier ko wapas karein', { count: expiry.week.length }), to: '/pharmacy/expiring', cta: t('Jaldi nikaalein') });
  if (rx.pending) items.push({ icon: FileText, level: 'warning', text: t('{{pending}} nuskhe pharmacist ke check ka intezar kar rahe hain', { pending: rx.pending }), to: '/pharmacy/prescriptions', cta: t('Check karein') });
  if (rx.verified) items.push({ icon: ClipboardCheck, level: 'info', text: t('{{verified}} nuskhe check ho gaye — dawai deni hai', { verified: rx.verified }), to: '/pharmacy/prescriptions', cta: t('Dawai dein') });
  if (refillsDue) items.push({ icon: Bell, level: 'info', text: t('{{refillsDue}} customers ki dawai khatam hone wali hai — refill ki yaad dila dein', { refillsDue }), to: '/pharmacy/prescriptions', cta: t('Dekhein') });
  return items;
}

/** Batches past or near expiry, soonest first. */
export function PharmacyExpiry() {
  const { expiry } = usePharmacyOps();
  const { cost, costHidden } = useMasked();
  return (
    <WidgetCard
      title={t('Expiry ki fehrist')}
      icon={CalendarX}
      description={expiry.atRiskValue > 0 && !costHidden ? t('{{atRiskValue}} ka maal 30 din me', { atRiskValue: formatPKR(expiry.atRiskValue) }) : t('{{watch}} batch 90 din me', { watch: expiry.watch })}
      to="/pharmacy/expiring"
      flush
    >
      <RowList empty={t('Koi dawai expire hone ke qareeb nahi')} emptyIcon={CheckCircle2}>
        {expiry.list.map((b) => {
          const gone = b.daysLeft <= 0;
          const urgent = b.daysLeft <= 7;
          return (
            <ListRow
              key={b.id}
              to={`/pharmacy-medicines/${b.productId}`}
              leading={<IconBubble icon={Pill} tone={gone ? 'danger' : urgent ? 'warning' : 'neutral'} />}
              title={b.product?.name ?? t('Dawai')}
              meta={<span><span className="font-mono">{b.batchNumber}</span> {' '}{t('· {{quantity}} baqi{{value}}', { quantity: fmtQty(b.quantity), value: b.value ? ` · ${cost(b.value)}` : '' })}</span>}
              value={<Badge variant={gone ? 'danger' : urgent ? 'warning' : b.daysLeft <= 30 ? 'info' : 'default'} size="xs">{gone ? t('Expired') : t('{{daysLeft}} din', { daysLeft: b.daysLeft })}</Badge>}
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
    <WidgetCard title={t('Nuskhe')} icon={FileText} description={t('Check → dawai dena → mukammal')} to="/pharmacy/prescriptions">
      <div className="grid gap-2">
        <MetricTile icon={Clock} tone="warning" label={t('Check baqi')} value={rx.pending} hint={t('Pharmacist ka intezar')} to="/pharmacy/prescriptions" alert={rx.pending > 5} />
        <MetricTile icon={ClipboardCheck} tone="info" label={t('Dene ko tayyar')} value={rx.verified} hint={t('Check ho chuke')} to="/pharmacy/prescriptions" />
        <MetricTile icon={CheckCircle2} tone="success" label={t('Aaj diye')} value={rx.dispensedToday} hint={t('Mukammal nuskhe')} />
      </div>
    </WidgetCard>
  );
}

/** Regulatory side: cold chain, controlled drugs, refills. */
export function PharmacyCompliance() {
  const { tempBreaches, coldChain, controlled, refillsDue } = usePharmacyOps();
  return (
    <WidgetCard title={t('Hifazat aur register')} icon={ShieldAlert} description={t('Fridge, controlled dawai aur refill')}>
      <div className="grid grid-cols-2 gap-2">
        <MetricTile icon={Thermometer} tone={tempBreaches ? 'danger' : 'success'} label={t('Temp masla')} value={tempBreaches} hint={t('Pichle 7 din')} to="/pharmacy/temperature-log" alert={tempBreaches > 0} />
        <MetricTile icon={Snowflake} tone="info" label={t('Thandi dawai')} value={coldChain} hint={t('Fridge wali')} to="/pharmacy/temperature-log" />
        <MetricTile icon={ShieldAlert} tone="danger" label={t('Controlled')} value={controlled} hint={t('Register zaroori')} to="/pharmacy/controlled-log" />
        <MetricTile icon={Bell} tone="warning" label={t('Refill')} value={refillsDue} hint={t('Aaj aur kal')} to="/pharmacy/prescriptions" />
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
      title={t('{{atRiskValue}} ki dawai 30 din me expire ho jayegi', { atRiskValue: formatPKR(expiry.atRiskValue) })}
      text={expiry.expiredValue > 0 ? t('Is me {{expiredValue}} ki pehle hi expire ho chuki — supplier ko wapas karein ya likh dein', { expiredValue: formatPKR(expiry.expiredValue) }) : t('Pehle ye bechein, ya supplier se return ki baat karein')}
      to="/pharmacy/expiring"
      cta={t('Expiry dekhein')}
    />
  );
}
