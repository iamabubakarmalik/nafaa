/**
 * Opening a warranty claim. Scanning the unit's serial or IMEI fills the
 * product, customer, bill and date of sale from our own record and shows
 * whether the warranty still runs; a unit sold elsewhere is written in by
 * hand. On save the customer's slip can be printed.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ScanLine, ShieldCheck, ShieldOff, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Modal, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { Product } from '@modules/inventory/products/api/products.api';
import type { Customer } from '@modules/customers/customers/api/customers.api';
import { serialTrackingApi, type WarrantyCheck } from '../api/serial-tracking.api';
import { warrantyClaimsApi, type WarrantyClaim } from '../api/warranty-claims.api';
import { CustomerPick, ProductPick } from './pickers';
import { ISSUE_CHIPS, apiError, shortDate } from './meta';

export const CLAIM_KEYS = ['electronics-claims', 'electronics-warranty-claims', 'electronics-claims-summary', 'electronics-serials', 'electronics-dashboard'];
const today = () => new Date().toISOString().slice(0, 10);

export function NewClaimModal({ initialCode, onClose, onSaved }: {
  initialCode?: string;
  onClose: () => void;
  onSaved: (c: WarrantyClaim) => void;
}) {
  const qc = useQueryClient();
  const [code, setCode] = useState(initialCode ?? '');
  const [hit, setHit] = useState<WarrantyCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [invoice, setInvoice] = useState('');
  const [serialText, setSerialText] = useState('');
  const [category, setCategory] = useState('');
  const [issue, setIssue] = useState('');
  const [notes, setNotes] = useState('');

  const lookup = async (c = code) => {
    const v = c.trim();
    if (!v) return;
    setBusy(true);
    try {
      const r = await serialTrackingApi.warrantyCheck(v);
      setHit(r);
      if (r.found && r.serial) {
        setSerialText(r.serial.serialNumber);
        setProductName(r.serial.product?.name ?? '');
        if (r.serial.soldAt) setPurchaseDate(r.serial.soldAt.slice(0, 10));
        setInvoice(r.serial.invoiceNumber ?? '');
        if (r.serial.customer) { setCustName(r.serial.customer.name); setCustPhone(r.serial.customer.phone ?? ''); }
      } else {
        setSerialText(v);
      }
    } catch (e) { toast.error(apiError(e, 'Serial check nahi hua')); } finally { setBusy(false); }
  };
  useEffect(() => { if (initialCode) void lookup(initialCode); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const own = hit?.found && hit.serial ? hit.serial : null;
  const name = own ? productName : product?.name ?? productName;
  const who = customer?.name ?? custName;
  const problem = !name.trim() ? 'Product chunein ya naam likhein'
    : !who.trim() ? 'Customer ka naam likhein'
      : !issue.trim() && !category ? 'Kharabi likhein'
        : !purchaseDate ? 'Khareed ki date likhein'
          : null;

  const save = useMutation({
    mutationFn: () => warrantyClaimsApi.create({
      ...(own ? { serialTrackingId: own.id } : { productId: product?.id, serialNumber: serialText.trim() || undefined }),
      productName: name.trim(),
      customerId: customer?.id ?? own?.customer?.id ?? undefined,
      customerName: who.trim(),
      customerPhone: (customer?.phone ?? custPhone).trim() || undefined,
      purchaseDate,
      invoiceNumber: invoice.trim() || undefined,
      issueCategory: category || undefined,
      issueDescription: (issue.trim() || category).trim(),
      internalNotes: notes.trim() || undefined,
    }),
    onSuccess: (c) => {
      toast.success(`Claim ${c.claimNumber} khul gaya`);
      CLAIM_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onSaved(c);
    },
    onError: (e) => toast.error(apiError(e, 'Claim nahi khula')),
  });

  const w = hit?.warranty;
  return (
    <Modal open onClose={onClose} size="lg" title={<span className="inline-flex items-center gap-2"><Wrench className="h-5 w-5 text-brand-600" />Naya warranty claim</span>}
      description="Customer kharab unit laya — serial scan karein, baqi khud bhar jata hai"
      footer={<>
        <p className="mr-auto text-[0.8125rem] text-slate-500">{problem ?? 'Save ke baad customer ki parchi print kar sakte hain'}</p>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!!problem}>Claim kholein</Button>
      </>}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void lookup(); } }}
            placeholder="Serial ya IMEI scan karein" className="font-mono" wrapperClassName="flex-1" leftIcon={<ScanLine className="h-4 w-4" />} data-autofocus
            hint="Hamare record mein ho to product, customer aur bill khud aa jate hain" />
          <Button variant="secondary" onClick={() => void lookup()} loading={busy} disabled={!code.trim()}>Dhoondein</Button>
        </div>

        {hit && (
          <div className={cn('flex items-start gap-2 rounded-xl px-3 py-2 text-[0.8125rem] ring-1',
            !own ? 'bg-slate-50 text-slate-700 ring-slate-200' : w?.isValid ? 'bg-emerald-50 text-emerald-900 ring-emerald-200' : 'bg-rose-50 text-rose-900 ring-rose-200')}>
            {own && w?.isValid ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> : <ShieldOff className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>
              {!own ? 'Ye unit hamare record mein nahi — neeche khud likhein.'
                : own.status !== 'SOLD' ? `Ye unit abhi bika hua nahi (${own.status}). Customer ka claim sirf bike unit par hota hai.`
                  : w?.isValid ? `Warranty chal rahi — ${shortDate(w.endDate)} tak (${w.daysRemaining} din).`
                    : `Warranty ${w?.endDate ? `${shortDate(w.endDate)} ko khatam` : 'nahi'} — repair paid hogi.`}
              {!!hit.claims?.length && ` Pichle claim: ${hit.claims.map((x) => x.claimNumber).join(', ')}.`}
            </span>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {own ? (
            <Input label="Product" value={productName} onChange={(e) => setProductName(e.target.value)} maxLength={200} hint={`Serial ${own.serialNumber}`} />
          ) : product ? (
            <ProductPick value={product} onChange={setProduct} />
          ) : (
            <div className="space-y-2">
              <ProductPick value={null} onChange={setProduct} hint="Ya neeche naam likhein" />
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} maxLength={200} placeholder="Product ka naam (record mein nahi)" />
            </div>
          )}
          {!own && <Input label="Serial / IMEI" value={serialText} onChange={(e) => setSerialText(e.target.value)} className="font-mono" maxLength={80} hint="Marzi hai — dabbe ya unit se" />}
          <Input label="Khareed ki date" type="date" required value={purchaseDate} max={today()} onChange={(e) => setPurchaseDate(e.target.value)} hint="Bill ki date — warranty isi se ginti hai" />
          <Input label="Bill number" value={invoice} onChange={(e) => setInvoice(e.target.value)} maxLength={60} placeholder="NF-…" hint="Marzi hai" />
        </div>

        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          {own?.customer && !customer ? (
            <p className="text-[0.8125rem] text-slate-700">Customer: <b>{own.customer.name}</b>{own.customer.phone ? ` · ${own.customer.phone}` : ''}</p>
          ) : (
            <>
              <CustomerPick value={customer} onChange={setCustomer} hint="Pehle se customer hai to chunein — warna naam aur phone likhein" />
              {!customer && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Input label="Naam" required value={custName} onChange={(e) => setCustName(e.target.value)} maxLength={120} />
                  <Input label="Phone" inputMode="tel" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} maxLength={30} placeholder="03xx…" hint="Unit tayyar hone par isi par batayein" />
                </div>
              )}
            </>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Kharabi</p>
          <div className="mb-2 flex flex-wrap gap-1">
            {ISSUE_CHIPS.map((x) => (
              <button key={x} type="button" onClick={() => setCategory((c) => (c === x ? '' : x))}
                className={cn('h-7 rounded-lg px-2 text-[0.75rem] font-medium ring-1', category === x ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>{x}</button>
            ))}
          </div>
          <Textarea rows={3} value={issue} onChange={(e) => setIssue(e.target.value)} maxLength={2000} placeholder="Customer ne kya bataya — kab se, kaise hua"
            hint="Toota ya paani laga ho to yahan likhein — warranty mein nahi aata" />
        </div>
        <Textarea label="Andar ka note" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Dabba, charger saath hai ya nahi" hint="Customer ki parchi par nahi chhapta" />
      </div>
    </Modal>
  );
}
