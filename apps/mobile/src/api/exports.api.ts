import { apiClient } from './client';

export interface ExportEndpoint {
  key: string;
  title: string;
  description: string;
  formats: Array<{
    label: 'Excel' | 'PDF';
    path: string;
    ext: 'xlsx' | 'pdf';
    mimeType: string;
  }>;
}

export const EXPORT_ENDPOINTS: ExportEndpoint[] = [
  {
    key: 'sales',
    title: 'Sales Report',
    description: 'Sab sales — sale number, customer, items, payment, totals',
    formats: [
      { label: 'Excel', path: '/exports/sales/excel', ext: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { label: 'PDF',   path: '/exports/sales/pdf',   ext: 'pdf',  mimeType: 'application/pdf' },
    ],
  },
  {
    key: 'products',
    title: 'Products Inventory',
    description: 'Saare products with stock levels, prices, categories',
    formats: [
      { label: 'Excel', path: '/exports/products/excel', ext: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    ],
  },
  {
    key: 'customers',
    title: 'Customer List',
    description: 'Customers with balances, contact info, loyalty points',
    formats: [
      { label: 'Excel', path: '/exports/customers/excel', ext: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    ],
  },
  {
    key: 'suppliers',
    title: 'Supplier List',
    description: 'Suppliers with bank details, payment terms, dues',
    formats: [
      { label: 'Excel', path: '/exports/suppliers/excel', ext: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    ],
  },
  {
    key: 'expenses',
    title: 'Expenses Report',
    description: 'Sab expenses — categories, amounts, payment methods',
    formats: [
      { label: 'Excel', path: '/exports/expenses/excel', ext: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    ],
  },
  {
    key: 'purchases',
    title: 'Purchases Report',
    description: 'Supplier-wise purchases, items, payment status',
    formats: [
      { label: 'Excel', path: '/exports/purchases/excel', ext: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    ],
  },
  {
    key: 'ledger',
    title: 'Khata / Ledger',
    description: 'Customer credits, payments received, balance history',
    formats: [
      { label: 'Excel', path: '/exports/ledger/excel', ext: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    ],
  },
  {
    key: 'stock-movements',
    title: 'Stock Movements',
    description: 'Sab stock IN/OUT — audit trail for inventory',
    formats: [
      { label: 'Excel', path: '/exports/stock-movements/excel', ext: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    ],
  },
];

// Legacy API for direct blob access
export const exportsApi = {
  salesExcel: () => apiClient.get('/exports/sales/excel', { responseType: 'blob' }).then((r) => r.data),
  productsExcel: () => apiClient.get('/exports/products/excel', { responseType: 'blob' }).then((r) => r.data),
  customersExcel: () => apiClient.get('/exports/customers/excel', { responseType: 'blob' }).then((r) => r.data),
  salesPdf: () => apiClient.get('/exports/sales/pdf', { responseType: 'blob' }).then((r) => r.data),
};
