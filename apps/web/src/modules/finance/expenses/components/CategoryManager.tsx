/**
 * Expense categories: add, rename, recolour, pick an icon, or delete (its
 * expenses stay and move to "Bina category").
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { expenseCategoriesApi, type ExpenseCategory, type ExpenseCategoryPayload } from '../api/expenses.api';
import { CATEGORIES_KEY, COLORS, EXPENSES_KEY, ICONS, STARTER_CATEGORIES, apiError } from './meta';

const inputCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';

export function CategoryManager({ categories, onClose }: { categories: ExpenseCategory[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<ExpenseCategoryPayload>({ name: '', color: COLORS[0], icon: '' });
  const refresh = () => { qc.invalidateQueries({ queryKey: [CATEGORIES_KEY] }); qc.invalidateQueries({ queryKey: [EXPENSES_KEY] }); };

  const save = useMutation({
    mutationFn: () => {
      const payload = { name: draft.name.trim(), color: draft.color, icon: draft.icon ?? '' };
      if (!payload.name) throw new Error('Naam likhein');
      return editing && editing !== 'new' ? expenseCategoriesApi.update(editing, payload) : expenseCategoriesApi.create({ ...payload, icon: payload.icon || undefined });
    },
    onSuccess: (c) => { toast.success(editing === 'new' ? `"${c.name}" ban gayi` : 'Category badal gayi'); setEditing(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });

  const remove = useMutation({
    mutationFn: (c: ExpenseCategory) => expenseCategoriesApi.remove(c.id),
    onSuccess: () => { toast.success('Category hat gayi'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hati')),
  });

  const seed = useMutation({
    mutationFn: async () => {
      let made = 0;
      for (const c of STARTER_CATEGORIES) {
        if (categories.some((x) => x.name.toLowerCase() === c.name.toLowerCase())) continue;
        try { await expenseCategoriesApi.create({ name: c.name, color: c.color, icon: c.icon }); made++; } catch { /* already there */ }
      }
      return made;
    },
    onSuccess: (n) => { toast.success(n ? `${n} categories ban gayi` : 'Sab pehle se hain'); refresh(); },
  });

  const start = (c?: ExpenseCategory) => {
    setEditing(c?.id ?? 'new');
    setDraft(c ? { name: c.name, color: c.color, icon: c.icon ?? '' } : { name: '', color: COLORS[categories.length % COLORS.length], icon: '' });
  };

  const askRemove = (c: ExpenseCategory) => {
    const n = c._count?.expenses ?? 0;
    if (window.confirm(`"${c.name}" hatayein?${n ? `\n\nIs ke ${n} expenses mitenge nahi — "Bina category" me chale jayenge.` : ''}`)) remove.mutate(c);
  };

  const editor = (
    <div className="space-y-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div>
        <input autoFocus value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} maxLength={80} placeholder="Maslan: Generator ka diesel"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save.mutate(); } }} className={inputCls} aria-label="Category ka naam" />
        <p className="mt-1 text-[0.6875rem] text-slate-500">Chhota aur saaf naam — list aur report me yahi dikhega.</p>
      </div>
      <div>
        <p className="mb-1 text-[0.75rem] font-medium text-slate-600">Rang</p>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setDraft((d) => ({ ...d, color: c }))} aria-label={`Rang ${c}`} aria-pressed={draft.color === c}
              className={cn('flex h-7 w-7 items-center justify-center rounded-full ring-2 transition', draft.color === c ? 'ring-slate-900' : 'ring-transparent')} style={{ background: c }}>
              {draft.color === c && <Check className="h-3.5 w-3.5 text-white" />}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-[0.75rem] font-medium text-slate-600">Nishan (marzi)</p>
        <div className="flex flex-wrap gap-1">
          <button type="button" onClick={() => setDraft((d) => ({ ...d, icon: '' }))} aria-pressed={!draft.icon}
            className={cn('h-8 rounded-lg px-2 text-[0.75rem] ring-1', !draft.icon ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200')}>Koi nahi</button>
          {ICONS.map((i) => (
            <button key={i} type="button" onClick={() => setDraft((d) => ({ ...d, icon: i }))} aria-pressed={draft.icon === i}
              className={cn('h-8 w-8 rounded-lg text-base ring-1', draft.icon === i ? 'bg-brand-50 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>{i}</button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Rehne dein</Button>
        <Button size="sm" onClick={() => save.mutate()} loading={save.isPending}>{editing === 'new' ? 'Banayein' : 'Save'}</Button>
      </div>
    </div>
  );

  return (
    <Modal open onClose={onClose} size="md" title="Expenses ki categories" description="Kiraya, bijli, salary — apne hisaab se banayein"
      footer={<Button variant="secondary" onClick={onClose}>Band karein</Button>}>
      <div className="space-y-3">
        {editing === 'new' ? editor : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => start()} leftIcon={<Plus className="h-4 w-4" />}>Nayi category</Button>
            {STARTER_CATEGORIES.some((s) => !categories.some((c) => c.name.toLowerCase() === s.name.toLowerCase())) && (
              <Button size="sm" variant="secondary" onClick={() => seed.mutate()} loading={seed.isPending} leftIcon={<Sparkles className="h-4 w-4" />}>Aam categories jorein</Button>
            )}
          </div>
        )}
        {!categories.length ? (
          <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">Abhi koi category nahi. "Aam categories jorein" se 8 tayyar categories ban jati hain.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
            {categories.map((c) => (
              <li key={c.id} className="px-3 py-2">
                {editing === c.id ? editor : (
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base" style={{ background: `${c.color}1f`, color: c.color }}>
                      {c.icon || <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">{c.name}</span>
                      <span className="text-[0.6875rem] text-slate-500">{c._count?.expenses ?? 0} expenses</span>
                    </span>
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
