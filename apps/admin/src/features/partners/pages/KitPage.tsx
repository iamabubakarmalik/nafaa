/**
 * Partner marketing kit: links, videos, PDFs and images partners share with
 * shops, plus the demo account they use to show Nafaa. Partners see the kit
 * in their portal as soon as it is saved.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ExternalLink, FileText, Image, Lightbulb, Link2, Lock, MonitorPlay, Plus, Save, Share2, Trash2, Video } from 'lucide-react';
import { Button, Card, Input, PageHero, PageShell, Select, Skeleton, Switch, Textarea, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminPartnersApi, type KitItem, type PartnerKit } from '@/api/admin-partners.api';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { num } from '@/lib/format';

const TYPES: Array<{ value: KitItem['type']; label: string; icon: typeof Link2 }> = [
  { value: 'link', label: 'Link', icon: Link2 },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'image', label: 'Image', icon: Image },
];
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const validUrl = (u: string) => /^https?:\/\/\S+$/i.test(u.trim());

export default function KitPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const can = useCan();
  const canManage = can('partners.manage');
  const kit = useQuery({ queryKey: ['admin', 'partners', 'kit'], queryFn: adminPartnersApi.kit });
  const [draft, setDraft] = useState<PartnerKit | null>(null);
  useEffect(() => { if (kit.data) setDraft(kit.data); }, [kit.data]);

  const dirty = useMemo(() => !!draft && !!kit.data && JSON.stringify(draft) !== JSON.stringify(kit.data), [draft, kit.data]);
  const problems = useMemo(() => {
    if (!draft) return [];
    const out: string[] = [];
    draft.items.forEach((it, i) => {
      if (!it.title.trim()) out.push(`Item ${i + 1} needs a title`);
      if (!validUrl(it.url)) out.push(`Item ${i + 1} needs a full link starting with https://`);
    });
    if (draft.demo && !validUrl(draft.demo.url)) out.push('The demo needs a full link starting with https://');
    return out;
  }, [draft]);

  const save = useMutation({
    mutationFn: () => adminPartnersApi.saveKit(draft!),
    onSuccess: (k) => { toast.success('Kit saved. Partners see it now.'); qc.setQueryData(['admin', 'partners', 'kit'], k); setDraft(k); },
    onError: (e) => toast.error(apiError(e)),
  });

  const setItem = (i: number, patch: Partial<KitItem>) => setDraft((d) => (d ? { ...d, items: d.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) } : d));
  const move = (i: number, by: number) => setDraft((d) => {
    if (!d) return d;
    const items = [...d.items];
    const j = i + by;
    if (j < 0 || j >= items.length) return d;
    [items[i], items[j]] = [items[j], items[i]];
    return { ...d, items };
  });
  const count = (t: KitItem['type']) => draft?.items.filter((x) => x.type === t).length ?? 0;

  return (
    <PageShell>
      <PageHero
        title="Marketing kit"
        chip={draft ? `${num(draft.items.length)} items` : undefined}
        busy={kit.isFetching}
        loading={kit.isLoading}
        actions={
          <>
            {canManage && (
              <button type="button" className={heroButton} disabled={!dirty || !!problems.length || save.isPending} onClick={() => save.mutate()} title={problems[0]}>
                <Save className="h-4 w-4" /> {save.isPending ? 'Saving…' : 'Save kit'}
              </button>
            )}
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={draft ? [
          { label: 'Videos', value: num(count('video')) },
          { label: 'PDFs and images', value: num(count('pdf') + count('image')) },
          { label: 'Links', value: num(count('link')) },
          { label: 'Demo account', value: draft.demo ? 'Set' : 'Not set' },
        ] : undefined}
      />

      {!draft ? <Skeleton className="h-96 rounded-3xl" /> : (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card title="Items" description="Shown to partners in this order." className="xl:col-span-2"
            actions={canManage ? <Button size="sm" variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setDraft({ ...draft, items: [...draft.items, { id: newId(), title: '', type: 'link', url: '', description: null }] })}>Add item</Button> : undefined}>
            {!draft.items.length ? (
              <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-[0.8125rem] text-slate-500 ring-1 ring-slate-200">No items yet. Add a demo video, a price list PDF or a link to the website.</p>
            ) : (
              <ul className="space-y-3">
                {draft.items.map((it, i) => {
                  const T = TYPES.find((t) => t.value === it.type) ?? TYPES[0];
                  return (
                    <li key={it.id} className="rounded-2xl p-3 ring-1 ring-slate-200">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><T.icon className="h-3.5 w-3.5" /></span>
                        <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-slate-900">{it.title || `Item ${i + 1}`}</span>
                        {validUrl(it.url) && <a href={it.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-brand-600" title="Open"><ExternalLink className="h-4 w-4" /></a>}
                        {canManage && (
                          <>
                            <Button variant="ghost" size="icon" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" aria-label="Move down" disabled={i === draft.items.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" aria-label="Remove" className="text-rose-600" onClick={() => setDraft({ ...draft, items: draft.items.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                          </>
                        )}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
                        <Input label="Title" value={it.title} disabled={!canManage} onChange={(e) => setItem(i, { title: e.target.value })} placeholder="e.g. Nafaa in 2 minutes" />
                        <Select label="Type" value={it.type} disabled={!canManage} onChange={(e) => setItem(i, { type: e.target.value as KitItem['type'] })} options={TYPES.map(({ value, label }) => ({ value, label }))} />
                      </div>
                      <Input label="Link" wrapperClassName="mt-2" value={it.url} disabled={!canManage} onChange={(e) => setItem(i, { url: e.target.value })} placeholder="https://"
                        error={it.url && !validUrl(it.url) ? 'Start with https://' : undefined} />
                      <Textarea label="Short note for partners" wrapperClassName="mt-2" rows={2} value={it.description ?? ''} disabled={!canManage} onChange={(e) => setItem(i, { description: e.target.value || null })} placeholder="When to use it" />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Demo account" description="A sample shop partners sign in to when they show Nafaa to a shopkeeper.">
            <div className="space-y-3">
              <Switch label="Show a demo account" checked={!!draft.demo} disabled={!canManage}
                onChange={(e) => setDraft({ ...draft, demo: e.target.checked ? { url: 'https://', email: '', password: '', note: null } : null })} />
              {draft.demo && (
                <>
                  <Input label="Sign-in link" value={draft.demo.url} disabled={!canManage} onChange={(e) => setDraft({ ...draft, demo: { ...draft.demo!, url: e.target.value } })}
                    error={!validUrl(draft.demo.url) ? 'Start with https://' : undefined} />
                  <Input label="Email or phone" value={draft.demo.email} disabled={!canManage} onChange={(e) => setDraft({ ...draft, demo: { ...draft.demo!, email: e.target.value } })} />
                  <Input label="Password" value={draft.demo.password} disabled={!canManage} onChange={(e) => setDraft({ ...draft, demo: { ...draft.demo!, password: e.target.value } })}
                    hint="Every partner can see this. Use a demo shop with sample data only." />
                  <Textarea label="Note" rows={2} value={draft.demo.note ?? ''} disabled={!canManage} onChange={(e) => setDraft({ ...draft, demo: { ...draft.demo!, note: e.target.value || null } })} placeholder="e.g. Do not change prices; data resets every night" />
                </>
              )}
              {!canManage && <p className="inline-flex items-center gap-1 text-[0.75rem] text-slate-500"><Lock className="h-3.5 w-3.5" /> View only</p>}
            </div>
          </Card>
        </div>
      )}

      {guide.isOpen && (
        <PageGuide
          title="Marketing kit"
          description="Material partners use to sell Nafaa. It shows in the partner portal under Kit."
          flowTitle="How partners use it"
          flow={[
            { label: 'You add items', icon: Plus, color: '#4f46e5' },
            { label: 'Save kit', icon: Save, color: '#0284c7' },
            { label: 'Partner opens Kit', icon: MonitorPlay, color: '#d97706' },
            { label: 'Shares with shops', icon: Share2, color: '#059669' },
          ]}
          steps={[
            { icon: Video, color: '#4f46e5', title: 'Videos and PDFs', text: 'Upload files anywhere public (for example the website media library) and paste the link here.' },
            { icon: MonitorPlay, color: '#d97706', title: 'Demo account', text: 'Give partners a sample shop to show. Never use a real shop: every partner sees the password.' },
            { icon: ArrowUp, color: '#059669', title: 'Order', text: 'Move the most useful items to the top. Partners see them in this order.' },
          ]}
          tips={['Links must start with https://.', 'Nothing changes for partners until you press Save kit.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
