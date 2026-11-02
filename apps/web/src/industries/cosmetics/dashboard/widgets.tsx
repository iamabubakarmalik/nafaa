/** Cosmetics-only dashboard widgets. */

import { CalendarClock, Cake, CloudOff, PackageX } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { EmptyHint, fmtQty, IconBubble, ListRow, RowList, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { useCosmeticsOps } from './useCosmeticsOps';
import { t } from '@core/i18n';

const fmtDay = (iso: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(iso));
const UNAVAILABLE = t('Yeh data abhi server se nahi mil raha');

/** Cosmetics headline numbers, offered next to the common ones. */
export const cosmeticsKpis: KpiDef[] = [
  {
    id: 'cosmetics-expiry', label: t('Expiry qareeb'), icon: CalendarClock, tone: 'danger',
    useValue: () => {
      const { expiry, available, loading } = useCosmeticsOps();
      if (!available) return { loading, value: '—', hint: t('data nahi mila'), to: '/cosmetics/expiry' };
      return { loading, to: '/cosmetics/expiry', value: expiry.soon, alert: expiry.expired > 0, hint: expiry.expired ? t('{{expired}} expire ho chuke', { expired: expiry.expired }) : t('30 din me') };
    },
  },
  {
    id: 'cosmetics-birthdays', label: t('Is mahine salgirah'), icon: Cake, tone: 'brand',
    useValue: () => {
      const { birthdays, loading } = useCosmeticsOps();
      return { loading, to: '/customers', value: birthdays.all.length, hint: t('{{count}} abhi baqi', { count: birthdays.upcoming.length }) };
    },
  },
];

export function useCosmeticsAttention(): AttentionItem[] {
  const { expiry, birthdays } = useCosmeticsOps();
  const items: AttentionItem[] = [];
  if (expiry.expired) items.push({ icon: PackageX, level: 'danger', text: t('{{expired}} batch expire ho chuke — shelf se hata dein', { expired: expiry.expired }), to: '/cosmetics/expiry', cta: t('Expiry dekhein') });
  if (expiry.week) items.push({ icon: CalendarClock, level: 'warning', text: t('{{week}} batch 7 din me expire honge — discount laga kar nikaal dein', { week: expiry.week }), to: '/cosmetics/expiry', cta: t('Jaldi bechein') });
  else if (expiry.soon) items.push({ icon: CalendarClock, level: 'info', text: t('{{soon}} batch 30 din me expire honge', { soon: expiry.soon }), to: '/cosmetics/expiry', cta: t('Dekhein') });
  if (birthdays.upcoming.length) items.push({ icon: Cake, level: 'info', text: t('{{count}} customers ki salgirah is mahine — offer bhejein', { count: birthdays.upcoming.length }), to: '/customers', cta: t('Customers') });
  return items;
}

export function CosmeticsExpiry() {
  const { expiry, available } = useCosmeticsOps();
  return (
    <WidgetCard title={t('Expiry qareeb')} icon={CalendarClock} description={expiry.expired ? t('{{expired}} expire ho chuke · {{soon}} 30 din me', { expired: expiry.expired, soon: expiry.soon }) : t('{{soon}} batch 30 din me', { soon: expiry.soon })} to="/cosmetics/expiry" flush>
      {!available ? <EmptyHint icon={CloudOff} text={UNAVAILABLE} /> : (
        <RowList empty={t('30 din me koi batch expire nahi ho raha')} emptyIcon={CalendarClock}>
          {expiry.list.slice(0, 6).map((b) => {
            const tone = b.days <= 7 ? 'danger' : b.days <= 15 ? 'warning' : 'neutral';
            return (
              <ListRow key={b.id} to={`/cosmetics-products/${b.productId}`}
                leading={<IconBubble icon={CalendarClock} tone={tone} />}
                title={b.product?.name ?? <span className="font-mono">{b.batchNumber}</span>}
                meta={t('{{value}} · {{quantity}} baqi{{value2}}', { value: [b.variant?.name, b.batchNumber].filter(Boolean).join(' · '), quantity: fmtQty(b.quantity), value2: b.expiryDate ? ` · ${fmtDay(b.expiryDate)}` : '' })}
                value={<Badge variant={tone === 'neutral' ? 'default' : tone} size="xs">{b.days <= 0 ? t('Expire') : t('{{days}} din', { days: b.days })}</Badge>} />
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
    <WidgetCard title={t('Is mahine salgirah')} icon={Cake} description={t('{{count}} customers', { count: birthdays.all.length })} to="/customers" linkLabel={t('Customers')} flush>
      <RowList empty={t('Is mahine kisi customer ki salgirah nahi')} emptyIcon={Cake}>
        {birthdays.all.slice(0, 6).map((m) => (
          <ListRow key={m.id} to={`/customers/${m.id}`}
            leading={<IconBubble icon={Cake} tone={m.day === today ? 'success' : m.day < today ? 'neutral' : 'brand'} />}
            title={m.name} meta={m.phone ?? undefined}
            value={<Badge variant={m.day === today ? 'success' : 'default'} size="xs">{m.day === today ? t('Aaj') : t('{{day}} tareekh', { day: m.day })}</Badge>} />
        ))}
      </RowList>
    </WidgetCard>
  );
}
