import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Newspaper, Plus, Search, X, Save, Trash2, RefreshCw, Sparkles,
  Copy, School as SchoolIcon, BookOpen,
} from 'lucide-react';
import { schoolListsApi, type SchoolBookList } from '../api/school-lists.api';
import { schoolsApi } from '../api/schools.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-500',
  ACTIVE: 'bg-emerald-500',
  CLOSED: 'bg-amber-500',
  ARCHIVED: 'bg-slate-400',
};

export default function SchoolListsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const schoolIdParam = searchParams.get('schoolId');
  const [schoolFilter, setSchoolFilter] = useState<string>(schoolIdParam || '');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SchoolBookList | null>(null);

  const { data: schools = [] } = useQuery({
    queryKey: ['schools-for-lists'],
    queryFn: () => schoolsApi.list({ active: true }),
  });

  const { data: lists = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['school-lists', schoolFilter, statusFilter],
    queryFn: () => schoolListsApi.list({
      schoolId: schoolFilter || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => schoolListsApi.remove(id),
    onSuccess: () => { toast.success('List removed'); queryClient.invalidateQueries({ queryKey: ['school-lists'] }); },
  });

  const duplicateMutation = useMutation({
    mutationFn: ({ id, session }: { id: string; session: string }) => schoolListsApi.duplicate(id, session),
    onSuccess: () => { toast.success('List duplicated'); queryClient.invalidateQueries({ queryKey: ['school-lists'] }); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => schoolListsApi.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['school-lists'] }),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-blue-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Book Bundles
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📋 School Book Lists</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Grade-wise book lists for schools & sessions</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              New List
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-2">
          <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
            <option value="">All Schools</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex gap-1.5 overflow-x-auto">
            {['all', 'DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className={
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
                (statusFilter === s ? 'bg-cyan-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
              }>{s === 'all' ? 'All' : s}</button>
            ))}
          </div>
        </div>
      </section>

      {showForm && (
        <SchoolListForm editing={editing} schools={schools} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['school-lists'] }); }} />
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : lists.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <Newspaper className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No school lists yet</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {lists.map((list) => (
            <div key={list.id} className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow shrink-0">
                    <Newspaper className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 dark:text-white">{list.title}</span>
                      <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + STATUS_COLORS[list.status]}>
                        {list.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 font-semibold flex-wrap">
                      <span className="inline-flex items-center gap-1"><SchoolIcon className="h-3 w-3" />{list.school?.name}</span>
                      <span>📅 Session: {list.session}</span>
                      <span>🎓 {list.grade}{list.section ? ' - ' + list.section : ''}</span>
                      {list.medium && <span>🗣️ {list.medium}</span>}
                    </div>
                    {list.description && <p className="text-xs italic text-slate-500 mt-1 line-clamp-1">{list.description}</p>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(list.bundlePrice || 0)}</div>
                  <div className="text-[10px] font-bold text-slate-500">{list.totalItems} items</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs">
                <div className="text-center">
                  <div className="text-[9px] uppercase font-extrabold text-slate-500">Items</div>
                  <div className="font-extrabold text-slate-900 dark:text-white tabular-nums">{list.totalItems}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] uppercase font-extrabold text-cyan-700">Orders</div>
                  <div className="font-extrabold text-cyan-700 tabular-nums">{list.totalOrders}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] uppercase font-extrabold text-emerald-700">Revenue</div>
                  <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(list.totalRevenue).replace('Rs', '').trim()}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] uppercase font-extrabold text-amber-700">Discount</div>
                  <div className="font-extrabold text-amber-700 tabular-nums">{list.discountPct}%</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
                <button onClick={() => { setEditing(list); setShowForm(true); }} className="flex-1 h-9 rounded-lg bg-cyan-100 hover:bg-cyan-200 text-cyan-700 text-xs font-extrabold flex items-center justify-center gap-1">
                  Edit List
                </button>
                {list.status === 'DRAFT' && (
                  <button onClick={() => statusMutation.mutate({ id: list.id, status: 'ACTIVE' })} className="flex-1 h-9 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-extrabold flex items-center justify-center gap-1">
                    Activate
                  </button>
                )}
                {list.status === 'ACTIVE' && (
                  <button onClick={() => statusMutation.mutate({ id: list.id, status: 'CLOSED' })} className="flex-1 h-9 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-extrabold flex items-center justify-center gap-1">
                    Close
                  </button>
                )}
                <button onClick={() => {
                  const session = prompt('New session (e.g. 2026-2027):');
                  if (session) duplicateMutation.mutate({ id: list.id, session });
                }} className="h-9 w-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center" title="Duplicate for new session">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { if (confirm('Delete list?')) removeMutation.mutate(list.id); }} className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function SchoolListForm({ editing, schools, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    schoolId: editing?.schoolId ?? '',
    session: editing?.session ?? new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    grade: editing?.grade ?? '',
    section: editing?.section ?? '',
    medium: editing?.medium ?? '',
    title: editing?.title ?? '',
    description: editing?.description ?? '',
    status: editing?.status ?? 'DRAFT',
    discountPct: editing?.discountPct ?? 0,
  });

  const [items, setItems] = useState<any[]>(editing?.items ?? []);
  const [productSearch, setProductSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);

  const { data: productsData } = useQuery({
    queryKey: ['products-for-list', productSearch],
    queryFn: () => productsApi.list({ limit: 30, search: productSearch || undefined }),
    enabled: showProductPicker,
  });

  const subtotal = items.reduce((s, it) => s + (it.total || 0), 0);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        discountPct: Number(form.discountPct) || 0,
        items,
      };
      return editing ? schoolListsApi.update(editing.id, payload) : schoolListsApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const addProduct = (p: any) => {
    setItems([...items, {
      productId: p.id,
      itemName: p.name,
      itemType: 'BOOK',
      quantity: 1,
      unit: 'piece',
      unitPrice: p.price,
      discount: 0,
      total: p.price,
      isRequired: true,
    }]);
    setShowProductPicker(false);
    setProductSearch('');
  };

  const addManualItem = () => setItems([...items, { itemName: '', itemType: 'BOOK', quantity: 1, unit: 'piece', unitPrice: 0, discount: 0, total: 0, isRequired: true }]);

  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const updateItem = (i: number, patch: any) => {
    const copy = [...items];
    copy[i] = { ...copy[i], ...patch };
    copy[i].total = (copy[i].unitPrice || 0) * (copy[i].quantity || 1) - (copy[i].discount || 0);
    setItems(copy);
  };

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-cyan-300 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-cyan-50 dark:bg-cyan-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit School List' : 'New School List'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-5 space-y-3 max-h-[85vh] overflow-y-auto">
        <select value={form.schoolId} onChange={(e) => setForm({ ...form, schoolId: e.target.value })} disabled={!!editing} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500 disabled:opacity-70">
          <option value="">Select School *</option>
          {schools.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="grid sm:grid-cols-4 gap-3">
          <input value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })} placeholder="Session *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
          <input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="Grade *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
          <input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="Section" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
          <input value={form.medium} onChange={(e) => setForm({ ...form, medium: e.target.value })} placeholder="Medium" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
        </div>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-cyan-500 resize-none" />

        <div className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 dark:bg-neutral-800/50 flex items-center justify-between">
            <div className="text-sm font-extrabold">📚 Items ({items.length})</div>
            <div className="flex gap-1">
              <Button size="sm" onClick={() => setShowProductPicker(!showProductPicker)}>
                <Search className="h-3.5 w-3.5" />
                From Products
              </Button>
              <Button size="sm" variant="secondary" onClick={addManualItem}>
                <Plus className="h-3.5 w-3.5" />
                Manual Item
              </Button>
            </div>
          </div>

          {showProductPicker && (
            <div className="p-3 border-b bg-cyan-50/50 space-y-2">
              <input autoFocus value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products..." className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
              <div className="max-h-40 overflow-y-auto space-y-1">
                {(productsData?.items ?? []).map((p) => (
                  <button key={p.id} onClick={() => addProduct(p)} className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-white text-left">
                    <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm font-extrabold flex-1 truncate">{p.name}</span>
                    <span className="text-[10px] text-emerald-700 font-extrabold">{formatPKR(p.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="divide-y">
            {items.map((it, i) => (
              <div key={i} className="p-3 grid grid-cols-12 gap-2 items-center">
                <input value={it.itemName} onChange={(e) => updateItem(i, { itemName: e.target.value })} placeholder="Item name" className="col-span-4 h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-cyan-500" />
                <input value={it.subject || ''} onChange={(e) => updateItem(i, { subject: e.target.value })} placeholder="Subject" className="col-span-2 h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-cyan-500" />
                <input type="number" value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} className="col-span-1 h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-extrabold tabular-nums text-center focus:outline-none focus:border-cyan-500" />
                <input type="number" value={it.unitPrice} onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })} placeholder="Price" className="col-span-2 h-9 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-xs font-extrabold tabular-nums text-right focus:outline-none focus:border-emerald-500" />
                <div className="col-span-2 text-right text-xs font-extrabold text-emerald-700 tabular-nums">{formatPKR(it.total)}</div>
                <button onClick={() => removeItem(i)} className="col-span-1 h-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500 font-bold">No items added yet</div>
            )}
          </div>

          {items.length > 0 && (
            <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 flex justify-between items-center">
              <span className="text-sm font-extrabold">Bundle Total:</span>
              <span className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(subtotal)}</span>
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">School Discount %</label>
          <input type="number" step="0.1" value={form.discountPct} onChange={(e) => setForm({ ...form, discountPct: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-amber-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.schoolId || !form.session || !form.grade}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </section>
  );
}
