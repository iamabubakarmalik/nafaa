/**
 * Meta ads tab of the Marketing hub: the shop's campaigns from its Facebook
 * ads account with ad sets and ads, Meta's results for the period next to
 * Nafaa's delivered-order ROAS, pause / resume, daily budget, duplicate,
 * the insights pull (replaces CSV for connected shops) and the Boost wizard.
 * Shops without access see an honest "Coming soon" card instead.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Clock, Copy, Megaphone, Pause, Pencil, Play, RefreshCw, Rocket, Settings2 } from 'lucide-react';
import { Alert, Badge, Button, Input, Modal, Skeleton, Switch, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t as tr } from '@core/i18n';
import { apiError } from '../api/growth.api';
import { MARKETING_KEY, type CampaignRow } from '../api/marketing.api';
import { META_ADS_KEY, metaAdsApi, type MetaAdsStatus, type MetaCampaignRow, type MetaStatus } from '../api/meta-ads.api';
import { roasText, rs } from '../ads/meta';
import { BoostWizard } from './BoostWizard';

/** Facebook & Instagram settings page (connect, choose ad account). */
export const FACEBOOK_SETTINGS_PATH = '/settings/facebook';

const money = (n: number | null | undefined, currency: string) => (n == null ? '—' : currency === 'PKR' ? rs(n) : `${currency} ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
const ago = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');

export function useMetaAdsStatus() {
  return useQuery({ queryKey: [META_ADS_KEY, 'status'], queryFn: metaAdsApi.status, staleTime: 60_000 });
}

/** "Coming soon", connect and rate prompts; null when the shop is ready. */
export function MetaGate({ status }: { status: MetaAdsStatus | undefined }) {
  if (!status) return <Skeleton className="h-28 rounded-3xl" />;
  if (!status.access.live) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 text-[0.8125rem] ring-1 ring-slate-200 sm:flex-row sm:items-center">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[0.6875rem] font-semibold text-slate-600 ring-1 ring-slate-200"><Clock className="h-3.5 w-3.5" /> {status.access.reason === 'paused' ? tr('Ruka hua') : tr('Jald')}</span>
        <p className="text-slate-600">
          {status.access.reason === 'paused'
            ? tr('Facebook ads ka kaam Nafaa ne thori der ke liye rok rakha hai. Baad me khud chal jayega; tab tak CSV import ya roz ka kharcha likhein.')
            : tr('Nafaa se ad banana, rokna, budget badalna aur kharcha khud aana — is ke liye Meta ki manzoori chahiye. Manzoori milte hi yahan aa jayega; tab tak CSV import ya roz ka kharcha likhein.')}
        </p>
      </div>
    );
  }
  if (!status.connected || !status.adAccount) {
    return (
      <Alert tone={status.connectionStatus && status.connectionStatus !== 'CONNECTED' ? 'warning' : 'info'}
        title={status.connectionStatus && status.connectionStatus !== 'CONNECTED' ? tr('Facebook se rabta toot gaya') : status.connected ? tr('Ads account chunein') : tr('Facebook se joren')}
        action={<Link to={FACEBOOK_SETTINGS_PATH} className="text-sm font-semibold text-brand-700 hover:underline">{status.connected ? tr('Ads account chunein') : tr('Facebook se joren')}</Link>}>
        {tr('Facebook se jor kar apna ads account chunein — phir campaigns, kharcha aur natije yahan khud aayenge.')}
      </Alert>
    );
  }
  return null;
}

export function MetaAdsPanel({ period, canWrite, canManage, hubCampaigns }: {
  period: { from: string; to: string } | null; canWrite: boolean; canManage: boolean; hubCampaigns: CampaignRow[] | undefined;
}) {
  const qc = useQueryClient();
  const statusQ = useMetaAdsStatus();
  const s = statusQ.data;
  const ready = !!s?.access.live && !!s.connected && !!s.adAccount;
  const overviewQ = useQuery({
    queryKey: [META_ADS_KEY, 'overview', period],
    queryFn: () => metaAdsApi.overview(period!.from, period!.to),
    enabled: ready && !!period,
    placeholderData: (p) => p,
  });
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [budgetFor, setBudgetFor] = useState<{ id: string; name: string; current: number; currency: string } | null>(null);
  const [boosting, setBoosting] = useState(false);
  const refresh = () => [META_ADS_KEY, MARKETING_KEY].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const pull = useMutation({
    mutationFn: () => metaAdsApi.pull(7),
    onSuccess: (r) => { toast.success(tr('Meta se kharcha aa gaya: {{added}} naye, {{changed}} badle', { added: r.added, changed: r.changed })); refresh(); },
    onError: (e) => { toast.error(apiError(e, tr('Meta se kharcha nahi aaya'))); refresh(); },
  });
  const settings = useMutation({
    mutationFn: metaAdsApi.saveSettings,
    onSuccess: () => { toast.success(tr('Save ho gaya')); qc.invalidateQueries({ queryKey: [META_ADS_KEY, 'status'] }); },
    onError: (e) => toast.error(apiError(e, tr('Save nahi hua'))),
  });
  const status = useMutation({
    mutationFn: ({ id, to }: { id: string; to: 'ACTIVE' | 'PAUSED' }) => metaAdsApi.setStatus(id, to),
    onSuccess: (_r, v) => { toast.success(v.to === 'PAUSED' ? tr('Rok diya') : tr('Chalu kar diya')); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Nahi hua'))),
  });
  const dup = useMutation({
    mutationFn: (id: string) => metaAdsApi.duplicate(id),
    onSuccess: () => { toast.success(tr('Copy ban gayi — ruki hui hai, dekh kar chalu karein')); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Copy nahi bani'))),
  });

  const gate = <MetaGate status={s} />;
  if (!ready) return gate;
  const ov = overviewQ.data;
  const cur = s!.adAccount!.currency;
  const ours = new Map((hubCampaigns ?? []).filter((c) => c.platform === 'META' && c.name).map((c) => [c.name!.trim().toLowerCase(), c]));
  const askDup = async (c: { id: string; name: string }) => {
    if (await confirmDialog({ title: tr('"{{name}}" ki copy banayein?', { name: c.name }), text: tr('Copy ruki hui banegi; aap dekh kar chalu karein.') })) dup.mutate(c.id);
  };
  const toggle = (id: string, st: MetaStatus) => status.mutate({ id, to: st === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200/80 sm:flex-row sm:items-center sm:p-4">
        <div className="min-w-0 flex-1 text-[0.8125rem]">
          <p className="font-semibold text-slate-900">{s!.adAccount!.name} <span className="font-normal text-slate-500">· {cur}</span></p>
          <p className="mt-0.5 text-slate-600">
            {tr('Kharcha har 3 ghante Meta se khud aata hai (CSV ki zaroorat nahi). Aakhri dafa: {{at}}', { at: ago(s!.settings.lastPullAt) })}
          </p>
          {s!.settings.lastPullError && <p className="mt-1 text-rose-600">{s!.settings.lastPullError}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-[0.8125rem] text-slate-700">
            <Switch checked={s!.settings.autoPull} disabled={!canManage || settings.isPending} onChange={(e) => settings.mutate({ autoPull: e.target.checked })} aria-label={tr('Kharcha khud laayein')} />
            {tr('Khud laayein')}
          </label>
          {canWrite && <Button variant="secondary" size="sm" loading={pull.isPending} onClick={() => pull.mutate()} leftIcon={<RefreshCw className="h-4 w-4" />}>{tr('Abhi laayein')}</Button>}
          {canManage && <Button size="sm" onClick={() => setBoosting(true)} leftIcon={<Rocket className="h-4 w-4" />}>{tr('Product boost karein')}</Button>}
        </div>
      </div>

      {s!.needsRate && <RateCard currency={cur} canManage={canManage} busy={settings.isPending} onSave={(fxRate) => settings.mutate({ fxRate })} />}

      {!ov ? <Skeleton className="h-64 rounded-3xl" /> : !ov.campaigns.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <Megaphone className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{tr('Is ads account me koi campaign nahi')}</p>
          {canManage && <Button className="mt-4" onClick={() => setBoosting(true)} leftIcon={<Rocket className="h-4 w-4" />}>{tr('Pehla product boost karein')}</Button>}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {ov.campaigns.map((c) => (
            <CampaignItem key={c.id} c={c} currency={cur} ours={ours.get(c.name.trim().toLowerCase())} open={!!open[c.id]} onOpen={() => setOpen((o) => ({ ...o, [c.id]: !o[c.id] }))}
              canWrite={canWrite} busy={status.isPending || dup.isPending}
              onToggle={toggle} onBudget={(id, name, current) => setBudgetFor({ id, name, current, currency: cur })} onDuplicate={askDup} />
          ))}
        </ul>
      )}
      <p className="px-1 text-[0.75rem] text-slate-500">{tr('"Nafaa ROAS" sirf deliver hue orders ginta hai; "Meta ROAS" Meta ki apni ginti hai (RTO bhi shamil).')}</p>

      {budgetFor && <BudgetDialog target={budgetFor} onClose={() => setBudgetFor(null)} onDone={() => { setBudgetFor(null); refresh(); }} />}
      {boosting && <BoostWizard onClose={() => setBoosting(false)} onDone={() => refresh()} />}
    </div>
  );
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'default' | 'danger'> = { ACTIVE: 'success', PAUSED: 'default', WITH_ISSUES: 'danger', DISAPPROVED: 'danger', IN_PROCESS: 'warning', PENDING_REVIEW: 'warning' };
const statusLabel = (s: string) => ({ ACTIVE: tr('Chal raha'), PAUSED: tr('Ruka hua'), CAMPAIGN_PAUSED: tr('Campaign ruki'), ADSET_PAUSED: tr('Ad set ruka'), WITH_ISSUES: tr('Masla hai'), DISAPPROVED: tr('Mana hua'), IN_PROCESS: tr('Check ho raha'), PENDING_REVIEW: tr('Check ho raha') } as Record<string, string>)[s] ?? s;

function CampaignItem({ c, currency, ours, open, onOpen, canWrite, busy, onToggle, onBudget, onDuplicate }: {
  c: MetaCampaignRow; currency: string; ours: CampaignRow | undefined; open: boolean; onOpen: () => void; canWrite: boolean; busy: boolean;
  onToggle: (id: string, s: MetaStatus) => void; onBudget: (id: string, name: string, current: number) => void; onDuplicate: (c: { id: string; name: string }) => void;
}) {
  const actions = (id: string, name: string, st: MetaStatus, budget: number | null, copy: boolean) => canWrite && (
    <div className="flex shrink-0 gap-1">
      <button type="button" disabled={busy} onClick={() => onToggle(id, st)} title={st === 'ACTIVE' ? tr('Rokein') : tr('Chalu karein')} aria-label={st === 'ACTIVE' ? tr('Rokein') : tr('Chalu karein')}
        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">{st === 'ACTIVE' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
      {budget !== null && <button type="button" disabled={busy} onClick={() => onBudget(id, name, budget)} title={tr('Budget badlein')} aria-label={tr('Budget badlein')} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><Pencil className="h-4 w-4" /></button>}
      {copy && <button type="button" disabled={busy} onClick={() => onDuplicate({ id, name })} title={tr('Copy banayein')} aria-label={tr('Copy banayein')} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><Copy className="h-4 w-4" /></button>}
    </div>
  );
  return (
    <li>
      <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
        <button type="button" onClick={onOpen} aria-label={open ? tr('Band karein') : tr('Kholein')} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-semibold text-slate-900">{c.name}</span>
            <Badge variant={STATUS_VARIANT[c.effectiveStatus] ?? STATUS_VARIANT[c.status] ?? 'default'} size="sm">{statusLabel(c.effectiveStatus)}</Badge>
          </p>
          <p className="mt-0.5 truncate text-[0.75rem] text-slate-500">
            {[c.dailyBudget != null ? tr('{{amount}} roz', { amount: money(c.dailyBudget, currency) }) : c.budgetLevel === 'ADSET' ? tr('Budget ad set par') : null,
              tr('{{count}} kharid', { count: c.purchases }), c.cpa != null ? tr('{{amount}} har kharid', { amount: money(c.cpa, currency) }) : null,
              c.ctr != null ? `CTR ${c.ctr}%` : null].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="hidden text-end text-[0.75rem] sm:block">
          <p className="text-base font-bold tabular-nums text-slate-900">{money(c.spend, currency)}</p>
          <p className="text-slate-500">{tr('Meta ROAS {{v}}', { v: roasText(c.metaRoas) })} · <span className={cn('font-semibold', ours?.roas == null ? 'text-slate-400' : ours.roas >= 1.5 ? 'text-success-700' : 'text-rose-600')}>{tr('Nafaa ROAS {{v}}', { v: roasText(ours?.roas) })}</span></p>
        </div>
        {actions(c.id, c.name, c.status, c.dailyBudget, true)}
      </div>
      {open && (
        <ul className="border-t border-slate-100 bg-slate-50/60">
          {!c.adSets.length && <li className="px-12 py-3 text-[0.8125rem] text-slate-500">{tr('Koi ad set nahi')}</li>}
          {c.adSets.map((a) => (
            <li key={a.id} className="border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-3 py-2.5 pe-3 ps-12 sm:pe-4">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[0.8125rem]"><span className="truncate font-medium text-slate-800">{a.name}</span><Badge variant={STATUS_VARIANT[a.effectiveStatus] ?? 'default'} size="sm">{statusLabel(a.effectiveStatus)}</Badge></p>
                  <p className="text-[0.75rem] text-slate-500">{a.dailyBudget != null ? tr('{{amount}} roz', { amount: money(a.dailyBudget, currency) }) : tr('Campaign ka budget')} · {tr('{{count}} ads', { count: a.ads.length })}</p>
                </div>
                {actions(a.id, a.name, a.status, a.dailyBudget, true)}
              </div>
              {a.ads.map((ad) => (
                <div key={ad.id} className="flex items-center gap-3 py-2 pe-3 ps-16 sm:pe-4">
                  {ad.thumbnail ? <img src={ad.thumbnail} alt="" className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-200" /> : <span className="h-8 w-8 rounded-lg bg-slate-200" />}
                  <p className="min-w-0 flex-1 truncate text-[0.8125rem] text-slate-700">{ad.name}</p>
                  <Badge variant={STATUS_VARIANT[ad.effectiveStatus] ?? 'default'} size="sm">{statusLabel(ad.effectiveStatus)}</Badge>
                  {actions(ad.id, ad.name, ad.status, null, false)}
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function RateCard({ currency, canManage, busy, onSave }: { currency: string; canManage: boolean; busy: boolean; onSave: (rate: number) => void }) {
  const [v, setV] = useState('');
  return (
    <Alert tone="warning" title={tr('Ads account {{currency}} me hai', { currency })} icon={<Settings2 className="h-4 w-4" />}
      action={canManage ? (
        <div className="flex items-center gap-2">
          <Input value={v} onChange={(e) => setV(e.target.value)} inputMode="decimal" placeholder="280" aria-label={tr('Rate')} className="w-24" />
          <Button size="sm" loading={busy} disabled={!(Number(v) > 0)} onClick={() => onSave(Number(v))}>{tr('Save')}</Button>
        </div>
      ) : undefined}>
      {tr('1 {{currency}} kitne rupay ka hai? Is rate se kharcha rupay me likha jayega.', { currency })}
    </Alert>
  );
}

function BudgetDialog({ target, onClose, onDone }: { target: { id: string; name: string; current: number; currency: string }; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState(String(target.current));
  const save = useMutation({
    mutationFn: () => metaAdsApi.setBudget(target.id, Math.round(Number(v))),
    onSuccess: () => { toast.success(tr('Budget badal gaya')); onDone(); },
    onError: (e) => toast.error(apiError(e, tr('Budget nahi badla'))),
  });
  const n = Number(v);
  const pct = target.current > 0 && n > 0 ? Math.round(((n - target.current) / target.current) * 100) : 0;
  return (
    <Modal open onClose={onClose} title={tr('Roz ka budget')} description={target.name} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button loading={save.isPending} disabled={!(n > 0) || n === target.current} onClick={() => save.mutate()}>{tr('Save')}</Button></>}>
      <div className="space-y-2">
        <Input value={v} onChange={(e) => setV(e.target.value)} inputMode="numeric" aria-label={tr('Roz ka budget')} />
        <div className="flex flex-wrap gap-1.5">
          {[-20, -10, 10, 20].map((p) => (
            <button key={p} type="button" onClick={() => setV(String(Math.round(target.current * (1 + p / 100))))} className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.75rem] font-medium text-slate-700 hover:bg-slate-200">{p > 0 ? `+${p}%` : `${p}%`}</button>
          ))}
        </div>
        <p className="text-[0.75rem] text-slate-500">{tr('Pehle {{from}} · tabdeeli {{pct}}%. Meta ko bara budget badlao dobara seekhne par majboor karta hai — 20% se kam behtar hai.', { from: money(target.current, target.currency), pct })}</p>
      </div>
    </Modal>
  );
}
