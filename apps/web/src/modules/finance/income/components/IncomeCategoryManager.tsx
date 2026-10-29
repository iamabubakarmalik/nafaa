/**
 * The shop's own income categories, next to the fixed ones: add, rename,
 * recolour or delete (its records stay and move to "Doosri").
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Modal, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { incomeCategoriesApi, type IncomeCustomCategory } from '../api/income.api';
import { COLORS, FIXED_CATEGORIES, INCOME_CATEGORIES_KEY, INCOME_KEY, apiError } from './meta';

const inputCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';

export function IncomeCategoryManager({ categories, onClose }: { categories: IncomeCustomCategory[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', color: COLORS[0] });
  const refresh = () => { qc.invalidateQueries({ queryKey: [INCOME_CATEGORIES_KEY] }); qc.invalidateQueries({ queryKey: [INCOME_KEY] }); };

  const save = useMutation({
    mutationFn: () => {
      const body = { name: draft.name.trim(), color: draft.color };
      if (!body.name) throw new Error('Naam likhein');
      return editing && editing !== 'new' ? incomeCategoriesApi.update(editing, body) : incomeCategoriesApi.create(body);
    },
    onSuccess: (c) => { toast.success(editing === 'new' ? `"${c.name}" ban gayi` : 'Category badal gayi'); setEditing(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  const remove = useMutation({
    mutationFn: (c: IncomeCustomCategory) => incomeCategoriesApi.remove(c.id),
    onSuccess: () => { toast.success('Category hat gayi'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hati')),
  });

  const start = (c?: IncomeCustomCategory) => {
    setEditing(c?.id ?? 'new');
    setDraft(c ? { name: c.name, color: c.color } : { name: '', color: COLORS[categories.length % COLORS.length] });
  };
  const askRemove = async (c: IncomeCustomCategory) => {
    if (await confirmDialog({ title: `"${c.name}" hatayein?`, text: 'Is ke records mitenge nahi — "Doosri" mein chale jayenge.', danger: true })) remove.mutate(c);
  };

  const editor = (
    <div className="space-y-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <input autoFocus value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} maxLength={60} placeholder="Maslan: Display rent"
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save.mutate(); } }} className={inputCls} aria-label="Category ka naam" />
      <div className="flex flex-wrap gap-1.5">
        {COLORS.map((c) => (
          <button key={c} type="button" onClick={() => setDraft((d) => ({ ...d, color: c }))} aria-label={`Rang ${c}`} aria-pressed={draft.color === c}
            className={cn('flex h-7 w-7 items-center justify-center rounded-full ring-2 transition', draft.color === c ? 'ring-slate-900' : 'ring-transparent')} style={{ background: c }}>
            {draft.color === c && <Check className="h-3.5 w-3.5 text-white" />}
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Rehne dein</Button>
        <Button size="sm" onClick={() => save.mutate()} loading={save.isPending}>{editing === 'new' ? 'Banayein' : 'Save'}</Button>
      </div>
    </div>
  );

  return (
    <Modal open onClose={onClose} size="md" title="Aamdani ki categories" description="Tayyar categories har dukaan ke liye hain; apni bhi bana sakte hain"
      footer={<Button variant="secondary" onClick={onClose}>Band karein</Button>}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {FIXED_CATEGORIES.map((c) => (
            <span key={c.id} className="inline-flex h-7 items-center gap-1 rounded-lg bg-slate-50 px-2 text-[0.75rem] font-medium text-slate-600 ring-1 ring-slate-200">
              <c.icon className="h-3.5 w-3.5" style={{ color: c.color }} />{c.label}
            </span>
          ))}
        </div>
        {editing === 'new' ? editor : <Button size="sm" onClick={() => start()} leftIcon={<Plus className="h-4 w-4" />}>Apni category</Button>}
        {categories.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
            {categories.map((c) => (
              <li key={c.id} className="px-3 py-2">
                {editing === c.id ? editor : (
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{c.name}</span>
                    <button type="button" onClick={() => start(c)} aria-label={`${c.name} badlein`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => askRemove(c)} aria-label={`${c.name} hatayein`} disabled={remove.isPending} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
