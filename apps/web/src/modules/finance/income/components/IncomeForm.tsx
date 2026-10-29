/**
 * Record or edit other income: what it was, amount, category (fixed list or
 * the shop's own), day, the company that paid, and where the money came:
 * the cash drawer, a money account, or set off in the supplier's khata.
 * On the all-branches view the branch is picked here.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Settings2, Store, Tag } from 'lucide-react';
import { Button, Kbd, Modal, Select, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { useIsAllShops } from '@core/stores/auth.store';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { moneyApi } from '@modules/finance/money/api/money.api';
import { suppliersApi } from '@modules/purchasing/suppliers/api/suppliers.api';
import { incomeApi, type Income, type IncomeCategoryCode, type IncomeCustomCategory, type IncomePayload, type IncomeReceivedVia } from '../api/income.api';
import { FIXED_CATEGORIES, INCOME_AFFECTED_KEYS, VIA, apiError } from './meta';

/** What the form opens with: a record to edit, or values to start a new one. */
export type IncomeDraft =
  | { mode: 'edit'; income: Income }
  | { mode: 'new'; prefill?: Partial<Pick<Income, 'title' | 'amount' | 'category' | 'categoryId' | 'supplierId' | 'receivedVia' | 'moneyAccountId' | 'repeatMonthly'>> };

const inputCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';
const labelCls = 'mb-1.5 block text-[0.8125rem] font-medium text-slate-700';
const hintCls = 'mt-1 text-[0.6875rem] text-slate-500';

export function IncomeForm({ draft, categories, onClose, onManageCategories }: {
  draft: IncomeDraft;
  categories: IncomeCustomCategory[];
  onClose: () => void;
  onManageCategories: () => void;
}) {
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const allShops = useIsAllShops();
  const today = businessDayKey(new Date(), startHour);
  const editing = draft.mode === 'edit' ? draft.income : null;
  const start = editing ?? (draft.mode === 'new' ? draft.prefill ?? {} : {});
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(start.title ?? '');
  const [amount, setAmount] = useState(start.amount ? String(start.amount) : '');
  const [category, setCategory] = useState<IncomeCategoryCode>(start.category ?? 'COMPANY_INCENTIVE');
  const [categoryId, setCategoryId] = useState(start.categoryId ?? '');
  const [supplierId, setSupplierId] = useState(start.supplierId ?? '');
  const [via, setVia] = useState<IncomeReceivedVia>(start.receivedVia ?? 'CASH_DRAWER');
  const [accountId, setAccountId] = useState(start.moneyAccountId ?? '');
  const [repeat, setRepeat] = useState(!!start.repeatMonthly);
  const originalDay = editing ? businessDayKey(new Date(editing.incomeDate), startHour) : today;
  const [date, setDate] = useState(originalDay);
  const [note, setNote] = useState(editing?.note ?? '');
  const [shopId, setShopId] = useState('');

  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000, enabled: allShops && !editing });
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive);
  useEffect(() => { if (allShops && !shopId && shops.length) setShopId((shops.find((s) => s.isMain) ?? shops[0]).id); }, [allShops, shopId, shops]);
  const suppliersQ = useQuery({ queryKey: ['suppliers', 'income-picker'], queryFn: () => suppliersApi.list({ status: 'active', sort: 'name', limit: 500 }), staleTime: 5 * 60_000 });
  const accountsQ = useQuery({ queryKey: ['money', 'money-accounts'], queryFn: () => moneyApi.moneyAccounts(), staleTime: 60_000, enabled: via === 'ACCOUNT' });
  const suppliers = suppliersQ.data?.items ?? [];
  const accounts = (accountsQ.data?.accounts ?? []).filter((a) => a.isActive);
  useEffect(() => { const t = setTimeout(() => titleRef.current?.focus(), 80); return () => clearTimeout(t); }, []);

  const value = Number(amount);
  const problems: string[] = [];
  if (!title.trim()) problems.push('Aamdani kis cheez ki hai, likhein');
  if (!(value > 0)) problems.push('Amount likhein');
  if (date > today) problems.push('Aane wale din ki aamdani nahi likh sakte');
  if (category === 'CUSTOM' && !categoryId) problems.push('Apni category chunein');
  if (via === 'ACCOUNT' && !accountId) problems.push('Paisa kis account mein aaya — account chunein');
  if (via === 'SUPPLIER_KHATA' && !supplierId) problems.push('Kis company/supplier ke khate mein adjust karna hai — chunein');
  if (allShops && !editing && !shopId) problems.push('Branch chunein');

  const save = useMutation({
    mutationFn: async () => {
      if (problems.length) throw new Error(problems[0]);
      const body: IncomePayload = {
        title: title.trim(), amount: value, category,
        categoryId: category === 'CUSTOM' ? categoryId : null,
        supplierId: supplierId || null, receivedVia: via,
        moneyAccountId: via === 'ACCOUNT' ? accountId : null,
        note: note.trim() || null, repeatMonthly: repeat,
      };
      if (editing) return incomeApi.update(editing.id, { ...body, ...(date !== originalDay && { incomeDate: date }) });
      return incomeApi.create({ ...body, incomeDate: date, ...(allShops && shopId && { shopId }) });
    },
    onSuccess: (i) => {
      toast.success(editing ? 'Aamdani ka record badal gaya' : `${formatPKR(i.amount)} ki aamdani likh li — profit mein jud gayi`);
      INCOME_AFFECTED_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
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

  const chip = (on: boolean) => cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.75rem] font-semibold ring-1 transition',
    on ? 'text-white shadow-sm' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50');

  return (
    <Modal open onClose={onClose} size="lg" closeOnBackdrop={false}
      title={editing ? `Aamdani badlein · ${editing.incomeNumber}` : 'Nayi aamdani'}
      description="Company incentive, scheme claim, commission, kiraya — sale ke ilawa jo paisa aaye, likhein taake net profit sahi nikle"
      footer={<>
        <span className="mr-auto hidden items-center gap-1.5 text-[0.75rem] text-slate-500 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save</span>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending}>{editing ? 'Save karein' : 'Aamdani likhein'}</Button>
      </>}>
      <div className="space-y-4">
        {allShops && !editing && (
          <div>
            <p className={labelCls}><Store className="mr-1 inline h-3.5 w-3.5" />Branch <span className="text-rose-600">*</span></p>
            <div className="flex flex-wrap gap-1.5">
              {shops.map((s) => (
                <button key={s.id} type="button" onClick={() => setShopId(s.id)} aria-pressed={shopId === s.id}
                  className={cn('h-9 rounded-xl px-3 text-[0.8125rem] font-semibold ring-1 transition', shopId === s.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                  {s.name}{s.isMain && <span className="ml-1 text-[0.6875rem] font-medium opacity-70">Main</span>}
                </button>
              ))}
            </div>
            <p className={hintCls}>Aamdani jis branch ki hai woh chunein — usi ke profit aur galle mein jayegi.</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <div>
            <label htmlFor="inc-title" className={labelCls}>Kis cheez ki aamdani? <span className="text-rose-600">*</span></label>
            <input id="inc-title" ref={titleRef} value={title} onChange={(ev) => setTitle(ev.target.value)} maxLength={120} placeholder="Maslan: Pepsi incentive October" className={inputCls} />
          </div>
          <div>
            <label htmlFor="inc-amount" className={labelCls}>Amount (Rs) <span className="text-rose-600">*</span></label>
            <input id="inc-amount" inputMode="decimal" value={amount} onChange={(ev) => setAmount(ev.target.value.replace(/[^\d.]/g, ''))} placeholder="0"
              className={cn(inputCls, 'h-11 text-right text-lg font-bold tabular-nums')} />
            <p className={hintCls}>{value > 0 ? formatPKR(value) : 'Poori amount'}</p>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[0.8125rem] font-medium text-slate-700">Category</span>
            <button type="button" onClick={onManageCategories} className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-brand-700 hover:underline"><Settings2 className="h-3.5 w-3.5" />Apni categories</button>
          </div>
          <div role="radiogroup" aria-label="Category" className="flex flex-wrap gap-1.5">
            {FIXED_CATEGORIES.map((c) => {
              const on = category === c.id;
              return (
                <button key={c.id} type="button" role="radio" aria-checked={on} title={c.hint} onClick={() => { setCategory(c.id); setCategoryId(''); }}
                  className={chip(on)} style={on ? { backgroundColor: c.color, boxShadow: `0 0 0 1px ${c.color}` } : undefined}>
                  <c.icon className="h-3.5 w-3.5" style={on ? undefined : { color: c.color }} />{c.label}
                </button>
              );
            })}
            {categories.filter((c) => c.isActive !== false).map((c) => {
              const on = category === 'CUSTOM' && categoryId === c.id;
              return (
                <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => { setCategory('CUSTOM'); setCategoryId(c.id); }}
                  className={chip(on)} style={on ? { backgroundColor: c.color, boxShadow: `0 0 0 1px ${c.color}` } : undefined}>
                  <Tag className="h-3.5 w-3.5" style={on ? undefined : { color: c.color }} />{c.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className={labelCls}>Paisa kahan aaya?</p>
          <div role="radiogroup" aria-label="Kahan aaya" className="grid gap-1.5 sm:grid-cols-3">
            {(Object.keys(VIA) as IncomeReceivedVia[]).map((k) => {
              const v = VIA[k];
              const on = via === k;
              return (
                <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setVia(k)}
                  className={cn('inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-[0.8125rem] font-semibold ring-1 transition', on ? 'text-white shadow-sm' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}
                  style={on ? { backgroundColor: v.color, boxShadow: `0 0 0 1px ${v.color}` } : undefined}>
                  <v.icon className="h-4 w-4 shrink-0" style={on ? undefined : { color: v.color }} />{v.label}
                </button>
              );
            })}
          </div>
          <p className={hintCls}>{VIA[via].hint}{via === 'CASH_DRAWER' && date !== today ? ' Pichli date ka cash aaj ki shift mein nahi ginta.' : ''}</p>
          {via === 'ACCOUNT' && (
            <Select wrapperClassName="mt-2" aria-label="Account" value={accountId} onChange={(ev) => setAccountId(ev.target.value)}
              placeholder={accountsQ.isLoading ? 'Accounts aa rahe hain…' : 'Account chunein'}
              options={accounts.map((a) => ({ value: a.id, label: `${a.name}${a.shop ? ` · ${a.shop.name}` : ''}` }))} />
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Select label={via === 'SUPPLIER_KHATA' ? 'Company / supplier *' : 'Company / supplier (marzi)'} value={supplierId} onChange={(ev) => setSupplierId(ev.target.value)}
              placeholder={suppliersQ.isLoading ? 'Suppliers aa rahe hain…' : 'Koi nahi'}
              options={[{ value: '', label: 'Koi nahi' }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
            <p className={hintCls}>{via === 'SUPPLIER_KHATA' ? 'Is supplier ko jo dena hai, us mein se itna kam ho jayega.' : 'Kis company ne diya — report mein dikhega.'}</p>
          </div>
          <div>
            <label htmlFor="inc-date" className={labelCls}>Kis din?</label>
            <input id="inc-date" type="date" value={date} max={today} onChange={(ev) => setDate(ev.target.value || today)} className={cn(inputCls, '[color-scheme:light] dark:[color-scheme:dark]')} />
            <p className={hintCls}>Usi din ke profit mein judegi.</p>
          </div>
        </div>

        <div>
          <label htmlFor="inc-note" className={labelCls}>Details</label>
          <textarea id="inc-note" value={note} onChange={(ev) => setNote(ev.target.value)} maxLength={500} rows={2} placeholder="Marzi hai — maslan: claim number, mahina"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
        </div>

        <Switch checked={repeat} onChange={(ev) => setRepeat(ev.target.checked)} label="Har mahine aati hai"
          description="Agle mahine Nafaa yaad dilayega ke is mahine ki abhi nahi likhi." />

        {(title || amount) && problems.length > 0 && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {problems[0]}
          </p>
        )}
      </div>
    </Modal>
  );
}
