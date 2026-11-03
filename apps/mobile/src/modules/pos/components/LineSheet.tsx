/**
 * One bill line: quantity, rate (when the shop allows lowering it), rupees
 * off this line, a note printed on the bill, its own price tier, or remove.
 * A lowered rate counts toward the shop's discount limit, as on the web.
 */

import { Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { keypad, type PriceTier } from '@nafaa/core/pos';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Button, Input, Row, Segmented, Sheet, Text, toast, useTheme } from '@/design';
import { useBill } from '../engine/bill';
import { closeSheet, usePos, usePosUi } from '../engine/usePos';
import { TIER_LABEL } from './CartPanel';
import { Keypad, Stepper } from './parts';

type Field = 'qty' | 'rate' | 'off';

export function LineSheet() {
  const th = useTheme();
  const api = usePos();
  const open = usePosUi((s) => s.sheet === 'line');
  const lineId = usePosUi((s) => s.lineId);
  const lineField = usePosUi((s) => s.lineField);
  const line = useBill((s) => s.lines.find((l) => l.id === lineId));
  const billTier = useBill((s) => s.tier);
  const [field, setField] = useState<Field>('qty');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const parts = api.counter.parts;

  useEffect(() => {
    if (!open || !line) return;
    const rateOk = api.counter.canEditPrice && !line.fixedPrice && !line.dist?.free && line.type === 'product';
    setField(rateOk ? lineField : 'qty');
    setValue('');
    setNote(line.customNote ?? '');
  }, [open, lineId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (open && !line) closeSheet(); }, [open, line]);
  if (!line) return null;

  const canRate = api.counter.canEditPrice && !line.fixedPrice && !line.dist?.free && line.type === 'product';
  const fields = [{ value: 'qty' as Field, label: t('Quantity') }, ...(canRate ? [{ value: 'rate' as Field, label: t('Rate') }, { value: 'off' as Field, label: t('Rs off') }] : [])];

  const apply = () => {
    const n = Number(value);
    if (value !== '') {
      if (field === 'qty') api.setQty(line.id, n);
      else if (field === 'rate') api.setPrice(line.id, n);
      else api.setLineDiscount(line.id, n);
    }
    if ((note.trim() || undefined) !== line.customNote) api.setNote(line.id, note);
    closeSheet();
  };

  const tiers = parts.priceTiers && parts.tierLineOverride && !line.fixedPrice && !!line.tierSrc ? parts.priceTierList : [];
  const shown = value === '' ? (field === 'qty' ? String(line.quantity) : field === 'rate' ? String(line.unitPrice) : '0') : value;

  return (
    <Sheet open={open} onClose={closeSheet} title={line.variantName ? `${line.name} · ${line.variantName}` : line.name}
      description={`${formatMoney(line.unitPrice)} / ${line.unitName}${line.priceEdited ? ` · ${t('normal {{amount}}', { amount: formatMoney(line.basePrice) })}` : ''}`}
      footer={
        <Row gap={2}>
          <Button variant="danger" icon={Trash2} onPress={() => { api.remove(line.id); closeSheet(); }} accessibilityLabel={t('Remove')} />
          <Button style={{ flex: 1 }} size="lg" onPress={apply}>{t('Done')}</Button>
        </Row>
      }>
      <View style={{ gap: th.space(3) }}>
        <Row justify="between">
          {line.lockQty ? <Text tone="muted">{t('Quantity is fixed for this item')}</Text>
            : <Stepper value={line.quantity} unit={line.unitName} onMinus={() => api.step(line.id, -1)} onPlus={() => api.step(line.id, 1)} />}
          <Amount value={line.lineTotal} size="2xl" weight="bold" />
        </Row>
        {tiers.length > 1 && (
          <Segmented size="sm" value={line.priceTier ?? billTier} options={tiers.map((x) => ({ value: x, label: t(TIER_LABEL[x]) }))}
            onChange={(v: PriceTier) => {
              if (v !== parts.defaultPriceTier && !api.counter.tierTrusted) { toast.error(t('You may not change the price tier')); return; }
              api.setLineTier(line.id, v);
            }} />
        )}
        {fields.length > 1 && <Segmented options={fields} value={field} onChange={(f) => { setField(f); setValue(''); }} />}
        {!line.lockQty || field !== 'qty' ? (
          <>
            <View style={{ padding: th.space(3), borderRadius: th.radius('xl'), backgroundColor: th.colors.surfaceSunken, alignItems: 'flex-end' }}>
              <Text size="3xl" weight="bold" ltr tabular tone={value ? 'default' : 'subtle'}>{field === 'qty' ? `${shown} ${line.unitName}` : `Rs ${shown}`}</Text>
            </View>
            <Keypad decimal onKey={(k) => setValue((v) => keypad(v, k))} keyHeight={48} />
          </>
        ) : null}
        <Input label={t('Note on the bill')} value={note} onChangeText={setNote} placeholder={t('e.g. one piece was damaged')} />
      </View>
    </Sheet>
  );
}
