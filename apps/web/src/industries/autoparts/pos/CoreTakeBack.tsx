/**
 * Counter step for an old part (core) the customer hands back: record it,
 * then pick it under Trade-in at checkout so its value comes off the bill.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Recycle } from 'lucide-react';
import { Button, Input, Modal } from '@/design-system/components';
import type { PosTradeIn } from '@modules/pos/components';
import { coreReturnsApi } from '../api/core-returns.api';
import { CORE_KEY, apiError, money } from '../components/meta';
import { t } from '@core/i18n';

/** Held old parts not on a bill yet, offered as Trade-in at checkout. */
export function useCoreTradeIns(): PosTradeIn[] {
  const { data = [] } = useQuery({ queryKey: [CORE_KEY, 'trade-ins'], queryFn: coreReturnsApi.tradeIns, staleTime: 30_000 });
  return data;
}

export function CoreTakeBack() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const amount = Number(value) || 0;
  const save = useMutation({
    mutationFn: () => coreReturnsApi.create({ description: name.trim(), value: amount }),
    onSuccess: () => {
      toast.success(t('Purana part likh liya — payment me "Trade-in" chunein'));
      qc.invalidateQueries({ queryKey: [CORE_KEY] });
      setOpen(false); setName(''); setValue('');
    },
    onError: (e) => toast.error(apiError(e, t('Purana part nahi likha'))),
  });
  return (
    <>
      <Button size="sm" variant="secondary" className="w-full" onClick={() => setOpen(true)} leftIcon={<Recycle className="h-4 w-4" />}>{t('Purana part liya')}</Button>
      {open && (
        <Modal open onClose={() => setOpen(false)} size="sm" title={t('Customer ne purana part diya')} description={t('Qeemat bill se kat jayegi — checkout par Trade-in chunein')}
          footer={<>
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('Rehne dein')}</Button>
            <Button disabled={!name.trim() || !(amount > 0)} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Recycle className="h-4 w-4" />}>{t('Likh lein')}</Button>
          </>}>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (name.trim() && amount > 0) save.mutate(); }}>
            <Input label={t('Kaunsa part')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Purani battery 12V, dynamo, brake shoe')} data-autofocus />
            <Input label={t('Qeemat')} inputMode="decimal" value={value} onChange={(e) => setValue(money(e.target.value))} placeholder="1500" hint={t('Jitna bill se kam karna hai')} />
          </form>
        </Modal>
      )}
    </>
  );
}
