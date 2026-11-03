/**
 * The questions an item can need before it goes on the bill: which pack
 * (piece, dozen, carton), which size/colour, how much by weight or by money,
 * and the rate of an item without a price. One host renders whichever the
 * counter asked for.
 */

import { Scale } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { keypad, unitKeyOf, type PosUnitOption } from '@nafaa/core/pos';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Badge, Button, Icon, PressableScale, Row, Segmented, Sheet, Text, useTheme } from '@/design';
import { closePicker, unitsOf, usePos, usePosUi, type Picker } from '../engine/usePos';
import { Keypad } from './parts';

export function PickerHost() {
  const picker = usePosUi((s) => s.picker);
  return (
    <>
      <UnitSheet picker={picker?.kind === 'unit' ? picker : null} />
      <VariantSheet picker={picker?.kind === 'variant' ? picker : null} />
      <WeighSheet picker={picker?.kind === 'weigh' ? picker : null} />
      <PriceSheet picker={picker?.kind === 'price' ? picker : null} />
    </>
  );
}

function UnitSheet({ picker }: { picker: Extract<Picker, { kind: 'unit' }> | null }) {
  const th = useTheme();
  const api = usePos();
  const [last, setLast] = useState(picker);
  useEffect(() => { if (picker) setLast(picker); }, [picker]);
  const p = picker ?? last;
  return (
    <Sheet open={!!picker} onClose={closePicker} title={p?.product.name} description={t('Which unit?')}>
      <View style={{ gap: th.space(2) }}>
        {p?.units.map((u) => (
          <PressableScale key={u.id} haptic="tap" onPress={() => { closePicker(); api.place(p.product, u, p.opts); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), minHeight: 60, paddingHorizontal: th.space(4), borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.border, backgroundColor: th.colors.surface }}>
            <Text size="xl">{u.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text weight="bold">{u.label}</Text>
              {u.conversionRate !== 1 && <Text size="xs" tone="muted">{t('{{n}} {{unit}} each', { n: u.conversionRate, unit: p.product.unit })}</Text>}
            </View>
            <Amount value={u.price} weight="bold" />
          </PressableScale>
        ))}
      </View>
    </Sheet>
  );
}

function VariantSheet({ picker }: { picker: Extract<Picker, { kind: 'variant' }> | null }) {
  const th = useTheme();
  const api = usePos();
  const [last, setLast] = useState(picker);
  useEffect(() => { if (picker) setLast(picker); }, [picker]);
  const p = picker ?? last;
  const neg = api.counter.rules.negativeStock;
  return (
    <Sheet open={!!picker} onClose={closePicker} title={p?.product.name} description={t('Pick the size or colour')}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
        {p?.product.variants.map((v) => {
          const out = !neg && v.stock != null && v.stock <= 0;
          return (
            <PressableScale key={v.id} haptic="tap" disabled={out}
              onPress={() => { closePicker(); void api.addProduct(p.product.id, { ...p.opts, variant: { id: v.id, name: v.name, price: v.price, wholesalePrice: v.wholesalePrice, creditPrice: v.creditPrice, stock: v.stock } }); }}
              style={{ width: '48.5%', padding: th.space(3), borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.border, backgroundColor: th.colors.surface, opacity: out ? 0.45 : 1, gap: 2 }}>
              <Text weight="bold" numberOfLines={2}>{v.name}</Text>
              <Row justify="between">
                <Amount value={v.price || p.product.price} size="sm" weight="semibold" />
                {v.stock != null && <Badge tone={out ? 'danger' : 'neutral'} size="sm">{out ? t('Out') : String(Number(v.stock.toFixed(2)))}</Badge>}
              </Row>
            </PressableScale>
          );
        })}
      </View>
    </Sheet>
  );
}

/** Weight sale: by weight, or by money ("Rs 200 ka"). */
function WeighSheet({ picker }: { picker: Extract<Picker, { kind: 'weigh' }> | null }) {
  const th = useTheme();
  const api = usePos();
  const [last, setLast] = useState(picker);
  const [by, setBy] = useState<'qty' | 'money'>('qty');
  const [value, setValue] = useState('');
  useEffect(() => { if (picker) { setLast(picker); setValue(''); setBy('qty'); } }, [picker]);
  const p = picker ?? last;
  if (!p) return null;
  const unit: PosUnitOption = p.unit;
  const price = unit.price;
  const n = Number(value) || 0;
  const qty = by === 'qty' ? n : price > 0 ? Number((n / price).toFixed(3)) : 0;
  const money = by === 'qty' ? n * price : n;
  const quick = unitKeyOf(unit.unitName) === 'gram' || unitKeyOf(unit.unitName) === 'ml' ? [100, 250, 500, 1000] : [0.25, 0.5, 1, 2];
  const done = () => {
    if (!(qty > 0)) return;
    closePicker();
    api.push(p.product, unit, qty, p.opts);
  };
  return (
    <Sheet open={!!picker} onClose={closePicker} title={p.product.name} description={t('{{price}} per {{unit}}', { price: formatMoney(price), unit: unit.unitName })}
      footer={<Button size="xl" fullWidth disabled={!(qty > 0)} onPress={done}>{qty > 0 ? t('Add {{qty}} {{unit}} · {{amount}}', { qty, unit: unit.unitName, amount: formatMoney(money) }) : t('Enter the weight')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Segmented options={[{ value: 'qty', label: t('By weight') }, { value: 'money', label: t('By money') }]} value={by} onChange={(v) => { setBy(v); setValue(''); }} />
        <Row justify="between" style={{ padding: th.space(3), borderRadius: th.radius('xl'), backgroundColor: th.colors.surfaceSunken }}>
          <Icon icon={Scale} tone="muted" size={28} />
          <Text size="3xl" weight="bold" ltr tabular tone={value ? 'default' : 'subtle'}>{by === 'qty' ? `${value || '0'} ${unit.unitName}` : `Rs ${value || '0'}`}</Text>
        </Row>
        {by === 'qty' && (
          <Row gap={2}>
            {quick.map((q) => (
              <PressableScale key={q} onPress={() => setValue(String(q))} haptic="tap" style={{ flex: 1, minHeight: 44, borderRadius: th.radius('lg'), alignItems: 'center', justifyContent: 'center', backgroundColor: th.colors.brand.soft }}>
                <Text weight="semibold" ltr color={th.colors.brand.text}>{q}</Text>
              </PressableScale>
            ))}
          </Row>
        )}
        <Keypad decimal onKey={(k) => setValue((v) => keypad(v, k))} />
      </View>
    </Sheet>
  );
}

/** Open price: the rate of an item that has none, typed at the counter. */
function PriceSheet({ picker }: { picker: Extract<Picker, { kind: 'price' }> | null }) {
  const th = useTheme();
  const api = usePos();
  const [last, setLast] = useState(picker);
  const [value, setValue] = useState('');
  useEffect(() => { if (picker) { setLast(picker); setValue(''); } }, [picker]);
  const p = picker ?? last;
  if (!p) return null;
  const price = Number(value) || 0;
  const done = () => {
    if (!(price > 0)) return;
    closePicker();
    const units = unitsOf(p.product, p.opts.variant?.id);
    void api.addProduct(p.product.id, { ...p.opts, unit: p.opts.unit ?? units[0], price });
  };
  return (
    <Sheet open={!!picker} onClose={closePicker} title={p.product.name} description={t('This item has no price. Enter the rate for this bill.')}
      footer={<Button size="xl" fullWidth disabled={!(price > 0)} onPress={done}>{t('Add at {{amount}}', { amount: formatMoney(price) })}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <View style={{ padding: th.space(3), borderRadius: th.radius('xl'), backgroundColor: th.colors.surfaceSunken, alignItems: 'flex-end' }}>
          <Text size="3xl" weight="bold" ltr tabular tone={value ? 'default' : 'subtle'}>{`Rs ${value || '0'}`}</Text>
        </View>
        <Keypad decimal onKey={(k) => setValue((v) => keypad(v, k))} />
      </View>
    </Sheet>
  );
}
