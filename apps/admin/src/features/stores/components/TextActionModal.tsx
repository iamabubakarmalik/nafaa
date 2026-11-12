/**
 * Confirm step for a store action that takes text: a required reason
 * (suspend) or an optional message (force password). The text is cleared
 * every time the modal opens.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Button, Modal, Textarea } from '@/design-system/components';

export function TextActionModal({
  open, onClose, onConfirm, title, description, label, placeholder, hint, yes, danger, busy, required = true, maxLength = 300, children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (text: string) => void;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  hint?: ReactNode;
  yes: string;
  danger?: boolean;
  busy?: boolean;
  /** When true the button stays off until at least 3 characters are typed. */
  required?: boolean;
  maxLength?: number;
  children?: ReactNode;
}) {
  const [text, setText] = useState('');
  useEffect(() => { if (open) setText(''); }, [open]);
  const ok = !required || text.trim().length >= 3;
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={busy} disabled={!ok} onClick={() => onConfirm(text.trim())}>{yes}</Button>
      </>}>
      <div className="space-y-3">
        {children}
        <Textarea label={label} rows={3} value={text} maxLength={maxLength} onChange={(e) => setText(e.target.value)} placeholder={placeholder} hint={hint} required={required} autoFocus />
      </div>
    </Modal>
  );
}
