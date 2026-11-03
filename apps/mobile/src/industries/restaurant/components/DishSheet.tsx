/**
 * Dish options before it goes on the order (web RestaurantModifierPicker):
 * size, add-ons, removals and spice, each group with its own min/max, plus
 * a note for the kitchen. Required groups must be filled; defaults are
 * pre-ticked. Price math is in @nafaa/core/restaurant.
 */

import { Check } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { defaultPicks, groupNeed, missingChoice, pickedModifiers, togglePick, unitPrice, type DishSize, type PickedModifier } from '@nafaa/core/restaurant';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { Amount, Button, Chip, Icon, Input, PressableScale, Row, Sheet, Text, useTheme } from '@/design';
import { Stepper } from '@/modules/pos/components/parts';
import type { MenuEntry } from '../menu';

export interface PickedDish { quantity: number; size?: DishSize; modifiers: PickedModifier[]; note: string }

export const KITCHEN_NOTES = [msg('Kam mirch'), msg('Zyada mirch'), msg('Kam tel'), msg('Pyaz ke bagair'), msg('Jaldi'), msg('Alag pack')];

export function DishSheet({ item, onConfirm, onClose }: { item: MenuEntry | null; onConfirm: (d: PickedDish) => void; onClose: () => void }) {
  const th = useTheme();
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState<DishSize | undefined>();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!item) return;
    setPicked(defaultPicks(item.groups));
    setQty(1);
    setSize(item.sizes.length === 1 ? item.sizes[0] : undefined);
    setNote('');
  }, [item]);

  const missing = item ? missingChoice(item, size, picked) : null;
  const mods = useMemo(() => (item ? pickedModifiers(item.groups, picked) : []), [item, picked]);
  const unit = item ? unitPrice(item.price, size, mods) : 0;
  const missingName = missing === 'size' ? t('Size') : item?.groups.find((g) => g.id === missing)?.name;

  const option = (on: boolean, label: string, price: number | null, onPress: () => void, key: string) => (
    <PressableScale key={key} onPress={onPress} haptic="select" accessibilityRole="checkbox" accessibilityState={{ checked: on }}
      style={{ width: '48.5%', minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: th.space(2), paddingHorizontal: th.space(3), borderRadius: th.radius('lg'),
        borderWidth: on ? 2 : 1, borderColor: on ? th.colors.brand.solid : th.colors.border, backgroundColor: on ? th.colors.brand.soft : th.colors.surface }}>
      <View style={{ width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? th.colors.brand.solid : 'transparent', borderWidth: on ? 0 : 1, borderColor: th.colors.borderStrong }}>
        {on && <Icon icon={Check} size={14} color={th.colors.brand.onSolid} />}
      </View>
      <Text size="sm" weight="medium" numberOfLines={2} style={{ flex: 1 }}>{label}</Text>
      {price != null && price !== 0 && <Text size="xs" weight="semibold" tone="secondary" ltr>{`${price > 0 ? '+' : ''}${formatMoney(price)}`}</Text>}
    </PressableScale>
  );

  return (
    <Sheet open={!!item} onClose={onClose} height={0.9}
      title={item?.name}
      description={item ? t('{{price}} · options chunein', { price: formatMoney(item.price) }) : undefined}
      footer={item ? (
        <Row gap={3}>
          <Stepper value={qty} onMinus={() => setQty((q) => Math.max(1, q - 1))} onPlus={() => setQty((q) => Math.min(99, q + 1))} />
          <Button size="lg" style={{ flex: 1 }} disabled={!!missing}
            onPress={() => onConfirm({ quantity: qty, size, note: note.trim(), modifiers: mods })}>
            {missing ? t('"{{name}}" chunein', { name: missingName ?? '' }) : t('Order me daalein · {{formatPKR}}', { formatPKR: formatMoney(unit * qty) })}
          </Button>
        </Row>
      ) : undefined}>
      {item && (
        <View style={{ gap: th.space(5) }}>
          {item.sizes.length > 0 && (
            <View style={{ gap: th.space(2) }}>
              <Row justify="between"><Text weight="semibold">{t('Size')}</Text><Text size="xs" weight={size ? 'regular' : 'semibold'} color={size ? th.colors.textMuted : th.colors.danger.text}>{t('Zaroori · ek')}</Text></Row>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
                {item.sizes.map((z) => option(size?.id === z.id, z.name, null, () => setSize(z), z.id))}
              </View>
              {size && <Row gap={1}><Text size="xs" tone="muted">{size.name}</Text><Amount value={size.price} size="xs" tone="muted" /></Row>}
            </View>
          )}
          {item.groups.map((g) => {
            const sel = picked[g.id] ?? [];
            const need = groupNeed(g);
            const hint = need > 0 ? t('Zaroori · {{value}}', { value: need === g.maxSelections ? need : `${need}–${g.maxSelections}` }) : g.maxSelections > 1 ? t('{{maxSelections}} tak', { maxSelections: g.maxSelections }) : t('Marzi');
            return (
              <View key={g.id} style={{ gap: th.space(2) }}>
                <Row justify="between"><Text weight="semibold">{g.name}</Text><Text size="xs" weight={sel.length < need ? 'semibold' : 'regular'} color={sel.length < need ? th.colors.danger.text : th.colors.textMuted}>{hint}</Text></Row>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
                  {g.options.map((o) => option(sel.includes(o.id), o.name, o.priceAdjustment, () => setPicked((p) => togglePick(p, g, o.id)), o.id))}
                </View>
              </View>
            );
          })}
          <View style={{ gap: th.space(2) }}>
            <Text weight="semibold">{t('Kitchen ke liye note')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(1.5) }}>
              {KITCHEN_NOTES.map((n) => <Chip key={n} label={t(n)} onPress={() => setNote((v) => (v.includes(t(n)) ? v : v ? `${v}, ${t(n)}` : t(n)))} />)}
            </View>
            <Input value={note} onChangeText={(v) => setNote(v.slice(0, 300))} placeholder={t('Jaise: kam mirch, alag pack')} />
          </View>
        </View>
      )}
    </Sheet>
  );
}
