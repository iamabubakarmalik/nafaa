import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, Pencil, StickyNote, Tag, X } from 'lucide-react';
import { Badge, Button, Card, controlClass, Input, Modal, Textarea } from '@/design-system/components';
import { apiErrorMessage, onlineOrdersApi, type OnlineOrderDetail } from '../api/online-orders.api';
import { whenText } from '../lib/labels';
import { cn } from '@core/lib/cn';

const QUICK_TAGS = ['VIP', 'Gift', 'Urgent', 'Exchange', 'Call pehle', 'Advance liya'];
const FIELD_LABEL: Record<string, string> = { customerName: 'Naam', customerPhone: 'Phone', customerAddress: 'Address', customerCity: 'Shehar', notes: 'Customer note' };

/**
 * Staff ke auzaar — customer ko kuch nahi dikhta: details theek karna,
 * number block, tags, andar ke notes, aur kis ne kya badla.
 */
export function OrderExtras({ order: o, onChanged }: { order: OnlineOrderDetail; onChanged: () => void }) {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [note, setNote] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const tags = o.metadata?.tags ?? [];
  const notes = o.metadata?.internalNotes ?? [];
  const edits = o.metadata?.edits ?? [];
  const blocked = o.risk?.level === 'BLOCKED';

  const addNote = useMutation({
    mutationFn: () => onlineOrdersApi.addNote(o.id, note.trim()),
    onSuccess: () => { setNote(''); onChanged(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const saveTags = useMutation({
    mutationFn: (next: string[]) => onlineOrdersApi.setTags(o.id, next),
    onSuccess: () => { setTagDraft(''); onChanged(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const unblock = useMutation({
    mutationFn: () => onlineOrdersApi.unblock(o.customerPhone ?? ''),
    onSuccess: () => { toast.success('Number unblock ho gaya'); onChanged(); qc.invalidateQueries({ queryKey: ['online-orders'] }); qc.invalidateQueries({ queryKey: ['blocklist'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const closed = ['CANCELLED', 'REJECTED', 'RETURNED', 'DELIVERED'].includes(o.orderStatus);
  const canEdit = !closed && !o.dispatchedAt && !o.courierBooked;
  const addTag = (t: string) => {
    const v = t.trim();
    if (!v || tags.includes(v)) return;
    saveTags.mutate([...tags, v].slice(0, 10));
  };

  return (
    <Card>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex-1 text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">Staff (customer ko nahi dikhta)</span>
        {canEdit && <Button size="xs" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditOpen(true)}>Details badlein</Button>}
        {o.customerPhone && (blocked
          ? <Button size="xs" variant="ghost" loading={unblock.isPending} onClick={() => unblock.mutate()}>Unblock</Button>
          : <Button size="xs" variant="critical" leftIcon={<Ban className="h-3.5 w-3.5" />} onClick={() => setBlockOpen(true)}>Number block</Button>)}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Tag className="h-3.5 w-3.5 text-slate-400" />
        {tags.map((t) => (
          <Badge key={t} size="xs" className="gap-1 font-bold">
            {t}
            <button type="button" onClick={() => saveTags.mutate(tags.filter((x) => x !== t))} aria-label={`${t} hatao`}><X className="h-3 w-3" /></button>
          </Badge>
        ))}
        {QUICK_TAGS.filter((t) => !tags.includes(t)).slice(0, 4).map((t) => (
          <button key={t} onClick={() => addTag(t)} type="button" className="rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-[0.6875rem] font-semibold text-slate-500 hover:border-slate-400 hover:text-slate-700">+ {t}</button>
        ))}
        <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addTag(tagDraft); }}
          placeholder="Naya tag…" aria-label="Naya tag" maxLength={30} className={cn(controlClass(), 'h-6 w-24 rounded-md px-2 text-[0.6875rem]')} />
      </div>

      {/* Notes */}
      <div className="mt-3 space-y-1.5">
        {notes.map((n) => (
          <div key={n.id} className="rounded-lg bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-inset ring-amber-200">
            <div className="whitespace-pre-wrap">{n.text}</div>
            <div className="mt-0.5 text-[0.65625rem] font-semibold opacity-70">{n.byName ?? 'Staff'} · {whenText(n.at)}</div>
          </div>
        ))}
        <div className="flex gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && note.trim()) addNote.mutate(); }}
            placeholder="Andar ka note — jaise: customer ne 5 baje ke baad bola" aria-label="Andar ka note" maxLength={500} className={cn(controlClass(), 'h-8 px-3 text-[0.78125rem]')} />
          <Button size="xs" variant="outline" disabled={!note.trim()} loading={addNote.isPending} onClick={() => addNote.mutate()} leftIcon={<StickyNote className="h-3.5 w-3.5" />}>Note</Button>
        </div>
      </div>

      {edits.length > 0 && (
        <details className="mt-3 text-[0.75rem] text-slate-500">
          <summary className="cursor-pointer font-bold">Badli hui details ({edits.length})</summary>
          <ul className="mt-1.5 space-y-1">
            {[...edits].reverse().map((e, i) => (
              <li key={i}>
                {whenText(e.at)}: {Object.entries(e.changes).map(([k, v]) => `${FIELD_LABEL[k] ?? k} "${v.from ?? '—'}" → "${v.to ?? '—'}"`).join(', ')}
              </li>
            ))}
          </ul>
        </details>
      )}

      {editOpen && <EditModal o={o} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); onChanged(); }} />}
      {blockOpen && (
        <BlockModal o={o} onClose={() => setBlockOpen(false)} onDone={() => {
          setBlockOpen(false); onChanged();
          qc.invalidateQueries({ queryKey: ['online-orders'] }); qc.invalidateQueries({ queryKey: ['blocklist'] });
        }} />
      )}
    </Card>
  );
}

function EditModal({ o, onClose, onSaved }: { o: OnlineOrderDetail; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState({
    customerName: o.customerName ?? '', customerPhone: o.customerPhone ?? '', customerAddress: o.customerAddress ?? '',
    customerCity: o.customerCity ?? '', notes: o.notes ?? '',
  });
  const save = useMutation({
    mutationFn: () => onlineOrdersApi.editOrder(o.id, v),
    onSuccess: (r) => { toast.success(r.changed ? 'Details badal gayin ✓' : 'Kuch nahi badla'); onSaved(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Modal open onClose={onClose} size="md" title="Customer details badlein" description="Courier booking se pehle. Website par nahi badalta — sirf Nafaa, label aur invoice me."
      footer={<div className="flex w-full justify-end gap-2"><Button variant="ghost" onClick={onClose}>Chhoro</Button><Button variant="primary" loading={save.isPending} disabled={!v.customerName.trim()} onClick={() => save.mutate()}>Save</Button></div>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input size="sm" label="Naam" value={v.customerName} onChange={set('customerName')} maxLength={100} />
        <Input size="sm" label="Phone" value={v.customerPhone} onChange={set('customerPhone')} maxLength={20} placeholder="03xxxxxxxxx" />
        <Textarea wrapperClassName="sm:col-span-2" label="Address" value={v.customerAddress} onChange={set('customerAddress')} rows={3} maxLength={400} />
        <Input size="sm" label="Shehar" value={v.customerCity} onChange={set('customerCity')} maxLength={80} />
        <Input size="sm" label="Customer ka note" value={v.notes} onChange={set('notes')} maxLength={500} />
      </div>
    </Modal>
  );
}

function BlockModal({ o, onClose, onDone }: { o: OnlineOrderDetail; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const block = useMutation({
    mutationFn: () => onlineOrdersApi.block({ phone: o.customerPhone ?? '', name: o.customerName, reason: reason.trim() || undefined }),
    onSuccess: () => { toast.success('Number block — is se aane wale order khud accept nahi honge'); onDone(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`${o.customerPhone} block karein?`}
      description="Is number se naya order aaya to khud accept nahi hoga aur ⛔ nishan lagega. Ye order waise hi rahega — chahein to cancel kar dein."
      footer={<div className="flex w-full justify-end gap-2"><Button variant="ghost" onClick={onClose}>Nahi</Button><Button variant="danger" loading={block.isPending} onClick={() => block.mutate()}>Block</Button></div>}>
      <div className="flex flex-wrap gap-1.5">
        {['Fake order', 'Parcel wapas kiya', 'Phone nahi uthata', 'Badtameezi'].map((r) => (
          <Button key={r} size="xs" variant={reason === r ? 'inverse' : 'secondary'} onClick={() => setReason(r)}>{r}</Button>
        ))}
      </div>
      <Input size="sm" wrapperClassName="mt-2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Wajah (optional)" aria-label="Wajah" maxLength={200} />
    </Modal>
  );
}
