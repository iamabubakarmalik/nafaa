/** In-app banners: who sees them, when, and in which language. */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Megaphone, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { adminMobileApi, emptyTarget, type Announcement, type AnnouncementInput } from '@/api/admin-mobile.api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { Card, describeTarget, inputCls, labelCls, LocalizedField, MobileHero, Pill, TargetPicker, Toggle } from '../components/MobileUi';

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

function status(a: Announcement): { label: string; tone: 'emerald' | 'amber' | 'slate' | 'rose' } {
  const now = Date.now();
  if (!a.isActive) return { label: 'Paused', tone: 'slate' };
  if (a.endsAt && new Date(a.endsAt).getTime() <= now) return { label: 'Ended', tone: 'slate' };
  if (a.startsAt && new Date(a.startsAt).getTime() > now) return { label: 'Scheduled', tone: 'amber' };
  return { label: 'Live', tone: 'emerald' };
}

function Preview({ a }: { a: AnnouncementInput }) {
  const tone = TONES.find((t) => t.key === a.tone)!;
  return (
    <div className={cn('rounded-2xl border p-3', tone.cls)}>
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
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not save'),
  });
  const targetIncomplete = a.audience !== 'all' && !a.planSlugs.length && !a.industries.length && !a.tenantIds.length;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50" onClick={onClose}>
      <div className="flex h-full w-full max-w-2xl flex-col bg-slate-50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h3 className="text-lg font-bold">{id ? 'Edit announcement' : 'New announcement'}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
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
                      className={cn('rounded-full border px-3 py-1 text-xs font-semibold', a.tone === t.key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600')}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3">
                <LocalizedField label="Button text (optional)" value={a.ctaLabel ?? { en: '' }} maxLength={40} onChange={(ctaLabel) => set({ ctaLabel })} />
                <label>
                  <span className={labelCls}>Button opens</span>
                  <input value={a.ctaLink ?? ''} onChange={(e) => set({ ctaLink: e.target.value || null })} placeholder="/billing or https://…" className={inputCls} />
                </label>
              </div>
            </div>
          </Card>
          <Card title="Who sees it"><TargetPicker value={a} onChange={(t) => set(t)} /></Card>
          <Card title="When">
            <div className="grid gap-3 sm:grid-cols-2">
              <label><span className={labelCls}>Starts</span><input type="datetime-local" value={toLocal(a.startsAt)} onChange={(e) => set({ startsAt: fromLocal(e.target.value) })} className={inputCls} /></label>
              <label><span className={labelCls}>Ends</span><input type="datetime-local" value={toLocal(a.endsAt)} onChange={(e) => set({ endsAt: fromLocal(e.target.value) })} className={inputCls} /></label>
              <label><span className={labelCls}>Priority (higher shows first)</span><input type="number" min={-100} max={100} value={a.priority} onChange={(e) => set({ priority: Number(e.target.value) || 0 })} className={inputCls} /></label>
              <div className="flex flex-col justify-end gap-2">
                <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">People can close it <Toggle checked={a.dismissible} onChange={(dismissible) => set({ dismissible })} /></label>
                <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">Active <Toggle checked={a.isActive} onChange={(isActive) => set({ isActive })} /></label>
              </div>
            </div>
          </Card>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!a.title.en.trim() || !a.body.en.trim() || targetIncomplete}>
            {id ? 'Save changes' : 'Create'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function MobileAnnouncementsPage() {
  const qc = useQueryClient();
  const { data = [], isLoading, error } = useQuery({ queryKey: ['admin-mobile-announcements'], queryFn: adminMobileApi.announcements });
  const [editing, setEditing] = useState<{ id: string | null; value: AnnouncementInput } | null>(null);

  const toggle = useMutation({
    mutationFn: (a: Announcement) => adminMobileApi.updateAnnouncement(a.id, { ...a, isActive: !a.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-mobile-announcements'] }),
    onError: () => toast.error('Could not update'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminMobileApi.deleteAnnouncement(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['admin-mobile-announcements'] }); },
    onError: () => toast.error('Could not delete'),
  });
  const live = data.filter((a) => status(a).label === 'Live').length;

  return (
    <div className="space-y-6">
      <MobileHero title="Announcements" subtitle="Banners at the top of the app. Target everyone or a plan, industry, business, platform or version range, and schedule when they show.">
        <Button variant="secondary" onClick={() => setEditing({ id: null, value: blank() })}><Plus className="h-4 w-4" />New announcement</Button>
      </MobileHero>

      <Card title={`${data.length} announcement${data.length === 1 ? '' : 's'}`} subtitle={`${live} live now · apps refresh within a minute`}>
        {isLoading ? <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          : error ? <div className="py-8 text-center text-sm text-rose-600">Could not load announcements.</div>
          : data.length === 0 ? (
            <div className="py-12 text-center">
              <Megaphone className="mx-auto h-8 w-8 text-slate-300" />
              <div className="mt-2 text-sm text-slate-500">No announcements yet.</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.map((a) => {
                const s = status(a);
                const tone = TONES.find((t) => t.key === a.tone);
                return (
                  <div key={a.id} className="flex flex-wrap items-start gap-4 py-4">
                    <div className={cn('mt-1 h-10 w-1.5 rounded-full', tone?.key === 'critical' ? 'bg-rose-500' : tone?.key === 'warning' ? 'bg-amber-500' : tone?.key === 'success' ? 'bg-emerald-500' : 'bg-sky-500')} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{a.title.en}</span>
                        <Pill tone={s.tone}>{s.label}</Pill>
                        {!a.dismissible && <Pill tone="indigo">Cannot close</Pill>}
                        {a.title.ur && <Pill tone="teal">اردو</Pill>}{a.title.roman && <Pill tone="teal">Roman</Pill>}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{a.body.en}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>{describeTarget(a)}</span>
                        {(a.startsAt || a.endsAt) && (
                          <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />
                            {a.startsAt ? fmt(a.startsAt) : 'Now'} → {a.endsAt ? fmt(a.endsAt) : 'no end'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Toggle checked={a.isActive} onChange={() => toggle.mutate(a)} label="Active" />
                      <button type="button" aria-label="Edit" onClick={() => setEditing({ id: a.id, value: { ...a, ctaLabel: a.ctaLabel } })} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                      <button type="button" aria-label="Delete" onClick={() => { if (confirm('Delete this announcement?')) remove.mutate(a.id); }} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </Card>

      {editing && <Editor initial={editing.value} id={editing.id} onClose={() => setEditing(null)} />}
    </div>
  );
}
