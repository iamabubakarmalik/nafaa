/** Appliance-shop-only dashboard widgets. */

import {
  AlertTriangle, Barcode, CalendarCheck, Clock, HardHat, Percent, ShieldCheck, Star, Truck, Users, Wallet, Wrench,
} from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, MetricTile, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem, MoneyTileProps } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { useAppliancesOps } from './useAppliancesOps';

/** Appliance headline numbers, offered next to the common ones. */
export const appliancesKpis: KpiDef[] = [
  {
    id: 'appliances-repairs', label: 'Repair khule', icon: Wrench, tone: 'warning',
    useValue: () => {
      const { work, loading } = useAppliancesOps();
      return {
        loading, to: '/appliances/service-requests', value: work.repairsOpen, alert: work.repairsLate > 0,
        hint: work.repairsLate ? `${work.repairsLate} late!` : `${work.repairsDoneToday} aaj mukammal`,
      };
    },
  },
  {
    id: 'appliances-installs', label: 'Installation baqi', icon: HardHat, tone: 'brand',
    useValue: () => {
      const { work, loading } = useAppliancesOps();
      return {
        loading, to: '/appliances/installations', value: work.installsOpen, alert: work.installsLate > 0,
        hint: work.installsLate ? `${work.installsLate} late!` : `${work.installsToday} aaj`,
      };
    },
  },
  {
    id: 'appliances-service-due', label: 'Service ka baqi', icon: Wallet, tone: 'danger', sensitive: true,
    useValue: () => {
      const { work, loading } = useAppliancesOps();
      const { cost } = useMasked();
      return { loading, to: '/appliances/service-requests', value: cost(work.outstanding), alert: work.outstanding > 0, hint: 'kaam ho gaya, paisa nahi aaya' };
    },
  },
  {
    id: 'appliances-services-share', label: 'Services ka hissa', icon: Percent, tone: 'success',
    useValue: () => {
      const { streams, loading } = useAppliancesOps();
      const { sales } = useMasked();
      return { loading: loading && !streams.total, to: '/appliances/profit-report', value: `${streams.servicesShare.toFixed(0)}%`, hint: `${sales(streams.services)} · 30 din` };
    },
  },
  {
    id: 'appliances-techs', label: 'Khali technician', icon: Users, tone: 'neutral',
    useValue: () => {
      const { tech, loading } = useAppliancesOps();
      return { loading, to: '/appliances/technicians', value: tech?.free ?? 0, hint: `${tech?.active ?? 0} active · ${tech?.openJobs ?? 0} kaam` };
    },
  },
];

export function useAppliancesAttention(): AttentionItem[] {
  const { work, serial, amc, delivery, tech, claims } = useAppliancesOps();
  const { cost } = useMasked();
  const items: AttentionItem[] = [];

  if (work.repairsLate) items.push({ icon: Clock, level: 'danger', text: `${work.repairsLate} repair late hain — customer intezar kar raha hai`, to: '/appliances/service-requests', cta: 'Repair dekhein' });
  if (work.installsLate) items.push({ icon: HardHat, level: 'danger', text: `${work.installsLate} installation late hain`, to: '/appliances/installations', cta: 'Installation dekhein' });
  if (claims?.missing?.count) items.push({ icon: ShieldCheck, level: 'danger', text: `${claims.missing.count} warranty repair ka brand se claim banaya hi nahi — ${cost(claims.missing.recoverable)} wapas mil sakta hai`, to: '/appliances/warranty-claims', cta: 'Claim banayein' });
  if (work.unassigned) items.push({ icon: Users, level: 'warning', text: `${work.unassigned} kaam par koi technician nahi laga — subah hi kisi ko dein`, to: '/appliances/service-requests', cta: 'Banda lagayein' });
  if (work.outstanding > 0) items.push({ icon: Wallet, level: 'warning', text: `Service ka ${cost(work.outstanding)} baqi hai — kaam ho chuka, wusooli nahi hui`, to: '/appliances/service-requests', cta: 'Wusool karein' });
  if (serial?.installation?.pending) items.push({ icon: HardHat, level: 'warning', text: `${serial.installation.pending} unit bik gaye lekin abhi lage nahi`, to: '/appliances/installations', cta: 'Book karein' });
  if (delivery?.noVehicle) items.push({ icon: Truck, level: 'warning', text: `${delivery.noVehicle} delivery par gaari nahi lagi`, to: '/appliances/deliveries', cta: 'Gaari lagayein' });
  if (tech?.overloaded) items.push({ icon: AlertTriangle, level: 'warning', text: `${tech.overloaded} technician par kaam zyada hai — kuch kaam doosron ko dein`, to: '/appliances/technicians', cta: 'Technicians' });
  if (claims?.money?.pending) items.push({ icon: Wallet, level: 'info', text: `Brand ke paas ${cost(claims.money.pending)} atka hai`, to: '/appliances/warranty-claims', cta: 'Follow up' });
  if (amc?.expiringSoon) items.push({ icon: ShieldCheck, level: 'info', text: `${amc.expiringSoon} AMC jald khatam ho rahe — renew karwayein`, to: '/appliances/amc-contracts', cta: 'AMC dekhein' });
  if (serial?.warrantyExpiringSoon) items.push({ icon: ShieldCheck, level: 'neutral', text: `${serial.warrantyExpiringSoon} unit ki warranty khatam ho rahi — AMC offer karein`, to: '/appliances/serials', cta: 'Serial dekhein' });
  return items;
}

export function AppliancesJobs() {
  const { jobs, work } = useAppliancesOps();
  return (
    <WidgetCard
      title="Aaj ka field kaam"
      icon={CalendarCheck}
      description={`${work.installsToday} installation aaj · ${work.repairsOpen} repair khule`}
      to="/appliances/service-requests"
      flush
    >
      <RowList empty="Koi kaam baqi nahi" emptyIcon={CalendarCheck}>
        {jobs.map((j) => (
          <ListRow
            key={`${j.kind}-${j.id}`}
            to={j.to}
            leading={<IconBubble icon={j.kind === 'install' ? HardHat : Wrench} tone={j.late ? 'danger' : j.kind === 'install' ? 'brand' : 'warning'} />}
            title={j.customer}
            meta={<span><span className="font-mono">{j.number}</span> · {j.detail}</span>}
            value={j.late
              ? <Badge variant="danger" size="xs">Late</Badge>
              : j.urgent ? <Badge variant="warning" size="xs">Foran</Badge>
              : <Badge variant="default" size="xs">{j.status.label}</Badge>}
            valueHint={j.technician
              ? <span className="text-slate-500">{j.technician}{j.slot ? ` · ${j.slot}` : ''}</span>
              : <span className="text-amber-700">banda nahi laga</span>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

export function AppliancesServices() {
  const { work, tech, amc, delivery, claims, serial } = useAppliancesOps();
  return (
    <WidgetCard title="Service ka haal" icon={Wrench} description="Repair, installation, delivery, AMC aur claims ek nazar me">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <MetricTile icon={Wrench} tone="warning" label="Repair khule" value={work.repairsOpen} hint={work.repairsLate ? `${work.repairsLate} late` : `${work.repairsDoneToday} aaj mukammal`} to="/appliances/service-requests" alert={work.repairsLate > 0} />
        <MetricTile icon={HardHat} tone="brand" label="Installation baqi" value={work.installsOpen} hint={`${work.installsToday} aaj`} to="/appliances/installations" alert={work.installsLate > 0} />
        <MetricTile icon={Truck} tone="info" label="Delivery baqi" value={delivery?.open ?? 0} hint={`${delivery?.todayScheduled ?? 0} aaj`} to="/appliances/deliveries" alert={(delivery?.overdue ?? 0) > 0} />
        <MetricTile icon={ShieldCheck} tone="success" label="AMC chal rahe" value={amc?.active ?? 0} hint={amc?.expiringSoon ? `${amc.expiringSoon} khatam ho rahe` : 'sab theek'} to="/appliances/amc-contracts" />
        <MetricTile icon={ShieldCheck} tone="danger" label="Claims khule" value={claims?.open ?? 0} hint={claims?.stale ? `${claims.stale} 30 din se purane` : `${claims?.month?.claims ?? 0} is mahine`} to="/appliances/warranty-claims" />
        <MetricTile icon={Barcode} tone="neutral" label="Serial stock me" value={serial?.inStock?.units ?? 0} hint={`${tech?.free ?? 0} technician khali`} to="/appliances/serials" />
      </div>
    </WidgetCard>
  );
}

const STREAM_BAR: Record<string, string> = {
  GOODS: 'bg-brand-600', INSTALLATION: 'bg-sky-500', SERVICE: 'bg-amber-500',
  AMC: 'bg-violet-500', DELIVERY: 'bg-success-600', POS_SERVICES: 'bg-slate-400',
};

export function AppliancesStreams() {
  const { streams } = useAppliancesOps();
  const { sales } = useMasked();
  return (
    <WidgetCard
      title="Kamai kahan se"
      icon={Percent}
      description={`30 din · ${streams.servicesShare.toFixed(0)}% services se`}
      to="/appliances/profit-report"
    >
      {streams.list.length === 0 ? (
        <p className="py-6 text-center text-[0.8125rem] text-slate-500">30 din me abhi koi bikri nahi</p>
      ) : (
        <ul className="space-y-3">
          {streams.list.map((s) => {
            const share = streams.total > 0 ? (s.revenue / streams.total) * 100 : 0;
            return (
              <li key={s.key}>
                <div className="flex items-center justify-between gap-2 text-[0.8125rem]">
                  <span className="truncate font-medium text-slate-800">{s.label}</span>
                  <span className="shrink-0 tabular-nums text-slate-600">
                    <span className="font-semibold text-slate-900">{sales(s.revenue)}</span> · {share.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${STREAM_BAR[s.key] ?? 'bg-slate-400'}`} style={{ width: `${Math.min(share, 100)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}

export function AppliancesTechnicians() {
  const { tech } = useAppliancesOps();
  const { sales } = useMasked();
  const board = [...(tech?.leaderboard ?? [])].filter((t) => t.isActive).sort((a, b) => b.monthJobs - a.monthJobs).slice(0, 6);
  return (
    <WidgetCard
      title="Technicians"
      icon={Users}
      description={tech?.avgTeamRating ? `Team rating ${tech.avgTeamRating.toFixed(1)} · ${tech.free} khali` : `${tech?.free ?? 0} khali · ${tech?.active ?? 0} active`}
      to="/appliances/technicians"
      flush
    >
      <RowList empty="Abhi koi technician nahi" emptyIcon={Users}>
        {board.map((t) => (
          <ListRow
            key={t.id}
            to={`/appliances/technicians/${t.id}`}
            leading={<IconBubble icon={HardHat} tone={t.openJobs === 0 ? 'success' : t.openJobs >= 5 ? 'danger' : 'neutral'} />}
            title={t.name}
            meta={<span>{t.openJobs} kaam haath me · {t.monthJobs} is mahine{t.avgRating ? <> · <Star className="inline h-3 w-3 text-amber-500" /> {t.avgRating.toFixed(1)}</> : null}</span>}
            value={sales(t.monthRevenue)}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

/** Money waiting with brands, customers and AMC contracts. */
export function useAppliancesMoneyTiles(): MoneyTileProps[] {
  const { work, claims, amc } = useAppliancesOps();
  return [
    {
      key: 'service-due', icon: Wrench, tone: 'warning', to: '/appliances/service-requests', label: 'Service ka baqi',
      value: formatPKR(work.outstanding), hint: 'kaam ho gaya, paisa nahi aaya', alert: work.outstanding > 0,
    },
    {
      key: 'brand-claims', icon: ShieldCheck, tone: 'danger', to: '/appliances/warranty-claims', label: 'Brand ke paas atka',
      value: formatPKR(claims?.money?.pending ?? 0),
      hint: claims?.missing?.count ? `${claims.missing.count} claim bane hi nahi · ${formatPKR(claims.missing.recoverable)}` : `${claims?.open ?? 0} claim khule`,
      alert: (claims?.missing?.count ?? 0) > 0,
    },
    {
      key: 'amc-due', icon: ShieldCheck, tone: 'info', to: '/appliances/amc-contracts', label: 'AMC ka baqi',
      value: formatPKR(amc?.pendingAmount ?? 0), hint: `${amc?.active ?? 0} contract chal rahe`,
    },
  ];
}
