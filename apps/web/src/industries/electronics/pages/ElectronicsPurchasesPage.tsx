// apps/web/src/industries/electronics/pages/ElectronicsPurchasesPage.tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Barcode, Plus, X, Copy, AlertTriangle, CheckCircle2, Loader2, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import PurchasesPage from '@modules/purchasing/purchases/pages/PurchasesPage';
import { serialTrackingApi } from '../api/serial-tracking.api';
import { electronicsPosApi } from '../api/electronics-pos.api';

/* ═════════════════════════════════════════════════════════════
   ELECTRONICS KHARIDARI
   ─────────────────────────────────────────────────────────────
   Poora page ab global hai (`@modules/purchasing`). Electronics
   me sirf ek cheez extra hai: serial wali cheez khareedne par
   uske serial numbers daalna. Wohi yahan se lagta hai.
   ═════════════════════════════════════════════════════════════ */

export default function ElectronicsPurchasesPage() {
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const [serialFor, setSerialFor] = useState<{
    productId: string; productName: string; expected: number;
    costPrice: number; supplierRef: string;
  } | null>(null);

  /* Kaunse products serial wale hain */
  const { data: catalog } = useQuery({
    queryKey: ['electronics-pos-catalog', currentShopId, '', 'purchases'],
    queryFn: () => electronicsPosApi.catalog({ shopId: currentShopId || undefined }),
  });

  const serialProductIds = new Set(
    (catalog?.items ?? []).filter((p) => p.requiresSerial).map((p) => p.id),
  );

  const { data: allSerials = [] } = useQuery({
    queryKey: ['electronics-serials-all'],
    queryFn: () => serialTrackingApi.list({}),
  });

  const serialCountByProduct = new Map<string, number>();
  for (const s of allSerials as any[]) {
    serialCountByProduct.set(s.productId, (serialCountByProduct.get(s.productId) ?? 0) + 1);
  }

  return (
    <>
      {serialFor && (
        <BulkSerialModal
          {...serialFor}
          shopId={currentShopId}
          alreadyHave={serialCountByProduct.get(serialFor.productId) ?? 0}
          onClose={() => setSerialFor(null)}
        />
      )}

      <PurchasesPage
        gradient="from-slate-950 via-teal-900 to-emerald-700"
        emoji="🔌"
        industryLabel="Electronics"
        /* Bill banate waqt: serial wali cheez par badge */
        draftLineExtra={({ productId }) =>
          serialProductIds.has(productId) ? (
            <span className="px-1 rounded bg-violet-100 text-violet-700 text-[9px] font-extrabold inline-flex items-center gap-0.5">
              <Barcode className="h-2.5 w-2.5" /> Serial
            </span>
          ) : null
        }
        /* Record me: bill ki line ke neeche serial daalne ka button */
        itemExtra={({ item, purchase }) => {
          if (!serialProductIds.has(item.product.id)) return null;
          const have = serialCountByProduct.get(item.product.id) ?? 0;
          return (
            <div className="mt-2 rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-2 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-violet-800 flex-1 min-w-0">
                Serial wali cheez — abhi <b>{have}</b> units darj hain
              </span>
              <button
                onClick={() => setSerialFor({
                  productId: item.product.id,
                  productName: item.product.name,
                  expected: item.quantity,
                  costPrice: item.costPrice,
                  supplierRef: purchase.purchaseNumber,
                })}
                className="h-8 px-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0 transition">
                <Plus className="h-3 w-3" /> Serial Daalein
              </button>
            </div>
          );
        }}
      />
    </>
  );
}

/* ═════════════════════════════════════════════════════════════
   BULK SERIAL ENTRY
   ═════════════════════════════════════════════════════════════ */

function BulkSerialModal({
  productId, productName, expected, costPrice, supplierRef, shopId, alreadyHave, onClose,
}: {
  productId: string; productName: string; expected: number; costPrice: number;
  supplierRef: string; shopId: string | null; alreadyHave: number; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [warrantyStart, setWarrantyStart] = useState(new Date().toISOString().slice(0, 10));

  const seen = new Set<string>();
  const entries = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[,\t;]+/).map((x) => x.trim()).filter(Boolean);
      return { serialNumber: parts[0] ?? '', imei: parts[1], imei2: parts[2], macAddress: parts[3] };
    })
    .filter((e) => {
      if (!e.serialNumber) return false;
      const k = e.serialNumber.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  const dupSeen = new Set<string>();
  let dupesInPaste = 0;
  for (const line of text.split(/\r?\n/)) {
    const sn = line.split(/[,\t;]+/)[0]?.trim().toLowerCase();
    if (!sn) continue;
    if (dupSeen.has(sn)) dupesInPaste++;
    dupSeen.add(sn);
  }

  const mutation = useMutation({
    mutationFn: () => serialTrackingApi.bulkCreate({
      productId,
      shopId: shopId || undefined,
      entries,
      purchasePrice: costPrice || undefined,
      supplierRef,
      warrantyStartDate: warrantyStart || undefined,
    }),
    onSuccess: (res) => {
      const parts = [`${res.created} units darj ho gaye`];
      if (res.skipped > 0) parts.push(`${res.skipped} pehle se maujood the`);
      toast.success(parts.join(' · '));
      qc.invalidateQueries({ queryKey: ['electronics-serials-all'] });
      qc.invalidateQueries({ queryKey: ['electronics-stock-report'] });
      qc.invalidateQueries({ queryKey: ['electronics-low-stock'] });
      qc.invalidateQueries({ queryKey: ['electronics-pos-catalog'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Serial darj nahi hue'),
  });

  const short = expected - entries.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-r from-violet-600 to-purple-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur shrink-0">
              <Barcode className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Serial Numbers</div>
              <h3 className="font-extrabold truncate">{productName}</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white/20 flex items-center justify-center transition shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Bill Me Aaye</div>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{expected}</div>
            </div>
            <div className="rounded-xl bg-violet-50 border-2 border-violet-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-violet-600 tracking-wider">Pehle Se Darj</div>
              <div className="text-2xl font-extrabold text-violet-900 tabular-nums">{alreadyHave}</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Serial Numbers — har line par ek
            </label>
            <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} autoFocus
              placeholder={'SN123456789\nSN987654321, 356938035643809\nSN555000111'}
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-violet-500 transition" />
            <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
              IMEI bhi hai to comma laga kar sath likhein — <span className="font-mono">serial, imei</span>
            </p>
          </div>

          {entries.length > 0 && (
            <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-extrabold">
                {entries.length} serial tayyar
              </span>
              {dupesInPaste > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-extrabold inline-flex items-center gap-1">
                  <Copy className="h-3 w-3" /> {dupesInPaste} do bar likhe the
                </span>
              )}
              {short > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-extrabold">
                  {short} abhi baqi hain
                </span>
              )}
              {short < 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-extrabold inline-flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> bill se {-short} zyada
                </span>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Warranty Shuru
            </label>
            <input type="date" value={warrantyStart} onChange={(e) => setWarrantyStart(e.target.value)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500 transition" />
            <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
              Product ki warranty ke mahine isi tareekh se ginay jayenge
            </p>
          </div>

          <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs font-semibold text-blue-900">
              Khareed qeemat <b>{costPrice > 0 ? formatPKR(costPrice) : '—'}</b> aur bill number{' '}
              <b className="font-mono">{supplierRef}</b> har unit par khud lag jayenge.
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 flex gap-2 justify-end shrink-0">
          <button onClick={onClose} className="h-11 px-4 rounded-xl bg-white border-2 border-slate-200 text-slate-700 text-sm font-extrabold hover:bg-slate-100 transition">
            Cancel
          </button>
          <Button onClick={() => mutation.mutate()} disabled={entries.length === 0 || mutation.isPending}
            className="bg-gradient-to-r from-violet-600 to-purple-700 font-extrabold shadow-lg">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {entries.length} Serial Darj Karein
          </Button>
        </div>
      </div>
    </div>
  );
}
