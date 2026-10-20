/**
 * Yes/no question in the design-system dialog, in place of the browser's
 * window.confirm. Mount <ConfirmHost /> once at the app root; then anywhere:
 *
 *   if (await confirmDialog({ title: 'Hatayein?', danger: true })) remove();
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmOptions {
  title: string;
  text?: ReactNode;
  /** Label of the yes button. */
  yes?: string;
  /** Red yes button for steps that remove or stop something. */
  danger?: boolean;
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

let show: ((p: Pending) => void) | null = null;

/** Opens the dialog; resolves true on yes, false on no or close. Without a host it falls back to the browser dialog. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  if (!show) return Promise.resolve(window.confirm([options.title, typeof options.text === 'string' ? options.text : ''].filter(Boolean).join('\n\n')));
  return new Promise((resolve) => show!({ ...options, resolve }));
}

export function ConfirmHost() {
  const [q, setQ] = useState<Pending | null>(null);
  useEffect(() => {
    show = (p) => setQ((prev) => { prev?.resolve(false); return p; });
    return () => { show = null; };
  }, []);
  if (!q) return null;
  const close = (ok: boolean) => { q.resolve(ok); setQ(null); };
  return (
    <Modal open onClose={() => close(false)} size="sm" title={q.title} description={typeof q.text === 'string' ? q.text : undefined}
      footer={<>
        <Button variant="secondary" onClick={() => close(false)}>Rehne dein</Button>
        <Button data-autofocus variant={q.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{q.yes ?? 'Haan'}</Button>
      </>}>
      {typeof q.text === 'string' ? null : q.text}
    </Modal>
  );
}
