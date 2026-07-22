import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  Star, Globe, BookOpen, Award,
} from 'lucide-react';
import { authorsApi, type Author } from '../api/authors.api';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { toast } from 'sonner';

export default function AuthorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Author | null>(null);

  const { data: authors = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['authors', search, tagFilter],
    queryFn: () => authorsApi.list({
      search: search.trim() || undefined,
      featured: tagFilter === 'featured' ? true : undefined,
      active: true,
    }),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => authorsApi.toggleFeatured(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['authors'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => authorsApi.remove(id),
    onSuccess: () => { toast.success('Author deactivated'); queryClient.invalidateQueries({ queryKey: ['authors'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-teal-900 to-cyan-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Writers & Poets
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">✍️ Authors</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Authors, poets, translators, editors</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              New Author
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search authors, pen names..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-teal-500" />
        </div>
        <div className="flex gap-1.5">
          {[{ v: 'all', label: 'All' }, { v: 'featured', label: '⭐ Featured' }].map((f) => (
            <button key={f.v} onClick={() => setTagFilter(f.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (tagFilter === f.v ? 'bg-teal-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{f.label}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <AuthorForm editing={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['authors'] }); }} />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : authors.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <Users className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No authors yet</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {authors.map((a) => (
            <div key={a.id} className={
              'group rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl transition p-4 space-y-3 ' +
              (a.isFeatured ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 dark:border-neutral-800')
            }>
              <div className="flex items-start justify-between">
                {a.photoUrl ? (
                  <img src={a.photoUrl} alt={a.name} className="h-16 w-16 rounded-2xl object-cover ring-2 ring-slate-200" />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center text-2xl font-extrabold shadow">
                    {a.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex gap-1">
                  <button onClick={() => toggleMutation.mutate(a.id)} className={
                    'h-8 w-8 rounded-lg flex items-center justify-center transition ' +
                    (a.isFeatured ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-600')
                  }>
                    <Star className={'h-4 w-4 ' + (a.isFeatured ? 'fill-current' : '')} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white">{a.name}</h3>
                {a.penName && <div className="text-xs italic text-slate-500 font-bold">"{a.penName}"</div>}
                {a.nationality && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                    <Globe className="h-2.5 w-2.5" />
                    {a.nationality}
                  </div>
                )}
                {(a.bornYear || a.diedYear) && (
                  <div className="text-[10px] font-bold text-slate-500">
                    {a.bornYear || '?'} — {a.diedYear || 'Present'}
                  </div>
                )}
              </div>

              {a.genres?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {a.genres.slice(0, 3).map((g, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950/40 text-teal-700 text-[9px] font-extrabold uppercase">{g}</span>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-slate-600 font-bold">
                  <BookOpen className="h-3 w-3" />
                  {a._count?.bookAuthors || 0} books
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => { setEditing(a); setShowForm(true); }} className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                    <Edit3 className="h-3 w-3" />
                  </button>
                  <button onClick={() => { if (confirm('Remove?')) removeMutation.mutate(a.id); }} className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function AuthorForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    name: editing?.name ?? '',
    penName: editing?.penName ?? '',
    nationality: editing?.nationality ?? '',
    bornYear: editing?.bornYear ?? '',
    diedYear: editing?.diedYear ?? '',
    bio: editing?.bio ?? '',
    photoUrl: editing?.photoUrl ?? '',
    genres: editing?.genres?.join(', ') ?? '',
    languages: editing?.languages?.join(', ') ?? '',
    isFeatured: editing?.isFeatured ?? false,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        bornYear: form.bornYear ? Number(form.bornYear) : undefined,
        diedYear: form.diedYear ? Number(form.diedYear) : undefined,
        genres: form.genres ? form.genres.split(',').map((g: string) => g.trim()).filter(Boolean) : [],
        languages: form.languages ? form.languages.split(',').map((l: string) => l.trim()).filter(Boolean) : [],
      };
      return editing ? authorsApi.update(editing.id, payload) : authorsApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-teal-300 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-teal-50 dark:bg-teal-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit Author' : 'New Author'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-5 space-y-3 max-h-[80vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Author name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
          <input value={form.penName} onChange={(e) => setForm({ ...form, penName: e.target.value })} placeholder="Pen name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} placeholder="Nationality" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
          <input type="number" value={form.bornYear} onChange={(e) => setForm({ ...form, bornYear: e.target.value })} placeholder="Born year" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-teal-500" />
          <input type="number" value={form.diedYear} onChange={(e) => setForm({ ...form, diedYear: e.target.value })} placeholder="Died year" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-teal-500" />
        </div>
        <input value={form.genres} onChange={(e) => setForm({ ...form, genres: e.target.value })} placeholder="Genres (comma separated) e.g. Fiction, Poetry, History" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
        <input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} placeholder="Languages (comma separated) e.g. English, Urdu, Arabic" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
        <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Bio..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-teal-500 resize-none" />

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Photo</label>
          {form.photoUrl ? (
            <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-200">
              <img src={form.photoUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setForm({ ...form, photoUrl: '' })} className="absolute top-1 right-1 h-6 w-6 rounded bg-rose-600 text-white flex items-center justify-center"><X className="h-3 w-3" /></button>
            </div>
          ) : (
            <UploadDropzone onUploaded={(records) => {
              const first = Array.isArray(records) ? records[0] : records;
              const url = typeof first === 'string' ? first : (first as any)?.url;
              if (url) setForm({ ...form, photoUrl: url });
            }} />
          )}
        </div>

        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-amber-200 bg-amber-50 dark:bg-amber-950/30 cursor-pointer">
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="h-5 w-5 rounded" />
          <Star className={'h-5 w-5 ' + (form.isFeatured ? 'text-amber-500 fill-amber-500' : 'text-slate-400')} />
          <span className="text-sm font-extrabold text-amber-900">Featured Author</span>
        </label>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name.trim()}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </section>
  );
}
