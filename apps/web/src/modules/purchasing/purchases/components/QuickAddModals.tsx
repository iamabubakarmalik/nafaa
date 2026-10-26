/**
 * Quick-add dialogs used while entering a purchase: a new supplier or a new
 * product can be created without leaving the bill. Only the fields the bill
 * needs are asked for; the full forms fill in the rest later.
 */

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { Alert, Button, IconButton, Input, Modal, Select } from '@/design-system/components';
import { suppliersApi } from '../../suppliers/api/suppliers.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';

const UNITS = ['pcs', 'kg', 'gram', 'litre', 'ml', 'meter', 'foot', 'box', 'pack', 'dozen', 'set', 'unit'];

/** New supplier with an optional opening balance. */
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
  /** Opening balance carried over from a paper register. */
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

      // Record the opening balance now; it is easy to forget later.
      const open = Number(opening) || 0;
      if (open > 0) {
        const { supplierLedgerApi } = await import('../../suppliers/api/supplier-ledger.api');
        await supplierLedgerApi.setOpeningBalance(s.id, {
          amount: open,
          note: 'Purana hisab — purchase ke waqt darj kiya',
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
    <Modal
      open
      size="md"
      title="Naya Supplier"
      description="Sirf naam zaroori hai — baqi details baad me"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={!ok} loading={mut.isPending} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
            Banao aur chunein
          </Button>
        </>
      }
    >
      <div className="space-y-3" onKeyDown={(e) => { if (e.key === 'Enter' && ok && !mut.isPending) { e.preventDefault(); mut.mutate(); } }}>
        <Input ref={nameRef} data-autofocus label="Supplier ka naam" required size="lg" className="font-semibold" maxLength={120}
          placeholder="Akbari Mandi Wholesale" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Phone" hint="WhatsApp ke liye" className="font-mono" inputMode="tel"
            placeholder="0300-1234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Banda (optional)" placeholder="Asif sb"
            value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
        </div>
        <Input label="Sheher (optional)" placeholder="Lahore" value={city} onChange={(e) => setCity(e.target.value)} />

        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <Input type="number" min={0} label="Purana hisab — pehle se kitna dena tha" className="tabular-nums"
            hint={Number(opening) > 0
              ? <strong className="text-slate-700">Khata {formatPKR(Number(opening))} se shuru hoga</strong>
              : 'Is supplier ka purana baqi hai to abhi daal dein — baad me yaad nahi rehta.'}
            placeholder="0" value={opening} onChange={(e) => setOpening(e.target.value)} />
        </div>

        <p className="text-center text-[0.75rem] text-slate-500">Bank details, NTN, payment terms waghera baad me poori form se</p>
      </div>
    </Modal>
  );
}

/** New product with the basics only; stock starts at 0 and the bill adds to it. */
export function QuickProductModal({ initialName, initialBarcode, wizardPath, onClose, onCreated }: {
  initialName?: string;
  initialBarcode?: string;
  /** Path of the industry's full product form. */
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
    if (!cost) return toast.error('Pehle cost likhein');
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
    <Modal
      open
      size="md"
      title="Naya Product"
      description="Bunyadi details — baqi baad me poori wizard se"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={!ok} loading={mut.isPending} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
            Banao aur bill me daalo
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input ref={nameRef} data-autofocus label="Product ka naam" required size="lg" className="font-semibold" maxLength={160}
          placeholder="Dalda Cooking Oil 5L" value={name} onChange={(e) => setName(e.target.value)} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-end gap-1.5">
            <Input label="SKU (optional)" wrapperClassName="min-w-0 flex-1" className="font-mono" placeholder="DAL-1234"
              value={sku} onChange={(e) => setSku(e.target.value)} />
            <IconButton label="Khud bana dein" variant="secondary" onClick={autoSku}><Sparkles className="h-4 w-4" /></IconButton>
          </div>
          <Input label="Barcode" hint="Dabbay par jo likha hai" className="font-mono" placeholder="8964000..."
            value={barcode} onChange={(e) => setBarcode(e.target.value)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} options={UNITS.map((u) => ({ value: u, label: u }))} />
          <Select label="Category (optional)" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Koi nahi</option>
            {(cats as any[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input type="number" min={0} label="Cost" required hint="Supplier se kitne ka" size="lg" className="font-semibold tabular-nums"
            placeholder="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
          <Input type="number" min={0} label="Bechne ka rate" hint={loss ? undefined : 'Khali = cost ke barabar'} error={loss ? 'Cost se kam hai' : undefined}
            size="lg" className="font-semibold tabular-nums" placeholder={costPrice || '0'} value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>

        {cost > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[10, 15, 20, 25, 30].map((p) => (
              <Button key={p} size="xs" variant="secondary" onClick={() => markup(p)}>+{p}%</Button>
            ))}
          </div>
        )}

        {sale > 0 && cost > 0 && (
          <div className={cn('flex items-center justify-between rounded-lg px-3 py-2.5 text-[0.8125rem] font-semibold ring-1 ring-inset',
            loss ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-success-50 text-success-700 ring-success-200')}>
            <span>{loss ? 'Nuqsan par bech rahe hain' : 'Har unit par profit'}</span>
            <span className="tabular-nums">{formatPKR(sale - cost)} · {margin.toFixed(0)}%</span>
          </div>
        )}

        <Input type="number" min={0} label="Alert level" hint="Stock is se neeche jaye to alert" className="tabular-nums"
          placeholder="0" value={lowStockAlert} onChange={(e) => setLowStockAlert(e.target.value)} />

        <Alert tone="info">
          Stock <strong>0</strong> se shuru hoga — is bill se khud barh jayega.
          {wizardPath && <> Poori details (warranty, specs waghera) baad me <strong>poori form</strong> se bhar lein.</>}
        </Alert>
      </div>
    </Modal>
  );
}
