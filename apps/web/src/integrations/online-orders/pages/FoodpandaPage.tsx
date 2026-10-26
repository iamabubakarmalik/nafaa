import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Plus, Save, Trash2, UtensilsCrossed } from 'lucide-react';
import { apiErrorMessage } from '../api/online-orders.api';
import { foodpandaApi, type FoodpandaChannel, type FoodpandaOverview, type FoodpandaVendor } from '../api/foodpanda.api';
import { whenText } from '../lib/labels';
import { cn } from '@core/lib/cn';
import { Alert, Badge, Button, Card, controlClass, EmptyState, Field, Input, PageHero, PageShell, Select, Switch } from '@/design-system/components';

/* ═════════════════════════════════════════════════════════════
   FOODPANDA — orders seedha Nafaa me (Delivery Hero POS integration).
   Order aate hi ghanti; "Accept" se Foodpanda ko waqt jata hai, cancel
   par wajah, "Ready" par rider ko khabar. Dukaan ko sirf apna chain code
   aur vendor code chahiye — baqi Nafaa ka.
   ═════════════════════════════════════════════════════════════ */

const KEY = ['foodpanda'];
const copy = (s: string) => navigator.clipboard.writeText(s).then(() => toast.success('Copy ho gaya'), () => toast.error('Copy nahi hua'));

export default function FoodpandaPage() {
  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: foodpandaApi.overview });
  return (
    <PageShell>
      <PageHero back="/online-store/channels" backLabel="Sales channels" title="Foodpanda"
        subtitle="Foodpanda ke orders seedha Nafaa me — accept, reject, ready, sab yahin se." />
      {isLoading ? <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-ink-800" />
        : error || !data ? <Card><EmptyState title="Safha nahi khula" description={apiErrorMessage(error)} /></Card>
        : <Body data={data} />}
    </PageShell>
  );
}

function Body({ data }: { data: FoodpandaOverview }) {
  return (
    <>
      {!data.configured && (
        <Alert tone="warning" title="Foodpanda abhi Nafaa ke liye chalu nahi hua">
          Nafaa ki Foodpanda partnership ki keys server par lagni baqi hain. Aap apne codes abhi save kar sakte hain — chalu hote hi orders aane lagenge.
        </Alert>
      )}
      <Card title="Kaise kaam karta hai">
        <ol className="grid gap-2 text-[0.8125rem] text-slate-700 dark:text-ink-200 sm:grid-cols-3">
          <li><b>1.</b> Foodpanda account manager se apna <b>chain code</b> aur har branch ka <b>vendor code</b> lein</li>
          <li><b>2.</b> Neeche daal kar save — har branch ka Nafaa <b>Remote ID</b> banega, wo Foodpanda ko bhej dein</li>
          <li><b>3.</b> Order aaye → Online orders me ghanti → <b>Accept</b> (bill khud) → <b>Ready</b> → rider le jaye</li>
        </ol>
      </Card>
      {data.channels.map((c) => <ChannelForm key={c.id} data={data} channel={c} />)}
      {data.channels.length === 0 && <ChannelForm data={data} />}
      <Card title="Foodpanda team ke liye (technical)">
        <div className="space-y-2 text-[0.8125rem]">
          <Field label="POS plugin base URL">
            {(id) => (<div className="flex gap-2">
              <input id={id} readOnly value={data.pluginBaseUrl} className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem] font-mono text-[0.75rem]')} />
              <Button size="sm" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={() => copy(data.pluginBaseUrl)}>Copy</Button>
            </div>)}
          </Field>
          <p className="text-slate-500">Mahol: <b>{data.environment === 'staging' ? 'Staging (test)' : 'Production'}</b> · Integration: Nafaa POS</p>
        </div>
      </Card>
    </>
  );
}

function ChannelForm({ data, channel }: { data: FoodpandaOverview; channel?: FoodpandaChannel }) {
  const qc = useQueryClient();
  const [chainCode, setChain] = useState(channel?.chainCode ?? '');
  const [prep, setPrep] = useState(String(channel?.prepMinutes ?? 20));
  const [autoAccept, setAuto] = useState(channel?.autoAccept ?? false);
  const [vendors, setVendors] = useState<Array<Partial<FoodpandaVendor>>>(channel?.vendors.length ? channel.vendors : [{ vendorCode: '', shopId: data.shops[0]?.id ?? null }]);
  const save = useMutation({
    mutationFn: () => foodpandaApi.save({ channelId: channel?.id, chainCode, prepMinutes: Number(prep), autoAccept, vendors }),
    onSuccess: (r) => { qc.setQueryData(KEY, r); toast.success('Mehfooz — Remote IDs Foodpanda ko bhej dein'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const active = useMutation({
    mutationFn: (v: boolean) => foodpandaApi.setActive(channel!.id, v),
    onSuccess: (r) => qc.setQueryData(KEY, r),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const setV = (i: number, p: Partial<FoodpandaVendor>) => setVendors((v) => v.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const shareText = channel ? `Nafaa POS — ${channel.displayName}\nChain code: ${channel.chainCode}\n${channel.vendors.map((v) => `Vendor ${v.vendorCode} → Remote ID ${v.remoteId}`).join('\n')}\nPlugin base URL: ${data.pluginBaseUrl}` : '';

  return (
    <Card title={<span className="flex items-center gap-2"><UtensilsCrossed className="h-4 w-4 text-pink-600" /> {channel?.displayName ?? 'Foodpanda jorein'}
      {channel && (channel.isActive ? <Badge size="xs" variant="success" dot>Chalu</Badge> : <Badge size="xs" variant="default">Band</Badge>)}</span>}
      actions={channel ? <Switch size="sm" checked={channel.isActive} onChange={(e) => active.mutate(e.target.checked)} disabled={active.isPending} /> : undefined}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input size="sm" label="Chain code" hint="Foodpanda ka diya (jaise brookee-pk)" value={chainCode} onChange={(e) => setChain(e.target.value)} className="font-mono" />
          <Input size="sm" label="Tayyari ka waqt (minute)" hint="Accept par Foodpanda ko itna waqt batate hain" type="number" value={prep} onChange={(e) => setPrep(e.target.value)} className="w-28" />
        </div>
        <Switch size="sm" checked={autoAccept} onChange={(e) => setAuto(e.target.checked)} label="Order khud accept" description="Bill khud ban jaye (sab items Nafaa products se jure hon). Band ho to 15 minute ke andar khud accept karein — warna Foodpanda cancel kar deta hai." className="py-3 first:pt-0 last:pb-0" />
        <div className="space-y-2">
          <div className="text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Branches</div>
          {vendors.map((v, i) => {
            const closed = v.remoteId ? channel?.availability?.[v.remoteId]?.closures?.length : 0;
            return (
              <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 p-3 dark:border-ink-800">
                <Input size="sm" label="Vendor code" value={v.vendorCode ?? ''} onChange={(e) => setV(i, { vendorCode: e.target.value })} className="w-40 font-mono" />
                <Select size="sm" label="Nafaa branch" value={v.shopId ?? ''} onChange={(e) => setV(i, { shopId: e.target.value || null })} className="w-48">
                    <option value="">—</option>
                    {data.shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                {v.remoteId && (
                  <div className="text-[0.75rem]">
                    <div className="text-slate-500">Remote ID (Foodpanda ko dein)</div>
                    <button type="button" onClick={() => copy(v.remoteId!)} className="font-mono font-semibold text-slate-900 hover:underline dark:text-ink-white">{v.remoteId}</button>
                    {closed ? <Badge size="xs" variant="warning">Foodpanda par band</Badge> : null}
                  </div>
                )}
                {vendors.length > 1 && <Button size="xs" variant="critical" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setVendors((x) => x.filter((_, j) => j !== i))}>Hatayein</Button>}
              </div>
            );
          })}
          <Button size="xs" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setVendors((x) => [...x, { vendorCode: '', shopId: null }])}>Aur branch</Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-ink-800">
          <div className="flex flex-wrap gap-2">
            {channel && <Button size="xs" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={() => copy(shareText)}>Foodpanda ke liye details copy</Button>}
            {channel && <Link to={`/online-orders?channel=${channel.id}`}><Button size="xs" variant="ghost">Is ke orders</Button></Link>}
            {channel?.lastMenuImportRequest && <span className="text-[0.75rem] text-slate-500">Menu darkhwast {whenText(channel.lastMenuImportRequest.at)} — menu Foodpanda portal se chalta hai</span>}
          </div>
          <Button size="sm" variant="primary" loading={save.isPending} leftIcon={<Save className="h-4 w-4" />} onClick={() => save.mutate()}>Mehfooz karein</Button>
        </div>
      </div>
    </Card>
  );
}
