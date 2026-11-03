/**
 * One quotation (web QuotationDetailPage): lines and totals, WhatsApp and share,
 * the customer's answer, a revision and the bill. Billing makes a normal sale
 * at the quoted rates (cash, card, split or udhaar) with delivery and labour as
 * bill charges, so stock, khata, day book and reports all see it; the
 * quotation then points at that bill. A challan for site delivery follows.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ban, CheckCircle2, Edit3, MessageCircle, Receipt, Send, Share2, Truck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Share, View } from 'react-native';
import { billPlan, qty } from '@nafaa/core/industries/hardware';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { enqueueSale, OfflineRuleError } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { askManagerPin } from '@/core/security/ManagerPin';
import { Amount, Badge, Button, Card, DetailRow, DetailSection, DetailTemplate, IconButton, ListRow, MoneyInput, Row, Sheet, StatusPill, Text, confirm, toast, useTheme } from '@/design';
import { Fact, MethodChips, errText, openWhatsApp, useDeskOnline, useShopId } from '../../_shared/trade/desk';
import { quotationsApi, type Quotation, type QuotationStatus } from '../api';
import { KEYS, OPEN_QUOTE, UNIT_LABEL, quoteStatus, refreshHardware, shortDate } from '../meta';

function quoteText(q: Quotation) {
  const lines = q.items.map((i) => `• ${i.itemName}${i.specifications ? ` (${i.specifications})` : ''} — ${qty(i.quantity)} x ${formatMoney(i.unitPrice)} = ${formatMoney(i.total)}`);
  return [`*${t('Quotation')} ${q.quotationNumber}*`, q.customerName, '', ...lines, '', `*${t('Kul')}: ${formatMoney(q.total)}*`, t('{{date}} tak', { date: shortDate(q.validUntil) }), q.paymentTerms ? `${t('Payment')}: ${q.paymentTerms}` : ''].filter((x) => x !== '').join('\n');
}

export function QuotationDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const canSell = usePermission()(P.POS_USE);
  const { guard } = useDeskOnline('hardwareDesk');
  const q = useQuery({ queryKey: [KEYS.quotation, id], queryFn: () => quotationsApi.getOne(id!), enabled: !!id });
  const [billing, setBilling] = useState(false);
  const [busy, setBusy] = useState(false);
  const x = q.data;
  const st = quoteStatus(x?.status);

  const refresh = () => { refreshHardware([KEYS.quotation, KEYS.quotations, KEYS.quoteSummary]); void q.refetch(); };
  const move = (s: QuotationStatus) => guard(async () => {
    setBusy(true);
    try { const r = await quotationsApi.updateStatus(id!, s); refresh(); toast.success(quoteStatus(r.status).label); } catch (e) { toast.error(errText(e, t('Status nahi badla'))); } finally { setBusy(false); }
  });
  const close = () => guard(async () => {
    if (!(await confirm({ title: t('Quotation band karein?'), message: t('Record mehfooz rehta hai.'), confirmLabel: t('Band karein'), tone: 'danger' }))) return;
    setBusy(true);
    try { await quotationsApi.close(id!); refresh(); toast.success(t('Quotation band ho gayi — record mehfooz hai')); } catch (e) { toast.error(errText(e, t('Band nahi hui'))); } finally { setBusy(false); }
  });

  const open = !!x && canSell && (OPEN_QUOTE.includes(x.status) || x.status === 'EXPIRED');
  const missing = x ? x.items.filter((i) => !i.productId) : [];
  const canBill = !!x && canSell && x.status !== 'CONVERTED' && x.status !== 'REJECTED' && missing.length === 0;
  const charges = x ? x.deliveryCharges + x.laborCharges + x.otherCharges : 0;

  return (
    <DetailTemplate title={x ? `${x.quotationNumber}${x.revisionNumber ? ` · R${x.revisionNumber}` : ''}` : t('Quotation')} subtitle={x ? `${x.customerName}${x.project ? ` · ${x.project.name}` : ''}` : undefined}
      loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={x ? <><IconButton icon={Share2} label={t('Share')} onPress={() => void Share.share({ message: quoteText(x) })} />{x.customerPhone ? <IconButton icon={MessageCircle} label={t('WhatsApp')} onPress={() => openWhatsApp(x.customerPhone, quoteText(x))} /> : null}</> : undefined}
      bottomActions={x && canSell ? (
        <>
          {x.status !== 'CONVERTED' && <Button variant="secondary" icon={Edit3} style={{ flex: 1 }} onPress={() => router.push(`/hardware/quotations/new?id=${x.id}` as never)}>{t('Revision')}</Button>}
          {canBill && <Button icon={Receipt} style={{ flex: 1 }} onPress={() => guard(() => setBilling(true))}>{t('Bill banayein')}</Button>}
        </>
      ) : undefined}>
      {x && (
        <View style={{ gap: th.space(3) }}>
          <Row gap={1.5} wrap><StatusPill tone={st.tone}>{st.label}</StatusPill><Badge>{t('Chalegi {{date}}', { date: shortDate(x.validUntil) })}</Badge></Row>
          {x.sale && (
            <Card tone="success">
              <ListRow icon={CheckCircle2} iconTone="success" title={t('Bill {{saleNumber}} ban chuka hai{{value}}', { saleNumber: x.sale.saleNumber, value: x.sale.status === 'VOIDED' ? t(' (void ho gaya)') : '' })}
                chevron onPress={() => router.push(`/sales/${x.sale!.id}` as never)} />
              {x.sale.status !== 'VOIDED' && <Button variant="soft" icon={Truck} onPress={() => router.push(`/hardware/deliveries/new?sale=${x.sale!.id}` as never)}>{t('Challan banayein')}</Button>}
            </Card>
          )}
          {missing.length > 0 && x.status !== 'CONVERTED' && <Card tone="warning"><Text size="sm">{t('{{value}} catalog me nahi — bill ke liye pehle product banayein, phir revision me catalog wala item chunein.', { value: missing.map((i) => i.itemName).join(', ') })}</Text></Card>}
          <Card flush title={t('Items')}>
            {x.items.map((i, n) => (
              <ListRow key={i.id ?? n} dense divider={n < x.items.length - 1} title={i.itemName} subtitle={[i.specifications, `${qty(i.quantity)} ${UNIT_LABEL(i.unit)} × ${formatMoney(i.unitPrice)}`].filter(Boolean).join(' · ')}
                trailing={<Text size="sm" weight="bold" ltr>{formatMoney(i.total)}</Text>} />
            ))}
          </Card>
          <DetailSection title={t('Hisaab')}>
            <DetailRow label={t('Items')} value={<Amount value={x.subtotal} />} />
            {x.discount > 0 && <DetailRow label={t('Discount')} value={<Amount value={-x.discount} />} />}
            {x.taxAmount > 0 && <DetailRow label={t('Tax')} value={<Amount value={x.taxAmount} />} />}
            {charges > 0 && <DetailRow label={t('Kiraya / mazdoori')} value={<Amount value={charges} />} />}
            <DetailRow label={t('Kul')} value={<Amount value={x.total} size="lg" weight="bold" />} last />
          </DetailSection>
          {open && (
            <Card title={t('Customer ka jawab')}>
              <View style={{ gap: th.space(2) }}>
                {x.status !== 'SENT' && x.status !== 'VIEWED' && <Button variant="secondary" icon={Send} loading={busy} onPress={() => move('SENT')}>{t('Bhej di')}</Button>}
                <Button variant="success" icon={CheckCircle2} loading={busy} onPress={() => move('ACCEPTED')}>{t('Customer ne maan li')}</Button>
                <Button variant="ghost" icon={Ban} onPress={close}>{t('Na mani / band karein')}</Button>
              </View>
            </Card>
          )}
          {canSell && x.status === 'ACCEPTED' && <Button variant="ghost" icon={Ban} onPress={close}>{t('Band karein')}</Button>}
          {(x.paymentTerms || x.deliveryTerms || x.customerNotes || x.internalNotes) && (
            <Card title={t('Shartein aur note')}>
              <View style={{ gap: th.space(2) }}>
                <Fact k={t('Payment')} v={x.paymentTerms} /><Fact k={t('Delivery')} v={x.deliveryTerms} /><Fact k={t('Customer note')} v={x.customerNotes} /><Fact k={t('Andar ka note')} v={x.internalNotes} />
              </View>
            </Card>
          )}
          {(x.customerPhone || x.customerAddress) && <Card><View style={{ gap: th.space(2) }}><Fact k={t('Phone')} v={x.customerPhone} /><Fact k={t('Pata')} v={x.customerAddress} /></View></Card>}
        </View>
      )}
      {x && <BillSheet q={x} open={billing} onClose={() => setBilling(false)} onDone={refresh} />}
    </DetailTemplate>
  );
}

/** Makes the bill: cash, wallet, card or bank for what is paid now; the rest goes on the customer's khata. */
function BillSheet({ q, open, onClose, onDone }: { q: Quotation; open: boolean; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const shopId = useShopId();
  const plan = billPlan(q);
  const [paid, setPaid] = useState<number | null>(plan.total);
  const [method, setMethod] = useState('CASH');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setPaid(plan.total); setMethod('CASH'); } }, [open, plan.total]);
  const n = paid ?? 0;
  const credit = Math.max(plan.total - n, 0);
  const noCustomer = credit > 0.005 && !q.customerId;

  const run = async () => {
    if (!shopId) { toast.error(t('Pehle upar se shop chunein')); return; }
    setBusy(true);
    try {
      const input = {
        shopId, customerId: q.customerId || null, paymentMethod: method as 'CASH', paidAmount: Math.min(n, plan.total), discount: q.discount || undefined, serviceCharges: plan.charges.length ? plan.charges : undefined,
        note: `Quotation ${q.quotationNumber}`, items: plan.items,
      };
      let res: Awaited<ReturnType<typeof enqueueSale>>;
      try { res = await enqueueSale(input); } catch (e) {
        if (!(e instanceof OfflineRuleError) || e.code !== 'pin_needed') throw e;
        const pin = await askManagerPin(e.message, /khata|credit/i.test(e.message) ? 'credit' : 'discount');
        if (!pin) return;
        res = await enqueueSale({ ...input, managerPin: pin });
      }
      await quotationsApi.updateStatus(q.id, 'CONVERTED', `Bill ${res.sale.saleNumber}`, res.saleId).catch(() => toast.error(t('Bill ban gaya, magar quotation par nishan nahi laga — dobara khol kar dekhein')));
      refreshHardware([KEYS.quotation, KEYS.quotations, KEYS.quoteSummary], true);
      toast.success(t('Bill {{saleNumber}} ban gaya', { saleNumber: res.sale.saleNumber }));
      onDone();
      onClose();
      router.push(`/hardware/deliveries/new?sale=${res.saleId}` as never);
    } catch (e) { toast.error(e instanceof Error && !(e as { response?: unknown }).response ? e.message : apiErrorMessage(e, t('Bill nahi bana'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Bill banayein — {{n}}', { n: q.quotationNumber })} description={t('Kul {{total}}', { total: formatMoney(plan.total) })}
      footer={<Button fullWidth size="lg" variant="success" icon={Receipt} loading={busy} disabled={noCustomer || n < 0} onPress={() => void run()}>{credit > 0 ? t('Bill — {{credit}} khata me', { credit: formatMoney(credit) }) : t('Bill banayein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Abhi kitna mila')} value={paid} onChangeValue={setPaid} size="xl" />
        <MethodChips value={method} onChange={setMethod} />
        {credit > 0 && <Text size="sm" tone={noCustomer ? 'danger' : 'warning'}>{noCustomer ? t('Udhaar ke liye customer chunein (revision me)') : t('{{credit}} customer ke khata me chala jayega', { credit: formatMoney(credit) })}</Text>}
        {plan.charges.length > 0 && <Text size="xs" tone="muted">{t('Delivery aur mazdoori bill ke charges ban kar jati hain.')}</Text>}
      </View>
    </Sheet>
  );
}
