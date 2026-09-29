import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, Pencil, StickyNote, Tag, X } from 'lucide-react';
import { Button } from '@core/ui/Button';
import { Modal } from '@core/ui/Modal';
import { apiErrorMessage, onlineOrdersApi, type OnlineOrderDetail } from '../api/online-orders.api';
import { whenText } from '../lib/labels';
import { inputCls } from './ui/kit';
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
    <section className="rounded-2xl border border-slate-200 p-4 dark:border-neutral-800">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex-1 text-[11px] font-black uppercase tracking-wider text-slate-400">Staff (customer ko nahi dikhta)</span>
        {canEdit && <Button size="xs" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditOpen(true)}>Details badlein</Button>}
        {o.customerPhone && (blocked
          ? <Button size="xs" variant="ghost" loading={unblock.isPending} onClick={() => unblock.mutate()}>Unblock</Button>
          : <Button size="xs" variant="ghost" className="text-rose-600" leftIcon={<Ban className="h-3.5 w-3.5" />} onClick={() => setBlockOpen(true)}>Number block</Button>)}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Tag className="h-3.5 w-3.5 text-slate-400" />
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-neutral-800 dark:text-slate-200">
            {t}
            <button onClick={() => saveTags.mutate(tags.filter((x) => x !== t))} aria-label={`${t} hatao`}><X className="h-3 w-3" /></button>
          </span>
        ))}
        {QUICK_TAGS.filter((t) => !tags.includes(t)).slice(0, 4).map((t) => (
          <button key={t} onClick={() => addTag(t)} className="rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:border-slate-500 dark:border-neutral-700">+ {t}</button>
        ))}
        <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addTag(tagDraft); }}
          placeholder="Naya tag…" maxLength={30} className="h-6 w-24 rounded-md border border-slate-200 bg-transparent px-2 text-[11px] outline-none dark:border-neutral-700" />
      </div>

      {/* Notes */}
      <div className="mt-3 space-y-1.5">
        {notes.map((n) => (
          <div key={n.id} className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
            <div className="whitespace-pre-wrap">{n.text}</div>
            <div className="mt-0.5 text-[10.5px] font-semibold opacity-70">{n.byName ?? 'Staff'} · {whenText(n.at)}</div>
          </div>
        ))}
        <div className="flex gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && note.trim()) addNote.mutate(); }}
            placeholder="Andar ka note — jaise: customer ne 5 baje ke baad bola" maxLength={500} className={cn(inputCls, 'h-8 text-[12.5px]')} />
          <Button size="xs" variant="outline" disabled={!note.trim()} loading={addNote.isPending} onClick={() => addNote.mutate()} leftIcon={<StickyNote className="h-3.5 w-3.5" />}>Note</Button>
        </div>
      </div>

      {edits.length > 0 && (
        <details className="mt-3 text-[12px] text-slate-500">
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
    </section>
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
        <L label="Naam"><input value={v.customerName} onChange={set('customerName')} className={inputCls} maxLength={100} /></L>
        <L label="Phone"><input value={v.customerPhone} onChange={set('customerPhone')} className={inputCls} maxLength={20} placeholder="03xxxxxxxxx" /></L>
        <div className="sm:col-span-2"><L label="Address"><textarea value={v.customerAddress} onChange={set('customerAddress')} className={cn(inputCls, 'h-20 py-2')} maxLength={400} /></L></div>
        <L label="Shehar"><input value={v.customerCity} onChange={set('customerCity')} className={inputCls} maxLength={80} /></L>
        <L label="Customer ka note"><input value={v.notes} onChange={set('notes')} className={inputCls} maxLength={500} /></L>
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
          <button key={r} onClick={() => setReason(r)} className={cn('rounded-lg border px-2.5 py-1 text-xs font-bold', reason === r ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 dark:border-neutral-700 dark:text-slate-200')}>{r}</button>
        ))}
      </div>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Wajah (optional)" className={cn(inputCls, 'mt-2')} maxLength={200} />
    </Modal>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>{children}</label>;
}

