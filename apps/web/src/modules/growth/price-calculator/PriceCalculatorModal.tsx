/**
 * "Price nikalein" on the product editor's price step: the price calculator
 * in a modal, filled with the product being edited. "Ye Price lagao" puts the
 * price into the editor's Retail box (saved with the product).
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calculator } from 'lucide-react';
import { Alert, Modal, Skeleton } from '@/design-system/components';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { PRICE_CALC_KEY, priceCalcApi } from '../api/growth.api';
import { CalcInputs, ResultCards, useQuote } from './PriceCalculator';
import { initialState, num, type CalcState } from './meta';

export function PriceCalculatorModal({ productId, name, cost, onUse, onClose }: {
  productId?: string; name?: string; cost: number; onUse: (price: number) => void; onClose: () => void;
}) {
  const { costHidden } = useMasked();
  const ctxQ = useQuery({ queryKey: [PRICE_CALC_KEY, 'context', productId ?? ''], queryFn: () => priceCalcApi.context(productId), staleTime: 60_000 });
  const ctx = ctxQ.data;
  const [state, setState] = useState<CalcState | null>(null);
  // The editor's own cost wins: it may not be saved yet.
  useEffect(() => { if (ctx && !state) setState(initialState(ctx, { cost: cost > 0 ? cost : null })); }, [ctx, state, cost]);
  const set = (patch: Partial<CalcState>) => setState((s) => (s ? { ...s, ...patch } : s));
  const quote = useQuote(state, state ? num(state.cost) : null);

  return (
    <Modal open onClose={onClose} size="full"
      title={<span className="inline-flex items-center gap-2"><Calculator className="h-5 w-5 text-brand-600" /> Price nikalein{name ? ` · ${name}` : ''}</span>}
      description="Cost, courier, COD, channel fees, ads aur RTO ke baad har channel par kitne me bechein">
      {costHidden ? (
        <Alert tone="warning">Cost aur Profit abhi chhupe hain (privacy lock). Unlock karke calculator chalayein.</Alert>
      ) : !ctx || !state ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,24rem)_1fr]"><Skeleton className="h-[30rem] rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,24rem)_1fr]">
          <CalcInputs ctx={ctx} state={state} set={set} courier={quote.data?.courier} compact />
          <ResultCards results={num(state.cost) ? quote.data?.results : undefined} loading={quote.isLoading} product={ctx.product} ctx={ctx}
            onUseRetail={(p) => { onUse(p); onClose(); }} checkPrice={state.checkPrice} onCheckPrice={(v) => set({ checkPrice: v })} />
        </div>
      )}
    </Modal>
  );
}
