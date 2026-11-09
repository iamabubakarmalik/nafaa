/**
 * Order lines for Add order and Edit order: pick a Nafaa product (search,
 * size), change qty and price, remove; lines not linked to a product can be
 * linked with one tap. Totals show subtotal − Discount + delivery.
 */

import { useState } from 'react';
import { View } from 'react-native';
import { Link2, Minus, Plus, Trash2 } from 'lucide-react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Badge, Button, Card, IconButton, MoneyInput, Sheet, Text, useTheme } from '@/design';
import { ProductPicker, type PickedProduct } from '../ProductPicker';

export interface ItemLine { key: string; productId: string | null; variantId?: string | null; name: string; quantity: number; price: number; sku?: string; variant?: string; image?: string }

let seq = 0;
export const lineKey = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;
export const subtotalOf = (items: ItemLine[]) => items.reduce((a, i) => a + i.quantity * i.price, 0);

export function ItemsEditor({ items, onChange, disabled }: { items: ItemLine[]; onChange: (items: ItemLine[]) => void; disabled?: boolean }) {
  const th = useTheme();
  // null = closed, 'new' = add a line, else the key of the line to link.
  const [pick, setPick] = useState<string | null>(null);
  const linking = pick && pick !== 'new' ? items.find((i) => i.key === pick) : undefined;
  const set = (key: string, patch: Partial<ItemLine>) => onChange(items.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  const picked = (p: PickedProduct) => {
    if (linking) set(linking.key, { productId: p.productId, variantId: p.variantId, name: p.label, price: linking.price || p.price });
    else {
      const same = items.find((i) => i.productId === p.productId && (i.variantId ?? null) === (p.variantId ?? null));
      if (same) set(same.key, { quantity: same.quantity + 1 });
      else onChange([...items, { key: lineKey(), productId: p.productId, variantId: p.variantId, name: p.label, quantity: 1, price: p.price }]);
    }
    setPick(null);
  };

  return (
    <View style={{ gap: th.space(2) }}>
      {items.map((i) => (
        <Card key={i.key}>
          <View style={{ gap: th.space(2) }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: th.space(2) }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text size="sm" weight="semibold">{i.name}</Text>
                {!i.productId && <Badge tone="warning" icon={Link2}>{t('Nafaa product se nahi jura')}</Badge>}
              </View>
              {!disabled && <IconButton icon={Trash2} label={t('Hatayein')} size="sm" onPress={() => onChange(items.filter((x) => x.key !== i.key))} />}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: th.space(2) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1) }}>
                <IconButton icon={Minus} label={t('Kam')} size="sm" variant="secondary" disabled={disabled || i.quantity <= 1} onPress={() => set(i.key, { quantity: Math.max(1, i.quantity - 1) })} />
                <Text size="base" weight="bold" ltr style={{ minWidth: 28, textAlign: 'center' }}>{i.quantity}</Text>
                <IconButton icon={Plus} label={t('Zyada')} size="sm" variant="secondary" disabled={disabled} onPress={() => set(i.key, { quantity: i.quantity + 1 })} />
              </View>
              <MoneyInput containerStyle={{ flex: 1 }} value={i.price} onChangeValue={(v) => set(i.key, { price: v ?? 0 })} disabled={disabled} />
              <Amount value={i.quantity * i.price} weight="bold" size="sm" />
            </View>
            {!i.productId && !disabled && <Button size="sm" variant="secondary" icon={Link2} onPress={() => setPick(i.key)}>{t('Product se jorein')}</Button>}
          </View>
        </Card>
      ))}
      {!disabled && <Button variant="secondary" icon={Plus} onPress={() => setPick('new')}>{t('Cheez jorein')}</Button>}
      <Sheet open={!!pick} onClose={() => setPick(null)} title={linking ? t('"{{name}}" kis product ka hai?', { name: linking.name }) : t('Cheez jorein')}>
        {!!pick && <ProductPicker initial={linking?.name ?? ''} onPick={picked} />}
      </Sheet>
    </View>
  );
}

/** Subtotal, Discount, delivery and total as rows. */
export function TotalsBox({ subtotal, discount, deliveryFee }: { subtotal: number; discount: number; deliveryFee: number }) {
  const th = useTheme();
  const row = (label: string, value: string, bold?: boolean) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text size="sm" tone={bold ? 'default' : 'secondary'} weight={bold ? 'bold' : 'regular'}>{label}</Text>
      <Text size="sm" weight={bold ? 'bold' : 'medium'} ltr>{value}</Text>
    </View>
  );
  return (
    <View style={{ gap: th.space(1.5) }}>
      {row(t('Cheezon ka total'), formatMoney(subtotal))}
      {discount > 0 && row(t('Discount'), `− ${formatMoney(discount)}`)}
      {deliveryFee > 0 && row(t('Delivery'), formatMoney(deliveryFee))}
      {row(t('Total'), formatMoney(Math.max(0, subtotal - discount + deliveryFee)), true)}
    </View>
  );
}
