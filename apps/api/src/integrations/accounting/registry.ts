import { quickbooksAdapter } from './quickbooks.adapter';
import { xeroAdapter } from './xero.adapter';
import { zohoAdapter } from './zoho.adapter';
import { AcctAdapter } from './types';

export const ACCT_PROVIDERS: Record<string, AcctAdapter> = {
  ZOHO: zohoAdapter,
  QUICKBOOKS: quickbooksAdapter,
  XERO: xeroAdapter,
};

export const acctProvider = (code?: string | null) => (code ? ACCT_PROVIDERS[code.toUpperCase()] : undefined);
