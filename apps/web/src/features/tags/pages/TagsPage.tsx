import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Hash, Plus, Edit3, Trash2, X, Save } from 'lucide-react';
import { tagsApi, type Tag, type UpsertTagPayload } from '@/api/tags.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

const COLORS = [
  '#16a34a', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#14b8a6', '#84cc16', '#a855f7', '#f97316',
];

const empty: UpsertTagPayload = { name: '', color: '#16a34a' };

export default function TagsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [form, setForm] = useState<UpsertTagPayload>(empty);

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? tagsApi.update(editing.id, form) : tagsApi.create(form),
    onSuccess: () => {
      toast.success(editing ? 'Tag updated' : 'Tag created');
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      close();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const removeMutation = useMutation({
    mutationFn: tagsApi.remove,
    onSuccess: () => {
      toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const close = () => {
    setShowForm(false);
    setEditing(null);
    setForm(empty);
  };

  const openEdit = (t: Tag) => {
    setEditing(t);
    setForm({ name: t.name, color: t.color });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-pink-900 to-pink-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Hash className="h-3.5 w-3.5" /> Searchable Tags
            </div>
            <h2 className="mt-3 text-3xl font-bold">Tags</h2>
            <p className="mt-2 text-sm text-white/80">
              Organic, halal, imported, premium — labels for fast filtering
            </p>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setForm(empty);
              setShowForm(true);
            }}
            className="bg-white text-slate-900 hover:bg-slate-100"
          >
            <Plus className="h-4 w-4" /> New Tag
          </Button>
        </div>
      </section>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        {tags.length === 0 ? (
          <div className="text-center py-10">
            <Hash className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="mt-4 font-bold text-slate-900">No tags yet</h3>
            <p className="text-sm text-slate-500 mt-2">Add tags to label your products</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <div
                key={t.id}
                className="inline-flex items-center gap-2 rounded-full pl-3 pr-1 py-1.5 border-2"
                style={{
                  backgroundColor: `${t.color}15`,
                  borderColor: `${t.color}40`,
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-sm font-bold" style={{ color: t.color }}>
                  {t.name}
                </span>
                <span className="text-xs text-slate-500">
                  ({t._count?.products ?? 0})
                </span>
                <div className="flex">
                  <button
                    onClick={() => openEdit(t)}
                    className="h-7 w-7 rounded-full hover:bg-white/60 flex items-center justify-center"
                  >
                    <Edit3 className="h-3 w-3" style={{ color: t.color }} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete tag "${t.name}"?`)) removeMutation.mutate(t.id);
                    }}
                    className="h-7 w-7 rounded-full hover:bg-white/60 flex items-center justify-center"
                  >
                    <Trash2 className="h-3 w-3 text-rose-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-xl">{editing ? 'Edit Tag' : 'New Tag'}</h3>
              <button onClick={close} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label="Tag Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="organic, halal, imported..."
              />

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className={`h-12 rounded-xl border-2 transition ${
                        form.color === c ? 'border-slate-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs text-slate-500 mb-1.5">Preview</div>
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border-2"
                  style={{
                    backgroundColor: `${form.color}15`,
                    borderColor: `${form.color}40`,
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: form.color }} />
                  <span className="text-sm font-bold" style={{ color: form.color }}>
                    {form.name || 'Tag preview'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={close} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!form.name.trim()) return toast.error('Name required');
                    saveMutation.mutate();
                  }}
                  loading={saveMutation.isPending}
                  className="flex-1"
                >
                  <Save className="h-4 w-4" /> Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
