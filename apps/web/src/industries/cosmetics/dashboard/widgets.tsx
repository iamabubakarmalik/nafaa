/** Cosmetics-only dashboard widgets. */

import { CalendarClock, Cake, CloudOff, Heart, PackageX } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { EmptyHint, fmtQty, IconBubble, ListRow, RowList, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { useCosmeticsOps } from './useCosmeticsOps';

const fmtDay = (iso: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(iso));
const UNAVAILABLE = 'Yeh data abhi server se nahi mil raha';

/** Cosmetics headline numbers, offered next to the common ones. */
export const cosmeticsKpis: KpiDef[] = [
  {
    id: 'cosmetics-expiry', label: 'Expiry qareeb', icon: CalendarClock, tone: 'danger',
    useValue: () => {
      const { expiry, available, loading } = useCosmeticsOps();
      if (!available) return { loading, value: '—', hint: 'data nahi mila', to: '/cosmetics/batches' };
      return {
        loading, to: '/cosmetics/batches?expiringInDays=30', value: expiry.soon, alert: expiry.expired > 0,
        hint: expiry.expired ? `${expiry.expired} expire ho chuke` : '30 din me',
      };
    },
  },
  {
    id: 'cosmetics-loyalty', label: 'Loyalty members', icon: Heart, tone: 'brand',
    useValue: () => {
      const { loyalty, available, loading } = useCosmeticsOps();
      if (!available) return { loading, value: '—', hint: 'data nahi mila', to: '/cosmetics/loyalty' };
      return { loading, to: '/cosmetics/loyalty', value: loyalty.members, hint: `${loyalty.upcoming.length} salgirah baqi is mahine` };
    },
  },
];

export function useCosmeticsAttention(): AttentionItem[] {
  const { expiry, loyalty } = useCosmeticsOps();
  const items: AttentionItem[] = [];
  if (expiry.expired) items.push({ icon: PackageX, level: 'danger', text: `${expiry.expired} batch expire ho chuke — shelf se hata dein`, to: '/cosmetics/batches?expired=true', cta: 'Batches dekhein' });
  if (expiry.week) items.push({ icon: CalendarClock, level: 'warning', text: `${expiry.week} batch 7 din me expire honge — discount laga kar nikaal dein`, to: '/cosmetics/batches?expiringInDays=30', cta: 'Jaldi bechein' });
  else if (expiry.soon) items.push({ icon: CalendarClock, level: 'info', text: `${expiry.soon} batch 30 din me expire honge`, to: '/cosmetics/batches?expiringInDays=30', cta: 'Dekhein' });
  if (loyalty.upcoming.length) items.push({ icon: Cake, level: 'info', text: `${loyalty.upcoming.length} loyalty members ki salgirah is mahine — birthday offer bhejein`, to: '/cosmetics/loyalty', cta: 'Offer bhejein' });
  return items;
}

export function CosmeticsExpiry() {
  const { expiry, available } = useCosmeticsOps();
  return (
    <WidgetCard
      title="Expiry qareeb"
      icon={CalendarClock}
      description={expiry.expired ? `${expiry.expired} expire ho chuke · ${expiry.soon} 30 din me` : `${expiry.soon} batch 30 din me`}
      to="/cosmetics/batches?expiringInDays=30"
      flush
    >
      {!available ? <EmptyHint icon={CloudOff} text={UNAVAILABLE} /> : (
        <RowList empty="30 din me koi batch expire nahi ho raha" emptyIcon={CalendarClock}>
          {expiry.list.slice(0, 6).map((b) => {
            const tone = b.days <= 7 ? 'danger' : b.days <= 15 ? 'warning' : 'neutral';
            return (
              <ListRow
                key={b.id}
                leading={<IconBubble icon={CalendarClock} tone={tone} />}
                title={b.product?.name ?? <span className="font-mono">{b.batchNumber}</span>}
                meta={`${b.product?.name ? `${b.batchNumber} · ` : ''}${fmtQty(b.currentStock)} baqi · ${fmtDay(b.expiryDate)}`}
                value={<Badge variant={tone === 'neutral' ? 'default' : tone} size="xs">{b.days <= 0 ? 'Expire' : `${b.days} din`}</Badge>}
              />
            );
          })}
        </RowList>
      )}
    </WidgetCard>
  );
}

export function CosmeticsBirthdays() {
  const { loyalty, available } = useCosmeticsOps();
  const today = new Date().getDate();
  return (
    <WidgetCard title="Is mahine salgirah" icon={Cake} description={`${loyalty.birthdays.length} loyalty members`} to="/cosmetics/loyalty" linkLabel="Offer bhejein" flush>
      {!available ? <EmptyHint icon={CloudOff} text={UNAVAILABLE} /> : (
        <RowList empty="Is mahine kisi member ki salgirah nahi" emptyIcon={Cake}>
          {loyalty.birthdays.slice(0, 6).map((m) => {
            const day = m.dateOfBirth ? new Date(m.dateOfBirth).getDate() : null;
            const isToday = day === today;
            const past = day !== null && day < today;
            return (
              <ListRow
                key={m.id}
                to="/cosmetics/loyalty"
                leading={<IconBubble icon={Cake} tone={isToday ? 'success' : past ? 'neutral' : 'brand'} />}
                title={m.name}
                meta={[m.phone, m.tier].filter(Boolean).join(' · ')}
                value={m.dateOfBirth ? <Badge variant={isToday ? 'success' : 'default'} size="xs">{isToday ? 'Aaj' : fmtDay(m.dateOfBirth)}</Badge> : undefined}
              />
            );
          })}
        </RowList>
      )}
    </WidgetCard>
  );
}
