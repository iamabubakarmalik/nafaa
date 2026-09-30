import { safepayAdapter } from './safepay.adapter';
import { PayAdapter } from './types';

export interface PayField { key: string; label: string; placeholder?: string; secret?: boolean; optional?: boolean; help?: string }

export interface PayGatewayDef {
  adapter: PayAdapter;
  name: string;
  credentials: PayField[];
  portalUrl: string;
  sandboxUrl?: string;
  steps: string[];
  /** Customer ke liye kaunse tareeqe */
  methods: string[];
  fees: string;
  color: string;
}

/** Jin gateways ka link Nafaa se banta hai — naya gateway = adapter + yahan entry */
export const PAY_GATEWAYS: Record<string, PayGatewayDef> = {
  SAFEPAY: {
    adapter: safepayAdapter,
    name: 'Safepay',
    credentials: [
      { key: 'publicKey', label: 'Public API key', placeholder: 'sec_…', help: 'Dashboard → Developers' },
      { key: 'secretKey', label: 'Secret key', secret: true, help: 'Dashboard → Developers' },
    ],
    portalUrl: 'https://getsafepay.pk',
    sandboxUrl: 'https://sandbox.api.getsafepay.com/dashboard/signup',
    steps: [
      'getsafepay.pk par merchant account banayein (live ke liye KYC)',
      'Test karna ho to pehle sandbox account (muft, foran) — sandbox aur live ki keys alag hoti hain',
      'Dashboard → Developers se Public key (sec_…) aur Secret key copy karke yahan daalein',
    ],
    methods: ['Debit / credit card', 'Wallets', 'Raast'],
    fees: 'Card 2.9% + Rs 30, wallet / Raast 1.5% (Safepay ki website ke mutabiq)',
    color: '#1f6feb',
  },
};

export const payGateway = (code?: string | null) => (code ? PAY_GATEWAYS[code.toUpperCase()] : undefined);
