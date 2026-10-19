/**
 * Closing a warranty claim with its outcome. The money and stock of the
 * outcome go into the books on the server:
 *   - repaired: a charge to the customer becomes a bill (unpaid part on
 *     khata); the shop's repair cost can be paid from the drawer;
 *   - replaced: a unit from stock goes to the customer as a write-off;
 *   - refunded: done first as a Return on the original bill;
 *   - rejected: no warranty (damage, water), the unit's warranty ends.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Modal, Select, Switch, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useShopParam } from '@core/stores/auth.store';
import { POS_PAYMENT_METHODS } from '@modules/pos/lib/posCart';
import { serialTrackingApi } from '../api/serial-tracking.api';
import { warrantyClaimsApi, type ClaimRow, type ResolutionType } from '../api/warranty-claims.api';
import { CLAIM_KEYS } from './NewClaimModal';
import { SERIAL_KEYS } from './AddUnitsModal';
import { OUTCOME, apiError } from './meta';

const num = (v: string) => v.replace(/[^\d.]/g, '');

export function ResolveClaimModal({ claim, underWarranty, onClose }: { claim: ClaimRow; underWarranty: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const shopId = useShopParam();
  const canReplace = usePermission(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE);
  const [type, setType] = useState<ResolutionType>('REPAIRED');
  const [charge, setCharge] = useState('');
  const [paidNow, setPaidNow] = useState('');
  const [method, setMethod] = useState('CASH');
  const [repairCost, setRepairCost] = useState('');
  const [brand, setBrand] = useState('');
  const [fromDrawer, setFromDrawer] = useState(false);
  const [replacement, setReplacement] = useState('');
  const [text, setText] = useState('');

  const units = useQuery({
    queryKey: ['electronics-serials', 'replacement', claim.productId, shopId],
    queryFn: () => serialTrackingApi.list({ productId: claim.productId!, status: 'IN_STOCK', shopId }),
    enabled: type === 'REPLACED' && !!claim.productId,
  });

  const fee = type === 'REJECTED' ? 0 : Number(charge) || 0;
  const now = paidNow === '' ? fee : Math.min(Number(paidNow) || 0, fee);
  const cost = Number(repairCost) || 0;
  const byBrand = Number(brand) || 0;
  const shopCost = Math.max(cost - byBrand, 0);

  const problem = useMemo(() => {
    if (type === 'REPLACED' && !canReplace) return 'Naya unit dene ke liye Stock adjustment ki permission chahiye';
    if (type === 'REPLACED' && !claim.productId) return 'Is claim ka product record mein nahi — replacement yahan se nahi ho sakta';
    if (type === 'REPLACED' && units.data && units.data.length > 0 && !replacement) return 'Naya unit chunein';
    if (now > fee) return 'Mila hua charge se zyada hai';
    if (fee - now > 0.5 && !claim.customerId && !claim.customerName) return 'Udhaar ke liye customer chahiye';
    return null;
  }, [type, canReplace, claim, units.data, replacement, now, fee]);

  const save = useMutation({
    mutationFn: () => warrantyClaimsApi.resolve(claim.id, {
      resolutionType: type,
      ...(type === 'REPLACED' && replacement && { replacementSerialId: replacement }),
      ...(type !== 'REJECTED' && type !== 'REFUNDED' && {
        paidByCustomer: fee, paidNow: now, paymentMethod: method, repairCost: cost, paidByBrand: byBrand, costFromDrawer: fromDrawer,
      }),
      resolution: text.trim() || undefined,
    }),
    onSuccess: () => {
      toast.success(`${claim.claimNumber} band ho gaya — ${OUTCOME[type].label}`);
      [...CLAIM_KEYS, ...SERIAL_KEYS, 'cash-register', 'sales-history'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Claim band nahi hua')),
  });

  return (
    <Modal open onClose={onClose} size="lg" title={`Claim ${claim.claimNumber} — hal karein`} description={`${claim.productName} · ${claim.customerName}`}
      footer={<>
        <p className={cn('mr-auto text-[0.8125rem]', problem ? 'text-amber-800' : 'text-slate-500')}>
          {problem ?? (fee > 0 ? `Bill ${claim.claimNumber}: ${formatPKR(fee)}${fee - now > 0.5 ? ` · udhaar ${formatPKR(fee - now)}` : ''}` : 'Koi bill nahi banega')}
        </p>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!!problem} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Band karein</Button>
      </>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Natija">
          {(Object.keys(OUTCOME) as ResolutionType[]).map((k) => {
            const o = OUTCOME[k];
            return (
              <button key={k} type="button" role="radio" aria-checked={type === k} onClick={() => setType(k)}
                className={cn('rounded-xl p-2.5 text-left ring-1 transition', type === k ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                <o.icon className="h-4 w-4" style={{ color: o.color }} />
                <p className="mt-1 text-[0.8125rem] font-semibold text-slate-900">{o.label}</p>
                <p className="text-[0.6875rem] leading-snug text-slate-500">{o.hint}</p>
              </button>
            );
          })}
        </div>

        {type === 'REFUNDED' && (
          <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
            <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-4 w-4" />Pehle asal bill par Return karein</p>
            <p className="mt-1">Return se paisa, stock aur khata theek hote hain. {claim.invoiceNumber ? <>Bill <b>{claim.invoiceNumber}</b> Sales history mein kholein → Wapas.</> : 'Is claim par bill number nahi — Sales history se bill dhoondein.'} Phir yahan "Band karein" dabayein — refund ki amount Return se khud aa jayegi.</p>
            <Link to="/sales" className="mt-2 inline-block font-semibold underline">Sales history kholein</Link>
          </div>
        )}

        {type === 'REPLACED' && (
          units.isLoading ? <p className="text-sm text-slate-500">Stock ke units aa rahe hain…</p>
            : units.data && units.data.length > 0 ? (
              <Select label="Naya unit (stock se)" value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder="Chunein"
                options={units.data.map((u) => ({ value: u.id, label: `${u.serialNumber}${u.imei ? ` · ${u.imei}` : ''}` }))}
                hint="Purane unit ka bill aur warranty is naye unit par chali jayegi; purana unit Kharab ho jayega" />
            ) : (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700 ring-1 ring-slate-200">Is branch mein is product ka koi serial unit stock mein nahi. Band karne par ek piece stock se nikal jayega (write-off).</p>
            )
        )}

        {(type === 'REPAIRED' || type === 'REPLACED') && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Customer se charge (Rs)" inputMode="decimal" value={charge} onChange={(e) => setCharge(num(e.target.value))} placeholder="0" className="text-right tabular-nums"
              hint={underWarranty ? 'Warranty mein hai — aam tor par 0' : 'Warranty khatam — repair ka charge likhein'} />
            {fee > 0 && (
              <>
                <Input label="Abhi mila (Rs)" inputMode="decimal" value={paidNow} onChange={(e) => setPaidNow(num(e.target.value))} placeholder={String(fee)} className="text-right tabular-nums"
                  hint={fee - now > 0.5 ? `${formatPKR(fee - now)} khate mein jayega` : 'Poora mila'} />
                <Select label="Kaise mila" value={method} onChange={(e) => setMethod(e.target.value)} options={POS_PAYMENT_METHODS.map((m) => ({ value: m.id, label: m.label }))} hint="Cash galle mein, baqi account mein" />
              </>
            )}
            <Input label="Dukaan ka repair kharcha (Rs)" inputMode="decimal" value={repairCost} onChange={(e) => setRepairCost(num(e.target.value))} placeholder="0" className="text-right tabular-nums"
              hint="Mistri, parts ya service center ko diya — profit isi se ghatega" />
            <Input label="Company ne diya (Rs)" inputMode="decimal" value={brand} onChange={(e) => setBrand(num(e.target.value))} placeholder="0" className="text-right tabular-nums"
              hint="Kharche mein se company ne jo wapas diya" />
            {shopCost > 0 && (
              <Switch checked={fromDrawer} onChange={(e) => setFromDrawer(e.target.checked)} label={`${formatPKR(shopCost)} galle se diye`}
                description="On karein agar kharcha abhi khule galle se cash diya — register ki ginti theek rahegi" />
            )}
          </div>
        )}

        <Textarea label={type === 'REJECTED' ? 'Wajah' : 'Kya kiya'} rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={500}
          placeholder={type === 'REJECTED' ? 'Paani laga, board jala — warranty mein nahi' : 'Panel badla, company se theek hua'} hint="Customer ki parchi par chhapta hai" />
      </div>
    </Modal>
  );
}
