import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Plus, Save, Trash2, UtensilsCrossed } from 'lucide-react';
import { apiErrorMessage } from '../api/online-orders.api';
import { foodpandaApi, type FoodpandaChannel, type FoodpandaOverview, type FoodpandaVendor } from '../api/foodpanda.api';
import { whenText } from '../lib/labels';
import { Badge, Banner, Btn, Card, EmptyState, Field, Page, SettingRow, Toggle, inputCls } from '../components/ui/kit';
import { cn } from '@core/lib/cn';

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
    <Page back={{ to: '/online-store/channels', label: 'Sales channels' }} title="Foodpanda"
      subtitle="Foodpanda ke orders seedha Nafaa me — accept, reject, ready, sab yahin se.">
      {isLoading ? <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        : error || !data ? <Card><EmptyState title="Safha nahi khula">{apiErrorMessage(error)}</EmptyState></Card>
        : <Body data={data} />}
    </Page>
  );
}

function Body({ data }: { data: FoodpandaOverview }) {
  return (
    <>
      {!data.configured && (
        <Banner tone="warning" title="Foodpanda abhi Nafaa ke liye chalu nahi hua">
          Nafaa ki Foodpanda partnership ki keys server par lagni baqi hain. Aap apne codes abhi save kar sakte hain — chalu hote hi orders aane lagenge.
        </Banner>
      )}
      <Card title="Kaise kaam karta hai">
        <ol className="grid gap-2 text-[13px] text-slate-700 dark:text-slate-200 sm:grid-cols-3">
          <li><b>1.</b> Foodpanda account manager se apna <b>chain code</b> aur har branch ka <b>vendor code</b> lein</li>
          <li><b>2.</b> Neeche daal kar save — har branch ka Nafaa <b>Remote ID</b> banega, wo Foodpanda ko bhej dein</li>
          <li><b>3.</b> Order aaye → Online orders me ghanti → <b>Accept</b> (bill khud) → <b>Ready</b> → rider le jaye</li>
        </ol>
      </Card>
      {data.channels.map((c) => <ChannelForm key={c.id} data={data} channel={c} />)}
      {data.channels.length === 0 && <ChannelForm data={data} />}
      <Card title="Foodpanda team ke liye (technical)">
        <div className="space-y-2 text-[13px]">
          <Field label="POS plugin base URL">
            <div className="flex gap-2">
              <input readOnly value={data.pluginBaseUrl} className={cn(inputCls, 'font-mono text-[12px]')} />
              <Btn icon={<Copy className="h-3.5 w-3.5" />} onClick={() => copy(data.pluginBaseUrl)}>Copy</Btn>
            </div>
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
      {channel && (channel.isActive ? <Badge tone="success" dot>Chalu</Badge> : <Badge tone="neutral">Band</Badge>)}</span>}
      actions={channel ? <Toggle checked={channel.isActive} onChange={(v) => active.mutate(v)} disabled={active.isPending} /> : undefined}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Chain code" help="Foodpanda ka diya (jaise brookee-pk)">
            <input value={chainCode} onChange={(e) => setChain(e.target.value)} className={cn(inputCls, 'font-mono')} />
          </Field>
          <Field label="Tayyari ka waqt (minute)" help="Accept par Foodpanda ko itna waqt batate hain">
            <input type="number" value={prep} onChange={(e) => setPrep(e.target.value)} className={cn(inputCls, 'w-28')} />
          </Field>
        </div>
        <SettingRow title="Order khud accept" help="Bill khud ban jaye (sab items Nafaa products se jure hon). Band ho to 15 minute ke andar khud accept karein — warna Foodpanda cancel kar deta hai."
          control={<Toggle checked={autoAccept} onChange={setAuto} />} />
        <div className="space-y-2">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Branches</div>
          {vendors.map((v, i) => {
            const closed = v.remoteId ? channel?.availability?.[v.remoteId]?.closures?.length : 0;
            return (
              <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <Field label="Vendor code"><input value={v.vendorCode ?? ''} onChange={(e) => setV(i, { vendorCode: e.target.value })} className={cn(inputCls, 'w-40 font-mono')} /></Field>
                <Field label="Nafaa branch">
                  <select value={v.shopId ?? ''} onChange={(e) => setV(i, { shopId: e.target.value || null })} className={cn(inputCls, 'w-48')}>
                    <option value="">—</option>
                    {data.shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                {v.remoteId && (
                  <div className="text-[12px]">
                    <div className="text-slate-500">Remote ID (Foodpanda ko dein)</div>
                    <button type="button" onClick={() => copy(v.remoteId!)} className="font-mono font-semibold text-slate-900 hover:underline dark:text-white">{v.remoteId}</button>
                    {closed ? <Badge tone="warning">Foodpanda par band</Badge> : null}
                  </div>
                )}
                {vendors.length > 1 && <Btn size="sm" variant="plain" className="text-rose-600" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setVendors((x) => x.filter((_, j) => j !== i))}>Hatayein</Btn>}
              </div>
            );
          })}
          <Btn size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setVendors((x) => [...x, { vendorCode: '', shopId: null }])}>Aur branch</Btn>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex flex-wrap gap-2">
            {channel && <Btn size="sm" icon={<Copy className="h-3.5 w-3.5" />} onClick={() => copy(shareText)}>Foodpanda ke liye details copy</Btn>}
            {channel && <Link to={`/online-orders?channel=${channel.id}`}><Btn size="sm" variant="plain">Is ke orders</Btn></Link>}
            {channel?.lastMenuImportRequest && <span className="text-[12px] text-slate-500">Menu darkhwast {whenText(channel.lastMenuImportRequest.at)} — menu Foodpanda portal se chalta hai</span>}
          </div>
          <Btn variant="primary" loading={save.isPending} icon={<Save className="h-4 w-4" />} onClick={() => save.mutate()}>Mehfooz karein</Btn>
        </div>
      </div>
    </Card>
  );
}
