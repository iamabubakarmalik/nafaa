/**
 * Yes/no question in the design-system dialog, used where a step needs one
 * more look before it runs (closing a plan with items left, removing a line).
 *
 *   const [ask, confirmDialog] = useConfirm();
 *   if (await ask({ title: 'Hatayein?', danger: true })) remove();
 *   …render {confirmDialog}
 */

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Button, Modal } from '@/design-system/components';
import { t } from '@core/i18n';

interface Ask { title: string; text?: ReactNode; yes?: string; danger?: boolean }

export function useConfirm(): [(q: Ask) => Promise<boolean>, ReactNode] {
  const [q, setQ] = useState<Ask | null>(null);
  const done = useRef<((v: boolean) => void) | null>(null);
  const ask = useCallback((next: Ask) => new Promise<boolean>((resolve) => { done.current = resolve; setQ(next); }), []);
  const close = (v: boolean) => { done.current?.(v); done.current = null; setQ(null); };
  const dialog = q && (
    <Modal open onClose={() => close(false)} size="sm" title={q.title} description={typeof q.text === 'string' ? q.text : undefined}
      footer={<>
        <Button variant="secondary" onClick={() => close(false)}>{t('Rehne dein')}</Button>
        <Button data-autofocus variant={q.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{q.yes ?? t('Haan')}</Button>
      </>}>
      {typeof q.text === 'string' ? null : q.text}
    </Modal>
  );
  return [ask, dialog];
}
