/** Gaming session bills in Sales history and on the receipt: the session number, and a link to Cafe live. */

import { Timer } from 'lucide-react-native';
import { t } from '@/core/i18n';
import { registerReceiptIndustry } from '@/core/receipt/industry';
import { registerSalesExtras } from '@/modules/sales/industry/registry';

const isSession = (s: { saleNumber: string }) => s.saleNumber.startsWith('GMS-');

registerReceiptIndustry('gaming', (_doc, { sale, lang }) => {
  const ref = sale?.sourceRef as string | undefined;
  return ref && String(sale?.saleNumber ?? '').startsWith('GMS-') ? { infoRows: [{ label: lang === 'ur' ? 'سیشن' : 'Session', value: ref }] } : null;
});

registerSalesExtras('gaming', {
  rowChips: (s) => (isSession(s) ? [{ label: t('Station session'), tone: 'accent', icon: Timer }] : []),
  detailLinks: (s) => (isSession(s) ? [{ label: t('Cafe live'), href: '/gaming/cafe', icon: Timer, hint: s.sourceRef ?? undefined }] : []),
});
