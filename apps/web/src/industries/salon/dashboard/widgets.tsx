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


const TIER_LABEL: Record<string, string> = { BRONZE: 'Bronze', SILVER: 'Silver', GOLD: 'Gold', PLATINUM: 'Platinum', DIAMOND: 'Diamond', CUSTOM: 'Custom' };


const inLabel = (m: number) => (m <= 0 ? 'Abhi' : m < 60 ? `${Math.round(m)} min me` : `${Math.floor(m / 60)}h ${Math.round(m % 60)}m me`);

/** Salon headline numbers, offered next to the common ones. */
export const salonKpis: KpiDef[] = [
  {
    id: 'salon-appointments', label: 'Aaj ke appointments', icon: Calendar, tone: 'brand',
    useValue: () => {
      const { today, loading } = useSalonOps();
      return { loading, to: '/salon/appointments', value: today.total, hint: `${today.pending.length} baqi · ${today.completed} ho gaye` };
    },
  },
  {
    id: 'salon-chairs', label: 'Chair par abhi', icon: Armchair, tone: 'warning',
    useValue: () => {
      const { today, staff, loading } = useSalonOps();
      return {
        loading, to: '/salon/calendar', value: staff.length ? `${today.inChair.length}/${staff.length}` : today.inChair.length,
        hint: today.waiting.length ? `${today.waiting.length} intezar me` : 'Staff masroof', alert: today.waiting.length > 0,
      };
    },
  },
  {
    id: 'salon-next', label: 'Agla appointment', icon: AlarmClock, tone: 'info',
    useValue: () => {
      const { today, loading } = useSalonOps();
      const n = today.next;
      return {
        loading, to: n ? `/salon/appointments/${n.id}` : '/salon/appointments/new',
        value: n ? format(new Date(n.scheduledStart), 'h:mm a') : '—',
        hint: n ? `${n.customerName || 'Walk-in'} · ${inLabel(n.startsIn)}` : 'Aaj koi baqi nahi',
      };
    },
  },
  {
    id: 'salon-members', label: 'Members', icon: Crown, tone: 'neutral',
    useValue: () => {
      const { memberships, packages, loading } = useSalonOps();
      return {
        loading, to: '/salon/memberships', value: memberships.active,
        hint: memberships.expiring.length ? `${memberships.expiring.length} jald khatam` : `${packages.active} packages`,
      };
    },
  },
  {
    id: 'salon-week', label: 'Agle 7 din', icon: CalendarClock, tone: 'neutral',
    useValue: () => {
      const { week, loading } = useSalonOps();
      return { loading, to: '/salon/calendar', value: week.count, hint: week.unconfirmed ? `${week.unconfirmed} confirm nahi` : 'Bookings' };
    },
  },
];

export function useSalonAttention(): AttentionItem[] {
  const { today, week, memberships } = useSalonOps();
  const items: AttentionItem[] = [];

  if (today.waiting.length) items.push({ icon: Hourglass, level: 'danger', text: `${today.waiting.length} customer aa kar intezar kar rahe hain — chair par bithayein`, to: '/salon/appointments', cta: 'Appointments' });
  if (today.missed.length) items.push({ icon: UserX, level: 'warning', text: `${today.missed.length} appointment ka waqt guzar gaya, customer nahi aaye — call karein ya no-show`, to: '/salon/appointments', cta: 'Dekhein' });
  if (today.soon.length) items.push({ icon: AlarmClock, level: 'info', text: `${today.soon.length} appointment agle 30 min me — staff tayyar rakhein`, to: '/salon/calendar', cta: 'Calendar' });
  if (week.unconfirmed) items.push({ icon: CalendarClock, level: 'info', text: `${week.unconfirmed} booking abhi confirm nahi — customer ko message karein`, to: '/salon/appointments', cta: 'Confirm karein' });
  if (memberships.expiring.length) items.push({ icon: Crown, level: 'neutral', text: `${memberships.expiring.length} membership 15 din me khatam — renew ki yaad dilayein`, to: '/salon/memberships', cta: 'Memberships' });
  return items;
}

export function SalonAppointments() {
  const { today } = useSalonOps();
  const { sales } = useMasked();
  return (
    <WidgetCard
      title="Aaj ke appointments"
      icon={Calendar}
      description={today.total ? `${today.pending.length} baqi · ${today.completed} ho gaye` : 'Aaj koi appointment nahi'}
      to="/salon/appointments"
      flush
    >
      <RowList empty="Aaj koi baqi appointment nahi" emptyIcon={Calendar}>
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
              title={a.customerName || 'Walk-in'}
              meta={`${serviceLine(a.services)}${staff ? ` · ${staff}` : ''}`}
              value={sales(a.total)}
              valueHint={late ? <Badge variant="danger" size="xs">Late</Badge> : soon ? <Badge variant="warning" size="xs">{inLabel(a.startsIn)}</Badge> : <Badge variant={st.variant} size="xs">{st.label}</Badge>}
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
    <WidgetCard title="Staff ka aaj" icon={Scissors} description={staff.length ? `${busy} masroof · ${staff.length - busy} farigh` : 'Bookable staff nahi'} to="/salon/staff" flush>
      <RowList empty="Staff profile bana lein — kaun farigh hai yahan dikhega" emptyIcon={Scissors}>
        {staff.slice(0, 8).map((s) => (
          <ListRow
            key={s.profile.id}
            leading={<Avatar name={s.name} url={s.profile.photoUrl} size={36} />}
            title={s.name}
            meta={s.busy
              ? `Abhi: ${s.busy.customerName || 'Walk-in'} · ${serviceLine(s.busy.services)}`
              : s.next ? `Agla ${format(new Date(s.next.scheduledStart), 'h:mm a')} · ${s.next.customerName || 'Walk-in'}` : 'Aaj aur koi booking nahi'}
            value={<span className="text-[0.8125rem]">{s.done}/{s.today}</span>}
            valueHint={s.busy ? <Badge variant="warning" size="xs" dot pulse>Masroof</Badge> : <Badge variant="success" size="xs">Farigh</Badge>}
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
    <WidgetCard title="Aaj ka haal" icon={CheckCircle2} description={today.completed ? `${today.completed} mukammal · ${sales(today.done)}` : 'Abhi koi mukammal nahi'}>
      {today.all.length === 0 ? (
        <EmptyHint icon={Calendar} text="Aaj ke appointments yahan status ke hisaab se nazar aayenge" />
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
      title="Memberships"
      icon={Crown}
      description={`${memberships.active} active · ${packages.active} packages (${packages.sessionsLeft} session baqi)`}
      to="/salon/memberships"
      flush
    >
      {memberships.tiers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2 sm:px-5">
          {memberships.tiers.map((t) => <Badge key={t.tier} variant="outline" size="xs">{TIER_LABEL[t.tier] ?? t.tier} · {t.count}</Badge>)}
        </div>
      )}
      <RowList empty="15 din me koi membership khatam nahi" emptyIcon={BookmarkPlus}>
        {memberships.expiring.slice(0, 6).map((m) => {
          const days = Math.ceil(m.left);
          return (
            <ListRow
              key={m.id}
              to="/salon/memberships"
              leading={<IconBubble icon={Crown} tone={days <= 3 ? 'warning' : 'neutral'} />}
              title={(m as { customer?: { name?: string } }).customer?.name || m.membershipNumber}
              meta={`${m.plan?.name ?? 'Plan'} · ${format(new Date(m.expiryDate), 'd MMM')} ko khatam`}
              value={<Badge variant={days <= 3 ? 'warning' : 'default'} size="xs">{days} din</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}
