/** Period chips (Today … This year, Custom) with a two-day picker sheet, and an optional branch row. */

import { CalendarRange } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { useAuthStore } from '@/core/auth/store';
import { useShops } from '@/core/auth/useShops';
import { isAllShops } from '@/core/auth/shopScope';
import { Button, ChipGroup, DatePicker, Sheet, Text, useTheme } from '@/design';
import { PERIOD_PRESETS, dateOfKey, localKey, shortKey, type PeriodPreset, type PeriodState } from '../lib/period';

export function PeriodBar({ state, presets, allowAll = false }: { state: PeriodState; presets?: PeriodPreset[]; allowAll?: boolean }) {
  const th = useTheme();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<Date>(dateOfKey(state.period.from === 'all' ? state.today : state.period.from));
  const [to, setTo] = useState<Date>(dateOfKey(state.period.to));
  const list = PERIOD_PRESETS.filter((p) => (presets ? presets.includes(p.value) : allowAll || p.value !== 'all'));
  const options = [
    ...list.map((p) => ({ value: p.value, label: t(p.label) })),
    { value: 'custom' as PeriodPreset, label: state.preset === 'custom' ? `${shortKey(state.period.from)} – ${shortKey(state.period.to)}` : t('Custom'), icon: CalendarRange },
  ];
  return (
    <View>
      <ChipGroup
        options={options}
        value={state.preset}
        onChange={(v) => { if (v === 'custom') setOpen(true); else state.setPreset(v); }}
      />
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t('Custom period')}
        footer={<Button fullWidth onPress={() => {
          const a = localKey(from); const b = localKey(to);
          state.setCustom(a <= b ? { from: a, to: b } : { from: b, to: a });
          state.setPreset('custom');
          setOpen(false);
        }}>{t('Apply')}</Button>}
      >
        <View style={{ gap: th.space(3) }}>
          <DatePicker label={t('From')} value={from} onChange={setFrom} maximumDate={new Date()} />
          <DatePicker label={t('To')} value={to} onChange={setTo} maximumDate={new Date()} />
        </View>
      </Sheet>
    </View>
  );
}

/** Branch filter for the owner's all-branches view; renders nothing for single-branch users. */
export function BranchBar({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const all = useAuthStore((s) => isAllShops(s.currentShopId));
  const shops = useShops();
  const list = (shops.data ?? []).filter((s) => s.isActive !== false);
  if (!all || list.length < 2) return null;
  return (
    <View style={{ gap: 4 }}>
      <Text size="xs" tone="muted" weight="medium">{t('Branch')}</Text>
      <ChipGroup value={value} onChange={onChange} options={[{ value: '', label: t('All branches') }, ...list.map((s) => ({ value: s.id, label: s.name }))]} />
    </View>
  );
}
