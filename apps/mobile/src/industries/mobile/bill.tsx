/**
 * Phone bills on the shared Sales history and receipt (web MobileSales): a
 * Repair chip on repair bills, an IMEI card on the bill screen with PTA status
 * and warranty, and on the receipt the warranty line under each phone plus a
 * warranty box. IMEIs themselves are printed by the receipt engine.
 */

import { Wrench } from 'lucide-react-native';
import { formatDate } from '@/core/format';
import { t } from '@/core/i18n';
import { registerReceiptIndustry } from '@/core/receipt';
import { Card, ListRow, StatusPill, Text } from '@/design';
import { registerSalesExtras } from '@/modules/sales/industry/registry';
import { word } from '../retail/lib/bill';
import { ptaOf } from './meta';

interface BillImei { imei1: string; imei2?: string | null; ptaStatus?: string | null; warrantyMonths?: number | null; warrantyExpiry?: string | null }

const imeisOf = (sale: Record<string, any> | null | undefined): BillImei[] =>
  (Array.isArray(sale?.items) ? sale!.items : []).flatMap((i: any) => (Array.isArray(i.imeis) ? i.imeis : [])) as BillImei[];

registerSalesExtras('mobile', {
  rowChips: (s) => (s.saleNumber.startsWith('RPR-') ? [{ label: t('Repair'), tone: 'accent', icon: Wrench }] : []),
  DetailExtra: ({ raw }) => {
    const list = imeisOf(raw);
    if (!list.length) return null;
    return (
      <Card flush title={t('IMEI and warranty')}>
        {list.map((m, i) => {
          const pta = ptaOf(m.ptaStatus);
          return (
            <ListRow key={`${m.imei1}-${i}`} divider={i < list.length - 1} title={<Text ltr weight="semibold">{m.imei1}</Text>}
              subtitle={m.warrantyExpiry ? t('Warranty till {{date}}', { date: formatDate(m.warrantyExpiry) }) : undefined}
              trailing={m.ptaStatus ? <StatusPill tone={pta.tone}>{t(pta.label)}</StatusPill> : undefined} />
          );
        })}
      </Card>
    );
  },
});

registerReceiptIndustry('mobile', (_doc, { sale, lang }) => {
  const items: any[] = Array.isArray(sale?.items) ? sale!.items : [];
  const lineDetails = items.map((it) => {
    const m: BillImei | undefined = it.imeis?.[0];
    if (!m?.warrantyExpiry) return undefined;
    return [word(lang, `Warranty till ${formatDate(m.warrantyExpiry)}`, `وارنٹی ${formatDate(m.warrantyExpiry)} تک`, `Warranty ${formatDate(m.warrantyExpiry)} tak`)];
  });
  const list = imeisOf(sale).filter((m) => m.warrantyExpiry);
  if (!list.length) return null;
  return {
    lineDetails,
    boxes: [{
      title: word(lang, 'Warranty', 'وارنٹی', 'Warranty'),
      lines: [...list.map((m) => `IMEI ${m.imei1} — ${formatDate(m.warrantyExpiry!)}`), word(lang, 'Warranty covers manufacturing faults only.', 'وارنٹی صرف کمپنی کی خرابی پر ہے۔', 'Warranty sirf company ki kharabi par hai.')],
    }],
  };
});
