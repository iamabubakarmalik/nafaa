/**
 * Who buys on this price list. Tick customers to put them on it, untick to
 * take them off (they fall back to the default list). Only the changed
 * customers are saved, a few at a time.
 */

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { Alert, Button, Input, Modal, Segmented, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { DIST_KEY, distError, distSetupApi, type PriceList } from '../../api/distribution.api';
import { partyName } from '../../lib/meta';
import { PRICE_LISTS_KEY, useCustomerRoster } from '../shared';

/** Runs `fn` over `items`, `size` at a time; returns how many failed. */
export async function inBatches<T>(items: T[], size: number, fn: (t: T) => Promise<unknown>) {
  let failed = 0;
  for (let i = 0; i < items.length; i += size) {
    const res = await Promise.allSettled(items.slice(i, i + size).map(fn));
    failed += res.filter((r) => r.status === 'rejected').length;
  }
  return failed;
}

export function AssignCustomersModal({ list, onClose }: { list: PriceList; onClose: () => void }) {
  const qc = useQueryClient();
  const rosterQ = useCustomerRoster();
  const lists = (qc.getQueryData(PRICE_LISTS_KEY) as PriceList[] | undefined) ?? [];
  const listName = new Map(lists.map((l) => [l.id, l.name]));
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'all' | 'on'>('all');
  const [saving, setSaving] = useState(false);

  const roster = rosterQ.data ?? [];
  const initial = useMemo(() => new Set(roster.filter((c) => c.priceListId === list.id).map((c) => c.id)), [roster, list.id]);
  useEffect(() => { setPicked(new Set(initial)); }, [initial]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roster
      .filter((c) => c.isActive !== false)
      .filter((c) => view === 'all' || picked.has(c.id))
      .filter((c) => !q || `${c.name} ${c.businessName ?? ''} ${c.phone ?? ''} ${c.area ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => Number(picked.has(b.id)) - Number(picked.has(a.id)) || partyName(a).localeCompare(partyName(b)));
  }, [roster, search, view, picked]);

  const added = [...picked].filter((id) => !initial.has(id));
  const removed = [...initial].filter((id) => !picked.has(id));
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const save = async () => {
    setSaving(true);
    try {
      const failed = await inBatches([...added.map((id) => ({ id, v: list.id })), ...removed.map((id) => ({ id, v: null }))], 5,
        (x) => distSetupApi.patchCustomer(x.id, { priceListId: x.v }));
      qc.invalidateQueries({ queryKey: [DIST_KEY] });
      ['customers', 'customers-for-pos', 'customer-directory'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      if (failed) toast.error(`${failed} customers save nahi hue — dobara koshish karein`);
      else { toast.success(`${added.length + removed.length} customers badle`); onClose(); }
    } catch (e) {
      toast.error(distError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} size="lg" title={`${list.name} — customers`}
      description="Nishan wale customers is list ke rate par khareedte hain — POS aur booker app dono par."
      footer={<>
        <span className="mr-auto text-[0.8125rem] text-slate-600">{picked.size} customers{added.length + removed.length ? ` · ${added.length} naye, ${removed.length} hataye` : ''}</span>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button data-save-action disabled={!added.length && !removed.length} loading={saving} onClick={save}>Save karein</Button>
      </>}>
      {rosterQ.isError ? <Alert tone="danger">{distError(rosterQ.error, 'Customers nahi aaye')}</Alert>
        : !rosterQ.isFetched && rosterQ.fetchStatus === 'idle' ? <Alert tone="warning">Customers lagane ke liye "Customers dekhein" ki permission chahiye.</Alert>
        : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input size="sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Naam, dukaan, phone ya ilaqa" aria-label="Customer dhoondein"
                leftIcon={<Search className="h-4 w-4" />} wrapperClassName="min-w-[12rem] flex-1" />
              <Segmented label="Dikhayein" value={view} onChange={setView} items={[{ value: 'all', label: 'Sab' }, { value: 'on', label: 'Is list wale', count: picked.size }]} />
            </div>
            {rosterQ.isLoading ? <Skeleton className="h-72" /> : (
              <ul className="max-h-[22rem] divide-y divide-slate-100 overflow-auto rounded-xl ring-1 ring-slate-200">
                {shown.slice(0, 300).map((c) => {
                  const on = picked.has(c.id);
                  const other = c.priceListId && c.priceListId !== list.id ? listName.get(c.priceListId) : null;
                  return (
                    <li key={c.id}>
                      <label className={cn('flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50', on && 'bg-brand-50/50')}>
                        <input type="checkbox" checked={on} onChange={() => toggle(c.id)} className="h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-600" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{partyName(c)}</span>
                          <span className="block truncate text-[0.6875rem] text-slate-500">{[c.businessName ? c.name : null, c.area, c.phone].filter(Boolean).join(' · ') || '—'}</span>
                        </span>
                        {other && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-slate-600">{other}</span>}
                      </label>
                    </li>
                  );
                })}
                {!shown.length && <li className="px-3 py-8 text-center text-sm text-slate-500">Koi customer nahi mila</li>}
              </ul>
            )}
          </div>
        )}
    </Modal>
  );
}
