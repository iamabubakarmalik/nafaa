/**
 * Create or edit a money account: kind, name, payment method, bank details,
 * opening balance and date, and whether it is the default account for its
 * method (then that method's sales and payments land here by themselves).
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Input, Modal, Select, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { moneyApi, type MoneyAccount, type MoneyAccountInput, type MoneyAccountKind, type MoneyAccountRow } from '../api/money.api';
import { ACCOUNTS, KINDS, KIND_IDS, MONEY_KEY, apiError } from './meta';

/** Methods an account can take automatically; cash belongs to the drawer. */
const METHODS: Array<{ value: MoneyAccount; label: string }> = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CARD', label: 'Card (machine ka paisa)' },
  { value: 'JAZZCASH', label: 'JazzCash' },
  { value: 'EASYPAISA', label: 'Easypaisa' },
];

/** Local calendar day as YYYY-MM-DD. */
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => dayKey(new Date());

export function AccountFormModal({ account, allShops, isOwner, onClose }: {
  /** Editing when given; a new account otherwise. */
  account?: MoneyAccountRow;
  allShops: boolean;
  isOwner: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const editing = !!account;
  const [kind, setKind] = useState<MoneyAccountKind>(account?.kind ?? 'BANK');
  const [name, setName] = useState(account?.name ?? '');
  const [method, setMethod] = useState<'' | MoneyAccount>(account?.method ?? '');
  const [bankName, setBankName] = useState(account?.bankName ?? '');
  const [accountTitle, setAccountTitle] = useState(account?.accountTitle ?? '');
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber ?? '');
  const [iban, setIban] = useState(account?.iban ?? '');
  const [opening, setOpening] = useState(account ? String(account.openingBalance) : '');
  const [openingDate, setOpeningDate] = useState(account ? dayKey(new Date(account.openingDate)) : today());
  const [isDefault, setIsDefault] = useState(account?.isDefault ?? false);
  const [business, setBusiness] = useState(allShops);
  const [tried, setTried] = useState(false);

  const cash = kind === 'CASH';
  const errors = {
    name: name.trim().length < 2 ? 'Naam likhein' : undefined,
    opening: opening && Number.isNaN(Number(opening)) ? 'Sahi raqam likhein' : undefined,
    date: openingDate > today() ? 'Aage ki tareekh nahi chalti' : undefined,
  };
  const ok = !errors.name && !errors.opening && !errors.date;

  const body = (): MoneyAccountInput => ({
    name: name.trim(),
    kind,
    method: cash ? null : method || null,
    bankName: cash ? '' : bankName.trim(),
    accountTitle: cash ? '' : accountTitle.trim(),
    accountNumber: cash ? '' : accountNumber.trim(),
    iban: kind === 'BANK' ? iban.trim() : '',
    openingBalance: Number(opening) || 0,
    // Sent only when changed. Today means "from now"; an earlier day starts at its midnight.
    ...((!account || openingDate !== dayKey(new Date(account.openingDate))) && {
      openingDate: openingDate === today() ? new Date().toISOString() : new Date(`${openingDate}T00:00:00`).toISOString(),
    }),
    isDefault: !cash && !!method && isDefault,
  });

  const save = useMutation({
    mutationFn: () => (account
      ? moneyApi.updateAccount(account.id, body())
      : moneyApi.createAccount({ ...body(), scope: business ? 'BUSINESS' : 'SHOP' })),
    onSuccess: () => {
      toast.success(editing ? 'Account save ho gaya' : 'Naya account ban gaya');
      qc.invalidateQueries({ queryKey: [MONEY_KEY] });
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });

  const submit = () => {
    setTried(true);
    if (ok && !save.isPending) save.mutate();
  };

  const placeholder = kind === 'BANK' ? 'Maslan: Meezan Bank' : kind === 'WALLET' ? 'Maslan: JazzCash dukaan' : 'Maslan: Tijori';

  return (
    <Modal open onClose={onClose} size="lg"
      title={editing ? `${account.name} badlein` : 'Naya account'}
      description="Bank, wallet ya tijori — jahan dukaan ka paisa rakha jata hai."
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={save.isPending} onClick={submit}>{editing ? 'Save karein' : 'Account banayein'}</Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div role="radiogroup" aria-label="Qism" className="grid grid-cols-3 gap-2">
          {KIND_IDS.map((k) => {
            const m = KINDS[k];
            return (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
                className={cn('flex flex-col items-start gap-1 rounded-xl p-3 text-left ring-1 transition',
                  kind === k ? 'bg-brand-50 ring-brand-300' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                <m.icon className="h-4 w-4" style={{ color: m.color }} />
                <span className="text-[0.8125rem] font-semibold text-slate-900">{m.label}</span>
                <span className="text-[0.6875rem] text-slate-500">{m.hint}</span>
              </button>
            );
          })}
        </div>

        <Input label="Naam" required value={name} onChange={(e) => setName(e.target.value)} maxLength={60} data-autofocus
          placeholder={placeholder} error={tried ? errors.name : undefined} hint="Isi naam se har jagah dikhega" />

        {!cash && <>
          <Select label="Kaunsi payment yahan aati hai?" value={method} onChange={(e) => setMethod(e.target.value as '' | MoneyAccount)}
            placeholder="Koi nahi (sirf haath ki entries)" options={METHODS}
            hint={method ? `${ACCOUNTS[method].label} wali bikri, kharch aur adaigi is account me gini ja sakti hai` : 'Sirf transfer aur jama/nikala se chalega'} />
          {method && (
            <Switch checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)}
              label={`${ACCOUNTS[method].label} ka default account`}
              description="On ho to is tareeqe ki har bikri, wapsi, kharch aur adaigi khud is account me judti hai. Ek branch me ek hi default hota hai." />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={kind === 'BANK' ? 'Bank ka naam' : 'Company'} value={bankName} onChange={(e) => setBankName(e.target.value)} maxLength={60}
              placeholder={kind === 'BANK' ? 'Meezan, HBL, UBL…' : 'JazzCash, Easypaisa…'} />
            <Input label="Account title" value={accountTitle} onChange={(e) => setAccountTitle(e.target.value)} maxLength={80}
              placeholder="Jis naam par account hai" />
            <Input label={kind === 'BANK' ? 'Account number' : 'Mobile number'} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} maxLength={40}
              inputMode="numeric" hint="Card par sirf aakhri 4 hindse dikhenge" />
            {kind === 'BANK' && (
              <Input label="IBAN" value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} maxLength={40} placeholder="PK00XXXX…" />
            )}
          </div>
        </>}

        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Shuru ka balance" type="number" inputMode="decimal" step="any" value={opening} onChange={(e) => setOpening(e.target.value)}
            placeholder="0" error={tried ? errors.opening : undefined} hint="Shuru ki tareekh par account me kitna tha" />
          <Input label="Shuru ki tareekh" type="date" value={openingDate} max={today()} onChange={(e) => setOpeningDate(e.target.value)}
            error={tried ? errors.date : undefined} hint="Is din se aage ka hisaab judega" />
        </div>

        {!editing && isOwner && !allShops && (
          <Switch checked={business} onChange={(e) => setBusiness(e.target.checked)}
            label="Poore karobar ka account"
            description="Off ho to sirf is branch ka. On ho to sab branches ka (sirf malik chala sakta hai)." />
        )}
        {!editing && allShops && (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200">
            "Sab branches" chuni hai, is liye ye poore karobar ka account banega. Kisi ek branch ka account banane ke liye upar se branch chunein.
          </p>
        )}
      </form>
    </Modal>
  );
}
