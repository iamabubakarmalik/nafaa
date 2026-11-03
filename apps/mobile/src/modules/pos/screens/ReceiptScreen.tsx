/**
 * One bill's receipt: preview in the shop's design, print (system dialog),
 * PDF to WhatsApp/email, the bill as WhatsApp text, and from here a return
 * or cancelling the bill. Works offline from the phone's copy; online the
 * full server bill (item details, charges, codes) is used.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { Ban, CloudOff, FileText, MessageCircle, Printer, RotateCcw } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatDateTime } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { useApiQuery, useSale } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { getReceiptSetup, printReceipt, saleRowToReceipt, saleToReceipt, sendReceiptWhatsApp, shareReceiptPdf, useBillLanguage, useReceiptSetup } from '@/core/receipt';
import { Badge, Button, DetailTemplate, EmptyState, IconButton, Row, Text, toast, useTheme } from '@/design';
import { ReceiptView } from '../components/ReceiptView';
import { VoidSheet } from '../components/VoidSheet';

const isTemp = (id: string) => id.startsWith('tmp_');

export function ReceiptScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const online = useOnlineStatus();
  const lang = useBillLanguage();
  const { data: setup = getReceiptSetup() } = useReceiptSetup();
  const local = useSale(id);
  const sale = local.data;
  const serverId = sale && !sale.pending && !isTemp(sale.id) ? sale.id : !sale && id && !isTemp(id) ? id : null;
  const full = useApiQuery<Record<string, unknown>>(`/sales/${serverId}`, undefined, { enabled: !!serverId && online });
  const [voiding, setVoiding] = useState(false);

  const doc = full.data ? saleToReceipt(full.data, lang) : sale ? saleRowToReceipt(sale, lang) : null;
  const phone = (full.data?.customer as { phone?: string } | undefined)?.phone ?? null;
  const status = String(full.data?.status ?? sale?.status ?? '');
  const voided = status === 'VOIDED';
  const returnable = !voided && status !== 'FULLY_RETURNED' && !sale?.pending;

  const print = async () => { if (doc) await printReceipt(doc, { setup, lang }).catch(() => toast.error(t('Could not print. Check the printer and try again.'))); };
  const pdf = async () => { if (doc) await shareReceiptPdf(doc, { setup, lang }).catch(() => toast.error(t('Could not make the PDF'))); };
  const wa = async () => { if (doc && !(await sendReceiptWhatsApp(doc, lang, phone))) toast.error(t('WhatsApp is not installed')); };

  return (
    <>
      <DetailTemplate
        title={doc?.saleNumber ?? t('Receipt')}
        subtitle={doc ? formatDateTime(doc.date) : undefined}
        loading={local.isLoading && !doc}
        onRefresh={serverId && online ? () => void full.refetch() : undefined}
        refreshing={full.isRefetching}
        actions={doc ? <IconButton icon={FileText} label={t('PDF')} onPress={() => void pdf()} /> : undefined}
        bottomActions={doc ? (
          <View style={{ flex: 1, gap: th.space(2) }}>
            <Row gap={2}>
              <Button icon={Printer} style={{ flex: 1 }} onPress={() => void print()}>{t('Print')}</Button>
              <Button icon={MessageCircle} variant="secondary" style={{ flex: 1 }} onPress={() => void wa()}>{t('WhatsApp')}</Button>
            </Row>
            {!voided && (can(P.RETURNS_CREATE) || can(P.SALES_VOID)) && (
              <Row gap={2}>
                {can(P.RETURNS_CREATE) && returnable && <Button size="sm" icon={RotateCcw} variant="soft" style={{ flex: 1 }} onPress={() => router.push(`/pos/return?saleId=${sale?.id ?? id}` as never)}>{t('Return items')}</Button>}
                {can(P.SALES_VOID) && <Button size="sm" icon={Ban} variant="ghost" style={{ flex: 1 }} onPress={() => setVoiding(true)}>{t('Cancel bill')}</Button>}
              </Row>
            )}
          </View>
        ) : undefined}
      >
        {!doc ? (
          <EmptyState title={t('Bill not found on this phone')} message={online ? undefined : t('Connect to the internet to open older bills.')} />
        ) : (
          <View style={{ gap: th.space(3) }}>
            {(sale?.pending || voided || !!sale?.note) && (
              <Row gap={2} wrap justify="center">
                {sale?.pending && <Badge tone="warning" icon={CloudOff}>{t('Waiting to sync')}</Badge>}
                {voided && <Badge tone="danger" icon={Ban}>{t('Cancelled')}</Badge>}
                {!!sale?.note && <Text size="xs" tone="muted" align="center">{sale.note}</Text>}
              </Row>
            )}
            <ReceiptView doc={doc} setup={setup} lang={lang} />
          </View>
        )}
      </DetailTemplate>
      <VoidSheet sale={sale ?? null} open={voiding} onClose={() => setVoiding(false)}
        onDone={() => { setVoiding(false); if (sale?.pending) router.back(); else void full.refetch(); }} />
    </>
  );
}
