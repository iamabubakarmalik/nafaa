/* Tax ab ek jagah: @integrations/tax-authority (/tax). Yahan sirf wo cheezein
   jo receipt / POS pages pehle se import karte hain. */
export { fbrApi } from './api/fbr.api';
export * from './api/fbr.types';
export { FbrReceiptBadge } from './components/FbrReceiptBadge';
export { useFbrForSale } from './hooks/useFbrForSale';
export type { FbrSaleStatus } from './hooks/useFbrForSale';
export { FbrModeIndicator } from './components/FbrModeIndicator';
