import { SalesHistoryPage } from '@modules/sales/history/SalesHistoryPage';
import { t } from '@core/i18n';

const config = { label: t('Bakery') };

export default function BakerySales() {
  return <SalesHistoryPage config={config} />;
}
