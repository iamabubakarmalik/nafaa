/**
 * Takes money outside the POS checkout (an advance, a delivery payment, a
 * later instalment): the amount and how it came in. Used where screens used
 * to ask only for an amount, so the money lands in the right account.
 */

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, Input, Modal } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import { t } from '@core/i18n';

export function TakePaymentModal({
  title, description, amount: initial, max, allowZero, hint, confirmLabel = t('Payment lein'), loading, onConfirm, onClose,
}: {
  title: string;
  description?: string;
  /** Amount filled in when the dialog opens. */
  amount: number;
  /** Highest amount allowed (what is still due). */
  max?: number;
  /** Zero is allowed (deliver now, all on khata). */
  allowZero?: boolean;
  /** Line under the amount; left out, shows what stays due. */
  hint?: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: (amount: number, method: PaymentMethod) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(String(initial));
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const amount = Number(value);
  const valid = Number.isFinite(amount) && (allowZero ? amount >= 0 : amount > 0) && (max === undefined || amount <= max + 0.01);
  const left = max !== undefined ? Math.max(max - (Number.isFinite(amount) ? amount : 0), 0) : 0;
  const error = value !== '' && !valid
    ? (max !== undefined && amount > max + 0.01 ? t('Zyada se zyada {{max}}', { max: formatPKR(max) }) : t('Amount sahi likhein'))
    : undefined;

  return (
    <Modal open onClose={onClose} size="sm" title={title} description={description}
      footer={
        <div className="flex w-full gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>{t('Cancel')}</Button>
          <Button className="flex-1" loading={loading} disabled={!valid} onClick={() => onConfirm(Math.round(amount * 100) / 100, method)}>
            <CheckCircle2 className="h-4 w-4" /> {confirmLabel}
          </Button>
        </div>
      }>
      <div className="space-y-4">
        <Input label={t('Amount (Rs)')} inputMode="decimal" autoFocus value={value} error={error}
          onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))}
          hint={hint ?? (max !== undefined ? (left > 0.005 ? t('Baqi {{left}} customer ke khate me rahega', { left: formatPKR(left) }) : t('Poora baqi wasool')) : undefined)} />
        {amount > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
      </div>
    </Modal>
  );
}
