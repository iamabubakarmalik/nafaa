/**
 * Landed cost on a purchase: the costs added (freight, customs, clearing,
 * transport), and "Landed cost jorein" to add more, also after the goods
 * arrived. After arrival only the stock still on hand takes the extra cost;
 * the part that fell on units already sold is shown, with an offer to write
 * it as an expense so the P&L still carries it.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Ship, Trash2 } from 'lucide-react';
import { Alert, Button, Modal, confirmDialog } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { expensesApi } from '@modules/finance/expenses/api/expenses.api';
import { purchasesApi, type LandedCostResult, type LandedMethod, type Purchase, type PurchaseItem } from '../api/purchases.api';
import { LandedCostEditor, kindLabel, landedTotal, METHODS, newLanded, toPayload, type LandedDraft } from './LandedCostEditor';

const nameOf = (i: PurchaseItem) => i.itemName || i.product?.name || i.ingredient?.name || 'Cheez';
const unitOf = (i: PurchaseItem) => i.product?.unit ?? i.ingredient?.unit ?? 'pcs';
const apiError = (e: unknown, fallback: string) => {
  const m = (e as any)?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || (e as Error)?.message || fallback;
};

export function LandedCostPanel({ p, onChanged }: { p: Purchase; onChanged: () => void }) {
  const canEdit = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const [adding, setAdding] = useState(false);
  const qc = useQueryClient();
  const costs = p.landedCosts ?? [];
  const nothingIn = p.items.every((i) => !(i.receivedQty ?? 0));
  const sold = costs.reduce((s, c) => s + (c.soldShare || 0), 0);

  const remove = useMutation({
    mutationFn: (costId: string) => purchasesApi.removeLandedCost(p.id, costId),
    onSuccess: () => { toast.success('Cost hat gayi'); qc.invalidateQueries({ queryKey: ['purchase', p.id] }); onChanged(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hati')),
  });

  if (!costs.length && (!canEdit || p.status === 'CANCELLED')) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-slate-800"><Ship className="h-4 w-4 text-brand-600" /> Landed cost</p>
        {(p.landedCost ?? 0) > 0 && <span className="text-[0.8125rem] font-bold tabular-nums text-slate-900">{formatPKR(p.landedCost!)}</span>}
      </div>
      {costs.length === 0 ? (
        <p className="text-[0.75rem] text-slate-500">Freight, customs, clearing agent — jo dusron ko diya, maal ki Cost me jor dein.</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-[0.8125rem]">
          {costs.map((c) => (
            <li key={c.id} className="flex items-start gap-2 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-slate-800">{kindLabel(c.kind)}</p>
                <p className="text-[0.6875rem] text-slate-500">
                  {[c.currency ? `${c.currency} ${c.foreignAmount} × ${c.exchangeRate}` : null, c.label, METHODS.find((m) => m.value === c.method)?.label, c.afterReceipt ? 'maal aane ke baad' : null].filter(Boolean).join(' · ')}
                </p>
              </div>
              <span className="tabular-nums text-slate-900">{formatPKR(c.amount)}</span>
              {canEdit && nothingIn && (
                <button type="button" aria-label="Cost hatayein" disabled={remove.isPending}
                  onClick={async () => { if (await confirmDialog({ title: `${kindLabel(c.kind)} (${formatPKR(c.amount)}) hatayein?`, danger: true })) remove.mutate(c.id); }}
                  className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      {sold > 0 && <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[0.75rem] text-amber-900">{formatPKR(sold)} us maal ka hissa tha jo cost jurne se pehle bik chuka tha.</p>}
      {canEdit && p.status !== 'CANCELLED' && (
        <Button size="sm" variant="secondary" fullWidth className="mt-3" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>Landed cost jorein</Button>
      )}
      {adding && <AddLandedModal p={p} onClose={() => setAdding(false)} onDone={() => { qc.invalidateQueries({ queryKey: ['purchase', p.id] }); onChanged(); }} />}
    </div>
  );
}

function AddLandedModal({ p, onClose, onDone }: { p: Purchase; onClose: () => void; onDone: () => void }) {
  const canExpense = usePermission(PERMISSIONS.EXPENSES_CREATE);
  const [costs, setCosts] = useState<LandedDraft[]>([newLanded()]);
  const [method, setMethod] = useState<LandedMethod>(p.landedCostMethod ?? 'VALUE');
  const [weights, setWeights] = useState<Record<string, number | null>>(Object.fromEntries(p.items.map((i) => [i.id, i.weightKg ?? null])));
  const [result, setResult] = useState<LandedCostResult | null>(null);
  const received = p.items.some((i) => (i.receivedQty ?? 0) > 0);
  const total = landedTotal(costs);
  const bad = costs.some((c) => c.currency !== 'PKR' && c.amount > 0 && !(c.rate > 0));

  const save = useMutation({
    mutationFn: () => {
      if (!(total > 0)) throw new Error('Amount likhein');
      if (bad) throw new Error('Currency ka rate (Rs me) likhein');
      return purchasesApi.addLandedCosts(p.id, {
        costs: toPayload(costs), method,
        weights: method === 'WEIGHT' ? Object.entries(weights).filter(([, v]) => v != null).map(([itemId, weightKg]) => ({ itemId, weightKg: weightKg! })) : undefined,
      });
    },
    onSuccess: (r) => {
      onDone();
      if (r.soldShare > 0) setResult(r);
      else { toast.success(`${formatPKR(r.total)} landed cost jur gayi${r.afterReceipt ? ' — bache hue maal ki Cost barh gayi' : ''}`); onClose(); }
    },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  const post = useMutation({
    mutationFn: () => expensesApi.create({
      title: `Landed cost (bika hua maal) · ${p.purchaseNumber}`,
      description: `${p.purchaseNumber} ki landed cost ka hissa jo cost jurne se pehle bik chuke maal par tha`,
      amount: result!.soldShare, paymentMethod: 'BANK_TRANSFER', ...(p.shop?.id && { shopId: p.shop.id }),
    }),
    onSuccess: () => { toast.success('Expenses me likh diya'); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Expense nahi likha')),
  });

  if (result) {
    return (
      <Modal open onClose={onClose} size="md" title="Landed cost jur gayi"
        footer={<>
          <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
          {canExpense && <Button onClick={() => post.mutate()} loading={post.isPending}>{formatPKR(result.soldShare)} Expenses me likhein</Button>}
        </>}>
        <div className="space-y-3 text-[0.8125rem] text-slate-700">
          <p>{formatPKR(result.total)} me se <b>{formatPKR(result.total - result.soldShare)}</b> bache hue maal ki Cost me jur gaye.</p>
          <Alert tone="warning">
            {formatPKR(result.soldShare)} us maal ka hissa hai jo pehle hi bik chuka (ya wapas gaya). Purani sales ki Cost nahi badalti, is liye ye kisi Cost me nahi gaya.
            Profit sahi rakhne ke liye ise Expenses me likh dein.
          </Alert>
          <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
            {result.lines.filter((l) => l.share > 0).map((l) => (
              <li key={l.itemId} className="flex flex-wrap justify-between gap-2 px-3 py-1.5">
                <span className="text-slate-800">{l.itemName}</span>
                <span className="text-[0.75rem] text-slate-500">{l.newCost != null ? `nayi Cost ${formatPKR(l.newCost)} · ` : ''}bika hissa {formatPKR(l.soldShare)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} size="lg" closeOnBackdrop={false} title={`Landed cost jorein · ${p.purchaseNumber}`}
      description="Freight, customs/duty, clearing agent, local transport — Rs me ya dollar/yuan me rate ke saath"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!(total > 0)}>{total > 0 ? `${formatPKR(total)} jorein` : 'Jorein'}</Button>
      </>}>
      <div className="space-y-3">
        {received && (
          <Alert tone="info">
            Maal aa chuka hai: ye cost sirf <b>abhi stock me bache</b> maal ki Cost barhayegi. Jo maal pehle bik chuka, us ki purani sale ki Cost nahi badlegi — us ka hissa alag bataya jayega.
          </Alert>
        )}
        <LandedCostEditor costs={costs} onCosts={setCosts} method={method} onMethod={setMethod}
          lines={p.items.map((i) => ({ id: i.id, name: nameOf(i), value: i.total, qty: i.baseQuantity ?? i.quantity, unit: unitOf(i), weightKg: weights[i.id] ?? null }))}
          onWeight={(id, kg) => setWeights((w) => ({ ...w, [id]: kg }))} />
      </div>
    </Modal>
  );
}
