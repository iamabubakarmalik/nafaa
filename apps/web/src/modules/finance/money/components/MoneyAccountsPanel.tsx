/**
 * Safe, bank and wallet accounts with their real balance, today's in and
 * out, and actions: statement, move money, deposit / withdraw / correct,
 * edit and turn off.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeftRight, Download, Eye, EyeOff, FileText, Pencil, Plus, Power, RotateCcw, Sparkles, Wallet,
} from 'lucide-react';
import { PrintButton } from '@core/print';
import { Button, Card, Modal, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { moneyApi, type MoneyAccountList, type MoneyAccountRow } from '../api/money.api';
import type { EntryKind } from './AccountEntryModal';
import { ACCOUNTS, KINDS, MONEY_KEY, STATEMENT_KINDS, apiError, maskNumber, when } from './meta';
import { accountStatementDoc } from './print';

export function MoneyAccountsPanel({
  list, money, period, periodText, showInactive, setShowInactive, canSetup, canMove, onNew, onEdit, onMove, onEntry,
}: {
  list?: MoneyAccountList;
  money: (n: number) => string;
  period?: { from: string; to: string };
  periodText: string;
  showInactive: boolean;
  setShowInactive: (v: boolean) => void;
  canSetup: boolean;
  canMove: boolean;
  onNew: () => void;
  onEdit: (a: MoneyAccountRow) => void;
  onMove: (from?: string, to?: string) => void;
  onEntry: (a: MoneyAccountRow, kind: EntryKind) => void;
}) {
  const qc = useQueryClient();
  const [statement, setStatement] = useState<MoneyAccountRow | null>(null);
  const [closing, setClosing] = useState<MoneyAccountRow | null>(null);

  const importQ = useMutation({
    mutationFn: moneyApi.importReceiptAccounts,
    onSuccess: (r) => {
      toast.success(r.created ? `${r.created} account ban gaye${r.skipped ? ` · ${r.skipped} pehle se the` : ''}` : 'Sab accounts pehle se bane hue hain');
      qc.invalidateQueries({ queryKey: [MONEY_KEY] });
    },
    onError: (e) => toast.error(apiError(e, 'Accounts nahi bane')),
  });

  const reactivate = useMutation({
    mutationFn: (a: MoneyAccountRow) => moneyApi.updateAccount(a.id, { isActive: true }),
    onSuccess: () => { toast.success('Account dobara chalu ho gaya'); qc.invalidateQueries({ queryKey: [MONEY_KEY] }); },
    onError: (e) => toast.error(apiError(e, 'Chalu nahi hua')),
  });

  const accounts = list?.accounts ?? [];

  return (
    <Card className="rounded-2xl"
      title={<span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-brand-600" />Tijori, bank aur wallets</span>}
      description="Asal balance — shuru ki raqam + khud judne wali bikri/adaigi + haath ki entries"
      actions={
        <span className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setShowInactive(!showInactive)}
            leftIcon={showInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}>
            {showInactive ? 'Band chhupayein' : 'Band bhi dikhayein'}
          </Button>
          {canMove && accounts.some((a) => a.isActive) && (
            <Button size="sm" variant="secondary" onClick={() => onMove()} leftIcon={<ArrowLeftRight className="h-4 w-4" />}>Paisa bhejein</Button>
          )}
          {canSetup && <Button size="sm" onClick={onNew} leftIcon={<Plus className="h-4 w-4" />}>Naya account</Button>}
        </span>
      }>
      {!list ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
      ) : !accounts.length ? (
        <div className="py-8 text-center">
          <Wallet className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-2 font-semibold text-slate-900">Abhi koi account nahi</p>
          <p className="mt-1 text-sm text-slate-500">Bank ya JazzCash account banayein — phir us ka asal balance yahan dikhega.</p>
          {canSetup && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={onNew} leftIcon={<Plus className="h-4 w-4" />}>Naya account</Button>
              <Button size="sm" variant="secondary" loading={importQ.isPending} onClick={() => importQ.mutate()} leftIcon={<Download className="h-4 w-4" />}>
                Raseed wale accounts layein
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {accounts.map((a) => (
              <AccountCard key={a.id} a={a} money={money} canSetup={canSetup} canMove={canMove}
                onStatement={() => setStatement(a)} onEdit={() => onEdit(a)} onMove={() => onMove(a.id)}
                onEntry={(k) => onEntry(a, k)} onClose={() => setClosing(a)} onReactivate={() => reactivate.mutate(a)} />
            ))}
          </div>
          {canSetup && (
            <button type="button" disabled={importQ.isPending} onClick={() => importQ.mutate()}
              className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-brand-700 hover:underline disabled:opacity-60">
              <Download className="h-4 w-4" />Settings → Raseed me likhe accounts yahan layein
            </button>
          )}
        </>
      )}

      {statement && <StatementModal account={statement} money={money} period={period} periodText={periodText} onClose={() => setStatement(null)} />}
      {closing && <CloseAccountModal account={closing} money={money} onClose={() => setClosing(null)} onMove={() => { setClosing(null); onMove(closing.id); }} />}
    </Card>
  );
}

function AccountCard({ a, money, canSetup, canMove, onStatement, onEdit, onMove, onEntry, onClose, onReactivate }: {
  a: MoneyAccountRow; money: (n: number) => string; canSetup: boolean; canMove: boolean;
  onStatement: () => void; onEdit: () => void; onMove: () => void; onEntry: (k: EntryKind) => void; onClose: () => void; onReactivate: () => void;
}) {
  const k = KINDS[a.kind];
  const number = maskNumber(a.accountNumber);
  return (
    <div className={cn('flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80', !a.isActive && 'opacity-60')}>
      <div className="flex items-start gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${k.color}17`, color: k.color }}><k.icon className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-slate-900">{a.name}</span>
          <span className="block truncate text-[0.75rem] text-slate-500">
            {[a.bankName, number, a.shop?.name ?? 'Poora karobar'].filter(Boolean).join(' · ')}
          </span>
        </span>
        {!a.isActive && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-medium text-slate-600">Band</span>}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {a.method && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-medium text-slate-600">{ACCOUNTS[a.method].short}</span>
        )}
        {a.auto && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-medium text-emerald-700"
            title="Is tareeqe ki bikri, wapsi, kharch aur adaigi khud is account me judti hai">
            <Sparkles className="h-3 w-3" />Khud judta hai
          </span>
        )}
      </div>

      <span className="mt-3 text-[0.75rem] text-slate-500">Balance</span>
      <span className={cn('text-xl font-bold tabular-nums', a.balance < 0 ? 'text-rose-700' : 'text-slate-900')}>{money(a.balance)}</span>
      <span className="mt-1 text-[0.6875rem] text-slate-500">Aaj: <span className="text-emerald-700">+{money(a.todayIn)}</span> · <span className="text-rose-700">−{money(a.todayOut)}</span></span>

      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
        <Button size="sm" variant="ghost" onClick={onStatement} leftIcon={<FileText className="h-4 w-4" />}>Statement</Button>
        {a.isActive ? <>
          {canMove && <>
            <Button size="sm" variant="ghost" onClick={onMove} leftIcon={<ArrowLeftRight className="h-4 w-4" />}>Bhejein</Button>
            <Button size="sm" variant="ghost" onClick={() => onEntry('DEPOSIT')}>Jama</Button>
            <Button size="sm" variant="ghost" onClick={() => onEntry('WITHDRAW')}>Nikala</Button>
            <Button size="sm" variant="ghost" onClick={() => onEntry('ADJUSTMENT')}>Durusti</Button>
          </>}
          {canSetup && <>
            <Button size="sm" variant="ghost" onClick={onEdit} leftIcon={<Pencil className="h-4 w-4" />}>Badlein</Button>
            <Button size="sm" variant="ghost" onClick={onClose} leftIcon={<Power className="h-4 w-4" />}>Band</Button>
          </>}
        </> : canSetup && (
          <Button size="sm" variant="ghost" onClick={onReactivate} leftIcon={<RotateCcw className="h-4 w-4" />}>Chalu karein</Button>
        )}
      </div>
    </div>
  );
}

function CloseAccountModal({ account, money, onClose, onMove }: {
  account: MoneyAccountRow; money: (n: number) => string; onClose: () => void; onMove: () => void;
}) {
  const qc = useQueryClient();
  const hasMoney = account.entryCount > 0 && Math.abs(account.balance) >= 0.01;
  const remove = useMutation({
    mutationFn: () => moneyApi.removeAccount(account.id),
    onSuccess: (r) => {
      toast.success(r.removed ? 'Account mita diya' : 'Account band ho gaya');
      qc.invalidateQueries({ queryKey: [MONEY_KEY] });
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Band nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`${account.name} band karein?`}
      footer={hasMoney ? <>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={onMove} leftIcon={<ArrowLeftRight className="h-4 w-4" />}>Pehle paisa bhejein</Button>
      </> : <>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>Band karein</Button>
      </>}>
      <p className="text-[0.875rem] text-slate-700">
        {hasMoney
          ? `Is account me abhi ${money(account.balance)} hain. Band karne se pehle ye paisa golak ya doosre account me bhejein.`
          : account.entryCount
            ? 'Account band ho jayega aur list se chhup jayega. Purani entries mehfooz rahengi; "Band bhi dikhayein" se dobara chalu kar sakte hain.'
            : 'Is account par koi entry nahi, is liye ye poori tarah mit jayega.'}
        {account.auto && !hasMoney && ' Is ke tareeqe ki bikri phir kisi account me khud nahi judegi jab tak naya default na banayein.'}
      </p>
    </Modal>
  );
}

/** On-screen statement for the page's period, with print. */
function StatementModal({ account, money, period, periodText, onClose }: {
  account: MoneyAccountRow; money: (n: number) => string; period?: { from: string; to: string }; periodText: string; onClose: () => void;
}) {
  const q = useQuery({
    queryKey: [MONEY_KEY, 'statement', account.id, period],
    queryFn: () => moneyApi.statement(account.id, period ?? {}),
  });
  const s = q.data;
  return (
    <Modal open onClose={onClose} size="xl" title={`${account.name} — statement`} description={periodText}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Band karein</Button>
        <PrintButton doc={() => accountStatementDoc(s!, periodText)} disabled={!s} label="Print" />
      </>}>
      {q.isError ? (
        <p className="py-10 text-center text-[0.875rem] text-rose-700">{apiError(q.error, 'Statement load nahi hui')}</p>
      ) : !s ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-[0.8125rem] sm:grid-cols-4">
            {([['Shuru', s.opening, ''], ['Aaya', s.in, 'text-emerald-700'], ['Gaya', s.out, 'text-rose-700'], ['Aakhir', s.closing, '']] as const).map(([l, v, c]) => (
              <div key={l} className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                <span className="block text-[0.75rem] text-slate-500">{l}</span>
                <b className={cn('tabular-nums', c || 'text-slate-900')}>{money(v)}</b>
              </div>
            ))}
          </div>
          {!s.lines.length ? (
            <p className="py-8 text-center text-[0.875rem] text-slate-500">Is muddat me koi entry nahi</p>
          ) : (
            <ul className="max-h-[50vh] divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200">
              {s.lines.map((l) => {
                const m = STATEMENT_KINDS[l.kind];
                const inflow = l.direction === 'in';
                return (
                  <li key={l.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${m.color}14`, color: m.color }}><m.icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.875rem] font-medium text-slate-900">{l.party || m.label}</span>
                      <span className="block truncate text-[0.75rem] text-slate-500">{[when(l.at), m.label, l.reference, l.note, l.by].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className={cn('block font-semibold tabular-nums', inflow ? 'text-emerald-700' : 'text-rose-700')}>{inflow ? '+' : '−'}{money(l.amount)}</span>
                      <span className="block text-[0.6875rem] tabular-nums text-slate-500">{money(l.balance)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
