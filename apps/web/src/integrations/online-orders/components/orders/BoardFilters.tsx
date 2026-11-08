/**
 * Filter bar of the orders board: search (order, phone, CN), date range,
 * channel, courier, city, assigned to, payment, confirmation and tag, with
 * the applied filters as removable chips.
 */

import { forwardRef } from 'react';
import { Globe, MapPin, PhoneCall, Tag, Truck, UserRound, Wallet } from 'lucide-react';
import { DateRangeMenu, FilterBar, FilterChip, FilterMenu, SearchField, type DateRangeValue, type FilterOption } from '@/design-system/components';
import { brandForChannel, brandLabel } from '@/assets/brands/BrandLogo';
import type { CourierAccount, SalesChannel } from '../../api/online-orders.api';
import { brandIcon } from '../../lib/labels';
import { t } from '@core/i18n';

export type Pay = '' | 'COD' | 'PAID';
export type Confirm = '' | 'CONFIRMED' | 'NO_ANSWER' | 'REFUSED' | 'NONE';

export interface BoardFilterState {
  pay: Pay;
  confirm: Confirm;
  courier: string;
  city: string;
  /** '' | 'me' | 'none' | user id */
  assigned: string;
  tag: string;
}

export const EMPTY_FILTERS: BoardFilterState = { pay: '', confirm: '', courier: '', city: '', assigned: '', tag: '' };

export const CONFIRM_OPTIONS: Array<FilterOption<Confirm>> = [
  { value: '', label: t('Sab') },
  { value: 'NONE', label: t('Abhi poocha nahi'), hint: t('Confirm karwana baqi') },
  { value: 'CONFIRMED', label: t('Confirm ho gaya'), hint: t('Customer ne haan kaha') },
  { value: 'NO_ANSWER', label: t('Jawab nahi'), hint: t('Dobara koshish karein') },
  { value: 'REFUSED', label: t('Mana kiya') },
];

export const hasBoardFilters = (f: BoardFilterState) => Object.values(f).some(Boolean);

export const BoardFilters = forwardRef<HTMLInputElement, {
  search: string;
  onSearch: (v: string) => void;
  query: string;
  range: DateRangeValue;
  onRange: (v: DateRangeValue) => void;
  startHour: number;
  channels: SalesChannel[];
  channelId?: string;
  onChannel: (id: string | null) => void;
  couriers: CourierAccount[];
  cities: string[];
  tags: string[];
  team: Array<{ id: string; fullName: string }>;
  value: BoardFilterState;
  onChange: (v: BoardFilterState) => void;
  onClear: () => void;
}>(function BoardFilters(p, ref) {
  const f = p.value;
  const set = <K extends keyof BoardFilterState>(k: K, v: BoardFilterState[K]) => p.onChange({ ...f, [k]: v });
  const teamName = (id: string) => (id === 'me' ? t('Mere orders') : id === 'none' ? t('Kisi ke paas nahi') : p.team.find((m) => m.id === id)?.fullName ?? id);
  const chips = hasBoardFilters(f) || !!p.query;

  return (
    <FilterBar
      search={<SearchField ref={ref} value={p.search} onChange={p.onSearch} placeholder={t('Order #, naam, phone ya CN…')} label={t('Order search')} />}
      chips={chips ? <>
        {f.pay && <FilterChip onRemove={() => set('pay', '')}>{f.pay === 'COD' ? t('Sirf COD') : t('Sirf paid')}</FilterChip>}
        {f.confirm && <FilterChip onRemove={() => set('confirm', '')}>{CONFIRM_OPTIONS.find((c) => c.value === f.confirm)?.label}</FilterChip>}
        {f.courier && <FilterChip onRemove={() => set('courier', '')}>{p.couriers.find((c) => c.code === f.courier)?.name ?? f.courier}</FilterChip>}
        {f.city && <FilterChip onRemove={() => set('city', '')}>{f.city}</FilterChip>}
        {f.assigned && <FilterChip onRemove={() => set('assigned', '')}>{teamName(f.assigned)}</FilterChip>}
        {f.tag && <FilterChip onRemove={() => set('tag', '')}>{t('Tag: {{tag}}', { tag: f.tag })}</FilterChip>}
        {p.query && <FilterChip onRemove={() => p.onSearch('')}>{t('"{{query}}" · har date', { query: p.query })}</FilterChip>}
      </> : undefined}
      onClear={p.onClear}>
      <DateRangeMenu value={p.range} onChange={p.onRange} startHour={p.startHour} defaultPreset="month" />
      {p.channels.length > 1 && (
        <FilterMenu icon={Globe} label={t('Channel')} value={p.channelId ?? ''} active={!!p.channelId} width="w-72" onChange={(v) => p.onChannel(v || null)}
          options={[{ value: '', label: t('Sab channels') }, ...p.channels.map((ch) => ({
            value: ch.id, label: ch.displayName, icon: brandIcon(brandForChannel(ch.type, { platform: ch.platform })),
            hint: ch.pendingOrders ? t('{{pendingOrders}} naye', { pendingOrders: ch.pendingOrders }) : brandLabel(brandForChannel(ch.type, { platform: ch.platform })),
          }))]} />
      )}
      {p.couriers.length > 0 && (
        <FilterMenu icon={Truck} label={t('Courier')} value={f.courier} active={!!f.courier} onChange={(v) => set('courier', v)}
          options={[{ value: '', label: t('Sab couriers') }, ...p.couriers.map((c) => ({ value: c.code, label: c.name }))]} />
      )}
      {p.cities.length > 0 && (
        <FilterMenu icon={MapPin} label={t('Shehar')} value={f.city} active={!!f.city} onChange={(v) => set('city', v)}
          options={[{ value: '', label: t('Sab shehar') }, ...p.cities.map((c) => ({ value: c, label: c }))]} />
      )}
      <FilterMenu icon={UserRound} label={t('Kis ke zimme')} value={f.assigned} active={!!f.assigned} onChange={(v) => set('assigned', v)}
        options={[{ value: '', label: t('Sab') }, { value: 'me', label: t('Mere orders') }, { value: 'none', label: t('Kisi ke paas nahi') }, ...p.team.map((m) => ({ value: m.id, label: m.fullName }))]} />
      <FilterMenu icon={Wallet} label={t('Paisa')} value={f.pay} active={!!f.pay} onChange={(v) => set('pay', v)} align="right"
        options={[{ value: '' as Pay, label: t('Sab') }, { value: 'COD', label: t('Sirf COD'), hint: t('Delivery par cash') }, { value: 'PAID', label: t('Sirf paid'), hint: t('Paisa mil chuka') }]} />
      <FilterMenu icon={PhoneCall} label={t('Confirm')} value={f.confirm} active={!!f.confirm} onChange={(v) => set('confirm', v)} align="right" options={CONFIRM_OPTIONS} />
      {p.tags.length > 0 && (
        <FilterMenu icon={Tag} label={t('Tag')} value={f.tag} active={!!f.tag} onChange={(v) => set('tag', v)} align="right"
          options={[{ value: '', label: t('Sab') }, ...p.tags.map((x) => ({ value: x, label: x }))]} />
      )}
    </FilterBar>
  );
});
