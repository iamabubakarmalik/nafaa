/**
 * Rates of one item on a price list: one box per pack (empty = the list's
 * rule), and the quantity breaks (a lower rate from N packs).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, Chip, Input, Row, Select, Sheet, Text, toast, useTheme } from '@/design';
import { DIST_KEY, distSetupApi, type PriceGridRow, type PriceList, type PriceListItemRow } from '../api/distribution.api';
import { rs } from '../lib/meta';
import { digits, num } from '../lib/setup';

export const keyOf = (productId: string, unitId: string | null) => `${productId}|${unitId ?? ''}`;

export function PriceRatesSheet({ list, product, draft, breaks, canManage, onClose, onApply }: {
  list: PriceList;
  product: { productId: string; name: string; rows: PriceGridRow[] };
  draft: Record<string, string>;
  breaks: Map<string, PriceListItemRow[]>;
  canManage: boolean;
  onClose: () => void;
  onApply: (changes: Record<string, string | null>) => void;
}) {
  const th = useTheme();
  const qc = useQueryClient();
  const packs = product.rows;
  const original = (r: PriceGridRow) => (r.listPrice != null ? String(r.listPrice) : '');
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(packs.map((r) => {
    const k = keyOf(product.productId, r.unitId);
    return [k, draft[k] ?? original(r)];
  })));
  const [unit, setUnit] = useState(packs[packs.length - 1]?.unitId ?? '');
  const [minQty, setMinQty] = useState('');
  const [price, setPrice] = useState('');
  const row = packs.find((r) => (r.unitId ?? '') === unit) ?? packs[0];
  const bq = num(minQty);
  const bp = num(price);
  const okBreak = bq != null && bq > 0 && bp != null && bp > 0;

  const addBreak = useMutation({
    mutationFn: () => distSetupApi.savePriceItems(list.id, [{ productId: product.productId, unitId: unit || null, price: bp!, minQty: bq! }]),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [DIST_KEY, 'price-items', list.id] });
      void qc.invalidateQueries({ queryKey: [DIST_KEY, 'price-lists'] });
      toast.success(t('Qty ka rate save ho gaya'));
      setMinQty(''); setPrice('');
    },
  });
  const removeBreak = useMutation({
    mutationFn: (id: string) => distSetupApi.removePriceItems(list.id, [id]),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [DIST_KEY, 'price-items', list.id] });
      void qc.invalidateQueries({ queryKey: [DIST_KEY, 'price-lists'] });
    },
  });

  const apply = () => {
    const out: Record<string, string | null> = {};
    for (const r of packs) {
      const k = keyOf(product.productId, r.unitId);
      out[k] = (vals[k] ?? '') === original(r) ? null : (vals[k] ?? '');
    }
    onApply(out);
    onClose();
  };

  const allBreaks = packs.flatMap((r) => (breaks.get(keyOf(product.productId, r.unitId)) ?? []).map((b) => ({ b, r })));

  return (
    <Sheet open onClose={onClose} height={0.9} title={product.name} description={t('Khali chhorein to list ka rule lagega')}
      footer={canManage ? <Button fullWidth onPress={apply}>{t('Theek hai')}</Button> : undefined}>
      <View style={{ gap: th.space(4) }}>
        {packs.map((r) => {
          const k = keyOf(product.productId, r.unitId);
          const v = num(vals[k] ?? '');
          const below = v != null && r.cost != null && v < r.cost;
          const hint = [t('Retail {{v}}', { v: rs(r.retail) }), r.wholesale != null ? t('Wholesale {{v}}', { v: rs(r.wholesale) }) : null, r.cost != null ? t('Cost {{v}}', { v: rs(r.cost) }) : null].filter(Boolean).join(' · ');
          return (
            <Input
              key={k} ltr disabled={!canManage}
              label={r.conversionRate > 1 ? `${r.unitName} (${r.conversionRate})` : r.unitName}
              value={vals[k] ?? ''} onChangeText={(x) => setVals((s) => ({ ...s, [k]: digits(x) }))}
              keyboardType="decimal-pad" prefix="Rs" placeholder={`${t('Rule')} ${rs(r.rulePrice)}`}
              hint={hint} error={below ? t('Cost se kam') : undefined}
            />
          );
        })}

        {allBreaks.length > 0 && (
          <View style={{ gap: th.space(2) }}>
            <Text size="sm" weight="semibold">{t('Zyada qty ka rate')}</Text>
            <Row gap={2} wrap>
              {allBreaks.map(({ b }) => (
                <Chip key={b.id} icon={canManage ? X : undefined} label={`${Number(b.minQty)}+ · ${rs(b.price)}`} onPress={canManage ? () => removeBreak.mutate(b.id) : undefined} />
              ))}
            </Row>
          </View>
        )}

        {canManage && (
          <View style={{ gap: th.space(3), padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
            <Text size="sm" weight="semibold">{t('Zyada qty ka rate')}</Text>
            {packs.length > 1 && (
              <Select label={t('Pack')} value={unit} onChange={setUnit}
                options={packs.map((r) => ({ value: r.unitId ?? '', label: r.conversionRate > 1 ? `${r.unitName} (${r.conversionRate})` : r.unitName }))} />
            )}
            <Row gap={3} align="start">
              <Input containerStyle={{ flex: 1 }} ltr label={t('Kam az kam ({{value}})', { value: row?.unitName ?? 'pack' })} value={minQty} onChangeText={(x) => setMinQty(digits(x))} keyboardType="decimal-pad" placeholder="10" />
              <Input containerStyle={{ flex: 1 }} ltr label={t('Rate (Rs)')} value={price} onChangeText={(x) => setPrice(digits(x))} keyboardType="decimal-pad" placeholder={row?.listPrice != null ? String(row.listPrice) : String(Math.round(row?.rulePrice ?? 0))} />
            </Row>
            {okBreak && row && <Text size="xs" tone="muted">{t('{{q}} {{unitName}} ya zyada lene par har {{unitName}} {{rs}} ka.', { q: bq, unitName: row.unitName, rs: rs(bp) })}</Text>}
            <Button variant="secondary" icon={Plus} disabled={!okBreak} loading={addBreak.isPending} onPress={() => addBreak.mutate()}>{t('Save karein')}</Button>
          </View>
        )}
      </View>
    </Sheet>
  );
}
