/**
 * Carpet sales history: the shared history, with each bill's roll cuts and
 * pieces under it (roll number and size), and bills whose carpet is not yet
 * cut from stock marked with a button to cut it now.
 */

import { createElement } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Layers, Scissors, TriangleAlert } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import { carpetRollsApi } from '../api/carpet-rolls.api';
import { PIECES_KEY, ROLLS_KEY, readCarpetNote } from '../lib/meta';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold';

function useCarpetLines(sales: HistorySale[]) {
  const qc = useQueryClient();
  const ids = sales.filter((s) => !s.pending && s.status !== 'VOIDED').map((s) => s.id);
  const { data = {} } = useQuery({
    queryKey: ['carpet-bill-lines', ids],
    queryFn: () => carpetRollsApi.billLines(ids).catch(() => ({})),
    enabled: ids.length > 0,
    staleTime: 30_000,
  });
  const settle = async (saleId: string) => {
    const res = await carpetRollsApi.settleBill(saleId).catch(() => null);
    const bad = res ? res.lines.filter((l) => !l.ok) : [];
    if (!res) toast.error('Stock se nahi kata — internet check karein');
    else if (bad.length) toast.error(bad.map((b) => b.message).join(' • '));
    else toast.success(`Bill ${res.saleNumber} ka carpet stock se kat gaya`);
    for (const key of ['carpet-bill-lines', 'carpet-unsettled', ROLLS_KEY, PIECES_KEY]) void qc.invalidateQueries({ queryKey: [key] });
  };
  return (sale: HistorySale) => {
    const lines = (data as Record<string, Array<{ note: string; settled: boolean }>>)[sale.id];
    if (!lines?.length) return null;
    const pending = lines.some((l) => !l.settled);
    return createElement('div', { className: 'mt-1.5 flex flex-wrap items-center gap-1' },
      ...lines.map((l, i) => {
        const info = readCarpetNote(l.note);
        if (!info) return null;
        return createElement('span', { key: i, className: `${chip} ${info.kind === 'roll' ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-700'}`, title: l.note },
          createElement(info.kind === 'roll' ? Layers : Scissors, { className: 'h-3 w-3' }),
          `${info.ref}${info.size ? ` · ${info.size}` : ''}`);
      }),
      pending ? createElement('button', {
        type: 'button',
        onClick: (e: { stopPropagation: () => void }) => { e.stopPropagation(); void settle(sale.id); },
        className: `${chip} bg-amber-100 text-amber-900 ring-1 ring-amber-300 hover:bg-amber-200`,
      }, createElement(TriangleAlert, { className: 'h-3 w-3' }), 'Stock se kaatna baqi — ab kaatein') : null,
    );
  };
}

const config: SalesHistoryConfig = { label: 'Carpet', useBillExtras: useCarpetLines };

export default function CarpetSales() {
  return <SalesHistoryPage config={config} />;
}
