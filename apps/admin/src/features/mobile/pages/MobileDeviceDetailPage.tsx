/** One device: who uses it, what it runs, the days it was used, and controls to stop pushes or forget it. */

import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, Button, Card, PageHero, PageShell, Skeleton, confirmDialog } from '@/design-system/components';
import { adminMobileApi } from '@/api/admin-mobile.api';
import { DetailList } from '@/ui';
import { formatDate, formatRelative } from '@/lib/format';
import { num, Pill } from '@/features/shared/kit';
import { industryLabel, LANGUAGE_LABEL, PLATFORM_LABEL } from '../components/MobileUi';

/** Last 60 business days as a strip of squares; filled where the app was used. */
function ActivityStrip({ days }: { days: string[] }) {
  const used = new Set(days);
  const cells: string[] = [];
  for (let i = 59; i >= 0; i--) cells.push(new Date(Date.now() - i * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }));
  return (
    <div>
      <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1">
        {cells.map((c) => <div key={c} title={`${c}${used.has(c) ? ' · used' : ''}`} className={`aspect-square rounded-[4px] ${used.has(c) ? 'bg-brand-600' : 'bg-slate-100'}`} />)}
      </div>
      <div className="mt-2 text-[0.75rem] text-slate-500">{days.length} of the last 60 days</div>
    </div>
  );
}

export default function MobileDeviceDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: d, isLoading, error } = useQuery({ queryKey: ['admin-mobile-device', id], queryFn: () => adminMobileApi.device(id) });

  const clearPush = useMutation({
    mutationFn: () => adminMobileApi.clearPush(id),
    onSuccess: () => { toast.success('Push turned off for this device'); qc.invalidateQueries({ queryKey: ['admin-mobile-device', id] }); },
    onError: () => toast.error('Could not update the device'),
  });
  const remove = useMutation({
    mutationFn: () => adminMobileApi.removeDevice(id),
    onSuccess: () => { toast.success('Device removed'); qc.invalidateQueries({ queryKey: ['admin-mobile-devices'] }); navigate('/mobile/devices'); },
    onError: () => toast.error('Could not remove the device'),
  });

  if (isLoading) return <PageShell><PageHero title="Device" back="/mobile/devices" loading /><Skeleton className="h-64 rounded-3xl" /></PageShell>;
  if (error || !d) return <PageShell><PageHero title="Device" back="/mobile/devices" /><Alert tone="danger">Device not found.</Alert></PageShell>;

  const os = `${PLATFORM_LABEL[d.platform] ?? d.platform} ${d.osVersion ?? ''}`.trim();
  return (
    <PageShell>
      <PageHero
        back="/mobile/devices"
        title={d.deviceModel ?? 'Unknown device'}
        subtitle={`${os} · app ${d.appVersion} · ${d.tenant.name}`}
        chip={d.hasPush ? 'Push on' : 'Push off'}
        busy={clearPush.isPending || remove.isPending}
        actions={
          <>
            <Button variant="secondary" leftIcon={<BellOff className="h-4 w-4" />} onClick={() => clearPush.mutate()} loading={clearPush.isPending} disabled={!d.hasPush}>Stop push</Button>
            <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />} loading={remove.isPending}
              onClick={async () => { if (await confirmDialog({ title: 'Remove this device?', text: 'The record comes back the next time the app opens.', yes: 'Remove', danger: true })) remove.mutate(); }}>Remove</Button>
          </>
        }
        stats={[
          { label: 'App opens', value: num(d.sessions) },
          { label: 'Days used (of 60)', value: num(d.activeDays.length) },
          { label: 'First seen', value: formatDate(d.firstSeenAt) },
          { label: 'Last seen', value: formatRelative(d.lastSeenAt) },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="App and device">
            <DetailList cols={2} items={[
              { label: 'Version', value: `${d.appVersion}${d.buildNumber ? ` (build ${d.buildNumber})` : ''}` },
              { label: 'Update runtime', value: d.runtimeVersion },
              { label: 'Running update', value: d.updateId ? d.updateId.slice(0, 13) : 'Store build' },
              { label: 'Language', value: LANGUAGE_LABEL[d.language ?? 'unknown'] ?? d.language },
              { label: 'Push', value: d.hasPush ? <Pill tone="emerald">On</Pill> : <Pill>Off</Pill> },
              { label: 'Push token', value: d.pushTokenPreview ? <code className="text-[0.75rem]">{d.pushTokenPreview}</code> : null, hidden: !d.pushTokenPreview },
              { label: 'Model', value: d.deviceModel },
              { label: 'Brand', value: d.deviceBrand },
              { label: 'System', value: os },
              { label: 'Country', value: d.country },
              { label: 'Install id', value: <code className="text-[0.75rem]">{d.installId}</code> },
            ]} />
          </Card>
          <Card title="Days used" description="The last 60 business days"><ActivityStrip days={d.activeDays} /></Card>
        </div>
        <div className="space-y-4">
          <Card title="Shop and person">
            <DetailList items={[
              { label: 'Shop', value: <Link to={`/tenants/${d.tenant.id}`} className="text-brand-700 hover:underline">{d.tenant.name}</Link> },
              { label: 'Industry', value: industryLabel(d.tenant.businessType) },
              { label: 'Shop status', value: d.tenant.status ? industryLabel(d.tenant.status) : null },
              { label: 'Person', value: d.user.fullName },
              { label: 'Role', value: d.user.role.toLowerCase() },
              { label: 'Email', value: d.user.email },
              { label: 'Last login', value: d.user.lastLoginAt ? formatRelative(d.user.lastLoginAt) : null },
            ]} />
          </Card>
          <Card title="Same person's other devices">
            {d.otherDevices.length === 0 ? <div className="py-4 text-center text-[0.875rem] text-slate-500">No other device.</div> : (
              <div className="divide-y divide-slate-100">
                {d.otherDevices.map((o) => (
                  <Link key={o.id} to={`/mobile/devices/${o.id}`} className="flex items-center justify-between gap-2 py-2 text-[0.875rem] hover:text-brand-700">
                    <span>{o.deviceModel ?? 'Unknown'} · {PLATFORM_LABEL[o.platform] ?? o.platform}</span>
                    <span className="text-slate-500">v{o.appVersion} · {formatRelative(o.lastSeenAt)}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
