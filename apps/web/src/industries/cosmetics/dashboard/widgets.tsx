/** Cosmetics-only dashboard widgets. */

import { CalendarClock, Cake, CloudOff, PackageX } from 'lucide-react';
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
      if (!available) return { loading, value: '—', hint: 'data nahi mila', to: '/cosmetics/expiry' };
      return { loading, to: '/cosmetics/expiry', value: expiry.soon, alert: expiry.expired > 0, hint: expiry.expired ? `${expiry.expired} expire ho chuke` : '30 din me' };
    },
  },
  {
    id: 'cosmetics-birthdays', label: 'Is mahine salgirah', icon: Cake, tone: 'brand',
    useValue: () => {
      const { birthdays, loading } = useCosmeticsOps();
      return { loading, to: '/customers', value: birthdays.all.length, hint: `${birthdays.upcoming.length} abhi baqi` };
    },
  },
];

export function useCosmeticsAttention(): AttentionItem[] {
  const { expiry, birthdays } = useCosmeticsOps();
  const items: AttentionItem[] = [];
  if (expiry.expired) items.push({ icon: PackageX, level: 'danger', text: `${expiry.expired} batch expire ho chuke — shelf se hata dein`, to: '/cosmetics/expiry', cta: 'Expiry dekhein' });
  if (expiry.week) items.push({ icon: CalendarClock, level: 'warning', text: `${expiry.week} batch 7 din me expire honge — discount laga kar nikaal dein`, to: '/cosmetics/expiry', cta: 'Jaldi bechein' });
  else if (expiry.soon) items.push({ icon: CalendarClock, level: 'info', text: `${expiry.soon} batch 30 din me expire honge`, to: '/cosmetics/expiry', cta: 'Dekhein' });
  if (birthdays.upcoming.length) items.push({ icon: Cake, level: 'info', text: `${birthdays.upcoming.length} customers ki salgirah is mahine — offer bhejein`, to: '/customers', cta: 'Customers' });
  return items;
}

export function CosmeticsExpiry() {
  const { expiry, available } = useCosmeticsOps();
  return (
    <WidgetCard title="Expiry qareeb" icon={CalendarClock} description={expiry.expired ? `${expiry.expired} expire ho chuke · ${expiry.soon} 30 din me` : `${expiry.soon} batch 30 din me`} to="/cosmetics/expiry" flush>
      {!available ? <EmptyHint icon={CloudOff} text={UNAVAILABLE} /> : (
        <RowList empty="30 din me koi batch expire nahi ho raha" emptyIcon={CalendarClock}>
          {expiry.list.slice(0, 6).map((b) => {
            const tone = b.days <= 7 ? 'danger' : b.days <= 15 ? 'warning' : 'neutral';
            return (
              <ListRow key={b.id} to={`/cosmetics-products/${b.productId}`}
                leading={<IconBubble icon={CalendarClock} tone={tone} />}
                title={b.product?.name ?? <span className="font-mono">{b.batchNumber}</span>}
                meta={`${[b.variant?.name, b.batchNumber].filter(Boolean).join(' · ')} · ${fmtQty(b.quantity)} baqi${b.expiryDate ? ` · ${fmtDay(b.expiryDate)}` : ''}`}
                value={<Badge variant={tone === 'neutral' ? 'default' : tone} size="xs">{b.days <= 0 ? 'Expire' : `${b.days} din`}</Badge>} />
            );
          })}
        </RowList>
      )}
    </WidgetCard>
  );
}

export function CosmeticsBirthdays() {
  const { birthdays } = useCosmeticsOps();
  const today = new Date().getDate();
  return (
    <WidgetCard title="Is mahine salgirah" icon={Cake} description={`${birthdays.all.length} customers`} to="/customers" linkLabel="Customers" flush>
      <RowList empty="Is mahine kisi customer ki salgirah nahi" emptyIcon={Cake}>
        {birthdays.all.slice(0, 6).map((m) => (
          <ListRow key={m.id} to={`/customers/${m.id}`}
            leading={<IconBubble icon={Cake} tone={m.day === today ? 'success' : m.day < today ? 'neutral' : 'brand'} />}
            title={m.name} meta={m.phone ?? undefined}
            value={<Badge variant={m.day === today ? 'success' : 'default'} size="xs">{m.day === today ? 'Aaj' : `${m.day} tareekh`}</Badge>} />
        ))}
      </RowList>
    </WidgetCard>
  );
}
