/**
 * Cancel (void) a bill: stock comes back, khata is taken off, the bill stays
 * on record marked cancelled. A bill still waiting on this phone is simply
 * removed. The reason is saved as written; when the shop asks a PIN for
 * voids, the owner's or a manager's PIN is asked (internet needed).
 */

import { Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { enqueueVoid, OfflineRuleError, type SaleRow } from '@/core/offline';
import { askManagerPin } from '@/core/security/ManagerPin';
import { alert, Button, Chip, Input, Row, Sheet, Text, toast, useTheme } from '@/design';

/** Quick reasons; saved as written (English) and translated where shown. */
export const VOID_REASONS: readonly string[] = [msg('Wrong bill'), msg('Wrong price'), msg('Customer changed mind'), msg('Duplicate bill'), msg('Test bill')];

export function VoidSheet({ sale, open, onClose, onDone }: { sale: SaleRow | null; open: boolean; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setReason(''); }, [open]);

  const run = async () => {
    if (!sale) return;
    setBusy(true);
    const written = reason.trim() || 'Bill cancelled';
    try {
      let res: Awaited<ReturnType<typeof enqueueVoid>>;
      try {
        res = await enqueueVoid(sale.id, { reason: written });
      } catch (e) {
        if (!(e instanceof OfflineRuleError) || e.code !== 'pin_needed') throw e;
        const pin = await askManagerPin(t('Bill cancel'), 'void');
        if (!pin) return;
        res = await enqueueVoid(sale.id, { reason: written, managerPin: pin });
      }
      toast.success(res.cancelledLocally ? t('Bill removed from this phone') : t('Bill cancelled — stock is back'));
      onDone();
    } catch (e) {
      if (e instanceof OfflineRuleError && e.code === 'online_needed') await alert({ title: t('Internet needed'), message: e.message });
      else toast.error(e instanceof Error ? e.message : t('Could not cancel the bill'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('Cancel this bill?')} description={sale ? `${sale.saleNumber} · ${formatMoney(sale.total)}` : undefined}
      footer={
        <Row gap={2}>
          <Button variant="secondary" style={{ flex: 1 }} onPress={onClose}>{t('Keep it')}</Button>
          <Button variant="danger" style={{ flex: 1 }} loading={busy} onPress={() => void run()}>{t('Yes, cancel')}</Button>
        </Row>
      }>
      <View style={{ gap: th.space(3) }}>
        <View style={{ gap: th.space(1.5), padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.success.soft }}>
          {[t('Sold items go back to stock'), t('Khata from this bill is taken off'), t('Reports and profit are corrected'), t('The bill is kept, marked cancelled')].map((x) => (
            <Row key={x} gap={2}><Check size={16} color={th.colors.success.text} /><Text size="sm" color={th.colors.success.text}>{x}</Text></Row>
          ))}
        </View>
        <Text size="xs" weight="semibold" tone="muted">{t('Reason')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          {VOID_REASONS.map((r) => <Chip key={r} label={t(r)} selected={reason === r} onPress={() => setReason(reason === r ? '' : r)} />)}
        </View>
        <Input value={VOID_REASONS.includes(reason) ? '' : reason} onChangeText={setReason} placeholder={t('Or write the reason')} />
      </View>
    </Sheet>
  );
}
