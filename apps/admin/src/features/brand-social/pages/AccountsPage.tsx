/**
 * Accounts (/social/accounts): Facebook and Instagram through Meta (OAuth
 * redirect, finished on /social/accounts/callback); Threads, YouTube, TikTok,
 * X and Pinterest through their own apps (saved on the Settings page,
 * finished on /social/accounts/callback/<platform>); manual accounts for
 * every platform. Per-account auto-publish, publishing settings, token
 * health, refresh, reconnect and disconnect.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, Hand, Plug, Plus, RefreshCw, Settings2, Unplug, Zap } from 'lucide-react';
import { Alert, Badge, Button, Card, EmptyState, Input, Modal, PageHero, PageShell, Segmented, Select, Skeleton, Switch, confirmDialog, heroPrimaryButton, type BadgeVariant } from '@/design-system/components';
import {
  brandSocialApi, isOAuthPlatform, OAUTH_PLATFORMS, SOCIAL_PLATFORMS, type AccountPlatformSettings, type MetaConnection, type OAuthPlatform, type SocialAccount,
  type SocialPlatform, type TokenHealth,
} from '@/api/admin-brand-social.api';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { num } from '@/lib/format';
import { PLATFORM, PlatformMark } from '../lib/platforms';
import { copyText } from '../lib/post';
import { useAccounts, useInvalidate } from '../lib/queries';
import { fmtDateTime, relative } from '../lib/time';
import { AccountAvatar, LoadError } from '../components/SocialUi';

const HEALTH: Record<TokenHealth, { label: string; variant: BadgeVariant }> = {
  ok: { label: 'Token healthy', variant: 'success' },
  expiring: { label: 'Token expiring', variant: 'warning' },
  expired: { label: 'Token expired', variant: 'danger' },
  none: { label: 'No token', variant: 'default' },
};

const STATUS: Record<SocialAccount['status'], { label: string; variant: BadgeVariant }> = {
  CONNECTED: { label: 'Connected', variant: 'success' },
  MANUAL: { label: 'Posted by hand', variant: 'default' },
  NEEDS_RECONNECT: { label: 'Reconnect needed', variant: 'danger' },
  DISCONNECTED: { label: 'Disconnected', variant: 'default' },
};

export function useMetaConnect() {
  return useMutation({
    mutationFn: () => brandSocialApi.metaConnectUrl(),
    onSuccess: (r) => { window.location.assign(r.url); },
    onError: (e) => toast.error(apiError(e, 'Could not start the Meta connection.')),
  });
}

/** Starts the sign-in with a platform's own app (Threads, YouTube, TikTok, X, Pinterest). */
export function usePlatformConnect() {
  return useMutation({
    mutationFn: (p: OAuthPlatform) => brandSocialApi.platformConnectUrl(p),
    onSuccess: (r) => { window.location.assign(r.url); },
    onError: (e) => toast.error(apiError(e, 'Could not start the connection.')),
  });
}

export default function AccountsPage() {
  const q = useAccounts();
  const can = useCan();
  const canConnect = can('social.connect');
  const connect = useMetaConnect();
  const platformConnect = usePlatformConnect();
  const [manual, setManual] = useState<{ platform: SocialPlatform; account?: SocialAccount } | null>(null);
  const [settingsFor, setSettingsFor] = useState<SocialAccount | null>(null);
  const accounts = q.data?.accounts ?? [];
  const live = accounts.filter((a) => a.status !== 'DISCONNECTED');
  const meta = q.data?.meta;
  const appReady = (p: SocialPlatform) => !!q.data?.apps?.some((x) => x.platform === p && x.configured);
  const missing = SOCIAL_PLATFORMS.filter((p) => p !== 'FACEBOOK' && p !== 'INSTAGRAM' && !live.some((a) => a.platform === p));
  // OAuth platforms with no account holding a token yet.
  const toConnect = OAUTH_PLATFORMS.filter((p) => !live.some((a) => a.platform === p && a.oauth));
  const reconnect = (a: SocialAccount) => (isOAuthPlatform(a.platform) ? platformConnect.mutate(a.platform) : connect.mutate());

  return (
    <PageShell>
      <PageHero
        title="Accounts"
        busy={q.isFetching}
        loading={q.isLoading}
        actions={canConnect && meta?.configured && (
          <button type="button" className={heroPrimaryButton} disabled={connect.isPending} onClick={() => connect.mutate()}>
            <Plug className="h-4 w-4" />{meta?.connected ? 'Reconnect Meta' : 'Connect Facebook & Instagram'}
          </button>
        )}
        stats={q.data ? [
          { label: 'Publishing automatically', value: live.filter((a) => a.status === 'CONNECTED' && a.autoPublish).length },
          { label: 'Posted by hand', value: live.filter((a) => a.status === 'MANUAL' || !a.autoPublish).length },
          { label: 'Need attention', value: live.filter((a) => a.status === 'NEEDS_RECONNECT' || a.tokenHealth === 'expired' || a.tokenHealth === 'expiring').length },
          { label: 'Followers', value: num(live.reduce((s, a) => s + (a.followers ?? 0), 0)) },
        ] : undefined}
      />

      {q.error ? <LoadError error={q.error} onRetry={() => q.refetch()} what="accounts" /> : q.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
      ) : (
        <>
          {meta && <MetaCard meta={meta} canConnect={canConnect} onConnect={() => connect.mutate()} connecting={connect.isPending} />}

          {live.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {live.map((a) => (
                <AccountCard key={a.id} account={a} canConnect={canConnect} appReady={appReady(a.platform)} connecting={platformConnect.isPending}
                  onEdit={() => setManual({ platform: a.platform, account: a })} onReconnect={() => reconnect(a)} onSettings={() => setSettingsFor(a)} />
              ))}
            </div>
          ) : (
            <Card><EmptyState icon={<Plug className="h-6 w-6" />} title="No accounts yet" description="Connect Facebook and Instagram to publish automatically, and add the other platforms so their posts land in the hand-posting queue." /></Card>
          )}

          {canConnect && toConnect.length > 0 && (
            <Card title="Connect to publish automatically" description="Each platform uses its own developer app. Save the app once on the Settings page, then connect. A hand-posted account for the same platform is upgraded in place.">
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {toConnect.map((p) => {
                  const ready = appReady(p);
                  const manualRow = live.find((a) => a.platform === p);
                  return (
                    <li key={p} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200">
                      <PlatformMark p={p} size={22} />
                      <span className="min-w-0 flex-1">
                        <b className="block text-[0.875rem] text-slate-900">{PLATFORM[p].label}</b>
                        <span className="block truncate text-[0.75rem] text-slate-500">{!ready ? 'App not saved yet' : manualRow ? `Upgrades ${manualRow.handle ?? manualRow.name}` : 'Ready to connect'}</span>
                      </span>
                      {ready
                        ? <Button size="xs" leftIcon={<Plug className="h-3.5 w-3.5" />} loading={platformConnect.isPending && platformConnect.variables === p} onClick={() => platformConnect.mutate(p)}>Connect</Button>
                        : <Link to="/social/settings#platform-apps"><Button size="xs" variant="secondary">Set up app</Button></Link>}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {canConnect && missing.length > 0 && (
            <Card title="Add a platform posted by hand" description="Nafaa prepares the caption and media; a person posts it and pastes the link back.">
              <div className="flex flex-wrap gap-2">
                {missing.map((p) => (
                  <button key={p} type="button" onClick={() => setManual({ platform: p })} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-[0.8125rem] font-semibold text-slate-800 ring-1 ring-slate-200 hover:ring-brand-400">
                    <PlatformMark p={p} size={18} />{PLATFORM[p].label}<Plus className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      <ManualModal value={manual} onClose={() => setManual(null)} />
      <AccountSettingsModal account={settingsFor} onClose={() => setSettingsFor(null)} />
    </PageShell>
  );
}

function MetaCard({ meta, canConnect, onConnect, connecting }: { meta: MetaConnection; canConnect: boolean; onConnect: () => void; connecting: boolean }) {
  if (!meta.configured) {
    return <Alert tone="warning" title="Meta app is not set up on the server">META_APP_ID and META_APP_SECRET are missing, so Facebook and Instagram cannot be connected.</Alert>;
  }
  const h = HEALTH[meta.tokenHealth] ?? HEALTH.none;
  return (
    <Card title={<span className="flex items-center gap-2"><PlatformMark p="FACEBOOK" size={18} /><PlatformMark p="INSTAGRAM" size={18} />Meta connection</span>}
      description={meta.connected ? `Signed in as ${meta.userName ?? 'a Facebook user'}` : 'Not connected. Connect with the Facebook account that manages the Nafaa Page.'}
      actions={canConnect && <Button size="sm" variant={meta.connected ? 'secondary' : 'primary'} loading={connecting} leftIcon={<Plug className="h-4 w-4" />} onClick={onConnect}>{meta.connected ? 'Reconnect' : 'Connect'}</Button>}>
      <div className="flex flex-wrap items-center gap-2 text-[0.8125rem]">
        {meta.connected && <Badge variant={h.variant} dot>{h.label}</Badge>}
        {meta.tokenExpiresAt && <span className="text-slate-500">Expires {fmtDateTime(meta.tokenExpiresAt)} ({relative(meta.tokenExpiresAt)})</span>}
        {meta.connected && <Badge variant={meta.adsRead ? 'success' : 'default'}>{meta.adsRead ? 'Ads read granted' : 'No ads access'}</Badge>}
      </div>
      {meta.connected && meta.scopes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">{meta.scopes.map((s) => <code key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-600">{s}</code>)}</div>
      )}
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
        <span className="shrink-0 text-[0.75rem] font-medium text-slate-500">Redirect URI</span>
        <code className="min-w-0 flex-1 truncate text-[0.75rem] text-slate-700" title={meta.redirectUri}>{meta.redirectUri}</code>
        <button type="button" onClick={async () => { if (await copyText(meta.redirectUri)) toast.success('Copied'); }} className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label="Copy redirect URI"><Copy className="h-3.5 w-3.5" /></button>
      </div>
      <p className="mt-1.5 text-[0.75rem] text-slate-500">Add this under Valid OAuth Redirect URIs in the Meta app once.</p>
    </Card>
  );
}

function AccountCard({ account: a, canConnect, appReady, connecting, onEdit, onReconnect, onSettings }: {
  account: SocialAccount; canConnect: boolean; appReady: boolean; connecting: boolean; onEdit: () => void; onReconnect: () => void; onSettings: () => void;
}) {
  const invalidate = useInvalidate();
  const st = STATUS[a.status];
  const h = HEALTH[a.tokenHealth] ?? HEALTH.none;
  const toggle = useMutation({
    mutationFn: (v: boolean) => brandSocialApi.updateAccount(a.id, { autoPublish: v }),
    onSuccess: (r) => { toast.success(r.autoPublish ? 'Publishes automatically' : 'Posts go to the hand-posting queue'); invalidate(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const refresh = useMutation({
    mutationFn: () => brandSocialApi.refreshAccount(a.id),
    onSuccess: (r) => { r.lastError ? toast.error(r.lastError) : toast.success('Checked and refreshed'); invalidate(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const disconnect = useMutation({
    mutationFn: async () => {
      const ok = await confirmDialog({ title: `Disconnect ${PLATFORM[a.platform].label}?`, text: 'Scheduled posts stop going to this account. Posts and results are kept; you can connect it again later.', yes: 'Disconnect', danger: true });
      return ok ? brandSocialApi.disconnectAccount(a.id) : null;
    },
    onSuccess: (r) => { if (r) { toast.success('Disconnected'); invalidate(); } },
    onError: (e) => toast.error(apiError(e)),
  });
  const profile = a.profileUrl ?? (a.handle ? PLATFORM[a.platform].profile(a.handle.replace(/^@/, '')) : null);

  return (
    <Card>
      <div className="flex items-start gap-3">
        <AccountAvatar account={a} platform={a.platform} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-bold text-slate-900">{a.name}</p>
          <p className="truncate text-[0.8125rem] text-slate-500">{a.handle ? `@${a.handle.replace(/^@/, '')}` : PLATFORM[a.platform].label}</p>
        </div>
        {profile && <a href={profile} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Open profile"><ExternalLink className="h-4 w-4" /></a>}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge size="sm" variant={st.variant} dot>{st.label}</Badge>
        {a.api && a.status !== 'MANUAL' && <Badge size="sm" variant={h.variant}>{h.label}</Badge>}
        {a.followers != null && <Badge size="sm" variant="outline">{num(a.followers)} followers</Badge>}
      </div>
      {a.lastError && <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[0.75rem] text-rose-800"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{a.lastError}</p>}
      {a.api && a.status !== 'MANUAL' ? (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
          <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-700">{a.autoPublish ? <Zap className="h-4 w-4 text-amber-500" /> : <Hand className="h-4 w-4 text-slate-400" />}Auto-publish</span>
          <Switch checked={a.autoPublish} disabled={!canConnect || toggle.isPending || a.status === 'NEEDS_RECONNECT'} onChange={(e) => toggle.mutate(e.target.checked)} aria-label="Auto-publish" />
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-[0.75rem] text-slate-500"><Hand className="h-3.5 w-3.5" />Posts land in "To post by hand" when due.</p>
      )}
      {a.oauth && a.settings && <SettingsSummary account={a} />}
      <p className="mt-2 text-[0.6875rem] text-slate-400">{a.lastCheckedAt ? `Checked ${relative(a.lastCheckedAt)}` : `Added ${relative(a.createdAt)}`}{a.tokenExpiresAt ? ` · token until ${fmtDateTime(a.tokenExpiresAt)}` : ''}</p>
      {canConnect && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
          {a.status === 'NEEDS_RECONNECT' && (isOAuthPlatform(a.platform) ? appReady : true) && <Button size="xs" loading={connecting} leftIcon={<Plug className="h-3.5 w-3.5" />} onClick={onReconnect}>Reconnect</Button>}
          {a.status === 'MANUAL' && isOAuthPlatform(a.platform) && appReady && <Button size="xs" loading={connecting} leftIcon={<Plug className="h-3.5 w-3.5" />} onClick={onReconnect}>Connect</Button>}
          {a.oauth && a.status !== 'MANUAL' && (a.platform === 'YOUTUBE' || a.platform === 'TIKTOK' || a.platform === 'PINTEREST') && <Button size="xs" variant="secondary" leftIcon={<Settings2 className="h-3.5 w-3.5" />} onClick={onSettings}>Settings</Button>}
          {a.api && a.status !== 'MANUAL' && <Button size="xs" variant="secondary" loading={refresh.isPending} leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => refresh.mutate()}>Check now</Button>}
          {(a.status === 'MANUAL' || !a.api) && <Button size="xs" variant="secondary" onClick={onEdit}>Edit</Button>}
          <Button size="xs" variant="ghost" className="ms-auto text-rose-600" loading={disconnect.isPending} leftIcon={<Unplug className="h-3.5 w-3.5" />} onClick={() => disconnect.mutate()}>Disconnect</Button>
        </div>
      )}
    </Card>
  );
}

function ManualModal({ value, onClose }: { value: { platform: SocialPlatform; account?: SocialAccount } | null; onClose: () => void }) {
  const invalidate = useInvalidate();
  const [form, setForm] = useState({ handle: '', url: '', name: '' });
  const [openFor, setOpenFor] = useState<string | null>(null);
  const key = value ? `${value.platform}-${value.account?.id ?? 'new'}` : null;
  if (key !== openFor) {
    setOpenFor(key);
    if (value) setForm({ handle: value.account?.handle?.replace(/^@/, '') ?? '', url: value.account?.profileUrl ?? '', name: value.account?.name ?? 'Nafaa' });
  }
  const save = useMutation({
    mutationFn: () => brandSocialApi.saveManualAccount({ platform: value!.platform, handle: form.handle.trim().replace(/^@/, ''), url: form.url.trim() || null, name: form.name.trim() || null }),
    onSuccess: () => { toast.success(`${PLATFORM[value!.platform].label} saved`); invalidate(); onClose(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const p = value?.platform;
  return (
    <Modal open={!!value} onClose={onClose} size="sm" title={p ? <span className="flex items-center gap-2"><PlatformMark p={p} size={20} />{PLATFORM[p].label}</span> : ''}
      description="Posted by hand: Nafaa prepares everything, a person posts it."
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={save.isPending} disabled={!form.handle.trim()} leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => save.mutate()}>Save</Button>
      </>}>
      <div className="space-y-3">
        <Input label="Handle" value={form.handle} leftIcon={<span className="text-slate-400">@</span>} placeholder="nafaa.pk" onChange={(e) => setForm({ ...form, handle: e.target.value })} autoFocus />
        <Input label="Profile URL" value={form.url} placeholder={p && form.handle ? PLATFORM[p].profile(form.handle.replace(/^@/, '')) : 'https://'} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        <Input label="Display name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
    </Modal>
  );
}

function SettingsSummary({ account: a }: { account: SocialAccount }) {
  const s = a.settings ?? {};
  const line = a.platform === 'YOUTUBE' ? `Uploads as ${s.youtubePrivacy ?? 'private'}`
    : a.platform === 'TIKTOK' ? (s.tiktokMode === 'DIRECT' ? 'Posts directly · privacy chosen on each post' : 'Sends to TikTok drafts')
      : a.platform === 'PINTEREST' ? (s.pinterestBoardId ? `Pins to ${s.pinterestBoardName ?? 'the chosen board'}` : 'No board chosen yet')
        : null;
  if (!line) return null;
  const warn = a.platform === 'PINTEREST' && !s.pinterestBoardId;
  return <p className={`mt-2 text-[0.75rem] ${warn ? 'font-medium text-amber-700' : 'text-slate-500'}`}>{line}</p>;
}

function AccountSettingsModal({ account, onClose }: { account: SocialAccount | null; onClose: () => void }) {
  const invalidate = useInvalidate();
  const q = useQuery({ queryKey: ['brand-social', 'account-options', account?.id], queryFn: () => brandSocialApi.accountOptions(account!.id), enabled: !!account });
  const [form, setForm] = useState<AccountPlatformSettings>({});
  const [openFor, setOpenFor] = useState<string | null>(null);
  const key = account && q.data ? account.id : null;
  if (key !== openFor) {
    setOpenFor(key);
    if (q.data) setForm(q.data.settings);
  }
  const save = useMutation({
    mutationFn: () => brandSocialApi.updateAccount(account!.id, { settings: form }),
    onSuccess: () => { toast.success('Saved'); invalidate(); onClose(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const p = account?.platform;
  const boards = q.data?.boards ?? [];
  return (
    <Modal open={!!account} onClose={onClose} size="sm" title={p ? <span className="flex items-center gap-2"><PlatformMark p={p} size={20} />{PLATFORM[p].label} settings</span> : ''}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={save.isPending} disabled={!q.data} leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => save.mutate()}>Save</Button>
      </>}>
      {q.error ? <p className="text-[0.8125rem] text-rose-600">{apiError(q.error, 'Could not load the choices.')}</p> : !q.data ? <Skeleton className="h-28 rounded-xl" /> : (
        <div className="space-y-4">
          {p === 'YOUTUBE' && (
            <Select label="Privacy of new uploads" value={form.youtubePrivacy ?? 'private'} onChange={(e) => setForm({ ...form, youtubePrivacy: e.target.value as AccountPlatformSettings['youtubePrivacy'] })}
              options={[{ value: 'private', label: 'Private' }, { value: 'unlisted', label: 'Unlisted' }, { value: 'public', label: 'Public' }]} />
          )}
          {p === 'TIKTOK' && (
            <>
              <div>
                <span className="mb-1 block text-[0.75rem] font-medium text-slate-600">How posts go out</span>
                <Segmented value={form.tiktokMode ?? 'INBOX'} label="TikTok mode" onChange={(v) => setForm({ ...form, tiktokMode: v as 'INBOX' | 'DIRECT' })}
                  items={[{ value: 'INBOX', label: 'Send to TikTok drafts' }, { value: 'DIRECT', label: 'Post directly' }]} />
              </div>
              <div className="space-y-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[0.75rem] text-slate-600 ring-1 ring-slate-200">
                <p><b className="text-slate-800">Send to TikTok drafts</b> (recommended for now): the video lands in the TikTok app&apos;s inbox, and a person finishes and posts it there.</p>
                <p><b className="text-slate-800">Post directly</b>: Nafaa posts it for you. Each post then gets its own TikTok settings in the composer: who can see it, comments, duets, stitches and content disclosure.</p>
                <p>TikTok must review and audit the Nafaa app before direct posts can be public. Until then, only &quot;Only me&quot; works: direct posts stay private on the profile, and other choices are refused.</p>
              </div>
            </>
          )}
          {p === 'PINTEREST' && (
            <Select label="Board" value={form.pinterestBoardId ?? ''} placeholder="Choose a board"
              onChange={(e) => { const b = boards.find((x) => x.id === e.target.value); setForm({ ...form, pinterestBoardId: b?.id ?? null, pinterestBoardName: b?.name ?? null }); }}
              options={[{ value: '', label: boards.length ? 'Choose a board' : 'No boards found' }, ...boards.map((b) => ({ value: b.id, label: b.name }))]} />
          )}
          {q.data.notes.map((n) => <p key={n} className="rounded-lg bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-600 ring-1 ring-slate-200">{n}</p>)}
        </div>
      )}
    </Modal>
  );
}
