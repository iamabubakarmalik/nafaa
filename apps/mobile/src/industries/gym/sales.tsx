/** Gym membership bills in Sales history and on the receipt: the membership number, and a link to the memberships list. */

import { Award } from 'lucide-react-native';
import { t } from '@/core/i18n';
import { registerReceiptIndustry } from '@/core/receipt/industry';
import { registerSalesExtras } from '@/modules/sales/industry/registry';

const isMembership = (s: { saleNumber: string }) => s.saleNumber.startsWith('GYM-');

registerReceiptIndustry('gym', (_doc, { sale, lang }) => {
  const ref = sale?.sourceRef as string | undefined;
  return ref && String(sale?.saleNumber ?? '').startsWith('GYM-') ? { infoRows: [{ label: lang === 'ur' ? 'ممبرشپ' : 'Membership', value: ref }] } : null;
});

registerSalesExtras('gym', {
  rowChips: (s) => (isMembership(s) ? [{ label: t('Membership'), tone: 'accent', icon: Award }] : []),
  detailLinks: (s) => (isMembership(s) ? [{ label: t('Memberships'), href: '/gym/memberships', icon: Award, hint: s.sourceRef ?? undefined }] : []),
});
