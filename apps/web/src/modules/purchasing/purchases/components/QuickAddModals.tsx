import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Loader2, CheckCircle2, Truck, Package, Phone, MapPin,
  User, AlertTriangle, ScanLine, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { suppliersApi } from '../../suppliers/api/suppliers.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { useQuery } from '@tanstack/react-query';

/* ═════════════════════════════════════════════════════════════
   QUICK ADD — kharidari rukne na paye
   ─────────────────────────────────────────────────────────────
   Supplier truck le kar khara hai aur us ka naam list me nahi —
   ya koi nayi cheez laya hai jo system me hai hi nahi. Purani
   soorat me dukaan-daar ko doosre page par jana parta tha, aur
   adhoora bill zaya ho jata tha.

   Ab dono cheezein yahin, isi safhe par ban jati hain. Sirf woh
   khanay mangte hain jin ke baghair kaam nahi chalta — baqi
   tafseel baad me poori form se.
   ═════════════════════════════════════════════════════════════ */

const inp = (extra = '', bad = false) =>
  [
    'w-full rounded-xl border-2 px-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white',
    'placeholder:text-slate-400 focus:outline-none focus:ring-2 transition',
    bad ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
        : 'border-slate-200 dark:border-slate-700 focus:border-teal-500 focus:ring-teal-200 dark:focus:ring-teal-500/30',
    extra,
  ].join(' ');

function Lbl({ children, hint, req }: { children: React.ReactNode; hint?: string; req?: boolean }) {
  return (
    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
      {children}{req && <span className="text-rose-500 ml-0.5">*</span>}
      {hint && <span className="text-slate-400 normal-case font-bold ml-1">({hint})</span>}
    </label>
  );
}

function Shell({ title, subtitle, badge, icon, tone, onClose, children, footer }: any) {
  const tones: Record<string, string> = {
    teal: 'from-slate-950 via-teal-900 to-emerald-700',
    blue: 'from-slate-950 via-blue-900 to-indigo-700',
  };
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className={`shrink-0 relative bg-gradient-to-br ${tones[tone] ?? tones.teal} text-white px-5 py-4 overflow-hidden`}>
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black border border-white/30">
                {icon} {badge}
              </div>
              <h3 className="text-lg sm:text-xl font-black mt-2 truncate">{title}</h3>
              {subtitle && <div className="text-xs text-white/85 font-bold mt-0.5">{subtitle}</div>}
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="shrink-0 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-4">{footer}</div>
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   🚚 QUICK SUPPLIER
   ═════════════════════════════════════════════════════════════ */
export function QuickSupplierModal({ initialName, onClose, onCreated }: {
  initialName?: string;
  onClose: () => void;
  onCreated: (s: { id: string; name: string }) => void;
}) {
  const qc = useQueryClient();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName ?? '');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [city, setCity] = useState('');
  /** Purana hisab — paper register se aane walon ke liye */
  const [opening, setOpening] = useState('');

  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 80); }, []);

  const mut = useMutation({
    mutationFn: async () => {
      const s = await suppliersApi.create({
        name: name.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(contactPerson.trim() ? { contactPerson: contactPerson.trim() } : {}),
        ...(city.trim() ? { city: city.trim() } : {}),
      } as any);

      // Purana hisab bhi usi waqt — warna baad me yaad nahi rehta
      const open = Number(opening) || 0;
      if (open > 0) {
        const { supplierLedgerApi } = await import('../../suppliers/api/supplier-ledger.api');
        await supplierLedgerApi.setOpeningBalance(s.id, {
          amount: open,
          note: 'Purana hisab — kharidari ke waqt darj kiya',
        });
      }
      return s;
    },
    onSuccess: (s: any) => {
      toast.success(`"${s.name}" ban gaya ✓`);
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['suppliers-summary'] });
      qc.invalidateQueries({ queryKey: ['supplier-ledger-summary'] });
      onCreated(s);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Supplier nahi bana'),
  });

  const ok = !!name.trim();

  return (
    <Shell
      badge="Naya Supplier" icon={<Truck className="h-3 w-3" />} tone="teal"
      title="🚚 Supplier Yahin Bana Lein"
      subtitle="Sirf naam zaroori — baqi tafseel baad me"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 h-12" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <button onClick={() => mut.mutate()} disabled={!ok || mut.isPending}
            onKeyDown={(e) => { if (e.key === 'Enter' && ok) mut.mutate(); }}
            className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-500 hover:to-emerald-600 disabled:opacity-50 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg shadow-teal-500/40 transition active:scale-[0.98]">
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Banao aur Chunein
          </button>
        </div>
      }
    >
      <div className="space-y-3" onKeyDown={(e) => { if (e.key === 'Enter' && ok && !mut.isPending) { e.preventDefault(); mut.mutate(); } }}>
        <div>
          <Lbl req>Supplier ka naam</Lbl>
          <input ref={nameRef} className={inp('h-12 text-base font-extrabold')} maxLength={120}
            placeholder="Akbari Mandi Wholesale" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl hint="WhatsApp ke liye">Phone</Lbl>
            <input className={inp('h-11 font-bold font-mono')} inputMode="tel"
              placeholder="0300-1234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Lbl hint="optional">Banda</Lbl>
            <input className={inp('h-11 font-bold')} placeholder="Asif sb"
              value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
          </div>
        </div>
        <div>
          <Lbl hint="optional">Sheher</Lbl>
          <input className={inp('h-11 font-bold')} placeholder="Lahore" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>

        <div className="rounded-2xl bg-violet-50 dark:bg-violet-500/10 border-2 border-violet-200 dark:border-violet-500/30 p-3">
          <Lbl hint="purani copy se">📖 Purana hisab — pehle se kitna dena tha</Lbl>
          <input type="number" min={0} className={inp('h-11 font-extrabold tabular-nums')}
            placeholder="0" value={opening} onChange={(e) => setOpening(e.target.value)} />
          <div className="mt-1.5 text-[11px] font-semibold text-violet-800 dark:text-violet-300">
            Agar is supplier ka purana baqi hai to abhi daal dein — baad me yaad nahi rehta.
            {Number(opening) > 0 && (
              <strong className="block mt-0.5">Khata {formatPKR(Number(opening))} se shuru hoga</strong>
            )}
          </div>
        </div>

        <div className="text-center text-[10px] font-bold text-slate-400">
          Bank tafseel, NTN, payment terms waghera baad me poori form se
        </div>
      </div>
    </Shell>
  );
}

/* ═════════════════════════════════════════════════════════════
   📦 QUICK PRODUCT
   ═════════════════════════════════════════════════════════════
   Har industry ki apni poori wizard hai (specs, warranty waghera).
   Yahan sirf BUNYADI cheezein banti hain taake bill ruk na jaye —
   tafseel baad me wizard se poori ki ja sakti hai.
   ═════════════════════════════════════════════════════════════ */
export function QuickProductModal({ initialName, initialBarcode, wizardPath, onClose, onCreated }: {
  initialName?: string;
  initialBarcode?: string;
  /** Industry ki apni wizard ka raasta — "poori tafseel" link ke liye */
  wizardPath?: string;
  onClose: () => void;
  onCreated: (p: any) => void;
}) {
  const qc = useQueryClient();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialName ?? '');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState(initialBarcode ?? '');
  const [unit, setUnit] = useState('pcs');
  const [costPrice, setCostPrice] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [lowStockAlert, setLowStockAlert] = useState('');

  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 80); }, []);

  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  const cost = Number(costPrice) || 0;
  const sale = Number(price) || 0;
  const margin = sale > 0 ? ((sale - cost) / sale) * 100 : 0;
  const loss = cost > 0 && sale > 0 && sale < cost;

  const autoSku = () => {
    const base = (name || 'PROD').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim()
      .split(/\s+/).slice(0, 2).map((w) => w.slice(0, 4)).join('-') || 'PROD';
    setSku(`${base}-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const markup = (pct: number) => {
    if (!cost) return toast.error('Pehle lagat likhein');
    setPrice(String(Math.round(cost * (1 + pct / 100))));
  };

  const mut = useMutation({
    mutationFn: () => productsApi.create({
      name: name.trim(),
      unit,
      costPrice: cost,
      price: sale || cost,
      stock: 0,
      ...(sku.trim() ? { sku: sku.trim() } : {}),
      ...(barcode.trim() ? { barcode: barcode.trim() } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(lowStockAlert ? { lowStockAlert: Number(lowStockAlert) || 0 } : {}),
    } as any),
    onSuccess: (p: any) => {
      toast.success(`"${p.name}" ban gaya ✓ — ab bill me daal dein`);
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['purchase-products'] });
      onCreated(p);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Product nahi bana'),
  });

  const ok = !!name.trim() && cost >= 0;

  return (
    <Shell
      badge="Naya Product" icon={<Package className="h-3 w-3" />} tone="blue"
      title="📦 Cheez Yahin Bana Lein"
      subtitle="Bunyadi tafseel — baqi baad me poori wizard se"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 h-12" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <button onClick={() => mut.mutate()} disabled={!ok || mut.isPending}
            className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 disabled:opacity-50 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-500/40 transition active:scale-[0.98]">
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Banao aur Bill Me Daalo
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <Lbl req>Cheez ka naam</Lbl>
          <input ref={nameRef} className={inp('h-12 text-base font-extrabold')} maxLength={160}
            placeholder="Dalda Cooking Oil 5L" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl hint="optional">SKU</Lbl>
            <div className="flex gap-1.5">
              <input className={inp('h-11 font-bold font-mono')} placeholder="DAL-1234"
                value={sku} onChange={(e) => setSku(e.target.value)} />
              <button type="button" onClick={autoSku} title="Khud bana dein"
                className="h-11 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-slate-600 dark:text-slate-300 shrink-0 transition">
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <Lbl hint="dabbay par jo hai">Barcode</Lbl>
            <input className={inp('h-11 font-bold font-mono')} placeholder="8964000..."
              value={barcode} onChange={(e) => setBarcode(e.target.value)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Unit</Lbl>
            <select className={inp('h-11 text-sm font-extrabold')} value={unit} onChange={(e) => setUnit(e.target.value)}>
              {['pcs', 'kg', 'gram', 'litre', 'ml', 'meter', 'foot', 'box', 'pack', 'dozen', 'set', 'unit'].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <Lbl hint="optional">Category</Lbl>
            <select className={inp('h-11 text-sm font-extrabold')} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Koi nahi</option>
              {(cats as any[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl req hint="supplier se kitne ka">Lagat</Lbl>
            <input type="number" min={0} className={inp('h-12 text-base font-extrabold tabular-nums')}
              placeholder="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
          </div>
          <div>
            <Lbl hint="khali = lagat ke barabar">Bechne ka rate</Lbl>
            <input type="number" min={0} className={inp('h-12 text-base font-extrabold tabular-nums', loss)}
              placeholder={costPrice || '0'} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>

        {cost > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {[10, 15, 20, 25, 30].map((p) => (
              <button key={p} type="button" onClick={() => markup(p)}
                className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400 transition">
                +{p}%
              </button>
            ))}
          </div>
        )}

        {sale > 0 && cost > 0 && (
          <div className={`rounded-xl border-2 p-3 flex items-center justify-between text-xs font-extrabold ${
            loss ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300'
                 : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
          }`}>
            <span>{loss ? '⚠️ Nuqsan par bech rahe hain' : 'Har unit par munafa'}</span>
            <span className="tabular-nums">{formatPKR(sale - cost)} · {margin.toFixed(0)}%</span>
          </div>
        )}

        <div>
          <Lbl hint="is se neeche jaye to alert">Alert level</Lbl>
          <input type="number" min={0} className={inp('h-11 font-bold tabular-nums')}
            placeholder="0" value={lowStockAlert} onChange={(e) => setLowStockAlert(e.target.value)} />
        </div>

        <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-[11px] font-bold text-blue-900 dark:text-blue-200">
            Stock <strong>0</strong> se shuru hoga — is bill se khud barh jayega.
            {wizardPath && (
              <> Poori tafseel (warranty, specs waghera) baad me <strong>poori wizard</strong> se bhar lein.</>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
