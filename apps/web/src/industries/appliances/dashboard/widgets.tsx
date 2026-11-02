/** Appliance-shop-only dashboard widgets. */

import {
  AlertTriangle, Barcode, CalendarCheck, Clock, HardHat, Percent, ShieldCheck, Star, Truck, Users, Wallet, Wrench,
} from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, MetricTile, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem, MoneyTileProps } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { useAppliancesOps } from './useAppliancesOps';
import { t as tr } from '@core/i18n';

/** Appliance headline numbers, offered next to the common ones. */
export const appliancesKpis: KpiDef[] = [
  {
    id: 'appliances-repairs', label: tr('Repair khule'), icon: Wrench, tone: 'warning',
    useValue: () => {
      const { work, loading } = useAppliancesOps();
      return {
        loading, to: '/appliances/service-requests', value: work.repairsOpen, alert: work.repairsLate > 0,
        hint: work.repairsLate ? tr('{{repairsLate}} late!', { repairsLate: work.repairsLate }) : tr('{{repairsDoneToday}} aaj mukammal', { repairsDoneToday: work.repairsDoneToday }),
      };
    },
  },
  {
    id: 'appliances-installs', label: tr('Installation baqi'), icon: HardHat, tone: 'brand',
    useValue: () => {
      const { work, loading } = useAppliancesOps();
      return {
        loading, to: '/appliances/installations', value: work.installsOpen, alert: work.installsLate > 0,
        hint: work.installsLate ? tr('{{installsLate}} late!', { installsLate: work.installsLate }) : tr('{{installsToday}} aaj', { installsToday: work.installsToday }),
      };
    },
  },
  {
    id: 'appliances-service-due', label: tr('Service ka baqi'), icon: Wallet, tone: 'danger', sensitive: true,
    useValue: () => {
      const { work, loading } = useAppliancesOps();
      const { cost } = useMasked();
      return { loading, to: '/appliances/service-requests', value: cost(work.outstanding), alert: work.outstanding > 0, hint: tr('kaam ho gaya, paisa nahi aaya') };
    },
  },
  {
    id: 'appliances-services-share', label: tr('Services ka hissa'), icon: Percent, tone: 'success',
    useValue: () => {
      const { streams, loading } = useAppliancesOps();
      const { sales } = useMasked();
      return { loading: loading && !streams.total, to: '/profit-report', value: `${streams.servicesShare.toFixed(0)}%`, hint: tr('{{services}} · 30 din', { services: sales(streams.services) }) };
    },
  },
  {
    id: 'appliances-techs', label: tr('Khali technician'), icon: Users, tone: 'neutral',
    useValue: () => {
      const { tech, loading } = useAppliancesOps();
      return { loading, to: '/appliances/technicians', value: tech?.free ?? 0, hint: tr('{{value}} active · {{value2}} kaam', { value: tech?.active ?? 0, value2: tech?.openJobs ?? 0 }) };
    },
  },
];

export function useAppliancesAttention(): AttentionItem[] {
  const { work, serial, amc, delivery, tech, claims } = useAppliancesOps();
  const { cost } = useMasked();
  const items: AttentionItem[] = [];

  if (work.repairsLate) items.push({ icon: Clock, level: 'danger', text: tr('{{repairsLate}} repair late hain — customer intezar kar raha hai', { repairsLate: work.repairsLate }), to: '/appliances/service-requests', cta: tr('Repair dekhein') });
  if (work.installsLate) items.push({ icon: HardHat, level: 'danger', text: tr('{{installsLate}} installation late hain', { installsLate: work.installsLate }), to: '/appliances/installations', cta: tr('Installation dekhein') });
  if (claims?.missing?.count) items.push({ icon: ShieldCheck, level: 'danger', text: tr('{{count}} warranty repair ka brand se claim banaya hi nahi — {{recoverable}} wapas mil sakta hai', { count: claims.missing.count, recoverable: cost(claims.missing.recoverable) }), to: '/appliances/warranty-claims', cta: tr('Claim banayein') });
  if (work.unassigned) items.push({ icon: Users, level: 'warning', text: tr('{{unassigned}} kaam par koi technician nahi laga — subah hi kisi ko dein', { unassigned: work.unassigned }), to: '/appliances/service-requests', cta: tr('Banda lagayein') });
  if (work.outstanding > 0) items.push({ icon: Wallet, level: 'warning', text: tr('Service ka {{outstanding}} baqi hai — kaam ho chuka, receiving nahi hui', { outstanding: cost(work.outstanding) }), to: '/appliances/service-requests', cta: tr('Receive karein') });
  if (serial?.installation?.pending) items.push({ icon: HardHat, level: 'warning', text: tr('{{pending}} unit bik gaye lekin abhi lage nahi', { pending: serial.installation.pending }), to: '/appliances/installations', cta: tr('Book karein') });
  if (delivery?.noVehicle) items.push({ icon: Truck, level: 'warning', text: tr('{{noVehicle}} delivery par gaari nahi lagi', { noVehicle: delivery.noVehicle }), to: '/appliances/deliveries', cta: tr('Gaari lagayein') });
  if (tech?.overloaded) items.push({ icon: AlertTriangle, level: 'warning', text: tr('{{overloaded}} technician par kaam zyada hai — kuch kaam doosron ko dein', { overloaded: tech.overloaded }), to: '/appliances/technicians', cta: tr('Technicians') });
  if (claims?.money?.pending) items.push({ icon: Wallet, level: 'info', text: tr('Brand ke paas {{pending}} atka hai', { pending: cost(claims.money.pending) }), to: '/appliances/warranty-claims', cta: tr('Follow up') });
  if (amc?.expiringSoon) items.push({ icon: ShieldCheck, level: 'info', text: tr('{{expiringSoon}} AMC jald khatam ho rahe — renew karwayein', { expiringSoon: amc.expiringSoon }), to: '/appliances/amc-contracts', cta: tr('AMC dekhein') });
  if (serial?.warrantyExpiringSoon) items.push({ icon: ShieldCheck, level: 'neutral', text: tr('{{warrantyExpiringSoon}} unit ki warranty khatam ho rahi — AMC offer karein', { warrantyExpiringSoon: serial.warrantyExpiringSoon }), to: '/appliances/serials', cta: tr('Serial dekhein') });
  return items;
}

export function AppliancesJobs() {
  const { jobs, work } = useAppliancesOps();
  return (
    <WidgetCard
      title={tr('Aaj ka field kaam')}
      icon={CalendarCheck}
      description={tr('{{installsToday}} installation aaj · {{repairsOpen}} repair khule', { installsToday: work.installsToday, repairsOpen: work.repairsOpen })}
      to="/appliances/service-requests"
      flush
    >
      <RowList empty={tr('Koi kaam baqi nahi')} emptyIcon={CalendarCheck}>
        {jobs.map((j) => (
          <ListRow
            key={`${j.kind}-${j.id}`}
            to={j.to}
            leading={<IconBubble icon={j.kind === 'install' ? HardHat : Wrench} tone={j.late ? 'danger' : j.kind === 'install' ? 'brand' : 'warning'} />}
            title={j.customer}
            meta={<span><span className="font-mono">{j.number}</span> · {j.detail}</span>}
            value={j.late
              ? <Badge variant="danger" size="xs">{tr('Late')}</Badge>
              : j.urgent ? <Badge variant="warning" size="xs">{tr('Foran')}</Badge>
              : <Badge variant="default" size="xs">{j.status.label}</Badge>}
            valueHint={j.technician
              ? <span className="text-slate-500">{j.technician}{j.slot ? ` · ${j.slot}` : ''}</span>
              : <span className="text-amber-700">{tr('banda nahi laga')}</span>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

export function AppliancesServices() {
  const { work, tech, amc, delivery, claims, serial } = useAppliancesOps();
  return (
    <WidgetCard title={tr('Service ka haal')} icon={Wrench} description={tr('Repair, installation, delivery, AMC aur claims ek nazar me')}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <MetricTile icon={Wrench} tone="warning" label={tr('Repair khule')} value={work.repairsOpen} hint={work.repairsLate ? tr('{{repairsLate}} late', { repairsLate: work.repairsLate }) : tr('{{repairsDoneToday}} aaj mukammal', { repairsDoneToday: work.repairsDoneToday })} to="/appliances/service-requests" alert={work.repairsLate > 0} />
        <MetricTile icon={HardHat} tone="brand" label={tr('Installation baqi')} value={work.installsOpen} hint={tr('{{installsToday}} aaj', { installsToday: work.installsToday })} to="/appliances/installations" alert={work.installsLate > 0} />
        <MetricTile icon={Truck} tone="info" label={tr('Delivery baqi')} value={delivery?.open ?? 0} hint={tr('{{value}} aaj', { value: delivery?.todayScheduled ?? 0 })} to="/appliances/deliveries" alert={(delivery?.overdue ?? 0) > 0} />
        <MetricTile icon={ShieldCheck} tone="success" label={tr('AMC chal rahe')} value={amc?.active ?? 0} hint={amc?.expiringSoon ? tr('{{expiringSoon}} khatam ho rahe', { expiringSoon: amc.expiringSoon }) : tr('sab theek')} to="/appliances/amc-contracts" />
        <MetricTile icon={ShieldCheck} tone="danger" label={tr('Claims khule')} value={claims?.open ?? 0} hint={claims?.stale ? tr('{{stale}} 30 din se purane', { stale: claims.stale }) : tr('{{value}} is mahine', { value: claims?.month?.claims ?? 0 })} to="/appliances/warranty-claims" />
        <MetricTile icon={Barcode} tone="neutral" label={tr('Serial stock me')} value={serial?.inStock?.units ?? 0} hint={tr('{{value}} technician khali', { value: tech?.free ?? 0 })} to="/appliances/serials" />
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
      title={tr('Kamai kahan se')}
      icon={Percent}
      description={tr('30 din · {{value}}% services se', { value: streams.servicesShare.toFixed(0) })}
      to="/profit-report"
    >
      {streams.list.length === 0 ? (
        <p className="py-6 text-center text-[0.8125rem] text-slate-500">{tr('30 din me abhi koi sale nahi')}</p>
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
      title={tr('Technicians')}
      icon={Users}
      description={tech?.avgTeamRating ? tr('Team rating {{value}} · {{free}} khali', { value: tech.avgTeamRating.toFixed(1), free: tech.free }) : tr('{{value}} khali · {{value2}} active', { value: tech?.free ?? 0, value2: tech?.active ?? 0 })}
      to="/appliances/technicians"
      flush
    >
      <RowList empty={tr('Abhi koi technician nahi')} emptyIcon={Users}>
        {board.map((t) => (
          <ListRow
            key={t.id}
            to={`/appliances/technicians/${t.id}`}
            leading={<IconBubble icon={HardHat} tone={t.openJobs === 0 ? 'success' : t.openJobs >= 5 ? 'danger' : 'neutral'} />}
            title={t.name}
            meta={<span>{tr('{{openJobs}} kaam haath me · {{monthJobs}} is mahine', { openJobs: t.openJobs, monthJobs: t.monthJobs })}{t.avgRating ? <> · <Star className="inline h-3 w-3 text-amber-500" /> {t.avgRating.toFixed(1)}</> : null}</span>}
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
      key: 'service-due', icon: Wrench, tone: 'warning', to: '/appliances/service-requests', label: tr('Service ka baqi'),
      value: formatPKR(work.outstanding), hint: tr('kaam ho gaya, paisa nahi aaya'), alert: work.outstanding > 0,
    },
    {
      key: 'brand-claims', icon: ShieldCheck, tone: 'danger', to: '/appliances/warranty-claims', label: tr('Brand ke paas atka'),
      value: formatPKR(claims?.money?.pending ?? 0),
      hint: claims?.missing?.count ? tr('{{count}} claim bane hi nahi · {{recoverable}}', { count: claims.missing.count, recoverable: formatPKR(claims.missing.recoverable) }) : tr('{{value}} claim khule', { value: claims?.open ?? 0 }),
      alert: (claims?.missing?.count ?? 0) > 0,
    },
    {
      key: 'amc-due', icon: ShieldCheck, tone: 'info', to: '/appliances/amc-contracts', label: tr('AMC ka baqi'),
      value: formatPKR(amc?.pendingAmount ?? 0), hint: tr('{{value}} contract chal rahe', { value: amc?.active ?? 0 }),
    },
  ];
}
