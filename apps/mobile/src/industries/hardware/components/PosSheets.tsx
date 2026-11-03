/**
 * Hardware counter parts, rendered by the shared counter through
 * PosIndustryConfig: quantity first for items with quantity rates or a paint
 * shade (Overlay), and the retail or contractor rate switch for the bill
 * (CartExtra). After a bill the counter offers a delivery challan.
 */

import { HardHat, Paintbrush, Store, Tags } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { create } from 'zustand';
import { qty, tierFor, type Tier } from '@nafaa/core/industries/hardware';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Chip, Input, Row, Segmented, Sheet, Text, useTheme } from '@/design';
import { useBill } from '@/modules/pos/engine/bill';
import { useCounter } from '@/modules/pos/engine/counter';
import { NumberInput } from '@/modules/inventory/components/fields';

export interface QtyRateResult { qty: number; price: number; tier: Tier | null; shade: string }
interface Ask { item: { id: string; name: string; unit: string; stock: number | null; tiers: Tier[]; baseRate: number; rateLabel: string; paint: boolean; startQty: number; onConfirm: (r: QtyRateResult) => void } | null }
export const useHardwareAsk = create<Ask>(() => ({ item: null }));
export const askQtyRate = (item: NonNullable<Ask['item']>) => useHardwareAsk.setState({ item });
const closeAsk = () => useHardwareAsk.setState({ item: null });

export function HardwareOverlay() {
  const item = useHardwareAsk((s) => s.item);
  if (!item) return null;
  return <QtyRateSheet item={item} />;
}

/** Quantity first: the rate for the typed quantity shows live (50 bags and up at the bulk rate) and a paint line can carry the tinted shade. */
function QtyRateSheet({ item }: { item: NonNullable<Ask['item']> }) {
  const th = useTheme();
  const [q, setQ] = useState<number | null>(item.startQty);
  const [shade, setShade] = useState('');
  useEffect(() => { setQ(item.startQty); setShade(''); }, [item]);
  const n = q ?? 0;
  const valid = n > 0;
  const tier = valid ? tierFor(item.tiers, n) : null;
  const cheaper = tier && tier.price < item.baseRate ? tier : null;
  const rate = cheaper ? cheaper.price : item.baseRate;
  const over = valid && item.stock != null && n > item.stock;
  return (
    <Sheet open onClose={closeAsk} title={item.name} description={t('{{rateLabel}}: {{baseRate}} / {{unit}}{{stock}}', { rateLabel: item.rateLabel, baseRate: formatMoney(item.baseRate), unit: item.unit, stock: item.stock != null ? ` · ${t('stock {{stock}}', { stock: qty(item.stock) })}` : '' })}
      footer={<Button fullWidth size="lg" disabled={!valid} onPress={() => { closeAsk(); item.onConfirm({ qty: n, price: rate, tier: cheaper, shade: shade.trim() }); }}>{t('Bill me dalein · {{amount}}', { amount: formatMoney(valid ? n * rate : 0) })}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <NumberInput label={t('Kitna ({{unit}})', { unit: item.unit })} value={q} onChangeValue={setQ} size="xl" error={over ? t('Stock {{stock}} hai — zyada bechne ki ijazat Settings se hai', { stock: qty(item.stock) }) : undefined} />
        {item.tiers.length > 0 && (
          <View style={{ gap: 6 }}>
            <Row gap={1.5}><Tags size={14} color={th.colors.success.text} /><Text size="sm" weight="semibold" tone="secondary">{t('Quantity rate')}</Text></Row>
            <Row gap={2} wrap>
              {item.tiers.map((x) => <Chip key={x.id} selected={cheaper?.id === x.id} label={`${qty(x.minQuantity)}+ · ${formatMoney(x.price)}`} onPress={() => setQ(x.minQuantity)} />)}
            </Row>
          </View>
        )}
        {item.paint && (
          <Input label={t('Shade (tinting) — marzi')} value={shade} onChangeText={setShade} placeholder={t('Code ya naam: 1234 Sky blue')} icon={Paintbrush} />
        )}
        <Text size="sm">{t('Rate:')} <Text size="sm" weight="bold" ltr>{formatMoney(rate)}</Text> / {item.unit}{cheaper ? ` · ${t('({{minQuantity}}+ wala rate{{value}})', { minQuantity: qty(cheaper.minQuantity), value: cheaper.label ? ` · ${cheaper.label}` : '' })}` : ''}</Text>
      </View>
    </Sheet>
  );
}

/** Retail or contractor (wholesale) rate for the items added next. With shop-wide price tiers on, the bill's tier bar replaces this switch. */
export function CounterRate() {
  const counter = useCounter();
  const tier = useBill((s) => s.tier);
  const setTier = useBill((s) => s.setTier);
  if (counter.parts.priceTiers) return null;
  const mode = tier === 'WHOLESALE' ? 'wholesale' : 'retail';
  return (
    <View style={{ gap: 6 }}>
      <Segmented size="sm" value={mode} onChange={(v) => setTier(v === 'wholesale' ? 'WHOLESALE' : 'RETAIL')}
        options={[{ value: 'retail', label: t('Retail rate'), icon: Store }, { value: 'wholesale', label: t('Thekedar rate'), icon: HardHat }]} />
      {mode === 'wholesale' && <Text size="xs" tone="warning">{t('Bill ki lines par wholesale rate lag gaya (jahan rate likha hai). Bill ke baad wapas retail.')}</Text>}
    </View>
  );
}
