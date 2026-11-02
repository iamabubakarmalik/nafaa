/** Optical-only dashboard widgets. */

import { CalendarClock, CheckCircle2, Clock, Eye, FileText, FlaskConical, Glasses, HandCoins, PhoneCall } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { useOpticalOps } from './useOpticalOps';
import { t as tr } from '@core/i18n';

const TEST_STATUS: Record<string, { label: string; variant: 'default' | 'info' | 'warning' | 'success' }> = {
  SCHEDULED: { label: tr('Booked'), variant: 'default' },
  CONFIRMED: { label: tr('Confirm'), variant: 'info' },
  IN_PROGRESS: { label: tr('Test jaari'), variant: 'warning' },
  COMPLETED: { label: tr('Ho gaya'), variant: 'success' },
};

const slotTime = (t: { scheduledSlot?: string; appointmentDate: string }) =>
  t.scheduledSlot || new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit' }).format(new Date(t.appointmentDate));

/** Optical headline numbers, offered next to the common ones. */
export const opticalKpis: KpiDef[] = [
  {
    id: 'optical-tests', label: tr('Aaj ke eye test'), icon: Eye, tone: 'brand',
    useValue: () => {
      const { pending, testsLeft, loading } = useOpticalOps();
      return { loading, to: '/optical/eye-tests', value: pending.todayAppointments, hint: testsLeft ? tr('{{testsLeft}} baqi', { testsLeft }) : tr('sab ho gaye') };
    },
  },
  {
    id: 'optical-lab', label: tr('Lab me order'), icon: FlaskConical, tone: 'info',
    useValue: () => {
      const { pending, loading } = useOpticalOps();
      return {
        loading, to: '/optical/lens-orders', value: pending.lensOrdersAtLab, alert: pending.overdueLensOrders > 0,
        hint: pending.overdueLensOrders ? tr('{{overdueLensOrders}} late!', { overdueLensOrders: pending.overdueLensOrders }) : tr('waqt par'),
      };
    },
  },
  {
    id: 'optical-ready', label: tr('Chashma tayyar'), icon: Glasses, tone: 'success',
    useValue: () => {
      const { pending, loading } = useOpticalOps();
      return { loading, to: '/optical/lens-orders', value: pending.lensOrdersReady, hint: tr('customer ko bulayein') };
    },
  },
  {
    id: 'optical-rx-expiring', label: tr('Nuskha purana'), icon: FileText, tone: 'warning',
    useValue: () => {
      const { pending, activeRx, loading } = useOpticalOps();
      return { loading, to: '/optical/prescriptions', value: pending.expiringPrescriptions, hint: tr('60 din me · {{activeRx}} chaalu', { activeRx }) };
    },
  },
  {
    id: 'optical-receivable', label: tr('Order ka baqi'), icon: HandCoins, tone: 'danger', sensitive: true,
    useValue: () => {
      const { receivable, loading } = useOpticalOps();
      const { cost } = useMasked();
      return { loading, to: '/optical/lens-orders', value: cost(receivable), hint: tr('customers se lena hai') };
    },
  },
];

export function useOpticalAttention(): AttentionItem[] {
  const { pending, readyDue, testsLeft } = useOpticalOps();
  const { cost } = useMasked();
  const items: AttentionItem[] = [];

  if (pending.overdueLensOrders) items.push({ icon: Clock, level: 'danger', text: tr('{{overdueLensOrders}} lens order lab se late hai — lab ko call karein', { overdueLensOrders: pending.overdueLensOrders }), to: '/optical/lens-orders', cta: tr('Orders dekhein') });
  if (pending.lensOrdersReady) items.push({ icon: PhoneCall, level: 'warning', text: tr('{{lensOrdersReady}} chashme tayyar pare hain — customer ko bulayein{{value}}', { lensOrdersReady: pending.lensOrdersReady, value: readyDue > 0 ? tr(' ({{readyDue}} lena hai)', { readyDue: cost(readyDue) }) : '' }), to: '/optical/lens-orders', cta: tr('Call karein') });
  if (testsLeft) items.push({ icon: Eye, level: 'info', text: tr('Aaj {{testsLeft}} eye test abhi baqi hain', { testsLeft }), to: '/optical/eye-tests', cta: tr('Schedule') });
  if (pending.expiringPrescriptions) items.push({ icon: FileText, level: 'info', text: tr('{{expiringPrescriptions}} customers ka nuskha 60 din me purana ho jayega — naye test ke liye bulayein', { expiringPrescriptions: pending.expiringPrescriptions }), to: '/optical/prescriptions', cta: tr('Nuskhe dekhein') });
  return items;
}

/** Today's eye-test appointments. */
export function OpticalSchedule() {
  const { schedule, testsLeft, pending } = useOpticalOps();
  return (
    <WidgetCard title={tr('Aaj ke eye test')} icon={Eye} description={pending.todayAppointments ? tr('{{todayAppointments}} appointment · {{testsLeft}} baqi', { todayAppointments: pending.todayAppointments, testsLeft }) : tr('Aaj koi appointment nahi')} to="/optical/eye-tests" flush>
      <RowList empty={tr('Aaj koi eye test booked nahi')} emptyIcon={CalendarClock}>
        {schedule.map((t) => {
          const s = TEST_STATUS[t.status] ?? { label: t.status, variant: 'default' as const };
          return (
            <ListRow
              key={t.id}
              to={`/optical/eye-tests/${t.id}`}
              leading={<span className="flex h-9 min-w-[3.25rem] shrink-0 items-center justify-center rounded-lg bg-brand-50 px-1.5 text-[0.75rem] font-bold tabular-nums text-brand-700">{slotTime(t)}</span>}
              title={t.customerName}
              meta={[t.customerPhone, t.optometristName].filter(Boolean).join(' · ')}
              value={<Badge variant={s.variant} size="xs">{s.label}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

/** Finished glasses waiting for the customer. */
export function OpticalPickup() {
  const { ready, readyDue, pending } = useOpticalOps();
  const { cost, costHidden } = useMasked();
  return (
    <WidgetCard
      title={tr('Chashma tayyar')}
      icon={Glasses}
      description={readyDue > 0 && !costHidden ? tr('{{readyDue}} lena baqi', { readyDue: formatPKR(readyDue) }) : tr('{{lensOrdersReady}} customer ko bulana hai', { lensOrdersReady: pending.lensOrdersReady })}
      to="/optical/lens-orders"
      flush
    >
      <RowList empty={tr('Koi chashma pickup ke liye nahi para')} emptyIcon={CheckCircle2}>
        {ready.map((o) => (
          <ListRow
            key={o.id}
            to={`/optical/lens-orders/${o.id}`}
            leading={<IconBubble icon={PhoneCall} tone="success" />}
            title={o.customerName}
            meta={[o.frameName, o.customerPhone].filter(Boolean).join(' · ')}
            value={o.remainingAmount && o.remainingAmount > 0 ? <span className="text-rose-700">{cost(o.remainingAmount)}</span> : <Badge variant="success" size="xs">{tr('Paid')}</Badge>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

/** Lens orders past their promised date. */
export function OpticalLabLate() {
  const { overdue, pending } = useOpticalOps();
  return (
    <WidgetCard title={tr('Lab se late')} icon={FlaskConical} description={tr('{{lensOrdersAtLab}} lab me · {{overdueLensOrders}} late', { lensOrdersAtLab: pending.lensOrdersAtLab, overdueLensOrders: pending.overdueLensOrders })} to="/optical/lens-orders" flush>
      <RowList empty={tr('Lab ke saare order waqt par hain')} emptyIcon={CheckCircle2}>
        {overdue.map((o) => (
          <ListRow
            key={o.id}
            to={`/optical/lens-orders/${o.id}`}
            leading={<IconBubble icon={Clock} tone="danger" />}
            title={o.customerName}
            meta={<span><span className="font-mono">{o.orderNumber}</span> · {o.labName || tr('Lab nahi likhi')}</span>}
            value={<Badge variant="danger" size="xs">{tr('{{daysLate}} din late', { daysLate: o.daysLate })}</Badge>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

/** Prescriptions that expire soon: a reason to call the customer back. */
export function OpticalRxExpiring() {
  const { expiring, pending } = useOpticalOps();
  return (
    <WidgetCard title={tr('Nuskha purana ho raha')} icon={FileText} description={tr('{{expiringPrescriptions}} nuskhe 60 din me', { expiringPrescriptions: pending.expiringPrescriptions })} to="/optical/prescriptions" flush>
      <RowList empty={tr('Koi nuskha jald purana nahi ho raha')} emptyIcon={FileText}>
        {expiring.map((rx) => (
          <ListRow
            key={rx.id}
            to={`/optical/prescriptions/${rx.id}`}
            leading={<IconBubble icon={FileText} tone={rx.daysLeft <= 7 ? 'danger' : 'warning'} />}
            title={rx.customerName}
            meta={<span><span className="font-mono">{rx.prescriptionNumber}</span>{rx.customerPhone ? ` · ${rx.customerPhone}` : ''}</span>}
            value={<Badge variant={rx.daysLeft <= 7 ? 'danger' : rx.daysLeft <= 30 ? 'warning' : 'default'} size="xs">{tr('{{daysLeft}} din', { daysLeft: rx.daysLeft })}</Badge>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}
