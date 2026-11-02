/** Gym-only dashboard widgets. */

import { format } from 'date-fns';
import { Activity, AlertTriangle, Award, Calendar, Flame, LogIn, RefreshCw, Users, Wallet, Wrench } from 'lucide-react';
import { Avatar, Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { useGymOps } from './useGymOps';
import { t } from '@core/i18n';

type NamedMember = { customer?: { name?: string } } | undefined;
const memberName = (m: unknown, fallback = t('Member')) => (m as NamedMember)?.customer?.name || fallback;

const sinceLabel = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return m < 60 ? t('{{m}} min se', { m }) : t('{{value}}h {{value2}}m se', { value: Math.floor(m / 60), value2: m % 60 });
};

/** Gym headline numbers, offered next to the common ones. */
export const gymKpis: KpiDef[] = [
  {
    id: 'gym-inside', label: t('Abhi andar'), icon: Activity, tone: 'success',
    useValue: () => {
      const { inside, checkInsToday, loading } = useGymOps();
      return { loading, to: '/gym/attendance', value: inside.count, hint: t('Aaj {{checkInsToday}} check-in', { checkInsToday }) };
    },
  },
  {
    id: 'gym-members', label: t('Active members'), icon: Users, tone: 'brand',
    useValue: () => {
      const { activeMembers, totalMembers, loading } = useGymOps();
      return { loading, to: '/gym/members', value: activeMembers, hint: totalMembers ? t('{{totalMembers}} kul', { totalMembers }) : t('Members') };
    },
  },
  {
    id: 'gym-expiring', label: t('Renewal baqi'), icon: RefreshCw, tone: 'warning',
    useValue: () => {
      const { memberships: m, loading } = useGymOps();
      return { loading, to: '/gym/members', value: m.expiring, alert: m.expiring > 0, hint: m.expired ? t('{{expired}} khatam ho chuki', { expired: m.expired }) : t('7 din me khatam') };
    },
  },
  {
    id: 'gym-classes', label: t('Aaj ki classes'), icon: Calendar, tone: 'info',
    useValue: () => {
      const { classes, loading } = useGymOps();
      return { loading, to: '/gym/classes', value: classes.list.length, hint: classes.live ? t('{{live}} chal rahi', { live: classes.live }) : t('{{booked}}/{{seats}} booked', { booked: classes.booked, seats: classes.seats }) };
    },
  },
  {
    id: 'gym-dues', label: t('Fees baqi'), icon: Wallet, tone: 'danger', sensitive: true,
    useValue: () => {
      const { memberships: m, loading } = useGymOps();
      const { cost } = useMasked();
      return { loading, to: '/gym/memberships', value: cost(m.dueTotal), hint: t('{{duesCount}} memberships', { duesCount: m.duesCount }) };
    },
  },
];

export function useGymAttention(): AttentionItem[] {
  const { memberships: m, classes, equipment } = useGymOps();
  const items: AttentionItem[] = [];

  if (m.expiring) items.push({ icon: RefreshCw, level: 'warning', text: t('{{expiring}} members ki membership agle 7 din me khatam — WhatsApp se yaad dilayein', { expiring: m.expiring }), to: '/gym/members', cta: t('Renew karwayein') });
  if (m.expired) items.push({ icon: AlertTriangle, level: 'info', text: t('{{expired}} members ki membership khatam ho chuki — wapas bulayein', { expired: m.expired }), to: '/gym/members', cta: t('Members') });
  if (m.duesCount) items.push({ icon: Wallet, level: 'warning', text: t('{{duesCount}} memberships ki fee baqi hai', { duesCount: m.duesCount }), to: '/gym/memberships', cta: t('Fee lein') });
  if (equipment.broken) items.push({ icon: Wrench, level: 'warning', text: t('{{broken}} machine kharab ya marammat me — members ko pareshani hogi', { broken: equipment.broken }), to: '/gym/equipment', cta: t('Equipment') });
  if (equipment.service) items.push({ icon: Wrench, level: 'info', text: t('{{service}} machine ki servicing ka waqt aa gaya', { service: equipment.service }), to: '/gym/equipment', cta: t('Service karein') });
  if (classes.upcoming) items.push({ icon: Calendar, level: 'info', text: t('{{upcoming}} class aaj abhi honi hai', { upcoming: classes.upcoming }), to: '/gym/classes', cta: t('Classes') });
  return items;
}

export function GymInside() {
  const { inside, checkInsToday } = useGymOps();
  return (
    <WidgetCard title={t('Abhi gym me')} icon={Activity} description={t('{{count}} log andar · aaj {{checkInsToday}} check-in', { count: inside.count, checkInsToday })} to="/gym/attendance" linkLabel={t('Check-in')} flush>
      <RowList empty={t('Abhi koi andar nahi')} emptyIcon={LogIn}>
        {inside.list.map((a) => {
          const name = a.isGuest ? (a.guestName || t('Guest')) : memberName(a.member);
          return (
            <ListRow
              key={a.id}
              to={a.isGuest ? undefined : `/gym/members/${a.memberId}`} // i18n-ignore
              leading={<Avatar name={name} url={(a.member as { photoUrl?: string } | undefined)?.photoUrl ?? a.photoUrl} size={36} />}
              title={name}
              meta={t('{{value}} par aaye', { value: format(new Date(a.checkInAt), 'h:mm a') })}
              value={a.isGuest ? <Badge variant="info" size="xs">{t('Guest')}</Badge> : undefined}
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
    <WidgetCard title={t('Aaj ki classes')} icon={Calendar} description={classes.list.length ? t('{{booked}}/{{seats}} seats booked', { booked: classes.booked, seats: classes.seats }) : t('Aaj koi class nahi')} to="/gym/classes" flush>
      <RowList empty={t('Aaj koi class nahi')} emptyIcon={Calendar}>
        {classes.list.slice(0, 8).map((c) => {
          const full = c.maxParticipants > 0 && c.currentEnrolled >= c.maxParticipants;
          const trainer = (c.trainer as { name?: string; staff?: { fullName?: string; firstName?: string } } | undefined);
          const trainerName = trainer?.name || (trainer?.staff?.fullName || trainer?.staff?.firstName);
          return (
            <ListRow
              key={c.id}
              leading={<span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[0.8125rem] font-bold tabular-nums text-slate-800">{format(new Date(c.scheduledStart), 'HH:mm')}</span>}
              title={c.name}
              meta={t('{{durationMinutes}} min{{value}}{{value2}}', { durationMinutes: c.durationMinutes, value: trainerName ? ` · ${trainerName}` : '', value2: c.roomName ? ` · ${c.roomName}` : '' })}
              value={<span className="text-[0.8125rem]">{c.currentEnrolled}/{c.maxParticipants}</span>}
              valueHint={c.status === 'IN_PROGRESS'
                ? <Badge variant="warning" size="xs" dot pulse>{t('Chal rahi')}</Badge>
                : c.status === 'COMPLETED' ? <Badge size="xs">{t('Ho gayi')}</Badge>
                : full ? <Badge variant="danger" size="xs">{t('Full')}</Badge> : undefined}
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
      title={t('Renewal aur fees')}
      icon={RefreshCw}
      description={m.dueTotal > 0 && !costHidden ? t('{{dueTotal}} fee baqi · {{expiring}} renewal', { dueTotal: cost(m.dueTotal), expiring: m.expiring }) : t('{{expiring}} renewal baqi', { expiring: m.expiring })}
      to="/gym/members"
      flush
    >
      <RowList empty={t('Agle 7 din me koi membership khatam nahi')} emptyIcon={Award}>
        {m.renewals.map((r) => {
          const days = Math.ceil(r.left);
          return (
            <ListRow
              key={r.id}
              to={`/gym/members/${r.id}`}
              leading={<IconBubble icon={RefreshCw} tone="warning" />}
              title={r.name}
              meta={`${r.plan}${r.due > 0 ? ` · baqi ${cost(r.due)}` : ''}`}
              value={<Badge variant={days <= 2 ? 'warning' : 'default'} size="xs">{days <= 0 ? t('Aaj') : t('{{days}} din', { days })}</Badge>}
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
    <WidgetCard title={t('Sab se regular')} icon={Flame} description={t('Lagataar aane wale members — inhein shabaash dein')} to="/gym/members" flush>
      <RowList empty={t('Abhi kisi ki streak nahi bani')} emptyIcon={Flame}>
        {streaks.map((mb) => (
          <ListRow
            key={mb.id}
            to={`/gym/members/${mb.id}`}
            leading={<Avatar name={memberName(mb)} url={mb.photoUrl} size={36} />}
            title={memberName(mb)}
            meta={<span className="font-mono">{mb.memberNumber}</span>}
            value={<span className="inline-flex items-center gap-1 text-amber-700"><Flame className="h-3.5 w-3.5" />{t('{{currentStreak}} din', { currentStreak: mb.currentStreak })}</span>}
            valueHint={<span className="text-slate-500">{t('Best {{longestStreak}}', { longestStreak: mb.longestStreak })}</span>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}
