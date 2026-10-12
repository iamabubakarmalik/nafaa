/**
 * Put cash into or take cash out of the open drawer of the active branch,
 * with a reason. Saved through the cash register, so the drawer's expected
 * cash and the ledger here both move.
 */

import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDownToLine, ArrowUpFromLine, Store, TriangleAlert } from 'lucide-react';
import { Button, Input, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { moneyApi, type MoneyDrawer } from '../api/money.api';
import { MONEY_KEY, apiError, newRequestId } from './meta';

type Kind = 'CASH_IN' | 'CASH_OUT';

const REASONS: Record<Kind, string[]> = {
  CASH_IN: ['Khulle paise laye', 'Ghar se daala', 'Bank se nikal kar laye', 'Doosri branch se aaya', 'Kal ka bacha cash'],
  CASH_OUT: ['Malik ne liya', 'Bank me jama karaya', 'Doosri branch ko diya', 'Khulle paise ke liye', 'Ghar ke kharch ke liye'],
};

export function DrawerMoveModal({ kind: initial, drawer, allShops, onClose }: {
  kind: Kind;
  /** Open drawer of the active branch, if any. */
  drawer: MoneyDrawer | null;
  allShops: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>(initial);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const busy = useRef(false);
  // Kept for the life of the modal, so a double click or retry posts once.
  const [requestId] = useState(newRequestId);

  const value = Number(amount) || 0;
  const out = kind === 'CASH_OUT';
  const tooMuch = out && !!drawer && value > drawer.expected;
  const errors = {
    amount: value <= 0 ? 'Raqam likhein' : undefined,
    reason: reason.trim().length < 2 ? 'Wajah likhein ya upar se chunein' : undefined,
  };
  const ok = !errors.amount && !errors.reason;

  const save = useMutation({
    mutationFn: () => moneyApi.drawerMove({
      type: kind, amount: value, reason: reason.trim(), note: note.trim() || undefined, registerId: drawer?.id, requestId,
    }),
    onSuccess: () => {
      toast.success(out ? `${formatPKR(value)} golak se nikal gaye` : `${formatPKR(value)} golak me daal diye`);
      qc.invalidateQueries({ queryKey: [MONEY_KEY] });
      qc.invalidateQueries({ queryKey: ['cash-register'] });
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
    onSettled: () => { busy.current = false; },
  });

  const submit = () => {
    setTried(true);
    if (!ok || busy.current) return;
    busy.current = true;
    save.mutate();
  };

  const blocked = allShops || !drawer;

  return (
    <Modal open onClose={onClose} size="md"
      title={out ? 'Golak se cash nikalein' : 'Golak me cash daalein'}
      description="Sirf cash ke liye. Ye Cash register me bhi dikhega aur din band karte waqt hisaab me judega."
      footer={blocked ? <Button variant="secondary" onClick={onClose}>Theek hai</Button> : <>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant={out ? 'danger' : 'primary'} loading={save.isPending} onClick={submit}
          leftIcon={out ? <ArrowUpFromLine className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />}>
          {out ? 'Nikalein' : 'Daalein'}
        </Button>
      </>}>
      {allShops ? (
        <Notice icon={Store} text='Abhi "Sab branches" chuni hai. Cash kisi ek branch ki golak me jata hai, is liye upar se branch chunein.' />
      ) : !drawer ? (
        <Notice icon={TriangleAlert} text="Is branch ka register band hai. Pehle Cash register khol kar din shuru karein.">
          <Link to="/cash-register" className="mt-2 inline-block text-[0.8125rem] font-semibold text-brand-700 hover:underline">Cash register kholein</Link>
        </Notice>
      ) : (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {(['CASH_IN', 'CASH_OUT'] as Kind[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => { setKind(k); setReason(''); }}
                className={cn('inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-[0.8125rem] font-semibold transition',
                  kind === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                {k === 'CASH_IN' ? <ArrowDownToLine className="h-4 w-4 text-emerald-600" /> : <ArrowUpFromLine className="h-4 w-4 text-rose-600" />}
                {k === 'CASH_IN' ? 'Daalna' : 'Nikalna'}
              </button>
            ))}
          </div>

          <p className="flex justify-between rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200">
            <span>{drawer.shop?.name ?? 'Golak'} · {drawer.registerNumber}</span>
            <span>Abhi hona chahiye <b className="tabular-nums text-slate-900">{formatPKR(drawer.expected)}</b></span>
          </p>

          <Input label="Raqam" required type="number" inputMode="decimal" min={0} step="any" value={amount} data-autofocus
            onChange={(e) => setAmount(e.target.value)} placeholder="0" size="lg"
            error={tried ? errors.amount : undefined}
            hint={tooMuch ? `Golak me sirf ${formatPKR(drawer.expected)} hone chahiye. Pehle gin lein.` : out ? 'Jitna cash golak se bahar gaya' : 'Jitna cash golak me aaya'} />

          <div>
            <Input label="Wajah" required value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120}
              placeholder={out ? 'Maslan: Malik ne liya' : 'Maslan: Khulle paise laye'}
              error={tried ? errors.reason : undefined} hint="Ledger aur Cash register me yahi likha dikhega" />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {REASONS[kind].map((r) => (
                <button key={r} type="button" onClick={() => setReason(r)}
                  className={cn('rounded-full px-2.5 py-1 text-[0.75rem] font-medium ring-1 transition',
                    reason === r ? 'bg-brand-50 text-brand-800 ring-brand-200' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{r}</button>
              ))}
            </div>
          </div>

          <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300}
            placeholder="Marzi hai" hint="Bank slip number, kis ko diya, waghera" />
        </form>
      )}
    </Modal>
  );
}

function Notice({ icon: I, text, children }: { icon: typeof Store; text: string; children?: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-[0.875rem] text-amber-900 ring-1 ring-amber-200">
      <I className="mt-0.5 h-5 w-5 shrink-0" />
      <div>{text}{children && <div>{children}</div>}</div>
    </div>
  );
}
