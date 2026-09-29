import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, ShieldBan, Trash2 } from 'lucide-react';
import { apiErrorMessage, onlineOrdersApi } from '../api/online-orders.api';
import { whenText } from '../lib/labels';
import { Btn, Card, EmptyState, Field, Page, inputCls } from '../components/ui/kit';
import { cn } from '@core/lib/cn';

/* ═════════════════════════════════════════════════════════════
   BLOCK LIST — fake / baar baar RTO karne wale numbers. Is number se
   order aaye to khud accept nahi hota aur ⛔ nishan lagta hai.
   ═════════════════════════════════════════════════════════════ */

export default function BlocklistPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['blocklist'], queryFn: onlineOrdersApi.blocklist });
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [q, setQ] = useState('');

  const refresh = () => { qc.invalidateQueries({ queryKey: ['blocklist'] }); qc.invalidateQueries({ queryKey: ['online-orders'] }); };
  const add = useMutation({
    mutationFn: () => onlineOrdersApi.block({ phone: phone.trim(), name: name.trim() || undefined, reason: reason.trim() || undefined }),
    onSuccess: () => { toast.success('Number block ho gaya'); setPhone(''); setName(''); setReason(''); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (p: string) => onlineOrdersApi.unblock(p),
    onSuccess: () => { toast.success('Unblock ho gaya'); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const term = q.trim().toLowerCase().replace(/\D/g, '') || q.trim().toLowerCase();
  const rows = (data ?? []).filter((b) => !q.trim() || b.key.includes(term) || (b.name ?? '').toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <Page back={{ to: '/online-orders/reports', label: 'Online reports' }} title="Block list" narrow
      subtitle="Fake ya RTO karne wale numbers. In se aane wale order khud accept nahi hote — ⛔ nishan ke saath 'Naya' me rukte hain.">
      <Card title="Number block karein">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xxxxxxxxx" className={inputCls} /></Field>
          <Field label="Naam (optional)"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={80} /></Field>
          <Field label="Wajah (optional)"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Fake order" className={inputCls} maxLength={200} /></Field>
        </div>
        <div className="mt-3 flex justify-end">
          <Btn variant="critical" disabled={phone.replace(/\D/g, '').length < 10} loading={add.isPending} onClick={() => add.mutate()} icon={<ShieldBan className="h-4 w-4" />}>Block</Btn>
        </div>
      </Card>

      <Card flush title={`Blocked numbers (${data?.length ?? 0})`}>
        <div className="px-4 sm:px-5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Number ya naam…" className={cn(inputCls, 'pl-8')} />
          </div>
        </div>
        <div className="mt-3 border-t border-slate-100 dark:border-slate-800">
          {isLoading ? <div className="p-5"><div className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /></div>
            : error ? <EmptyState title="List nahi khuli">{apiErrorMessage(error)}</EmptyState>
            : rows.length === 0 ? <EmptyState icon={<ShieldBan className="h-5 w-5" />} title="Koi number block nahi">Order ke andar "Number block" se bhi block kar sakte hain.</EmptyState>
            : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((b) => (
                  <li key={b.key} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[13px] font-semibold text-slate-900 dark:text-white">{b.phone}{b.name ? <span className="ml-2 font-sans font-normal text-slate-500">{b.name}</span> : null}</div>
                      <div className="text-[12px] text-slate-500">{b.reason ?? 'Wajah nahi likhi'} · {whenText(b.at)}</div>
                    </div>
                    <Btn size="sm" variant="plain" loading={remove.isPending && remove.variables === b.phone} onClick={() => remove.mutate(b.phone)} icon={<Trash2 className="h-3.5 w-3.5" />}>Unblock</Btn>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </Card>
    </Page>
  );
}
