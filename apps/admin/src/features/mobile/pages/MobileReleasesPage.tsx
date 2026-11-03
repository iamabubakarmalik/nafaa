/**
 * Releases and update control: latest and minimum version per platform,
 * store links, the soft and forced update prompts, release notes, and
 * maintenance mode.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Construction, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { adminMobileApi, type MobileConfig, type PlatformRelease, type ReleaseNote } from '@/api/admin-mobile.api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { Card, inputCls, labelCls, LocalizedField, MobileHero, Pill, PLATFORM_LABEL, Toggle } from '../components/MobileUi';
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
        <label>
          <span className={labelCls}>Latest version</span>
          <input value={value.latestVersion ?? ''} onChange={(e) => set({ latestVersion: e.target.value.trim() || null })} placeholder="e.g. 2.0.0"
            className={cn(inputCls, bad(value.latestVersion) && 'border-rose-400')} />
          <span className="mt-1 block text-[11px] text-slate-500">Older versions see the "new version" prompt.</span>
        </label>
        <label>
          <span className={labelCls}>Minimum supported</span>
          <input value={value.minVersion ?? ''} onChange={(e) => set({ minVersion: e.target.value.trim() || null })} placeholder="None"
            className={cn(inputCls, bad(value.minVersion) && 'border-rose-400')} />
          <span className="mt-1 block text-[11px] text-slate-500">Older versions must update before the app opens.</span>
        </label>
        <label className="sm:col-span-2">
          <span className={labelCls}>Store link</span>
          <input value={value.storeUrl ?? ''} onChange={(e) => set({ storeUrl: e.target.value.trim() || null })} placeholder="https://"
            className={cn(inputCls, value.storeUrl && !value.storeUrl.startsWith('https://') && 'border-rose-400')} />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {minAboveLatest && <Pill tone="rose">Minimum is above latest</Pill>}
        <Pill tone={forced ? 'rose' : 'slate'}>{forced.toLocaleString()} active devices would be forced</Pill>
        <Pill tone={behind ? 'amber' : 'slate'}>{behind.toLocaleString()} behind latest</Pill>
      </div>
    </Card>
  );
}

export default function MobileReleasesPage() {
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
    <div className="space-y-6">
      <MobileHero title="Releases & update control" subtitle="Tell the app which version is newest, which versions must update, and when to show the maintenance screen.">
        <Button variant="secondary" onClick={cfg.reset} disabled={!cfg.dirty}><RotateCcw className="h-4 w-4" />Undo changes</Button>
        <Button onClick={cfg.save} loading={cfg.saving} disabled={!cfg.dirty || invalid}><Save className="h-4 w-4" />Save</Button>
      </MobileHero>

      {!d ? <div className="h-64 animate-pulse rounded-3xl bg-slate-100" /> : (
        <>
          <Card className={d.maintenance.enabled ? 'border-rose-300 bg-rose-50/40' : undefined}
            title="Maintenance mode" subtitle="Blocks the app with a message until you turn it off. Signed-in work saved offline stays on the phone."
            action={<Toggle checked={d.maintenance.enabled} onChange={(v) => set((c) => { c.maintenance.enabled = v; })} label="Maintenance mode" />}>
            {d.maintenance.enabled && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-800">
                <Construction className="h-4 w-4" />The app is blocked for {d.maintenance.platforms.length ? d.maintenance.platforms.map((p) => PLATFORM_LABEL[p]).join(' and ') : 'everyone'} once you save.
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              <LocalizedField label="Title" value={d.maintenance.title} maxLength={120} onChange={(v) => set((c) => { c.maintenance.title = v; })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className={labelCls}>Platforms</span>
                  <div className="flex flex-wrap gap-3 pt-2 text-sm">
                    {(['android', 'ios'] as const).map((p) => (
                      <label key={p} className="inline-flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4 accent-teal-600"
                          checked={!d.maintenance.platforms.length || d.maintenance.platforms.includes(p)}
                          onChange={(e) => set((c) => {
                            const all: ('ios' | 'android')[] = c.maintenance.platforms.length ? c.maintenance.platforms : ['android', 'ios'];
                            const next = e.target.checked ? [...new Set([...all, p])] : all.filter((x) => x !== p);
                            c.maintenance.platforms = next.length === 2 ? [] : next;
                          })} />
                        {PLATFORM_LABEL[p]}
                      </label>
                    ))}
                  </div>
                </div>
                <label>
                  <span className={labelCls}>Expected back (shown to users)</span>
                  <input type="datetime-local" value={toLocalInput(d.maintenance.until)} className={inputCls}
                    onChange={(e) => set((c) => { c.maintenance.until = e.target.value ? new Date(e.target.value).toISOString() : null; })} />
                </label>
              </div>
              <div className="lg:col-span-2">
                <LocalizedField label="Message" multiline value={d.maintenance.message} maxLength={500} onChange={(v) => set((c) => { c.maintenance.message = v; })} />
              </div>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <PlatformCard platform="android" value={d.releases.android} devices={devicesFor('android')} onChange={(v) => set((c) => { c.releases.android = v; })} />
            <PlatformCard platform="ios" value={d.releases.ios} devices={devicesFor('ios')} onChange={(v) => set((c) => { c.releases.ios = v; })} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="New version prompt" subtitle="A sheet the user can close. It comes back after the reminder time."
              action={<Toggle checked={d.releases.softUpdate.enabled} onChange={(v) => set((c) => { c.releases.softUpdate.enabled = v; })} label="Soft prompt" />}>
              <div className="space-y-4">
                <LocalizedField label="Title" value={d.releases.softUpdate.title} maxLength={120} onChange={(v) => set((c) => { c.releases.softUpdate.title = v; })} />
                <LocalizedField label="Message" multiline value={d.releases.softUpdate.message} maxLength={500} onChange={(v) => set((c) => { c.releases.softUpdate.message = v; })} />
                <label className="block max-w-[12rem]">
                  <span className={labelCls}>Ask again after (hours)</span>
                  <input type="number" min={1} max={720} value={d.releases.softUpdate.remindAfterHours} className={inputCls}
                    onChange={(e) => set((c) => { c.releases.softUpdate.remindAfterHours = Number(e.target.value) || 24; })} />
                </label>
              </div>
            </Card>
            <Card title="Must update screen" subtitle="Full screen with a store button. Shown below the minimum version; it cannot be closed.">
              <div className="space-y-4">
                <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-2 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />Set a minimum only after the new version is live in the store, or users will be stuck.
                </div>
                <LocalizedField label="Title" value={d.releases.forceUpdate.title} maxLength={120} onChange={(v) => set((c) => { c.releases.forceUpdate.title = v; })} />
                <LocalizedField label="Message" multiline value={d.releases.forceUpdate.message} maxLength={500} onChange={(v) => set((c) => { c.releases.forceUpdate.message = v; })} />
              </div>
            </Card>
          </div>

          <Card title="Release notes" subtitle="Shown in the update prompt and in the app's What's new. Newest first.">
            <div className="grid gap-3 rounded-2xl border border-dashed border-slate-300 p-4 sm:grid-cols-[8rem_9rem_auto] sm:items-end">
              <div className="sm:col-span-3">
                <LocalizedField label="What changed" multiline value={noteDraft.text} maxLength={2000} onChange={(text) => setNoteDraft({ ...noteDraft, text })} placeholder="One change per line" />
              </div>
              <label>
                <span className={labelCls}>Version</span>
                <input value={noteDraft.version} onChange={(e) => setNoteDraft({ ...noteDraft, version: e.target.value.trim() })} placeholder="2.0.0" className={inputCls} />
              </label>
              <label>
                <span className={labelCls}>Platform</span>
                <select value={noteDraft.platform} onChange={(e) => setNoteDraft({ ...noteDraft, platform: e.target.value as ReleaseNote['platform'] })} className={inputCls}>
                  <option value="all">Both</option><option value="android">Android</option><option value="ios">iOS</option>
                </select>
              </label>
              <Button variant="secondary" className="justify-self-start" disabled={!VERSION_RE.test(noteDraft.version) || !noteDraft.text.en.trim()}
                onClick={() => {
                  set((c) => { c.releases.notes = [{ ...noteDraft, date: new Date().toISOString() }, ...c.releases.notes.filter((n) => !(n.version === noteDraft.version && n.platform === noteDraft.platform))].sort((a, b) => cmp(b.version, a.version)); });
                  setNoteDraft({ version: '', platform: 'all', date: null, text: { en: '' } });
                }}>
                <Plus className="h-4 w-4" />Add
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
                      {n.text.ur && <Pill tone="teal">اردو</Pill>}{n.text.roman && <Pill tone="teal">Roman</Pill>}
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
    </div>
  );
}
