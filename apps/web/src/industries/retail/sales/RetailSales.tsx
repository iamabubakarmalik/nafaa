import { SalesHistoryPage } from '@modules/sales/history/SalesHistoryPage';

const config = { label: 'Retail' };

export default function RetailSales() {
  return <SalesHistoryPage config={config} />;
}
