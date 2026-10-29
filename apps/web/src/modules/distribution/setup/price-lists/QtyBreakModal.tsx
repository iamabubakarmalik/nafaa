/**
 * A quantity break on a price list: from N packs of an item the rate drops
 * (e.g. 10 Carton or more at Rs 11,300 each). The highest break the order
 * reaches wins; below every break the row's normal list rate applies.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Input, Modal, Select } from '@/design-system/components';
import { DIST_KEY, distError, distSetupApi, type PriceGridRow, type PriceList } from '../../api/distribution.api';
import { rs } from '../../lib/meta';
import { num } from '../shared';

export function QtyBreakModal({ list, product, onClose }: {
  list: PriceList; product: { productId: string; name: string; rows: PriceGridRow[] }; onClose: () => void;
}) {
  const qc = useQueryClient();
  const packs = product.rows;
  const [unit, setUnit] = useState(packs[packs.length - 1]?.unitId ?? '');
  const [minQty, setMinQty] = useState('');
  const [price, setPrice] = useState('');
  const row = packs.find((r) => (r.unitId ?? '') === unit) ?? packs[0];
  const q = num(minQty);
  const p = num(price);
  const ok = q != null && q > 0 && p != null && p > 0;

  const save = useMutation({
    mutationFn: () => distSetupApi.savePriceItems(list.id, [{ productId: product.productId, unitId: unit || null, price: p!, minQty: q! }]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DIST_KEY, 'price-items', list.id] });
      qc.invalidateQueries({ queryKey: [DIST_KEY, 'price-lists'] });
      toast.success('Qty ka rate save ho gaya');
      onClose();
    },
    onError: (e) => toast.error(distError(e, 'Save nahi hua')),
  });

  return (
    <Modal open onClose={onClose} size="sm" title="Zyada qty ka rate" description={product.name}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button data-save-action disabled={!ok} loading={save.isPending} onClick={() => save.mutate()}>Save karein</Button>
      </>}>
      <div className="space-y-3">
        <Select label="Pack" value={unit} onChange={(e) => setUnit(e.target.value)}
          options={packs.map((r) => ({ value: r.unitId ?? '', label: r.conversionRate > 1 ? `${r.unitName} (${r.conversionRate})` : r.unitName }))} />
        <div className="grid grid-cols-2 gap-3">
          <Input label={`Kam az kam (${row?.unitName ?? 'pack'})`} inputMode="decimal" value={minQty} onChange={(e) => setMinQty(e.target.value.replace(/[^\d.]/g, ''))} placeholder="10" />
          <Input label="Rate (Rs)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
            placeholder={row?.listPrice != null ? String(row.listPrice) : String(Math.round(row?.rulePrice ?? 0))} />
        </div>
        {ok && row && <p className="rounded-lg bg-violet-50 px-3 py-2 text-[0.8125rem] text-violet-900">{q} {row.unitName} ya zyada lene par har {row.unitName} {rs(p)} ka.</p>}
      </div>
    </Modal>
  );
}
