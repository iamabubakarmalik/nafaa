/** Pet-shop-only dashboard widgets. */

import { Activity, CalendarCheck, CheckCircle2, Clock, Heart, PawPrint, Pill, Scissors, TrendingUp } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem, MoneyTileProps } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { usePetshopOps } from './usePetshopOps';
import { t } from '@core/i18n';

const STATUS: Record<string, { label: string; variant: 'default' | 'info' | 'warning' | 'success' | 'danger' }> = {
  SCHEDULED: { label: t('Booked'), variant: 'default' },
  CONFIRMED: { label: t('Pakka'), variant: 'info' },
  IN_PROGRESS: { label: t('Chal raha'), variant: 'warning' },
  READY_FOR_PICKUP: { label: t('Tayyar'), variant: 'success' },
  COMPLETED: { label: t('Mukammal'), variant: 'success' },
  CANCELLED: { label: t('Cancel'), variant: 'danger' },
  NO_SHOW: { label: t('Nahi aaya'), variant: 'danger' },
};

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' });

/** Pet-shop headline numbers, offered next to the common ones. */
export const petshopKpis: KpiDef[] = [
  {
    id: 'petshop-grooming', label: t('Aaj grooming'), icon: Scissors, tone: 'brand',
    useValue: () => {
      const { grooming: g, loading } = usePetshopOps();
      return { loading, to: '/petshop/grooming', value: g.today, hint: g.inProgress ? t('{{inProgress}} chal raha', { inProgress: g.inProgress }) : t('{{waiting}} intezar me', { waiting: g.waiting }) };
    },
  },
  {
    id: 'petshop-pickup', label: t('Pet lene aana hai'), icon: CheckCircle2, tone: 'success',
    useValue: () => {
      const { grooming: g, loading } = usePetshopOps();
      const { sales } = useMasked();
      return {
        loading, to: '/petshop/grooming', value: g.pickupCount, alert: g.pickupCount > 0,
        hint: g.pickupDue > 0 ? t('{{pickupDue}} lena baqi', { pickupDue: sales(g.pickupDue) }) : t('grooming tayyar'),
      };
    },
  },
  {
    id: 'petshop-animals', label: t('Bikne wale janwar'), icon: PawPrint, tone: 'info',
    useValue: () => {
      const { animals: a, loading } = usePetshopOps();
      const { sales } = useMasked();
      return { loading, to: '/petshop/live-animals', value: a.available, hint: a.reserved ? t('{{reserved}} reserve · {{sales}}', { reserved: a.reserved, sales: sales(a.value) }) : sales(a.value) };
    },
  },
  {
    id: 'petshop-health', label: t('Vaccine baqi'), icon: Activity, tone: 'warning',
    useValue: () => {
      const { animals: a, loading } = usePetshopOps();
      return { loading, to: '/petshop/live-animals', value: a.health.length, alert: a.health.length > 0, hint: t('vaccine ya deworm') };
    },
  },
  {
    id: 'petshop-expiry', label: t('Dawai expiry'), icon: Pill, tone: 'danger',
    useValue: () => {
      const { medicines: m, loading } = usePetshopOps();
      return {
        loading, to: '/petshop-products?filter=expiring', value: m.expiring, alert: m.expired > 0,
        hint: m.expired ? t('{{expired}} expire ho chuki', { expired: m.expired }) : t('90 din ke andar'),
      };
    },
  },
  {
    id: 'petshop-animal-profit', label: t('Janwaron ka profit'), icon: TrendingUp, tone: 'success', sensitive: true,
    useValue: () => {
      const { animals: a, loading } = usePetshopOps();
      const { cost } = useMasked();
      return { loading, to: '/petshop/live-animals', value: cost(a.monthProfit), hint: t('is mahine {{monthSold}} bike', { monthSold: a.monthSold }) };
    },
  },
];

export function usePetshopAttention(): AttentionItem[] {
  const { grooming, animals, medicines, loading } = usePetshopOps();
  const items: AttentionItem[] = [];
  if (loading) return items;

  if (medicines.expired) items.push({ icon: Pill, level: 'danger', text: t('{{expired}} dawai expire ho chuki — shelf se foran hatayein', { expired: medicines.expired }), to: '/petshop-products?filter=expired', cta: t('Dawai dekhein') });
  if (grooming.pickupCount) items.push({ icon: CheckCircle2, level: 'warning', text: t('{{pickupCount}} pet tayyar hain — maalik ko call karein', { pickupCount: grooming.pickupCount }), to: '/petshop/grooming?status=READY_FOR_PICKUP', cta: t('List dekhein') });
  if (animals.health.length) items.push({ icon: Activity, level: 'warning', text: t('{{count}} janwar ki vaccine ya deworming baqi hai', { count: animals.health.length }), to: '/petshop/live-animals', cta: t('Janwar dekhein') });
  if (medicines.within30) items.push({ icon: Clock, level: 'info', text: t('{{within30}} dawai 30 din me expire hogi — discount ya wapas karein', { within30: medicines.within30 }), to: '/petshop-products?filter=expiring', cta: t('Dekhein') });
  if (grooming.waiting) items.push({ icon: Scissors, level: 'info', text: t('Aaj {{waiting}} grooming appointment baqi hain', { waiting: grooming.waiting }), to: '/petshop/grooming', cta: t('Schedule dekhein') });
  return items;
}

export function PetshopGrooming() {
  const { grooming: g } = usePetshopOps();
  const { sales } = useMasked();
  return (
    <WidgetCard
      title={t('Aaj ki grooming')}
      icon={Scissors}
      description={g.today ? t('{{today}} appointment · {{doneToday}} mukammal · {{revenueToday}}', { today: g.today, doneToday: g.doneToday, revenueToday: sales(g.revenueToday) }) : t('Aaj koi appointment nahi')}
      to="/petshop/grooming"
      flush
    >
      <RowList empty={t('Aaj koi grooming book nahi')} emptyIcon={CalendarCheck}>
        {g.schedule.slice(0, 6).map((a) => {
          const st = STATUS[a.status] ?? STATUS.SCHEDULED;
          return (
            <ListRow
              key={a.id}
              to={`/petshop/grooming/${a.id}/edit`}
              leading={<IconBubble icon={PawPrint} tone={a.status === 'IN_PROGRESS' ? 'warning' : 'neutral'} />}
              title={`${a.petName} · ${a.petSpecies.toLowerCase()}`}
              meta={`${a.customerName} · ${a.scheduledSlot || timeOf(a.scheduledDate)}`}
              value={sales(a.totalFee)}
              valueHint={<Badge variant={st.variant} size="xs">{st.label}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function PetshopPickup() {
  const { grooming: g } = usePetshopOps();
  const { sales } = useMasked();
  return (
    <WidgetCard
      title={t('Pet lene aana hai')}
      icon={CheckCircle2}
      description={g.pickupCount ? t('{{pickupCount}} tayyar{{value}}', { pickupCount: g.pickupCount, value: g.pickupDue > 0 ? t(' · {{pickupDue}} baqi', { pickupDue: sales(g.pickupDue) }) : '' }) : t('Koi pet intezar me nahi')}
      to="/petshop/grooming?status=READY_FOR_PICKUP"
      flush
    >
      <RowList empty={t('Koi pet pickup ke liye nahi')} emptyIcon={CheckCircle2}>
        {g.pickup.slice(0, 6).map((a) => (
          <ListRow
            key={a.id}
            to={`/petshop/grooming/${a.id}/edit`}
            leading={<IconBubble icon={PawPrint} tone="success" />}
            title={a.petName}
            meta={`${a.customerName}${a.customerPhone ? ` · ${a.customerPhone}` : ''}`}
            value={sales(a.totalFee)}
            valueHint={a.balance > 0 ? <span className="font-medium text-rose-700">{t('baqi {{balance}}', { balance: sales(a.balance) })}</span> : undefined}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

export function PetshopHealth() {
  const { animals: a } = usePetshopOps();
  return (
    <WidgetCard
      title={t('Janwaron ki sehat')}
      icon={Heart}
      description={a.health.length ? t('{{count}} ki vaccine ya deworming baqi', { count: a.health.length }) : t('{{available}} janwar · sab theek', { available: a.available })}
      to="/petshop/live-animals"
      flush
    >
      <RowList empty={t('Sab janwaron ki vaccine aur deworming mukammal')} emptyIcon={Heart}>
        {a.health.slice(0, 6).map((x) => {
          const missing = [!x.isVaccinated && 'Vaccine', !x.isDewormed && 'Deworm'].filter(Boolean).join(' + ');
          return (
            <ListRow
              key={x.id}
              to={`/petshop/live-animals/${x.id}`}
              leading={<IconBubble icon={Activity} tone="warning" />}
              title={x.name || `${x.species.toLowerCase()} #${x.animalNumber}`}
              meta={[x.breed, x.status === 'RESERVED' ? 'reserve' : undefined].filter(Boolean).join(' · ') || undefined}
              value={<Badge variant="warning" size="xs">{missing || t('Check')}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function PetshopMedicines() {
  const { medicines: m } = usePetshopOps();
  return (
    <WidgetCard
      title={t('Dawai ki expiry')}
      icon={Pill}
      description={m.expired ? t('{{expired}} expire ho chuki · {{expiring}} 90 din me', { expired: m.expired, expiring: m.expiring }) : t('{{expiring}} cheezein 90 din me', { expiring: m.expiring })}
      to="/petshop-products?filter=expiring"
      flush
    >
      <RowList empty={t('Koi dawai jald expire nahi ho rahi')} emptyIcon={Pill}>
        {m.list.slice(0, 6).map((p) => {
          const urgent = p.days !== null && p.days < 30;
          return (
            <ListRow
              key={p.id}
              to={p.productId ? `/petshop-products/${p.productId}` : '/petshop-products'}
              leading={<IconBubble icon={Pill} tone={urgent ? 'danger' : 'warning'} />}
              title={p.product?.name || p.brand || t('Dawai')}
              meta={p.batchNumber ? t('Batch {{batchNumber}}', { batchNumber: p.batchNumber }) : undefined}
              value={<Badge variant={urgent ? 'danger' : 'warning'} size="xs">{p.days === null ? '—' : t('{{days}} din', { days: p.days })}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

/** Live animals at asking price, as an extra money-map tile. */
export function usePetshopMoneyTiles(): MoneyTileProps[] {
  const { animals: a } = usePetshopOps();
  return [{
    key: 'petshop-animals', icon: PawPrint, tone: 'info', to: '/petshop/live-animals', label: t('Bikne wale janwar'),
    value: formatPKR(a.value), hint: t('{{available}} janwar{{value}}', { available: a.available, value: a.reserved ? t(' · {{reserved}} reserve', { reserved: a.reserved }) : '' }),
  }];
}
