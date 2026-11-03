/**
 * Market return on the route: goods a shop hands back (good, damaged or
 * expired). It waits for the office to approve; then the khata is credited
 * and damaged / expired goods are written off (and claimed from the company).
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { t } from '@/core/i18n';
import { Button, Input, Screen, SectionHeader, toast } from '@/design';
import { phase2Api } from '@/modules/distribution/api/phase2.api';
import { distError } from '@/modules/distribution/api/distribution.api';
import { CustomerPicker, LineEditor, newLine, StockList, type PickedCustomer, type PickedLine } from './VanParts';

export function VanReturnScreen() {
  const qc = useQueryClient();
  const { vanId } = useLocalSearchParams<{ vanId: string }>();
  const van = useQuery({ queryKey: ['van', 'one', vanId], queryFn: () => phase2Api.van(vanId), enabled: !!vanId }).data;
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [lines, setLines] = useState<PickedLine[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const clientRef = useMemo(() => Crypto.randomUUID(), []);
  const picked = lines.filter((l) => l.qty > 0);

  const save = async () => {
    if (!customer) return;
    setSaving(true);
    try {
      const r = await phase2Api.createReturn({
        clientRef, customerId: customer.id, ...(vanId && { vanId }), ...(note.trim() && { note: note.trim() }),
        items: picked.map((l) => ({ productId: l.stock.productId, ...(l.stock.variantId && { variantId: l.stock.variantId }), ...(l.unitId && { unitId: l.unitId }), qty: l.qty, condition: l.condition ?? 'GOOD' })),
      });
      toast.success(t('{{number}} save ho gaya', { number: r.marketReturn.number }), { message: t('Office approve karega') });
      qc.invalidateQueries({ queryKey: ['van'] });
      router.back();
    } catch (e) {
      toast.error(distError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title={t('Market return')}
      subtitle={van?.name}
      keyboard
      narrow
      footer={<Button size="xl" fullWidth icon={CheckCircle2} disabled={!customer || !picked.length} loading={saving} onPress={save}>{t('Save')}</Button>}
    >
      <CustomerPicker value={customer} onChange={setCustomer} />
      {lines.map((l) => (
        <LineEditor key={l.key} line={l} onChange={(n) => setLines((all) => all.map((x) => (x.key === l.key ? n : x)))} onRemove={() => setLines((all) => all.filter((x) => x.key !== l.key))} />
      ))}
      <SectionHeader title={t('Item chunein')} />
      <StockList stock={van?.stock ?? []} picked={lines} onAdd={(s) => setLines((all) => [...all, newLine(s, true)])} />
      <Input label={t('Note')} value={note} onChangeText={setNote} />
    </Screen>
  );
}
