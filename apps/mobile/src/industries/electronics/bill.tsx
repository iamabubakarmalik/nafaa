/**
 * Electronics bills on the shared Sales history and receipt (web ElectronicsSales):
 * a serial and warranty card on the bill screen, and on the receipt the
 * warranty line under each unit plus a warranty box. Serial numbers are
 * printed by the receipt engine.
 */

import { formatDate } from '@/core/format';
import { t } from '@/core/i18n';
import { registerReceiptIndustry, type ReceiptExtender } from '@/core/receipt';
import { Card, ListRow, Text } from '@/design';
import { registerSalesExtras } from '@/modules/sales/industry/registry';
import { word } from '../retail/lib/bill';

interface BillSerial { serialNumber: string; imei?: string | null; warrantyEndDate?: string | null; warrantyExpiry?: string | null }
const endOf = (s: BillSerial) => s.warrantyEndDate ?? s.warrantyExpiry ?? null;

const serialsOf = (sale: Record<string, any> | null | undefined): BillSerial[] =>
  (Array.isArray(sale?.items) ? sale!.items : []).flatMap((i: any) => (Array.isArray(i.serials) ? i.serials : [])) as BillSerial[];

registerSalesExtras('electronics', {
  DetailExtra: ({ raw }) => {
    const list = serialsOf(raw);
    if (!list.length) return null;
    return (
      <Card flush title={t('Serial and warranty')}>
        {list.map((s, i) => (
          <ListRow key={`${s.serialNumber}-${i}`} divider={i < list.length - 1} title={<Text ltr weight="semibold">{s.serialNumber}</Text>}
            subtitle={endOf(s) ? t('Warranty till {{date}}', { date: formatDate(endOf(s)!) }) : undefined} />
        ))}
      </Card>
    );
  },
});

/** Warranty line per unit and the warranty box (also used by the appliances bill). */
export const serialReceipt: ReceiptExtender = (_doc, { sale, lang }) => {
  const items: any[] = Array.isArray(sale?.items) ? sale!.items : [];
  const lineDetails = items.map((it) => {
    const end = it.serials?.[0] ? endOf(it.serials[0]) : null;
    return end ? [word(lang, `Warranty till ${formatDate(end)}`, `وارنٹی ${formatDate(end)} تک`, `Warranty ${formatDate(end)} tak`)] : undefined;
  });
  const list = serialsOf(sale).filter((s) => endOf(s));
  if (!list.length) return null;
  return {
    lineDetails,
    boxes: [{
      title: word(lang, 'Warranty', 'وارنٹی', 'Warranty'),
      lines: [...list.map((s) => `${s.serialNumber} — ${formatDate(endOf(s)!)}`), word(lang, 'Keep this bill for any warranty claim.', 'وارنٹی کلیم کے لیے یہ بل سنبھال کر رکھیں۔', 'Warranty claim ke liye yeh bill sambhal kar rakhein.')],
    }],
  };
};

registerReceiptIndustry('electronics', serialReceipt);
