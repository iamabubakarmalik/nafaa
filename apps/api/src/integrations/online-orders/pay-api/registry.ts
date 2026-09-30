import { easypaisaAdapter } from './easypaisa.adapter';
import { jazzcashAdapter } from './jazzcash.adapter';
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
  JAZZCASH: {
    adapter: jazzcashAdapter,
    name: 'JazzCash',
    credentials: [
      { key: 'merchantId', label: 'Merchant ID', placeholder: 'MC12345' },
      { key: 'password', label: 'Password', secret: true },
      { key: 'integritySalt', label: 'Integrity Salt', secret: true, help: 'JazzCash merchant portal → Integration' },
    ],
    portalUrl: 'https://www.jazzcash.com.pk/corporate/online-payment-gateway/',
    sandboxUrl: 'https://sandbox.jazzcash.com.pk',
    steps: [
      'JazzCash se "Online Payment Gateway" merchant account lein (JazzCash business / account manager)',
      'Merchant portal me Integration: Merchant ID, Password aur Integrity Salt milte hain',
      'Pehle sandbox keys se test karein, phir live keys',
    ],
    methods: ['JazzCash mobile account'],
    fees: 'JazzCash merchant rate (agreement ke mutabiq)',
    color: '#d71f26',
  },
  EASYPAISA: {
    adapter: easypaisaAdapter,
    name: 'Easypaisa',
    credentials: [
      { key: 'storeId', label: 'Store ID', placeholder: '12345' },
      { key: 'accountNum', label: 'Merchant account number', help: 'Easypay portal → Profile' },
      { key: 'username', label: 'Partner username', help: 'Portal → Manage Partner Accounts' },
      { key: 'password', label: 'Partner password', secret: true },
    ],
    portalUrl: 'https://easypay.easypaisa.com.pk',
    sandboxUrl: 'https://easypaystg.easypaisa.com.pk',
    steps: [
      'Easypaisa "Easypay" merchant account lein (Telenor Microfinance Bank)',
      'Portal → Profile se Store ID aur account number; "Manage Partner Accounts" se username / password banayein',
      'Mobile Account (MA) payment method aap ke store par chalu ho — na ho to Easypaisa se chalu karwayein',
    ],
    methods: ['Easypaisa mobile account'],
    fees: 'Easypaisa merchant rate (agreement ke mutabiq)',
    color: '#10b981',
  },
};

export const payGateway = (code?: string | null) => (code ? PAY_GATEWAYS[code.toUpperCase()] : undefined);
