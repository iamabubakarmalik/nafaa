/**
 * "Sab overdue ko bhejein": the overdue customers with a phone number in a
 * list. WhatsApp opens for one customer at a time (a browser lets one page
 * open one tab per click), each row is ticked once opened, and "Agla"
 * moves down the list.
 */

import { useMemo, useState } from 'react';
import { CheckCircle2, MessageCircle, SkipForward } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { RecoveryRow } from '../api/distribution.api';
import { partyName, rs } from '../lib/meta';
import { hasWhatsapp, reminderLink } from '../lib/reminder';

export function ReminderQueue({ rows, shop, onClose }: { rows: RecoveryRow[]; shop: string; onClose: () => void }) {
  const list = useMemo(() => rows.filter((r) => r.overdue && r.balance > 0 && hasWhatsapp(r.customer.phone)), [rows]);
  const noPhone = rows.filter((r) => r.overdue && r.balance > 0 && !hasWhatsapp(r.customer.phone)).length;
  const [sent, setSent] = useState<Set<string>>(new Set());
  const next = list.find((r) => !sent.has(r.customer.id));

  const open = (r: RecoveryRow) => {
    const url = reminderLink(r.customer, r.balance, r.dueDays, shop);
    if (!url) return;
    window.open(url, '_blank', 'noopener');
    setSent((s) => new Set(s).add(r.customer.id));
  };

  return (
    <Modal open onClose={onClose} size="md" title="Sab overdue ko WhatsApp"
      description={`${list.length} customers · ek ek kar ke WhatsApp khulega, wahan Send dabayein`}
      footer={<>
        <span className="mr-auto text-[0.75rem] text-slate-500">{sent.size}/{list.length} bheje</span>
        <Button variant="secondary" onClick={onClose}>Band karein</Button>
        <Button disabled={!next} leftIcon={<MessageCircle className="h-4 w-4" />} onClick={() => next && open(next)}>
          {next ? (sent.size ? 'Agla bhejein' : 'Pehla bhejein') : 'Sab ho gaye'}
        </Button>
      </>}>
      {!list.length ? (
        <p className="text-[0.875rem] text-slate-600">Kisi overdue customer ka phone number nahi — customer me phone likhein.</p>
      ) : (
        <ul className="-mx-1 max-h-[60vh] divide-y divide-slate-100 overflow-auto">
          {list.map((r) => {
            const done = sent.has(r.customer.id);
            const isNext = next?.customer.id === r.customer.id;
            return (
              <li key={r.customer.id} className={cn('flex items-center gap-3 px-1 py-2.5', isNext && 'bg-success-50/50')}>
                {done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success-600" /> : <span className="h-5 w-5 shrink-0 rounded-full ring-2 ring-slate-200" />}
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-[0.875rem] font-semibold', done ? 'text-slate-400' : 'text-slate-900')}>{partyName(r.customer)}</span>
                  <span className="block truncate text-[0.75rem] text-slate-500">{rs(r.balance)}{r.dueDays ? ` · ${r.dueDays} din purana` : ''} · {r.customer.phone}</span>
                </span>
                <button type="button" onClick={() => open(r)} title={done ? 'Dobara kholein' : 'WhatsApp kholein'}
                  className={cn('flex h-9 shrink-0 items-center gap-1 rounded-xl px-3 text-[0.8125rem] font-semibold', done ? 'text-slate-500 hover:bg-slate-100' : 'bg-success-600 text-white hover:bg-success-700')}>
                  {done ? <SkipForward className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}{done ? 'Dobara' : 'Bhejein'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {noPhone > 0 && <p className="mt-3 text-[0.75rem] text-slate-500">{noPhone} overdue customers ka phone number nahi, wo is list me nahi.</p>}
    </Modal>
  );
}
