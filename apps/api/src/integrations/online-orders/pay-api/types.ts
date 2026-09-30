/**
 * Payment gateways (Safepay, JazzCash, Easypaisa…) ka mushtarka roop.
 * Har dukaan APNA gateway account jorti hai; Nafaa sirf link banata hai,
 * customer seedha dukaan ke account me pay karta hai.
 */
export type PayEnv = 'sandbox' | 'live';
export type PayCreds = Record<string, string>;

export interface CheckoutInput {
  ref: string;
  /** Rupay (paisa nahi) */
  amount: number;
  description: string;
  customer: { name: string; phone?: string | null; email?: string | null };
  returnUrl: string;
  cancelUrl: string;
  /** Wallet gateways (JazzCash / Easypaisa): customer ka number + CNIC ke aakhri 6 */
  wallet?: { mobile?: string; cnic?: string };
}

/** Customer ko kahan bhejna hai: seedha URL, ya auto-submit form (JazzCash) */
export type Checkout =
  | { kind: 'redirect'; url: string; providerRef: string }
  | { kind: 'form'; action: string; fields: Record<string, string>; providerRef: string }
  /** Wallet: request customer ke phone par gayi — natija yahin (ya thori der me inquiry se) */
  | { kind: 'wallet'; providerRef: string; status: PayStatus };

export interface PayStatus {
  paid: boolean;
  failed?: boolean;
  /** Rupay — mile to hisaab se milao */
  amount?: number | null;
  providerRef?: string | null;
  message?: string | null;
}

export interface PayAdapter {
  code: string;
  /** Pay safhe par customer se kya poochna hai (wallet gateways) */
  collect?: ('mobile' | 'cnic')[];
  test(creds: PayCreds, env: PayEnv): Promise<void>;
  create(creds: PayCreds, env: PayEnv, input: CheckoutInput): Promise<Checkout>;
  /** Server se pakki tasdeeq — return URL par kabhi bharosa nahi */
  status(creds: PayCreds, env: PayEnv, providerRef: string, ref: string, returnData?: Record<string, string>): Promise<PayStatus>;
}

export class PayApiError extends Error {
  constructor(message: string, readonly auth = false) {
    super(message);
  }
}
