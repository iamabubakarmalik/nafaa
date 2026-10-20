/**
 * Picks the exact phone for the bill: every in-stock IMEI of the model in
 * this branch, grouped by variant, with PTA status and warranty. Typing or
 * scanning an IMEI narrows the list; Enter on a single match picks it.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ScanLine, ShieldCheck } from 'lucide-react';
import { Input, Modal } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import type { PosPhone } from '../api/mobile-pos.api';
import { PTA_STATUS_LABELS } from '../api/imei.api';

interface Props {
  name: string;
  phones: PosPhone[];
  /** IMEIs already on the bill. */
  inCart: Set<string>;
  onPick: (phone: PosPhone) => void;
  onClose: () => void;
}

const ptaTone = (s: PosPhone['ptaStatus']) =>
  s === 'APPROVED' || s === 'EXEMPT' ? 'bg-success-50 text-success-700'
    : s === 'NON_PTA' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700';

export function ImeiPicker({ name, phones, inCart, onPick, onClose }: Props) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 50); return () => clearTimeout(t); }, []);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return phones.filter((p) => !term || [p.imei1, p.imei2, p.serialNumber, p.color, p.variant?.name]
      .some((v) => (v ?? '').toLowerCase().includes(term)));
  }, [phones, q]);

  // Grouped by variant (storage / colour) so the counter sees what is on the shelf.
  const groups = useMemo(() => {
    const m = new Map<string, { label: string; price: number; rows: PosPhone[] }>();
    for (const p of list) {
      const key = p.variantId ?? '';
      const g = m.get(key) ?? { label: p.variant?.name ?? 'Phone', price: Number(p.salePrice) || 0, rows: [] };
      g.rows.push(p);
      m.set(key, g);
    }
    return [...m.values()];
  }, [list]);

  const free = list.filter((p) => !inCart.has(p.id));
  const submit = () => { if (free.length === 1) onPick(free[0]); };

  return (
    <Modal
      open
      onClose={onClose}
      title={name}
      description={`IMEI chunein · ${phones.length} phone`}
    >
      <div className="sticky -top-4 z-10 -mx-5 -mt-4 mb-3 border-b border-slate-200 bg-white px-5 py-3">
        <Input
          ref={inputRef}
          data-autofocus
          size="lg"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          placeholder="IMEI scan karein ya likhein"
          className="font-mono text-sm"
          leftIcon={<ScanLine className="h-4 w-4" />}
        />
      </div>

      <div>
        {groups.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            {phones.length ? 'Is IMEI ka phone nahi mila' : 'Is branch me is model ka koi phone stock me nahi'}
          </p>
        ) : groups.map((g) => (
          <section key={g.label} className="mb-3 last:mb-0">
            <div className="mb-1.5 flex items-center justify-between px-1 text-xs font-semibold text-slate-500">
              <span>{g.label} · {g.rows.length}</span>
              <span>{formatPKR(g.price)}</span>
            </div>
            <div className="space-y-1.5">
              {g.rows.map((p) => {
                const taken = inCart.has(p.id);
                return (
                  <button key={p.id} type="button" disabled={taken} onClick={() => onPick(p)}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-brand-400 hover:bg-brand-50/40 disabled:cursor-not-allowed disabled:opacity-50">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-sm font-semibold text-slate-900">{p.imei1}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        {p.imei2 && <span className="font-mono">{p.imei2}</span>}
                        {p.color && <span>{p.color}</span>}
                        {p.warrantyMonths ? <span className="inline-flex items-center gap-0.5"><ShieldCheck className="h-3 w-3" />{p.warrantyMonths} mahine</span> : null}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${ptaTone(p.ptaStatus)}`}>{PTA_STATUS_LABELS[p.ptaStatus]}</span>
                    {taken && <span className="shrink-0 text-xs font-semibold text-amber-700">Bill me hai</span>}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}
