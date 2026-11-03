/**
 * Details printed on this bill: a note, who took the goods (with phone) and
 * who sold it (commission).
 */

import { Check, UserCheck } from 'lucide-react-native';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { useOfflineManifest } from '@/core/offline';
import { Button, Input, Row, Select, Sheet, useTheme } from '@/design';
import { useBill } from '../engine/bill';
import { useCounter } from '../engine/counter';
import { closeSheet, usePosUi } from '../engine/usePos';

export function NoteSheet() {
  const th = useTheme();
  const open = usePosUi((s) => s.sheet === 'note');
  const counter = useCounter();
  const { data: m } = useOfflineManifest();
  const bill = useBill();
  const sellers = (m?.sellers ?? []).map((s) => ({ value: s.userId, label: s.name }));

  return (
    <Sheet open={open} onClose={closeSheet} title={t('Bill note')}
      footer={<Button size="lg" fullWidth icon={Check} onPress={closeSheet}>{t('Done')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Note on the bill')} value={bill.note} onChangeText={bill.setNote} placeholder={t('Optional')} autoFocus={!bill.note} />
        {counter.parts.showReceiver && (
          <Row gap={2} align="start">
            <View style={{ flex: 1.3 }}><Input label={t('Goods taken by')} value={bill.receiverName} onChangeText={(v) => bill.setReceiver(v, bill.receiverPhone)} icon={UserCheck} /></View>
            <View style={{ flex: 1 }}><Input label={t('Phone')} value={bill.receiverPhone} onChangeText={(v) => bill.setReceiver(bill.receiverName, v)} keyboardType="phone-pad" ltr /></View>
          </Row>
        )}
        {sellers.length > 1 && (
          <Select label={t('Sold by (commission)')} value={bill.soldById ?? ''} onChange={(v) => bill.setSoldBy(v || null)} options={[{ value: '', label: t('Me') }, ...sellers]} />
        )}
      </View>
    </Sheet>
  );
}
