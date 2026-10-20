/**
 * Qist plan for an appliance shop: the shared plan page (schedule, payments)
 * with the guarantor (zamin) under it — view, change, and print the qist
 * agreement with both signatures.
 *
 * Keys: Z edit guarantor · I print agreement (plus the plan page's own keys).
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileSignature, Pencil, ShieldCheck, UserRound } from 'lucide-react';
import { Button, Input, Kbd, Modal, PageShell, Skeleton } from '@/design-system/components';
import { apiClient } from '@core/api/client';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import EmiPlanDetailPage from '@industries/mobile/pages/EmiPlanDetailPage';
import { qistApi, type QistGuarantor } from '../api/qist.api';
import { printQistAgreement, type QistPlanLike } from '../receipt/appliancePrints';
import { Box, Panel } from '../components/ui';
import { apiError, cnicOk, phoneOk } from '../components/meta';

const PLAN_KEY = 'appliance-qist-plan';

type Plan = QistPlanLike & { id: string; status: string; customer?: QistPlanLike['customer'] & { phone?: string | null } };

export default function QistPlanPage() {
  const { id = '' } = useParams();
  const canManage = usePermission(PERMISSIONS.KHATA_MANAGE);
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const q = useQuery({
    queryKey: [PLAN_KEY, id],
    queryFn: () => apiClient.get(`/emi-plans/${id}`).then((r) => (r.data?.data ?? r.data) as Plan),
    enabled: !!id,
  });
  const p = q.data;
  const [editing, setEditing] = useState(false);
  const canEdit = canManage && !!p && p.status !== 'CANCELLED';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen() || !p) return;
      if ((e.key === 'z' || e.key === 'Z') && canEdit) { e.preventDefault(); setEditing(true); }
      if (e.key === 'i' || e.key === 'I') { e.preventDefault(); printQistAgreement(p, shopName); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [p, canEdit, shopName]);

  return (
    <>
      <EmiPlanDetailPage />
      {id && (
        <PageShell>
          {q.isLoading ? <Skeleton className="h-28 rounded-3xl" /> : p && (
            <Panel
              title={<span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-brand-600" />Zamin (guarantor)</span>}
              hint={<>Qist na milne par zimmedar · <Kbd>I</Kbd> iqrarnama{canEdit && <> · <Kbd>Z</Kbd> badlein</>}</>}
              actions={<>
                <Button size="sm" variant="secondary" leftIcon={<FileSignature className="h-4 w-4" />} onClick={() => printQistAgreement(p, shopName)}>Iqrarnama print</Button>
                {canEdit && <Button size="sm" variant="secondary" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>{p.guarantorName ? 'Badlein' : 'Zamin likhein'}</Button>}
              </>}>
              {p.guarantorName ? (
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Box label="Naam" value={p.guarantorName} />
                  <Box label="Phone" value={p.guarantorPhone || '—'} />
                  <Box label="CNIC" value={p.guarantorCnic || '—'} />
                  <Box label="Pata" value={p.guarantorAddress || '—'} />
                </dl>
              ) : (
                <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
                  <UserRound className="h-4 w-4 shrink-0" />Is plan par abhi koi zamin nahi. Qist par saman dene se pehle zamin ka naam aur CNIC zaroor likhein.
                </p>
              )}
            </Panel>
          )}
        </PageShell>
      )}
      {editing && p && <GuarantorModal plan={p} onClose={() => setEditing(false)} />}
    </>
  );
}

function GuarantorModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: plan.guarantorName ?? '', phone: plan.guarantorPhone ?? '', cnic: plan.guarantorCnic ?? '', address: plan.guarantorAddress ?? '' });
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const customerPhone = (plan.customerPhone ?? plan.customer?.phone ?? '').replace(/\D/g, '').slice(-10);
  const errors = {
    name: f.name.trim().length < 2 ? 'Zamin ka naam likhein' : undefined,
    phone: f.phone.trim() && !phoneOk(f.phone) ? 'Phone 03XX-XXXXXXX likhein'
      : f.phone.trim() && customerPhone && f.phone.replace(/\D/g, '').slice(-10) === customerPhone ? 'Zamin customer khud nahi ho sakta' : undefined,
    cnic: !f.cnic.trim() || !cnicOk(f.cnic) ? 'CNIC 13 hindse (35202-1234567-1)' : undefined,
  };
  const ok = !errors.name && !errors.phone && !errors.cnic;
  const save = useMutation({
    mutationFn: () => qistApi.setGuarantor(plan.id, {
      guarantorName: f.name.trim(), guarantorPhone: f.phone.replace(/[\s-]/g, '') || undefined, guarantorCnic: f.cnic.trim(), guarantorAddress: f.address.trim() || undefined,
    } satisfies QistGuarantor),
    onSuccess: () => {
      toast.success('Zamin save ho gaya');
      qc.invalidateQueries({ queryKey: [PLAN_KEY] });
      qc.invalidateQueries({ queryKey: ['emi-plans'] });
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Zamin save nahi hua')),
  });
  const submit = () => { setTried(true); if (ok) save.mutate(); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <Modal open onClose={onClose} size="md" title={`Zamin — ${plan.planNumber}`} description="Jo customer ki qist ki zimmedari leta hai; iqrarnama par sign karta hai"
      footer={<>
        <span className="mr-auto hidden text-[0.75rem] text-slate-500 sm:inline"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</span>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={save.isPending} onClick={submit}>Save</Button>
      </>}>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label="Naam" required value={f.name} onChange={(e) => set({ name: e.target.value })} error={tried ? errors.name : undefined} data-autofocus />
        <Input label="Phone" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="0300-1234567" hint="Qist late ho to isi par rabta" error={tried ? errors.phone : undefined} />
        <Input label="CNIC" required value={f.cnic} onChange={(e) => set({ cnic: e.target.value })} placeholder="35202-1234567-1" error={tried ? errors.cnic : undefined} />
        <Input label="Pata" value={f.address} onChange={(e) => set({ address: e.target.value })} placeholder="Ghar ya dukaan ka pata" />
      </form>
    </Modal>
  );
}
