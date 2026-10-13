/** Gym-only dashboard widgets. */

import { format } from 'date-fns';
import { Activity, AlertTriangle, Award, Calendar, Flame, LogIn, RefreshCw, Users, Wallet, Wrench } from 'lucide-react';
import { Avatar, Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { useGymOps } from './useGymOps';

type NamedMember = { customer?: { name?: string } } | undefined;
const memberName = (m: unknown, fallback = 'Member') => (m as NamedMember)?.customer?.name || fallback;

const sinceLabel = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return m < 60 ? `${m} min se` : `${Math.floor(m / 60)}h ${m % 60}m se`;
};

/** Gym headline numbers, offered next to the common ones. */
export const gymKpis: KpiDef[] = [
  {
    id: 'gym-inside', label: 'Abhi andar', icon: Activity, tone: 'success',
    useValue: () => {
      const { inside, checkInsToday, loading } = useGymOps();
      return { loading, to: '/gym/attendance', value: inside.count, hint: `Aaj ${checkInsToday} check-in` };
    },
  },
  {
    id: 'gym-members', label: 'Active members', icon: Users, tone: 'brand',
    useValue: () => {
      const { activeMembers, totalMembers, loading } = useGymOps();
      return { loading, to: '/gym/members', value: activeMembers, hint: totalMembers ? `${totalMembers} kul` : 'Members' };
    },
  },
  {
    id: 'gym-expiring', label: 'Renewal baqi', icon: RefreshCw, tone: 'warning',
    useValue: () => {
      const { memberships: m, loading } = useGymOps();
      return {
        loading, to: '/gym/memberships', value: m.expiring.length + m.lapsed.length, alert: m.lapsed.length > 0,
        hint: m.lapsed.length ? `${m.lapsed.length} khatam ho chuki` : '7 din me khatam',
      };
    },
  },
  {
    id: 'gym-classes', label: 'Aaj ki classes', icon: Calendar, tone: 'info',
    useValue: () => {
      const { classes, loading } = useGymOps();
      return { loading, to: '/gym/classes', value: classes.list.length, hint: classes.live ? `${classes.live} chal rahi` : `${classes.booked}/${classes.seats} booked` };
    },
  },
  {
    id: 'gym-dues', label: 'Fees baqi', icon: Wallet, tone: 'danger', sensitive: true,
    useValue: () => {
      const { memberships: m, loading } = useGymOps();
      const { cost } = useMasked();
      return { loading, to: '/gym/memberships', value: cost(m.dueTotal), hint: `${m.dues.length} members` };
    },
  },
];

export function useGymAttention(): AttentionItem[] {
  const { memberships: m, classes, equipment } = useGymOps();
  const items: AttentionItem[] = [];

  if (m.lapsed.length) items.push({ icon: AlertTriangle, level: 'danger', text: `${m.lapsed.length} membership ki period guzar gayi magar abhi active hai — renew karein ya band`, to: '/gym/memberships', cta: 'Memberships' });
  if (m.expiring.length) items.push({ icon: RefreshCw, level: 'warning', text: `${m.expiring.length} membership agle 7 din me khatam — abhi call karein, renewal asaan hai`, to: '/gym/memberships', cta: 'Renew karwayein' });
  if (m.dues.length) items.push({ icon: Wallet, level: 'warning', text: `${m.dues.length} members ki fees baqi hai`, to: '/gym/memberships', cta: 'Fees lein' });
  if (equipment.broken) items.push({ icon: Wrench, level: 'warning', text: `${equipment.broken} machine kharab ya marammat me — members ko pareshani hogi`, to: '/gym/equipment', cta: 'Equipment' });
  if (equipment.service) items.push({ icon: Wrench, level: 'info', text: `${equipment.service} machine ki servicing ka waqt aa gaya`, to: '/gym/equipment', cta: 'Service karein' });
  if (classes.upcoming) items.push({ icon: Calendar, level: 'info', text: `${classes.upcoming} class aaj abhi honi hai`, to: '/gym/classes', cta: 'Classes' });
  return items;
}

export function GymInside() {
  const { inside, checkInsToday } = useGymOps();
  return (
    <WidgetCard title="Abhi gym me" icon={Activity} description={`${inside.count} log andar · aaj ${checkInsToday} check-in`} to="/gym/attendance" linkLabel="Check-in" flush>
      <RowList empty="Abhi koi andar nahi" emptyIcon={LogIn}>
        {inside.list.map((a) => {
          const name = a.isGuest ? (a.guestName || 'Guest') : memberName(a.member);
          return (
            <ListRow
              key={a.id}
              to={a.isGuest ? undefined : `/gym-members/${a.memberId}`}
              leading={<Avatar name={name} url={(a.member as { photoUrl?: string } | undefined)?.photoUrl ?? a.photoUrl} size={36} />}
              title={name}
              meta={`${format(new Date(a.checkInAt), 'h:mm a')} par aaye`}
              value={a.isGuest ? <Badge variant="info" size="xs">Guest</Badge> : undefined}
              valueHint={<span className="text-slate-500">{sinceLabel(a.checkInAt)}</span>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function GymClasses() {
  const { classes } = useGymOps();
  return (
    <WidgetCard title="Aaj ki classes" icon={Calendar} description={classes.list.length ? `${classes.booked}/${classes.seats} seats booked` : 'Aaj koi class nahi'} to="/gym/classes" flush>
      <RowList empty="Aaj koi class nahi" emptyIcon={Calendar}>
        {classes.list.slice(0, 8).map((c) => {
          const full = c.maxParticipants > 0 && c.currentEnrolled >= c.maxParticipants;
          const trainer = (c.trainer as { name?: string; staff?: { fullName?: string; firstName?: string } } | undefined);
          const trainerName = trainer?.name || (trainer?.staff?.fullName || trainer?.staff?.firstName);
          return (
            <ListRow
              key={c.id}
              leading={<span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[0.8125rem] font-bold tabular-nums text-slate-800">{format(new Date(c.scheduledStart), 'HH:mm')}</span>}
              title={c.name}
              meta={`${c.durationMinutes} min${trainerName ? ` · ${trainerName}` : ''}${c.roomName ? ` · ${c.roomName}` : ''}`}
              value={<span className="text-[0.8125rem]">{c.currentEnrolled}/{c.maxParticipants}</span>}
              valueHint={c.status === 'IN_PROGRESS'
                ? <Badge variant="warning" size="xs" dot pulse>Chal rahi</Badge>
                : c.status === 'COMPLETED' ? <Badge size="xs">Ho gayi</Badge>
                : full ? <Badge variant="danger" size="xs">Full</Badge> : undefined}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function GymRenewals() {
  const { memberships: m } = useGymOps();
  const { cost, costHidden } = useMasked();
  return (
    <WidgetCard
      title="Renewal aur fees"
      icon={RefreshCw}
      description={m.dueTotal > 0 && !costHidden ? `${cost(m.dueTotal)} fees baqi · ${m.expiring.length} renewal` : `${m.expiring.length + m.lapsed.length} renewal baqi`}
      to="/gym/memberships"
      flush
    >
      <RowList empty="Agle 7 din me koi membership khatam nahi" emptyIcon={Award}>
        {m.renewals.map((r) => {
          const gone = r.left < 0;
          const days = Math.ceil(r.left);
          return (
            <ListRow
              key={r.id}
              to={`/gym-members/${r.memberId}`}
              leading={<IconBubble icon={gone ? AlertTriangle : RefreshCw} tone={gone ? 'danger' : 'warning'} />}
              title={memberName(r.member)}
              meta={`${(r.plan as { name?: string } | undefined)?.name ?? 'Plan'}${Number(r.balanceDue) > 0 ? ` · baqi ${cost(r.balanceDue)}` : ''}`}
              value={<Badge variant={gone ? 'danger' : days <= 2 ? 'warning' : 'default'} size="xs">{gone ? 'Khatam' : days <= 0 ? 'Aaj' : `${days} din`}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function GymStreaks() {
  const { streaks } = useGymOps();
  return (
    <WidgetCard title="Sab se regular" icon={Flame} description="Lagataar aane wale members — inhein shabaash dein" to="/gym/members" flush>
      <RowList empty="Abhi kisi ki streak nahi bani" emptyIcon={Flame}>
        {streaks.map((mb) => (
          <ListRow
            key={mb.id}
            to={`/gym-members/${mb.id}`}
            leading={<Avatar name={memberName(mb)} url={mb.photoUrl} size={36} />}
            title={memberName(mb)}
            meta={<span className="font-mono">{mb.memberNumber}</span>}
            value={<span className="inline-flex items-center gap-1 text-amber-700"><Flame className="h-3.5 w-3.5" />{mb.currentStreak} din</span>}
            valueHint={<span className="text-slate-500">Best {mb.longestStreak}</span>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}
