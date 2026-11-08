/**
 * Asks for the extra detail some moves need: a reason for Cancelled and
 * Returned, and an optional CN and courier for Dispatched. Used by the row
 * Status menu and the bulk bar.
 */

import { useState } from 'react';
import { Button, Input, Modal, Select } from '@/design-system/components';
import type { BoardEntry } from '../../lib/orders';
import { COURIER_OPTIONS } from '../../lib/labels';
import { t } from '@core/i18n';

export interface MoveExtra { reason?: string; trackingNumber?: string; courierCode?: string }

/** Whether moving to this status asks for more detail first. */
export const moveNeedsDetail = (to: string) => to === 'CANCELLED' || to === 'RETURNED' || to === 'DISPATCHED';

export function MoveDialog({ entry, count, loading, onClose, onConfirm }: {
  entry: BoardEntry;
  /** How many orders move (1 for a row). */
  count: number;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (extra: MoveExtra) => void;
}) {
  const [reason, setReason] = useState('');
  const [cn, setCn] = useState('');
  const [courier, setCourier] = useState('');
  const dispatch = entry.key === 'DISPATCHED';
  const needsReason = entry.key === 'CANCELLED';
  const ok = !needsReason || reason.trim().length > 0;
  const title = count > 1 ? t('{{count}} orders → {{status}}', { count, status: entry.label }) : t('Order → {{status}}', { status: entry.label });

  return (
    <Modal open onClose={onClose} size="sm" title={title}
      description={dispatch ? t('CN ho to likh dein — customer ko tracking milegi. Courier se book kiya ho to khali chhor dein.')
        : entry.key === 'CANCELLED' ? t('Bill bana ho to void ho jayega aur stock wapas aa jayega.')
          : t('Parcel wapas mil gaya? Stock wapas aa jayega.')}
      footer={<div className="flex w-full justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button variant={entry.key === 'CANCELLED' ? 'danger' : 'primary'} disabled={!ok} loading={loading}
          onClick={() => onConfirm({ reason: reason.trim() || undefined, trackingNumber: cn.trim() || undefined, courierCode: courier || undefined })}>
          {t('Haan, {{status}}', { status: entry.label })}
        </Button>
      </div>}>
      <div className="space-y-3">
        {dispatch ? (
          <>
            <Select label={t('Courier')} value={courier} onChange={(e) => setCourier(e.target.value)} placeholder={t('Chunein (zaroori nahi)')}
              options={COURIER_OPTIONS.map((c) => ({ value: c.code, label: c.name }))} />
            {count === 1 && <Input label={t('CN / tracking number')} value={cn} onChange={(e) => setCn(e.target.value)} placeholder="e.g. 1234567890" />}
          </>
        ) : (
          <Input autoFocus label={needsReason ? t('Wajah') : t('Wajah (zaroori nahi)')} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder={needsReason ? t('Jaise: Fake order, customer ne mana kiya') : t('Jaise: Customer ghar par nahi tha')} />
        )}
      </div>
    </Modal>
  );
}
