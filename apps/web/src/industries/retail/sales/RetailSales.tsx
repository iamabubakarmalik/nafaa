import { SalesHistoryPage } from '@modules/sales/history/SalesHistoryPage';
import { t } from '@core/i18n';

const config = { label: t('Retail') };

export default function RetailSales() {
  return <SalesHistoryPage config={config} />;
}
