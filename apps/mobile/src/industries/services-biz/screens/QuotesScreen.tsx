/** Quotes (web QuotesPage): quotation lines with a total; send, mark accepted or rejected, and turn an accepted quote into a job. */

import { FileText } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { quoteTotal } from '@nafaa/core/industries/services-biz';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, DetailRow, Row, Sheet, Text, toast } from '@/design';
import { errorText, useDeskOnline } from '../../_shared/deskKit';
import { DocActions, L, type PackDoc } from '../../_shared/docKit';
import { CustomerField, DeskList, FormSheet, type PickedCustomer } from '../../_shared/serviceKit';
import { servicesApi, type Quote } from '../api';
import { QUOTE_STATUS, SB_KEYS, dateOf, refreshServices } from '../meta';

const quoteDoc = (q: Quote, lang: Parameters<typeof L>[0]): PackDoc => ({
  fileName: `quote-${q.quoteNumber}`, title: L(lang, 'Quotation', 'کوٹیشن', 'Quote'), subtitle: q.quoteNumber,
  meta: [[L(lang, 'Customer', 'کسٹمر', 'Customer'), q.customerName], [L(lang, 'Job', 'کام', 'Kaam'), q.serviceName], ...(q.validUntil ? [[L(lang, 'Valid until', 'مدت', 'Tak manzoor'), dateOf(q.validUntil)] as [string, string]] : [])],
  tables: [{ columns: [L(lang, 'Item', 'آئٹم', 'Item'), L(lang, 'Qty', 'تعداد', 'Qty'), L(lang, 'Rate', 'ریٹ', 'Rate'), L(lang, 'Amount', 'رقم', 'Amount')], rows: q.lines.map((l) => [l.description, l.quantity, formatMoney(l.unitPrice), formatMoney(l.quantity * l.unitPrice)]) }],
  rows: [[L(lang, 'Total', 'کل', 'Total'), formatMoney(q.totalAmount), 'strong']],
});

export function QuotesScreen() {
  const manage = usePermission()(P.SERVICE_JOBS_MANAGE);
  const { guard } = useDeskOnline('servicesDesk');
  const [form, setForm] = useState(false);
  const [open, setOpen] = useState<Quote | null>(null);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const act = async (fn: () => Promise<unknown>, msgText: string) => { try { await fn(); refreshServices(); setOpen(null); toast.success(msgText); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } };
  return (
    <DeskList<Quote[]> title={t('Quotes')} queryKey={[SB_KEYS.quotes]} fetch={() => servicesApi.quotes.list()} feature="servicesDesk" emptyIcon={FileText} empty={t('Abhi koi quote nahi')} searchPlaceholder={t('Customer ya quote number')}
      rows={(list) => list.map((q) => ({
        id: q.id, icon: FileText, tone: QUOTE_STATUS[q.status]?.tone ?? 'neutral', search: `${q.customerName} ${q.quoteNumber} ${q.serviceName}`, title: `${q.serviceName} — ${q.customerName}`, subtitle: `${q.quoteNumber}${q.validUntil ? ` · ${t('{{date}} tak', { date: dateOf(q.validUntil) })}` : ''}`,
        trailing: <View style={{ alignItems: 'flex-end', gap: 2 }}><Text weight="bold" size="sm" ltr>{formatMoney(q.totalAmount)}</Text><Badge tone={QUOTE_STATUS[q.status]?.tone ?? 'neutral'}>{t(QUOTE_STATUS[q.status]?.label ?? q.status)}</Badge></View>, onPress: () => setOpen(q),
      }))}
      fab={manage ? { label: t('New quote'), onPress: () => guard(() => { setCustomer(null); setForm(true); }) } : undefined}>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.serviceName} description={open ? `${open.quoteNumber} · ${open.customerName}` : undefined}
        footer={open ? <View style={{ gap: 8 }}><View style={{ alignItems: 'center' }}><DocActions phone={open.customerPhone} build={(lang) => quoteDoc(open, lang)} /></View>{manage ? <Row gap={2}>
          {open.status === 'DRAFT' && <Button style={{ flex: 1 }} onPress={() => guard(() => void act(() => servicesApi.quotes.send(open.id), t('Bhej diya')))}>{t('Bhejein')}</Button>}
          {['DRAFT', 'SENT'].includes(open.status) && <Button style={{ flex: 1 }} variant="secondary" onPress={() => guard(() => void act(() => servicesApi.quotes.accept(open.id), t('Manzoor ho gaya')))}>{t('Manzoor')}</Button>}
          {['DRAFT', 'SENT'].includes(open.status) && <Button variant="ghost" onPress={() => guard(() => void act(() => servicesApi.quotes.reject(open.id), t('Na-manzoor likh diya')))}>{t('Na-manzoor')}</Button>}
          {open.status === 'ACCEPTED' && !open.convertedJobId && <Button style={{ flex: 1 }} onPress={() => guard(() => void act(() => servicesApi.quotes.convert(open.id), t('Job ban gayi')))}>{t('Job banayein')}</Button>}
        </Row> : null}</View> : undefined}>
        {open && <View style={{ gap: 4 }}>
          <DetailRow label={t('Masla')} value={open.problemDescription} />
          {open.lines.map((l, i) => <DetailRow key={i} label={`${l.description} × ${l.quantity}`} value={<Text ltr>{formatMoney(l.quantity * l.unitPrice)}</Text>} />)}
          <DetailRow label={t('Total')} value={<Text weight="bold" ltr>{formatMoney(open.totalAmount)}</Text>} last />
        </View>}
      </Sheet>
      <FormSheet open={form} title={t('New quote')} onClose={() => setForm(false)} extra={<CustomerField value={customer} onChange={setCustomer} />}
        fields={[{ key: 'serviceName', label: t('Kaam'), required: true }, { key: 'problem', label: t('Masla'), kind: 'multiline' }, { key: 'lines', label: t('Items (har line me: naam, miqdaar, qeemat)'), kind: 'multiline', required: true, hint: t('Misal: Wiring, 1, 3000') }, { key: 'discount', label: t('Discount'), kind: 'money' }]}
        onSubmit={async (v) => {
          if (!customer) throw new Error(t('Customer chunein'));
          const lines = String(v.lines).split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => { const [description, q, p] = l.split(',').map((x) => x.trim()); return { kind: 'OTHER', description, quantity: Number(q) || 1, unitPrice: Number(p) || 0 }; });
          if (!lines.length || quoteTotal(lines, v.discount ?? 0) <= 0) throw new Error(t('Items aur qeemat likhein'));
          await servicesApi.quotes.create({ customerId: customer.id, serviceName: v.serviceName.trim(), problemDescription: v.problem?.trim() || v.serviceName.trim(), lines, discount: v.discount ?? 0 }); refreshServices(); toast.success(t('Quote ban gaya'));
        }} />
    </DeskList>
  );
}
