import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Mail, Search, RefreshCw, CheckCircle2, XCircle, Clock, Send, AlertCircle, Beaker,
} from 'lucide-react';
import { adminCommunicationsApi } from '@/api/admin-communications.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v));

const statusColors: Record<string, string> = {
  QUEUED: 'bg-blue-100 text-blue-700',
  SENDING: 'bg-amber-100 text-amber-700',
  SENT: 'bg-emerald-100 text-emerald-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-rose-100 text-rose-700',
  BOUNCED: 'bg-orange-100 text-orange-700',
};

export default function EmailLogsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showTest, setShowTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['admin-email-stats'],
    queryFn: adminCommunicationsApi.emailStats,
  });

  const { data } = useQuery({
    queryKey: ['admin-email-logs', statusFilter, page],
    queryFn: () =>
      adminCommunicationsApi.emailLogs({
        status: statusFilter || undefined, page, limit: 30,
      }),
  });

  const retryMutation = useMutation({
    mutationFn: adminCommunicationsApi.retryEmail,
    onSuccess: () => {
      toast.success('Email retried');
      queryClient.invalidateQueries({ queryKey: ['admin-email-logs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-email-stats'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Retry failed'),
  });

  const testMutation = useMutation({
    mutationFn: () => adminCommunicationsApi.testEmail(testEmail),
    onSuccess: () => {
      toast.success('Test email sent! Check inbox.');
      setShowTest(false);
      setTestEmail('');
      queryClient.invalidateQueries({ queryKey: ['admin-email-logs'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Test failed'),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-blue-900 to-blue-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Mail className="h-3.5 w-3.5" /> Email Delivery
            </div>
            <h2 className="mt-3 text-3xl font-bold">Email Logs</h2>
            <p className="mt-2 text-sm text-white/80">Track all sent emails (Resend)</p>
          </div>
          <Button onClick={() => setShowTest(true)} className="bg-white text-slate-900 hover:bg-slate-100">
            <Beaker className="h-4 w-4" /> Send Test Email
          </Button>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Total</div>
          <div className="mt-1 text-2xl font-bold">{stats?.total ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="text-xs text-emerald-700">Sent</div>
          <div className="mt-1 text-2xl font-bold text-emerald-900 flex items-center gap-1">
            <CheckCircle2 className="h-5 w-5" /> {stats?.sent ?? 0}
          </div>
        </div>
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
          <div className="text-xs text-rose-700">Failed</div>
          <div className="mt-1 text-2xl font-bold text-rose-900 flex items-center gap-1">
            <XCircle className="h-5 w-5" /> {stats?.failed ?? 0}
          </div>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <div className="text-xs text-amber-700">Queued</div>
          <div className="mt-1 text-2xl font-bold text-amber-900 flex items-center gap-1">
            <Clock className="h-5 w-5" /> {stats?.queued ?? 0}
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white p-4">
          <div className="text-xs text-white/80">Today</div>
          <div className="mt-1 text-2xl font-bold">{stats?.today ?? 0}</div>
        </div>
      </section>

      <div className="flex gap-2 flex-wrap">
        {['', 'QUEUED', 'SENT', 'FAILED'].map((s) => (
          <button key={s || 'ALL'} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${
              statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
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
                <th className="text-left px-6 py-4 font-medium">Date</th>
                <th className="text-left px-6 py-4 font-medium">To</th>
                <th className="text-left px-6 py-4 font-medium">Subject</th>
                <th className="text-left px-6 py-4 font-medium">Tenant</th>
                <th className="text-left px-6 py-4 font-medium">Status</th>
                <th className="text-right px-6 py-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.items ?? []).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-xs text-slate-600">{formatDate(log.createdAt)}</td>
                  <td className="px-6 py-3">
                    <div className="text-sm">{log.toEmail}</div>
                    {log.toName && <div className="text-xs text-slate-500">{log.toName}</div>}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <div className="font-medium">{log.subject}</div>
                    {log.templateSlug && (
                      <div className="text-xs text-slate-500 font-mono">{log.templateSlug}</div>
                    )}
                  </td>
                  <td className="px-6 py-3 text-xs">{log.tenant?.name ?? '—'}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[log.status]}`}>
                      {log.status}
                    </span>
                    {log.errorMessage && (
                      <div className="text-[10px] text-rose-600 mt-1">{log.errorMessage}</div>
                    )}
                    {log.retryCount > 0 && (
                      <div className="text-[10px] text-slate-500 mt-0.5">Retries: {log.retryCount}</div>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {log.status === 'FAILED' && (
                      <button onClick={() => retryMutation.mutate(log.id)}
                        className="text-blue-600 hover:bg-blue-50 rounded-lg p-2" title="Retry">
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    )}
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

      {showTest && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Beaker className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold">Send Test Email</h3>
                <p className="text-sm text-slate-500">Test your email setup</p>
              </div>
            </div>
            <Input label="Recipient Email" type="email" value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)} placeholder="test@example.com" />
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" onClick={() => setShowTest(false)} className="flex-1">Cancel</Button>
              <Button onClick={() => {
                if (!testEmail.trim()) return toast.error('Email likhein');
                testMutation.mutate();
              }} loading={testMutation.isPending} className="flex-1">
                <Send className="h-4 w-4" /> Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
