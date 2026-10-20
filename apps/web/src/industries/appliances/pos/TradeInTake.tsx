/**
 * Counter step for an old appliance the customer hands in: record it with
 * the agreed value, then pick it under Trade-in at checkout so the value
 * comes off the bill.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Recycle } from 'lucide-react';
import { Button, Input, Modal } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import type { PosTradeIn } from '@modules/pos/components';
import { tradeInsApi, type TradeInCondition } from '../api/trade-ins.api';
import { Chips } from '../components/ui';
import { TRADE_IN_CONDITIONS, TRADE_IN_KEY, apiError, money } from '../components/meta';

/** Old units in this branch not on a bill yet, offered as Trade-in at checkout. */
export function useApplianceTradeIns(): PosTradeIn[] {
  const { data = [] } = useQuery({ queryKey: [TRADE_IN_KEY, 'counter'], queryFn: tradeInsApi.counter, staleTime: 10_000, enabled: navigator.onLine });
  return data;
}

export function TradeInTake({ customerId }: { customerId?: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="secondary" className="w-full" onClick={() => setOpen(true)} leftIcon={<Recycle className="h-4 w-4" />}>Purana saman liya</Button>
      {open && <TradeInModal customerId={customerId} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Records an old unit; used at the counter and on the trade-ins page. */
export function TradeInModal({ customerId, onClose }: { customerId?: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [condition, setCondition] = useState<TradeInCondition | ''>('');
  const [value, setValue] = useState('');
  const [tried, setTried] = useState(false);
  const amount = Number(value) || 0;
  const errors = {
    name: name.trim().length < 2 ? 'Kya liya — maslan: purana AC 1.5 ton' : undefined,
    value: !(amount > 0) ? 'Kitne ka liya — ye bill se katega' : undefined,
  };
  const ok = !errors.name && !errors.value;
  const save = useMutation({
    mutationFn: () => tradeInsApi.create({
      description: name.trim(), brand: brand.trim() || undefined, model: model.trim() || undefined,
      condition: condition || undefined, value: amount, customerId: customerId ?? undefined,
    }),
    onSuccess: (t) => {
      toast.success(`${t.code} likh liya — checkout par Trade-in me chunein`);
      qc.invalidateQueries({ queryKey: [TRADE_IN_KEY] });
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Purana saman nahi likha')),
  });
  const submit = () => { setTried(true); if (ok) save.mutate(); };
  return (
    <Modal open onClose={onClose} size="md" title="Customer ne purana saman diya" description="Tay ki hui qeemat naye bill se kat jayegi — checkout par Trade-in chunein"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={save.isPending} onClick={submit} leftIcon={<Recycle className="h-4 w-4" />}>Likh lein</Button>
      </>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label="Kya liya" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Purana AC 1.5 ton, fridge, washing machine" error={tried ? errors.name : undefined} data-autofocus />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Haier, Dawlance, Gree" />
          <Input label="Model" value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Halat</span>
          <Chips options={TRADE_IN_CONDITIONS} value={condition} onChange={setCondition} />
        </div>
        <Input label="Qeemat" required inputMode="decimal" value={value} onChange={(e) => setValue(money(e.target.value))} placeholder="15000"
          hint={amount > 0 ? `${formatPKR(amount)} bill se katega` : 'Jitna bill se kam karna hai'} error={tried ? errors.value : undefined} />
      </form>
    </Modal>
  );
}
