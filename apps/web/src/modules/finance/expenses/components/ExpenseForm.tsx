/**
 * Record or edit an expense: what it was for, category chips, amount, day,
 * how it was paid, paid now or a bill still to pay, a note and a photo of the
 * bill. On the all-branches view the branch is picked here. A cash expense
 * paid today is taken from the open cash shift, and the form says so.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Camera, Clock, Loader2, Plus, Settings2, Sparkles, Store, Wallet, X } from 'lucide-react';
import { Button, Kbd, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { useImageUpload } from '@core/hooks/useImageUpload';
import { useIsAllShops } from '@core/stores/auth.store';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import {
  expenseCategoriesApi, expensesApi, type CreateExpensePayload, type Expense, type ExpenseCategory, type ExpenseMethod,
  type ExpenseOverview, type UpdateExpensePayload,
} from '../api/expenses.api';
import { CATEGORIES_KEY, EXPENSES_KEY, METHODS, STARTER_CATEGORIES, apiError } from './meta';

/** What the form opens with: an expense to edit, or values to start a new one. */
export type ExpenseDraft =
  | { mode: 'edit'; expense: Expense }
  | { mode: 'new'; title?: string; amount?: number; categoryId?: string; paymentMethod?: string; description?: string; pending?: boolean };

const inputCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';
const labelCls = 'mb-1.5 block text-[0.8125rem] font-medium text-slate-700';
const hintCls = 'mt-1 text-[0.6875rem] text-slate-500';

/** Keys every expense change refreshes: this page, the cash shift, money and dashboards. */
export const AFFECTED_KEYS = [EXPENSES_KEY, 'cash-register', 'money', 'dashboard-overview'];

export function ExpenseForm({ draft, categories, register, onClose, onManageCategories }: {
  draft: ExpenseDraft;
  categories: ExpenseCategory[];
  register: ExpenseOverview['register'] | undefined;
  onClose: () => void;
  onManageCategories: () => void;
}) {
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const allShops = useIsAllShops();
  const today = businessDayKey(new Date(), startHour);
  const editing = draft.mode === 'edit' ? draft.expense : null;
  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(editing?.title ?? (draft.mode === 'new' ? draft.title ?? '' : ''));
  const [amount, setAmount] = useState(editing ? String(editing.amount) : draft.mode === 'new' && draft.amount ? String(draft.amount) : '');
  const [categoryId, setCategoryId] = useState(editing?.category?.id ?? editing?.categoryId ?? (draft.mode === 'new' ? draft.categoryId ?? '' : ''));
  const [method, setMethod] = useState<string>(editing?.paymentMethod ?? (draft.mode === 'new' ? draft.paymentMethod ?? 'CASH' : 'CASH'));
  const originalDay = editing ? businessDayKey(new Date(editing.expenseDate), startHour) : today;
  const [date, setDate] = useState(originalDay);
  const [pending, setPending] = useState(editing ? editing.status === 'PENDING' : draft.mode === 'new' && !!draft.pending);
  const [note, setNote] = useState(editing?.description ?? (draft.mode === 'new' ? draft.description ?? '' : ''));
  const [photo, setPhoto] = useState(editing?.attachmentUrl ?? '');
  const [shopId, setShopId] = useState('');
  const uploader = useImageUpload({ purpose: 'document', maxFiles: 20, maxSizeMB: 8, onUploaded: (r) => r[0] && setPhoto(r[0].url) });

  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000, enabled: allShops && !editing });
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive);
  useEffect(() => { if (allShops && !shopId && shops.length) setShopId((shops.find((s) => s.isMain) ?? shops[0]).id); }, [allShops, shopId, shops]);
  useEffect(() => { const t = setTimeout(() => (editing || !title ? titleRef.current : document.querySelector<HTMLInputElement>('#exp-amount'))?.focus(), 80); return () => clearTimeout(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = Number(amount);
  const cancelled = editing?.status === 'CANCELLED';
  const problems: string[] = [];
  if (!title.trim()) problems.push('Expense kis cheez ka hai, likhein');
  if (!(value > 0)) problems.push('Amount likhein');
  if (date > today) problems.push('Aane wale din ka expense nahi likh sakte');
  if (allShops && !editing && !shopId) problems.push('Branch chunein');

  const save = useMutation({
    mutationFn: async () => {
      if (problems.length) throw new Error(problems[0]);
      if (editing) {
        const payload: UpdateExpensePayload = {
          title: title.trim(), amount: value, categoryId, paymentMethod: method as ExpenseMethod,
          description: note.trim(), attachmentUrl: photo,
          ...(!cancelled && { status: pending ? 'PENDING' : 'PAID' }),
          ...(date !== originalDay && { expenseDate: date }),
        };
        return expensesApi.update(editing.id, payload);
      }
      const payload: CreateExpensePayload = {
        title: title.trim(), amount: value, paymentMethod: method as ExpenseMethod, expenseDate: date,
        status: pending ? 'PENDING' : 'PAID',
        ...(categoryId && { categoryId }),
        ...(note.trim() && { description: note.trim() }),
        ...(photo && { attachmentUrl: photo }),
        ...(allShops && shopId && { shopId }),
      };
      return expensesApi.create(payload);
    },
    onSuccess: (e) => {
      toast.success(editing ? 'Expense badal gaya' : e.expenseNumber.startsWith('LOCAL-') ? 'Internet nahi — expense phone me save, baad me khud chala jayega' : `${formatPKR(e.amount)} ka expense likh liya`);
      AFFECTED_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (err) => toast.error(apiError(err, 'Save nahi hua')),
  });

  // Ctrl/Cmd + Enter saves.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter' && !save.isPending) { ev.preventDefault(); save.mutate(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const cash = method === 'CASH' && !pending && !cancelled;
  const cashNote = useMemo(() => {
    if (!cash) return null;
    if (date !== today) return { tone: 'slate', text: 'Pichli date ka cash expense aaj ki shift (galla) me nahi ginta — sirf us din ke hisaab me aata hai.' };
    if (!register) return { tone: 'slate', text: 'Cash expense us branch ki khuli shift ke galle se ghat jata hai.' };
    if (!register.open) return { tone: 'amber', text: 'Is branch me abhi koi shift khuli nahi. Yeh cash kisi galle ke hisaab me nahi aayega.' };
    const at = new Date(register.openedAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' });
    return { tone: 'emerald', text: `Shift ${register.registerNumber} (${at} se khuli) ke galle se ghatega. Is shift me ab tak ${formatPKR(register.cashExpenses)} cash expense.` };
  }, [cash, date, today, register]);

  const seed = useMutation({
    mutationFn: async () => {
      let made = 0;
      for (const c of STARTER_CATEGORIES) {
        if (categories.some((x) => x.name.toLowerCase() === c.name.toLowerCase())) continue;
        try { await expenseCategoriesApi.create({ name: c.name, color: c.color, icon: c.icon }); made++; } catch { /* already there */ }
      }
      return made;
    },
    onSuccess: (n) => { toast.success(n ? `${n} categories ban gayi` : 'Sab pehle se hain'); qc.invalidateQueries({ queryKey: [CATEGORIES_KEY] }); },
  });

  const samples = STARTER_CATEGORIES.map((s) => ({ ...s, cat: categories.find((c) => c.name.toLowerCase() === s.name.toLowerCase()) })).filter((s) => s.cat);

  return (
    <Modal open onClose={onClose} size="lg" closeOnBackdrop={false}
      title={editing ? `Expense badlein · ${editing.expenseNumber}` : 'Naya expense'}
      description={editing ? 'Jo badalna hai badlein — baqi waisa hi rahega' : 'Bijli, kiraya, salary, chai-pani — har expense likhein taake profit sahi nikle'}
      footer={<>
        <span className="mr-auto hidden items-center gap-1.5 text-[0.75rem] text-slate-500 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save</span>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={uploader.uploading}>
          {editing ? 'Save karein' : pending ? 'Baqi bill likhein' : 'Expense likhein'}
        </Button>
      </>}>
      <div className="space-y-4">
        {allShops && !editing && (
          <div>
            <p className={labelCls}><Store className="mr-1 inline h-3.5 w-3.5" />Branch <span className="text-rose-600">*</span></p>
            <div className="flex flex-wrap gap-1.5">
              {shopsQ.isLoading && <span className="h-9 w-32 animate-pulse rounded-xl bg-slate-100" />}
              {shops.map((s) => (
                <button key={s.id} type="button" onClick={() => setShopId(s.id)} aria-pressed={shopId === s.id}
                  className={cn('h-9 rounded-xl px-3 text-[0.8125rem] font-semibold ring-1 transition', shopId === s.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                  {s.name}{s.isMain && <span className="ml-1 text-[0.6875rem] font-medium opacity-70">Main</span>}
                </button>
              ))}
            </div>
            <p className={hintCls}>Abhi "Sab branches" khula hai. Expense jis branch ka hai woh chunein — usi ke hisaab aur galle me jayega.</p>
          </div>
        )}

        {!editing && samples.length > 0 && !title && (
          <div>
            <p className={labelCls}>Jaldi chunein</p>
            <div className="flex flex-wrap gap-1.5">
              {samples.map((s) => (
                <button key={s.name} type="button" onClick={() => { setTitle(s.sample); setCategoryId(s.cat!.id); window.setTimeout(() => document.querySelector<HTMLInputElement>('#exp-amount')?.focus(), 0); }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 text-[0.75rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">
                  <span aria-hidden>{s.icon}</span>{s.sample}
                </button>
              ))}
            </div>
            <p className={hintCls}>Ek dabayein — naam aur category bhar jayegi, sirf amount likhein.</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <div>
            <label htmlFor="exp-title" className={labelCls}>Kis cheez ka expense? <span className="text-rose-600">*</span></label>
            <input id="exp-title" ref={titleRef} value={title} onChange={(ev) => setTitle(ev.target.value)} maxLength={120} placeholder="Maslan: Bijli ka bill October" className={inputCls} />
            <p className={hintCls}>Har mahine ek hi naam likhein (maslan "Dukaan ka kiraya") — Nafaa khud yaad dilayega ke is mahine ka baqi hai.</p>
          </div>
          <div>
            <label htmlFor="exp-amount" className={labelCls}>Amount (Rs) <span className="text-rose-600">*</span></label>
            <input id="exp-amount" inputMode="decimal" value={amount} onChange={(ev) => setAmount(ev.target.value.replace(/[^\d.]/g, ''))} placeholder="0"
              className={cn(inputCls, 'h-11 text-right text-lg font-bold tabular-nums')} />
            <p className={hintCls}>{value > 0 ? formatPKR(value) : 'Poori amount, paisa samet'}</p>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[0.8125rem] font-medium text-slate-700">Category</span>
            <button type="button" onClick={onManageCategories} className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-brand-700 hover:underline"><Settings2 className="h-3.5 w-3.5" />Categories sambhalein</button>
          </div>
          {categories.length === 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => seed.mutate()} loading={seed.isPending} leftIcon={<Sparkles className="h-4 w-4" />}>{STARTER_CATEGORIES.length} aam categories bana dein</Button>
              <Button size="sm" variant="secondary" onClick={onManageCategories} leftIcon={<Plus className="h-4 w-4" />}>Khud banayein</Button>
            </div>
          ) : (
            <div role="radiogroup" aria-label="Category" className="flex flex-wrap gap-1.5">
              <button type="button" role="radio" aria-checked={!categoryId} onClick={() => setCategoryId('')}
                className={cn('h-8 rounded-lg px-2.5 text-[0.75rem] font-semibold ring-1 transition', !categoryId ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
                Bina category
              </button>
              {categories.map((c) => {
                const on = categoryId === c.id;
                return (
                  <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => setCategoryId(on ? '' : c.id)}
                    className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.75rem] font-semibold ring-1 transition', on ? 'text-white shadow-sm' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}
                    style={on ? { backgroundColor: c.color, boxShadow: `0 0 0 1px ${c.color}` } : undefined}>
                    {c.icon ? <span aria-hidden>{c.icon}</span> : <span className="h-2 w-2 rounded-full" style={{ background: on ? '#fff' : c.color }} />}{c.name}
                  </button>
                );
              })}
            </div>
          )}
          <p className={hintCls}>Sahi category se Analytics batata hai paisa kahan ja raha hai — kiraya, bijli ya chai-pani.</p>
        </div>

        <div>
          <p className={labelCls}>Kahan se diye?</p>
          <div role="radiogroup" aria-label="Payment" className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
            {METHODS.map((m) => {
              const on = method === m.id;
              return (
                <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => setMethod(m.id)}
                  className={cn('inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-[0.8125rem] font-semibold ring-1 transition', on ? 'text-white shadow-sm' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}
                  style={on ? { backgroundColor: m.color, boxShadow: `0 0 0 1px ${m.color}` } : undefined}>
                  <m.icon className="h-4 w-4" style={on ? undefined : { color: m.color }} />{m.label}
                </button>
              );
            })}
          </div>
          {cashNote ? (
            <p className={cn('mt-1.5 flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.75rem] ring-1',
              cashNote.tone === 'emerald' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : cashNote.tone === 'amber' ? 'bg-amber-50 text-amber-900 ring-amber-200' : 'bg-slate-50 text-slate-600 ring-slate-200')}>
              <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0" />{cashNote.text}
            </p>
          ) : <p className={hintCls}>Cash galle se jata hai; JazzCash, Easypaisa, bank aur card galle ko nahi chhoote.</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="exp-date" className={labelCls}>Kis din?</label>
            <input id="exp-date" type="date" value={date} max={today} onChange={(ev) => setDate(ev.target.value || today)} className={cn(inputCls, '[color-scheme:light] dark:[color-scheme:dark]')} />
            <p className={hintCls}>{date === today ? 'Aaj — abhi ke waqt ke saath likha jayega.' : 'Purana bill likh rahe hain — usi din ke hisaab me jayega.'}</p>
          </div>
          {!cancelled && (
            <div>
              <p className={labelCls}>Paise diye?</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" onClick={() => setPending(false)} aria-pressed={!pending}
                  className={cn('h-10 rounded-xl text-[0.8125rem] font-semibold ring-1 transition', !pending ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>Haan, de diye</button>
                <button type="button" onClick={() => setPending(true)} aria-pressed={pending}
                  className={cn('inline-flex h-10 items-center justify-center gap-1 rounded-xl text-[0.8125rem] font-semibold ring-1 transition', pending ? 'bg-amber-500 text-white ring-amber-500' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}><Clock className="h-4 w-4" />Baad me dene</button>
              </div>
              <p className={hintCls}>{pending ? 'Baqi bill ban jayega. "Ada karein" dabane par us waqt ki date lagti hai aur cash galle se ghatta hai.' : 'Paise ja chuke hain — hisaab me abhi ginega.'}</p>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <label htmlFor="exp-note" className={labelCls}>Details</label>
            <textarea id="exp-note" value={note} onChange={(ev) => setNote(ev.target.value)} maxLength={500} rows={2}
              placeholder="Marzi hai — maslan: meter no. 1234, mistri ka naam"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
            <p className={hintCls}>Voucher par bhi chhapti hai. {note.length > 400 ? `${500 - note.length} harf baqi` : ''}</p>
          </div>
          <div>
            <p className={labelCls}>Bill ki photo</p>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(ev) => { const f = ev.target.files?.[0]; if (f) void uploader.upload([f]); ev.target.value = ''; }} />
            {photo ? (
              <span className="relative block h-16 w-16 overflow-hidden rounded-xl ring-1 ring-slate-200">
                <a href={photo} target="_blank" rel="noreferrer"><img src={photo} alt="Bill" className="h-full w-full object-cover" /></a>
                <button type="button" onClick={() => setPhoto('')} aria-label="Photo hatayein"
                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-white"><X className="h-3 w-3" /></button>
              </span>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploader.uploading}
                className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-slate-300 text-[0.6875rem] font-medium text-slate-500 hover:border-brand-400 hover:text-brand-700">
                {uploader.uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                {uploader.uploading ? 'Upload…' : 'Photo'}
              </button>
            )}
            <p className={cn(hintCls, 'max-w-[8rem]')}>Phone par camera khulta hai</p>
          </div>
        </div>

        {(title || amount) && problems.length > 0 && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {problems[0]}
          </p>
        )}
      </div>
    </Modal>
  );
}
