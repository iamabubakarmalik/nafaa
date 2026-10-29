import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, ShieldBan, Trash2 } from 'lucide-react';
import { apiErrorMessage, onlineOrdersApi } from '../api/online-orders.api';
import { whenText } from '../lib/labels';
import { cn } from '@core/lib/cn';
import { Button, Card, controlClass, EmptyState, Input, PageHero, PageShell, Switch } from '@/design-system/components';
import { scanApi } from '../api/order-money.api';

/* ═════════════════════════════════════════════════════════════
   BLOCK LIST — fake / baar baar RTO karne wale numbers. Is number se
   order aaye to khud accept nahi hota aur 'Blocked' nishan lagta hai.
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
    <PageShell className="max-w-3xl">
      <PageHero back="/online-orders/reports" backLabel="Online reports" title="Block list"
        subtitle="Fake ya RTO karne wale numbers. In se aane wale order khud accept nahi hote — 'Blocked' ke nishan ke saath 'Naye' me rukte hain." />
      <RiskRuleCard />

      <Card title="Number block karein">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input size="sm" label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xxxxxxxxx" />
          <Input size="sm" label="Naam (optional)" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          <Input size="sm" label="Wajah (optional)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Fake order" maxLength={200} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="critical" disabled={phone.replace(/\D/g, '').length < 10} loading={add.isPending} onClick={() => add.mutate()} leftIcon={<ShieldBan className="h-4 w-4" />}>Block</Button>
        </div>
      </Card>

      <Card flush title={`Blocked numbers (${data?.length ?? 0})`}>
        <div className="px-4 sm:px-5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Number ya naam…" className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem] pl-8')} />
          </div>
        </div>
        <div className="mt-3 border-t border-slate-100">
          {isLoading ? <div className="p-5"><div className="h-16 animate-pulse rounded-lg bg-slate-100" /></div>
            : error ? <EmptyState title="List nahi khuli" description={apiErrorMessage(error)} />
            : rows.length === 0 ? <EmptyState icon={<ShieldBan className="h-5 w-5" />} title="Koi number block nahi" description={<>Order ke andar "Number block" se bhi block kar sakte hain.</>} />
            : (
              <ul className="divide-y divide-slate-100">
                {rows.map((b) => (
                  <li key={b.key} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[0.8125rem] font-semibold text-slate-900">{b.phone}{b.name ? <span className="ml-2 font-sans font-normal text-slate-500">{b.name}</span> : null}</div>
                      <div className="text-[0.75rem] text-slate-500">{b.reason ?? 'Wajah nahi likhi'} · {whenText(b.at)}</div>
                    </div>
                    <Button size="xs" variant="ghost" loading={remove.isPending && remove.variables === b.phone} onClick={() => remove.mutate(b.phone)} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>Unblock</Button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </Card>
    </PageShell>
  );
}

/** "Risk HIGH ho to advance maangein": the shop's rule for risky COD orders. */
function RiskRuleCard() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['risk-settings'], queryFn: scanApi.riskSettings });
  const [pct, setPct] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (body: { askAdvance?: boolean; advancePct?: number }) => scanApi.saveRiskSettings(body),
    onSuccess: (r) => { qc.setQueryData(['risk-settings'], r); setPct(null); toast.success('Setting save ho gayi'); qc.invalidateQueries({ queryKey: ['online-order'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  if (!data) return null;
  const value = pct ?? String(data.advancePct);
  return (
    <Card title="Fake / risky orders" description="Nafaa har order par pichhle RTO, baar baar cancel, shehar jo courier nahi jaata, naye customer ka bahut bara COD aur kuch minute me dobara order dekhta hai.">
      <Switch checked={data.askAdvance} disabled={save.isPending} onChange={(e) => save.mutate({ askAdvance: e.target.checked })}
        label="Risk HIGH ho to advance maangein"
        description="Aise COD order khud accept nahi honge, aur order par advance maangne ke button aayenge (WhatsApp, payment link, block)." />
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Input size="sm" type="number" min={5} max={100} label="Kitna advance (% order ka)" value={value} onChange={(e) => setPct(e.target.value)} className="w-44" />
        <Button size="sm" variant="secondary" disabled={pct === null || !(Number(value) >= 5 && Number(value) <= 100)} loading={save.isPending} onClick={() => save.mutate({ advancePct: Number(value) })}>Save</Button>
      </div>
    </Card>
  );
}
