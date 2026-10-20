/**
 * School book list form: school, session and class, then the lines. Lines
 * come from the catalog (search, or "all textbooks of this class") so the
 * set sells from stock at the counter; a line typed by hand (uniform bought
 * elsewhere) stays on the printed list only. The set price is the lines
 * less the list discount, unless a fixed set price is written.
 *
 * Keys: Ctrl+S save.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, BookOpen, Plus, Search, Trash2, Wand2 } from 'lucide-react';
import { Button, Input, Modal, Select } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { bookProfilesApi } from '../api/book-profiles.api';
import type { School } from '../api/schools.api';
import type { SchoolBookList } from '../api/school-lists.api';
import { GRADES, apiError, currentSession, decimal } from '../lib/meta';
import { useDebounced, useSaveKey } from './ui';

export interface LineDraft {
  key: string; productId: string | null; itemName: string; itemType: string; quantity: number; unitPrice: number; subject: string; isOptional: boolean;
}
export interface ListDraft {
  schoolId: string; session: string; grade: string; section: string; title: string; discountPct: string; bundlePrice: string; lines: LineDraft[];
}

let seq = 0;
const key = () => `l${++seq}`;
const r2 = (n: number) => Math.round(n * 100) / 100;

export function toDraft(list: SchoolBookList | null, schoolId?: string): ListDraft {
  return {
    schoolId: list?.schoolId ?? schoolId ?? '', session: list?.session ?? currentSession(), grade: list?.grade ?? '', section: list?.section ?? '',
    title: list?.title ?? '', discountPct: list?.discountPct ? String(list.discountPct) : '', bundlePrice: '',
    lines: (list?.items ?? []).map((i) => ({
      key: key(), productId: i.productId ?? null, itemName: i.itemName, itemType: i.itemType, quantity: i.quantity,
      unitPrice: i.unitPrice, subject: i.subject ?? '', isOptional: i.isOptional,
    })),
  };
}

/** Set price the server will store for this draft (fixed price wins). */
export function draftPrice(d: ListDraft): number {
  if (d.bundlePrice.trim()) return Number(d.bundlePrice) || 0;
  const sum = d.lines.filter((l) => !l.isOptional).reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  return r2(sum * (1 - (Number(d.discountPct) || 0) / 100));
}

export function SchoolListEditor({ list, schools, presetSchool, pending, onSave, onClose }: {
  list: SchoolBookList | null; schools: School[]; presetSchool?: string; pending: boolean;
  onSave: (body: Record<string, unknown>) => void; onClose: () => void;
}) {
  const [d, setD] = useState<ListDraft>(() => toDraft(list, presetSchool));
  const [tried, setTried] = useState(false);
  const [q, setQ] = useState('');
  const [filling, setFilling] = useState(false);
  const set = (patch: Partial<ListDraft>) => setD((x) => ({ ...x, ...patch }));
  const setLine = (k: string, patch: Partial<LineDraft>) => set({ lines: d.lines.map((l) => (l.key === k ? { ...l, ...patch } : l)) });
  const move = (i: number, by: number) => {
    const lines = [...d.lines];
    const [x] = lines.splice(i, 1);
    lines.splice(Math.max(0, Math.min(lines.length, i + by)), 0, x);
    set({ lines });
  };

  const term = useDebounced(q.trim(), 250);
  const found = useQuery({
    queryKey: ['bookstore-list-search', term],
    queryFn: () => productsApi.list({ search: term, limit: 12, isActive: true }),
    enabled: term.length >= 2,
    staleTime: 30_000,
  });
  const school = schools.find((s) => s.id === d.schoolId);

  const addProduct = (p: { id: string; name: string; price: number }) => {
    if (d.lines.some((l) => l.productId === p.id)) { toast.info(`${p.name} pehle se list me hai`); return; }
    set({ lines: [...d.lines, { key: key(), productId: p.id, itemName: p.name, itemType: 'BOOK', quantity: 1, unitPrice: p.price, subject: '', isOptional: false }] });
    setQ('');
  };
  const addFree = () => {
    if (!q.trim()) return;
    set({ lines: [...d.lines, { key: key(), productId: null, itemName: q.trim(), itemType: 'OTHER', quantity: 1, unitPrice: 0, subject: '', isOptional: false }] });
    setQ('');
  };
  /** Adds every textbook marked for this class (and board) that is not on the list yet. */
  const fillClass = async () => {
    if (!d.grade.trim()) { toast.error('Pehle class chunein'); return; }
    setFilling(true);
    try {
      const books = await bookProfilesApi.byAcademic({ grade: d.grade.trim(), board: school?.board || undefined });
      const have = new Set(d.lines.map((l) => l.productId));
      const fresh = books.filter((b) => !have.has(b.productId));
      if (!fresh.length) { toast.info(books.length ? 'Is class ki sab kitaben pehle se list me hain' : `"${d.grade}" ki koi textbook nahi mili — kitab me class likhein`); return; }
      set({ lines: [...d.lines, ...fresh.map((b) => ({
        key: key(), productId: b.productId, itemName: b.product?.name ?? b.title, itemType: 'BOOK', quantity: 1,
        unitPrice: Number(b.product?.price ?? b.mrp ?? 0), subject: b.subject ?? '', isOptional: false,
      }))] });
      toast.success(`${fresh.length} kitaben jur gayin`);
    } catch (e) { toast.error(apiError(e, 'Kitaben nahi milin')); } finally { setFilling(false); }
  };

  const errors = {
    schoolId: !d.schoolId ? 'School chunein' : undefined,
    session: !d.session.trim() ? 'Session likhein' : undefined,
    grade: !d.grade.trim() ? 'Class likhein' : undefined,
    discount: Number(d.discountPct) > 100 ? '100% se zyada nahi' : undefined,
    lines: d.lines.length === 0 ? 'Kam se kam ek cheez jorein' : d.lines.some((l) => !l.itemName.trim() || !(l.quantity >= 1)) ? 'Har line ka naam aur quantity likhein' : undefined,
  };
  const bad = Object.values(errors).some(Boolean);
  const price = useMemo(() => draftPrice(d), [d]);
  const linesTotal = d.lines.filter((l) => !l.isOptional).reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  const submit = () => {
    setTried(true);
    if (bad || pending) return;
    onSave({
      schoolId: d.schoolId, session: d.session.trim(), grade: d.grade.trim(), section: d.section.trim() || null, title: d.title.trim() || undefined,
      discountPct: Number(d.discountPct) || 0, ...(d.bundlePrice.trim() ? { bundlePrice: Number(d.bundlePrice) } : { bundlePrice: null }),
      items: d.lines.map((l) => ({ productId: l.productId, itemName: l.itemName.trim(), itemType: l.itemType, quantity: l.quantity, unitPrice: l.unitPrice, subject: l.subject.trim() || undefined, isOptional: l.isOptional })),
    });
  };
  useSaveKey(submit);

  return (
    <Modal open onClose={onClose} size="xl" title={list ? `${list.title} — badlein` : 'Nayi school list'} description="Ctrl+S se save"
      footer={(
        <div className="flex w-full flex-wrap items-center gap-3">
          <div className="mr-auto text-[0.8125rem] text-slate-600">
            Set ki qeemat <span className="text-[1rem] font-bold tabular-nums text-slate-900">{formatPKR(price)}</span>
            {price < linesTotal && <span className="ml-1 text-emerald-700">(bachat {formatPKR(linesTotal - price)})</span>}
          </div>
          <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
          <Button onClick={submit} loading={pending}>Save</Button>
        </div>
      )}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="School" required value={d.schoolId} onChange={(e) => set({ schoolId: e.target.value })} placeholder="Chunein" error={tried ? errors.schoolId : undefined}
            options={schools.filter((s) => s.isActive || s.id === d.schoolId).map((s) => ({ value: s.id, label: s.name }))} hint={!schools.length ? 'Pehle Schools me school banayein' : undefined} />
          <Input label="Session" required value={d.session} onChange={(e) => set({ session: e.target.value })} error={tried ? errors.session : undefined} placeholder="2026-2027" />
          <Input label="Section" value={d.section} onChange={(e) => set({ section: e.target.value })} placeholder="Marzi hai — A, Blue" />
        </div>
        <div>
          <Input label="Class" required value={d.grade} onChange={(e) => set({ grade: e.target.value })} error={tried ? errors.grade : undefined} placeholder="Class 5" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {GRADES.map((g) => (
              <button key={g} type="button" onClick={() => set({ grade: g })} aria-pressed={d.grade === g}
                className={cn('h-7 rounded-full px-2.5 text-[0.75rem] font-medium ring-1', d.grade === g ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200')}>{g}</button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
            <div className="relative min-w-[14rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kitab ya cheez dhoondein — naam, ISBN"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const first = found.data?.items[0]; if (first) addProduct(first); } }}
                className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-[0.875rem] outline-none focus:border-brand-500" />
            </div>
            <Button variant="secondary" size="sm" onClick={() => void fillClass()} loading={filling} leftIcon={<Wand2 className="h-4 w-4" />}>Class ki kitaben</Button>
          </div>
          {term.length >= 2 && (
            <ul className="max-h-48 overflow-y-auto border-b border-slate-100">
              {(found.data?.items ?? []).map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => addProduct(p)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.875rem] hover:bg-slate-50">
                    <BookOpen className="h-4 w-4 text-slate-400" /><span className="flex-1 truncate">{p.name}</span>
                    <span className="text-[0.75rem] text-slate-500">Stock {p.stock}</span><span className="w-20 text-right font-semibold tabular-nums">{formatPKR(p.price)}</span>
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={addFree} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.8125rem] text-slate-600 hover:bg-slate-50">
                  <Plus className="h-4 w-4" />"{q.trim()}" haath se likhein (catalog me nahi — sirf list par)
                </button>
              </li>
            </ul>
          )}
          {d.lines.length === 0 ? (
            <p className="px-3 py-6 text-center text-[0.8125rem] text-slate-500">Kitaben dhoond kar jorein, ya class chun kar "Class ki kitaben" dabayein.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.lines.map((l, i) => (
                <li key={l.key} className="grid grid-cols-[auto_1fr] gap-2 px-3 py-2 sm:grid-cols-[auto_1fr_5rem_7rem_auto_auto]">
                  <div className="flex flex-col">
                    <button type="button" aria-label="Upar" disabled={i === 0} onClick={() => move(i, -1)} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label="Neeche" disabled={i === d.lines.length - 1} onClick={() => move(i, 1)} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="min-w-0">
                    <input value={l.itemName} onChange={(e) => setLine(l.key, { itemName: e.target.value })} disabled={!!l.productId}
                      className="h-9 w-full truncate rounded-lg border border-transparent bg-transparent px-1 text-[0.875rem] font-medium text-slate-900 focus:border-slate-200 disabled:text-slate-900" />
                    <p className="px-1 text-[0.6875rem] text-slate-500">{l.productId ? 'Catalog se' : 'Sirf list par — POS par nahi bikta'}{l.subject ? ` · ${l.subject}` : ''}</p>
                  </div>
                  <label className="col-start-2 sm:col-start-auto">
                    <span className="sr-only">Quantity</span>
                    <input inputMode="numeric" value={String(l.quantity)} onChange={(e) => setLine(l.key, { quantity: Math.max(Number(e.target.value.replace(/\D/g, '')) || 0, 0) })}
                      className="h-9 w-full rounded-lg border border-slate-200 px-2 text-right text-[0.875rem] tabular-nums" />
                  </label>
                  <label className="col-start-2 sm:col-start-auto">
                    <span className="sr-only">Rate</span>
                    <input inputMode="decimal" value={String(l.unitPrice)} onChange={(e) => setLine(l.key, { unitPrice: Number(decimal(e.target.value)) || 0 })}
                      className="h-9 w-full rounded-lg border border-slate-200 px-2 text-right text-[0.875rem] tabular-nums" />
                  </label>
                  <button type="button" onClick={() => setLine(l.key, { isOptional: !l.isOptional })} aria-pressed={l.isOptional}
                    className={cn('col-start-2 h-9 rounded-lg px-2 text-[0.75rem] font-semibold ring-1 sm:col-start-auto', l.isOptional ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-white text-slate-600 ring-slate-200')}>
                    {l.isOptional ? 'Marzi ki' : 'Zaroori'}
                  </button>
                  <button type="button" aria-label="Hatayein" onClick={() => set({ lines: d.lines.filter((x) => x.key !== l.key) })} className="col-start-2 flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 sm:col-start-auto"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
          {tried && errors.lines && <p className="px-3 pb-3 text-[0.8125rem] font-medium text-rose-600">{errors.lines}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Discount %" inputMode="decimal" value={d.discountPct} onChange={(e) => set({ discountPct: decimal(e.target.value) })} error={errors.discount}
            placeholder={school?.discountPct ? String(school.discountPct) : '0'} hint={school?.discountPct ? `${school.name} ka discount ${school.discountPct}%` : 'Poore set par'} />
          <Input label="Set ki pakki qeemat" inputMode="decimal" value={d.bundlePrice} onChange={(e) => set({ bundlePrice: decimal(e.target.value) })} placeholder={String(draftPrice({ ...d, bundlePrice: '' }))} hint="Khali chhorein to lines − discount" />
          <Input label="Naam (list ka)" value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder={d.grade && d.session ? `${d.grade} - ${d.session}` : 'Khud ban jata hai'} />
        </div>
      </div>
    </Modal>
  );
}
