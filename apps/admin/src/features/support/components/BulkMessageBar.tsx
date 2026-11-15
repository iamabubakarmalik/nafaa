/**
 * Bar above the inbox list when it is opened for several shops
 * (/support?tenants=a,b,c, e.g. from the Journey page's "Stuck shops"):
 * how many shops are selected, and "Message all", which sends the same text
 * into each shop's active chat (or starts one). Confirmed first; at most 50.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send, Users, X } from 'lucide-react';
import { Button, Modal, Textarea, confirmDialog } from '@/design-system/components';
import { adminSupportApi } from '@/api/admin-support.api';
import { apiError } from '@/lib/errors';
import { SUPPORT_KEYS } from './SupportLive';

export const BULK_MAX = 50;

export function BulkMessageBar({ tenantIds, withChat, canReply, onClear }: {
  tenantIds: string[];
  /** Selected shops that already have a chat in the list. */
  withChat: number;
  canReply: boolean;
  onClear: () => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const targets = tenantIds.slice(0, BULK_MAX);
  const over = tenantIds.length - targets.length;

  const send = useMutation({
    mutationFn: () => adminSupportApi.bulkStart({ tenantIds: targets, text: text.trim() }),
    onSuccess: (r) => {
      if (r.failed) toast.warning(`Sent to ${r.sent} shop${r.sent === 1 ? '' : 's'}; ${r.failed} failed (${r.results.find((x) => x.error)?.error ?? 'error'}).`);
      else toast.success(`Sent to ${r.sent} shop${r.sent === 1 ? '' : 's'}.`);
      setOpen(false);
      setText('');
      void qc.invalidateQueries({ queryKey: SUPPORT_KEYS.list });
      void qc.invalidateQueries({ queryKey: SUPPORT_KEYS.counts });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const submit = async () => {
    if (!text.trim()) return;
    const ok = await confirmDialog({
      title: `Send to ${targets.length} shop${targets.length === 1 ? '' : 's'}?`,
      text: `Each shop gets this message in its own chat${over > 0 ? `. Only the first ${BULK_MAX} of ${tenantIds.length} selected shops are sent to` : ''}.`,
      yes: 'Send to all',
    });
    if (ok) send.mutate();
  };

  return (
    <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-[0.8125rem] text-brand-900">
      <Users className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        {tenantIds.length} shop{tenantIds.length === 1 ? '' : 's'} selected · {withChat} with a chat
      </span>
      {canReply && (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
          <Send className="h-3.5 w-3.5" /> Message all
        </button>
      )}
      <button type="button" onClick={onClear} className="rounded-full p-1 text-brand-700 hover:bg-brand-100" aria-label="Show all chats">
        <X className="h-3.5 w-3.5" />
      </button>

      {open && (
        <Modal
          open
          onClose={() => setOpen(false)}
          title="Message all selected shops"
          description={`The same message goes into each shop's chat (a new chat if they have none).${over > 0 ? ` At most ${BULK_MAX} shops at a time: the first ${BULK_MAX} of ${tenantIds.length} get it.` : ''}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => void submit()} disabled={!text.trim() || send.isPending}>
                {send.isPending ? 'Sending…' : `Send to ${targets.length}`}
              </Button>
            </>
          }
        >
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={4000} aria-label="Message" placeholder="Assalam o Alaikum! Nafaa team here…" />
        </Modal>
      )}
    </div>
  );
}
