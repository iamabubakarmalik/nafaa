/** A small modal that asks for one line of text (a reason or a reference) before an action. */

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Input, Modal, Textarea } from '@/design-system/components';

export function ReasonModal({
  open, onClose, onConfirm, title, description, label, placeholder, yes, danger, busy, minLength = 3, multiline = true, children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  description?: ReactNode;
  label: string;
  placeholder?: string;
  yes: string;
  danger?: boolean;
  busy?: boolean;
  minLength?: number;
  multiline?: boolean;
  children?: ReactNode;
}) {
  const [value, setValue] = useState('');
  useEffect(() => { if (open) setValue(''); }, [open]);
  const ok = value.trim().length >= minLength;
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} loading={busy} disabled={!ok} onClick={() => onConfirm(value.trim())}>{yes}</Button></div>}>
      <div className="space-y-3">
        {children}
        {multiline
          ? <Textarea label={label} rows={3} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} autoFocus />
          : <Input label={label} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} autoFocus />}
      </div>
    </Modal>
  );
}
