import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Receipt, Plus, CheckCircle2, XCircle, X } from 'lucide-react';
import { adminInvoicesApi } from '@/api/admin-invoices.api';
import { adminTenantsApi } from '@/api/admin-tenants.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
  DRAFT: 'bg-slate-100 text-slate-700',
  REFUNDED: 'bg-blue-100 text-blue-700',
};

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');

  const { data } = useQuery({
    queryKey: ['admin-invoices', statusFilter, page],
    queryFn: () => adminInvoicesApi.list({
      status: statusFilter || undefined, page, limit: 30,
    }),
  });

  const { data: tenantsData } = useQuery({
    queryKey: ['admin-tenants-for-invoice'],
    queryFn: () => adminTenantsApi.list({ limit: 100 }),
    enabled: showCreate,
  });

  const createMutation = useMutation({
    mutationFn: adminInvoicesApi.create,
    onSuccess: () => {
      toast.success('Invoice created');
      setShowCreate(false);
      setTenantId(''); setAmount(''); setDescription(''); setNotes(''); setDueDate('');
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Create failed'),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => adminInvoicesApi.markPaid(id),
    onSuccess: () => {
      toast.success('Marked as paid');
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
    },
  });

  const voidMutation = useMutation({
    mutationFn: adminInvoicesApi.voidInvoice,
    onSuccess: () => {
      toast.success('Invoice voided');
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-cyan-900 to-cyan-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Receipt className="h-3.5 w-3.5" /> Invoice Management
            </div>
            <h2 className="mt-3 text-3xl font-bold">Invoices</h2>
            <p className="mt-2 text-sm text-white/80">Create, mark paid, void invoices</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-white text-slate-900 hover:bg-slate-100">
            <Plus className="h-4 w-4" /> Create Invoice
          </Button>
        </div>
      </section>

      <div className="flex gap-2 flex-wrap">
        {['', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED'].map((s) => (
          <button key={s || 'ALL'} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${
              statusFilter === s ? 'bg-admin-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
            }`}>
            {s || 'ALL'}
          </button>
        ))}
      </div>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-6 py-4 font-medium">Invoice #</th>
                <th className="text-left px-6 py-4 font-medium">Tenant</th>
                <th className="text-left px-6 py-4 font-medium">Description</th>
                <th className="text-right px-6 py-4 font-medium">Amount Due</th>
                <th className="text-right px-6 py-4 font-medium">Total</th>
                <th className="text-left px-6 py-4 font-medium">Status</th>
                <th className="text-left px-6 py-4 font-medium">Due Date</th>
                <th className="text-right px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.items ?? []).map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="px-6 py-3 font-medium">{inv.tenant.name}</td>
                  <td className="px-6 py-3 text-xs text-slate-600">{inv.description}</td>
                  <td className="px-6 py-3 text-right font-bold text-amber-700">{formatPKR(inv.amountDue)}</td>
                  <td className="px-6 py-3 text-right">{formatPKR(inv.total)}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs text-slate-600">{formatDate(inv.dueDate)}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="inline-flex gap-1">
                      {inv.status === 'PENDING' && (
                        <>
                          <button onClick={() => markPaidMutation.mutate(inv.id)}
                            className="text-emerald-600 hover:bg-emerald-50 rounded-lg p-2" title="Mark Paid">
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => { if (confirm('Void invoice?')) voidMutation.mutate(inv.id); }}
                            className="text-rose-600 hover:bg-rose-50 rounded-lg p-2" title="Void">
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Page {data.meta.page} of {data.meta.totalPages} • {data.meta.total} total
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50">Previous</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.meta.totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl">Create Invoice</h3>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tenant</label>
                <select value={tenantId} onChange={(e) => setTenantId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm">
                  <option value="">Select tenant...</option>
                  {(tenantsData?.items ?? []).map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                  ))}
                </select>
              </div>
              <Input label="Amount (PKR)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
              <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Input label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
                <Button onClick={() => {
                  if (!tenantId || !amount || !description || !dueDate) return toast.error('Sab fields required hain');
                  createMutation.mutate({
                    tenantId, amount: Number(amount), description, notes: notes || undefined, dueDate,
                  });
                }} loading={createMutation.isPending} className="flex-1">Create</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
