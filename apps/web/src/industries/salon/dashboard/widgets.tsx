/** Salon-only dashboard widgets. */

import { format } from 'date-fns';
import { AlarmClock, Armchair, BookmarkPlus, Calendar, CalendarClock, CheckCircle2, Crown, Hourglass, Scissors, UserX } from 'lucide-react';
import { Avatar, Badge } from '@/design-system/components';
import { EmptyHint, IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { cn } from '@core/lib/cn';
import type { AppointmentStatus } from '../api/appointments.api';
import { STATUS, serviceLine } from '../lib/meta';
import { useSalonOps } from './useSalonOps';
import { t as tr } from '@core/i18n';


const TIER_LABEL: Record<string, string> = { BRONZE: tr('Bronze'), SILVER: tr('Silver'), GOLD: tr('Gold'), PLATINUM: tr('Platinum'), DIAMOND: tr('Diamond'), CUSTOM: tr('Custom') };


const inLabel = (m: number) => (m <= 0 ? tr('Abhi') : m < 60 ? tr('{{m}} min me', { m: Math.round(m) }) : tr('{{value}}h {{value2}}m me', { value: Math.floor(m / 60), value2: Math.round(m % 60) }));

/** Salon headline numbers, offered next to the common ones. */
export const salonKpis: KpiDef[] = [
  {
    id: 'salon-appointments', label: tr('Aaj ke appointments'), icon: Calendar, tone: 'brand',
    useValue: () => {
      const { today, loading } = useSalonOps();
      return { loading, to: '/salon/appointments', value: today.total, hint: tr('{{count}} baqi · {{completed}} ho gaye', { count: today.pending.length, completed: today.completed }) };
    },
  },
  {
    id: 'salon-chairs', label: tr('Chair par abhi'), icon: Armchair, tone: 'warning',
    useValue: () => {
      const { today, staff, loading } = useSalonOps();
      return {
        loading, to: '/salon/calendar', value: staff.length ? `${today.inChair.length}/${staff.length}` : today.inChair.length,
        hint: today.waiting.length ? tr('{{count}} intezar me', { count: today.waiting.length }) : tr('Staff masroof'), alert: today.waiting.length > 0,
      };
    },
  },
  {
    id: 'salon-next', label: tr('Agla appointment'), icon: AlarmClock, tone: 'info',
    useValue: () => {
      const { today, loading } = useSalonOps();
      const n = today.next;
      return {
        loading, to: n ? `/salon/appointments/${n.id}` : '/salon/appointments/new', // i18n-ignore
        value: n ? format(new Date(n.scheduledStart), 'h:mm a') : '—',
        hint: n ? `${n.customerName || 'Walk-in'} · ${inLabel(n.startsIn)}` : tr('Aaj koi baqi nahi'),
      };
    },
  },
  {
    id: 'salon-members', label: tr('Members'), icon: Crown, tone: 'neutral',
    useValue: () => {
      const { memberships, packages, loading } = useSalonOps();
      return {
        loading, to: '/salon/memberships', value: memberships.active,
        hint: memberships.expiring.length ? tr('{{count}} jald khatam', { count: memberships.expiring.length }) : tr('{{active}} packages', { active: packages.active }),
      };
    },
  },
  {
    id: 'salon-week', label: tr('Agle 7 din'), icon: CalendarClock, tone: 'neutral',
    useValue: () => {
      const { week, loading } = useSalonOps();
      return { loading, to: '/salon/calendar', value: week.count, hint: week.unconfirmed ? tr('{{unconfirmed}} confirm nahi', { unconfirmed: week.unconfirmed }) : tr('Bookings') };
    },
  },
];

export function useSalonAttention(): AttentionItem[] {
  const { today, week, memberships } = useSalonOps();
  const items: AttentionItem[] = [];

  if (today.waiting.length) items.push({ icon: Hourglass, level: 'danger', text: tr('{{count}} customer aa kar intezar kar rahe hain — chair par bithayein', { count: today.waiting.length }), to: '/salon/appointments', cta: tr('Appointments') });
  if (today.missed.length) items.push({ icon: UserX, level: 'warning', text: tr('{{count}} appointment ka waqt guzar gaya, customer nahi aaye — call karein ya no-show', { count: today.missed.length }), to: '/salon/appointments', cta: tr('Dekhein') });
  if (today.soon.length) items.push({ icon: AlarmClock, level: 'info', text: tr('{{count}} appointment agle 30 min me — staff tayyar rakhein', { count: today.soon.length }), to: '/salon/calendar', cta: tr('Calendar') });
  if (week.unconfirmed) items.push({ icon: CalendarClock, level: 'info', text: tr('{{unconfirmed}} booking abhi confirm nahi — customer ko message karein', { unconfirmed: week.unconfirmed }), to: '/salon/appointments', cta: tr('Confirm karein') });
  if (memberships.expiring.length) items.push({ icon: Crown, level: 'neutral', text: tr('{{count}} membership 15 din me khatam — renew ki yaad dilayein', { count: memberships.expiring.length }), to: '/salon/memberships', cta: tr('Memberships') });
  return items;
}

export function SalonAppointments() {
  const { today } = useSalonOps();
  const { sales } = useMasked();
  return (
    <WidgetCard
      title={tr('Aaj ke appointments')}
      icon={Calendar}
      description={today.total ? tr('{{count}} baqi · {{completed}} ho gaye', { count: today.pending.length, completed: today.completed }) : tr('Aaj koi appointment nahi')}
      to="/salon/appointments"
      flush
    >
      <RowList empty={tr('Aaj koi baqi appointment nahi')} emptyIcon={Calendar}>
        {today.list.map((a) => {
          const st = STATUS[a.status];
          const soon = a.status === 'CONFIRMED' && a.startsIn >= 0 && a.startsIn <= 30;
          const late = a.status === 'CONFIRMED' && a.startsIn < -15;
          const staff = a.services?.find((s) => s.staffName)?.staffName;
          return (
            <ListRow
              key={a.id}
              to={`/salon/appointments/${a.id}`}
              leading={(
                <span className={cn('flex h-9 w-12 shrink-0 items-center justify-center rounded-lg text-[0.8125rem] font-bold tabular-nums',
                  late ? 'bg-rose-50 text-rose-700' : soon ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-800')}
                >
                  {format(new Date(a.scheduledStart), 'HH:mm')}
                </span>
              )}
              title={a.customerName || tr('Walk-in')}
              meta={`${serviceLine(a.services)}${staff ? ` · ${staff}` : ''}`}
              value={sales(a.total)}
              valueHint={late ? <Badge variant="danger" size="xs">{tr('Late')}</Badge> : soon ? <Badge variant="warning" size="xs">{inLabel(a.startsIn)}</Badge> : <Badge variant={st.variant} size="xs">{st.label}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function SalonStaffBoard() {
  const { staff } = useSalonOps();
  const busy = staff.filter((s) => s.busy).length;
  return (
    <WidgetCard title={tr('Staff ka aaj')} icon={Scissors} description={staff.length ? tr('{{busy}} masroof · {{value}} farigh', { busy, value: staff.length - busy }) : tr('Bookable staff nahi')} to="/salon/staff" flush>
      <RowList empty={tr('Staff profile bana lein — kaun farigh hai yahan dikhega')} emptyIcon={Scissors}>
        {staff.slice(0, 8).map((s) => (
          <ListRow
            key={s.profile.id}
            leading={<Avatar name={s.name} url={s.profile.photoUrl} size={36} />}
            title={s.name}
            meta={s.busy
              ? tr('Abhi: {{value}} · {{services}}', { value: s.busy.customerName || 'Walk-in', services: serviceLine(s.busy.services) })
              : s.next ? tr('Agla {{value}} · {{value2}}', { value: format(new Date(s.next.scheduledStart), 'h:mm a'), value2: s.next.customerName || 'Walk-in' }) : tr('Aaj aur koi booking nahi')}
            value={<span className="text-[0.8125rem]">{s.done}/{s.today}</span>}
            valueHint={s.busy ? <Badge variant="warning" size="xs" dot pulse>{tr('Masroof')}</Badge> : <Badge variant="success" size="xs">{tr('Farigh')}</Badge>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

export function SalonDayStatus() {
  const { today } = useSalonOps();
  const { sales } = useMasked();
  const tiles: Array<[AppointmentStatus, string]> = [
    ['CONFIRMED', 'text-slate-900'], ['ARRIVED', 'text-brand-700'], ['IN_PROGRESS', 'text-amber-700'],
    ['COMPLETED', 'text-success-700'], ['NO_SHOW', 'text-rose-700'], ['CANCELLED', 'text-rose-700'],
  ];
  return (
    <WidgetCard title={tr('Aaj ka haal')} icon={CheckCircle2} description={today.completed ? tr('{{completed}} mukammal · {{done}}', { completed: today.completed, done: sales(today.done) }) : tr('Abhi koi mukammal nahi')}>
      {today.all.length === 0 ? (
        <EmptyHint icon={Calendar} text={tr('Aaj ke appointments yahan status ke hisaab se nazar aayenge')} />
      ) : (
        <dl className="grid grid-cols-3 gap-2 text-center">
          {tiles.map(([s, color]) => (
            <div key={s} className="rounded-lg bg-slate-50 py-2.5">
              <dd className={cn('text-xl font-bold tabular-nums', color)}>{today.counts[s] ?? 0}</dd>
              <dt className="text-[0.75rem] text-slate-500">{STATUS[s].label}</dt>
            </div>
          ))}
        </dl>
      )}
    </WidgetCard>
  );
}

export function SalonMemberships() {
  const { memberships, packages } = useSalonOps();
  return (
    <WidgetCard
      title={tr('Memberships')}
      icon={Crown}
      description={tr('{{active}} active · {{active2}} packages ({{sessionsLeft}} session baqi)', { active: memberships.active, active2: packages.active, sessionsLeft: packages.sessionsLeft })}
      to="/salon/memberships"
      flush
    >
      {memberships.tiers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2 sm:px-5">
          {memberships.tiers.map((t) => <Badge key={t.tier} variant="outline" size="xs">{TIER_LABEL[t.tier] ?? t.tier} · {t.count}</Badge>)}
        </div>
      )}
      <RowList empty={tr('15 din me koi membership khatam nahi')} emptyIcon={BookmarkPlus}>
        {memberships.expiring.slice(0, 6).map((m) => {
          const days = Math.ceil(m.left);
          return (
            <ListRow
              key={m.id}
              to="/salon/memberships"
              leading={<IconBubble icon={Crown} tone={days <= 3 ? 'warning' : 'neutral'} />}
              title={(m as { customer?: { name?: string } }).customer?.name || m.membershipNumber}
              meta={tr('{{value}} · {{value2}} ko khatam', { value: m.plan?.name ?? 'Plan', value2: format(new Date(m.expiryDate), 'd MMM') })}
              value={<Badge variant={days <= 3 ? 'warning' : 'default'} size="xs">{tr('{{days}} din', { days })}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}
