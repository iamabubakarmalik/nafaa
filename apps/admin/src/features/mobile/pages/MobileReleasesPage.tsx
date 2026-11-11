/**
 * Releases and update control: latest and minimum version per platform,
 * store links, the soft and forced update prompts, release notes, and
 * maintenance mode.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Construction, Lightbulb, Plus, RotateCcw, Save, Smartphone, Trash2, Rocket, ShieldAlert } from 'lucide-react';
import { Alert, Button, Checkbox, Input, PageHero, PageShell, Select, Skeleton, heroButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminMobileApi, type MobileConfig, type PlatformRelease, type ReleaseNote } from '@/api/admin-mobile.api';
import { labelCls, num } from '@/features/shared/kit';
import { Card, LocalizedField, Pill, PLATFORM_LABEL, Toggle } from '../components/MobileUi';
import { useMobileConfig } from '../components/useMobileConfig';

const VERSION_RE = /^\d+(\.\d+){0,3}$/;
const cmp = (a: string, b: string) => {
  const x = a.split('.').map(Number); const y = b.split('.').map(Number);
  for (let i = 0; i < 4; i++) { const d = (x[i] ?? 0) - (y[i] ?? 0); if (d) return d > 0 ? 1 : -1; }
  return 0;
};
const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : '');

function PlatformCard({ platform, value, onChange, devices }: {
  platform: 'android' | 'ios'; value: PlatformRelease; onChange: (v: PlatformRelease) => void;
  devices: { version: string; devices: number }[];
}) {
  const set = (patch: Partial<PlatformRelease>) => onChange({ ...value, ...patch });
  const bad = (v: string | null) => !!v && !VERSION_RE.test(v);
  const minAboveLatest = value.minVersion && value.latestVersion && VERSION_RE.test(value.minVersion) && VERSION_RE.test(value.latestVersion) && cmp(value.minVersion, value.latestVersion) > 0;
  const forced = value.minVersion && VERSION_RE.test(value.minVersion) ? devices.filter((d) => cmp(d.version, value.minVersion!) < 0).reduce((s, d) => s + d.devices, 0) : 0;
  const behind = value.latestVersion && VERSION_RE.test(value.latestVersion) ? devices.filter((d) => cmp(d.version, value.latestVersion!) < 0).reduce((s, d) => s + d.devices, 0) : 0;

  return (
    <Card title={PLATFORM_LABEL[platform]} subtitle={platform === 'android' ? 'Google Play' : 'App Store'}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Latest version" value={value.latestVersion ?? ''} onChange={(e) => set({ latestVersion: e.target.value.trim() || null })} placeholder="e.g. 2.0.0"
          error={bad(value.latestVersion) ? 'Use numbers like 2.0.0' : undefined} hint='Older versions see the "new version" prompt.' />
        <Input label="Minimum supported" value={value.minVersion ?? ''} onChange={(e) => set({ minVersion: e.target.value.trim() || null })} placeholder="None"
          error={bad(value.minVersion) ? 'Use numbers like 2.0.0' : undefined} hint="Older versions must update before the app opens." />
        <Input wrapperClassName="sm:col-span-2" label="Store link" value={value.storeUrl ?? ''} onChange={(e) => set({ storeUrl: e.target.value.trim() || null })} placeholder="https://"
          error={value.storeUrl && !value.storeUrl.startsWith('https://') ? 'The link must start with https://' : undefined} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {minAboveLatest && <Pill tone="rose">Minimum is above latest</Pill>}
        <Pill tone={forced ? 'rose' : 'slate'}>{num(forced)} active devices would be forced</Pill>
        <Pill tone={behind ? 'amber' : 'slate'}>{num(behind)} behind latest</Pill>
      </div>
    </Card>
  );
}

export default function MobileReleasesPage() {
  const guide = usePageGuide();
  const cfg = useMobileConfig();
  const { data: overview } = useQuery({ queryKey: ['admin-mobile-overview', 30], queryFn: () => adminMobileApi.overview(30) });
  const [noteDraft, setNoteDraft] = useState<ReleaseNote>({ version: '', platform: 'all', date: null, text: { en: '' } });
  const d = cfg.draft;

  const devicesFor = (p: string) => (overview?.byVersion ?? []).filter((v) => v.platform === p);
  const set = (fn: (c: MobileConfig) => void) => cfg.setDraft((prev) => { if (!prev) return prev; const next = structuredClone(prev); fn(next); return next; });

  const invalid = !!d && (['ios', 'android'] as const).some((p) =>
    [d.releases[p].latestVersion, d.releases[p].minVersion].some((v) => v && !VERSION_RE.test(v))
    || (d.releases[p].storeUrl && !d.releases[p].storeUrl!.startsWith('https://')));

  return (
    <PageShell>
      <PageHero
        title="Releases and update control"
        chip={cfg.dirty ? 'Unsaved changes' : undefined}
        busy={cfg.saving}
        loading={!d}
        actions={
          <>
            <button type="button" className={heroButton} onClick={cfg.reset} disabled={!cfg.dirty}><RotateCcw className="h-4 w-4" /> Undo changes</button>
            <button type="button" className={heroPrimaryButton} onClick={cfg.save} disabled={!cfg.dirty || invalid || cfg.saving}><Save className="h-4 w-4" /> Save</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={d ? [
          { label: 'Android latest', value: d.releases.android.latestVersion ?? '—', hint: d.releases.android.minVersion ? `Minimum ${d.releases.android.minVersion}` : 'No minimum' },
          { label: 'iOS latest', value: d.releases.ios.latestVersion ?? '—', hint: d.releases.ios.minVersion ? `Minimum ${d.releases.ios.minVersion}` : 'No minimum' },
          { label: 'Maintenance', value: d.maintenance.enabled ? 'On' : 'Off' },
          { label: 'Release notes', value: num(d.releases.notes.length) },
        ] : undefined}
      />

      {!d ? <Skeleton className="h-64 rounded-3xl" /> : (
        <>
          <Card className={d.maintenance.enabled ? 'border-rose-300' : undefined}
            title="Maintenance mode" subtitle="Blocks the app with a message until you turn it off. Signed-in work saved offline stays on the phone."
            action={<Toggle checked={d.maintenance.enabled} onChange={(v) => set((c) => { c.maintenance.enabled = v; })} label="Maintenance mode" />}>
            {d.maintenance.enabled && (
              <Alert tone="danger" className="mb-4" icon={<Construction className="h-4 w-4" />}>The app is blocked for {d.maintenance.platforms.length ? d.maintenance.platforms.map((p) => PLATFORM_LABEL[p]).join(' and ') : 'everyone'} once you save.</Alert>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              <LocalizedField label="Title" value={d.maintenance.title} maxLength={120} onChange={(v) => set((c) => { c.maintenance.title = v; })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className={labelCls}>Platforms</span>
                  <div className="flex flex-wrap gap-3 pt-2 text-sm">
                    {(['android', 'ios'] as const).map((p) => (
                      <Checkbox key={p} label={PLATFORM_LABEL[p]}
                          checked={!d.maintenance.platforms.length || d.maintenance.platforms.includes(p)}
                          onChange={(e) => set((c) => {
                            const all: ('ios' | 'android')[] = c.maintenance.platforms.length ? c.maintenance.platforms : ['android', 'ios'];
                            const next = e.target.checked ? [...new Set([...all, p])] : all.filter((x) => x !== p);
                            c.maintenance.platforms = next.length === 2 ? [] : next;
                          })} />
                    ))}
                  </div>
                </div>
                <Input type="datetime-local" label="Expected back (shown to users)" value={toLocalInput(d.maintenance.until)}
                  onChange={(e) => set((c) => { c.maintenance.until = e.target.value ? new Date(e.target.value).toISOString() : null; })} />
              </div>
              <div className="lg:col-span-2">
                <LocalizedField label="Message" multiline value={d.maintenance.message} maxLength={500} onChange={(v) => set((c) => { c.maintenance.message = v; })} />
              </div>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <PlatformCard platform="android" value={d.releases.android} devices={devicesFor('android')} onChange={(v) => set((c) => { c.releases.android = v; })} />
            <PlatformCard platform="ios" value={d.releases.ios} devices={devicesFor('ios')} onChange={(v) => set((c) => { c.releases.ios = v; })} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="New version prompt" subtitle="A sheet the user can close. It comes back after the reminder time."
              action={<Toggle checked={d.releases.softUpdate.enabled} onChange={(v) => set((c) => { c.releases.softUpdate.enabled = v; })} label="Soft prompt" />}>
              <div className="space-y-4">
                <LocalizedField label="Title" value={d.releases.softUpdate.title} maxLength={120} onChange={(v) => set((c) => { c.releases.softUpdate.title = v; })} />
                <LocalizedField label="Message" multiline value={d.releases.softUpdate.message} maxLength={500} onChange={(v) => set((c) => { c.releases.softUpdate.message = v; })} />
                <Input wrapperClassName="max-w-[12rem]" type="number" min={1} max={720} label="Ask again after (hours)" value={d.releases.softUpdate.remindAfterHours}
                  onChange={(e) => set((c) => { c.releases.softUpdate.remindAfterHours = Number(e.target.value) || 24; })} />
              </div>
            </Card>
            <Card title="Must update screen" subtitle="Full screen with a store button. Shown below the minimum version; it cannot be closed.">
              <div className="space-y-4">
                <Alert tone="warning" icon={<AlertTriangle className="h-4 w-4" />}>Set a minimum only after the new version is live in the store, or users will be stuck.</Alert>
                <LocalizedField label="Title" value={d.releases.forceUpdate.title} maxLength={120} onChange={(v) => set((c) => { c.releases.forceUpdate.title = v; })} />
                <LocalizedField label="Message" multiline value={d.releases.forceUpdate.message} maxLength={500} onChange={(v) => set((c) => { c.releases.forceUpdate.message = v; })} />
              </div>
            </Card>
          </div>

          <Card title="Release notes" subtitle="Shown in the update prompt and in the app's What's new. Newest first.">
            <div className="grid gap-3 rounded-xl border border-dashed border-slate-300 p-4 sm:grid-cols-[8rem_9rem_auto] sm:items-end">
              <div className="sm:col-span-3">
                <LocalizedField label="What changed" multiline value={noteDraft.text} maxLength={2000} onChange={(text) => setNoteDraft({ ...noteDraft, text })} placeholder="One change per line" />
              </div>
              <Input label="Version" value={noteDraft.version} onChange={(e) => setNoteDraft({ ...noteDraft, version: e.target.value.trim() })} placeholder="2.0.0" />
              <Select label="Platform" value={noteDraft.platform} onChange={(e) => setNoteDraft({ ...noteDraft, platform: e.target.value as ReleaseNote['platform'] })}
                options={[{ value: 'all', label: 'Both' }, { value: 'android', label: 'Android' }, { value: 'ios', label: 'iOS' }]} />
              <Button variant="secondary" className="justify-self-start" leftIcon={<Plus className="h-4 w-4" />} disabled={!VERSION_RE.test(noteDraft.version) || !noteDraft.text.en.trim()}
                onClick={() => {
                  set((c) => { c.releases.notes = [{ ...noteDraft, date: new Date().toISOString() }, ...c.releases.notes.filter((n) => !(n.version === noteDraft.version && n.platform === noteDraft.platform))].sort((a, b) => cmp(b.version, a.version)); });
                  setNoteDraft({ version: '', platform: 'all', date: null, text: { en: '' } });
                }}>
                Add
              </Button>
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {d.releases.notes.length === 0 && <div className="py-6 text-center text-sm text-slate-500">No release notes yet.</div>}
              {d.releases.notes.map((n, i) => (
                <div key={`${n.version}-${n.platform}`} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold tabular-nums">{n.version}</span>
                      <Pill>{n.platform === 'all' ? 'Both' : PLATFORM_LABEL[n.platform]}</Pill>
                      {n.date && <span className="text-xs text-slate-500">{new Date(n.date).toLocaleDateString('en-PK', { dateStyle: 'medium' })}</span>}
                      {n.text.ur && <Pill tone="indigo">اردو</Pill>}{n.text.roman && <Pill tone="indigo">Roman</Pill>}
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{n.text.en}</p>
                  </div>
                  <button type="button" aria-label="Delete note" onClick={() => set((c) => { c.releases.notes.splice(i, 1); })} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {guide.isOpen && (
        <PageGuide
          title="Releases and update control"
          description="Tell every app which version is newest, which versions must update, and when to show the maintenance screen."
          flowTitle="How an update reaches users"
          flow={[
            { label: 'Release in store', hint: 'Play or App Store', icon: Rocket, color: '#4f46e5' },
            { label: 'Set latest', hint: 'Older apps see a prompt', icon: Smartphone, color: '#0284c7' },
            { label: 'Set minimum', hint: 'Older apps must update', icon: ShieldAlert, color: '#e11d48' },
          ]}
          steps={[
            { icon: Rocket, color: '#4f46e5', title: 'Set latest', text: 'Enter the newest store version. Devices below it see the soft prompt they can close.' },
            { icon: ShieldAlert, color: '#e11d48', title: 'Set minimum with care', text: 'Devices below the minimum cannot open the app. Set it only after the new version is live in the store.' },
            { icon: Construction, color: '#d97706', title: 'Maintenance', text: 'Maintenance mode blocks the app with your message until you turn it off.' },
          ]}
          tips={['The pills on each platform show how many active devices would be forced to update.', 'Apps pick up saved changes within a minute.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
