/** Pet-shop-only dashboard widgets. */

import { Activity, CalendarCheck, CheckCircle2, Clock, Heart, PawPrint, Pill, Scissors, TrendingUp } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem, MoneyTileProps } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { usePetshopOps } from './usePetshopOps';

const STATUS: Record<string, { label: string; variant: 'default' | 'info' | 'warning' | 'success' | 'danger' }> = {
  SCHEDULED: { label: 'Booked', variant: 'default' },
  CONFIRMED: { label: 'Pakka', variant: 'info' },
  IN_PROGRESS: { label: 'Chal raha', variant: 'warning' },
  READY_FOR_PICKUP: { label: 'Tayyar', variant: 'success' },
  COMPLETED: { label: 'Mukammal', variant: 'success' },
  CANCELLED: { label: 'Cancel', variant: 'danger' },
  NO_SHOW: { label: 'Nahi aaya', variant: 'danger' },
};

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' });

/** Pet-shop headline numbers, offered next to the common ones. */
export const petshopKpis: KpiDef[] = [
  {
    id: 'petshop-grooming', label: 'Aaj grooming', icon: Scissors, tone: 'brand',
    useValue: () => {
      const { grooming: g, loading } = usePetshopOps();
      return { loading, to: '/petshop/grooming', value: g.today, hint: g.inProgress ? `${g.inProgress} chal raha` : `${g.waiting} intezar me` };
    },
  },
  {
    id: 'petshop-pickup', label: 'Pet lene aana hai', icon: CheckCircle2, tone: 'success',
    useValue: () => {
      const { grooming: g, loading } = usePetshopOps();
      const { sales } = useMasked();
      return {
        loading, to: '/petshop/grooming', value: g.pickupCount, alert: g.pickupCount > 0,
        hint: g.pickupDue > 0 ? `${sales(g.pickupDue)} lena baqi` : 'grooming tayyar',
      };
    },
  },
  {
    id: 'petshop-animals', label: 'Bikne wale janwar', icon: PawPrint, tone: 'info',
    useValue: () => {
      const { animals: a, loading } = usePetshopOps();
      const { sales } = useMasked();
      return { loading, to: '/petshop/live-animals', value: a.available, hint: a.reserved ? `${a.reserved} reserve · ${sales(a.value)}` : sales(a.value) };
    },
  },
  {
    id: 'petshop-health', label: 'Vaccine baqi', icon: Activity, tone: 'warning',
    useValue: () => {
      const { animals: a, loading } = usePetshopOps();
      return { loading, to: '/petshop/live-animals', value: a.health.length, alert: a.health.length > 0, hint: 'vaccine ya deworm' };
    },
  },
  {
    id: 'petshop-expiry', label: 'Dawai expiry', icon: Pill, tone: 'danger',
    useValue: () => {
      const { medicines: m, loading } = usePetshopOps();
      return {
        loading, to: '/petshop-products?filter=expiring', value: m.expiring, alert: m.expired > 0,
        hint: m.expired ? `${m.expired} expire ho chuki` : '90 din ke andar',
      };
    },
  },
  {
    id: 'petshop-animal-profit', label: 'Janwaron ka profit', icon: TrendingUp, tone: 'success', sensitive: true,
    useValue: () => {
      const { animals: a, loading } = usePetshopOps();
      const { cost } = useMasked();
      return { loading, to: '/petshop/live-animals', value: cost(a.monthProfit), hint: `is mahine ${a.monthSold} bike` };
    },
  },
];

export function usePetshopAttention(): AttentionItem[] {
  const { grooming, animals, medicines, loading } = usePetshopOps();
  const items: AttentionItem[] = [];
  if (loading) return items;

  if (medicines.expired) items.push({ icon: Pill, level: 'danger', text: `${medicines.expired} dawai expire ho chuki — shelf se foran hatayein`, to: '/petshop-products?filter=expired', cta: 'Dawai dekhein' });
  if (grooming.pickupCount) items.push({ icon: CheckCircle2, level: 'warning', text: `${grooming.pickupCount} pet tayyar hain — maalik ko call karein`, to: '/petshop/grooming?status=READY_FOR_PICKUP', cta: 'List dekhein' });
  if (animals.health.length) items.push({ icon: Activity, level: 'warning', text: `${animals.health.length} janwar ki vaccine ya deworming baqi hai`, to: '/petshop/live-animals', cta: 'Janwar dekhein' });
  if (medicines.within30) items.push({ icon: Clock, level: 'info', text: `${medicines.within30} dawai 30 din me expire hogi — discount ya wapas karein`, to: '/petshop-products?filter=expiring', cta: 'Dekhein' });
  if (grooming.waiting) items.push({ icon: Scissors, level: 'info', text: `Aaj ${grooming.waiting} grooming appointment baqi hain`, to: '/petshop/grooming', cta: 'Schedule dekhein' });
  return items;
}

export function PetshopGrooming() {
  const { grooming: g } = usePetshopOps();
  const { sales } = useMasked();
  return (
    <WidgetCard
      title="Aaj ki grooming"
      icon={Scissors}
      description={g.today ? `${g.today} appointment · ${g.doneToday} mukammal · ${sales(g.revenueToday)}` : 'Aaj koi appointment nahi'}
      to="/petshop/grooming"
      flush
    >
      <RowList empty="Aaj koi grooming book nahi" emptyIcon={CalendarCheck}>
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
      title="Pet lene aana hai"
      icon={CheckCircle2}
      description={g.pickupCount ? `${g.pickupCount} tayyar${g.pickupDue > 0 ? ` · ${sales(g.pickupDue)} baqi` : ''}` : 'Koi pet intezar me nahi'}
      to="/petshop/grooming?status=READY_FOR_PICKUP"
      flush
    >
      <RowList empty="Koi pet pickup ke liye nahi" emptyIcon={CheckCircle2}>
        {g.pickup.slice(0, 6).map((a) => (
          <ListRow
            key={a.id}
            to={`/petshop/grooming/${a.id}/edit`}
            leading={<IconBubble icon={PawPrint} tone="success" />}
            title={a.petName}
            meta={`${a.customerName}${a.customerPhone ? ` · ${a.customerPhone}` : ''}`}
            value={sales(a.totalFee)}
            valueHint={a.balance > 0 ? <span className="font-medium text-rose-700">baqi {sales(a.balance)}</span> : undefined}
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
      title="Janwaron ki sehat"
      icon={Heart}
      description={a.health.length ? `${a.health.length} ki vaccine ya deworming baqi` : `${a.available} janwar · sab theek`}
      to="/petshop/live-animals"
      flush
    >
      <RowList empty="Sab janwaron ki vaccine aur deworming mukammal" emptyIcon={Heart}>
        {a.health.slice(0, 6).map((x) => {
          const missing = [!x.isVaccinated && 'Vaccine', !x.isDewormed && 'Deworm'].filter(Boolean).join(' + ');
          return (
            <ListRow
              key={x.id}
              to={`/petshop/live-animals/${x.id}`}
              leading={<IconBubble icon={Activity} tone="warning" />}
              title={x.name || `${x.species.toLowerCase()} #${x.animalNumber}`}
              meta={[x.breed, x.status === 'RESERVED' ? 'reserve' : undefined].filter(Boolean).join(' · ') || undefined}
              value={<Badge variant="warning" size="xs">{missing || 'Check'}</Badge>}
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
      title="Dawai ki expiry"
      icon={Pill}
      description={m.expired ? `${m.expired} expire ho chuki · ${m.expiring} 90 din me` : `${m.expiring} cheezein 90 din me`}
      to="/petshop-products?filter=expiring"
      flush
    >
      <RowList empty="Koi dawai jald expire nahi ho rahi" emptyIcon={Pill}>
        {m.list.slice(0, 6).map((p) => {
          const urgent = p.days !== null && p.days < 30;
          return (
            <ListRow
              key={p.id}
              to={p.productId ? `/petshop-products/${p.productId}` : '/petshop-products'}
              leading={<IconBubble icon={Pill} tone={urgent ? 'danger' : 'warning'} />}
              title={p.product?.name || p.brand || 'Dawai'}
              meta={p.batchNumber ? `Batch ${p.batchNumber}` : undefined}
              value={<Badge variant={urgent ? 'danger' : 'warning'} size="xs">{p.days === null ? '—' : `${p.days} din`}</Badge>}
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
    key: 'petshop-animals', icon: PawPrint, tone: 'info', to: '/petshop/live-animals', label: 'Bikne wale janwar',
    value: formatPKR(a.value), hint: `${a.available} janwar${a.reserved ? ` · ${a.reserved} reserve` : ''}`,
  }];
}
