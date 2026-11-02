/**
 * Open a shift: count the float in the drawer (as one amount or note by
 * note) and start the till. Shows what the last shift of this branch left
 * in the drawer so the opening count can be checked against it.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calculator, History, PlayCircle } from 'lucide-react';
import { Button, Input, Modal, Segmented, Textarea } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cashRegisterApi } from '../api/cash-register.api';
import { DenominationCounter } from './DenominationCounter';
import { CASH_KEY, cleanDenoms, signed, sumDenoms, when } from './meta';
import { t, Trans } from '@core/i18n';

type Mode = 'amount' | 'notes';

export function OpenShiftModal({ shop, onClose }: { shop: { id: string; name: string }; onClose: () => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>('amount');
  const [amount, setAmount] = useState('');
  const [denoms, setDenoms] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  const lastQ = useQuery({
    queryKey: [CASH_KEY, 'last-close', shop.id],
    queryFn: () => cashRegisterApi.shifts({ shopId: shop.id, status: 'CLOSED', limit: 1 }),
  });
  const last = lastQ.data?.items[0];

  const value = mode === 'notes' ? sumDenoms(denoms) : Number(amount);
  const valid = mode === 'notes' ? true : amount.trim() !== '' && Number.isFinite(value) && value >= 0;
  const gap = last && valid ? value - last.closingBalance : 0;

  const m = useMutation({
    mutationFn: () => cashRegisterApi.open({
      shopId: shop.id,
      openingBalance: value,
      notes: notes.trim() || undefined,
      denominations: mode === 'notes' ? cleanDenoms(denoms) : undefined,
    }),
    onSuccess: () => {
      toast.success(t('{{name}} ki shift khul gayi', { name: shop.name }), { description: t('Galle me {{formatPKR}} se shuru', { formatPKR: formatPKR(value) }) });
      void qc.invalidateQueries({ queryKey: [CASH_KEY] });
      void qc.invalidateQueries({ queryKey: ['money'] });
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message ?? t('Shift nahi khuli')),
  });

  return (
    <Modal open onClose={onClose} size={mode === 'notes' ? 'lg' : 'md'} title={t('Shift kholein — {{name}}', { name: shop.name })}
      description={t('Galle me jitna cash hai woh gin kar likhein; din ka hisaab isi se shuru hoga')}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!valid} leftIcon={<PlayCircle className="h-4 w-4" />}>{t('Shift kholein')}</Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid && !m.isPending) m.mutate(); }}>
        <Segmented label={t('Ginti ka tareeqa')} value={mode} onChange={(v) => setMode(v as Mode)}
          items={[{ value: 'amount', label: t('Kul amount') }, { value: 'notes', label: t('Note gin kar') }]} />

        {mode === 'amount' ? (
          <Input data-autofocus label={t('Galle me cash (opening float)')} type="number" inputMode="decimal" min={0} size="lg" required
            value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={last ? String(last.closingBalance) : '5000'}
            leftIcon={<Calculator className="h-4 w-4" />}
            hint={t('Khula paisa jo din shuru karne ke liye galle me rakha hai. Note gin kar likhna ho to upar \'Note gin kar\' chunein.')} />
        ) : (
          <DenominationCounter value={denoms} onChange={setDenoms} />
        )}

        {last && (
          <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200">
            <History className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>
              <Trans text="Pichhli shift {{when}} ko {{amount}} par band hui{{by}}." values={{ when: when(last.closedAt ?? last.openedAt), amount: <b className="tabular-nums text-slate-900">{formatPKR(last.closingBalance)}</b>, by: last.closedBy ? ` (${last.closedBy.fullName})` : '' }} />
              {valid && Math.abs(gap) >= 1 && <span className="block text-amber-700">{t('Abhi ki ginti us se {{gap}} alag hai — beech me paise nikale ya daale gaye?', { gap: signed(gap) })}</span>}
            </span>
          </div>
        )}

        <Textarea label={t('Note (marzi se)')} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500}
          placeholder={t('Masalan: subah ki shift, Ali counter par')} hint={t('Shift record aur Z-report me dikhega')} />
        <button type="submit" hidden aria-hidden />
      </form>
    </Modal>
  );
}
