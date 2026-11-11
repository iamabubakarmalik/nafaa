/**
 * Internal notes for one shop. Only the admin team sees them. Used on the
 * shop detail page: add, edit, pin and delete notes.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Pin, PinOff, Plus, StickyNote, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, Checkbox, EmptyState, Input, Modal, Skeleton, Textarea, confirmDialog } from '@/design-system/components';
import { adminNotesApi, type TenantNote } from '@/api/admin-notes.api';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';

export default function TenantNotesPanel({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TenantNote | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  const notes = useQuery({ queryKey: ['admin-notes', tenantId], queryFn: () => adminNotesApi.list(tenantId) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-notes', tenantId] });
  const fail = (e: any) => toast.error(e?.response?.data?.message || 'Could not save the note');

  const close = () => { setOpen(false); setEditing(null); setTitle(''); setContent(''); setIsPinned(false); };

  const save = useMutation({
    mutationFn: () => editing
      ? adminNotesApi.update(editing.id, { tenantId, title, content, isPinned })
      : adminNotesApi.create({ tenantId, title, content, isPinned }),
    onSuccess: () => { toast.success(editing ? 'Note updated' : 'Note added'); close(); refresh(); },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: adminNotesApi.remove,
    onSuccess: () => { toast.success('Note deleted'); refresh(); },
    onError: fail,
  });
  const pin = useMutation({
    mutationFn: (n: TenantNote) => adminNotesApi.update(n.id, { tenantId, content: n.content, isPinned: !n.isPinned }),
    onSuccess: refresh,
    onError: fail,
  });

  const startEdit = (n: TenantNote) => {
    setEditing(n); setTitle(n.title || ''); setContent(n.content); setIsPinned(n.isPinned); setOpen(true);
  };
  const onDelete = async (n: TenantNote) => {
    if (await confirmDialog({ title: 'Delete this note?', text: 'This cannot be undone.', yes: 'Delete', danger: true })) remove.mutate(n.id);
  };
  const submit = () => {
    if (!content.trim()) return toast.error('Write the note first');
    save.mutate();
  };

  const list = notes.data ?? [];
  const iconBtn = 'flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100';

  return (
    <>
      <Card
        title="Internal notes"
        description={`${list.length} ${list.length === 1 ? 'note' : 'notes'}. Only admins can see these.`}
        actions={<Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>Add note</Button>}
      >
        {notes.isLoading ? (
          <div className="space-y-2"><Skeleton className="h-14 rounded-xl" /><Skeleton className="h-14 rounded-xl" /></div>
        ) : list.length === 0 ? (
          <EmptyState icon={<StickyNote className="h-6 w-6" />} title="No notes yet" description="Add context about this shop for the rest of the team." />
        ) : (
          <ul className="max-h-[26rem] space-y-2 overflow-y-auto">
            {list.map((n) => (
              <li key={n.id} className={cn('rounded-xl p-3 ring-1', n.isPinned ? 'bg-amber-50 ring-amber-200' : 'bg-white ring-slate-200')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 text-[0.75rem] text-slate-500">
                      {n.isPinned && <Pin className="h-3 w-3 text-amber-600" />}
                      {n.title && <span className="text-[0.875rem] font-semibold text-slate-900">{n.title}</span>}
                      <span>{n.author.fullName}</span>
                      <span>{formatRelative(n.createdAt)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[0.875rem] text-slate-700">{n.content}</p>
                  </div>
                  <div className="flex shrink-0">
                    <button type="button" className={iconBtn} onClick={() => pin.mutate(n)} aria-label={n.isPinned ? 'Unpin note' : 'Pin note'}>
                      {n.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </button>
                    <button type="button" className={iconBtn} onClick={() => startEdit(n)} aria-label="Edit note"><Edit className="h-4 w-4" /></button>
                    <button type="button" className={cn(iconBtn, 'text-rose-600 hover:bg-rose-50')} onClick={() => onDelete(n)} aria-label="Delete note"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={open}
        onClose={close}
        title={editing ? 'Edit note' : 'New note'}
        footer={
          <>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button onClick={submit} loading={save.isPending}>{editing ? 'Save changes' : 'Add note'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What is this about?" />
          <Textarea label="Note" value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Write for the admin team" />
          <Checkbox label="Pin to the top" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />
        </div>
      </Modal>
    </>
  );
}
