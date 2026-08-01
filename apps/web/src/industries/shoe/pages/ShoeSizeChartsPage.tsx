import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ruler, Plus, RefreshCw, Edit3, Trash2, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { shoeSizeChartsApi, type ShoeSizeChart } from '../api/size-charts.api';
import { Button } from '@core/ui/Button';

export default function ShoeSizeChartsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ShoeSizeChart | null>(null);

  const { data: charts = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['shoe-size-charts'],
    queryFn: () => shoeSizeChartsApi.list({}),
  });

  const remove = useMutation({
    mutationFn: (id: string) => shoeSizeChartsApi.remove(id),
    onSuccess: () => { toast.success('Chart deleted'); qc.invalidateQueries({ queryKey: ['shoe-size-charts'] }); },
  });

  return (
    <div className="space-y-5">
      {showForm && (
        <ChartFormModal editing={editing} onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); qc.invalidateQueries({ queryKey: ['shoe-size-charts'] }); }} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Ruler className="h-3.5 w-3.5 text-amber-300" /> Size Conversion Charts
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold">📏 Size Charts</h1>
            <p className="mt-2 text-sm text-white/80">
              {charts.length} charts • UK ↔ US ↔ EU ↔ CM mappings
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> New Chart
            </Button>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : charts.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Ruler className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No size charts yet</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Create UK-to-EU or US-to-CM conversion charts</p>
          <Button className="mt-4 bg-gradient-to-r from-blue-600 to-cyan-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Add First Chart
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {charts.map((c) => (
            <div key={c.id} className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 hover:shadow-md transition">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-extrabold text-slate-900 truncate">{c.name}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.gender && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold">{c.gender}</span>}
                    {c.categoryType && <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-extrabold">{c.categoryType.replace(/_/g, ' ')}</span>}
                  </div>
                </div>
              </div>
              {c.notes && <p className="mt-2 text-xs text-slate-600 font-semibold line-clamp-2">{c.notes}</p>}
              <div className="mt-3 flex gap-1.5 pt-3 border-t border-slate-100">
                <button onClick={() => { setEditing(c); setShowForm(true); }}
                  className="flex-1 h-9 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={() => { if (confirm(`Delete "${c.name}"?`)) remove.mutate(c.id); }}
                  className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
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

function ChartFormModal({ editing, onClose, onSaved }: any) {
  const [name, setName] = useState(editing?.name ?? '');
  const [gender, setGender] = useState(editing?.gender ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [mappings, setMappings] = useState<any[]>(editing?.mappings ?? [
    { uk: '5', us: '6', eu: '38', cm: '24' },
    { uk: '6', us: '7', eu: '39', cm: '25' },
    { uk: '7', us: '8', eu: '40', cm: '26' },
    { uk: '8', us: '9', eu: '41', cm: '27' },
    { uk: '9', us: '10', eu: '42', cm: '28' },
    { uk: '10', us: '11', eu: '43', cm: '29' },
    { uk: '11', us: '12', eu: '44', cm: '30' },
  ]);

  const save = useMutation({
    mutationFn: () => {
      const data = { name, gender: gender || undefined, mappings, notes };
      return editing ? shoeSizeChartsApi.update(editing.id, data) : shoeSizeChartsApi.create(data);
    },
    onSuccess: () => { toast.success(editing ? 'Chart updated' : 'Chart created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const updateRow = (i: number, key: string, val: string) => {
    setMappings((prev) => prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r));
  };

  const addRow = () => setMappings((prev) => [...prev, { uk: '', us: '', eu: '', cm: '' }]);
  const removeRow = (i: number) => setMappings((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-blue-600 to-cyan-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">{editing ? '✏️ Edit Chart' : '📏 New Size Chart'}</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase mb-1.5">Chart Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Men's UK-EU-US Chart"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase mb-1.5">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
                <option value="">Not specific</option>
                <option value="MEN">Men</option>
                <option value="WOMEN">Women</option>
                <option value="BOYS">Boys</option>
                <option value="GIRLS">Girls</option>
                <option value="INFANT">Infant</option>
                <option value="UNISEX">Unisex</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-extrabold uppercase">Size Mappings</label>
              <button type="button" onClick={addRow} className="text-xs font-extrabold text-blue-700 inline-flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add row
              </button>
            </div>
            <div className="rounded-xl border-2 border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <Th>UK</Th><Th>US</Th><Th>EU</Th><Th>CM</Th><Th />
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((row, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="p-1"><input value={row.uk || ''} onChange={(e) => updateRow(i, 'uk', e.target.value)} className="h-9 w-full text-center rounded border border-slate-200 px-1 text-xs font-mono" /></td>
                      <td className="p-1"><input value={row.us || ''} onChange={(e) => updateRow(i, 'us', e.target.value)} className="h-9 w-full text-center rounded border border-slate-200 px-1 text-xs font-mono" /></td>
                      <td className="p-1"><input value={row.eu || ''} onChange={(e) => updateRow(i, 'eu', e.target.value)} className="h-9 w-full text-center rounded border border-slate-200 px-1 text-xs font-mono" /></td>
                      <td className="p-1"><input value={row.cm || ''} onChange={(e) => updateRow(i, 'cm', e.target.value)} className="h-9 w-full text-center rounded border border-slate-200 px-1 text-xs font-mono" /></td>
                      <td className="p-1 text-center">
                        <button type="button" onClick={() => removeRow(i)} className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 inline-flex items-center justify-center">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase mb-1.5">Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Chart notes..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700" onClick={() => save.mutate()} loading={save.isPending} disabled={!name.trim()}>
            <Save className="h-4 w-4" /> {editing ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: any) {
  return <th className="px-2 py-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-700">{children}</th>;
}
