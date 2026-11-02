/**
 * Contractor credit terms: which customer (their khata carries the money),
 * udhaar limit and days, guarantor and cheque security. The limit is also
 * set on the customer so the counter stops a bill over it.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Input, Modal, Textarea } from '@/design-system/components';
import { creditAccountsApi, type CreditAccount } from '../api/credit-accounts.api';
import { CustomerPick, type PickedCustomer } from './CustomerPick';
import { errorText } from '../lib/meta';
import { t } from '@core/i18n';

const phoneOk = (v: string) => !v.trim() || /^[0-9+\-\s]{10,15}$/.test(v.trim());
const cnicOk = (v: string) => !v.trim() || /^\d{5}-?\d{7}-?\d$/.test(v.trim());
const DAYS = [15, 30, 45, 60, 90];

export function ContractorFormModal({ account, onClose }: { account?: CreditAccount; onClose: () => void }) {
  const qc = useQueryClient();
  const [customer, setCustomer] = useState<PickedCustomer | null>(account?.customerId
    ? { id: account.customerId, name: account.customerName, phone: account.customerPhone ?? null, address: null, balance: account.currentBalance, creditLimit: account.creditLimit } : null);
  const [f, setF] = useState({
    businessName: account?.businessName ?? '', customerCnic: account?.customerCnic ?? '', businessAddress: account?.businessAddress ?? '',
    creditLimit: account?.creditLimit ?? 0, creditDays: account?.creditDays ?? 30,
    guarantorName: account?.guarantorName ?? '', guarantorPhone: account?.guarantorPhone ?? '', guarantorCnic: account?.guarantorCnic ?? '',
    chequeSecurity: account?.chequeSecurity ?? '', notes: account?.notes ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));

  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...f, customerId: customer!.id, customerName: customer!.name, customerPhone: customer!.phone ?? undefined,
        businessName: f.businessName.trim() || undefined, customerCnic: f.customerCnic.trim() || undefined,
      };
      return account ? creditAccountsApi.update(account.id, body) : creditAccountsApi.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hardware-contractors'] });
      qc.invalidateQueries({ queryKey: ['hardware-dashboard'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success(account ? t('Thekedar ki shartein save') : t('Thekedar ka khata ban gaya'));
      onClose();
    },
    onError: (e) => toast.error(errorText(e, t('Save nahi hua'))),
  });
  const submit = () => {
    const e: Record<string, string> = {};
    if (!customer) e.customer = t('Customer chunein ya naya banayein — udhaar usi ke khate me chalta hai');
    if (f.creditLimit < 0) e.creditLimit = t('Had manfi nahi ho sakti');
    if (!(f.creditDays >= 0)) e.creditDays = t('Din theek likhein');
    if (!cnicOk(f.customerCnic)) e.customerCnic = t('CNIC 13 hindse (12345-1234567-1)');
    if (!cnicOk(f.guarantorCnic)) e.guarantorCnic = t('CNIC 13 hindse');
    if (!phoneOk(f.guarantorPhone)) e.guarantorPhone = t('Phone theek likhein');
    if (customer && f.creditLimit > 0 && customer.balance > f.creditLimit) e.creditLimit = t('Abhi ka udhaar ({{balance}}) is had se zyada hai', { balance: customer.balance });
    setErrors(e);
    if (Object.keys(e).length) { toast.error(t('Laal nishan wali jagah theek karein')); return; }
    save.mutate();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={account ? t('{{customerName}} — shartein', { customerName: account.customerName }) : t('Naya thekedar khata')}
      description={t('Udhaar, receiving aur statement customer ke khate me — yahan sirf had, din aur zamanat')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Wapas')}</Button><Button loading={save.isPending} onClick={submit}>{t('Save')}</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }} className="space-y-3">
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{t('Thekedar (customer)')}{' '} <span className="text-rose-600">*</span></span>
          <CustomerPick value={customer} onChange={setCustomer} error={errors.customer} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('Karobar ka naam')} value={f.businessName} onChange={(e) => set({ businessName: e.target.value })} placeholder={t('Ali Construction')} />
          <Input label={t('CNIC')} value={f.customerCnic} onChange={(e) => set({ customerCnic: e.target.value })} error={errors.customerCnic} placeholder="35202-1234567-1" />
          <Input label={t('Udhaar ki had (Rs)')} inputMode="decimal" value={f.creditLimit || ''} onChange={(e) => set({ creditLimit: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} error={errors.creditLimit} hint={t('0 = koi had nahi. POS isi had par rokta hai')} />
          <div>
            <Input label={t('Kitne din me wapsi')} inputMode="numeric" value={f.creditDays || ''} onChange={(e) => set({ creditDays: Math.round(Number(e.target.value) || 0) })} error={errors.creditDays} />
            <div className="mt-1.5 flex flex-wrap gap-1">{DAYS.map((d) => <button key={d} type="button" onClick={() => set({ creditDays: d })} className={`h-7 rounded-md px-2 text-[0.75rem] font-semibold ring-1 ${f.creditDays === d ? 'bg-slate-900 text-white ring-slate-900' : 'ring-slate-200 hover:bg-slate-50'}`}>{t('{{d}} din', { d })}</button>)}</div>
          </div>
        </div>
        <Input label={t('Daftar / site ka pata')} value={f.businessAddress} onChange={(e) => set({ businessAddress: e.target.value })} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={t('Zamin (guarantor)')} value={f.guarantorName} onChange={(e) => set({ guarantorName: e.target.value })} />
          <Input label={t('Zamin ka phone')} inputMode="tel" value={f.guarantorPhone} onChange={(e) => set({ guarantorPhone: e.target.value })} error={errors.guarantorPhone} />
          <Input label={t('Zamin ka CNIC')} value={f.guarantorCnic} onChange={(e) => set({ guarantorCnic: e.target.value })} error={errors.guarantorCnic} />
        </div>
        <Input label={t('Security cheque')} value={f.chequeSecurity} onChange={(e) => set({ chequeSecurity: e.target.value })} placeholder={t('HBL cheque # 123456, Rs 5 lakh')} />
        <Textarea label={t('Note')} rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
      </form>
    </Modal>
  );
}
