/** Gaming-shop-only dashboard widgets. */

import { Clock, CreditCard, Gamepad2, Monitor, PackageOpen, Pause, Play, Timer, Trophy } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { TOPUP_LOW, useGamingOps } from './useGamingOps';
import { t as tr } from '@core/i18n';

const fmtMins = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

/** Gaming headline numbers, offered next to the common ones. */
export const gamingKpis: KpiDef[] = [
  {
    id: 'gaming-stations', label: tr('Station chal rahe'), icon: Monitor, tone: 'brand',
    useValue: () => {
      const { stations, streams, loading } = useGamingOps();
      return {
        loading, to: '/gaming/cafe',
        value: stations.total ? `${stations.inUse}/${stations.total}` : stations.inUse,
        hint: tr('{{sessionsToday}} session aaj', { sessionsToday: streams.sessionsToday }),
      };
    },
  },
  {
    id: 'gaming-cafe', label: tr('Aaj cafe ki kamai'), icon: Timer, tone: 'success',
    useValue: () => {
      const { streams, stations, loading } = useGamingOps();
      const { sales } = useMasked();
      return {
        loading, to: '/gaming/cafe', value: sales(streams.list[0].today),
        hint: stations.inUse ? tr('{{runningBill}} abhi chal raha', { runningBill: sales(stations.runningBill) }) : tr('koi session nahi'),
      };
    },
  },
  {
    id: 'gaming-rentals', label: tr('Rental bahar'), icon: PackageOpen, tone: 'warning',
    useValue: () => {
      const { rentals, loading } = useGamingOps();
      return {
        loading, to: '/gaming/rentals', value: rentals.active, alert: rentals.overdue > 0,
        hint: rentals.overdue ? tr('{{overdue}} late!', { overdue: rentals.overdue }) : tr('sab waqt par'),
      };
    },
  },
  {
    id: 'gaming-topups', label: tr('Top-up card'), icon: CreditCard, tone: 'neutral',
    useValue: () => {
      const { topups, ready, loading } = useGamingOps();
      return { loading, to: '/gaming/topups', value: topups, alert: ready && topups < TOPUP_LOW, hint: ready && topups < TOPUP_LOW ? tr('mangwane ka waqt') : tr('stock me') };
    },
  },
];

export function useGamingAttention(): AttentionItem[] {
  const { rentals, topups, ready, tournaments, live } = useGamingOps();
  const items: AttentionItem[] = [];

  if (rentals.overdue) items.push({ icon: Clock, level: 'danger', text: tr('{{overdue}} rental late hain — return mangwayein aur late fee lagayein', { overdue: rentals.overdue }), to: '/gaming/rentals?status=OVERDUE', cta: tr('Rentals dekhein') });
  if (ready && topups < TOPUP_LOW) items.push({ icon: CreditCard, level: 'warning', text: topups ? tr('Sirf {{topups}} top-up card baqi — PSN / UC / Robux codes mangwayein', { topups }) : tr('Top-up card khatam — PSN / UC / Robux codes mangwayein'), to: '/gaming/topups', cta: tr('Top-ups') });
  if (tournaments.today) items.push({ icon: Trophy, level: 'info', text: tr('{{today}} tournament aaj hai — stations tayyar rakhein', { today: tournaments.today }), to: '/gaming/tournaments', cta: tr('Tournament') });
  const paused = live.filter((s) => s.paused).length;
  if (paused) items.push({ icon: Pause, level: 'neutral', text: tr('{{paused}} session ruka hua hai — khatam karna ho to bill bana dein', { paused }), to: '/gaming/cafe', cta: tr('Cafe live') });
  return items;
}

export function GamingLive() {
  const { live, stations } = useGamingOps();
  const { sales } = useMasked();
  return (
    <WidgetCard
      title={tr('Live sessions')}
      icon={Timer}
      description={live.length ? tr('{{count}} chal rahe · {{runningBill}} ka bill', { count: live.length, runningBill: sales(stations.runningBill) }) : tr('Abhi koi session nahi')}
      to="/gaming/cafe"
      linkLabel={tr('Cafe live')}
      flush
    >
      <RowList empty={tr('Koi station nahi chal raha — Cafe live se session shuru karein')} emptyIcon={Monitor}>
        {live.map((s) => (
          <ListRow
            key={s.id}
            to="/gaming/cafe"
            leading={<IconBubble icon={s.paused ? Pause : Play} tone={s.paused ? 'warning' : 'success'} />}
            title={s.station?.name || s.station?.stationNumber || tr('Station')}
            meta={tr('{{value}} · {{value2}} player{{value3}}', { value: s.customerName || 'Walk-in', value2: s.playerCount || 1, value3: s.gameSelected ? ` · ${s.gameSelected}` : '' })}
            value={sales(s.bill)}
            valueHint={<span className={s.paused ? 'text-amber-700' : 'text-slate-500'}>{s.paused ? tr('Ruka hua') : fmtMins(s.mins)}</span>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

export function GamingStreams() {
  const { streams } = useGamingOps();
  const { sales, cost, costHidden } = useMasked();
  const best = Math.max(...streams.list.map((r) => r.month), 0);
  return (
    <WidgetCard
      title={tr('Kamai ke raste')}
      icon={Gamepad2}
      description={tr('Aaj {{todayTotal}} · mahina {{monthTotal}}', { todayTotal: sales(streams.todayTotal), monthTotal: sales(streams.monthTotal) })}
    >
      <ul className="space-y-3">
        {streams.list.map((r) => (
          <li key={r.label}>
            <div className="flex items-center justify-between gap-2 text-[0.8125rem]">
              <span className="truncate font-medium text-slate-800">{r.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-900">{sales(r.today)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${best > 0 ? (r.month / best) * 100 : 0}%` }} />
            </div>
            <p className="mt-1 text-[0.75rem] text-slate-500">{tr('{{hint}} · mahina {{month}}', { hint: r.hint, month: sales(r.month) })}</p>
          </li>
        ))}
      </ul>
      {!costHidden && streams.topupProfitMonth > 0 && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-600">
          {tr('Top-ups se is mahine {{topupProfitMonth}} profit', { topupProfitMonth: cost(streams.topupProfitMonth) })}
        </p>
      )}
    </WidgetCard>
  );
}

export function GamingTournaments() {
  const { tournaments } = useGamingOps();
  const { sales } = useMasked();
  return (
    <WidgetCard title={tr('Aane wale tournament')} icon={Trophy} description={tr('{{count}} schedule me', { count: tournaments.list.length })} to="/gaming/tournaments" flush>
      <RowList empty={tr('Koi tournament schedule nahi')} emptyIcon={Trophy}>
        {tournaments.list.map((t) => {
          const isToday = new Date(t.scheduledDate).toDateString() === new Date().toDateString();
          return (
            <ListRow
              key={t.id}
              to="/gaming/tournaments"
              icon={Trophy}
              title={t.name}
              meta={tr('{{gameName}} · {{value}} · {{currentParticipants}}/{{maxParticipants}} player', { gameName: t.gameName, value: t.platform?.replace(/_/g, ' '), currentParticipants: t.currentParticipants, maxParticipants: t.maxParticipants })}
              value={Number(t.prizePool) > 0 ? sales(t.prizePool) : undefined}
              valueHint={isToday
                ? <Badge variant="warning" size="xs">{tr('Aaj')}</Badge>
                : <span className="text-slate-500">{new Date(t.scheduledDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</span>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}
