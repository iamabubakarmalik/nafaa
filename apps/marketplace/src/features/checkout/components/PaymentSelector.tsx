import { Wallet, Banknote, CreditCard, Smartphone, Zap, Building2, Check } from 'lucide-react';
import { Card, Badge } from '@/ui';
import { cn } from '@/lib/cn';
import type { PaymentMethod } from '@/types';

interface PaymentSelectorProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  walletBalance?: number;
  supportedMethods?: PaymentMethod[];
}

interface MethodOption {
  value: PaymentMethod;
  label: string;
  description: string;
  icon: any;
  color: string;
  badge?: string;
}

const methods: MethodOption[] = [
  {
    value: 'COD',
    label: 'Cash on Delivery',
    description: 'Pay when order arrives',
    icon: Banknote,
    color: 'from-emerald-500 to-emerald-700',
  },
  {
    value: 'WALLET',
    label: 'Nafaa Wallet',
    description: 'Instant, secure',
    icon: Wallet,
    color: 'from-brand-500 to-brand-700',
    badge: 'Fastest',
  },
  {
    value: 'JAZZCASH',
    label: 'JazzCash',
    description: 'Mobile wallet',
    icon: Smartphone,
    color: 'from-red-500 to-red-700',
  },
  {
    value: 'EASYPAISA',
    label: 'EasyPaisa',
    description: 'Mobile wallet',
    icon: Smartphone,
    color: 'from-emerald-600 to-teal-700',
  },
  {
    value: 'RAAST',
    label: 'Raast',
    description: 'Instant bank transfer',
    icon: Zap,
    color: 'from-blue-500 to-blue-700',
    badge: 'New',
  },
  {
    value: 'CARD',
    label: 'Credit / Debit Card',
    description: 'Visa, Mastercard',
    icon: CreditCard,
    color: 'from-slate-600 to-slate-800',
  },
  {
    value: 'BANK_TRANSFER',
    label: 'Bank Transfer',
    description: 'Direct bank',
    icon: Building2,
    color: 'from-indigo-500 to-indigo-700',
  },
];

export function PaymentSelector({ selected, onSelect, walletBalance, supportedMethods }: PaymentSelectorProps) {
  const available = supportedMethods ? methods.filter((m) => supportedMethods.includes(m.value)) : methods;

  return (
    <div className="space-y-2">
      {available.map((m) => {
        const isSelected = selected === m.value;
        const isDisabled = m.value === 'WALLET' && walletBalance !== undefined && walletBalance <= 0;
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => !isDisabled && onSelect(m.value)}
            disabled={isDisabled}
            className={cn(
              'w-full text-left p-4 rounded-2xl border-2 transition-all',
              isSelected
                ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40'
                : 'border-border bg-surface hover:border-brand-300',
              isDisabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn('h-11 w-11 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0', m.color)}>
                <m.icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm">{m.label}</span>
                  {m.badge && <Badge variant="accent" size="sm">{m.badge}</Badge>}
                </div>
                <div className="text-2xs text-content-muted mt-0.5">
                  {m.value === 'WALLET' && walletBalance !== undefined
                    ? `Balance: PKR ${walletBalance.toFixed(0)}`
                    : m.description}
                </div>
              </div>
              {isSelected && (
                <div className="h-6 w-6 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
