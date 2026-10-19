/**
 * Bundle at the counter: pick the serial unit of every serial-tracked
 * product inside it (a TV in a "TV + wall mount" deal), by tapping or by
 * scanning. Each unit then goes on the bill with its own warranty, the same
 * as a serial product sold on its own.
 */

import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Barcode, CheckCircle2, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { PosComboSerial } from '@modules/pos/engine';
import { serialTrackingApi, type SerialWithProduct } from '../../api/serial-tracking.api';

export interface BundleSerialNeed {
  productId: string;
  name: string;
  /** Units of this product in the bundle(s) being added. */
  count: number;
}

export function BundleSerialPickerModal({ bundleName, needs, taken, onConfirm, onClose }: {
  bundleName: string;
  needs: BundleSerialNeed[];
  /** Serial ids already on the bill; they are not offered again. */
  taken: Set<string>;
  onConfirm: (serials: PosComboSerial[]) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [code, setCode] = useState('');

  // Same fresh list the single-product picker reads, so a sold unit never shows.
  const lists = useQueries({
    queries: needs.map((n) => ({
      queryKey: ['serials-for-pos', n.productId],
      queryFn: () => serialTrackingApi.list({ productId: n.productId, status: 'IN_STOCK' }),
      staleTime: 0,
    })),
  });
  const loading = lists.some((q) => q.isLoading);
  const units = needs.map((n, i) => (lists[i]?.data ?? []).filter((s) => !taken.has(s.id)));

  const toggle = (n: BundleSerialNeed, s: SerialWithProduct) => setPicked((p) => {
    const cur = p[n.productId] ?? [];
    if (cur.includes(s.id)) return { ...p, [n.productId]: cur.filter((x) => x !== s.id) };
    // With one unit needed, a tap swaps the choice; otherwise stop at the count.
    if (cur.length >= n.count) return n.count === 1 ? { ...p, [n.productId]: [s.id] } : p;
    return { ...p, [n.productId]: [...cur, s.id] };
  });

  const scan = () => {
    const c = code.trim().toLowerCase();
    if (!c) return;
    setCode('');
    for (const [i, n] of needs.entries()) {
      const s = units[i].find((u) => [u.serialNumber, u.imei, u.imei2, u.macAddress].some((v) => (v ?? '').toLowerCase() === c));
      if (!s) continue;
      if ((picked[n.productId] ?? []).includes(s.id)) { toast.info('Ye unit pehle se chuna hua hai'); return; }
      if ((picked[n.productId] ?? []).length >= n.count && n.count > 1) { toast.error(`${n.name} ke ${n.count} unit pehle hi chune ja chuke`); return; }
      toggle(n, s);
      return;
    }
    toast.error('Ye serial is bundle ki kisi stock wali cheez ka nahi');
  };

  const missing = needs.reduce((a, n) => a + Math.max(n.count - (picked[n.productId]?.length ?? 0), 0), 0);
  const short = needs.find((n, i) => !loading && units[i].length < n.count);

  const confirm = () => {
    const out: PosComboSerial[] = [];
    needs.forEach((n, i) => {
      for (const id of picked[n.productId] ?? []) {
        const s = units[i].find((u) => u.id === id);
        if (s) out.push({ productId: n.productId, id: s.id, serialNumber: s.serialNumber, imei: s.imei ?? null });
      }
    });
    onConfirm(out);
  };

  return (
    <Modal open onClose={onClose} size="lg"
      title={<span className="inline-flex items-center gap-2"><Barcode className="h-5 w-5 text-brand-600" />Bundle ke serial chunein</span>}
      description={`${bundleName} — har serial wali cheez ka asli unit chunein, taake warranty usi par lage`}
      footer={<>
        <p className={cn('mr-auto text-[0.8125rem]', short ? 'font-medium text-rose-600' : 'text-slate-500')}>
          {short ? `${short.name} ke stock mein ${short.count} unit nahi` : missing ? `${missing} unit aur chunein` : 'Sab unit chun liye'}
        </p>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={confirm} disabled={loading || missing > 0}>Bill mein daalein</Button>
      </>}>
      <div className="space-y-4">
        <Input data-autofocus value={code} onChange={(e) => setCode(e.target.value)} leftIcon={<ScanLine className="h-4 w-4" />}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); scan(); } }}
          placeholder="Serial ya IMEI scan karein" hint="Scan karte hi unit apni cheez ke neeche chun liya jata hai" />
        {needs.map((n, i) => {
          const mine = picked[n.productId] ?? [];
          return (
            <section key={n.productId}>
              <p className="mb-1.5 flex items-center justify-between gap-2 text-[0.8125rem]">
                <span className="truncate font-semibold text-slate-900">{n.name}</span>
                <span className={cn('shrink-0 tabular-nums', mine.length === n.count ? 'text-emerald-700' : 'text-slate-500')}>{mine.length} / {n.count}</span>
              </p>
              {loading ? (
                <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-[0.8125rem] text-slate-500">Aa rahe hain…</p>
              ) : units[i].length === 0 ? (
                <p className="rounded-xl bg-rose-50 px-3 py-4 text-center text-[0.8125rem] text-rose-700">Is branch mein koi unit stock mein nahi</p>
              ) : (
                <div className="grid max-h-56 gap-1.5 overflow-y-auto sm:grid-cols-2">
                  {units[i].map((s) => {
                    const on = mine.includes(s.id);
                    return (
                      <button key={s.id} type="button" onClick={() => toggle(n, s)} aria-pressed={on}
                        className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-left ring-1 transition',
                          on ? 'bg-brand-50 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-[0.8125rem] font-semibold text-slate-900">{s.serialNumber}</span>
                          {s.imei && <span className="block truncate font-mono text-[0.6875rem] text-slate-500">IMEI {s.imei}</span>}
                        </span>
                        {on && <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </Modal>
  );
}
