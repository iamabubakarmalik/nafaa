/**
 * F9: the counter's less frequent actions in one list. Arrow keys and Enter,
 * or the action's own shortcut.
 */

import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Kbd, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';

export interface PosMoreAction {
  id: string;
  label: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  keys?: string;
  disabled?: boolean;
  run: () => void;
}

export function PosMoreMenu({ actions, onClose }: { actions: PosMoreAction[]; onClose: () => void }) {
  const list = actions.filter((a) => !a.disabled);
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLElement>(`[data-i="${hi}"]`)?.focus(); }, [hi]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => (i + 1) % list.length); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => (i - 1 + list.length) % list.length); }
  };

  return (
    <Modal open onClose={onClose} size="sm" title={t('Aur kaam')} description={t('↑ ↓ aur Enter, ya har kaam ki apni key')}>
      <ul ref={ref} onKeyDown={onKey} className="-mx-1 space-y-0.5">
        {list.map((a, i) => (
          <li key={a.id}>
            <button type="button" data-i={i} data-autofocus={i === 0 ? true : undefined} onClick={() => { onClose(); a.run(); }} onFocus={() => setHi(i)}
              className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start outline-none transition', hi === i ? 'bg-brand-50 ring-2 ring-brand-500' : 'hover:bg-slate-50')}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><a.icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.875rem] font-semibold text-slate-900">{a.label}</span>
                {a.hint && <span className="block truncate text-[0.75rem] text-slate-500">{a.hint}</span>}
              </span>
              {a.keys && <Kbd>{a.keys}</Kbd>}
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
