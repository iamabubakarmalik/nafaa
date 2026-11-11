/**
 * Add a partner (usually a Nafaa employee) or edit one. Adding makes the
 * account active at once and returns a temporary password, shown once.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Alert, Button, Input, Modal, Select, Switch, Textarea } from '@/design-system/components';
import { adminPartnersApi, type PartnerDetail, type PartnerInput, type PartnerType } from '@/api/admin-partners.api';
import { apiError } from '@/lib/errors';
import { PARTNER_TYPES, PAYOUT_METHOD_LABEL, TYPE_LABEL } from '../lib/partner-text';
import { PartnerPicker, type PickedPartner } from './PartnerPicker';
import { TempPasswordModal } from './TempPasswordModal';

interface Form {
  fullName: string; phone: string; email: string; cnic: string; type: PartnerType; city: string; territory: string;
  isManager: boolean; manager: PickedPartner | null; planId: string; salary: string; incentivesOn: boolean; notes: string;
  payoutMethod: string; payoutAccount: string; payoutTitle: string; bankName: string;
}

const blank: Form = {
  fullName: '', phone: '', email: '', cnic: '', type: 'EMPLOYEE', city: '', territory: '', isManager: false, manager: null, planId: '',
  salary: '', incentivesOn: false, notes: '', payoutMethod: '', payoutAccount: '', payoutTitle: '', bankName: '',
};

const fromPartner = (p: PartnerDetail): Form => ({
  fullName: p.fullName, phone: p.phone, email: p.email ?? '', cnic: p.cnic ?? '', type: p.type, city: p.city ?? '', territory: p.territory ?? '',
  isManager: p.isManager, manager: p.manager ? { id: p.manager.id, fullName: p.manager.fullName, code: p.manager.code } : null,
  planId: p.planId ?? '', salary: p.salary != null ? String(p.salary) : '', incentivesOn: p.incentivesOn, notes: p.notes ?? '',
  payoutMethod: p.payoutMethod ?? '', payoutAccount: p.payoutAccount ?? '', payoutTitle: p.payoutTitle ?? '', bankName: p.bankName ?? '',
});

export function PartnerFormModal({ open, onClose, partner, onCreated }: {
  open: boolean;
  onClose: () => void;
  /** Edit this partner; omit to add a new one. */
  partner?: PartnerDetail;
  onCreated?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(blank);
  const [created, setCreated] = useState<{ id: string; name: string; phone: string; password: string } | null>(null);
  const plans = useQuery({ queryKey: ['admin', 'partners', 'plans'], queryFn: adminPartnersApi.plans, enabled: open, staleTime: 60_000 });
  useEffect(() => { if (open) setForm(partner ? fromPartner(partner) : blank); }, [open, partner]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const body = (): PartnerInput => ({
    fullName: form.fullName.trim(), phone: form.phone.trim(), email: form.email.trim() || null, cnic: form.cnic.trim() || null,
    type: form.type, city: form.city.trim() || null, territory: form.territory.trim() || null, isManager: form.isManager,
    managerId: form.manager?.id ?? null, planId: form.planId || null,
    salary: form.type === 'EMPLOYEE' && form.salary.trim() ? Number(form.salary) : null,
    incentivesOn: form.incentivesOn, notes: form.notes.trim() || null,
    payoutMethod: form.payoutMethod || null, payoutAccount: form.payoutAccount.trim() || null, payoutTitle: form.payoutTitle.trim() || null,
    bankName: form.payoutMethod === 'BANK' ? form.bankName.trim() || null : null,
  });

  const save = useMutation({
    mutationFn: () => (partner ? adminPartnersApi.update(partner.id, body()).then(() => null) : adminPartnersApi.create(body())),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['admin', 'partners'] });
      qc.invalidateQueries({ queryKey: ['admin', 'partner'] });
      if (r) {
        setCreated({ id: r.partner.id, name: r.partner.fullName, phone: r.partner.phone, password: r.temporaryPassword });
        toast.success(`${r.partner.fullName} added (code ${r.partner.code})`);
      } else toast.success('Partner updated');
      onClose();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const planOptions = [
    { value: '', label: `Default plan${plans.data?.find((p) => p.isDefault) ? ` (${plans.data.find((p) => p.isDefault)!.name})` : ''}` },
    ...(plans.data ?? []).filter((p) => !p.isDefault && (p.active || p.id === form.planId)).map((p) => ({ value: p.id, label: p.name })),
  ];
  const valid = form.fullName.trim().length >= 3 && /^(\+?92|0)?3\d{9}$/.test(form.phone.replace(/[\s-]/g, '')) && (!form.salary || Number(form.salary) >= 0);

  return (
    <>
      <Modal open={open} onClose={onClose} size="lg" title={partner ? `Edit ${partner.fullName}` : 'Add partner'}
        description={partner ? 'Changes apply right away. The partner sees their own profile change in the portal.' : 'The account is active at once. You get a temporary password to give them.'}
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={save.isPending} disabled={!valid} onClick={() => save.mutate()}>{partner ? 'Save' : 'Add partner'}</Button></div>}>
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2">
            <Input label="Full name" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
            <Input label="Mobile number" required value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="03001234567" hint="They sign in with this number." inputMode="tel" />
            <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} hint="Optional. Can also be used to sign in." />
            <Input label="CNIC" value={form.cnic} onChange={(e) => set('cnic', e.target.value)} placeholder="13 digits" inputMode="numeric" />
            <Select label="Type" value={form.type} onChange={(e) => { const t = e.target.value as PartnerType; setForm((f) => ({ ...f, type: t, incentivesOn: partner ? f.incentivesOn : t !== 'EMPLOYEE' })); }}
              options={PARTNER_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))} />
            <Select label="Commission plan" value={form.planId} onChange={(e) => set('planId', e.target.value)} options={planOptions} hint="Leave on default unless this person has a special deal." />
            <Input label="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
            <Input label="Territory" value={form.territory} onChange={(e) => set('territory', e.target.value)} placeholder="e.g. Saddar, Anarkali" />
          </section>

          {form.type === 'EMPLOYEE' && (
            <section className="grid gap-3 sm:grid-cols-2">
              <Input label="Monthly salary (PKR)" type="number" min={0} value={form.salary} onChange={(e) => set('salary', e.target.value)} hint="For your records only. Salary is paid outside Nafaa." />
              <div className="self-end pb-1">
                <Switch label="Earns commission too" description="When off, this employee earns no partner commission." checked={form.incentivesOn} onChange={(e) => set('incentivesOn', e.target.checked)} />
              </div>
            </section>
          )}
          {form.type !== 'EMPLOYEE' && partner && !form.incentivesOn && (
            <Alert tone="warning">Commission is switched off for this partner.<Button variant="link" size="sm" className="ms-2" onClick={() => set('incentivesOn', true)}>Switch on</Button></Alert>
          )}

          <section className="space-y-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <Switch label="Area manager" description="Leads a team of agents and earns an override on their earnings." checked={form.isManager} onChange={(e) => set('isManager', e.target.checked)} />
            <PartnerPicker label="Reports to (area manager)" value={form.manager} onChange={(p) => set('manager', p)} managersOnly excludeId={partner?.id} hint="Optional." />
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <Select label="Payout method" value={form.payoutMethod} onChange={(e) => set('payoutMethod', e.target.value)} placeholder="Not set"
              options={Object.entries(PAYOUT_METHOD_LABEL).map(([value, label]) => ({ value, label }))} />
            <Input label={form.payoutMethod === 'BANK' ? 'IBAN or account number' : 'Wallet number'} value={form.payoutAccount} onChange={(e) => set('payoutAccount', e.target.value)} disabled={!form.payoutMethod} />
            <Input label="Account title" value={form.payoutTitle} onChange={(e) => set('payoutTitle', e.target.value)} disabled={!form.payoutMethod} />
            {form.payoutMethod === 'BANK' && <Input label="Bank name" value={form.bankName} onChange={(e) => set('bankName', e.target.value)} />}
          </section>

          <Textarea label="Notes (only admins see these)" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </Modal>
      <TempPasswordModal password={created?.password ?? null} name={created?.name ?? ''} login={created?.phone}
        onClose={() => { const id = created?.id; setCreated(null); if (id) onCreated?.(id); }} />
    </>
  );
}
