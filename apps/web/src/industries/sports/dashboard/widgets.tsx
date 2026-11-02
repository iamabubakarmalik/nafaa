/** Sports-shop-only dashboard widgets. */

import { AlertTriangle, Award, CheckCircle2, PackageCheck, Trophy, Users, Wallet, Wrench } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem, MoneyTileProps } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { useSportsOps } from './useSportsOps';
import { t } from '@core/i18n';

const TEAM_STATUS: Record<string, string> = {
  DRAFT: t('Draft'), QUOTED: t('Quote'), CONFIRMED: t('Pakka'), IN_PRODUCTION: t('Ban raha'), READY: t('Tayyar'),
};
const REPAIR_STATUS: Record<string, string> = { RECEIVED: t('Aaya'), IN_PROGRESS: t('Kaam jari') };

const fmtDay = (iso: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(iso));

/** Sports headline numbers, offered next to the common ones. */
export const sportsKpis: KpiDef[] = [
  {
    id: 'sports-team-orders', label: t('Team orders'), icon: Users, tone: 'brand',
    useValue: () => {
      const { team, loading } = useSportsOps();
      return {
        loading, to: '/sports/team-orders', value: team.active, alert: team.atRisk > 0,
        hint: team.ready ? t('{{ready}} tayyar', { ready: team.ready }) : team.atRisk ? t('{{atRisk}} khatre me', { atRisk: team.atRisk }) : t('{{inProduction}} ban rahe', { inProduction: team.inProduction }),
      };
    },
  },
  {
    id: 'sports-repairs', label: t('Repair baqi'), icon: Wrench, tone: 'warning',
    useValue: () => {
      const { repairs, loading } = useSportsOps();
      return {
        loading, to: '/sports/repair-services', value: repairs.pending, alert: repairs.overdue > 0,
        hint: repairs.overdue ? t('{{overdue}} late!', { overdue: repairs.overdue }) : repairs.toCollect ? t('{{toCollect}} lene aana hai', { toCollect: repairs.toCollect }) : t('sab waqt par'),
      };
    },
  },
  {
    id: 'sports-team-balance', label: t('Team orders ka baqi'), icon: Wallet, tone: 'danger', sensitive: true,
    useValue: () => {
      const { team, loading } = useSportsOps();
      const { cost } = useMasked();
      return { loading, to: '/sports/team-orders', value: cost(team.balance), hint: t('{{active}} chaalu order', { active: team.active }) };
    },
  },
];

export function useSportsAttention(): AttentionItem[] {
  const { team, repairs } = useSportsOps();
  const items: AttentionItem[] = [];
  if (repairs.overdue) items.push({ icon: AlertTriangle, level: 'danger', text: t('{{overdue}} repair late hai — customer ko batayein ya aaj mukammal karein', { overdue: repairs.overdue }), to: '/sports/repair-services', cta: t('Repairs dekhein') });
  if (team.atRisk) items.push({ icon: Users, level: 'warning', text: t('{{atRisk}} team order 3 din me dena hai aur abhi tayyar nahi', { atRisk: team.atRisk }), to: '/sports/team-orders', cta: t('Orders dekhein') });
  if (team.ready) items.push({ icon: PackageCheck, level: 'info', text: t('{{ready}} team order tayyar hai — delivery aur baqi amount ka intezam karein', { ready: team.ready }), to: '/sports/team-orders?status=READY', cta: t('Deliver karein') });
  if (repairs.toCollect) items.push({ icon: CheckCircle2, level: 'info', text: t('{{toCollect}} repair ho chuki — customer ko lene ke liye call karein', { toCollect: repairs.toCollect }), to: '/sports/repair-services', cta: t('Dekhein') });
  if (team.quoted) items.push({ icon: Trophy, level: 'neutral', text: t('{{quoted}} team order quote/draft me hai — follow up karein', { quoted: team.quoted }), to: '/sports/team-orders', cta: t('Follow up') });
  return items;
}

export function SportsTeamDeliveries() {
  const { team } = useSportsOps();
  const { cost, costHidden } = useMasked();
  return (
    <WidgetCard
      title={t('Team order delivery')}
      icon={Users}
      description={team.balance > 0 && !costHidden ? t('{{balance}} baqi lena hai', { balance: formatPKR(team.balance) }) : t('Agle 14 din')}
      to="/sports/team-orders"
      flush
    >
      <RowList empty={t('Agle 14 din koi delivery nahi')} emptyIcon={Users}>
        {team.deliveries.slice(0, 6).map((o) => {
          const ready = o.status === 'READY';
          const soon = o.days <= 3;
          const due = Number(o.balanceAmount ?? Math.max(Number(o.totalAmount || 0) - Number(o.advancePaid || 0), 0));
          return (
            <ListRow
              key={o.id}
              to={`/sports/team-orders/${o.id}/edit`}
              leading={<IconBubble icon={ready ? PackageCheck : Users} tone={ready ? 'success' : soon ? 'warning' : 'neutral'} />}
              title={o.teamName || t('Team')}
              meta={<span><span className="font-mono">{o.orderNumber}</span>{o.totalQuantity ? t(' · {{totalQuantity}} piece', { totalQuantity: o.totalQuantity }) : ''}{due > 0 ? t(' · baqi {{due}}', { due: cost(due) }) : ''}</span>}
              value={<Badge variant={ready ? 'success' : soon ? 'warning' : 'default'} size="xs">{TEAM_STATUS[o.status] ?? o.status}</Badge>}
              valueHint={<span className="text-slate-500">{fmtDay(o.expectedDeliveryDate)}</span>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function SportsRepairs() {
  const { repairs } = useSportsOps();
  const { sales } = useMasked();
  return (
    <WidgetCard
      title={t('Repair me saamaan')}
      icon={Wrench}
      description={repairs.overdue ? t('{{overdue}} late · {{pending}} baqi', { overdue: repairs.overdue, pending: repairs.pending }) : t('{{pending}} baqi', { pending: repairs.pending })}
      to="/sports/repair-services"
      flush
    >
      <RowList empty={t('Koi repair baqi nahi')} emptyIcon={Wrench}>
        {repairs.list.slice(0, 6).map((r) => (
          <ListRow
            key={r.id}
            to="/sports/repair-services"
            leading={<IconBubble icon={Wrench} tone={r.late ? 'danger' : 'warning'} />}
            title={r.customerName || t('Customer')}
            meta={<span><span className="font-mono">{r.serviceNumber}</span> · {t(r.itemType)}{r.itemBrand ? ` (${r.itemBrand})` : ''}</span>}
            value={r.late ? <Badge variant="danger" size="xs">{t('Late')}</Badge> : <Badge variant="default" size="xs">{REPAIR_STATUS[r.status] ?? r.status}</Badge>}
            valueHint={Number(r.estimatedCost) > 0 ? <span className="text-slate-500">{sales(r.estimatedCost)}</span> : undefined}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

export function SportsBrands() {
  const { brands, totalBrands } = useSportsOps();
  const { sales } = useMasked();
  return (
    <WidgetCard title={t('Top brands')} icon={Award} description={t('{{totalBrands}} brands · sale ke hisaab se', { totalBrands })} to="/sports/brands" flush>
      <RowList empty={t('Brands abhi nahi daale')} emptyIcon={Award}>
        {brands.slice(0, 5).map((b, i) => (
          <ListRow
            key={b.id}
            to="/sports/brands"
            leading={b.logoUrl
              ? <img src={b.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1" />
              : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[0.8125rem] font-bold text-slate-600">{i + 1}</span>}
            title={b.name}
            meta={[b.authorizedDealer ? t('Authorized dealer') : null, b.brandTier].filter(Boolean).join(' · ') || undefined}
            value={sales(b.totalRevenue)}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

/** Team-order balances still to collect, as an extra money tile. */
export function useSportsMoneyTiles(): MoneyTileProps[] {
  const { team } = useSportsOps();
  if (team.balance <= 0) return [];
  return [{
    key: 'team-orders', icon: Users, tone: 'warning', to: '/sports/team-orders', label: t('Team orders se lena'),
    value: formatPKR(team.balance), hint: t('{{active}} chaalu order', { active: team.active }),
  }];
}
