import { useState } from 'react';
import { X, HandCoins, Target, Percent, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import {
  BASIS_META, type CommissionBasis, type CommissionRule, type CommissionValueType,
} from '../api/commission.api';

/* ═════════════════════════════════════════════════════════════
   Ek rule banane ya badalne ka khana
   ─────────────────────────────────────────────────────────────
   Do alag faisle hain aur log inhe aksar mila dete hain:

     1. KIS PAR — bikri par, munafa par, ya har bill par
     2. KITNA   — percent me, ya seedhi raqam me

   Is liye dono alag alag poochte hain. "Bikri par 2.5%" aur
   "har bikne wali cheez par Rs 20" dono ek hi khane se bante
   hain, bas doosra switch badalta hai.
   ═════════════════════════════════════════════════════════════ */

export function CommissionRuleModal({
  rule, people, categories, saving, onClose, onSave, onDelete,
}: {
  rule?: CommissionRule | null;
  people: Array<{ userId: string | null; name: string; role?: string | null; canSell: boolean; staff?: any }>;
  categories: Array<{ id: string; name: string }>;
  saving?: boolean;
  onClose: () => void;
  onSave: (r: any) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(rule?.name ?? '');
  const [basis, setBasis] = useState<CommissionBasis>(rule?.basis ?? 'SALE');
  const [valueType, setValueType] = useState<CommissionValueType>(rule?.valueType ?? 'PERCENT');
  const [value, setValue] = useState<string>(rule?.value != null ? String(rule.value) : '');
  const [userId, setUserId] = useState<string>(rule?.userId ?? '');
  const [cats, setCats] = useState<string[]>(rule?.categoryIds ?? []);
  const [minSale, setMinSale] = useState<string>(rule?.minMonthlySale != null ? String(rule.minMonthlySale) : '');
  const [target, setTarget] = useState<string>(rule?.targetAmount != null ? String(rule.targetAmount) : '');
  const [bonus, setBonus] = useState<string>(rule?.targetBonus != null ? String(rule.targetBonus) : '');
  const [note, setNote] = useState(rule?.note ?? '');

  /* "Har bill par" ki apni koi percent nahi hoti — wo hamesha raqam hai */
  const perBill = basis === 'PER_BILL';
  const effType: CommissionValueType = perBill ? 'FIXED' : valueType;
  const num = Number(value || 0);

  const errors: string[] = [];
  if (!(num > 0)) errors.push('Commission ki raqam likhein');
  if (effType === 'PERCENT' && num > 100) errors.push('Percent 100 se zyada nahi ho sakta');
  if (target && !bonus) errors.push('Target likha hai to bonus bhi likhein');

  const submit = () => {
    if (errors.length > 0) return toast.error(errors[0]);
    onSave({
      name: name.trim() || null,
      userId: userId || null,
      basis,
      valueType: effType,
      value: num,
      categoryIds: cats,
      minMonthlySale: minSale ? Number(minSale) : null,
      targetAmount: target ? Number(target) : null,
      targetBonus: bonus ? Number(bonus) : null,
      isActive: rule?.isActive ?? true,
      note: note.trim() || null,
    });
  };

  /* Misal — number ka matlab turant samajh aa jaye */
  const example = (() => {
    if (num <= 0) return null;
    if (perBill) return `50 bill = ${formatPKR(num * 50)}`;
    if (effType === 'FIXED') return `20 cheezein bikin = ${formatPKR(num * 20)}`;
    const base = 100_000;
    return `${formatPKR(base)} ki ${basis === 'PROFIT' ? 'bachat' : 'bikri'} par = ${formatPKR((base * num) / 100)}`;
  })();

  const sellers = people.filter((p) => p.canSell && p.userId);

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        <header className="p-5 bg-gradient-to-br from-violet-600 to-purple-700 text-white shrink-0 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-lg font-black inline-flex items-center gap-2">
              <HandCoins className="h-5 w-5" /> {rule ? 'Rule badlein' : 'Naya rule'}
            </h3>
            <p className="text-xs font-bold text-white/80 mt-0.5">Commission kis hisab se banegi</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <Label opt>Rule ka naam</Label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Jaise: Cake par 5%"
              className={inp} />
          </div>

          {/* 1. Kis par */}
          <div>
            <Label>1 · Kis par lagna hai</Label>
            <div className="grid gap-2">
              {(Object.keys(BASIS_META) as CommissionBasis[]).map((b) => {
                const m = BASIS_META[b];
                const on = basis === b;
                return (
                  <button key={b} onClick={() => setBasis(b)}
                    className={`p-3 rounded-2xl border-2 text-left transition ${
                      on
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-violet-400'
                    }`}>
                    <div className="text-sm font-black text-slate-900 dark:text-white">{m.emoji} {m.label}</div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{m.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Percent ya raqam */}
          <div>
            <Label>2 · Kitna</Label>
            {!perBill && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {([
                  ['PERCENT', 'Percent', Percent, 'Jaise 2.5% — bari bikri par zyada'],
                  ['FIXED', 'Seedhi raqam', Banknote, 'Jaise Rs 20 har cheez par'],
                ] as const).map(([v, l, Icon, hint]) => {
                  const on = valueType === v;
                  return (
                    <button key={v} onClick={() => setValueType(v)}
                      className={`p-2.5 rounded-2xl border-2 text-left transition ${
                        on
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-violet-400'
                      }`}>
                      <div className="text-xs font-black text-slate-900 dark:text-white inline-flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" /> {l}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{hint}</div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="relative">
              {effType === 'FIXED' && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">Rs</span>
              )}
              <input type="number" step={effType === 'PERCENT' ? '0.1' : '1'} min={0} autoFocus
                value={value} onChange={(e) => setValue(e.target.value)}
                placeholder={effType === 'PERCENT' ? '2.5' : '20'}
                className={`h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${
                  effType === 'FIXED' ? 'pl-10' : 'pl-3'
                } pr-12 text-lg font-black text-slate-900 dark:text-white tabular-nums focus:outline-none focus:border-violet-500 transition`} />
              {effType === 'PERCENT' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">%</span>
              )}
            </div>

            <p className="mt-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {perBill
                ? 'Har bill par itne rupay — chahe bill chhota ho ya bara.'
                : effType === 'PERCENT'
                  ? `${basis === 'PROFIT' ? 'Munafe' : 'Bikri'} ka itna percent.`
                  : 'Har bikne wali cheez par itne rupay (miqdar ke hisab se).'}
            </p>
            {example && (
              <p className="mt-1 text-[12px] font-black text-violet-700 dark:text-violet-400">
                Misal: {example}
              </p>
            )}
          </div>

          {/* 3. Kis bande par */}
          <div>
            <Label>3 · Kis bande par</Label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className={inp}>
              <option value="">👥 Sab bandon par</option>
              {sellers.map((p) => (
                <option key={p.userId!} value={p.userId!}>
                  {p.name}{p.staff?.designation ? ` — ${p.staff.designation}` : p.role ? ` — ${p.role}` : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Kisi ek ka alag rule banayein to us par wohi chalega, "sab wala" nahi.
            </p>
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <Label opt>Sirf in categories par</Label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {categories.map((c) => {
                  const on = cats.includes(c.id);
                  return (
                    <button key={c.id}
                      onClick={() => setCats((prev) => on ? prev.filter((x) => x !== c.id) : [...prev, c.id])}
                      className={`h-9 px-2.5 rounded-xl border-2 text-[11px] font-black transition ${
                        on
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-violet-400'
                      }`}>{c.name}</button>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Kuch na chunein to har cheez par lagu. Chunne par sirf unhi cheezon ki bikri
                ginti hai — jaise sirf cake par 5%.
              </p>
            </div>
          )}

          <div>
            <Label opt>Hadd — itni bikri ke baad commission shuru ho</Label>
            <input type="number" min={0} value={minSale} onChange={(e) => setMinSale(e.target.value)}
              placeholder="0" className={`${inp} tabular-nums`} />
            <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Khali chhorein to pehle rupay se hi commission banti hai.
            </p>
          </div>

          <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 space-y-2.5">
            <p className="text-[11px] font-black uppercase tracking-wide text-amber-800 dark:text-amber-300 inline-flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" /> Target ka bonus (marzi)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {([['Target', target, setTarget, '300000'], ['Bonus', bonus, setBonus, '5000']] as const).map(([l, v, set, ph]) => (
                <div key={l}>
                  <span className="block mb-1 text-[10px] font-black uppercase text-slate-500">{l}</span>
                  <input type="number" min={0} value={v} onChange={(e) => set(e.target.value)} placeholder={ph}
                    className="h-11 w-full rounded-xl border-2 border-amber-200 dark:border-amber-500/40 bg-white dark:bg-slate-800 px-2.5 text-sm font-black text-slate-900 dark:text-white tabular-nums focus:outline-none focus:border-amber-500 transition" />
                </div>
              ))}
            </div>
            <p className="text-[11px] font-bold text-amber-800/80 dark:text-amber-300/80">
              Mahine me target poora hua to commission ke upar se itna aur mil jayega.
            </p>
          </div>

          <div>
            <Label opt>Note</Label>
            <input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Kis liye banaya — baad me yaad rahe" className={inp} />
          </div>
        </div>

        <footer className="p-4 border-t-2 border-slate-100 dark:border-slate-800 shrink-0 flex gap-2">
          {onDelete && (
            <button onClick={onDelete} disabled={saving}
              className="h-12 px-4 rounded-xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 text-sm font-black disabled:opacity-50 transition">
              Hatayein
            </button>
          )}
          <button onClick={onClose}
            className="flex-1 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-black transition">
            Rehne dein
          </button>
          <Button onClick={submit} disabled={errors.length > 0} loading={saving}
            className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700">
            {rule ? 'Badal dein' : 'Bana dein'}
          </Button>
        </footer>
      </div>
    </div>
  );
}

const inp = 'h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition';

function Label({ children, opt }: any) {
  return (
    <span className="block mb-1.5 text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children} {opt && <span className="normal-case font-bold text-slate-400">(marzi)</span>}
    </span>
  );
}
