/** In-app banners: who sees them, when, and in which language. */

import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Lightbulb, Megaphone, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Drawer, FilterBar, FilterChip, FilterMenu, Input, PageHero, PageShell, SearchField, Switch, confirmDialog, heroButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminMobileApi, emptyTarget, type Announcement, type AnnouncementInput } from '@/api/admin-mobile.api';
import { ListCard, useListParams } from '@/ui';
import { errMsg, labelCls, num } from '@/features/shared/kit';
import { cn } from '@/lib/cn';
import { Card, describeTarget, LocalizedField, Pill, TargetPicker, Toggle } from '../components/MobileUi';

const TONES: { key: AnnouncementInput['tone']; label: string; cls: string }[] = [
  { key: 'info', label: 'Info', cls: 'bg-sky-50 border-sky-200 text-sky-900' },
  { key: 'success', label: 'Good news', cls: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
  { key: 'warning', label: 'Warning', cls: 'bg-amber-50 border-amber-200 text-amber-900' },
  { key: 'critical', label: 'Critical', cls: 'bg-rose-50 border-rose-200 text-rose-900' },
];

const blank = (): AnnouncementInput => ({
  ...emptyTarget(), title: { en: '' }, body: { en: '' }, tone: 'info', ctaLabel: null, ctaLink: null,
  startsAt: null, endsAt: null, dismissible: true, isActive: true, priority: 0,
});

const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : '');
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);
const fmt = (iso: string) => new Date(iso).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });

function statusOf(a: Announcement): { label: string; tone: 'emerald' | 'amber' | 'slate' | 'rose' } {
  const now = Date.now();
  if (!a.isActive) return { label: 'Paused', tone: 'slate' };
  if (a.endsAt && new Date(a.endsAt).getTime() <= now) return { label: 'Ended', tone: 'slate' };
  if (a.startsAt && new Date(a.startsAt).getTime() > now) return { label: 'Scheduled', tone: 'amber' };
  return { label: 'Live', tone: 'emerald' };
}

function Preview({ a }: { a: AnnouncementInput }) {
  const tone = TONES.find((t) => t.key === a.tone)!;
  return (
    <div className={cn('rounded-xl border p-3', tone.cls)}>
      <div className="flex items-start gap-2">
        <Megaphone className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">{a.title.en || 'Title'}</div>
          <div className="text-xs opacity-90">{a.body.en || 'Message'}</div>
          {a.ctaLabel?.en && a.ctaLink && <div className="mt-1.5 text-xs font-bold underline">{a.ctaLabel.en}</div>}
        </div>
        {a.dismissible && <X className="h-4 w-4 opacity-60" />}
      </div>
    </div>
  );
}

function Editor({ initial, id, onClose }: { initial: AnnouncementInput; id: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [a, setA] = useState<AnnouncementInput>(initial);
  const set = (patch: Partial<AnnouncementInput>) => setA((p) => ({ ...p, ...patch }));
  const save = useMutation({
    mutationFn: () => (id ? adminMobileApi.updateAnnouncement(id, a) : adminMobileApi.createAnnouncement(a)),
    onSuccess: () => { toast.success(id ? 'Announcement updated' : 'Announcement created'); qc.invalidateQueries({ queryKey: ['admin-mobile-announcements'] }); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const targetIncomplete = a.audience !== 'all' && !a.planSlugs.length && !a.industries.length && !a.tenantIds.length;

  return (
    <Drawer open onClose={onClose} size="xl" title={id ? 'Edit announcement' : 'New announcement'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!a.title.en.trim() || !a.body.en.trim() || targetIncomplete}>{id ? 'Save changes' : 'Create'}</Button>
        </>
      }>
      <div className="space-y-4 bg-slate-50 p-4 sm:p-5">
        <Preview a={a} />
        <Card title="Message">
          <div className="space-y-4">
            <LocalizedField label="Title" value={a.title} maxLength={120} onChange={(title) => set({ title })} placeholder="Short headline" />
            <LocalizedField label="Message" multiline value={a.body} maxLength={600} onChange={(body) => set({ body })} placeholder="What should people know?" />
            <div>
              <span className={labelCls}>Style</span>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button key={t.key} type="button" onClick={() => set({ tone: t.key })}
                    className={cn('rounded-full border px-3 py-1 text-[0.75rem] font-semibold', a.tone === t.key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600')}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <LocalizedField label="Button text (optional)" value={a.ctaLabel ?? { en: '' }} maxLength={40} onChange={(ctaLabel) => set({ ctaLabel })} />
            <Input label="Button opens" value={a.ctaLink ?? ''} onChange={(e) => set({ ctaLink: e.target.value || null })} placeholder="/billing or https://…" />
          </div>
        </Card>
        <Card title="Who sees it"><TargetPicker value={a} onChange={(t) => set(t)} /></Card>
        <Card title="When">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input type="datetime-local" label="Starts" value={toLocal(a.startsAt)} onChange={(e) => set({ startsAt: fromLocal(e.target.value) })} />
            <Input type="datetime-local" label="Ends" value={toLocal(a.endsAt)} onChange={(e) => set({ endsAt: fromLocal(e.target.value) })} />
            <Input type="number" min={-100} max={100} label="Priority (higher shows first)" value={a.priority} onChange={(e) => set({ priority: Number(e.target.value) || 0 })} />
            <div className="flex flex-col justify-end gap-2">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2"><Switch label="People can close it" checked={a.dismissible} onChange={(e) => set({ dismissible: e.target.checked })} /></div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2"><Switch label="Active" checked={a.isActive} onChange={(e) => set({ isActive: e.target.checked })} /></div>
            </div>
          </div>
        </Card>
      </div>
    </Drawer>
  );
}

export default function MobileAnnouncementsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const list = useListParams({ status: 'ALL' });
  const { status: st } = list.filters;
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-mobile-announcements', st, list.debouncedSearch, list.page, list.limit],
    queryFn: () => adminMobileApi.announcements({ page: list.page, limit: list.limit, search: list.debouncedSearch || undefined, status: st === 'ALL' ? undefined : st }),
    placeholderData: keepPreviousData,
  });
  const [editing, setEditing] = useState<{ id: string | null; value: AnnouncementInput } | null>(null);
  const rows = data?.items ?? [];
  const counts = data?.counts;

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-mobile-announcements'] });
  const toggle = useMutation({
    mutationFn: (a: Announcement) => adminMobileApi.updateAnnouncement(a.id, { ...a, isActive: !a.isActive }),
    onSuccess: refresh,
    onError: () => toast.error('Could not update'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminMobileApi.deleteAnnouncement(id),
    onSuccess: () => { toast.success('Deleted'); refresh(); },
    onError: () => toast.error('Could not delete'),
  });
  const STATES = [['ALL', 'All'], ['live', 'Live'], ['scheduled', 'Scheduled'], ['ended', 'Ended'], ['off', 'Paused']];

  return (
    <PageShell>
      <PageHero
        title="Announcements"
        chip={data ? `${num(data.total)} shown` : undefined}
        busy={isFetching}
        loading={isLoading}
        actions={
          <>
            <button type="button" className={heroPrimaryButton} onClick={() => setEditing({ id: null, value: blank() })}><Plus className="h-4 w-4" /> New announcement</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={counts ? [
          { label: 'Live now', value: num(counts.live) },
          { label: 'Scheduled', value: num(counts.scheduled) },
          { label: 'Ended', value: num(counts.ended) },
          { label: 'Paused', value: num(counts.off) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search by title" />}
        chips={st !== 'ALL' ? [<FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{STATES.find(([v]) => v === st)?.[1]}</FilterChip>] : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="State" value={st} active={st !== 'ALL'} onChange={(v) => list.setFilter('status', v)} align="right" options={STATES.map(([value, label]) => ({ value, label }))} />
      </FilterBar>

      <ListCard
        loading={isLoading}
        empty={!!error || !rows.length}
        emptyIcon={<Megaphone className="h-6 w-6" />}
        emptyTitle={error ? 'Could not load announcements' : 'No announcements'}
        emptyText={error ? 'Try again in a moment.' : 'Create one to show a banner in the app.'}
        emptyAction={!error && !list.debouncedSearch && st === 'ALL' ? <Button size="sm" onClick={() => setEditing({ id: null, value: blank() })}>New announcement</Button> : undefined}
        page={list.page} limit={list.limit} total={data?.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <div className="divide-y divide-slate-100">
          {rows.map((a) => {
            const s = statusOf(a);
            const tone = TONES.find((t) => t.key === a.tone);
            return (
              <div key={a.id} className="flex flex-wrap items-start gap-4 px-4 py-4 sm:px-5">
                <div className={cn('mt-1 h-10 w-1.5 rounded-full', tone?.key === 'critical' ? 'bg-rose-500' : tone?.key === 'warning' ? 'bg-amber-500' : tone?.key === 'success' ? 'bg-emerald-500' : 'bg-sky-500')} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{a.title.en}</span>
                    <Pill tone={s.tone}>{s.label}</Pill>
                    {!a.dismissible && <Pill tone="indigo">Cannot close</Pill>}
                    {a.title.ur && <Pill tone="indigo">اردو</Pill>}{a.title.roman && <Pill tone="indigo">Roman</Pill>}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[0.875rem] text-slate-600">{a.body.en}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-slate-500">
                    <span>{describeTarget(a)}</span>
                    {(a.startsAt || a.endsAt) && (
                      <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{a.startsAt ? fmt(a.startsAt) : 'Now'} → {a.endsAt ? fmt(a.endsAt) : 'no end'}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Toggle checked={a.isActive} onChange={() => toggle.mutate(a)} label="Active" />
                  <button type="button" aria-label="Edit" onClick={() => setEditing({ id: a.id, value: { ...a } })} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                  <button type="button" aria-label="Delete" onClick={async () => { if (await confirmDialog({ title: 'Delete this announcement?', text: 'The banner disappears from every app.', yes: 'Delete', danger: true })) remove.mutate(a.id); }}
                    className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </ListCard>

      {editing && <Editor initial={editing.value} id={editing.id} onClose={() => setEditing(null)} />}

      {guide.isOpen && (
        <PageGuide
          title="Announcements"
          description="Banners at the top of the app. Target everyone or a plan, industry, shop, platform or version range, and schedule when they show."
          flowTitle="Life of a banner"
          flow={[
            { label: 'Write', hint: 'English, Urdu, Roman', icon: Pencil, color: '#4f46e5' },
            { label: 'Target', hint: 'Who sees it', icon: Tag, color: '#0284c7' },
            { label: 'Schedule', hint: 'Start and end', icon: CalendarClock, color: '#d97706' },
            { label: 'Live', hint: 'Apps refresh in a minute', icon: Megaphone, color: '#059669' },
          ]}
          steps={[
            { icon: Pencil, color: '#4f46e5', title: 'Write it', text: 'English is required. Empty Urdu or Roman text falls back to English.' },
            { icon: Tag, color: '#0284c7', title: 'Choose who', text: 'Everyone, a plan, an industry or picked shops, plus platform and version range.' },
            { icon: CalendarClock, color: '#d97706', title: 'Schedule', text: 'Leave dates empty to show it now with no end. Use the switch to pause it.' },
          ]}
          tips={['Higher priority shows first.', 'Turn off "People can close it" only for critical notices.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
