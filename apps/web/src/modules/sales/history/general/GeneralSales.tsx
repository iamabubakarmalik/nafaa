import { SalesHistoryPage } from '../SalesHistoryPage';
import { t } from '@core/i18n';

const config = { label: t('Dukaan') };

export default function GeneralSales() {
  return <SalesHistoryPage config={config} />;
}
