/** Salon bills in Sales history: the appointment that was billed, with each stylist's commission line. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Scissors } from 'lucide-react-native';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { ListRow, Text } from '@/design';
import { registerReceiptIndustry } from '@/core/receipt/industry';
import { registerSalesExtras } from '@/modules/sales/industry/registry';
import { http } from '../_shared/serviceKit';
import type { Appointment } from './api';
import { dateOf } from './meta';

/** The bill note carries the appointment number ("Salon APT-…"); the server sale has no stylist link, so only that row prints. */
registerReceiptIndustry('salon', (_doc, { sale, lang }) => {
  const m = /^Salon\s+(\S+)/.exec(String(sale?.note ?? ''));
  return m ? { infoRows: [{ label: lang === 'ur' ? 'اپائنٹمنٹ' : 'Appointment', value: m[1] }] } : null;
});

function AppointmentCard({ saleId }: { saleId: string }) {
  const q = useQuery({ queryKey: ['salon-appointments', 'by-sale', saleId], queryFn: () => http.get<Appointment[]>('/salon/appointments', { saleId }) });
  const a = q.data?.[0];
  if (!a) return null;
  return (
    <View>
      <ListRow icon={Scissors} title={`${t('Appointment')} ${a.appointmentNumber}`} subtitle={dateOf(a.scheduledStart)} chevron onPress={() => router.push('/salon/appointments' as never)} />
      {a.services.map((s, i) => <ListRow key={i} dense title={`${s.serviceName ?? ''}${s.staffName ? ` · ${s.staffName}` : ''}`} trailing={<Text size="xs" tone="muted" ltr>{t('Commission')} {formatMoney(s.commissionAmount ?? 0)}</Text>} />)}
    </View>
  );
}

registerSalesExtras('salon', { DetailExtra: ({ sale }) => (sale.pending ? null : <AppointmentCard saleId={sale.id} />) });
