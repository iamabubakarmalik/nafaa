import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Send, Users } from 'lucide-react';
import { adminBroadcastApi, type BroadcastTarget } from '@/api/admin-broadcast.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const targetLabels: Record<BroadcastTarget, { label: string; color: string }> = {
  ALL: { label: 'All Tenants', color: 'bg-violet-100 text-violet-700' },
  ACTIVE: { label: 'Active Only', color: 'bg-emerald-100 text-emerald-700' },
  TRIAL: { label: 'Trial Users', color: 'bg-blue-100 text-blue-700' },
  SUSPENDED: { label: 'Suspended', color: 'bg-rose-100 text-rose-700' },
  SPECIFIC: { label: 'Specific', color: 'bg-amber-100 text-amber-700' },
};

export default function BroadcastPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [targetType, setTargetType] = useState<BroadcastTarget>('ALL');

  const { data: list = [] } = useQuery({
    queryKey: ['admin-broadcasts'],
    queryFn: adminBroadcastApi.list,
  });

  const sendMutation = useMutation({
    mutationFn: adminBroadcastApi.send,
    onSuccess: (data) => {
      toast.success(`Broadcast sent to ${data.recipientCount} tenants! 📢`);
      setTitle(''); setMessage(''); setLink('');
      queryClient.invalidateQueries({ queryKey: ['admin-broadcasts'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Send failed'),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-rose-900 via-pink-800 to-rose-700 text-white p-6 shadow-soft">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
          <Megaphone className="h-3.5 w-3.5" /> Notifications Broadcast
        </div>
        <h2 className="mt-3 text-3xl font-bold">Send Broadcast</h2>
        <p className="mt-2 text-sm text-white/80">Sab ya specific tenants ko notification bhejo</p>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-xl">New Broadcast</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Target Audience</label>
            <div className="grid grid-cols-2 gap-2">
              {(['ALL', 'ACTIVE', 'TRIAL', 'SUSPENDED'] as BroadcastTarget[]).map((t) => (
                <button key={t} onClick={() => setTargetType(t)}
                  className={`p-3 rounded-xl border-2 text-left transition ${
                    targetType === t ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  <div className="font-semibold text-sm text-slate-900">{targetLabels[t].label}</div>
                </button>
              ))}
            </div>
          </div>

          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Important Update 📢" />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Aap ke users ko ye message dikhega..." />
          </div>

          <Input label="Action Link (optional)" value={link} onChange={(e) => setLink(e.target.value)}
            placeholder="/billing or /dashboard" />

          <Button onClick={() => {
            if (!title.trim() || !message.trim()) return toast.error('Title aur message likhein');
            sendMutation.mutate({
              title: title.trim(), message: message.trim(), link: link.trim() || undefined, targetType,
            });
          }} loading={sendMutation.isPending} className="w-full bg-rose-600 hover:bg-rose-700" size="lg">
            <Send className="h-4 w-4" /> Send Broadcast
          </Button>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Users className="h-5 w-5 text-rose-600" />
            <h3 className="font-bold">Broadcast History</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {list.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No broadcasts yet</div>
            ) : list.map((b) => (
              <div key={b.id} className="px-6 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{b.title}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${targetLabels[b.targetType].color}`}>
                        {targetLabels[b.targetType].label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{b.message}</p>
                    <div className="text-xs text-slate-500 mt-1">
                      {b.author.fullName} • {formatDate(b.sentAt)} • Sent to {b.recipientCount}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
