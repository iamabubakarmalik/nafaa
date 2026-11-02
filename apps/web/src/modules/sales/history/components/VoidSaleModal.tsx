/** Void a bill: stock comes back, credit leaves the khata, the bill stays on record marked voided. */

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button, Input, Modal } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import type { HistorySale } from '../api';
import { t as tr } from '@core/i18n';

export function VoidSaleModal({ sale, loading, onConfirm, onClose }: {
  sale: HistorySale; loading?: boolean; onConfirm: (reason: string) => void; onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <Modal open onClose={onClose} size="sm" title={tr('Ye bill wapas lein?')} description={`${sale.saleNumber} · ${formatPKR(sale.total)}`}
      footer={<>
        <Button variant="ghost" onClick={onClose}>{tr('Rehne dein')}</Button>
        <Button variant="danger" loading={loading} onClick={() => onConfirm(reason.trim() || tr('Sale wapas li gayi'))}>{tr('Haan, wapas lein')}</Button>
      </>}>
      <div className="space-y-3">
        <ul className="space-y-1.5 rounded-xl bg-success-50 p-3 text-[0.8125rem] text-success-900">
          {[tr('Bika hua maal stock mein wapas'), tr('Udhaar tha to khate se hat jayega'), tr('Reports aur profit theek ho jayenge'), tr('Bill mitega nahi — "wapas li gayi" ka nishan lagega')].map((t) => (
            <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0" />{t}</li>
          ))}
        </ul>
        <Input label={tr('Wajah (zaroori nahi)')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tr('Demo bill / ghalat bill ban gaya')} autoFocus />
      </div>
    </Modal>
  );
}
