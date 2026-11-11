/**
 * Entry editor (/marketing/website/entries/:id): a header with status,
 * autosave state, Preview, Validate and Publish; the block outline on the
 * left; the selected block's typed form in the centre; Details, SEO, Links,
 * FAQ and History tabs on the right.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Archive,
  ArchiveRestore,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  CircleAlert,
  CloudCheck,
  Copy,
  Ellipsis,
  ExternalLink,
  Eye,
  Languages,
  LayoutList,
  Loader2,
  Rocket,
  ShieldCheck,
  Trash2,
  Undo2,
  EyeOff,
  Lightbulb,
  PenLine,
  Save,
  Globe,
} from 'lucide-react';
import { Alert, Menu, MenuItem as DsMenuItem, MenuSeparator, PageHero, PageShell, confirmDialog, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@/lib/cn';
import { apiErrorMessage, cmsApi, cmsKeys } from '@/api/marketing/marketing-cms.api';
import { ALLOWED_BLOCKS, ENTRY_TYPE_META, type AdminEntry, type BlockType, type CmsConfig, type DraftBlock } from '../contract/cms-contract';
import { BlockForm } from '../blocks/BlockForm';
import { cloneBlock, createBlock } from '../blocks/registry';
import { StatusChip, ScoreRing } from '../entries/StatusChip';
import { sectionForType } from '../entries/sections';
import { TypeTag } from '../fields/EntryPicker';
import { Btn } from '../fields/ui';
import { BlockOutline } from './BlockOutline';
import { EditorContext, type EditorContextValue } from './EditorContext';
import { blockErrors, formatPkt, relativeTime, statusView } from './lib';
import { PreviewDrawer } from './PreviewDrawer';
import { PublishDialog, UnpublishDialog } from './PublishDialogs';
import { DetailsPanel } from './panels/DetailsPanel';
import { FaqPanel } from './panels/FaqPanel';
import { HistoryPanel } from './panels/HistoryPanel';
import { LinksPanel } from './panels/LinksPanel';
import { SeoPanel } from './panels/SeoPanel';
import { useEntryDraft, type EntryDraft } from './useEntryDraft';

export function EntryEditorPage() {
  const { id = '' } = useParams();
  const entry = useQuery({ queryKey: cmsKeys.entry(id), queryFn: () => cmsApi.entry(id), retry: false, refetchOnWindowFocus: false, staleTime: Infinity });
  const config = useQuery({ queryKey: cmsKeys.config, queryFn: cmsApi.config, staleTime: 5 * 60_000, retry: false });

  if (entry.isLoading) {
    return (
      <PageShell>
        <PageHero title="Entry" back="/marketing/website/pages" loading />
        <div className="grid h-[40vh] place-items-center text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
      </PageShell>
    );
  }
  if (entry.isError || !entry.data) {
    return (
      <PageShell>
        <PageHero title="Entry" back="/marketing/website/pages" />
        <div className="mx-auto mt-6 max-w-md rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/80">
          <CircleAlert className="mx-auto h-8 w-8 text-rose-500" />
          <p className="mt-3 font-semibold text-slate-900">The entry did not open</p>
          <p className="mt-1 text-sm text-slate-500">{apiErrorMessage(entry.error, 'Entry not found')}</p>
          <Link to="/marketing/website/pages" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to the list
          </Link>
        </div>
      </PageShell>
    );
  }
  return <Editor key={entry.data.id} initial={entry.data} config={config.data} />;
}

type Tab = 'details' | 'seo' | 'links' | 'faq' | 'history';

function Editor({ initial, config }: { initial: AdminEntry; config: CmsConfig | undefined }) {
  const nav = useNavigate();
  const guide = usePageGuide();
  const draft = useEntryDraft(initial);
  const { entry, seo, setSeo, state, update, flush, replace } = draft;
  const blocks = entry.blocks ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(blocks[0]?.id ?? null);
  const [tab, setTab] = useState<Tab>('details');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishMode, setPublishMode] = useState<'now' | 'schedule' | null>(null);
  const [unpublish, setUnpublish] = useState<'unpublish' | 'archive' | null>(null);
  const meta = ENTRY_TYPE_META[entry.type];
  const allowed = (config?.types.find((t) => t.type === entry.type)?.allowedBlocks ?? ALLOWED_BLOCKS[entry.type]) as readonly BlockType[];

  // First load: ask the API for the SEO report (dry run).
  useEffect(() => {
    cmsApi
      .validate(initial.id)
      .then((r) => setSeo(r.seo))
      .catch(() => undefined);
  }, [initial.id, setSeo]);

  // Cmd/Ctrl+S saves now.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void flush();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flush]);

  const ctx: EditorContextValue = useMemo(
    () => ({ config, entryId: entry.id, entryType: entry.type, locale: entry.locale, refs: entry.refs ?? {}, mediaRefs: entry.mediaRefs ?? {}, addRefs: draft.addRefs, addMedia: draft.addMedia }),
    [config, entry.id, entry.type, entry.locale, entry.refs, entry.mediaRefs, draft.addRefs, draft.addMedia],
  );

  const setBlocks = useCallback((next: DraftBlock[]) => update({ blocks: next }), [update]);
  const selectedIndex = blocks.findIndex((b) => b.id === selectedId);
  const selected = selectedIndex >= 0 ? blocks[selectedIndex] : undefined;

  const problemIds = useMemo(() => {
    const ids = new Set<string>();
    for (const b of blocks) if (!b.hidden && Object.keys(blockErrors(b)).length) ids.add(b.id);
    for (const i of seo?.issues ?? []) if (i.blockId && i.severity !== 'pass') ids.add(i.blockId);
    return ids;
  }, [blocks, seo]);

  const validate = useMutation({
    mutationFn: async () => {
      const ok = await flush();
      if (!ok) throw new Error('The draft was not saved. Fix the save problem first.');
      return cmsApi.validate(entry.id);
    },
    onSuccess: (r) => {
      setSeo(r.seo);
      setTab('seo');
      const errors = r.seo.issues.filter((i) => i.severity === 'error').length;
      const warnings = r.seo.issues.filter((i) => i.severity === 'warning').length;
      if (errors) toast.error(`${errors} error(s) block publishing, ${warnings} warning(s)`);
      else toast.success(warnings ? `Ready to publish · ${warnings} warning(s)` : 'All checks passed. Ready to publish.');
    },
    onError: (e) => toast.error(e instanceof Error && !('response' in e) ? e.message : apiErrorMessage(e)),
  });

  const section = sectionForType(entry.type);

  return (
    <EditorContext.Provider value={ctx}>
      <PageShell>
        <TopBar
          draft={draft}
          sectionPath={`/marketing/website/${section.key}`}
          sectionLabel={section.label}
          onPreview={() => setPreviewOpen(true)}
          onValidate={() => validate.mutate()}
          validating={validate.isPending}
          onPublish={(m) => setPublishMode(m)}
          onUnpublish={(a) => setUnpublish(a)}
          locales={config?.locales ?? ['en']}
          onNavigate={(path) => nav(path)}
          onGuide={guide.open}
        />

        {state === 'conflict' && (
          <Alert
            tone="warning"
            title="Someone else changed this entry"
            action={
              <div className="flex flex-wrap gap-2">
                <Btn size="sm" onClick={() => void draft.reloadFromServer()}>Load their copy</Btn>
                <Btn size="sm" variant="dark" onClick={() => void draft.overwrite()}>Keep my changes</Btn>
              </div>
            }
          >
            It was changed after you opened it. Your edits are not saved yet.
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[248px_minmax(0,1fr)_380px] lg:items-start">
          <aside className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80 lg:sticky lg:top-3 lg:max-h-[calc(100dvh-1.5rem)] lg:overflow-y-auto">
            <BlockOutline
              blocks={blocks}
              selectedId={selectedId}
              onSelect={setSelectedId}
              allowed={allowed}
              entryType={entry.type}
              problemIds={problemIds}
              onMove={(from, to) => {
                const next = [...blocks];
                const [b] = next.splice(from, 1);
                next.splice(to, 0, b as DraftBlock);
                setBlocks(next);
              }}
              onDuplicate={(id) => {
                const i = blocks.findIndex((b) => b.id === id);
                const src = blocks[i];
                if (!src) return;
                const copy = cloneBlock(src);
                const next = [...blocks];
                next.splice(i + 1, 0, copy);
                setBlocks(next);
                setSelectedId(copy.id);
              }}
              onToggleHidden={(id) => setBlocks(blocks.map((b) => (b.id === id ? ({ ...b, hidden: b.hidden ? undefined : true } as DraftBlock) : b)))}
              onDelete={(id) => {
                const i = blocks.findIndex((b) => b.id === id);
                const next = blocks.filter((b) => b.id !== id);
                setBlocks(next);
                if (selectedId === id) setSelectedId(next[Math.min(i, next.length - 1)]?.id ?? null);
                toast('Block removed', { action: { label: 'Undo', onClick: () => setBlocks(blocks) } });
              }}
              onAdd={(type, at) => {
                const b = createBlock(type, entry.type);
                const next = [...blocks];
                next.splice(type === 'hero' ? 0 : at, 0, b);
                setBlocks(next);
                setSelectedId(b.id);
              }}
            />
          </aside>

          <main className="min-w-0">
            <div>
              {selected ? (
                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 lg:p-6">
                  <BlockForm
                    key={selected.id}
                    block={selected}
                    entryType={entry.type}
                    title={entry.title}
                    summary={entry.summary}
                    allowed={allowed.includes(selected.type as BlockType)}
                    issues={(seo?.issues ?? []).filter((i) => i.blockId === selected.id && i.severity !== 'pass')}
                    onChange={(next) => setBlocks(blocks.map((b) => (b.id === next.id ? next : b)))}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                  <LayoutList className="h-8 w-8 text-slate-300" />
                  <p className="font-semibold text-slate-800">No block selected</p>
                  <p className="max-w-sm text-sm text-slate-500">Pick a block on the left or add a new one. The page title, SEO and links are in the right panel.</p>
                </div>
              )}
              <p className="mt-4 text-center text-[11px] text-slate-400">
                Every change saves itself after 2 seconds (⌘S saves now) · The live site changes only when you publish
              </p>
            </div>
          </main>

          <aside className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80 lg:sticky lg:top-3 lg:max-h-[calc(100dvh-1.5rem)] lg:overflow-y-auto">
            <div className="sticky top-0 z-10 flex gap-0.5 border-b border-slate-200 bg-white px-2 pt-2">
              {(
                [
                  ['details', 'Details'],
                  ['seo', 'SEO'],
                  ['links', 'Links'],
                  ['faq', `FAQ${entry.faqIds?.length ? ` (${entry.faqIds.length})` : ''}`],
                  ['history', 'History'],
                ] as [Tab, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={cn('relative inline-flex items-center gap-1.5 rounded-t-lg px-2.5 pb-2.5 pt-1.5 text-xs font-semibold transition', tab === k ? 'text-brand-700 after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded after:bg-brand-600' : 'text-slate-500 hover:text-slate-800')}
                >
                  {label}
                  {k === 'seo' && <ScoreRing score={seo?.score ?? entry.seoScore} size={20} />}
                </button>
              ))}
            </div>
            <div className="p-4">
              {tab === 'details' && <DetailsPanel entry={entry} update={update} onReplace={(e) => replace(e, { keepEdits: true })} />}
              {tab === 'seo' && (
                <SeoPanel
                  entry={entry}
                  seo={seo}
                  update={update}
                  onSelectBlock={(id) => {
                    setSelectedId(id);
                  }}
                />
              )}
              {tab === 'links' && <LinksPanel entry={entry} update={update} />}
              {tab === 'faq' && <FaqPanel entry={entry} update={update} />}
              {tab === 'history' && <HistoryPanel entry={entry} beforeRestore={flush} onRestored={(e) => replace(e)} />}
            </div>
          </aside>
        </div>

        {guide.isOpen && (
          <PageGuide
            title="Entry editor"
            description="Edit one page of the website from first draft to live."
            flowTitle="From draft to live"
            flow={[
              { label: 'Edit blocks', hint: 'Left outline, centre form', icon: PenLine, color: '#4f46e5' },
              { label: 'Autosave', hint: 'Every 2 seconds', icon: Save, color: '#64748b' },
              { label: 'Validate', hint: 'Errors and SEO', icon: ShieldCheck, color: '#d97706' },
              { label: 'Publish', hint: 'Now or scheduled', icon: Rocket, color: '#0284c7' },
              { label: 'Live', hint: 'On nafaa.pk', icon: Globe, color: '#059669' },
            ]}
            steps={[
              { icon: LayoutList, color: '#4f46e5', title: 'Blocks', text: 'The page is a list of blocks. Add, drag, hide or duplicate them in the left outline, and edit the selected one in the centre.' },
              { icon: ShieldCheck, color: '#d97706', title: 'Validate', text: 'Checks every block and the SEO report. Errors block publishing; warnings do not.' },
              { icon: CalendarClock, color: '#0284c7', title: 'Publish or schedule', text: 'Use the arrow next to Publish to schedule in Pakistan time, cancel a schedule, or unpublish.' },
              { icon: Eye, color: '#059669', title: 'Preview', text: 'See the page as visitors will, including unpublished changes.' },
            ]}
            tips={['Press ⌘S (Ctrl+S) to save right now.', 'The History tab lets you restore an older version.']}
            shortcuts={[['⌘ S', 'Save now'], ['G', 'This guide']]}
            onClose={guide.close}
          />
        )}
      </PageShell>

      <PreviewDrawer open={previewOpen} onClose={() => setPreviewOpen(false)} entryId={entry.id} version={draft.server.version} flush={flush} />
      {publishMode && (
        <PublishDialog
          open
          initialMode={publishMode}
          onClose={() => setPublishMode(null)}
          entry={entry}
          flush={flush}
          onSelectBlock={setSelectedId}
          onDone={(e) => {
            replace(e);
            void cmsApi.validate(e.id).then((r) => setSeo(r.seo)).catch(() => undefined);
          }}
        />
      )}
      {unpublish && <UnpublishDialog open action={unpublish} onClose={() => setUnpublish(null)} entry={entry} onDone={(e) => replace(e)} />}
    </EditorContext.Provider>
  );
}

function SaveIndicator({ draft }: { draft: EntryDraft }) {
  const { state, savedAt, error, flush } = draft;
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  if (state === 'saving')
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </span>
    );
  if (state === 'dirty') return <span className="inline-flex items-center gap-1.5 text-xs"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Unsaved changes</span>;
  if (state === 'error')
    return (
      <button type="button" onClick={() => void flush()} className="inline-flex items-center gap-1.5 text-xs font-semibold underline" title={error ?? ''}>
        <CircleAlert className="h-3.5 w-3.5" /> Save failed · retry
      </button>
    );
  if (state === 'conflict') return <span className="inline-flex items-center gap-1.5 text-xs font-semibold"><CircleAlert className="h-3.5 w-3.5" /> Conflict</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" title={savedAt ? formatPkt(savedAt) : undefined}>
      <CloudCheck className="h-3.5 w-3.5" /> Saved{savedAt ? ` · ${relativeTime(savedAt)}` : ''}
    </span>
  );
}

function TopBar({
  draft,
  sectionPath,
  sectionLabel,
  onPreview,
  onValidate,
  validating,
  onPublish,
  onUnpublish,
  locales,
  onNavigate,
  onGuide,
}: {
  draft: EntryDraft;
  sectionPath: string;
  sectionLabel: string;
  onPreview: () => void;
  onValidate: () => void;
  validating: boolean;
  onPublish: (mode: 'now' | 'schedule') => void;
  onUnpublish: (a: 'unpublish' | 'archive') => void;
  locales: string[];
  onNavigate: (path: string) => void;
  onGuide: () => void;
}) {
  const { entry, seo, replace } = draft;
  const [menu, setMenu] = useState(false);
  const [publishMenu, setPublishMenu] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const pubRef = useRef<HTMLButtonElement>(null);
  const live = entry.status === 'PUBLISHED';
  const neverPublished = !entry.firstPublishedAt;
  const otherLocales = locales.filter((l) => l !== entry.locale);
  const view = statusView({ status: entry.status, hasUnpublishedChanges: entry.hasUnpublishedChanges, noindexReason: seo?.robots.index === false ? seo.robots.reason ?? 'editor' : null });

  const act = useMutation({
    mutationFn: async (kind: 'duplicate' | 'cancel-schedule' | 'restore-archive' | 'delete' | `translate:${string}`) => {
      await draft.flush();
      if (kind === 'duplicate') return { kind, entry: await cmsApi.duplicate(entry.id) };
      if (kind === 'cancel-schedule') return { kind, entry: (await cmsApi.cancelSchedule(entry.id)).entry };
      if (kind === 'restore-archive') return { kind, entry: (await cmsApi.restoreArchive(entry.id)).entry };
      if (kind === 'delete') {
        await cmsApi.deleteEntry(entry.id);
        return { kind, entry: null };
      }
      return { kind, entry: await cmsApi.translate(entry.id, kind.slice('translate:'.length)) };
    },
    onSuccess: (r) => {
      setMenu(false);
      if (r.kind === 'duplicate' && r.entry) {
        toast.success('Copy created (draft)');
        onNavigate(`/marketing/website/entries/${r.entry.id}`);
      } else if (r.kind.startsWith('translate:') && r.entry) {
        toast.success('Translation draft created');
        onNavigate(`/marketing/website/entries/${r.entry.id}`);
      } else if (r.kind === 'delete') {
        toast.success('Entry deleted');
        onNavigate(sectionPath);
      } else if (r.entry) {
        replace(r.entry, { keepEdits: true });
        toast.success(r.kind === 'cancel-schedule' ? 'Schedule cancelled' : 'Restored from archive as a draft');
      }
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const askDelete = async () => {
    setMenu(false);
    const ok = await confirmDialog({
      title: 'Delete this entry?',
      text: `${entry.title} (${ENTRY_TYPE_META[entry.type].label}) was never published, so it is deleted completely and cannot be restored.`,
      yes: 'Delete',
      danger: true,
    });
    if (ok) act.mutate('delete');
  };

  const words = entry.wordCount ?? 0;

  return (
    <PageHero
      title={entry.title || 'Untitled'}
      back={sectionPath}
      backLabel={sectionLabel}
      chip={view.label}
      meta={entry.path}
      actions={
        <>
          <span className="nafaa-hero-subtle mr-1 hidden md:inline-flex"><SaveIndicator draft={draft} /></span>
          {entry.liveUrl && (
            <a href={entry.liveUrl} target="_blank" rel="noreferrer" className={heroIconButton} title="Open the live page" aria-label="Open the live page">
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button type="button" className={heroButton} onClick={onPreview}><Eye className="h-4 w-4" /> <span className="hidden sm:inline">Preview</span></button>
          <button type="button" className={heroButton} onClick={onValidate} disabled={validating}>
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} <span className="hidden sm:inline">Validate</span>
          </button>
          <span className="inline-flex">
            <button type="button" className={cn(heroPrimaryButton, 'rounded-r-none')} onClick={() => onPublish('now')}>
              <Rocket className="h-4 w-4" /> {live && entry.hasUnpublishedChanges ? 'Update live page' : 'Publish'}
            </button>
            <button ref={pubRef} type="button" onClick={() => setPublishMenu((o) => !o)} className={cn(heroPrimaryButton, 'rounded-l-none border-l border-black/10 px-2')} aria-label="Publish options" aria-haspopup="menu">
              <ChevronDown className="h-4 w-4" />
            </button>
          </span>
          <Menu open={publishMenu} onClose={() => setPublishMenu(false)} anchorRef={pubRef} width="w-56">
            <DsMenuItem icon={<CalendarClock />} onClick={() => { setPublishMenu(false); onPublish('schedule'); }}>Schedule (Pakistan time)</DsMenuItem>
            {entry.status === 'SCHEDULED' && <DsMenuItem icon={<Undo2 />} onClick={() => { setPublishMenu(false); act.mutate('cancel-schedule'); }}>Cancel schedule</DsMenuItem>}
            {live && <DsMenuItem icon={<EyeOff />} tone="danger" onClick={() => { setPublishMenu(false); onUnpublish('unpublish'); }}>Unpublish</DsMenuItem>}
          </Menu>
          <button ref={menuRef} type="button" onClick={() => setMenu((o) => !o)} className={heroIconButton} aria-label="More actions" aria-haspopup="menu">
            <Ellipsis className="h-4 w-4" />
          </button>
          <Menu open={menu} onClose={() => setMenu(false)} anchorRef={menuRef} width="w-64">
            <DsMenuItem icon={<Copy />} onClick={() => act.mutate('duplicate')}>Make a copy</DsMenuItem>
            {otherLocales.map((l) => (
              <DsMenuItem key={l} icon={<Languages />} onClick={() => act.mutate(`translate:${l}`)}>{`Create ${l.toUpperCase()} translation`}</DsMenuItem>
            ))}
            {entry.status === 'ARCHIVED' ? (
              <DsMenuItem icon={<ArchiveRestore />} onClick={() => act.mutate('restore-archive')}>Restore from archive</DsMenuItem>
            ) : (
              <DsMenuItem icon={<Archive />} onClick={() => { setMenu(false); onUnpublish('archive'); }}>Archive</DsMenuItem>
            )}
            {neverPublished && (entry.status === 'DRAFT' || entry.status === 'ARCHIVED') && (
              <DsMenuItem icon={<Trash2 />} tone="danger" onClick={askDelete}>Delete forever</DsMenuItem>
            )}
            <MenuSeparator />
            <p className="px-2.5 py-1.5 text-[11px] text-slate-400">
              v{entry.version} · created {formatPkt(entry.createdAt, false)}
              {entry.publishedAt && <> · live {formatPkt(entry.publishedAt, false)}</>}
            </p>
          </Menu>
          <button type="button" className={heroButton} onClick={onGuide} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
        </>
      }
      stats={[
        { label: 'SEO score', value: seo?.score ?? entry.seoScore ?? '—', hint: seo ? `${seo.issues.filter((i) => i.severity === 'error').length} errors` : undefined },
        { label: 'Words', value: words.toLocaleString('en-PK') },
        { label: 'Blocks', value: entry.blocks?.length ?? 0 },
        { label: 'Status', value: view.label, hint: entry.status === 'SCHEDULED' && entry.publishAt ? `${formatPkt(entry.publishAt)} PKT` : undefined },
      ]}
    />
  );
}
