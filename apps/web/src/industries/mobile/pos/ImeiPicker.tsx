/**
 * Picks the exact phone for the bill: every in-stock IMEI of the model in
 * this branch, grouped by variant, with PTA status and warranty. Typing or
 * scanning an IMEI narrows the list; Enter on a single match picks it.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ScanLine, ShieldCheck, Smartphone, X } from 'lucide-react';
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`${name} — IMEI chunein`}>
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-xl sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Smartphone className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">IMEI chunein</div>
            <div className="truncate font-semibold text-slate-900">{name}</div>
          </div>
          <span className="text-sm text-slate-500">{phones.length} phone</span>
          <button type="button" aria-label="Band karein" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-200 px-4 py-3">
          <label className="relative block">
            <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
              placeholder="IMEI scan karein ya likhein"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 font-mono text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200" />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
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
      </div>
    </div>
  );
}
