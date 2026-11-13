/**
 * Settings (/social/settings): approval rules, the pause-all switch, best
 * times, hashtag sets, pillars, campaigns, brand voice and link tags; the
 * content-pack import with its report; Nafaa AI month ideas; and the
 * automation keys an AI marketer uses to send drafts.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, AppWindow, Bot, CheckCircle2, Copy, ExternalLink, FileArchive, KeyRound, Pause, Play, Plus, Save, Sparkles, Trash2, UploadCloud, X, XCircle,
} from 'lucide-react';
import { Alert, Badge, Button, Card, Input, Modal, PageHero, PageShell, Skeleton, Switch, Textarea, confirmDialog, heroPrimaryButton } from '@/design-system/components';
import {
  AUTOMATION_SCOPES, brandSocialApi, SOCIAL_PLATFORMS, type AutomationScope, type CreatedKey, type ImportReport, type PlatformApp, type SocialPlatform, type SocialSettings,
} from '@/api/admin-brand-social.api';
import { useCan } from '@/lib/access';
import { cn } from '@/lib/cn';
import { apiError } from '@/lib/errors';
import { PLATFORM, PlatformMark } from '../lib/platforms';
import { copyText, normaliseTags, parseTags, slug } from '../lib/post';
import { KEYS, useInvalidate, useSettings } from '../lib/queries';
import { addMonths, fmtDateTime, fmtMonth, hhmmLabel, pkToday, relative } from '../lib/time';
import { LoadError, PostStatusBadge } from '../components/SocialUi';

const smallInput = 'h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-[0.8125rem] text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60';

export default function SettingsPage() {
  const q = useSettings();
  const can = useCan();
  const canSet = can('social.settings');
  const invalidate = useInvalidate();
  const [draft, setDraft] = useState<SocialSettings | null>(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (q.data && !dirty) setDraft(q.data); }, [q.data, dirty]);
  const set = <K extends keyof SocialSettings>(k: K, v: SocialSettings[K]) => { setDraft((d) => (d ? { ...d, [k]: v } : d)); setDirty(true); };

  const save = useMutation({
    mutationFn: (body: Partial<SocialSettings>) => brandSocialApi.saveSettings(body),
    onSuccess: (r) => { setDraft(r); setDirty(false); invalidate(); toast.success('Settings saved'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const pause = useMutation({
    mutationFn: async (paused: boolean) => {
      const ok = await confirmDialog(paused
        ? { title: 'Pause all publishing?', text: 'Nothing goes out to any platform and no job calls Meta until you switch it back on. Scheduled posts wait.', yes: 'Pause everything', danger: true }
        : { title: 'Resume publishing?', text: 'Posts that became due while paused go out on the next run, within a minute.', yes: 'Resume' });
      return ok ? brandSocialApi.saveSettings({ ...q.data!, paused }) : null;
    },
    onSuccess: (r) => { if (r) { setDraft((d) => (d ? { ...d, paused: r.paused, pausedAt: r.pausedAt } : r)); invalidate(); toast.success(r.paused ? 'Publishing paused' : 'Publishing resumed'); } },
    onError: (e) => toast.error(apiError(e)),
  });

  const d = draft;
  return (
    <PageShell>
      <PageHero
        title="Social settings"
        busy={q.isFetching}
        loading={q.isLoading}
        meta={dirty ? 'Unsaved changes' : undefined}
        actions={canSet && d && (
          <button type="button" className={cn(heroPrimaryButton, 'disabled:cursor-not-allowed disabled:opacity-50')} disabled={!dirty || save.isPending} onClick={() => save.mutate(d)}><Save className="h-4 w-4" />Save</button>
        )}
      />
      {!canSet && <Alert tone="info" title="View only">Changing these needs the "Social settings" permission.</Alert>}

      {q.error ? <LoadError error={q.error} onRetry={() => q.refetch()} what="settings" /> : !d ? (
        <div className="grid gap-4 lg:grid-cols-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
      ) : (
        <>
          {/* Kill switch */}
          <div className={cn('flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3.5 ring-1', d.paused ? 'bg-rose-50 ring-rose-200' : 'bg-success-50 ring-success-200')}>
            {d.paused ? <Pause className="h-5 w-5 text-rose-600" /> : <Play className="h-5 w-5 text-success-600" />}
            <div className="min-w-0 flex-1">
              <p className={cn('text-[0.9375rem] font-bold', d.paused ? 'text-rose-900' : 'text-success-900')}>{d.paused ? 'Publishing is paused' : 'Publishing is on'}</p>
              <p className={cn('text-[0.8125rem]', d.paused ? 'text-rose-800' : 'text-success-800')}>{d.paused ? `Paused ${d.pausedAt ? relative(d.pausedAt) : ''}. Nothing goes out until it is resumed.` : 'Approved posts go out at their time. Pause stops everything at once.'}</p>
            </div>
            {canSet && <Button variant={d.paused ? 'success' : 'danger'} loading={pause.isPending} leftIcon={d.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} onClick={() => pause.mutate(!d.paused)}>{d.paused ? 'Resume publishing' : 'Pause all publishing'}</Button>}
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Card title="Approval">
              <div className="space-y-4">
                <Switch label="Every post needs approval" description="Drafts wait in Approvals until someone with the approve permission says yes." checked={d.requireApproval} disabled={!canSet} onChange={(e) => set('requireApproval', e.target.checked)} />
                <Switch label="Approve AI drafts on their own" description="Posts written by Nafaa AI or the AI marketer skip review. Leave off unless you trust every draft." checked={d.autoApproveAiDrafts} disabled={!canSet} onChange={(e) => set('autoApproveAiDrafts', e.target.checked)} />
              </div>
            </Card>

            <Card title="Brand voice" description="Nafaa AI writes captions in this voice.">
              <Textarea rows={5} value={d.brandVoice} disabled={!canSet} placeholder="Friendly, simple Roman Urdu with English business words. Speak to shop owners…" onChange={(e) => set('brandVoice', e.target.value)} />
            </Card>

            <Card title="Best times" description="Suggested in the composer, Pakistan time.">
              <BestTimes value={d.bestTimes} onChange={(v) => set('bestTimes', v)} disabled={!canSet} />
            </Card>

            <Card title="Hashtag sets" description="One click adds a set in the composer.">
              <HashtagSets value={d.hashtagSets} onChange={(v) => set('hashtagSets', v)} disabled={!canSet} />
            </Card>

            <Card title="Pillars" description="Content themes; the colour marks posts on the calendar.">
              <Pillars value={d.pillars} onChange={(v) => set('pillars', v)} disabled={!canSet} />
            </Card>

            <Card title="Campaigns and link tags" description="Campaign keys go into utm_campaign on every tracked link.">
              <Campaigns value={d.campaigns} onChange={(v) => set('campaigns', v)} disabled={!canSet} />
              <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <Input label="utm_medium" value={d.utm.medium} disabled={!canSet} onChange={(e) => set('utm', { ...d.utm, medium: e.target.value })} />
                <Input label="Default campaign" hint="Used when a post has none" value={d.utm.defaultCampaign} disabled={!canSet} onChange={(e) => set('utm', { ...d.utm, defaultCampaign: e.target.value })} />
                <Input label="Meta ad account" hint="Digits only, for the Ads page" value={d.adAccountId ?? ''} disabled={!canSet} placeholder="1154105040370350" onChange={(e) => set('adAccountId', e.target.value.replace(/\D/g, '') || null)} wrapperClassName="sm:col-span-2" />
              </div>
            </Card>
          </div>

          {dirty && canSet && (
            <div className="sticky bottom-4 z-20 flex items-center justify-end gap-2 rounded-2xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
              <span className="me-auto text-[0.8125rem] font-medium text-slate-700">You have unsaved changes</span>
              <Button variant="secondary" onClick={() => { setDraft(q.data!); setDirty(false); }}>Discard</Button>
              <Button loading={save.isPending} leftIcon={<Save className="h-4 w-4" />} onClick={() => save.mutate(d)}>Save</Button>
            </div>
          )}

          <div className="grid items-start gap-4 lg:grid-cols-2">
            {can('social.edit') && <ImportPack />}
            {can('social.edit') && <AiPlan pillars={d.pillars.map((p) => p.key)} />}
          </div>
          {canSet && <PlatformApps />}
          {canSet && <AutomationKeys />}
        </>
      )}
    </PageShell>
  );
}

// ─── Editors ─────────────────────────────────────────────────────────────

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200">
      <span className="shrink-0 text-[0.6875rem] font-medium text-slate-500">{label}</span>
      <code className="min-w-0 flex-1 truncate text-[0.75rem] text-slate-700" title={value}>{value}</code>
      <button type="button" onClick={async () => { if (await copyText(value)) toast.success('Copied'); }} className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label={`Copy ${label}`}><Copy className="h-3.5 w-3.5" /></button>
    </div>
  );
}

/** Developer apps for Threads, YouTube, TikTok, X and Pinterest. Secrets are stored encrypted and never shown again. */
function PlatformApps() {
  const q = useQuery({ queryKey: [...KEYS.all, 'apps'], queryFn: brandSocialApi.apps });
  return (
    <div id="platform-apps">
      <Card title={<span className="flex items-center gap-2"><AppWindow className="h-4 w-4 text-sky-600" />Platform apps</span>}
        description="Each platform needs its own developer app before its account can be connected. Paste the app's id and secret here; the secret is stored encrypted and never shown again.">
        {q.error ? <p className="text-[0.8125rem] text-rose-600">{apiError(q.error, 'Could not load the apps.')}</p>
          : q.isLoading ? <Skeleton className="h-40 rounded-xl" />
            : <div className="grid gap-3 lg:grid-cols-2">{(q.data ?? []).map((a) => <PlatformAppRow key={a.platform} app={a} />)}</div>}
      </Card>
    </div>
  );
}

function PlatformAppRow({ app }: { app: PlatformApp }) {
  const invalidate = useInvalidate();
  const [clientId, setClientId] = useState(app.clientId ?? '');
  const [secret, setSecret] = useState('');
  useEffect(() => { setClientId(app.clientId ?? ''); }, [app.clientId]);
  const saved = !!app.clientId && app.secretSet;
  const changed = clientId.trim() !== (app.clientId ?? '') || !!secret.trim();
  const save = useMutation({
    mutationFn: () => brandSocialApi.saveApp(app.platform, { clientId: clientId.trim(), clientSecret: secret.trim() || undefined }),
    onSuccess: () => { setSecret(''); toast.success(`${PLATFORM[app.platform].label} app saved`); invalidate(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: async () => {
      const ok = await confirmDialog({ title: `Remove the ${PLATFORM[app.platform].label} app?`, text: 'Connected accounts stop refreshing their tokens and cannot be reconnected until an app is saved again.', yes: 'Remove', danger: true });
      return ok ? brandSocialApi.removeApp(app.platform) : null;
    },
    onSuccess: (r) => { if (r) { setClientId(''); setSecret(''); toast.success('App removed'); invalidate(); } },
    onError: (e) => toast.error(apiError(e)),
  });
  return (
    <div className="space-y-2.5 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <div className="flex items-center gap-2">
        <PlatformMark p={app.platform} size={20} />
        <b className="flex-1 text-[0.875rem] text-slate-900">{PLATFORM[app.platform].label}</b>
        <Badge size="xs" variant={saved ? 'success' : 'default'} dot>{saved ? 'Saved' : 'Not saved'}</Badge>
        <a href={app.consoleUrl} target="_blank" rel="noreferrer" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Open the developer console"><ExternalLink className="h-3.5 w-3.5" /></a>
      </div>
      <p className="text-[0.75rem] leading-relaxed text-slate-500">{app.howTo}</p>
      <CopyRow label="Redirect URI" value={app.redirectUri} />
      {app.extraUrls.map((u) => <CopyRow key={u.label} label={u.label} value={u.url} />)}
      <div className="grid gap-2 sm:grid-cols-2">
        <Input size="sm" label={app.idLabel} value={clientId} autoComplete="off" spellCheck={false} onChange={(e) => setClientId(e.target.value)} />
        <Input size="sm" label="Secret" type="password" autoComplete="new-password" value={secret} placeholder={app.secretSet ? 'Saved (leave empty to keep)' : ''} onChange={(e) => setSecret(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        {app.updatedAt && <span className="text-[0.6875rem] text-slate-400">Updated {relative(app.updatedAt)}</span>}
        {saved && <Button size="xs" variant="ghost" className="ms-auto text-rose-600" loading={remove.isPending} leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => remove.mutate()}>Remove</Button>}
        <Button size="xs" className={saved ? '' : 'ms-auto'} disabled={!changed || !clientId.trim() || (!app.secretSet && !secret.trim())} loading={save.isPending} onClick={() => save.mutate()}>Save</Button>
      </div>
    </div>
  );
}

function BestTimes({ value, onChange, disabled }: { value: SocialSettings['bestTimes']; onChange: (v: SocialSettings['bestTimes']) => void; disabled: boolean }) {
  const [adding, setAdding] = useState<Partial<Record<SocialPlatform, string>>>({});
  const add = (p: SocialPlatform) => {
    const t = adding[p];
    if (!t || !/^\d{2}:\d{2}$/.test(t)) return;
    onChange({ ...value, [p]: [...new Set([...(value[p] ?? []), t])].sort() });
    setAdding({ ...adding, [p]: '' });
  };
  return (
    <ul className="divide-y divide-slate-100">
      {SOCIAL_PLATFORMS.map((p) => (
        <li key={p} className="flex flex-wrap items-center gap-2 py-2">
          <span className="flex w-36 items-center gap-2 text-[0.8125rem] font-medium text-slate-800"><PlatformMark p={p} size={16} />{PLATFORM[p].label}</span>
          <span className="flex flex-1 flex-wrap items-center gap-1">
            {(value[p] ?? []).map((t) => (
              <span key={t} className="inline-flex h-6 items-center gap-1 rounded-full bg-amber-50 ps-2 pe-1 text-[0.75rem] font-semibold text-amber-800 ring-1 ring-amber-200">
                {hhmmLabel(t)}
                {!disabled && <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange({ ...value, [p]: (value[p] ?? []).filter((x) => x !== t) })} className="rounded-full p-0.5 hover:bg-amber-100"><X className="h-3 w-3" /></button>}
              </span>
            ))}
            {!disabled && (
              <span className="inline-flex items-center gap-1">
                <input type="time" step={900} value={adding[p] ?? ''} onChange={(e) => setAdding({ ...adding, [p]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') add(p); }} className={cn(smallInput, 'h-7 w-[6.5rem] px-1.5 text-[0.75rem]')} aria-label={`Add time for ${PLATFORM[p].label}`} />
                <button type="button" disabled={!adding[p]} onClick={() => add(p)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-40" aria-label="Add"><Plus className="h-4 w-4" /></button>
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function HashtagSets({ value, onChange, disabled }: { value: SocialSettings['hashtagSets']; onChange: (v: SocialSettings['hashtagSets']) => void; disabled: boolean }) {
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  return (
    <div className="space-y-2">
      {!value.length && <p className="text-[0.8125rem] text-slate-500">No sets yet.</p>}
      {value.map((s, i) => (
        <div key={i} className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200">
          <div className="flex items-center gap-2">
            <input value={s.name} disabled={disabled} onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} className={cn(smallInput, 'h-8 flex-1 font-semibold')} aria-label="Set name" />
            <span className="text-[0.75rem] text-slate-500">{s.tags.length} tags</span>
            {!disabled && <button type="button" aria-label="Remove set" onClick={() => onChange(value.filter((_, k) => k !== i))} className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
          </div>
          <textarea key={`${i}-${s.tags.join(',')}`} rows={2} disabled={disabled} defaultValue={normaliseTags(s.tags).join(' ')} onBlur={(e) => onChange(value.map((x, k) => (k === i ? { ...x, tags: parseTags(e.target.value).map((t) => t.slice(1)) } : x)))}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[0.8125rem] text-brand-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" aria-label="Tags" />
        </div>
      ))}
      {!disabled && (
        <div className="flex flex-wrap gap-2 pt-1">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Set name" className={cn(smallInput, 'w-36')} />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="#pos #pakistan #khata" className={cn(smallInput, 'min-w-[10rem] flex-1')} />
          <Button size="sm" variant="secondary" disabled={!name.trim() || !parseTags(tags).length} leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => { onChange([...value, { name: name.trim(), tags: parseTags(tags).map((t) => t.slice(1)) }]); setName(''); setTags(''); }}>Add set</Button>
        </div>
      )}
    </div>
  );
}

const SWATCHES = ['#4f46e5', '#0d9488', '#d97706', '#db2777', '#0284c7', '#16a34a', '#7c3aed', '#e11d48'];

function Pillars({ value, onChange, disabled }: { value: SocialSettings['pillars']; onChange: (v: SocialSettings['pillars']) => void; disabled: boolean }) {
  const [label, setLabel] = useState('');
  return (
    <div className="space-y-2">
      {!value.length && <p className="text-[0.8125rem] text-slate-500">No pillars yet. Add themes like "Tips", "Customer stories", "Product".</p>}
      {value.map((p, i) => (
        <div key={p.key} className="flex items-center gap-2">
          <label className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-slate-300" style={{ background: p.color }} title="Colour">
            <input type="color" value={p.color} disabled={disabled} onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, color: e.target.value } : x)))} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
          <input value={p.label} disabled={disabled} onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} className={cn(smallInput, 'flex-1')} aria-label="Pillar name" />
          <code className="hidden w-28 truncate text-[0.6875rem] text-slate-400 sm:block">{p.key}</code>
          {!disabled && <button type="button" aria-label="Remove pillar" onClick={() => onChange(value.filter((_, k) => k !== i))} className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
        </div>
      ))}
      {!disabled && (
        <div className="flex gap-2 pt-1">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="New pillar" className={cn(smallInput, 'flex-1')}
            onKeyDown={(e) => { if (e.key === 'Enter' && label.trim() && !value.some((p) => p.key === slug(label))) { onChange([...value, { key: slug(label), label: label.trim(), color: SWATCHES[value.length % SWATCHES.length] }]); setLabel(''); } }} />
          <Button size="sm" variant="secondary" disabled={!label.trim() || value.some((p) => p.key === slug(label))} leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => { onChange([...value, { key: slug(label), label: label.trim(), color: SWATCHES[value.length % SWATCHES.length] }]); setLabel(''); }}>Add</Button>
        </div>
      )}
    </div>
  );
}

function Campaigns({ value, onChange, disabled }: { value: SocialSettings['campaigns']; onChange: (v: SocialSettings['campaigns']) => void; disabled: boolean }) {
  const [label, setLabel] = useState('');
  return (
    <div className="space-y-2">
      {!value.length && <p className="text-[0.8125rem] text-slate-500">No campaigns yet.</p>}
      {value.map((c, i) => (
        <div key={c.key} className="flex items-center gap-2">
          <input value={c.label} disabled={disabled} onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} className={cn(smallInput, 'flex-1')} aria-label="Campaign name" />
          <code className="hidden w-32 truncate text-[0.6875rem] text-slate-400 sm:block" title="utm_campaign">{c.key}</code>
          <Switch size="sm" checked={c.active} disabled={disabled} aria-label="Active" onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, active: e.target.checked } : x)))} />
          {!disabled && <button type="button" aria-label="Remove campaign" onClick={() => onChange(value.filter((_, k) => k !== i))} className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
        </div>
      ))}
      {!disabled && (
        <div className="flex gap-2 pt-1">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. November khata push" className={cn(smallInput, 'flex-1')} />
          <Button size="sm" variant="secondary" disabled={!label.trim() || value.some((c) => c.key === slug(label))} leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => { onChange([...value, { key: slug(label), label: label.trim(), active: true }]); setLabel(''); }}>Add</Button>
        </div>
      )}
    </div>
  );
}

// ─── Content pack import ────────────────────────────────────────────────

function ImportPack() {
  const invalidate = useInvalidate();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [over, setOver] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const run = useMutation({
    mutationFn: (f: File) => { setProgress(0); return brandSocialApi.importPack(f, setProgress); },
    onSuccess: (r) => { setReport(r); setFile(null); invalidate(); toast.success(`${r.created.length} post${r.created.length === 1 ? '' : 's'} imported`); },
    onError: (e) => toast.error(apiError(e, 'The pack could not be imported.')),
  });
  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!/\.zip$/i.test(f.name)) { toast.error('Choose a .zip file with pack.json inside.'); return; }
    if (f.size > 300 * 1024 * 1024) { toast.error('The zip is over 300 MB.'); return; }
    setFile(f);
    setReport(null);
  };
  return (
    <Card title={<span className="flex items-center gap-2"><FileArchive className="h-4 w-4 text-slate-500" />Import content pack</span>} description="A zip with pack.json and the media files. Posts arrive in review (or scheduled when approval is off).">
      <div
        role="button" tabIndex={0}
        onClick={() => !run.isPending && input.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter') input.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}
        className={cn('flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition', over ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400')}
      >
        <UploadCloud className="h-6 w-6 text-brand-600" />
        <p className="text-[0.8125rem] font-semibold text-slate-800">{file ? file.name : 'Drop the zip here or click to choose'}</p>
        <p className="text-[0.75rem] text-slate-500">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'Up to 300 MB'}</p>
        <input ref={input} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      {run.isPending && (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.max(3, progress)}%` }} /></div>
          <p className="mt-1 text-[0.75rem] text-slate-500">{progress < 100 ? `Uploading ${progress}%` : 'Reading the pack and saving media… this can take a few minutes.'}</p>
        </div>
      )}
      {file && !run.isPending && <div className="mt-3 flex justify-end gap-2"><Button variant="secondary" onClick={() => setFile(null)}>Cancel</Button><Button leftIcon={<UploadCloud className="h-4 w-4" />} onClick={() => run.mutate(file)}>Import</Button></div>}
      {report && <ImportResult report={report} />}
      <details className="mt-3 text-[0.75rem] text-slate-500">
        <summary className="cursor-pointer font-medium text-slate-600">pack.json format</summary>
        <pre className="mt-1.5 overflow-x-auto rounded-lg bg-slate-50 p-2.5 text-[0.6875rem] leading-relaxed text-slate-700 ring-1 ring-slate-200">{`{
  "campaign": "nov-khata",
  "posts": [{
    "title": "Khata reminder reel",
    "kind": "REEL", "pillar": "tips",
    "caption": "…", "captions": { "X": "…" },
    "hashtags": ["nafaa", "khata"],
    "firstComment": "…", "link": "https://nafaa.pk/khata",
    "platforms": ["INSTAGRAM", "FACEBOOK", "TIKTOK"],
    "scheduledAt": "2026-11-20T19:30",
    "media": ["reels/khata.mp4"], "notes": "…"
  }]
}`}</pre>
      </details>
    </Card>
  );
}

function ImportResult({ report }: { report: ImportReport }) {
  return (
    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="success" dot>{report.created.length} created</Badge>
        {report.skipped.length > 0 && <Badge variant="warning" dot>{report.skipped.length} skipped</Badge>}
        <Badge variant="default">{report.assets.uploaded} files saved</Badge>
        {report.assets.failed.length > 0 && <Badge variant="danger" dot>{report.assets.failed.length} files failed</Badge>}
        {report.campaign && <Badge variant="outline">Campaign: {report.campaign}</Badge>}
      </div>
      {report.created.length > 0 && (
        <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200">
          {report.created.map((p) => (
            <li key={p.id}>
              <Link to={`/social/posts/${p.id}`} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" />
                <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-slate-800">{p.title}</span>
                {p.warnings > 0 && <span className="inline-flex items-center gap-1 text-[0.6875rem] text-amber-700"><AlertTriangle className="h-3 w-3" />{p.warnings}</span>}
                <span className="text-[0.6875rem] tabular-nums text-slate-500">{p.scheduledAt ? fmtDateTime(p.scheduledAt) : 'No time'}</span>
                <PostStatusBadge status={p.status} size="xs" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {report.skipped.length > 0 && (
        <ul className="space-y-1">
          {report.skipped.map((s, i) => (
            <li key={i} className="flex items-start gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[0.8125rem] text-amber-900"><XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span><b>#{s.index + 1} {s.title}</b>: {s.reason}</span></li>
          ))}
        </ul>
      )}
      {report.assets.failed.length > 0 && (
        <ul className="space-y-1">
          {report.assets.failed.map((f, i) => (
            <li key={i} className="flex items-start gap-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[0.8125rem] text-rose-800"><XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span><code>{f.file}</code>: {f.reason}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Nafaa AI month ideas ────────────────────────────────────────────────

function AiPlan({ pillars }: { pillars: string[] }) {
  const invalidate = useInvalidate();
  const next = addMonths(pkToday(), 1).slice(0, 7);
  const [month, setMonth] = useState(next);
  const [perDay, setPerDay] = useState(1);
  const [brief, setBrief] = useState('');
  const run = useMutation({
    mutationFn: () => brandSocialApi.aiPlan({ month, perDay, pillars, brief: brief.trim() || undefined }),
    onSuccess: (r) => { invalidate(); toast.success(`${r.created} ideas added to the calendar's "Not scheduled" tray`); },
    onError: (e) => toast.error(apiError(e, 'Nafaa AI could not plan right now.')),
  });
  return (
    <Card title={<span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-500" />Plan a month with Nafaa AI</span>} description="Creates ideas (not posts) spread over the month, using your pillars and brand voice.">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-[0.75rem] font-medium text-slate-600">Month</span><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={cn(smallInput, 'h-10 w-full')} /></label>
        <label className="block"><span className="mb-1 block text-[0.75rem] font-medium text-slate-600">Ideas per day</span><input type="number" min={1} max={5} value={perDay} onChange={(e) => setPerDay(Math.min(5, Math.max(1, Number(e.target.value) || 1)))} className={cn(smallInput, 'h-10 w-full')} /></label>
        <Textarea wrapperClassName="sm:col-span-2" label="Focus (optional)" rows={2} value={brief} placeholder="e.g. Push the khata app to grocery shops before Black Friday" onChange={(e) => setBrief(e.target.value)} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[0.75rem] text-slate-500">{fmtMonth(`${month}-01`)}</span>
        <Button loading={run.isPending} leftIcon={<Sparkles className="h-4 w-4" />} onClick={() => run.mutate()}>Make ideas</Button>
      </div>
    </Card>
  );
}

// ─── Automation keys ────────────────────────────────────────────────────

const SCOPE_LABEL: Record<AutomationScope, string> = { read: 'Read', posts: 'Create drafts', assets: 'Upload media', import: 'Import packs', comments: 'Draft comments' };

function AutomationKeys() {
  const invalidate = useInvalidate();
  const q = useQuery({ queryKey: [...KEYS.all, 'keys'], queryFn: brandSocialApi.keys });
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<AutomationScope[]>([...AUTOMATION_SCOPES]);
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const create = useMutation({
    mutationFn: () => brandSocialApi.createKey({ name: name.trim(), scopes }),
    onSuccess: (r) => { setCreated(r); setCreating(false); setName(''); invalidate(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const revoke = useMutation({
    mutationFn: async (k: { id: string; name: string }) => {
      const ok = await confirmDialog({ title: `Revoke "${k.name}"?`, text: 'Anything using this key stops working at once. This cannot be undone.', yes: 'Revoke', danger: true });
      return ok ? brandSocialApi.revokeKey(k.id).then(() => true) : false;
    },
    onSuccess: (ok) => { if (ok) { toast.success('Key revoked'); invalidate(); } },
    onError: (e) => toast.error(apiError(e)),
  });
  const keys = (q.data ?? []).filter((k) => !k.revokedAt);
  return (
    <Card title={<span className="flex items-center gap-2"><Bot className="h-4 w-4 text-violet-500" />Automation</span>}
      description="Keys for a scheduled AI marketer. It can send drafts for review and read results; it can never approve, publish, connect accounts or change settings."
      actions={<Button size="sm" leftIcon={<KeyRound className="h-4 w-4" />} onClick={() => setCreating(true)}>Create key</Button>}>
      {q.error ? <p className="text-[0.8125rem] text-rose-600">{apiError(q.error, 'Could not load keys.')}</p>
        : q.isLoading ? <Skeleton className="h-20 rounded-xl" />
          : !keys.length ? <p className="py-4 text-center text-[0.8125rem] text-slate-500">No keys yet. Create one for the AI marketer job.</p>
            : (
              <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                {keys.map((k) => (
                  <li key={k.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                    <KeyRound className="h-4 w-4 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.8125rem] font-semibold text-slate-900">{k.name} <code className="ms-1 rounded bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] font-normal text-slate-600">{k.prefix}…</code></p>
                      <p className="text-[0.6875rem] text-slate-500">Created {fmtDateTime(k.createdAt)} · {k.lastUsedAt ? `last used ${relative(k.lastUsedAt)}` : 'never used'} · {(k.scopes ?? []).map((s) => SCOPE_LABEL[s] ?? s).join(', ')}</p>
                    </div>
                    <Button size="xs" variant="ghost" className="text-rose-600" loading={revoke.isPending && revoke.variables?.id === k.id} leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => revoke.mutate(k)}>Revoke</Button>
                  </li>
                ))}
              </ul>
            )}

      <Modal open={creating} onClose={() => setCreating(false)} size="sm" title="Create automation key"
        footer={<><Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button><Button disabled={!name.trim() || !scopes.length} loading={create.isPending} onClick={() => create.mutate()}>Create</Button></>}>
        <div className="space-y-3">
          <Input label="Name" value={name} autoFocus placeholder="e.g. AI marketer (daily)" onChange={(e) => setName(e.target.value)} />
          <div>
            <p className="mb-1.5 text-[0.75rem] font-medium text-slate-600">It may</p>
            <div className="grid grid-cols-2 gap-1.5">
              {AUTOMATION_SCOPES.map((s) => (
                <label key={s} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[0.8125rem] text-slate-700 ring-1 ring-slate-200">
                  <input type="checkbox" checked={scopes.includes(s)} onChange={(e) => setScopes(e.target.checked ? [...scopes, s] : scopes.filter((x) => x !== s))} className="rounded border-slate-300 text-brand-600" />
                  {SCOPE_LABEL[s]}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={!!created} onClose={() => setCreated(null)} size="md" title="Copy the key now" closeOnBackdrop={false}
        footer={<Button onClick={() => setCreated(null)}>I saved it</Button>}>
        {created && (
          <div className="space-y-3">
            <Alert tone="warning" title="Shown once">Nafaa keeps only a fingerprint. If it is lost, revoke it and create a new one.</Alert>
            <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5">
              <code className="min-w-0 flex-1 break-all font-mono text-[0.8125rem] text-emerald-300">{created.key}</code>
              <Button size="xs" variant="inverse" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={async () => { if (await copyText(created.key)) toast.success('Key copied'); }}>Copy</Button>
            </div>
            <p className="text-[0.75rem] text-slate-500">Send it as <code>Authorization: Bearer {created.prefix}…</code> to <code>/api/brand-social/automation</code>.</p>
          </div>
        )}
      </Modal>
    </Card>
  );
}
