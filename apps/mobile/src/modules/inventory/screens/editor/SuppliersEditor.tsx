/**
 * Suppliers of the product inside the price step: who sells it, the usual
 * cost of one base unit, the supplier's own code, minimum order and lead
 * time. One supplier is preferred. Costs are hidden without cost.view.
 */

import { Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatDate, formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Card, IconButton, Input, MoneyInput, PressableScale, Row, Text, useTheme } from '@/design';
import { NumberInput } from '../../components/fields';
import { SupplierPickerSheet } from '../../components/SupplierPicker';
import { useCostMask } from '../../lib/shared';
import type { CoreDraft, SupplierLinkDraft } from './types';

export function SuppliersEditor({ core, onChange }: { core: CoreDraft; onChange: (next: SupplierLinkDraft[]) => void }) {
  const th = useTheme();
  const { costHidden } = useCostMask();
  const [picking, setPicking] = useState(false);
  const list = core.suppliers;
  const update = (i: number, patch: Partial<SupplierLinkDraft>) => onChange(list.map((l, x) => (x === i ? { ...l, ...patch } : l)));
  const prefer = (i: number) => onChange(list.map((l, x) => ({ ...l, isPreferred: x === i })));
  const remove = (i: number) => {
    const next = list.filter((_, x) => x !== i);
    // The list always keeps one preferred supplier.
    onChange(next.length && !next.some((l) => l.isPreferred) ? next.map((l, x) => ({ ...l, isPreferred: x === 0 })) : next);
  };
  const add = (s: { id: string; name: string }) => {
    if (list.some((l) => l.supplierId === s.id)) return;
    onChange([...list, {
      supplierId: s.id, supplierName: s.name, supplierSku: '', costPrice: null, minOrderQty: null, leadDays: null, unitId: null,
      isPreferred: list.length === 0, notes: '', lastPurchasePrice: null, lastPurchasedAt: null,
    }]);
  };
  return (
    <View style={{ gap: th.space(3) }}>
      {list.map((l, i) => (
        <Card key={l.supplierId} tone={l.isPreferred ? 'brand' : 'default'}>
          <View style={{ gap: th.space(2) }}>
            <Row justify="between" gap={2}>
              <Text weight="bold" numberOfLines={1} style={{ flex: 1 }}>{l.supplierName}</Text>
              <PressableScale onPress={() => prefer(i)} haptic="select" accessibilityRole="radio" accessibilityState={{ selected: l.isPreferred }}>
                <Row gap={1.5}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', borderColor: l.isPreferred ? th.colors.brand.solid : th.colors.borderStrong }}>
                    {l.isPreferred && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: th.colors.brand.solid }} />}
                  </View>
                  <Text size="xs" weight={l.isPreferred ? 'bold' : 'medium'} tone={l.isPreferred ? 'brand' : 'muted'}>{t('Preferred')}</Text>
                </Row>
              </PressableScale>
              <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" size="sm" onPress={() => remove(i)} />
            </Row>
            <Input label={t('Supplier SKU')} value={l.supplierSku} onChangeText={(supplierSku) => update(i, { supplierSku })} ltr autoCapitalize="characters"
              hint={t('Supplier apne catalog me jo code likhta hai')} />
            <Row gap={2} style={{ alignItems: 'flex-start' }}>
              {!costHidden && (
                <MoneyInput containerStyle={{ flex: 1 }} label={t('Usual cost')} value={l.costPrice} onChangeValue={(costPrice) => update(i, { costPrice })}
                  hint={t('Ek {{unit}} ki', { unit: core.unit })} />
              )}
              <NumberInput containerStyle={{ flex: 1 }} label={t('Min order')} value={l.minOrderQty} onChangeValue={(minOrderQty) => update(i, { minOrderQty })}
                hint={core.unit} />
              <NumberInput containerStyle={{ flex: 1 }} label={t('Lead days')} value={l.leadDays} integer onChangeValue={(leadDays) => update(i, { leadDays })} />
            </Row>
            {!costHidden && l.lastPurchasePrice != null && l.lastPurchasePrice > 0 && (
              <Text size="xs" tone="muted">
                {t('Last: {{price}}{{date}}', { price: formatPKR(l.lastPurchasePrice), date: l.lastPurchasedAt ? ` · ${formatDate(l.lastPurchasedAt)}` : '' })}
              </Text>
            )}
          </View>
        </Card>
      ))}
      <Button variant="soft" icon={Plus} onPress={() => setPicking(true)}>{t('Supplier jorein')}</Button>
      <SupplierPickerSheet open={picking} onClose={() => setPicking(false)} exclude={list.map((l) => l.supplierId)} onPick={add} />
    </View>
  );
}
