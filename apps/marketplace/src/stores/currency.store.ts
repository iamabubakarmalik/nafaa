import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Currency {
  code: string;
  symbol: string;
  label: string;
  rate: number; // Rate against PKR
  flag: string;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'PKR', symbol: 'PKR', label: 'Pakistani Rupee', rate: 1,       flag: '🇵🇰' },
  { code: 'USD', symbol: '$',   label: 'US Dollar',       rate: 0.0036,  flag: '🇺🇸' },
  { code: 'GBP', symbol: '£',   label: 'British Pound',   rate: 0.0028,  flag: '🇬🇧' },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham',      rate: 0.013,   flag: '🇦🇪' },
  { code: 'SAR', symbol: 'SAR', label: 'Saudi Riyal',     rate: 0.013,   flag: '🇸🇦' },
];

interface CurrencyState {
  current: Currency;
  setCurrency: (code: string) => void;
  convert: (pkrAmount: number) => number;
  format: (pkrAmount: number) => string;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      current: SUPPORTED_CURRENCIES[0],
      setCurrency: (code) => {
        const c = SUPPORTED_CURRENCIES.find((cur) => cur.code === code);
        if (c) set({ current: c });
      },
      convert: (pkrAmount) => pkrAmount * get().current.rate,
      format: (pkrAmount) => {
        const c = get().current;
        const converted = pkrAmount * c.rate;
        if (c.code === 'PKR') return `PKR ${Math.round(converted).toLocaleString('en-PK')}`;
        return `${c.symbol} ${converted.toFixed(2)}`;
      },
    }),
    { name: 'marketplace-currency', partialize: (s) => ({ current: s.current }) },
  ),
);
