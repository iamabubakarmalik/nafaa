/**
 * Move money between the drawer and the accounts, or between two accounts,
 * with live before and after balances. Drawer moves are saved with a cash
 * register entry, so the drawer count follows.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowLeftRight, TriangleAlert } from 'lucide-react';
import { Button, Checkbox, Input, Modal, Select } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { moneyApi, type MoneyAccountRow, type MoneyDrawer } from '../api/money.api';
import { KINDS, MONEY_KEY, apiError, newRequestId } from './meta';

/** The open drawer, as a source or target. */
export const DRAWER = 'DRAWER';

const REASONS = {
  toAccount: ['Bank me jama karaya', 'Din ki sale jama', 'Tijori me rakha'],
  toDrawer: ['Khulle paise laye', 'Bank se nikal kar laye', 'Tijori se nikala'],
  between: ['Wallet se bank me', 'Bank se wallet me', 'Card machine ka paisa aaya', 'Doosri branch ko'],
};

export function MoveMoneyModal({ accounts, drawer, allShops, canDrawer, from: initialFrom, to: initialTo, onClose }: {
  /** Active accounts in view. */
  accounts: MoneyAccountRow[];
  /** Open drawer of the active branch, if any. */
  drawer: MoneyDrawer | null;
  allShops: boolean;
  canDrawer: boolean;
  from?: string;
  to?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const drawerOk = canDrawer && !allShops && !!drawer;
  const firstAcc = accounts[0]?.id ?? '';
  const [from, setFrom] = useState(initialFrom ?? (drawerOk ? DRAWER : firstAcc));
  const [to, setTo] = useState(initialTo ?? (accounts.find((a) => a.id !== (initialFrom ?? (drawerOk ? DRAWER : firstAcc)))?.id ?? ''));
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [allowNegative, setAllowNegative] = useState(false);
  const [tried, setTried] = useState(false);
  const [requestId] = useState(newRequestId);

  const byId = new Map(accounts.map((a) => [a.id, a]));
  const balanceOf = (id: string) => (id === DRAWER ? drawer?.expected ?? 0 : byId.get(id)?.balance ?? 0);
  const labelOf = (id: string) => (id === DRAWER ? `Golak${drawer ? ` · ${drawer.registerNumber}` : ''}` : byId.get(id)?.name ?? '');
  const options = [
    ...(drawerOk ? [{ value: DRAWER, label: `Golak (cash drawer) — ${formatPKR(drawer!.expected)}` }] : []),
    ...accounts.map((a) => ({ value: a.id, label: `${a.name}${a.shop ? '' : ' · poora karobar'} — ${formatPKR(a.balance)}` })),
  ];

  const value = Number(amount) || 0;
  const fromAfter = balanceOf(from) - value;
  const short = value > 0 && fromAfter < -0.005;
  const pair = from === DRAWER ? 'toAccount' : to === DRAWER ? 'toDrawer' : 'between';
  const errors = {
    from: !from ? 'Kahan se chunein' : undefined,
    to: !to ? 'Kahan chunein' : from === to ? 'Dono taraf alag chunein' : undefined,
    amount: value <= 0 ? 'Amount likhein' : short && !allowNegative ? 'Itna paisa nahi hai' : undefined,
    reason: reason.trim().length < 2 ? 'Wajah likhein ya neeche se chunein' : undefined,
  };
  const ok = !errors.from && !errors.to && !errors.amount && !errors.reason;

  const save = useMutation({
    mutationFn: () => {
      const base = { amount: value, reason: reason.trim(), note: note.trim() || undefined, requestId, allowNegative };
      if (from === DRAWER) return moneyApi.drawerToAccount({ ...base, accountId: to, registerId: drawer?.id });
      if (to === DRAWER) return moneyApi.accountToDrawer({ ...base, accountId: from, registerId: drawer?.id });
      return moneyApi.transfer({ ...base, fromAccountId: from, toAccountId: to });
    },
    onSuccess: (r) => {
      toast.success(r.duplicate ? 'Ye entry pehle hi save ho chuki thi' : `${formatPKR(value)} ${labelOf(from)} se ${labelOf(to)} me chale gaye`);
      qc.invalidateQueries({ queryKey: [MONEY_KEY] });
      qc.invalidateQueries({ queryKey: ['cash-register'] });
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });

  const submit = () => {
    setTried(true);
    if (ok && !save.isPending) save.mutate();
  };

  const swap = () => { setFrom(to); setTo(from); };

  return (
    <Modal open onClose={onClose} size="md" title="Paisa bhejein"
      description="Golak, tijori, bank aur wallet ke darmiyan. Dono taraf ka hisaab saath badalta hai."
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={save.isPending} onClick={submit} leftIcon={<ArrowLeftRight className="h-4 w-4" />}>Bhejein</Button>
      </>}>
      {options.length < 2 ? (
        <p className="flex gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-[0.875rem] text-amber-900 ring-1 ring-amber-200">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          Paisa bhejne ke liye kam se kam do jagah chahiye — pehle "Naya account" banayein{!drawerOk && ' ya branch chun kar register kholein'}.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="space-y-1">
            <Select label="Kahan se" value={from} onChange={(e) => setFrom(e.target.value)} options={options} placeholder="Chunein"
              error={tried ? errors.from : undefined} />
            <div className="flex justify-center">
              <button type="button" onClick={swap} title="Ulta karein" className="rounded-full bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200">
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
            <Select label="Kahan" value={to} onChange={(e) => setTo(e.target.value)} options={options} placeholder="Chunein"
              error={tried ? errors.to : undefined} />
          </div>

          <Input label="Amount" required type="number" inputMode="decimal" min={0} step="any" value={amount} data-autofocus
            onChange={(e) => setAmount(e.target.value)} placeholder="0" size="lg" error={tried ? errors.amount : undefined} />

          {from && to && from !== to && (
            <div className="grid grid-cols-2 gap-2 text-[0.8125rem]">
              {[from, to].map((id, i) => {
                const before = balanceOf(id);
                const after = before + (i === 0 ? -value : value);
                const kind = id === DRAWER ? null : byId.get(id)?.kind;
                const Icon = kind ? KINDS[kind].icon : null;
                return (
                  <div key={id} className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                    <p className="flex items-center gap-1.5 truncate font-medium text-slate-800">{Icon && <Icon className="h-3.5 w-3.5" />}{labelOf(id)}</p>
                    <p className="mt-1 text-slate-500">Abhi <b className="tabular-nums text-slate-900">{formatPKR(before)}</b></p>
                    <p className="text-slate-500">Baad me <b className={cn('tabular-nums', after < 0 ? 'text-rose-700' : 'text-slate-900')}>{formatPKR(after)}</b></p>
                  </div>
                );
              })}
            </div>
          )}

          {short && (
            <Checkbox checked={allowNegative} onChange={(e) => setAllowNegative(e.target.checked)}
              label="Phir bhi bhejein (minus me jane dein)"
              description={from === DRAWER ? 'Golak ka hisaab kam dikh raha hai — pehle gin lein.' : 'Asal account me zyada ho to theek hai; baad me durusti kar lein.'} />
          )}

          <div>
            <Input label="Wajah" required value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120}
              placeholder="Maslan: Bank me jama karaya" error={tried ? errors.reason : undefined} />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {REASONS[pair].map((r) => (
                <button key={r} type="button" onClick={() => setReason(r)}
                  className={cn('rounded-full px-2.5 py-1 text-[0.75rem] font-medium ring-1 transition',
                    reason === r ? 'bg-brand-50 text-brand-800 ring-brand-200' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{r}</button>
              ))}
            </div>
          </div>

          <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300}
            placeholder="Marzi hai" hint="Deposit slip ya transaction ID" />
        </form>
      )}
    </Modal>
  );
}
