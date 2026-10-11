/** Gaming-shop-only dashboard widgets. */

import { Clock, CreditCard, Gamepad2, Monitor, PackageOpen, Pause, Play, Timer, Trophy } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { TOPUP_LOW, useGamingOps } from './useGamingOps';

const fmtMins = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

/** Gaming headline numbers, offered next to the common ones. */
export const gamingKpis: KpiDef[] = [
  {
    id: 'gaming-stations', label: 'Station chal rahe', icon: Monitor, tone: 'brand',
    useValue: () => {
      const { stations, streams, loading } = useGamingOps();
      return {
        loading, to: '/gaming/cafe',
        value: stations.total ? `${stations.inUse}/${stations.total}` : stations.inUse,
        hint: `${streams.sessionsToday} session aaj`,
      };
    },
  },
  {
    id: 'gaming-cafe', label: 'Aaj cafe ki kamai', icon: Timer, tone: 'success',
    useValue: () => {
      const { streams, stations, loading } = useGamingOps();
      const { sales } = useMasked();
      return {
        loading, to: '/gaming/cafe', value: sales(streams.list[0].today),
        hint: stations.inUse ? `${sales(stations.runningBill)} abhi chal raha` : 'koi session nahi',
      };
    },
  },
  {
    id: 'gaming-rentals', label: 'Rental bahar', icon: PackageOpen, tone: 'warning',
    useValue: () => {
      const { rentals, loading } = useGamingOps();
      return {
        loading, to: '/gaming/rentals', value: rentals.active, alert: rentals.overdue > 0,
        hint: rentals.overdue ? `${rentals.overdue} late!` : 'sab waqt par',
      };
    },
  },
  {
    id: 'gaming-topups', label: 'Top-up card', icon: CreditCard, tone: 'neutral',
    useValue: () => {
      const { topups, ready, loading } = useGamingOps();
      return { loading, to: '/gaming/topups', value: topups, alert: ready && topups < TOPUP_LOW, hint: ready && topups < TOPUP_LOW ? 'mangwane ka waqt' : 'stock me' };
    },
  },
];

export function useGamingAttention(): AttentionItem[] {
  const { rentals, topups, ready, tournaments, live } = useGamingOps();
  const items: AttentionItem[] = [];

  if (rentals.overdue) items.push({ icon: Clock, level: 'danger', text: `${rentals.overdue} rental late hain — wapsi mangwayein aur late fee lagayein`, to: '/gaming/rentals?status=OVERDUE', cta: 'Rentals dekhein' });
  if (ready && topups < TOPUP_LOW) items.push({ icon: CreditCard, level: 'warning', text: topups ? `Sirf ${topups} top-up card baqi — PSN / UC / Robux codes mangwayein` : 'Top-up card khatam — PSN / UC / Robux codes mangwayein', to: '/gaming/topups', cta: 'Top-ups' });
  if (tournaments.today) items.push({ icon: Trophy, level: 'info', text: `${tournaments.today} tournament aaj hai — stations tayyar rakhein`, to: '/gaming/tournaments', cta: 'Tournament' });
  const paused = live.filter((s) => s.paused).length;
  if (paused) items.push({ icon: Pause, level: 'neutral', text: `${paused} session ruka hua hai — khatam karna ho to bill bana dein`, to: '/gaming/cafe', cta: 'Cafe live' });
  return items;
}

export function GamingLive() {
  const { live, stations } = useGamingOps();
  const { sales } = useMasked();
  return (
    <WidgetCard
      title="Live sessions"
      icon={Timer}
      description={live.length ? `${live.length} chal rahe · ${sales(stations.runningBill)} ka bill` : 'Abhi koi session nahi'}
      to="/gaming/cafe"
      linkLabel="Cafe live"
      flush
    >
      <RowList empty="Koi station nahi chal raha — Cafe live se session shuru karein" emptyIcon={Monitor}>
        {live.map((s) => (
          <ListRow
            key={s.id}
            to="/gaming/cafe"
            leading={<IconBubble icon={s.paused ? Pause : Play} tone={s.paused ? 'warning' : 'success'} />}
            title={s.station?.name || s.station?.stationNumber || 'Station'}
            meta={`${s.customerName || 'Walk-in'} · ${s.playerCount || 1} player${s.gameSelected ? ` · ${s.gameSelected}` : ''}`}
            value={sales(s.bill)}
            valueHint={<span className={s.paused ? 'text-amber-700' : 'text-slate-500'}>{s.paused ? 'Ruka hua' : fmtMins(s.mins)}</span>}
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
      title="Kamai ke raste"
      icon={Gamepad2}
      description={`Aaj ${sales(streams.todayTotal)} · mahina ${sales(streams.monthTotal)}`}
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
            <p className="mt-1 text-[0.75rem] text-slate-500">{r.hint} · mahina {sales(r.month)}</p>
          </li>
        ))}
      </ul>
      {!costHidden && streams.topupProfitMonth > 0 && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-600">
          Top-ups se is mahine {cost(streams.topupProfitMonth)} munafa
        </p>
      )}
    </WidgetCard>
  );
}

export function GamingTournaments() {
  const { tournaments } = useGamingOps();
  const { sales } = useMasked();
  return (
    <WidgetCard title="Aane wale tournament" icon={Trophy} description={`${tournaments.list.length} schedule me`} to="/gaming/tournaments" flush>
      <RowList empty="Koi tournament schedule nahi" emptyIcon={Trophy}>
        {tournaments.list.map((t) => {
          const isToday = new Date(t.scheduledDate).toDateString() === new Date().toDateString();
          return (
            <ListRow
              key={t.id}
              to="/gaming/tournaments"
              icon={Trophy}
              title={t.name}
              meta={`${t.gameName} · ${t.platform?.replace(/_/g, ' ')} · ${t.currentParticipants}/${t.maxParticipants} player`}
              value={Number(t.prizePool) > 0 ? sales(t.prizePool) : undefined}
              valueHint={isToday
                ? <Badge variant="warning" size="xs">Aaj</Badge>
                : <span className="text-slate-500">{new Date(t.scheduledDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</span>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}
