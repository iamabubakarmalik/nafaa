import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserX, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminDeletionRequestsApi, type DeletionRequest, type DeletionStatus } from '@/api/admin-deletion-requests.api';
import { Button } from '@/components/ui/Button';

const fmt = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));
const daysUntil = (v: string) => Math.ceil((new Date(v).getTime() - Date.now()) / 86_400_000);

const FILTERS = [
  { key: 'pending', label: 'Open' },
  { key: 'due', label: 'Due now' },
  { key: 'in_grace', label: 'In grace' },
  { key: 'processed', label: 'Processed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
];

function StatusBadge({ r }: { r: DeletionRequest }) {
  const map: Record<DeletionStatus, { text: string; cls: string }> = {
    DUE: { text: `Due${daysUntil(r.dueAt) < 0 ? ` · ${-daysUntil(r.dueAt)}d late` : ' today'}`, cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    IN_GRACE: { text: `In grace · ${daysUntil(r.dueAt)}d left`, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    PROCESSED: { text: 'Processed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    CANCELLED: { text: 'Cancelled', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  };
  const m = map[r.status];
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}>{m.text}</span>;
}

export default function DeletionRequestsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('pending');
  const [kind, setKind] = useState('');
  const [open, setOpen] = useState<DeletionRequest | null>(null);
  const [typed, setTyped] = useState('');

  const { data } = useQuery({
    queryKey: ['admin-deletion-requests', status, kind],
    queryFn: () => adminDeletionRequestsApi.list({ status, kind: kind || undefined }),
  });

  const mutation = useMutation({
    mutationFn: (r: DeletionRequest) => adminDeletionRequestsApi.process(r.id),
    onSuccess: (res) => {
      toast.success(res.alreadyProcessed ? 'Already processed' : 'Request processed');
      setOpen(null); setTyped('');
      qc.invalidateQueries({ queryKey: ['admin-deletion-requests'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not process'),
  });

  const items = data?.items ?? [];
  const counts = data?.counts;
  const confirmWord = open ? (open.kind === 'USER' ? 'DELETE USER' : 'DELETE SHOP') : '';
  const canProcess = open?.status === 'DUE' && typed === confirmWord;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-blue-900 to-blue-700 text-white p-6 shadow-soft">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
          <UserX className="h-3.5 w-3.5" /> Account deletion
        </div>
        <h2 className="mt-3 text-3xl font-bold">Deletion requests</h2>
        <p className="mt-2 text-sm text-white/80">Users and shops that asked to be deleted. Nothing runs by itself: you process each one by hand after its grace period.</p>
      </section>

      <section className="grid sm:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5"><div className="text-sm text-rose-700">Due now</div><div className="mt-2 text-2xl font-bold text-rose-900">{counts?.due ?? 0}</div></div>
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5"><div className="text-sm text-amber-700">In grace</div><div className="mt-2 text-2xl font-bold text-amber-900">{counts?.inGrace ?? 0}</div></div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm"><div className="text-sm text-slate-500">Processed</div><div className="mt-2 text-2xl font-bold">{counts?.processed ?? 0}</div></div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm"><div className="text-sm text-slate-500">Cancelled</div><div className="mt-2 text-2xl font-bold">{counts?.cancelled ?? 0}</div></div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setStatus(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border ${status === f.key ? 'bg-admin-600 text-white border-admin-600' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{f.label}</button>
        ))}
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="ml-auto h-9 rounded-xl border border-slate-200 px-3 text-sm">
          <option value="">Users and shops</option>
          <option value="user">Users only</option>
          <option value="tenant">Shops only</option>
        </select>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-6 py-4 font-medium">Who</th>
                <th className="text-left px-6 py-4 font-medium">Type</th>
                <th className="text-left px-6 py-4 font-medium">Requested</th>
                <th className="text-left px-6 py-4 font-medium">Due date</th>
                <th className="text-left px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setOpen(r); setTyped(''); }}>
                  <td className="px-6 py-3"><div className="font-semibold">{r.name}</div><div className="text-xs text-slate-500">{r.kind === 'USER' ? `${r.email} · ${r.tenantName}` : `${r.userCount ?? 0} users`}</div></td>
                  <td className="px-6 py-3">{r.kind === 'USER' ? 'User' : 'Shop'}</td>
                  <td className="px-6 py-3">{fmt(r.requestedAt)}</td>
                  <td className="px-6 py-3">{fmt(r.dueAt)}</td>
                  <td className="px-6 py-3"><StatusBadge r={r} /></td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No requests here.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setOpen(null)}>
          <aside className="w-full max-w-md bg-white h-full overflow-y-auto p-6 space-y-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">{open.kind === 'USER' ? 'User request' : 'Shop request'}</div>
                <h3 className="text-xl font-bold">{open.name}</h3>
                {open.email && <div className="text-sm text-slate-500">{open.email}</div>}
              </div>
              <button onClick={() => setOpen(null)} className="p-2 rounded-lg hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <StatusBadge r={open} />
            <dl className="text-sm grid grid-cols-2 gap-y-2">
              <dt className="text-slate-500">Requested</dt><dd>{fmt(open.requestedAt)}</dd>
              <dt className="text-slate-500">Grace ends</dt><dd>{fmt(open.dueAt)}</dd>
              <dt className="text-slate-500">Shop</dt><dd>{open.tenantName}</dd>
              {open.reason && (<><dt className="text-slate-500">Reason</dt><dd>{open.reason}</dd></>)}
              {open.processedAt && (<><dt className="text-slate-500">Processed</dt><dd>{fmt(open.processedAt)}</dd></>)}
              {open.purgeAfter && (<><dt className="text-slate-500">Purge after</dt><dd>{fmt(open.purgeAfter)}</dd></>)}
            </dl>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-2">
              <div className="font-semibold flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-rose-600" /> What will happen</div>
              {open.kind === 'USER' ? (
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  <li>Login is disabled; all sessions, refresh tokens and push tokens are removed.</li>
                  <li>Name becomes "Deleted user", email becomes deleted+id@nafaa.invalid, phone and photo are cleared.</li>
                  <li>Sales and other business records stay, linked to the anonymized user.</li>
                </ul>
              ) : (
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  <li>The shop is closed (suspended) and all {open.userCount ?? 0} of its users are deactivated and anonymized.</li>
                  <li>Business data is NOT deleted. It is marked for purge after 90 days.</li>
                  <li>The purge itself is a separate decision by the owner.</li>
                </ul>
              )}
              <div className="text-slate-500">Every step is written to the activity log. Processing again does nothing.</div>
            </div>

            {open.status === 'DUE' && (
              <div className="space-y-3">
                <label className="text-sm font-medium">Type <span className="font-mono font-bold">{confirmWord}</span> to confirm</label>
                <input value={typed} onChange={(e) => setTyped(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                <Button variant="danger" className="w-full" disabled={!canProcess} loading={mutation.isPending} onClick={() => mutation.mutate(open)}>Process deletion</Button>
              </div>
            )}
            {open.status === 'IN_GRACE' && <div className="text-sm text-amber-700">The grace period is not over. This can be processed from {fmt(open.dueAt)}.</div>}
            {open.status === 'PROCESSED' && <div className="text-sm text-emerald-700 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Already processed.</div>}
          </aside>
        </div>
      )}
    </div>
  );
}
