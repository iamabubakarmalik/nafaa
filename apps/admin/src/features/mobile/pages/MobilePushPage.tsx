/**
 * Push notifications: compose in three languages, pick the audience, see the
 * reach before sending, and follow each send in the history.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, BellRing, History, Info, Lightbulb, Send, Smartphone, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, Button, Input, PageHero, PageShell, Switch, Table, TBody, Td, Th, THead, Tr, ViewTabs, confirmDialog, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminMobileApi, emptyTarget, type PushBroadcast, type PushInput } from '@/api/admin-mobile.api';
import { ListCard } from '@/ui';
import { errMsg, num } from '@/features/shared/kit';
import { cn } from '@/lib/cn';
import { PushHealthCard } from '../components/PushHealthCard';
import { Card, describeTarget, LANGUAGE_LABEL, LocalizedField, Pill, PLATFORM_LABEL, TargetPicker } from '../components/MobileUi';

const blank = (): PushInput => ({ ...emptyTarget(), title: { en: '' }, body: { en: '' }, deepLink: null, includeOlderApp: true });

const STATUS: Record<PushBroadcast['status'], { label: string; tone: 'slate' | 'amber' | 'emerald' | 'rose' }> = {
  QUEUED: { label: 'Waiting', tone: 'slate' },
  SENDING: { label: 'Sending', tone: 'amber' },
  SENT: { label: 'Sent', tone: 'emerald' },
  FAILED: { label: 'Failed', tone: 'rose' },
};

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

type Tab = 'send' | 'history' | 'health';

export default function MobilePushPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [tab, setTab] = useState<Tab>('send');
  const [p, setP] = useState<PushInput>(blank);
  const [page, setPage] = useState(1);
  const set = (patch: Partial<PushInput>) => setP((prev) => ({ ...prev, ...patch }));

  const targetKey = useMemo(() => JSON.stringify({
    audience: p.audience, planSlugs: p.planSlugs, industries: p.industries, tenantIds: p.tenantIds,
    platforms: p.platforms, minVersion: p.minVersion, maxVersion: p.maxVersion, includeOlderApp: p.includeOlderApp,
  }), [p]);
  const debouncedKey = useDebounced(targetKey, 300);
  const { data: audience, isFetching: counting } = useQuery({
    queryKey: ['admin-mobile-push-audience', debouncedKey],
    queryFn: () => adminMobileApi.audience(JSON.parse(debouncedKey)),
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['admin-mobile-push-history', page],
    queryFn: () => adminMobileApi.pushHistory(page),
    refetchInterval: (q) => (q.state.data?.items.some((b) => b.status === 'QUEUED' || b.status === 'SENDING') ? 2000 : false),
  });

  const send = useMutation({
    mutationFn: () => adminMobileApi.sendPush(p),
    onSuccess: () => {
      toast.success('Push queued. Progress shows in the history.');
      setP(blank());
      setPage(1);
      qc.invalidateQueries({ queryKey: ['admin-mobile-push-history'] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const versionFiltered = !!(p.platforms.length || p.minVersion || p.maxVersion);
  const targetIncomplete = p.audience !== 'all' && !p.planSlugs.length && !p.industries.length && !p.tenantIds.length;
  const canSend = p.title.en.trim() && p.body.en.trim() && !targetIncomplete && (audience?.total ?? 0) > 0;

  const health = useQuery({ queryKey: ['admin-mobile-push-health', 7], queryFn: () => adminMobileApi.pushHealth(7), refetchInterval: 60_000 });
  const h = health.data;
  const rows = history?.items ?? [];

  return (
    <PageShell>
      <PageHero
        title="Push notifications"
        chip="Last 7 days"
        busy={counting || send.isPending}
        loading={health.isLoading}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={h ? [
          { label: 'Pushes sent', value: num(h.total) },
          { label: 'Delivered', value: num(h.delivered), hint: h.total ? `${Math.round((h.delivered / h.total) * 100)}%` : undefined },
          { label: 'Failed', value: num(h.failed) },
          { label: 'Broadcasts', value: num(history?.total) },
        ] : undefined}
      />

      <ViewTabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'send', label: 'Send', icon: Send },
        { id: 'history', label: 'History', icon: History, count: history?.total ?? null },
        { id: 'health', label: 'Delivery health', icon: Activity },
      ]} />

      {tab === 'health' && <PushHealthCard />}

      {tab === 'send' && (
        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <Card title="Message">
              <div className="space-y-4">
                <LocalizedField label="Title" value={p.title} maxLength={65} onChange={(title) => set({ title })} placeholder="Short and clear" />
                <LocalizedField label="Message" multiline value={p.body} maxLength={240} onChange={(body) => set({ body })} placeholder="What should people do or know?" />
                <Input label="Opens in the app (optional)" value={p.deepLink ?? ''} onChange={(e) => set({ deepLink: e.target.value || null })} placeholder="e.g. /billing, /products, /online-orders" />
              </div>
            </Card>
            <Card title="Who gets it">
              <TargetPicker value={p} onChange={(t) => set(t)} />
              <div className={cn('mt-4 rounded-xl border px-3 py-2', versionFiltered ? 'border-slate-100 text-slate-400' : 'border-slate-200')}>
                <Switch label="Include people on the older app" description="They have notifications on but have not opened the new app yet. Platform and version filters cannot reach them."
                  checked={p.includeOlderApp && !versionFiltered} disabled={versionFiltered} onChange={(e) => set({ includeOlderApp: e.target.checked })} />
              </div>
            </Card>
          </div>

          <div className="space-y-4 xl:sticky xl:top-0 xl:self-start">
            <Card title="Reach">
              <div className="flex items-end gap-2">
                <Users className="mb-1 h-5 w-5 text-brand-600" />
                <span className={cn('text-4xl font-bold tabular-nums transition-opacity', counting && 'opacity-50')}>{num(audience?.total)}</span>
                <span className="mb-1 text-[0.875rem] text-slate-500">phones</span>
              </div>
              <div className="mt-1 text-[0.75rem] text-slate-500">{audience?.devices ?? 0} on the new app · {audience?.olderApp ?? 0} on the older app</div>
              {audience && audience.total > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(audience.byPlatform).map(([k, v]) => <Pill key={k}>{PLATFORM_LABEL[k] ?? k} {v}</Pill>)}
                  {Object.entries(audience.byLanguage).map(([k, v]) => <Pill key={k} tone="indigo">{LANGUAGE_LABEL[k] ?? k} {v}</Pill>)}
                </div>
              )}
              {audience?.delivery === 'dry-run' && <Alert tone="info" className="mt-3" icon={<Info className="h-4 w-4" />}>This server does not deliver pushes (test mode). Sends are recorded but no phone is notified.</Alert>}
              <div className="mt-4 rounded-xl bg-slate-900 p-3 text-white">
                <div className="flex items-center gap-2 text-[0.6875rem] text-white/60"><BellRing className="h-3 w-3" />Nafaa · now</div>
                <div className="mt-1 text-[0.875rem] font-semibold">{p.title.en || 'Title'}</div>
                <div className="text-[0.75rem] text-white/80">{p.body.en || 'Message'}</div>
              </div>
              <Button className="mt-4 w-full" leftIcon={<Send className="h-4 w-4" />} loading={send.isPending} disabled={!canSend}
                onClick={async () => { if (await confirmDialog({ title: 'Send this push?', text: `It goes to ${audience?.total ?? 0} phones and cannot be recalled.`, yes: 'Send push' })) send.mutate(); }}>Send push</Button>
              <p className="mt-2 text-center text-[0.6875rem] text-slate-500">{describeTarget(p)}</p>
            </Card>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <ListCard
          loading={historyLoading}
          empty={!rows.length}
          emptyIcon={<BellRing className="h-6 w-6" />}
          emptyTitle="No push sent yet"
          emptyText="Pushes you send appear here with their progress."
          page={page} limit={history?.limit ?? 20} total={history?.total} onPage={setPage}
        >
          <Table minWidth="52rem">
            <THead><Tr><Th>Message</Th><Th>Audience</Th><Th>Status</Th><Th align="right">Reach</Th><Th align="right">Sent</Th><Th align="right">Failed</Th><Th align="right">When</Th></Tr></THead>
            <TBody>
              {rows.map((b) => {
                const done = b.sentCount + b.failedCount;
                return (
                  <Tr key={b.id} className="align-top">
                    <Td className="max-w-[22rem]">
                      <div className="font-semibold text-slate-900">{b.title.en}</div>
                      <div className="line-clamp-2 text-[0.75rem] text-slate-500">{b.body.en}</div>
                      {b.deepLink && <code className="text-[0.6875rem] text-slate-500">{b.deepLink}</code>}
                    </Td>
                    <Td className="text-[0.75rem]">{describeTarget(b)}{b.includeOlderApp ? '' : ' · new app only'}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1"><Pill tone={STATUS[b.status].tone}>{STATUS[b.status].label}</Pill>{b.dryRun && <Pill tone="indigo">Test</Pill>}</div>
                      {b.status === 'SENDING' && b.audienceCount > 0 && <div className="mt-1.5 h-1.5 w-24 rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${(done / b.audienceCount) * 100}%` }} /></div>}
                      {b.error && <div className="mt-1 text-[0.6875rem] text-rose-600">{b.error}</div>}
                    </Td>
                    <Td align="right">{num(b.audienceCount)}</Td>
                    <Td align="right" className="font-semibold text-emerald-700">{num(b.sentCount)}</Td>
                    <Td align="right" className={b.failedCount ? 'font-semibold text-rose-600' : 'text-slate-400'}>{num(b.failedCount)}</Td>
                    <Td align="right" className="whitespace-nowrap text-[0.75rem] text-slate-500">{new Date(b.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </ListCard>
      )}

      {guide.isOpen && (
        <PageGuide
          title="Push notifications"
          description="Send a notification to app users: everyone, a plan, an industry, chosen shops, or a platform and version range."
          flowTitle="How a push is sent"
          flow={[
            { label: 'Write', hint: 'Three languages', icon: Send, color: '#4f46e5' },
            { label: 'Pick audience', hint: 'Reach updates live', icon: Users, color: '#0284c7' },
            { label: 'Send', hint: 'Queued, then sent', icon: BellRing, color: '#d97706' },
            { label: 'Check delivery', hint: 'History and health', icon: Activity, color: '#059669' },
          ]}
          steps={[
            { icon: Send, color: '#4f46e5', title: 'Write', text: 'Each person gets the text in their app language. Empty translations fall back to English.' },
            { icon: Users, color: '#0284c7', title: 'Check the reach', text: 'The Reach card shows how many phones will get it before you send.' },
            { icon: History, color: '#059669', title: 'Follow it', text: 'History shows each send with progress. Delivery health explains errors from Expo.' },
          ]}
          tips={['A sent push cannot be recalled, so check the reach first.', 'Platform and version filters cannot reach people on the older app.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
