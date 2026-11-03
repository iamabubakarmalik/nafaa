/** One device: who uses it, what it runs, the days it was used, and controls to stop pushes or forget it. */

import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BellOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminMobileApi } from '@/api/admin-mobile.api';
import { Button } from '@/components/ui/Button';
import { formatDate, formatRelative } from '@/lib/format';
import { Card, industryLabel, LANGUAGE_LABEL, MobileHero, Pill, PLATFORM_LABEL } from '../components/MobileUi';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900 break-all">{children ?? '—'}</span>
    </div>
  );
}

/** Last 60 business days as a strip of squares; filled where the app was used. */
function ActivityStrip({ days }: { days: string[] }) {
  const used = new Set(days);
  const cells: string[] = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    cells.push(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }));
  }
  return (
    <div>
      <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1">
        {cells.map((c) => (
          <div key={c} title={`${c}${used.has(c) ? ' · used' : ''}`} className={`aspect-square rounded-[4px] ${used.has(c) ? 'bg-teal-600' : 'bg-slate-100'}`} />
        ))}
      </div>
      <div className="mt-2 text-xs text-slate-500">{days.length} of the last 60 days</div>
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

  if (isLoading) return <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />;
  if (error || !d) return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">Device not found.</div>;

  return (
    <div className="space-y-6">
      <Link to="/mobile/devices" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />All devices</Link>
      <MobileHero title={d.deviceModel ?? 'Unknown device'} subtitle={`${PLATFORM_LABEL[d.platform] ?? d.platform} ${d.osVersion ?? ''} · app ${d.appVersion} · ${d.tenant.name}`}>
        <Button variant="secondary" onClick={() => clearPush.mutate()} loading={clearPush.isPending} disabled={!d.hasPush}><BellOff className="h-4 w-4" />Stop push</Button>
        <Button variant="danger" onClick={() => { if (confirm('Remove this device record? It comes back the next time the app opens.')) remove.mutate(); }} loading={remove.isPending}>
          <Trash2 className="h-4 w-4" />Remove
        </Button>
      </MobileHero>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="App">
          <div className="divide-y divide-slate-100">
            <Row label="Version">{d.appVersion}{d.buildNumber ? ` (build ${d.buildNumber})` : ''}</Row>
            <Row label="Update runtime">{d.runtimeVersion}</Row>
            <Row label="Running update">{d.updateId ? d.updateId.slice(0, 13) : 'Store build'}</Row>
            <Row label="Language">{LANGUAGE_LABEL[d.language ?? 'unknown'] ?? d.language}</Row>
            <Row label="Push">{d.hasPush ? <Pill tone="teal">On</Pill> : <Pill>Off</Pill>}</Row>
            {d.pushTokenPreview && <Row label="Push token"><code className="text-xs">{d.pushTokenPreview}</code></Row>}
          </div>
        </Card>
        <Card title="Device">
          <div className="divide-y divide-slate-100">
            <Row label="Model">{d.deviceModel}</Row>
            <Row label="Brand">{d.deviceBrand}</Row>
            <Row label="System">{`${PLATFORM_LABEL[d.platform] ?? d.platform} ${d.osVersion ?? ''}`}</Row>
            <Row label="Country">{d.country}</Row>
            <Row label="Install id"><code className="text-xs">{d.installId}</code></Row>
          </div>
        </Card>
        <Card title="Use">
          <div className="divide-y divide-slate-100">
            <Row label="First seen">{formatDate(d.firstSeenAt)}</Row>
            <Row label="Last seen">{formatRelative(d.lastSeenAt)}</Row>
            <Row label="App opens">{d.sessions.toLocaleString()}</Row>
          </div>
          <div className="mt-4"><ActivityStrip days={d.activeDays} /></div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Business and person">
          <div className="divide-y divide-slate-100">
            <Row label="Business"><Link to={`/tenants/${d.tenant.id}`} className="text-teal-700 hover:underline">{d.tenant.name}</Link></Row>
            <Row label="Industry">{industryLabel(d.tenant.businessType)}</Row>
            <Row label="Account status">{d.tenant.status ? industryLabel(d.tenant.status) : null}</Row>
            <Row label="Person">{d.user.fullName}</Row>
            <Row label="Role">{d.user.role.toLowerCase()}</Row>
            <Row label="Email">{d.user.email}</Row>
            <Row label="Last login">{d.user.lastLoginAt ? formatRelative(d.user.lastLoginAt) : null}</Row>
          </div>
        </Card>
        <Card title="Same person's other devices">
          {d.otherDevices.length === 0 ? <div className="py-6 text-center text-sm text-slate-500">No other device.</div> : (
            <div className="divide-y divide-slate-100">
              {d.otherDevices.map((o) => (
                <Link key={o.id} to={`/mobile/devices/${o.id}`} className="flex items-center justify-between py-2 text-sm hover:text-teal-700">
                  <span>{o.deviceModel ?? 'Unknown'} · {PLATFORM_LABEL[o.platform] ?? o.platform}</span>
                  <span className="text-slate-500">v{o.appVersion} · {formatRelative(o.lastSeenAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
