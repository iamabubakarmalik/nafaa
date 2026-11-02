/**
 * Foodpanda (Delivery Hero POS integration): orders come straight into
 * Online orders. The shop saves its chain code and one vendor code per
 * branch; Nafaa makes a Remote ID per branch that the Foodpanda team links.
 * Accept sends the preparation time, Ready calls the rider, a reject sends
 * its reason back.
 */

import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, Copy, Plus, Save, ShoppingBag, Store, Trash2 } from 'lucide-react';
import {
  Alert, Badge, Button, Input, PageHero, PageShell, Select, Skeleton, Switch, heroButton,
} from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { apiErrorMessage } from '../api/online-orders.api';
import { foodpandaApi, type FoodpandaChannel, type FoodpandaOverview, type FoodpandaVendor } from '../api/foodpanda.api';
import { useSalesChannels } from '../hooks/useSalesChannels';
import { whenText } from '../lib/labels';
import { GuideCard } from '../components/guides/Guide';
import { foodpandaGuide } from '../components/guides/foodpandaGuide';
import { t, Trans } from '@core/i18n';

const KEY = ['foodpanda'];
const copy = (s: string) => navigator.clipboard.writeText(s).then(() => toast.success(t('Copy ho gaya')), () => toast.error(t('Copy nahi hua')));

export default function FoodpandaPage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: KEY, queryFn: foodpandaApi.overview });
  const { data: channels } = useSalesChannels();
  const first = data?.channels[0];
  const ordersSeen = !!channels?.some((c) => c.type === 'FOODPANDA' && c.lastOrderAt);
  const remoteIds = data?.channels.reduce((a, c) => a + c.vendors.length, 0) ?? 0;
  const status = !data ? null
    : !first ? { text: t('Jorna baqi'), tone: 'warning' as const }
      : !first.isActive ? { text: t('Band'), tone: 'default' as const }
        : !data.configured ? { text: t('Foodpanda ka intezar'), tone: 'warning' as const }
          : { text: t('Chalu'), tone: 'success' as const };

  return (
    <PageShell>
      <PageHero
        back="/online-store/channels"
        backLabel={t('Sales channels')}
        title={<span className="inline-flex min-w-0 items-center gap-2.5"><BrandLogo name="foodpanda" size={30} /><span className="truncate">{'Foodpanda'}</span></span>}
        chip={status ? <>{status.text}</> : undefined}
        meta={t('Foodpanda ke orders seedha Nafaa me — accept, reject, ready sab yahin se')}
        actions={first ? (
          <Link to={`/online-orders?channel=${first.id}`} className={heroButton}><ShoppingBag className="h-4 w-4" /> {' '}{t('Orders')}</Link>
        ) : undefined}
        loading={isLoading}
        stats={first ? [
          { label: t('Branches'), value: String(remoteIds), hint: remoteIds ? t('Remote ID bani') : t('abhi koi nahi') },
          { label: t('Tayyari ka waqt'), value: `${first.prepMinutes} min` },
          { label: t('Order khud accept'), value: first.autoAccept ? t('Chalu') : t('Band') },
        ] : undefined}
      />

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]"><Skeleton className="h-96 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></div>
      ) : error || !data ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">{t('Foodpanda ka safha nahi khula')}</p>
          <p className="mt-1 text-sm text-slate-500">{apiErrorMessage(error)}</p>
          <Button className="mt-3" variant="secondary" onClick={() => refetch()}>{t('Dobara koshish')}</Button>
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="min-w-0 space-y-4">
            {!data.configured && (
              <Alert tone="warning" title={t('Foodpanda abhi Nafaa ke liye chalu nahi hua')}>
                {t('Nafaa aur Foodpanda ki partnership ka kaam baqi hai. Aap apne codes abhi mehfooz kar sakte hain — chalu hote hi orders aane lagenge.')}
              </Alert>
            )}
            {data.channels.map((c) => <ChannelForm key={c.id} data={data} channel={c} />)}
            {data.channels.length === 0 && <ChannelForm data={data} />}
            <Section title={t('Foodpanda team ke liye')} help={t('Foodpanda ki technical team ye maangti hai — \'details copy\' me pehle se shamil hai.')}>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 font-mono text-[0.75rem] text-slate-700">{data.pluginBaseUrl}</code>
                <Button size="sm" variant="secondary" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={() => copy(data.pluginBaseUrl)}>{t('Copy')}</Button>
              </div>
              <p className="mt-2 text-[0.75rem] text-slate-500"><Trans text="Plugin URL · Mahol: {{env}} · Integration: Nafaa POS" values={{ env: <b>{data.environment === 'staging' ? t('Staging (test)') : t('Production')}</b> }} /></p>
            </Section>
          </div>
          <GuideCard guide={foodpandaGuide({ remoteIds, ordersSeen })} className="lg:sticky lg:top-4" />
        </div>
      )}
    </PageShell>
  );
}

function Section({ title, help, actions, children }: { title: ReactNode; help?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold text-slate-900">{title}</h2>
          {help && <p className="mt-0.5 text-[0.8125rem] text-slate-500">{help}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

function ChannelForm({ data, channel }: { data: FoodpandaOverview; channel?: FoodpandaChannel }) {
  const qc = useQueryClient();
  const [chainCode, setChain] = useState(channel?.chainCode ?? '');
  const [prep, setPrep] = useState(String(channel?.prepMinutes ?? 20));
  const [autoAccept, setAuto] = useState(channel?.autoAccept ?? false);
  const [vendors, setVendors] = useState<Array<Partial<FoodpandaVendor>>>(channel?.vendors.length ? channel.vendors : [{ vendorCode: '', shopId: data.shops[0]?.id ?? null }]);
  const save = useMutation({
    mutationFn: () => foodpandaApi.save({ channelId: channel?.id, chainCode: chainCode.trim(), prepMinutes: Number(prep), autoAccept, vendors }),
    onSuccess: (r) => { qc.setQueryData(KEY, r); toast.success(t('Mehfooz — Remote IDs Foodpanda ko bhej dein')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const active = useMutation({
    mutationFn: (v: boolean) => foodpandaApi.setActive(channel!.id, v),
    onSuccess: (r) => qc.setQueryData(KEY, r),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const setV = (i: number, p: Partial<FoodpandaVendor>) => setVendors((v) => v.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const prepN = Number(prep);
  const prepBad = !(prepN >= 5 && prepN <= 120);
  const shareText = channel ? t('Nafaa POS — {{displayName}}\nChain code: {{chainCode}}\n{{value}}\nPlugin base URL: {{pluginBaseUrl}}', { displayName: channel.displayName, chainCode: channel.chainCode, value: channel.vendors.map((v) => `Vendor ${v.vendorCode} → Remote ID ${v.remoteId}`).join('\n'), pluginBaseUrl: data.pluginBaseUrl }) : '';

  return (
    <>
      <Section
        title={<span className="flex flex-wrap items-center gap-2">{channel?.displayName ?? t('Foodpanda jorein')}
          {channel && (channel.isActive ? <Badge size="xs" variant="success" dot>{t('Chalu')}</Badge> : <Badge size="xs" variant="default">{t('Band')}</Badge>)}</span>}
        help={channel ? t('Band karne par naye Foodpanda orders Nafaa me nahi aayenge.') : t('Foodpanda ke diye codes daalein aur mehfooz karein.')}
        actions={channel ? <Switch size="sm" checked={channel.isActive} onChange={(e) => active.mutate(e.target.checked)} disabled={active.isPending} aria-label={t('Channel chalu')} /> : undefined}>
        <div className="sm:max-w-sm">
          <Input size="sm" label={t('Chain code')} hint={t('Foodpanda ka diya, jaise yummy-pk (space ke baghair)')} value={chainCode} onChange={(e) => setChain(e.target.value)} className="font-mono" />
        </div>
      </Section>

      <Section title={t('Branches')} help={t('Har Foodpanda vendor ke saamne woh Nafaa branch jis ka stock aur bill ho. Remote ID Foodpanda ko dena hai.')}>
        <ul className="space-y-2">
          {vendors.map((v, i) => {
            const closed = v.remoteId ? channel?.availability?.[v.remoteId]?.closures?.length : 0;
            return (
              <li key={i} className="grid gap-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200/70 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-end">
                <Input size="sm" label={t('Vendor code')} value={v.vendorCode ?? ''} onChange={(e) => setV(i, { vendorCode: e.target.value })} className="font-mono" />
                <Select size="sm" label={t('Nafaa branch')} value={v.shopId ?? ''} onChange={(e) => setV(i, { shopId: e.target.value || null })}>
                  <option value="">{t('— branch chunein —')}</option>
                  {data.shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                {vendors.length > 1 && (
                  <Button size="sm" variant="ghost" className="text-rose-700" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setVendors((x) => x.filter((_, j) => j !== i))}>{t('Hatayein')}</Button>
                )}
                {v.remoteId && (
                  <div className="flex flex-wrap items-center gap-2 text-[0.75rem] sm:col-span-3">
                    <span className="text-slate-500">{t('Remote ID (Foodpanda ko dein):')}</span>
                    <button type="button" onClick={() => copy(v.remoteId!)} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-mono font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-100">
                      {v.remoteId} <Copy className="h-3 w-3 text-slate-400" />
                    </button>
                    {closed ? <Badge size="xs" variant="warning">{t('Foodpanda par band')}</Badge> : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <Button size="sm" variant="secondary" className="mt-3" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setVendors((x) => [...x, { vendorCode: '', shopId: null }])}>{t('Aur branch')}</Button>
      </Section>

      <Section title={t('Order aane par')} help={t('Foodpanda kuch minute me accept na ho to order cancel kar deta hai.')}>
        <div className="divide-y divide-slate-100">
          <div className="pb-3">
            <Switch size="sm" checked={autoAccept} onChange={(e) => setAuto(e.target.checked)} label={t('Order khud accept')}
              description={t('Bill khud ban jaye. Shart: order ke sab items Nafaa products se jure hon aur stock ho — warna order \'Naye\' me ruk jata hai.')} />
          </div>
          <div className="flex flex-wrap items-end gap-3 pt-3">
            <Input size="sm" label={t('Tayyari ka waqt (minute)')} type="number" min={5} max={120} value={prep} onChange={(e) => setPrep(e.target.value)} className="w-28"
              error={prepBad ? t('5 se 120 minute') : undefined} />
            <p className="flex max-w-sm items-center gap-1.5 pb-2 text-[0.75rem] text-slate-500"><Clock className="h-3.5 w-3.5 shrink-0" /> {' '}{t('Accept par Foodpanda ko batate hain ke khana kitni der me tayyar hoga.')}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {channel && <Button size="sm" variant="secondary" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={() => copy(shareText)}>{t('Foodpanda ke liye details copy')}</Button>}
            {channel && <Link to={`/online-orders?channel=${channel.id}`}><Button size="sm" variant="ghost" leftIcon={<Store className="h-3.5 w-3.5" />}>{t('Is ke orders')}</Button></Link>}
          </div>
          <Button size="sm" variant="primary" loading={save.isPending} disabled={!chainCode.trim() || prepBad} leftIcon={<Save className="h-4 w-4" />} onClick={() => save.mutate()}>{t('Mehfooz karein')}</Button>
        </div>
        {channel?.lastMenuImportRequest && (
          <p className="mt-2 text-[0.75rem] text-slate-500">{t('Foodpanda ne {{whenText}} menu maanga — menu Foodpanda portal se hi chalta hai.', { whenText: whenText(channel.lastMenuImportRequest.at) })}</p>
        )}
      </Section>
    </>
  );
}
