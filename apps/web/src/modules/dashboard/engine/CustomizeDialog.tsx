/** Show, hide and reorder dashboard widgets. Changes apply and save immediately. */

import { ArrowDown, ArrowUp, Lock } from 'lucide-react';
import { Badge, Button, IconButton, Modal, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { ResolvedWidget } from './useDashboardLayout';

interface Props {
  open: boolean;
  onClose: () => void;
  items: ResolvedWidget[];
  costHidden: boolean;
  onVisible: (id: string, visible: boolean) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onReset: () => void;
  canReset: boolean;
}

export function CustomizeDialog({ open, onClose, items, costHidden, onVisible, onMove, onReset, canReset }: Props) {
  const shown = items.filter((i) => i.visible).length;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Dashboard apni marzi ka"
      description={`${shown} of ${items.length} hisse nazar aa rahe hain. Tarteeb aur pasand aap ke account me save hoti hai — har device par wahi.`}
      footer={
        <>
          <Button variant="ghost" onClick={onReset} disabled={!canReset}>Pehle jaisa</Button>
          <Button onClick={onClose}>Ho gaya</Button>
        </>
      }
    >
      <ul className="-mx-1 divide-y divide-slate-100">
        {items.map(({ widget, visible }, index) => (
          <li key={widget.id} className="flex items-center gap-2 px-1 py-2.5">
            <div className="flex shrink-0 flex-col">
              <IconButton label={`${widget.title} upar`} size="sm" disabled={index === 0} onClick={() => onMove(widget.id, -1)}>
                <ArrowUp className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton label={`${widget.title} neeche`} size="sm" disabled={index === items.length - 1} onClick={() => onMove(widget.id, 1)}>
                <ArrowDown className="h-3.5 w-3.5" />
              </IconButton>
            </div>
            <div className={cn('min-w-0 flex-1', !visible && 'opacity-60')}>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[0.875rem] font-medium text-slate-900">{widget.title}</span>
                {widget.sensitive && costHidden && (
                  <Badge variant="outline" size="xs"><Lock className="mr-1 h-3 w-3" />Cost lock</Badge>
                )}
              </div>
              <p className="text-[0.75rem] text-slate-500">{widget.description}</p>
            </div>
            <Switch
              size="sm"
              checked={visible}
              onChange={(e) => onVisible(widget.id, e.target.checked)}
              aria-label={`${widget.title} dikhayein`}
            />
          </li>
        ))}
      </ul>
      {costHidden && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-600">
          “Cost lock” wale hisse lagat aur munafa dikhate hain — wo tab tak chhupe rahenge jab tak cost khuli na ho.
        </p>
      )}
    </Modal>
  );
}
