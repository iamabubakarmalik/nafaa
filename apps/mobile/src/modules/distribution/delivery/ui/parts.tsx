/**
 * Small pieces shared by the delivery screens: outcome labels, pack text,
 * the sync button over the delivery queue, and the status pill of a report.
 */

import { CloudOff, RefreshCw } from 'lucide-react-native';
import { msg, t } from '@/core/i18n';
import { Badge, Icon, PressableScale, Skeleton, StatusPill, Text, useTheme, type StatusTone } from '@/design';
import type { LocalReport } from '../core/repo';
import type { DeliveryOutcome, InvoiceLine, MoneyMethod } from '../core/types';
import { useDeliveryStore } from '../store';

export const OUTCOME_LABEL: Record<DeliveryOutcome, string> = {
  DELIVERED: msg('Poora deliver'), PARTIAL: msg('Kuch wapas'), RETURNED: msg('Sab wapas'),
};
export const OUTCOME_TONE: Record<DeliveryOutcome, StatusTone> = { DELIVERED: 'success', PARTIAL: 'warning', RETURNED: 'danger' };

/** Stored as written (raw); translated where shown. */
export const RETURN_REASONS = [msg('Dukaan band thi'), msg('Customer ne inkaar kiya'), msg('Paise nahi the'), msg('Maal kharab / toota'), msg('Ghalat maal gaya'), msg('Gaari me jagah nahi thi')];

export const FIELD_METHODS: { value: MoneyMethod | 'CHEQUE'; label: string }[] = [
  { value: 'CASH', label: msg('Cash') }, { value: 'JAZZCASH', label: msg('JazzCash') }, { value: 'EASYPAISA', label: msg('Easypaisa') },
  { value: 'BANK_TRANSFER', label: msg('Bank') }, { value: 'CHEQUE', label: msg('Cheque') },
];

const trim = (v: number) => String(Math.round(v * 10000) / 10000);

/** "2 Carton (48 pcs)" or "4 pcs". */
export function packText(l: Pick<InvoiceLine, 'qty' | 'baseQty' | 'unitName' | 'conversionRate' | 'baseUnit'>): string {
  if (l.unitName && l.conversionRate > 1) return `${trim(l.qty)} ${l.unitName} (${trim(l.baseQty)} ${l.baseUnit})`;
  return `${trim(l.baseQty)} ${l.baseUnit}`;
}

export function ReportPill({ report }: { report: LocalReport | null }) {
  if (!report) return <StatusPill tone="neutral">{t('Jaana hai')}</StatusPill>;
  if (report.state === 'office') return <StatusPill tone="info">{t('Office ne settle kiya')}</StatusPill>;
  if (report.state === 'issue') return <StatusPill tone="danger">{t('Sync issue')}</StatusPill>;
  return <StatusPill tone={OUTCOME_TONE[report.outcome]}>{t(OUTCOME_LABEL[report.outcome])}</StatusPill>;
}

/** Header button: sends what waits and downloads the sheet again. */
export function DeliverySyncButton() {
  const th = useTheme();
  const { syncing, loading, pending, offline, refresh } = useDeliveryStore();
  const busy = syncing || loading;
  return (
    <PressableScale
      onPress={() => refresh()}
      disabled={busy}
      accessibilityLabel={t('Sync')}
      style={{
        height: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: th.space(1.5),
        paddingHorizontal: th.space(3), borderRadius: th.radius('full'), backgroundColor: th.colors.surface, borderWidth: 1, borderColor: th.colors.border,
      }}
    >
      {busy ? <Skeleton width={16} height={16} radius={8} /> : <Icon icon={offline ? CloudOff : RefreshCw} size={16} tone={offline ? 'danger' : 'brand'} />}
      <Text size="sm" weight="semibold">{busy ? t('Sync…') : t('Sync')}</Text>
      {pending > 0 && <Badge tone="warning" solid>{String(pending)}</Badge>}
    </PressableScale>
  );
}
