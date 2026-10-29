/**
 * Pieces of the delivery screens that differ from the booker's: the sync
 * button over the delivery queue, outcome labels and pack text.
 */

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CloudOff, RefreshCw } from 'lucide-react-native';
import { GREEN, Tag } from '../../booker/ui/parts';
import { useDeliveryStore } from '../store';
import type { LocalReport } from '../core/repo';
import type { DeliveryOutcome, InvoiceLine } from '../core/types';

export const OUTCOME_LABEL: Record<DeliveryOutcome, string> = { DELIVERED: 'Poora deliver', PARTIAL: 'Kuch wapas', RETURNED: 'Sab wapas' };

export const RETURN_REASONS = ['Dukaan band thi', 'Customer ne inkaar kiya', 'Paise nahi the', 'Maal kharab / toota', 'Ghalat maal gaya', 'Gaari me jagah nahi thi'];

const trim = (v: number) => String(Math.round(v * 10000) / 10000);

/** "2 Carton (48 pcs)" or "4 pcs". */
export function packText(l: Pick<InvoiceLine, 'qty' | 'baseQty' | 'unitName' | 'conversionRate' | 'baseUnit'>): string {
  if (l.unitName && l.conversionRate > 1) return `${trim(l.qty)} ${l.unitName} (${trim(l.baseQty)} ${l.baseUnit})`;
  return `${trim(l.baseQty)} ${l.baseUnit}`;
}

export function ReportTag({ report }: { report: LocalReport | null }) {
  if (!report) return <Tag tone="gray">Jaana hai</Tag>;
  if (report.state === 'office') return <Tag tone="blue">Office ne settle kiya</Tag>;
  if (report.state === 'issue') return <Tag tone="red">Sync issue</Tag>;
  const tone = report.outcome === 'DELIVERED' ? 'green' : report.outcome === 'PARTIAL' ? 'accent' : 'red';
  return <Tag tone={tone}>{OUTCOME_LABEL[report.outcome]}</Tag>;
}

export function DeliverySyncButton() {
  const { syncing, loading, pending, offline, refresh } = useDeliveryStore();
  const busy = syncing || loading;
  return (
    <Pressable
      onPress={() => refresh()}
      disabled={busy}
      hitSlop={8}
      className="h-10 flex-row items-center gap-1.5 rounded-2xl px-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
    >
      {busy ? <ActivityIndicator size="small" color={GREEN} /> : offline ? <CloudOff size={16} color="#dc2626" /> : <RefreshCw size={16} color={GREEN} />}
      <Text className="text-xs font-extrabold text-neutral-700 dark:text-neutral-200">{busy ? 'Sync…' : 'Sync'}</Text>
      {pending > 0 && (
        <View className="min-w-5 h-5 px-1 rounded-full bg-amber-500 items-center justify-center">
          <Text className="text-[10px] font-extrabold text-white">{pending}</Text>
        </View>
      )}
    </Pressable>
  );
}
