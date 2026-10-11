/** Optical-only dashboard widgets. */

import { CalendarClock, CheckCircle2, Clock, Eye, FileText, FlaskConical, Glasses, HandCoins, PhoneCall } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { useOpticalOps } from './useOpticalOps';

const TEST_STATUS: Record<string, { label: string; variant: 'default' | 'info' | 'warning' | 'success' }> = {
  SCHEDULED: { label: 'Booked', variant: 'default' },
  CONFIRMED: { label: 'Confirm', variant: 'info' },
  IN_PROGRESS: { label: 'Test jaari', variant: 'warning' },
  COMPLETED: { label: 'Ho gaya', variant: 'success' },
};

const slotTime = (t: { scheduledSlot?: string; appointmentDate: string }) =>
  t.scheduledSlot || new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit' }).format(new Date(t.appointmentDate));

/** Optical headline numbers, offered next to the common ones. */
export const opticalKpis: KpiDef[] = [
  {
    id: 'optical-tests', label: 'Aaj ke eye test', icon: Eye, tone: 'brand',
    useValue: () => {
      const { pending, testsLeft, loading } = useOpticalOps();
      return { loading, to: '/optical/eye-tests', value: pending.todayAppointments, hint: testsLeft ? `${testsLeft} baqi` : 'sab ho gaye' };
    },
  },
  {
    id: 'optical-lab', label: 'Lab me order', icon: FlaskConical, tone: 'info',
    useValue: () => {
      const { pending, loading } = useOpticalOps();
      return {
        loading, to: '/optical/lens-orders', value: pending.lensOrdersAtLab, alert: pending.overdueLensOrders > 0,
        hint: pending.overdueLensOrders ? `${pending.overdueLensOrders} late!` : 'waqt par',
      };
    },
  },
  {
    id: 'optical-ready', label: 'Chashma tayyar', icon: Glasses, tone: 'success',
    useValue: () => {
      const { pending, loading } = useOpticalOps();
      return { loading, to: '/optical/lens-orders', value: pending.lensOrdersReady, hint: 'customer ko bulayein' };
    },
  },
  {
    id: 'optical-rx-expiring', label: 'Nuskha purana', icon: FileText, tone: 'warning',
    useValue: () => {
      const { pending, activeRx, loading } = useOpticalOps();
      return { loading, to: '/optical/prescriptions', value: pending.expiringPrescriptions, hint: `60 din me · ${activeRx} chaalu` };
    },
  },
  {
    id: 'optical-receivable', label: 'Order ka baqi', icon: HandCoins, tone: 'danger', sensitive: true,
    useValue: () => {
      const { receivable, loading } = useOpticalOps();
      const { cost } = useMasked();
      return { loading, to: '/optical/lens-orders', value: cost(receivable), hint: 'customers se lena hai' };
    },
  },
];

export function useOpticalAttention(): AttentionItem[] {
  const { pending, readyDue, testsLeft } = useOpticalOps();
  const { cost } = useMasked();
  const items: AttentionItem[] = [];

  if (pending.overdueLensOrders) items.push({ icon: Clock, level: 'danger', text: `${pending.overdueLensOrders} lens order lab se late hai — lab ko call karein`, to: '/optical/lens-orders', cta: 'Orders dekhein' });
  if (pending.lensOrdersReady) items.push({ icon: PhoneCall, level: 'warning', text: `${pending.lensOrdersReady} chashme tayyar pare hain — customer ko bulayein${readyDue > 0 ? ` (${cost(readyDue)} lena hai)` : ''}`, to: '/optical/lens-orders', cta: 'Call karein' });
  if (testsLeft) items.push({ icon: Eye, level: 'info', text: `Aaj ${testsLeft} eye test abhi baqi hain`, to: '/optical/eye-tests', cta: 'Schedule' });
  if (pending.expiringPrescriptions) items.push({ icon: FileText, level: 'info', text: `${pending.expiringPrescriptions} customers ka nuskha 60 din me purana ho jayega — naye test ke liye bulayein`, to: '/optical/prescriptions', cta: 'Nuskhe dekhein' });
  return items;
}

/** Today's eye-test appointments. */
export function OpticalSchedule() {
  const { schedule, testsLeft, pending } = useOpticalOps();
  return (
    <WidgetCard title="Aaj ke eye test" icon={Eye} description={pending.todayAppointments ? `${pending.todayAppointments} appointment · ${testsLeft} baqi` : 'Aaj koi appointment nahi'} to="/optical/eye-tests" flush>
      <RowList empty="Aaj koi eye test booked nahi" emptyIcon={CalendarClock}>
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
      title="Chashma tayyar"
      icon={Glasses}
      description={readyDue > 0 && !costHidden ? `${formatPKR(readyDue)} lena baqi` : `${pending.lensOrdersReady} customer ko bulana hai`}
      to="/optical/lens-orders"
      flush
    >
      <RowList empty="Koi chashma pickup ke liye nahi para" emptyIcon={CheckCircle2}>
        {ready.map((o) => (
          <ListRow
            key={o.id}
            to={`/optical/lens-orders/${o.id}`}
            leading={<IconBubble icon={PhoneCall} tone="success" />}
            title={o.customerName}
            meta={[o.frameName, o.customerPhone].filter(Boolean).join(' · ')}
            value={o.remainingAmount && o.remainingAmount > 0 ? <span className="text-rose-700">{cost(o.remainingAmount)}</span> : <Badge variant="success" size="xs">Paid</Badge>}
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
    <WidgetCard title="Lab se late" icon={FlaskConical} description={`${pending.lensOrdersAtLab} lab me · ${pending.overdueLensOrders} late`} to="/optical/lens-orders" flush>
      <RowList empty="Lab ke saare order waqt par hain" emptyIcon={CheckCircle2}>
        {overdue.map((o) => (
          <ListRow
            key={o.id}
            to={`/optical/lens-orders/${o.id}`}
            leading={<IconBubble icon={Clock} tone="danger" />}
            title={o.customerName}
            meta={<span><span className="font-mono">{o.orderNumber}</span> · {o.labName || 'Lab nahi likhi'}</span>}
            value={<Badge variant="danger" size="xs">{o.daysLate} din late</Badge>}
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
    <WidgetCard title="Nuskha purana ho raha" icon={FileText} description={`${pending.expiringPrescriptions} nuskhe 60 din me`} to="/optical/prescriptions" flush>
      <RowList empty="Koi nuskha jald purana nahi ho raha" emptyIcon={FileText}>
        {expiring.map((rx) => (
          <ListRow
            key={rx.id}
            to={`/optical/prescriptions/${rx.id}`}
            leading={<IconBubble icon={FileText} tone={rx.daysLeft <= 7 ? 'danger' : 'warning'} />}
            title={rx.customerName}
            meta={<span><span className="font-mono">{rx.prescriptionNumber}</span>{rx.customerPhone ? ` · ${rx.customerPhone}` : ''}</span>}
            value={<Badge variant={rx.daysLeft <= 7 ? 'danger' : rx.daysLeft <= 30 ? 'warning' : 'default'} size="xs">{rx.daysLeft} din</Badge>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}
