import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Layers, Pause, Play, Megaphone, AlertCircle, Search } from 'lucide-react';
import { adminTenantsApi } from '@/api/admin-tenants.api';
import { adminBulkApi } from '@/api/admin-bulk.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

export default function BulkActionsPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionType, setActionType] = useState<'STATUS' | 'BROADCAST'>('STATUS');
  const [statusValue, setStatusValue] = useState('SUSPENDED');
  const [reason, setReason] = useState('');
  const [bcTitle, setBcTitle] = useState('');
  const [bcMessage, setBcMessage] = useState('');

  const { data } = useQuery({
    queryKey: ['admin-bulk-tenants', search],
    queryFn: () => adminTenantsApi.list({ search: search || undefined, limit: 100 }),
  });

  const statusMutation = useMutation({
    mutationFn: () => adminBulkApi.updateStatus(Array.from(selected), statusValue, reason || undefined),
    onSuccess: (data) => {
      toast.success(`${data.updatedCount} tenants updated`);
      setSelected(new Set());
      setReason('');
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: () => adminBulkApi.broadcast(Array.from(selected), bcTitle, bcMessage),
    onSuccess: (data) => {
      toast.success(`Broadcast sent to ${data.sentCount} tenants`);
      setSelected(new Set());
      setBcTitle('');
      setBcMessage('');
    },
  });

  const toggleAll = () => {
    if (data && selected.size === data.items.length) setSelected(new Set());
    else setSelected(new Set(data?.items.map((t) => t.id) ?? []));
  };

  const toggleOne = (id: string) => {
    const newSet = new Set(selected);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelected(newSet);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-orange-900 to-orange-700 text-white p-6 shadow-soft">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
          <Layers className="h-3.5 w-3.5" /> Bulk Operations
        </div>
        <h2 className="mt-3 text-3xl font-bold">Bulk Actions</h2>
        <p className="mt-2 text-sm text-white/80">Multi-tenant operations: suspend, activate, broadcast</p>
      </section>

      <section className="grid xl:grid-cols-[1fr_400px] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <h3 className="font-bold">Select Tenants</h3>
              <span className="text-xs text-slate-500">
                {selected.size} of {data?.items.length ?? 0} selected
              </span>
            </div>
            <button onClick={toggleAll} className="text-sm text-admin-600 font-medium hover:underline">
              {data && selected.size === data.items.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="px-6 py-3 border-b border-slate-100">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm"
                placeholder="Search tenants..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {(data?.items ?? []).map((t) => (
              <label key={t.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleOne(t.id)}
                  className="h-5 w-5 rounded border-slate-300" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{t.slug}</div>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  t.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                  t.status === 'TRIAL' ? 'bg-blue-100 text-blue-700' :
                  t.status === 'SUSPENDED' ? 'bg-rose-100 text-rose-700' :
                  'bg-slate-100 text-slate-700'
                }`}>{t.status}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 space-y-4 h-fit">
          <h3 className="font-bold text-xl">Action</h3>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setActionType('STATUS')}
              className={`p-3 rounded-xl border-2 transition flex items-center gap-2 ${
                actionType === 'STATUS' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'
              }`}>
              <Pause className="h-4 w-4" /> Status
            </button>
            <button onClick={() => setActionType('BROADCAST')}
              className={`p-3 rounded-xl border-2 transition flex items-center gap-2 ${
                actionType === 'BROADCAST' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'
              }`}>
              <Megaphone className="h-4 w-4" /> Broadcast
            </button>
          </div>

          {actionType === 'STATUS' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">New Status</label>
                <select value={statusValue} onChange={(e) => setStatusValue(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm">
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="EXPIRED">EXPIRED</option>
                </select>
              </div>
              <Input label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />

              <Button onClick={() => {
                if (selected.size === 0) return toast.error('Select tenants');
                statusMutation.mutate();
              }} loading={statusMutation.isPending} className="w-full" size="lg">
                {statusValue === 'ACTIVE' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                Apply to {selected.size} Tenants
              </Button>
            </>
          )}

          {actionType === 'BROADCAST' && (
            <>
              <Input label="Title" value={bcTitle} onChange={(e) => setBcTitle(e.target.value)} />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                <textarea value={bcMessage} onChange={(e) => setBcMessage(e.target.value)} rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>

              <Button onClick={() => {
                if (selected.size === 0) return toast.error('Select tenants');
                if (!bcTitle || !bcMessage) return toast.error('Title and message required');
                broadcastMutation.mutate();
              }} loading={broadcastMutation.isPending} className="w-full" size="lg">
                <Megaphone className="h-4 w-4" /> Send to {selected.size} Tenants
              </Button>
            </>
          )}

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-xs text-amber-900">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>Bulk actions affect multiple tenants at once. Review carefully.</div>
          </div>
        </div>
      </section>
    </div>
  );
}
