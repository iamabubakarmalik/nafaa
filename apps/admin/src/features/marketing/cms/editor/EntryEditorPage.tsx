/**
 * Entry editor (/marketing/website/entries/:id, ARCH 13.3): top bar with
 * status, autosave state, Preview, Validate and Publish; block outline on the
 * left; the selected block's typed form in the centre; Details, SEO, Links,
 * FAQ and History tabs on the right.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { apiErrorMessage, cmsApi, cmsKeys } from '@/api/marketing/marketing-cms.api';
import { ALLOWED_BLOCKS, ENTRY_TYPE_META, type AdminEntry, type BlockType, type CmsConfig, type DraftBlock } from '../contract/cms-contract';
import { BlockForm } from '../blocks/BlockForm';
import { cloneBlock, createBlock } from '../blocks/registry';
import { StatusChip, ScoreRing } from '../entries/StatusChip';
import { sectionForType } from '../entries/sections';
import { TypeTag } from '../fields/EntryPicker';
import { Btn, Modal, useOutsideClick } from '../fields/ui';
import { BlockOutline } from './BlockOutline';
import { EditorContext, type EditorContextValue } from './EditorContext';
import { blockErrors, formatPkt, relativeTime } from './lib';
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
      <div className="grid h-[60vh] place-items-center text-sm text-neutral-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (entry.isError || !entry.data) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center">
        <CircleAlert className="mx-auto h-8 w-8 text-rose-500" />
        <p className="mt-3 font-semibold text-neutral-900">Entry nahi khuli</p>
        <p className="mt-1 text-sm text-neutral-500">{apiErrorMessage(entry.error, 'Entry nahi mili')}</p>
        <Link to="/marketing/website/pages" className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:underline">
          Wapas list par
        </Link>
      </div>
    );
  }
  return <Editor key={entry.data.id} initial={entry.data} config={config.data} />;
}

type Tab = 'details' | 'seo' | 'links' | 'faq' | 'history';

function Editor({ initial, config }: { initial: AdminEntry; config: CmsConfig | undefined }) {
  const nav = useNavigate();
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
      if (!ok) throw new Error('Pehle save ka masla hal karein');
      return cmsApi.validate(entry.id);
    },
    onSuccess: (r) => {
      setSeo(r.seo);
      setTab('seo');
      const errors = r.seo.issues.filter((i) => i.severity === 'error').length;
      const warnings = r.seo.issues.filter((i) => i.severity === 'warning').length;
      if (errors) toast.error(`${errors} error(s) publish rok rahe hain, ${warnings} warning(s)`);
      else toast.success(warnings ? `Publish ho sakta hai · ${warnings} warning(s)` : 'Sab theek hai, publish ho sakta hai');
    },
    onError: (e) => toast.error(e instanceof Error && !('response' in e) ? e.message : apiErrorMessage(e)),
  });

  const section = sectionForType(entry.type);

  return (
    <EditorContext.Provider value={ctx}>
      <div className="-mx-4 -my-6 flex flex-col lg:-mx-8 lg:-my-8 lg:h-screen">
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
        />

        {state === 'conflict' && (
          <div className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 lg:px-6">
            <CircleAlert className="h-4 w-4" />
            <span className="flex-1">Ye entry kisi aur ne aap ke kholne ke baad badal di. Aap ki tabdeeliyan abhi save nahi huin.</span>
            <Btn size="sm" onClick={() => void draft.reloadFromServer()}>
              Unki copy load karein
            </Btn>
            <Btn size="sm" variant="dark" onClick={() => void draft.overwrite()}>
              Meri tabdeeliyan rakhein
            </Btn>
          </div>
        )}

        <div className="grid grid-cols-1 lg:min-h-0 lg:flex-1 lg:grid-cols-[248px_minmax(0,1fr)_380px]">
          <aside className="border-r border-neutral-200 bg-white lg:min-h-0">
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
                toast('Block hata diya', { action: { label: 'Wapas', onClick: () => setBlocks(blocks) } });
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

          <main className="min-w-0 bg-neutral-50 px-4 py-6 lg:min-h-0 lg:overflow-y-auto lg:px-8">
            <div className="mx-auto max-w-3xl">
              {selected ? (
                <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:p-6">
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
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
                  <LayoutList className="h-8 w-8 text-neutral-300" />
                  <p className="font-semibold text-neutral-800">Koi block nahi chuna</p>
                  <p className="max-w-sm text-sm text-neutral-500">Left se block chunein ya naya block shamil karein. Page title, SEO aur links right panel me hain.</p>
                </div>
              )}
              <p className="mt-4 text-center text-[11px] text-neutral-400">
                Har tabdeeli 2 second baad khud save hoti hai (⌘S abhi save) · Live site tab badalti hai jab Publish karein
              </p>
            </div>
          </main>

          <aside className="border-l border-neutral-200 bg-white lg:min-h-0 lg:overflow-y-auto">
            <div className="sticky top-0 z-10 flex gap-0.5 border-b border-neutral-200 bg-white px-2 pt-2">
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
                  className={cn('relative inline-flex items-center gap-1.5 rounded-t-lg px-2.5 pb-2.5 pt-1.5 text-xs font-semibold transition', tab === k ? 'text-emerald-700 after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded after:bg-emerald-600' : 'text-neutral-500 hover:text-neutral-800')}
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
      </div>

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
      <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Save ho raha hai…
      </span>
    );
  if (state === 'dirty') return <span className="inline-flex items-center gap-1.5 text-xs text-amber-700"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Tabdeeliyan</span>;
  if (state === 'error')
    return (
      <button type="button" onClick={() => void flush()} className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:underline" title={error ?? ''}>
        <CircleAlert className="h-3.5 w-3.5" /> Save fail · dobara
      </button>
    );
  if (state === 'conflict') return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700"><CircleAlert className="h-3.5 w-3.5" /> Conflict</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500" title={savedAt ? formatPkt(savedAt) : undefined}>
      <CloudCheck className="h-3.5 w-3.5 text-emerald-600" /> Saved{savedAt ? ` · ${relativeTime(savedAt)}` : ''}
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
}) {
  const { entry, seo, replace } = draft;
  const [menu, setMenu] = useState(false);
  const [publishMenu, setPublishMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useOutsideClick<HTMLDivElement>(menu, () => setMenu(false));
  const pubRef = useOutsideClick<HTMLDivElement>(publishMenu, () => setPublishMenu(false));
  const live = entry.status === 'PUBLISHED';
  const neverPublished = !entry.firstPublishedAt;
  const otherLocales = locales.filter((l) => l !== entry.locale);

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
        toast.success('Copy ban gayi (draft)');
        onNavigate(`/marketing/website/entries/${r.entry.id}`);
      } else if (r.kind.startsWith('translate:') && r.entry) {
        toast.success('Tarjume ka draft ban gaya');
        onNavigate(`/marketing/website/entries/${r.entry.id}`);
      } else if (r.kind === 'delete') {
        toast.success('Entry mita di');
        onNavigate(sectionPath);
      } else if (r.entry) {
        replace(r.entry, { keepEdits: true });
        toast.success(r.kind === 'cancel-schedule' ? 'Schedule cancel ho gaya' : 'Archive se wapas draft me');
      }
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div className="relative z-30 flex h-[57px] shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4 lg:px-6">
      <Link to={sectionPath} className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800" title={`Wapas: ${sectionLabel}`}>
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden xl:inline">{sectionLabel}</span>
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-[15px] font-semibold text-neutral-900">{entry.title || 'Bina title'}</h1>
          <TypeTag type={entry.type} />
          <StatusChip status={entry.status} hasUnpublishedChanges={entry.hasUnpublishedChanges} noindexReason={seo?.robots.index === false ? seo.robots.reason ?? 'editor' : null} />
          {entry.status === 'SCHEDULED' && entry.publishAt && <span className="hidden text-xs text-blue-700 md:inline">{formatPkt(entry.publishAt)} PKT</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="truncate font-mono text-[11px] text-neutral-500">{entry.path}</span>
          <SaveIndicator draft={draft} />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {entry.liveUrl && (
          <a href={entry.liveUrl} target="_blank" rel="noreferrer" className="hidden h-9 items-center gap-1 rounded-lg px-2.5 text-sm text-neutral-600 hover:bg-neutral-100 md:inline-flex" title="Live page">
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        <Btn variant="ghost" onClick={onPreview}>
          <Eye className="h-4 w-4" /> <span className="hidden sm:inline">Preview</span>
        </Btn>
        <Btn variant="secondary" onClick={onValidate} loading={validating}>
          <ShieldCheck className="h-4 w-4" /> <span className="hidden sm:inline">Validate</span>
        </Btn>
        <div ref={pubRef} className="relative flex">
          <Btn variant="primary" className="rounded-r-none" onClick={() => onPublish('now')}>
            <Rocket className="h-4 w-4" /> {live ? (entry.hasUnpublishedChanges ? 'Update publish' : 'Publish') : 'Publish'}
          </Btn>
          <button type="button" onClick={() => setPublishMenu((o) => !o)} className="grid h-9 w-8 place-items-center rounded-r-lg border-l border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700" aria-label="Publish options">
            <ChevronDown className="h-4 w-4" />
          </button>
          {publishMenu && (
            <div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl border border-neutral-200 bg-white p-1 shadow-xl">
              <MenuItem icon={CalendarClock} label="Schedule (PKT)" onClick={() => { setPublishMenu(false); onPublish('schedule'); }} />
              {entry.status === 'SCHEDULED' && <MenuItem icon={Undo2} label="Schedule cancel" onClick={() => act.mutate('cancel-schedule')} />}
              {live && <MenuItem icon={EyeOff} label="Unpublish" danger onClick={() => { setPublishMenu(false); onUnpublish('unpublish'); }} />}
            </div>
          )}
        </div>
        <div ref={menuRef} className="relative">
          <button type="button" onClick={() => setMenu((o) => !o)} className="grid h-9 w-9 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100" aria-label="Aur">
            <Ellipsis className="h-4 w-4" />
          </button>
          {menu && (
            <div className="absolute right-0 top-full z-40 mt-1 w-60 rounded-xl border border-neutral-200 bg-white p-1 shadow-xl">
              <MenuItem icon={Copy} label="Copy banayein" onClick={() => act.mutate('duplicate')} />
              {otherLocales.map((l) => (
                <MenuItem key={l} icon={Languages} label={`${l.toUpperCase()} tarjuma banayein`} onClick={() => act.mutate(`translate:${l}`)} />
              ))}
              {entry.status === 'ARCHIVED' ? (
                <MenuItem icon={ArchiveRestore} label="Archive se wapas" onClick={() => act.mutate('restore-archive')} />
              ) : (
                <MenuItem icon={Archive} label="Archive" onClick={() => { setMenu(false); onUnpublish('archive'); }} />
              )}
              {neverPublished && (entry.status === 'DRAFT' || entry.status === 'ARCHIVED') && (
                <MenuItem icon={Trash2} label="Hamesha ke liye mitayein" danger onClick={() => { setMenu(false); setConfirmDelete(true); }} />
              )}
              <div className="mt-1 border-t border-neutral-100 px-2.5 py-1.5 text-[11px] text-neutral-400">
                v{entry.version} · bana {formatPkt(entry.createdAt, false)}
                {entry.publishedAt && <> · live {formatPkt(entry.publishedAt, false)}</>}
              </div>
            </div>
          )}
        </div>
      </div>
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Entry mitayein?"
        description="Ye kabhi publish nahi hui, is liye poori tarah mit jayegi. Wapas nahi aayegi."
        width="sm"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Btn>
            <Btn variant="danger" loading={act.isPending} onClick={() => act.mutate('delete')}>
              Mitayein
            </Btn>
          </>
        }
      >
        <p className="text-sm text-neutral-700">
          <b>{entry.title}</b> ({ENTRY_TYPE_META[entry.type].label})
        </p>
      </Modal>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof Copy; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm', danger ? 'text-rose-600 hover:bg-rose-50' : 'text-neutral-700 hover:bg-neutral-100')}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}
