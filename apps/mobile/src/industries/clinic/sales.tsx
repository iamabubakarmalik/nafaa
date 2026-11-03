/** Clinic fee bills in Sales history: a "Visit fee" chip on the doctor-fee bill and a link to the day's visits. */

import { Stethoscope } from 'lucide-react-native';
import { t } from '@/core/i18n';
import { registerSalesExtras } from '@/modules/sales/industry/registry';

registerSalesExtras('clinic', {
  rowChips: (s) => (s.items.some((i) => /clinic fee/i.test(i.name ?? '')) ? [{ label: t('Visit fee'), tone: 'info', icon: Stethoscope }] : []),
  detailLinks: (s) => (s.items.some((i) => /clinic fee/i.test(i.name ?? '')) ? [{ label: t('Appointments'), href: '/clinic/appointments', icon: Stethoscope }] : []),
});
