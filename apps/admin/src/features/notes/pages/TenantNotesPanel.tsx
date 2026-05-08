import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StickyNote, Plus, Trash2, Pin, PinOff, X, Edit } from 'lucide-react';
import { adminNotesApi, type TenantNote } from '@/api/admin-notes.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

export default function TenantNotesPanel({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TenantNote | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  const { data: notes = [] } = useQuery({
    queryKey: ['admin-notes', tenantId],
    queryFn: () => adminNotesApi.list(tenantId),
  });

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? adminNotesApi.update(editing.id, { tenantId, title, content, isPinned })
      : adminNotesApi.create({ tenantId, title, content, isPinned }),
    onSuccess: () => {
      toast.success(editing ? 'Note updated' : 'Note added');
      setShowForm(false);
      setEditing(null);
      setTitle('');
      setContent('');
      setIsPinned(false);
      queryClient.invalidateQueries({ queryKey: ['admin-notes', tenantId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminNotesApi.remove,
    onSuccess: () => {
      toast.success('Note deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-notes', tenantId] });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: (note: TenantNote) =>
      adminNotesApi.update(note.id, { tenantId, content: note.content, isPinned: !note.isPinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notes', tenantId] });
    },
  });

  const startEdit = (note: TenantNote) => {
    setEditing(note);
    setTitle(note.title || '');
    setContent(note.content);
    setIsPinned(note.isPinned);
    setShowForm(true);
  };

  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-amber-600" />
          <h3 className="font-bold">Internal Notes</h3>
          <span className="text-xs text-slate-500">({notes.length})</span>
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setEditing(null); }}>
          <Plus className="h-4 w-4" /> Add Note
        </Button>
      </div>

      {showForm && (
        <div className="p-4 bg-amber-50/50 border-b border-amber-100">
          <div className="flex justify-between mb-3">
            <h4 className="font-semibold">{editing ? 'Edit Note' : 'New Note'}</h4>
            <button onClick={() => { setShowForm(false); setEditing(null); }}>
              <X className="h-4 w-4 text-slate-500" />
            </button>
          </div>
          <div className="space-y-3">
            <Input label="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Important context..." />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Content</label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Internal note for admin team..." />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300" />
              Pin to top
            </label>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1">
                Cancel
              </Button>
              <Button onClick={() => {
                if (!content.trim()) return toast.error('Content likhein');
                saveMutation.mutate();
              }} loading={saveMutation.isPending} className="flex-1">
                {editing ? 'Update' : 'Add Note'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
        {notes.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No notes yet</div>
        ) : notes.map((n) => (
          <div key={n.id} className={`px-6 py-3 ${n.isPinned ? 'bg-amber-50/30' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {n.isPinned && <Pin className="h-3 w-3 text-amber-600" />}
                  {n.title && <span className="font-bold text-slate-900">{n.title}</span>}
                  <span className="text-xs text-slate-500">{n.author.fullName}</span>
                  <span className="text-xs text-slate-400">{formatDate(n.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{n.content}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => togglePinMutation.mutate(n)}
                  className="text-slate-600 hover:bg-slate-100 rounded p-1.5">
                  {n.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => startEdit(n)}
                  className="text-slate-600 hover:bg-slate-100 rounded p-1.5">
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(n.id); }}
                  className="text-rose-600 hover:bg-rose-50 rounded p-1.5">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
