/** Picks the exact unit (by serial) of a product being sold at the counter. */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Barcode, Search } from 'lucide-react';
import { Button, Input, Modal, Skeleton } from '@/design-system/components';
import type { PosItem } from '@modules/pos/engine';
import { applianceSerialApi, type ApplianceSerial } from '../api/serial-tracking.api';
import { SERIAL_KEY, dayOnly } from '../components/meta';

export function SerialPicker({ item, taken, onPick, onSkip, onClose }: {
  item: PosItem; taken: Set<string>; onPick: (u: ApplianceSerial) => void; onSkip: () => void; onClose: () => void;
}) {
  const [term, setTerm] = useState('');
  const q = useQuery({ queryKey: [SERIAL_KEY, 'pos-units', item.id], queryFn: () => applianceSerialApi.list({ productId: item.id, status: 'IN_STOCK', limit: 200 }) });
  const units = useMemo(() => {
    const t = term.trim().toLowerCase();
    return (q.data?.items ?? []).filter((u) => !taken.has(u.id) && (!t || u.serialNumber.toLowerCase().includes(t) || (u.modelNumber ?? '').toLowerCase().includes(t)));
  }, [q.data, taken, term]);
  return (
    <Modal open onClose={onClose} size="md" title={`Kaunsa unit — ${item.name}`} description="Jo dabba customer ko ja raha hai us par likha serial chunein"
      footer={<><Button variant="ghost" onClick={onSkip}>Serial ke baghair</Button><span className="flex-1" /><Button variant="secondary" onClick={onClose}>Rehne dein</Button></>}>
      <div className="space-y-3">
        <Input autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Serial dhoondein ya scan karein" leftIcon={<Search className="h-4 w-4" />}
          onKeyDown={(e) => { if (e.key === 'Enter' && units.length === 1) { e.preventDefault(); onPick(units[0]); } }} />
        {q.isLoading ? <Skeleton className="h-32 rounded-xl" /> : units.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-[0.8125rem] text-slate-500">{term ? 'Ye serial stock me nahi' : 'Is product ka koi serial stock me nahi'}</p>
        ) : (
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200">
            {units.map((u) => (
              <li key={u.id}>
                <button type="button" onClick={() => onPick(u)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50">
                  <Barcode className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="min-w-0 flex-1"><span className="block font-mono font-semibold text-slate-900">{u.serialNumber}</span><span className="block text-[0.75rem] text-slate-500">{[u.modelNumber, u.batchNumber, `aaya ${dayOnly(u.purchaseDate ?? u.createdAt)}`].filter(Boolean).join(' · ')}</span></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
