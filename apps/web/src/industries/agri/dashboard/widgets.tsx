/** Agri-only dashboard widgets. */

import { CalendarClock, Clock, Landmark, ShieldAlert, Sprout, Tractor } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import { MoneyNote, type AttentionItem, type MoneyTileProps } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { useAgriOps } from './useAgriOps';

/** Agri headline numbers, offered next to the common ones. */
export const agriKpis: KpiDef[] = [
  {
    id: 'agri-farmer-udhaar', label: 'Farmer ka udhaar', icon: Tractor, tone: 'danger', sensitive: true,
    useValue: () => {
      const { farmers, loading } = useAgriOps();
      const { cost } = useMasked();
      return {
        loading, to: '/agri/farmers', value: cost(farmers.owed), alert: farmers.overdue > 0,
        hint: farmers.overdue ? `${farmers.overdue} ka waqt guzra` : `${farmers.owing} farmer`,
      };
    },
  },
  {
    id: 'agri-season', label: 'Bijai qareeb', icon: Sprout, tone: 'success',
    useValue: () => {
      const { season, loading } = useAgriOps();
      return {
        loading, to: '/agri/seasonal-plans', value: season.list.length, alert: season.risky > 0,
        hint: season.risky ? `${season.risky} fasal ka maal kam` : 'maal tayyar',
      };
    },
  },
  {
    id: 'agri-registration', label: 'Registration khatam', icon: ShieldAlert, tone: 'danger',
    useValue: () => {
      const { registration, loading } = useAgriOps();
      const { cost } = useMasked();
      return {
        loading, to: '/agri/products', value: registration.blocked, alert: registration.blocked > 0,
        hint: registration.blocked ? `${cost(registration.blockedValue)} ka maal ruka` : `${registration.soon} jald khatam`,
      };
    },
  },
  {
    id: 'agri-subsidy', label: 'Subsidy atki', icon: Landmark, tone: 'warning', sensitive: true,
    useValue: () => {
      const { subsidy, loading } = useAgriOps();
      const { cost } = useMasked();
      return { loading, to: '/agri/subsidy', value: cost(subsidy.amount), hint: `${subsidy.count} claim` };
    },
  },
];

export function useAgriAttention(): AttentionItem[] {
  const { registration, farmers, season, subsidy } = useAgriOps();
  const { cost } = useMasked();
  const items: AttentionItem[] = [];
  if (registration.blocked) items.push({ icon: ShieldAlert, level: 'danger', text: `${registration.blocked} cheezon ki registration khatam — ${cost(registration.blockedValue)} ka maal qanoonan bech nahi sakte`, to: '/agri/products', cta: 'Maal dekhein' });
  if (farmers.overdue) items.push({ icon: Clock, level: 'warning', text: `${farmers.overdue} farmer ka udhaar ka waqt guzar gaya — ${cost(farmers.overdueAmount)}`, to: '/agri/farmers', cta: 'Wusooli' });
  if (season.risky) items.push({ icon: Sprout, level: 'warning', text: `${season.risky} fasal ki bijai aa rahi hai magar maal poora nahi`, to: '/agri/seasonal-plans', cta: 'Calendar' });
  if (registration.soon) items.push({ icon: CalendarClock, level: 'info', text: `${registration.soon} cheezon ki registration 60 din me khatam — renew karwa lein`, to: '/agri/products', cta: 'Maal' });
  if (subsidy.count) items.push({ icon: Landmark, level: 'neutral', text: `${cost(subsidy.amount)} subsidy sarkar ke paas atki hai — ${subsidy.count} claim`, to: '/agri/subsidy', cta: 'Claims' });
  return items;
}

export function AgriSeason() {
  const { season } = useAgriOps();
  return (
    <WidgetCard
      title="Bijai qareeb hai"
      icon={Sprout}
      description={season.risky ? `${season.risky} fasal ka maal poora nahi` : 'Agle 45 din ki fasalein'}
      to="/agri/seasonal-plans"
      linkLabel="Calendar"
      flush
    >
      <RowList empty="Agle 45 din me kisi fasal ki bijai nahi — ya calendar khali hai" emptyIcon={Sprout}>
        {season.list.map((s) => (
          <ListRow
            key={s.id}
            to="/agri/seasonal-plans"
            leading={<IconBubble icon={Sprout} tone={s.risky ? 'danger' : 'success'} />}
            title={s.crop}
            meta={s.items === 0 ? 'Koi maal is fasal se juda nahi' : s.out > 0 ? `${s.out} cheezein khatam · ${s.items} kul` : `${s.items} cheezein maujood`}
            value={<Badge variant={s.now ? 'success' : 'default'} size="xs">{s.now ? 'Chal rahi' : `${s.toSow} din`}</Badge>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

export function AgriRecovery() {
  const { farmers } = useAgriOps();
  const { cost } = useMasked();
  return (
    <WidgetCard
      title="Farmer wusooli"
      icon={Tractor}
      description={farmers.overdue ? `${cost(farmers.overdueAmount)} ka waqt guzar chuka` : `${cost(farmers.owed)} kul udhaar`}
      to="/agri/farmers"
      flush
    >
      <RowList empty="Kisi farmer ka udhaar late nahi" emptyIcon={Tractor}>
        {farmers.list.map((f) => (
          <ListRow
            key={f.id}
            to="/agri/farmers"
            leading={<IconBubble icon={Tractor} tone="warning" />}
            title={f.fullName}
            meta={[f.village, f.district].filter(Boolean).join(', ') || f.phone}
            value={cost(f.owed)}
            valueHint={<span className="text-rose-700">{f.lateBy} din late</span>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

export function AgriRegistration() {
  const { registration } = useAgriOps();
  const { cost } = useMasked();
  return (
    <WidgetCard
      title="Registration"
      icon={ShieldAlert}
      description={registration.blocked ? `${registration.blocked} khatam · ${cost(registration.blockedValue)} ka maal` : `${registration.soon} jald khatam`}
      to="/agri/products"
      flush
    >
      <RowList empty="Beej, khaad aur dawa ki sab registration theek hai" emptyIcon={ShieldAlert}>
        {registration.list.map((r) => (
          <ListRow
            key={r.id}
            to={`/agri-products/${r.id}`}
            leading={<IconBubble icon={ShieldAlert} tone={r.blocked ? 'danger' : 'warning'} />}
            title={r.name}
            meta={`${r.stock} ${r.unit} · ${cost(r.value)}`}
            value={<Badge variant={r.blocked ? 'danger' : 'warning'} size="xs">{r.blocked ? 'Khatam' : `${r.certDays} din`}</Badge>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

export function AgriSubsidy() {
  const { subsidy } = useAgriOps();
  const { cost } = useMasked();
  return (
    <WidgetCard title="Subsidy claims" icon={Landmark} description={`${cost(subsidy.amount)} ka jawab baqi`} to="/agri/subsidy" flush>
      <RowList empty="Koi claim baqi nahi" emptyIcon={Landmark}>
        {subsidy.list.map((c) => (
          <ListRow
            key={c.id}
            to="/agri/subsidy"
            icon={Landmark}
            title={c.schemeName}
            meta={<span><span className="font-mono">{c.claimNumber}</span> · {c.productType}</span>}
            value={cost(c.subsidyAmount)}
            valueHint={<Badge variant={c.status === 'APPROVED' ? 'info' : 'warning'} size="xs">{c.status === 'APPROVED' ? 'Manzoor' : 'Baqi'}</Badge>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

/** Subsidy owed by the government, as an extra "where the money is" tile. */
export function useAgriMoneyTiles(): MoneyTileProps[] {
  const { subsidy } = useAgriOps();
  if (!subsidy.count) return [];
  return [{ key: 'subsidy', icon: Landmark, tone: 'warning', to: '/agri/subsidy', label: 'Sarkar se subsidy', value: formatPKR(subsidy.amount), hint: `${subsidy.count} claim baqi` }];
}

/** Stock that cannot legally be sold, called out under the money map. */
export function useAgriMoneyNotes() {
  const { registration } = useAgriOps();
  if (registration.blockedValue <= 0) return null;
  return (
    <MoneyNote
      tone="danger"
      icon={ShieldAlert}
      title={`${formatPKR(registration.blockedValue)} ka maal registration ke bagair para hai`}
      text="Beej, khaad aur dawa registration khatam hone par qanoonan bech nahi sakte — renew karwayein"
      to="/agri/products"
      cta="Maal dekhein"
    />
  );
}
