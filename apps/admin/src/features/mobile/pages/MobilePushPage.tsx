/**
 * Push notifications: compose in three languages, pick the audience, see the
 * reach before sending, and follow each send in the history.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Info, Send, Users } from 'lucide-react';
import { toast } from 'sonner';
import { adminMobileApi, emptyTarget, type PushBroadcast, type PushInput } from '@/api/admin-mobile.api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { PushHealthCard } from '../components/PushHealthCard';
import { Card, describeTarget, inputCls, labelCls, LANGUAGE_LABEL, LocalizedField, MobileHero, Pill, PLATFORM_LABEL, TargetPicker, Toggle } from '../components/MobileUi';

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

export default function MobilePushPage() {
  const qc = useQueryClient();
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
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not send'),
  });

  const versionFiltered = !!(p.platforms.length || p.minVersion || p.maxVersion);
  const targetIncomplete = p.audience !== 'all' && !p.planSlugs.length && !p.industries.length && !p.tenantIds.length;
  const canSend = p.title.en.trim() && p.body.en.trim() && !targetIncomplete && (audience?.total ?? 0) > 0;

  return (
    <div className="space-y-6">
      <MobileHero title="Push notifications" subtitle="Send a notification to app users: everyone, a plan, an industry, chosen businesses, or a platform and version range. Each person gets it in their app language." />

      <PushHealthCard />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card title="Message">
            <div className="space-y-4">
              <LocalizedField label="Title" value={p.title} maxLength={65} onChange={(title) => set({ title })} placeholder="Short and clear" />
              <LocalizedField label="Message" multiline value={p.body} maxLength={240} onChange={(body) => set({ body })} placeholder="What should people do or know?" />
              <label className="block">
                <span className={labelCls}>Opens in the app (optional)</span>
                <input value={p.deepLink ?? ''} onChange={(e) => set({ deepLink: e.target.value || null })} placeholder="e.g. /billing, /products, /online-orders" className={inputCls} />
              </label>
            </div>
          </Card>
          <Card title="Who gets it">
            <TargetPicker value={p} onChange={(t) => set(t)} />
            <label className={cn('mt-4 flex items-center justify-between gap-4 rounded-xl border px-3 py-2 text-sm', versionFiltered ? 'border-slate-100 text-slate-400' : 'border-slate-200')}>
              <span>
                <span className="block font-medium">Include people on the older app</span>
                <span className="block text-xs text-slate-500">They have notifications on but have not opened the new app yet. Platform and version filters cannot reach them.</span>
              </span>
              <Toggle checked={p.includeOlderApp && !versionFiltered} disabled={versionFiltered} onChange={(includeOlderApp) => set({ includeOlderApp })} />
            </label>
          </Card>
        </div>

        <div className="space-y-4 xl:sticky xl:top-0 xl:self-start">
          <Card title="Reach">
            <div className="flex items-end gap-2">
              <Users className="mb-1 h-5 w-5 text-teal-600" />
              <span className={cn('text-4xl font-bold tabular-nums transition-opacity', counting && 'opacity-50')}>{(audience?.total ?? 0).toLocaleString()}</span>
              <span className="mb-1 text-sm text-slate-500">phones</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">{audience?.devices ?? 0} on the new app · {audience?.olderApp ?? 0} on the older app</div>
            {audience && audience.total > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(audience.byPlatform).map(([k, v]) => <Pill key={k}>{PLATFORM_LABEL[k] ?? k} {v}</Pill>)}
                {Object.entries(audience.byLanguage).map(([k, v]) => <Pill key={k} tone="teal">{LANGUAGE_LABEL[k] ?? k} {v}</Pill>)}
              </div>
            )}
            {audience?.delivery === 'dry-run' && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-800">
                <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />This server does not deliver pushes (test mode). Sends are recorded but no phone is notified.
              </div>
            )}
            <div className="mt-4 rounded-2xl bg-slate-900 p-3 text-white">
              <div className="flex items-center gap-2 text-[11px] text-white/60"><BellRing className="h-3 w-3" />Nafaa · now</div>
              <div className="mt-1 text-sm font-semibold">{p.title.en || 'Title'}</div>
              <div className="text-xs text-white/80">{p.body.en || 'Message'}</div>
            </div>
            <Button className="mt-4 w-full" onClick={() => { if (confirm(`Send this push to ${audience?.total ?? 0} phones?`)) send.mutate(); }} loading={send.isPending} disabled={!canSend}>
              <Send className="h-4 w-4" />Send push
            </Button>
            <p className="mt-2 text-center text-[11px] text-slate-500">{describeTarget(p)}</p>
          </Card>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h3 className="text-base font-bold">History</h3></div>
        {historyLoading ? <div className="p-10 text-center text-sm text-slate-500">Loading…</div>
          : !history?.items.length ? <div className="p-10 text-center text-sm text-slate-500">No push sent yet.</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr><th className="px-5 py-3">Message</th><th className="px-3 py-3">Audience</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Reach</th><th className="px-3 py-3 text-right">Sent</th><th className="px-3 py-3 text-right">Failed</th><th className="px-5 py-3 text-right">When</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.items.map((b) => {
                    const done = b.sentCount + b.failedCount;
                    return (
                      <tr key={b.id} className="align-top">
                        <td className="max-w-[22rem] px-5 py-3">
                          <div className="font-semibold text-slate-900">{b.title.en}</div>
                          <div className="line-clamp-2 text-xs text-slate-500">{b.body.en}</div>
                          {b.deepLink && <code className="text-[11px] text-slate-500">{b.deepLink}</code>}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600">{describeTarget(b)}{b.includeOlderApp ? '' : ' · new app only'}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1"><Pill tone={STATUS[b.status].tone}>{STATUS[b.status].label}</Pill>{b.dryRun && <Pill tone="indigo">Test</Pill>}</div>
                          {b.status === 'SENDING' && b.audienceCount > 0 && (
                            <div className="mt-1.5 h-1.5 w-24 rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${(done / b.audienceCount) * 100}%` }} /></div>
                          )}
                          {b.error && <div className="mt-1 text-[11px] text-rose-600">{b.error}</div>}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{b.audienceCount.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-emerald-700">{b.sentCount.toLocaleString()}</td>
                        <td className={cn('px-3 py-3 text-right tabular-nums', b.failedCount ? 'font-semibold text-rose-600' : 'text-slate-400')}>{b.failedCount.toLocaleString()}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right text-xs text-slate-500">{new Date(b.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        {history && history.pages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 text-sm">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="tabular-nums text-slate-600">Page {page} of {history.pages}</span>
            <Button size="sm" variant="secondary" disabled={page >= history.pages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        )}
      </section>
    </div>
  );
}
