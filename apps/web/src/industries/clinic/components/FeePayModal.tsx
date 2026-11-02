/**
 * Takes a clinic fee (appointment or lab): one method, a split across
 * methods, or part / all on the patient's khata. A panel visit starts on
 * "Khata" and the khata is the panel's (company's), not the patient's.
 * Every payment becomes a bill, so the drawer, day book and khata see it once.
 */

import { useState, type FormEvent } from 'react';
import { BookOpen, Plus, Split, Trash2, Wallet } from 'lucide-react';
import { Button, Input, Modal, Segmented } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { FeeMethod, FeePayment } from '../api/appointments.api';
import { FEE_METHODS, r2 } from '../lib/meta';
import { t } from '@core/i18n';

type Mode = 'one' | 'split' | 'khata';

function MethodChips({ value, onChange }: { value: FeeMethod; onChange: (m: FeeMethod) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('Payment ka tareeqa')}>
      {FEE_METHODS.map((m) => (
        <button key={m.value} type="button" role="radio" aria-checked={value === m.value} onClick={() => onChange(m.value)}
          className={cn('h-9 rounded-xl px-3 text-[0.8125rem] font-semibold ring-1 transition', value === m.value ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
          {m.label}
        </button>
      ))}
    </div>
  );
}

export function FeePayModal({ title, description, due, panel, busy, onClose, onPay }: {
  title: string;
  description?: string;
  /** Still to be billed. */
  due: number;
  /** Company panel that pays this visit; its khata takes the unpaid part. */
  panel?: { name: string } | null;
  busy?: boolean;
  onClose: () => void;
  onPay: (body: FeePayment) => void;
}) {
  const [mode, setMode] = useState<Mode>(panel ? 'khata' : 'one');
  const khataOf = panel ? t('panel "{{name}}"', { name: panel.name }) : 'mareez';
  const [amount, setAmount] = useState(String(due));
  const [method, setMethod] = useState<FeeMethod>('CASH');
  const [paidNow, setPaidNow] = useState('');
  const [parts, setParts] = useState<Array<{ method: FeeMethod; amount: string }>>([{ method: 'CASH', amount: '' }, { method: 'CARD', amount: '' }]);
  const [tried, setTried] = useState(false);

  const amt = r2(Number(amount));
  const partsSum = r2(parts.reduce((s, p) => s + (Number(p.amount) || 0), 0));
  const paid = mode === 'khata' ? 0 : mode === 'split' ? partsSum : paidNow.trim() === '' ? amt : r2(Number(paidNow));
  const khata = r2(Math.max(amt - paid, 0));
  const change = r2(Math.max(paid - amt, 0));

  const error = !(amt > 0) ? t('Amount likhein')
    : amt > due + 0.009 ? t('Sirf {{due}} baqi hain', { due: formatPKR(due) })
      : mode === 'split' && parts.some((p) => !(Number(p.amount) > 0)) ? t('Har hisse ka amount likhein')
        : mode === 'one' && paid < 0 ? t('Sahi amount likhein')
          : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (error) return;
    if (mode === 'khata') onPay({ amount: amt, onCredit: true });
    else if (mode === 'split') onPay({ amount: amt, payments: parts.map((p) => ({ method: p.method, amount: r2(Number(p.amount)) })) });
    else onPay({ amount: amt, paymentMethod: method, ...(paidNow.trim() !== '' && { paid }) });
  };

  return (
    <Modal open onClose={onClose} size="md" title={title} description={description ?? t('Baqi: {{due}}', { due: formatPKR(due) })}
      footer={<div className="flex items-center justify-between gap-2">
        <span className="text-[0.8125rem] text-slate-500">{khata > 0 ? <>{t('Khata me:')}{' '} <b className="text-amber-700">{formatPKR(khata)}</b></> : change > 0 ? <>{t('Wapas:')}{' '} <b>{formatPKR(change)}</b></> : t('Poora bill')}</span>
        <div className="flex gap-2"><Button variant="secondary" onClick={onClose}>{t('Wapas')}</Button><Button type="submit" form="fee-pay" loading={busy} leftIcon={<Wallet className="h-4 w-4" />}>{t('Bill banayein')}</Button></div>
      </div>}>
      <form id="fee-pay" onSubmit={submit} className="space-y-4"
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); e.currentTarget.requestSubmit(); } }}>
        <Input label={t('Bill ka amount')} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus
          hint={t('Kam likhein to baqi baad me alag bill par')} error={tried && error && !(amt > 0 && amt <= due + 0.009) ? error : undefined} />
        <Segmented<Mode> value={mode} onChange={setMode} label={t('Kaise liya')}
          items={[{ value: 'one', label: t('Ek tareeqa') }, { value: 'split', label: t('Do tareeqe') }, { value: 'khata', label: panel ? t('Panel khata') : t('Khata (udhaar)') }]} />
        {mode === 'one' && (
          <div className="space-y-3">
            <MethodChips value={method} onChange={setMethod} />
            <Input label={t('Abhi kitna mila')} inputMode="decimal" value={paidNow} onChange={(e) => setPaidNow(e.target.value)} placeholder={String(amt || '')}
              hint={t('Khaali rahe to poora amount; kam likhein to baqi {{khataOf}} ke khata me', { khataOf })} />
          </div>
        )}
        {mode === 'split' && (
          <div className="space-y-2">
            {parts.map((p, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-100">
                <div className="min-w-0 flex-1"><MethodChips value={p.method} onChange={(m) => setParts((x) => x.map((y, j) => (j === i ? { ...y, method: m } : y)))} /></div>
                <Input aria-label={t('Amount')} inputMode="decimal" value={p.amount} wrapperClassName="w-32" placeholder="Rs"
                  onChange={(e) => setParts((x) => x.map((y, j) => (j === i ? { ...y, amount: e.target.value } : y)))} />
                {parts.length > 2 && (
                  <button type="button" aria-label={t('Hatayein')} onClick={() => setParts((x) => x.filter((_, j) => j !== i))} className="flex h-10 w-10 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between text-[0.8125rem]">
              {parts.length < 4 && <button type="button" onClick={() => setParts((x) => [...x, { method: 'JAZZCASH', amount: '' }])} className="inline-flex items-center gap-1 font-semibold text-brand-700"><Plus className="h-3.5 w-3.5" />{t('Aur tareeqa')}</button>}
              <span className="ms-auto text-slate-600"><Split className="me-1 inline h-3.5 w-3.5" />{t('Jama:')}{' '} <b>{formatPKR(partsSum)}</b></span>
            </div>
          </div>
        )}
        {mode === 'khata' && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0" />{panel
              ? <>{t('Poora {{amt}} panel "{{name}}" ke khata me jayega. Company se Panels page par wasool karein.', { amt: formatPKR(amt), name: panel.name })}</>
              : <>{t('Poora {{amt}} mareez ke khata me jayega. Wapas aane par Khata page se wasool karein.', { amt: formatPKR(amt) })}</>}
          </p>
        )}
        {tried && error && <p className="text-[0.8125rem] font-medium text-rose-600">{error}</p>}
      </form>
    </Modal>
  );
}
