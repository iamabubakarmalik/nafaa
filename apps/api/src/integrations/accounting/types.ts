import { JournalLine } from './daily-journal';

/** Jure hue accounting software ki maloomat (tokens encrypted alag) */
export interface AcctConnection {
  provider: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  /** Zoho: organization_id, QuickBooks: realmId, Xero: tenantId */
  orgId: string;
  companyName: string | null;
  currency: string | null;
  /** Zoho: Books API base + accounts server (DC ke hisaab se) */
  apiBase?: string | null;
  accountsServer?: string | null;
}

export interface AcctAccount {
  id: string;
  name: string;
  code?: string | null;
  type: string;
}

export interface AcctTokens { accessToken: string; refreshToken: string; expiresAt: string }

export interface AcctAdapter {
  code: string;
  name: string;
  /** Server par app ki keys lagi hain? */
  configured(): boolean;
  authorizeUrl(state: string, redirectUri: string): string;
  /** Callback ke query se tokens + company */
  exchange(query: Record<string, string>, redirectUri: string): Promise<Omit<AcctConnection, 'provider'>>;
  refresh(conn: AcctConnection): Promise<AcctTokens>;
  accounts(conn: AcctConnection): Promise<AcctAccount[]>;
  postJournal(conn: AcctConnection, j: { date: string; ref: string; notes: string; lines: JournalLine[] }): Promise<{ id: string }>;
  /** Pehle se bheja? (dobara na bane) */
  findByRef?(conn: AcctConnection, ref: string): Promise<string | null>;
}

export class AcctApiError extends Error {
  constructor(message: string, readonly auth = false) {
    super(message);
  }
}
