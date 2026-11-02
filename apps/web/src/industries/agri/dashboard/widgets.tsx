/** Agri-only dashboard widgets. */

import { CalendarClock, Clock, Landmark, ShieldAlert, Sprout, Tractor } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import { MoneyNote, type AttentionItem, type MoneyTileProps } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { useAgriOps } from './useAgriOps';
import { t } from '@core/i18n';

/** Agri headline numbers, offered next to the common ones. */
export const agriKpis: KpiDef[] = [
  {
    id: 'agri-farmer-udhaar', label: t('Farmer ka udhaar'), icon: Tractor, tone: 'danger', sensitive: true,
    useValue: () => {
      const { farmers, loading } = useAgriOps();
      const { cost } = useMasked();
      return {
        loading, to: '/agri/farmers', value: cost(farmers.owed), alert: farmers.overdue > 0,
        hint: farmers.overdue ? t('{{overdue}} ka waqt guzra', { overdue: farmers.overdue }) : t('{{owing}} farmer', { owing: farmers.owing }),
      };
    },
  },
  {
    id: 'agri-season', label: t('Bijai qareeb'), icon: Sprout, tone: 'success',
    useValue: () => {
      const { season, loading } = useAgriOps();
      return {
        loading, to: '/agri/seasonal-plans', value: season.list.length, alert: season.risky > 0,
        hint: season.risky ? t('{{risky}} fasal ka maal kam', { risky: season.risky }) : t('maal tayyar'),
      };
    },
  },
  {
    id: 'agri-registration', label: t('Registration khatam'), icon: ShieldAlert, tone: 'danger',
    useValue: () => {
      const { registration, loading } = useAgriOps();
      const { cost } = useMasked();
      return {
        loading, to: '/agri/products', value: registration.blocked, alert: registration.blocked > 0,
        hint: registration.blocked ? t('{{blockedValue}} ka maal ruka', { blockedValue: cost(registration.blockedValue) }) : t('{{soon}} jald khatam', { soon: registration.soon }),
      };
    },
  },
  {
    id: 'agri-subsidy', label: t('Subsidy atki'), icon: Landmark, tone: 'warning', sensitive: true,
    useValue: () => {
      const { subsidy, loading } = useAgriOps();
      const { cost } = useMasked();
      return { loading, to: '/agri/subsidy', value: cost(subsidy.amount), hint: t('{{count}} claim', { count: subsidy.count }) };
    },
  },
];

export function useAgriAttention(): AttentionItem[] {
  const { registration, farmers, season, subsidy } = useAgriOps();
  const { cost } = useMasked();
  const items: AttentionItem[] = [];
  if (registration.blocked) items.push({ icon: ShieldAlert, level: 'danger', text: t('{{blocked}} cheezon ki registration khatam — {{blockedValue}} ka maal qanoonan bech nahi sakte', { blocked: registration.blocked, blockedValue: cost(registration.blockedValue) }), to: '/agri/products', cta: t('Maal dekhein') });
  if (farmers.overdue) items.push({ icon: Clock, level: 'warning', text: t('{{overdue}} farmer ka udhaar ka waqt guzar gaya — {{overdueAmount}}', { overdue: farmers.overdue, overdueAmount: cost(farmers.overdueAmount) }), to: '/agri/farmers', cta: t('Receiving') });
  if (season.risky) items.push({ icon: Sprout, level: 'warning', text: t('{{risky}} fasal ki bijai aa rahi hai magar maal poora nahi', { risky: season.risky }), to: '/agri/seasonal-plans', cta: t('Calendar') });
  if (registration.soon) items.push({ icon: CalendarClock, level: 'info', text: t('{{soon}} cheezon ki registration 60 din me khatam — renew karwa lein', { soon: registration.soon }), to: '/agri/products', cta: t('Maal') });
  if (subsidy.count) items.push({ icon: Landmark, level: 'neutral', text: t('{{amount}} subsidy sarkar ke paas atki hai — {{count}} claim', { amount: cost(subsidy.amount), count: subsidy.count }), to: '/agri/subsidy', cta: t('Claims') });
  return items;
}

export function AgriSeason() {
  const { season } = useAgriOps();
  return (
    <WidgetCard
      title={t('Bijai qareeb hai')}
      icon={Sprout}
      description={season.risky ? t('{{risky}} fasal ka maal poora nahi', { risky: season.risky }) : t('Agle 45 din ki fasalein')}
      to="/agri/seasonal-plans"
      linkLabel={t('Calendar')}
      flush
    >
      <RowList empty={t('Agle 45 din me kisi fasal ki bijai nahi — ya calendar khali hai')} emptyIcon={Sprout}>
        {season.list.map((s) => (
          <ListRow
            key={s.id}
            to="/agri/seasonal-plans"
            leading={<IconBubble icon={Sprout} tone={s.risky ? 'danger' : 'success'} />}
            title={s.crop}
            meta={s.items === 0 ? t('Koi maal is fasal se juda nahi') : s.out > 0 ? t('{{out}} cheezein khatam · {{items}} kul', { out: s.out, items: s.items }) : t('{{items}} cheezein maujood', { items: s.items })}
            value={<Badge variant={s.now ? 'success' : 'default'} size="xs">{s.now ? t('Chal rahi') : t('{{toSow}} din', { toSow: s.toSow })}</Badge>}
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
      title={t('Farmer receiving')}
      icon={Tractor}
      description={farmers.overdue ? t('{{overdueAmount}} ka waqt guzar chuka', { overdueAmount: cost(farmers.overdueAmount) }) : t('{{owed}} kul udhaar', { owed: cost(farmers.owed) })}
      to="/agri/farmers"
      flush
    >
      <RowList empty={t('Kisi farmer ka udhaar late nahi')} emptyIcon={Tractor}>
        {farmers.list.map((f) => (
          <ListRow
            key={f.id}
            to="/agri/farmers"
            leading={<IconBubble icon={Tractor} tone="warning" />}
            title={f.fullName}
            meta={[f.village, f.district].filter(Boolean).join(', ') || f.phone}
            value={cost(f.owed)}
            valueHint={<span className="text-rose-700">{t('{{lateBy}} din late', { lateBy: f.lateBy })}</span>}
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
      title={t('Registration')}
      icon={ShieldAlert}
      description={registration.blocked ? t('{{blocked}} khatam · {{blockedValue}} ka maal', { blocked: registration.blocked, blockedValue: cost(registration.blockedValue) }) : t('{{soon}} jald khatam', { soon: registration.soon })}
      to="/agri/products"
      flush
    >
      <RowList empty={t('Beej, khaad aur dawa ki sab registration theek hai')} emptyIcon={ShieldAlert}>
        {registration.list.map((r) => (
          <ListRow
            key={r.id}
            to={`/agri-products/${r.id}`}
            leading={<IconBubble icon={ShieldAlert} tone={r.blocked ? 'danger' : 'warning'} />}
            title={r.name}
            meta={`${r.stock} ${r.unit} · ${cost(r.value)}`}
            value={<Badge variant={r.blocked ? 'danger' : 'warning'} size="xs">{r.blocked ? t('Khatam') : t('{{certDays}} din', { certDays: r.certDays })}</Badge>}
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
    <WidgetCard title={t('Subsidy claims')} icon={Landmark} description={t('{{amount}} ka jawab baqi', { amount: cost(subsidy.amount) })} to="/agri/subsidy" flush>
      <RowList empty={t('Koi claim baqi nahi')} emptyIcon={Landmark}>
        {subsidy.list.map((c) => (
          <ListRow
            key={c.id}
            to="/agri/subsidy"
            icon={Landmark}
            title={c.schemeName}
            meta={<span><span className="font-mono">{c.claimNumber}</span> · {c.productType}</span>}
            value={cost(c.subsidyAmount)}
            valueHint={<Badge variant={c.status === 'APPROVED' ? 'info' : 'warning'} size="xs">{c.status === 'APPROVED' ? t('Approve') : t('Baqi')}</Badge>}
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
  return [{ key: 'subsidy', icon: Landmark, tone: 'warning', to: '/agri/subsidy', label: t('Sarkar se subsidy'), value: formatPKR(subsidy.amount), hint: t('{{count}} claim baqi', { count: subsidy.count }) }];
}

/** Stock that cannot legally be sold, called out under the money map. */
export function useAgriMoneyNotes() {
  const { registration } = useAgriOps();
  if (registration.blockedValue <= 0) return null;
  return (
    <MoneyNote
      tone="danger"
      icon={ShieldAlert}
      title={t('{{blockedValue}} ka maal registration ke bagair para hai', { blockedValue: formatPKR(registration.blockedValue) })}
      text={t('Beej, khaad aur dawa registration khatam hone par qanoonan bech nahi sakte — renew karwayein')}
      to="/agri/products"
      cta={t('Maal dekhein')}
    />
  );
}
