/**
 * After a sale: the change to give back in big numbers, then print, share
 * the PDF or send the bill on WhatsApp. The counter is already clear, so
 * "New sale" (or just closing) starts the next customer at once. A bill made
 * offline shows that it will be sent when internet is back.
 */

import { router } from 'expo-router';
import { CheckCircle2, CloudOff, FileText, MessageCircle, Plus, Printer, ReceiptText } from 'lucide-react-native';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { formatMoney } from '@/core/format';
import { useSale } from '@/core/offline';
import { printReceipt, sendReceiptWhatsApp, shareReceiptPdf, useBillLanguage, useReceiptSetup, rw } from '@/core/receipt';
import { Amount, Badge, Button, Icon, Row, Sheet, Text, toast, useTheme } from '@/design';
import { useLastSale } from '../engine/checkout';
import { closeSheet, usePosUi } from '../engine/usePos';

export function useLastReceipt() {
  const done = useLastSale((s) => s.sale);
  const { data: sale } = useSale(done?.saleId ?? null);
  const lang = useBillLanguage();
  if (!done) return null;
  const pending = sale?.pending ?? true;
  const number = sale?.saleNumber || done.doc.saleNumber;
  return {
    done, pending, number,
    doc: { ...done.doc, saleNumber: number, stamp: pending ? rw(lang, 'stampOffline') : undefined },
    lang,
    saleId: sale?.id ?? done.saleId,
  };
}

export function DoneSheet() {
  const th = useTheme();
  const open = usePosUi((s) => s.sheet === 'done');
  const last = useLastReceipt();
  const { data: setup } = useReceiptSetup();
  if (!last) return null;
  const { done, pending, number, doc, lang } = last;

  const print = async () => {
    try { await printReceipt(doc, { setup, lang }); } catch { toast.error(t('Could not print. Check the printer and try again.')); }
  };
  const pdf = async () => {
    try { await shareReceiptPdf(doc, { setup, lang }); } catch { toast.error(t('Could not make the PDF')); }
  };
  const whatsapp = async () => {
    if (!(await sendReceiptWhatsApp(doc, lang, done.customerPhone))) toast.error(t('WhatsApp is not installed'));
  };

  return (
    <Sheet open={open} onClose={closeSheet} hideClose
      footer={<Button size="xl" fullWidth icon={Plus} onPress={closeSheet}>{t('New sale')}</Button>}>
      <View style={{ alignItems: 'center', gap: th.space(2), paddingTop: th.space(1) }}>
        <Icon icon={CheckCircle2} size={52} color={th.colors.success.solid} />
        <Text size="lg" weight="bold">{t('Sale done')}</Text>
        <Row gap={2}>
          <Text tone="muted" ltr>{number}</Text>
          {pending && <Badge tone="warning" icon={CloudOff}>{t('Will sync')}</Badge>}
        </Row>
        {done.change > 0 ? (
          <View style={{ alignItems: 'center', padding: th.space(4), borderRadius: th.radius('2xl'), backgroundColor: th.colors.success.soft, alignSelf: 'stretch' }}>
            <Text weight="semibold" color={th.colors.success.text}>{t('Give back')}</Text>
            <Amount value={done.change} size="4xl" weight="heavy" color={th.colors.success.text} />
          </View>
        ) : (
          <Amount value={done.total} size="4xl" weight="heavy" />
        )}
        {done.credit > 0 && <Text color={th.colors.warning.text} weight="semibold">{t('{{amount}} added to {{name}}\'s khata', { amount: formatMoney(done.credit), name: done.customerName ?? '' })}</Text>}
        {done.deposited > 0 && <Text color={th.colors.success.text} weight="semibold">{t('{{amount}} kept as advance in khata', { amount: formatMoney(done.deposited) })}</Text>}
      </View>
      <Row gap={2} style={{ marginTop: th.space(4) }}>
        <Button variant="secondary" icon={Printer} onPress={() => void print()} style={{ flex: 1 }}>{t('Print')}</Button>
        <Button variant="secondary" icon={MessageCircle} onPress={() => void whatsapp()} style={{ flex: 1 }}>{t('WhatsApp')}</Button>
      </Row>
      <Row gap={2} style={{ marginTop: th.space(2) }}>
        <Button variant="ghost" icon={FileText} onPress={() => void pdf()} style={{ flex: 1 }}>{t('PDF')}</Button>
        <Button variant="ghost" icon={ReceiptText} onPress={() => { closeSheet(); router.push(`/pos/receipt/${last.saleId}`); }} style={{ flex: 1 }}>{t('View receipt')}</Button>
      </Row>
    </Sheet>
  );
}
