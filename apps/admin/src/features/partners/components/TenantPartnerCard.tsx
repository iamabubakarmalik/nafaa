/**
 * Shop page card: the partner who brought the shop (name, code, how it was
 * linked and when), with Change and Remove for admins who manage shops.
 * Changing the partner moves the shop's lead to the new partner; removing
 * marks the old lead lost. Commission already earned is not moved.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Handshake, Pencil, Trash2 } from 'lucide-react';
import { Alert, Button, Card, Modal, Skeleton, confirmDialog } from '@/design-system/components';
import { adminPartnersApi } from '@/api/admin-partners.api';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { DetailList, StatusBadge } from '@/ui';
import { SOURCE_LABEL, STAGE_LABEL, STAGE_TONE, TYPE_LABEL } from '../lib/partner-text';
import { PartnerPicker, type PickedPartner } from './PartnerPicker';

export function TenantPartnerCard({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const can = useCan();
  const qc = useQueryClient();
  const [changing, setChanging] = useState(false);
  const [picked, setPicked] = useState<PickedPartner | null>(null);
  const info = useQuery({ queryKey: ['admin', 'tenant', tenantId, 'partner'], queryFn: () => adminPartnersApi.tenantPartner(tenantId) });
  const set = useMutation({
    mutationFn: (partnerId: string | null) => adminPartnersApi.setTenantPartner(tenantId, partnerId),
    onSuccess: (r) => {
      toast.success(r.partner ? `${tenantName} now belongs to ${r.partner.fullName}` : 'Partner removed from this shop');
      setChanging(false);
      qc.invalidateQueries({ queryKey: ['admin', 'tenant', tenantId, 'partner'] });
      qc.invalidateQueries({ queryKey: ['admin', 'partners'] });
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const canChange = can('tenants.manage') && can('partners.view');
  const p = info.data?.partner;

  return (
    <Card title="Partner" description="The partner who brought this shop to Nafaa."
      actions={canChange && info.data ? (
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => { setPicked(null); setChanging(true); }}>{p ? 'Change' : 'Set partner'}</Button>
          {p && (
            <Button size="sm" variant="ghost" className="text-rose-700" leftIcon={<Trash2 className="h-3.5 w-3.5" />} loading={set.isPending && set.variables === null}
              onClick={async () => { if (await confirmDialog({ title: `Remove ${p.fullName} from ${tenantName}?`, text: 'The shop stops counting for this partner and their lead is marked lost. Earnings already made stay as they are.', yes: 'Remove', danger: true })) set.mutate(null); }}>Remove</Button>
          )}
        </div>
      ) : undefined}>
      {info.isLoading ? <Skeleton className="h-16 rounded-2xl" /> : !p ? (
        <p className="flex items-center gap-2 text-[0.8125rem] text-slate-500"><Handshake className="h-4 w-4" /> No partner. The shop signed up on its own.</p>
      ) : (
        <DetailList cols={3} items={[
          { label: 'Partner', value: can('partners.view') ? <Link to={`/partners/${p.id}`} className="font-medium text-brand-700 hover:underline">{p.fullName}</Link> : p.fullName },
          { label: 'Code', value: <code>{p.code}</code> },
          { label: 'Type', value: `${TYPE_LABEL[p.type]}${p.city ? ` · ${p.city}` : ''}` },
          { label: 'Linked by', value: info.data?.source ? SOURCE_LABEL[info.data.source] ?? info.data.source : null },
          { label: 'Linked on', value: info.data?.attributedAt ? formatDateTime(info.data.attributedAt) : null },
          { label: 'Stage', value: info.data?.stage ? <StatusBadge value={info.data.stage} label={STAGE_LABEL[info.data.stage]} variant={STAGE_TONE[info.data.stage]} /> : null },
        ]} />
      )}

      <Modal open={changing} onClose={() => setChanging(false)} title={p ? 'Change partner' : 'Set partner'} description={`Pick the active partner who brought ${tenantName}.`}
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setChanging(false)}>Cancel</Button><Button loading={set.isPending} disabled={!picked || picked.id === p?.id} onClick={() => picked && set.mutate(picked.id)}>Save</Button></div>}>
        <div className="space-y-3">
          <PartnerPicker label="Partner" value={picked} onChange={setPicked} />
          {p && <Alert tone="warning">{p.fullName}’s lead for this shop is marked lost. Earnings already made are not moved; adjust them by hand if needed.</Alert>}
        </div>
      </Modal>
    </Card>
  );
}
