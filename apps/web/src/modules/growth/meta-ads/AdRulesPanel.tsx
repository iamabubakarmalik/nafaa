/**
 * Ad rules tab: the shop's rules (ROAS below X → pause, cost per order above
 * X → lower budget, ROAS above X → raise budget, daily spend cap), a dry run,
 * suggestions to apply or dismiss, and the log of every change with undo.
 * Rules use Nafaa's delivered-order ROAS. "Sirf mashwara" is the default;
 * "Khud karein" applies changes within the daily caps.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, FlaskConical, Pencil, Play, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { Badge, Button, Input, Modal, Segmented, Skeleton, Switch, confirmDialog } from '@/design-system/components';
import { t as tr } from '@core/i18n';
import { apiError } from '../api/growth.api';
import { META_ADS_KEY, metaAdsApi, type AdAction, type AdRule, type AdRuleInput, type DryRunAction, type RuleKind, type RuleReason } from '../api/meta-ads.api';
import { roasText, rs } from '../ads/meta';
import { MetaGate, useMetaAdsStatus } from './MetaAdsPanel';

const KIND_DEFAULTS: Record<RuleKind, Omit<AdRuleInput, 'name' | 'kind' | 'campaignIds' | 'mode' | 'enabled'>> = {
  ROAS_PAUSE: { threshold: 1, days: 3, pct: 0, minSpend: 2000 },
  CPA_LOWER: { threshold: 800, days: 3, pct: 20, minSpend: 2000 },
  ROAS_RAISE: { threshold: 3, days: 3, pct: 20, minSpend: 2000 },
  SPEND_CAP: { threshold: 5000, days: 1, pct: 0, minSpend: 0 },
};

const kindLabel = (k: RuleKind) => ({
  ROAS_PAUSE: tr('ROAS kam ho to rokein'),
  CPA_LOWER: tr('Order mehnga ho to budget kam'),
  ROAS_RAISE: tr('ROAS achha ho to budget barhayein'),
  SPEND_CAP: tr('Roz ke kharche ki had'),
}[k]);

export function ruleText(r: Pick<AdRule, 'kind' | 'threshold' | 'days' | 'pct'>) {
  switch (r.kind) {
    case 'ROAS_PAUSE': return tr('{{days}} din ka ROAS {{x}} se kam → campaign rokein', { days: r.days, x: r.threshold });
    case 'CPA_LOWER': return tr('{{days}} din me har delivered order {{amount}} se mehnga → budget {{pct}}% kam', { days: r.days, amount: rs(r.threshold), pct: r.pct });
    case 'ROAS_RAISE': return tr('{{days}} din ka ROAS {{x}} se zyada → budget {{pct}}% barhayein', { days: r.days, x: r.threshold, pct: r.pct });
    case 'SPEND_CAP': return tr('Aaj ka kharcha {{amount}} ho jaye → campaign rokein', { amount: rs(r.threshold) });
  }
}

export function reasonText(r: RuleReason | null) {
  if (!r) return '';
  const base = r.kind === 'SPEND_CAP'
    ? tr('Aaj {{value}} kharch ho chuka (had {{limit}})', { value: rs(r.value ?? 0), limit: rs(r.threshold) })
    : r.kind === 'CPA_LOWER'
      ? tr('{{days}} din: har delivered order {{value}} (had {{limit}}) · {{delivered}} delivered', { days: r.days, value: r.value != null ? rs(r.value) : tr('koi nahi'), limit: rs(r.threshold), delivered: r.delivered })
      : tr('{{days}} din: ROAS {{value}} (had {{limit}}) · kharcha {{spend}}', { days: r.days, value: roasText(r.value), limit: r.threshold, spend: rs(r.spend) });
  return r.held ? `${base} · ${r.held === 'CAP_PCT' ? tr('aaj ki % had poori') : tr('aaj ki tabdeeliyon ki had poori')}` : base;
}

const actionText = (a: { action: string; before: AdAction['before']; after: AdAction['after']; changePct?: number | null }) => {
  if (a.action === 'PAUSE') return tr('Roka');
  if (a.action === 'RESUME') return tr('Chalu kiya');
  if (a.action === 'DUPLICATE') return tr('Copy banayi');
  if (a.action === 'CREATE') return tr('Boost banaya (ruka hua)');
  return tr('Budget {{from}} → {{to}}', { from: a.before?.dailyBudget ?? '—', to: a.after?.dailyBudget ?? '—' });
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'default' | 'danger' | 'info'> = { SUGGESTED: 'info', HELD: 'warning', APPLIED: 'success', FAILED: 'danger', UNDONE: 'default', DISMISSED: 'default' };
const statusLabel = (s: string) => ({ SUGGESTED: tr('Mashwara'), HELD: tr('Had ki wajah se ruka'), APPLIED: tr('Ho gaya'), FAILED: tr('Nahi hua'), UNDONE: tr('Wapas'), DISMISSED: tr('Chhor diya') } as Record<string, string>)[s] ?? s;

export function AdRulesPanel({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const statusQ = useMetaAdsStatus();
  const s = statusQ.data;
  const ready = !!s?.access.live && !!s.connected && !!s.adAccount;
  const rulesQ = useQuery({ queryKey: [META_ADS_KEY, 'rules'], queryFn: metaAdsApi.rules, enabled: ready });
  const actionsQ = useQuery({ queryKey: [META_ADS_KEY, 'actions'], queryFn: () => metaAdsApi.actions(), enabled: ready });
  const [form, setForm] = useState<AdRule | 'new' | null>(null);
  const [dry, setDry] = useState<DryRunAction[] | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: [META_ADS_KEY] });
  const err = (fallback: string) => (e: unknown) => toast.error(apiError(e, fallback));

  const toggle = useMutation({ mutationFn: (r: AdRule) => metaAdsApi.updateRule(r.id, { enabled: !r.enabled }), onSuccess: refresh, onError: err(tr('Nahi hua')) });
  const remove = useMutation({ mutationFn: (id: string) => metaAdsApi.removeRule(id), onSuccess: () => { toast.success(tr('Rule mit gaya')); refresh(); }, onError: err(tr('Nahi mita')) });
  const dryRun = useMutation({ mutationFn: () => metaAdsApi.dryRun(), onSuccess: (r) => setDry(r.actions), onError: err(tr('Check nahi hua')) });
  const run = useMutation({
    mutationFn: metaAdsApi.runRules,
    onSuccess: (r) => { toast.success(tr('{{suggested}} mashwarey, {{applied}} khud hue', { suggested: r.suggested, applied: r.applied })); refresh(); },
    onError: err(tr('Rules nahi chale')),
  });
  const apply = useMutation({ mutationFn: (id: string) => metaAdsApi.apply(id), onSuccess: () => { toast.success(tr('Ho gaya')); refresh(); }, onError: (e) => { err(tr('Nahi hua'))(e); refresh(); } });
  const dismiss = useMutation({ mutationFn: (id: string) => metaAdsApi.dismiss(id), onSuccess: refresh, onError: err(tr('Nahi hua')) });
  const undo = useMutation({ mutationFn: (id: string) => metaAdsApi.undo(id), onSuccess: () => { toast.success(tr('Wapas kar diya')); refresh(); }, onError: err(tr('Wapas nahi hua')) });
  const caps = useMutation({ mutationFn: metaAdsApi.saveSettings, onSuccess: () => { toast.success(tr('Save ho gaya')); refresh(); }, onError: err(tr('Save nahi hua')) });

  if (!ready) return <MetaGate status={s} />;
  const rules = rulesQ.data?.rules ?? [];
  const items = actionsQ.data?.items ?? [];
  const open = items.filter((a) => a.status === 'SUGGESTED' || a.status === 'HELD');
  const log = items.filter((a) => a.status !== 'SUGGESTED' && a.status !== 'HELD');
  const busy = apply.isPending || dismiss.isPending || undo.isPending;

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-900">{tr('Rules')}</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" loading={dryRun.isPending} disabled={!rules.length} onClick={() => dryRun.mutate()} leftIcon={<FlaskConical className="h-4 w-4" />}>{tr('Abhi kya hoga?')}</Button>
            {canManage && <Button variant="secondary" size="sm" loading={run.isPending} disabled={!rules.length} onClick={() => run.mutate()} leftIcon={<Play className="h-4 w-4" />}>{tr('Abhi chalayein')}</Button>}
            {canManage && <Button size="sm" onClick={() => setForm('new')} leftIcon={<Plus className="h-4 w-4" />}>{tr('Naya rule')}</Button>}
          </div>
        </div>
        {rulesQ.isLoading ? <Skeleton className="h-24 rounded-2xl" /> : !rules.length ? (
          <div className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">{tr('Abhi koi rule nahi. Masalan: "3 din ka ROAS 1 se kam ho to campaign rokein".')}</div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rules.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                <Switch checked={r.enabled} disabled={!canManage || toggle.isPending} onChange={() => toggle.mutate(r)} aria-label={tr('On / off')} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-900">{r.name || kindLabel(r.kind)} <Badge variant={r.mode === 'AUTO' ? 'warning' : 'info'} size="sm">{r.mode === 'AUTO' ? tr('Khud karein') : tr('Sirf mashwara')}</Badge></p>
                  <p className="text-[0.75rem] text-slate-500">{ruleText(r)}{r.campaignIds.length ? ` · ${tr('{{count}} campaigns', { count: r.campaignIds.length })}` : ''}</p>
                </div>
                {canManage && <>
                  <button type="button" onClick={() => setForm(r)} aria-label={tr('Badlein')} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={async () => { if (await confirmDialog({ title: tr('Rule mitayein?'), danger: true })) remove.mutate(r.id); }} aria-label={tr('Mitayein')} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                </>}
              </li>
            ))}
          </ul>
        )}
        {s && (
          <div className="flex flex-wrap items-center gap-3 px-1 text-[0.75rem] text-slate-500">
            <span>{tr('"Khud karein" ki had: har campaign ka budget roz {{pct}}% tak, aur roz {{count}} tabdeeliyan.', { pct: s.settings.maxChangePct, count: s.settings.maxActionsPerDay })}</span>
            {canManage && <CapsEditor pct={s.settings.maxChangePct} count={s.settings.maxActionsPerDay} busy={caps.isPending} onSave={(v) => caps.mutate(v)} />}
          </div>
        )}
      </section>

      {dry && (
        <section className="space-y-2 rounded-2xl bg-violet-50/60 p-3 ring-1 ring-violet-200">
          <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-violet-900">{tr('Abhi chalein to (kuch badla nahi)')}</h3><button type="button" onClick={() => setDry(null)} aria-label={tr('Band karein')}><X className="h-4 w-4 text-violet-700" /></button></div>
          {!dry.length ? <p className="text-sm text-violet-800">{tr('Abhi koi tabdeeli nahi banti.')}</p> : dry.map((a) => (
            <p key={`${a.ruleId}-${a.campaignId}`} className="text-[0.8125rem] text-violet-900"><b>{a.campaignName}</b>: {actionText(a)} — {reasonText(a.reason)}</p>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h3 className="font-semibold text-slate-900">{tr('Mashwarey')} {open.length ? <span className="text-slate-500">({open.length})</span> : null}</h3>
        {actionsQ.isLoading ? <Skeleton className="h-20 rounded-2xl" /> : !open.length ? (
          <p className="rounded-2xl bg-white px-4 py-5 text-sm text-slate-500 ring-1 ring-slate-200/80">{tr('Koi naya mashwara nahi. Rules har 3 ghante chalte hain.')}</p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {open.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:px-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-900"><b>{a.objectName}</b>: {actionText(a)} <Badge variant={STATUS_VARIANT[a.status]} size="sm">{statusLabel(a.status)}</Badge></p>
                  <p className="text-[0.75rem] text-slate-500">{reasonText(a.reason)}{a.ruleName ? ` · ${a.ruleName}` : ''}</p>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busy} onClick={() => apply.mutate(a.id)} leftIcon={<Check className="h-4 w-4" />}>{tr('Kar dein')}</Button>
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => dismiss.mutate(a.id)}>{tr('Chhor dein')}</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-slate-900">{tr('Tabdeeliyon ka record')}</h3>
        {!log.length ? <p className="rounded-2xl bg-white px-4 py-5 text-sm text-slate-500 ring-1 ring-slate-200/80">{tr('Abhi koi tabdeeli nahi hui.')}</p> : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {log.slice(0, 50).map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-900"><b>{a.objectName}</b>: {actionText(a)} <Badge variant={STATUS_VARIANT[a.status]} size="sm">{statusLabel(a.status)}</Badge></p>
                  <p className="truncate text-[0.75rem] text-slate-500">
                    {[new Date(a.appliedAt ?? a.createdAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
                      a.source === 'RULE' ? (a.appliedById ? tr('Rule · aap ne kiya') : tr('Rule · khud hua')) : a.source === 'BOOST' ? tr('Boost') : tr('Haath se'),
                      a.error].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {canManage && a.canUndo && <Button size="sm" variant="secondary" disabled={busy} onClick={() => undo.mutate(a.id)} leftIcon={<RotateCcw className="h-4 w-4" />}>{tr('Wapas')}</Button>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {form && <RuleForm rule={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={() => { setForm(null); refresh(); }} />}
    </div>
  );
}

function CapsEditor({ pct, count, busy, onSave }: { pct: number; count: number; busy: boolean; onSave: (v: { maxChangePct: number; maxActionsPerDay: number }) => void }) {
  const [open, setOpen] = useState(false);
  const [p, setP] = useState(String(pct));
  const [c, setC] = useState(String(count));
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="font-medium text-brand-700 hover:underline">{tr('Had badlein')}</button>;
  return (
    <span className="flex items-center gap-2">
      <Input value={p} onChange={(e) => setP(e.target.value)} inputMode="numeric" aria-label={tr('Budget had %')} className="w-16" />%
      <Input value={c} onChange={(e) => setC(e.target.value)} inputMode="numeric" aria-label={tr('Roz ki tabdeeliyan')} className="w-16" />
      <Button size="sm" loading={busy} onClick={() => { onSave({ maxChangePct: Number(p), maxActionsPerDay: Number(c) }); setOpen(false); }}>{tr('Save')}</Button>
    </span>
  );
}

function RuleForm({ rule, onClose, onSaved }: { rule: AdRule | null; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<RuleKind>(rule?.kind ?? 'ROAS_PAUSE');
  const d = KIND_DEFAULTS[kind];
  const [name, setName] = useState(rule?.name ?? '');
  const [threshold, setThreshold] = useState(String(rule?.threshold ?? d.threshold));
  const [days, setDays] = useState(String(rule?.days ?? d.days));
  const [pct, setPct] = useState(String(rule?.pct || d.pct));
  const [minSpend, setMinSpend] = useState(String(rule?.minSpend ?? d.minSpend));
  const [mode, setMode] = useState<'SUGGEST' | 'AUTO'>(rule?.mode ?? 'SUGGEST');
  const pickKind = (k: RuleKind) => {
    setKind(k);
    const x = KIND_DEFAULTS[k];
    setThreshold(String(x.threshold)); setDays(String(x.days)); setPct(String(x.pct)); setMinSpend(String(x.minSpend));
  };
  const body: AdRuleInput = { name: name.trim() || kindLabel(kind), kind, threshold: Number(threshold), days: Number(days), pct: Number(pct), minSpend: Number(minSpend), campaignIds: rule?.campaignIds ?? [], mode, enabled: rule?.enabled ?? true };
  const save = useMutation({
    mutationFn: () => (rule ? metaAdsApi.updateRule(rule.id, body) : metaAdsApi.createRule(body)),
    onSuccess: () => { toast.success(tr('Rule save ho gaya')); onSaved(); },
    onError: (e) => toast.error(apiError(e, tr('Rule save nahi hua'))),
  });
  const budgetRule = kind === 'CPA_LOWER' || kind === 'ROAS_RAISE';
  return (
    <Modal open onClose={onClose} size="md" title={rule ? tr('Rule badlein') : tr('Naya rule')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button loading={save.isPending} disabled={!(Number(threshold) > 0)} onClick={() => save.mutate()}>{tr('Save')}</Button></>}>
      <div className="space-y-3">
        <div className="grid gap-1.5 sm:grid-cols-2">
          {(['ROAS_PAUSE', 'CPA_LOWER', 'ROAS_RAISE', 'SPEND_CAP'] as RuleKind[]).map((k) => (
            <button key={k} type="button" onClick={() => pickKind(k)} className={`rounded-xl px-3 py-2 text-start text-[0.8125rem] ring-1 ${k === kind ? 'bg-brand-50 font-semibold text-brand-900 ring-brand-300' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'}`}>{kindLabel(k)}</button>
          ))}
        </div>
        <Input label={tr('Naam (marzi)')} value={name} onChange={(e) => setName(e.target.value)} placeholder={kindLabel(kind)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label={kind.startsWith('ROAS') ? tr('ROAS had (x)') : kind === 'CPA_LOWER' ? tr('Har delivered order (Rs)') : tr('Roz ka kharcha (Rs)')} inputMode="decimal" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          {kind !== 'SPEND_CAP' && <Input label={tr('Kitne din dekhein')} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />}
          {budgetRule && <Input label={tr('Budget kitna % badle')} inputMode="numeric" value={pct} onChange={(e) => setPct(e.target.value)} />}
          {kind !== 'SPEND_CAP' && <Input label={tr('Kam se kam kharcha (Rs)')} hint={tr('Is se kam kharche par rule kuch nahi karta')} inputMode="numeric" value={minSpend} onChange={(e) => setMinSpend(e.target.value)} />}
        </div>
        <Segmented value={mode} onChange={setMode} label={tr('Kaise chale')} items={[{ value: 'SUGGEST', label: tr('Sirf mashwara') }, { value: 'AUTO', label: tr('Khud karein') }]} />
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">
          {ruleText({ kind, threshold: Number(threshold) || 0, days: Number(days) || 1, pct: Number(pct) || 0 })}. {mode === 'AUTO' ? tr('Nafaa roz ki had ke andar khud karega; har tabdeeli wapas ho sakti hai.') : tr('Nafaa sirf mashwara dega; aap "Kar dein" dabayenge.')}
          {' '}{tr('ROAS sirf deliver hue orders se ginta hai.')}
        </p>
      </div>
    </Modal>
  );
}
