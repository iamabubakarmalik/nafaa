/**
 * Pays a gawala: cash from the open drawer, or from a money account (bank,
 * JazzCash, Easypaisa, safe). Every payment is recorded and shows on the
 * gawala's statement.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Modal, Select, Textarea } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { farmersApi, type FarmerPayInput } from '../api/farmers.api';
import { PAY_METHODS, numIn } from '../lib/meta';

const DRAWER = '';

export function FarmerPayModal({ name, due, busy, onSubmit, onClose }: {
  name: string; due: number; busy?: boolean; onSubmit: (v: FarmerPayInput) => void; onClose: () => void;
}) {
  const [amount, setAmount] = useState(due > 0 ? String(Math.round(due)) : '');
  const [method, setMethod] = useState('CASH');
  const [accountId, setAccountId] = useState(DRAWER);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const accountsQ = useQuery({ queryKey: ['dairy-pay-accounts'], queryFn: farmersApi.payAccounts, staleTime: 60_000 });

  // Cash may come from the drawer or a cash account (safe); other methods from their accounts.
  const accounts = useMemo(() => (accountsQ.data ?? []).filter((a) => (method === 'CASH' ? a.kind === 'CASH' || a.method === 'CASH' : a.method === method || (a.kind !== 'CASH' && !a.method))), [accountsQ.data, method]);
  const options = [
    ...(method === 'CASH' ? [{ value: DRAWER, label: 'Galla (khula cash register)' }] : [{ value: DRAWER, label: 'Default account' }]),
    ...accounts.map((a) => ({ value: a.id, label: `${a.name}${a.shopName ? ` · ${a.shopName}` : ''}${a.isDefault ? ' (default)' : ''}` })),
  ];

  const submit = () => {
    const n = numIn(amount);
    if (!n || n <= 0) { setError('Amount likhein'); return; }
    setError('');
    onSubmit({ amount: n, paymentMethod: method, accountId: accountId || undefined, reference: reference.trim() || undefined, notes: notes.trim() || undefined });
  };
  const chips = [due > 0 ? Math.round(due) : null, 1000, 5000, 10000].filter((v, i, a): v is number => !!v && a.indexOf(v) === i);
  const hint = method === 'CASH'
    ? (accountId ? 'Cash is account se niklega — galla nahi badlega' : 'Cash khule galle se niklega — galla band ho to pehle kholein')
    : (accountId ? 'Paisa is account se niklega' : 'Is tareeqe ka default account ho to us se niklega; warna sirf record banega');

  return (
    <Modal open onClose={onClose} size="sm" title={`${name} ko payment`} description={`Dena hai ${formatPKR(due)}`}
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={busy} onClick={submit}>Payment dein</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <Input label="Amount (Rs)" inputMode="decimal" autoFocus value={amount} error={error} onChange={(e) => setAmount(e.target.value)}
          hint={due > 0 ? 'Purani parchiyan pehle ada hoti hain' : 'Gawale ka kuch baqi nahi — ye advance ban jayega'} />
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => <button key={c} type="button" onClick={() => setAmount(String(c))} className="h-8 rounded-lg px-2.5 text-[0.8125rem] font-semibold ring-1 ring-slate-200 hover:bg-slate-50">{c === Math.round(due) ? `Poora ${formatPKR(c)}` : formatPKR(c)}</button>)}
        </div>
        <Select label="Kaise" value={method} onChange={(e) => { setMethod(e.target.value); setAccountId(DRAWER); }} options={PAY_METHODS.filter((m) => m.value !== 'CARD')} />
        <Select label="Kahan se" value={accountId} onChange={(e) => setAccountId(e.target.value)} options={options} hint={hint} />
        <Input label="Reference (marzi)" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ID, cheque number" maxLength={80} />
        <Textarea label="Note (marzi)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} />
      </form>
    </Modal>
  );
}
