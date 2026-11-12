/**
 * Theme editor: a Shopify-style split screen. The left column lists the
 * page's sections (drag to reorder, hide, remove, add) and opens each one's
 * settings and blocks; the right side is the live storefront with the
 * draft theme. Changes save to the draft by themselves; Publish puts the
 * draft live and keeps the old one in history for rollback. Undo/redo work
 * with the buttons and Ctrl+Z / Ctrl+Shift+Z.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import {
  CheckCircle2, Cloud, CloudOff, ExternalLink, GraduationCap, History, Import, Layers, Loader2, MousePointerClick, Palette, Redo2, Rocket, Undo2,
} from 'lucide-react';
import { PageShell, Select, Skeleton, confirmDialog, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { t } from '@core/i18n';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { storesApi, type GlobalKey, type Section, type TemplateKey, type ThemeDoc, type ThemeId, type ThemeState, type ThemeVersionRow } from '../api/stores.api';
import { StoreGate, WebsiteHero, type StoreCtx } from '../components/StoreGate';
import { SectionTree, type Selection } from '../components/theme/SectionTree';
import { SectionPanel } from '../components/theme/SectionPanel';
import { ThemeTokensPanel } from '../components/theme/ThemeTokensPanel';
import { AddSectionModal, PublishModal, VersionsModal } from '../components/theme/EditorDialogs';
import { PreviewPane, type PreviewHandle } from '../components/theme/PreviewPane';
import { SK, storeLink, useStoreFull, useThemeSchema } from '../lib/hooks';
import { TEMPLATE_ORDER, TEMPLATE_PATHS, newSection, templateLabel } from '../lib/sections';
import { useUndo } from '../lib/useUndo';

export default function ThemeEditorPage() {
  return (
    <PageShell>
      <StoreGate title={t('Theme editor')}>{(ctx) => <Editor ctx={ctx} />}</StoreGate>
    </PageShell>
  );
}

type SaveState = 'saved' | 'saving' | 'pending' | 'error' | 'conflict';

function Editor({ ctx }: { ctx: StoreCtx }) {
  const id = ctx.store.id;
  const qc = useQueryClient();
  const guide = usePageGuide();
  const schema = useThemeSchema();
  const full = useStoreFull(id);
  const theme = useQuery({ queryKey: SK.theme(id), queryFn: () => storesApi.theme(id), staleTime: Infinity, refetchOnWindowFocus: false });
  const token = useQuery({ queryKey: ['stores', id, 'preview-token'], queryFn: () => storesApi.previewToken(id), staleTime: 90 * 60_000, refetchInterval: 100 * 60_000 });
  const sample = useQuery({ queryKey: [...SK.products(id), 'sample'], queryFn: () => storesApi.products(id, { visible: 'shown', stock: 'in', limit: 1 }), staleTime: 5 * 60_000 });

  const doc = useUndo<ThemeDoc | null>(null);
  const { reset, undo, redo } = doc;
  const base = useRef<string | undefined>(undefined);
  const saved = useRef<string>('');
  const [save, setSave] = useState<SaveState>('saved');
  const [template, setTemplate] = useState<TemplateKey>('home');
  const [sel, setSel] = useState<Selection | null>(null);
  const [blockId, setBlockId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const preview = useRef<PreviewHandle>(null);

  /** Loads a draft from the server into the editor (first load, publish, rollback, theme switch). */
  const load = useCallback((d: ThemeState['draft']) => {
    base.current = d.updatedAt;
    saved.current = JSON.stringify(d.doc);
    reset(d.doc);
    setSave('saved');
  }, [reset]);

  const loaded = useRef(false);
  useEffect(() => { if (theme.data && !loaded.current) { loaded.current = true; load(theme.data.draft); } }, [theme.data, load]);

  // Autosave the draft shortly after the last change.
  const saveDraft = useMutation({
    mutationFn: (d: ThemeDoc) => storesApi.saveDraft(id, d, base.current),
    onSuccess: (v, d) => {
      base.current = v.updatedAt;
      saved.current = JSON.stringify(d);
      setSave(JSON.stringify(doc.value) === saved.current ? 'saved' : 'pending');
      qc.setQueryData<ThemeState>(SK.theme(id), (old) => (old ? { ...old, draft: { ...v, doc: d } } : old));
      preview.current?.saved();
    },
    onError: (e) => {
      if (isAxiosError(e) && e.response?.status === 409) { setSave('conflict'); return; }
      setSave('error');
      toast.error(apiErrorMessage(e));
    },
  });
  useEffect(() => {
    if (!doc.value) return;
    const json = JSON.stringify(doc.value);
    if (json === saved.current) { if (save === 'pending') setSave('saved'); return; }
    if (save === 'conflict') return;
    setSave('pending');
    const h = setTimeout(() => saveDraft.mutate(doc.value!), 900);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.value]);

  const reloadFromServer = async () => {
    const fresh = await qc.fetchQuery({ queryKey: SK.theme(id), queryFn: () => storesApi.theme(id), staleTime: 0 });
    load(fresh.draft);
    preview.current?.reload();
  };

  const publish = useMutation({
    mutationFn: async (note: string) => {
      if (doc.value && JSON.stringify(doc.value) !== saved.current) await saveDraft.mutateAsync(doc.value);
      return storesApi.publish(id, note || undefined);
    },
    onSuccess: async () => {
      setPublishOpen(false);
      toast.success(t('Design website par lag gaya'));
      await reloadFromServer();
      void qc.invalidateQueries({ queryKey: SK.home(id) });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const [rollbackBusy, setRollbackBusy] = useState<string | null>(null);
  const rollback = async (v: ThemeVersionRow, live: boolean) => {
    setRollbackBusy(`${v.id}:${live ? 1 : 0}`);
    try {
      await storesApi.rollback(id, v.id, live);
      await reloadFromServer();
      setHistoryOpen(false);
      toast.success(live ? t('Purana design wapas live ho gaya') : t('Purana design editor me aa gaya. Dekh kar Publish karein.'));
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setRollbackBusy(null);
    }
  };

  const switchTheme = async (themeId: ThemeId) => {
    const name = schema.data?.themes.find((x) => x.id === themeId)?.name ?? themeId;
    const keep = await confirmDialog({
      title: t('{{name}} design lagayein?', { name }),
      text: t('Aap ke likhe text aur tasveerein jahan mumkin ho rakh li jayengi. Live website tab tak nahi badlegi jab tak Publish na karein.'),
      yes: t('Design badlein'),
    });
    if (!keep) return;
    try {
      if (doc.value && JSON.stringify(doc.value) !== saved.current) await saveDraft.mutateAsync(doc.value);
      const r = await storesApi.switchTheme(id, themeId, 'content');
      load(r.draft);
      qc.setQueryData<ThemeState>(SK.theme(id), (old) => (old ? { ...old, draft: r.draft } : old));
      preview.current?.reload();
      toast.success(t('Naya design editor me aa gaya'));
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  // Keyboard undo/redo outside text boxes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const d = doc.value;
  const sections = useMemo(() => d?.templates[template]?.sections ?? [], [d, template]);
  const fixed = schema.data?.templates[template]?.fixed ?? [];
  const urdu = !!full.data?.settings.languages.enabled.includes('ur');

  const setSections = (next: Section[], tag?: string) => doc.set((cur) => (cur ? { ...cur, templates: { ...cur.templates, [template]: { ...cur.templates[template], sections: next } } } : cur), tag);
  const setGlobal = (k: GlobalKey, sec: Section, tag?: string) => doc.set((cur) => (cur ? { ...cur, global: { ...cur.global, [k]: sec } } : cur), tag);

  const selectedSection: { sec: Section; save: (s: Section, tag?: string) => void } | null = (() => {
    if (!d || !sel) return null;
    if (sel.kind === 'global') return { sec: d.global[sel.key], save: (s, tag) => setGlobal(sel.key, s, tag) };
    if (sel.kind === 'section') {
      const sec = sections.find((x) => x.id === sel.id);
      return sec ? { sec, save: (s, tag) => setSections(sections.map((x) => (x.id === s.id ? s : x)), tag) } : null;
    }
    return null;
  })();
  const selectedId = sel?.kind === 'global' ? `global:${sel.key}` : sel?.kind === 'section' ? sel.id : sel?.kind === 'theme' ? 'theme' : null;

  const onPreviewSelect = useCallback((sectionId: string) => {
    if (!d) return;
    const g = (Object.keys(d.global) as GlobalKey[]).find((k) => d.global[k]?.id === sectionId);
    if (g) { setSel({ kind: 'global', key: g }); setBlockId(null); return; }
    if (sections.some((x) => x.id === sectionId)) { setSel({ kind: 'section', id: sectionId }); setBlockId(null); }
  }, [d, sections]);

  const remove = async (sid: string) => {
    setSections(sections.filter((x) => x.id !== sid));
    if (sel?.kind === 'section' && sel.id === sid) setSel(null);
    toast(t('Hissa hata diya'), { action: { label: t('Wapas'), onClick: () => doc.undo() } });
  };

  const path = (() => {
    const handle = sample.data?.items[0]?.handle;
    if (template === 'product') return handle ? `/products/${handle}` : '/collections/all';
    return TEMPLATE_PATHS[template];
  })();

  const published = theme.data?.published;
  const unpublished = !!d && (!published || JSON.stringify(published.doc) !== JSON.stringify(d));
  const lastPublished = published ? theme.data?.versions.find((v) => v.id === published.id)?.publishedAt ?? published.updatedAt : null;

  const saveChip = save === 'saving' || saveDraft.isPending ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" />{t('Save ho raha hai')}</span>
    : save === 'pending' ? <span className="inline-flex items-center gap-1"><Cloud className="h-3.5 w-3.5" />{t('Tabdeeli...')}</span>
      : save === 'error' ? <span className="inline-flex items-center gap-1"><CloudOff className="h-3.5 w-3.5" />{t('Save nahi hua')}</span>
        : save === 'conflict' ? <span className="inline-flex items-center gap-1"><CloudOff className="h-3.5 w-3.5" />{t('Kisi aur jagah badla gaya')}</span>
          : <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />{t('Draft save hai')}</span>;

  return (
    <>
      <WebsiteHero ctx={ctx} title={t('Theme editor')} chip={saveChip} loading={theme.isLoading || schema.isLoading}
        meta={t('Baayein hisse badlein, daayein website foran dekhein. Publish dabane tak customers ko purana design dikhta hai.')}
        actions={<>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={doc.undo} disabled={!doc.canUndo} title={t('Undo (Ctrl+Z)')} aria-label={t('Undo')} className={`${heroIconButton} disabled:opacity-40`}><Undo2 className="h-4 w-4" /></button>
          <button type="button" onClick={doc.redo} disabled={!doc.canRedo} title={t('Redo (Ctrl+Shift+Z)')} aria-label={t('Redo')} className={`${heroIconButton} disabled:opacity-40`}><Redo2 className="h-4 w-4" /></button>
          <button type="button" onClick={() => setHistoryOpen(true)} className={heroButton}><History className="h-4 w-4" />{t('History')}</button>
          <Link to="/online-store/site/theme/import" className={heroButton}><Import className="h-4 w-4" />{t('Theme laayein')}</Link>
          <a href={storeLink(ctx.store, ctx.list.storefrontUrl)} target="_blank" rel="noreferrer" className={heroButton}><ExternalLink className="h-4 w-4" />{t('Store dekhein')}</a>
          <button type="button" onClick={() => setPublishOpen(true)} disabled={!d || !unpublished} className={`${heroPrimaryButton} disabled:opacity-50`}>
            <Rocket className="h-4 w-4" />{unpublished ? t('Publish') : t('Live hai')}
          </button>
        </>}
        stats={[
          { label: t('Is page ke hisse'), value: String(sections.length) },
          { label: t('Design'), value: schema.data?.themes.find((x) => x.id === d?.themeId)?.name ?? (d?.themeId ?? '—') },
          { label: t('Live version'), value: published ? `v${published.version}` : t('Abhi nahi') },
          { label: t('Aakhri publish'), value: lastPublished ? new Date(lastPublished).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—' },
        ]} />

      {save === 'conflict' && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <p className="min-w-0 flex-1 text-[0.8125rem] text-amber-900">{t('Ye design kisi aur tab ya computer se badla gaya. Taza design laa kar dobara kaam karein.')}</p>
          <button type="button" onClick={() => void reloadFromServer()} className="rounded-lg bg-white px-3 py-1.5 text-[0.8125rem] font-semibold text-amber-900 ring-1 ring-amber-300">{t('Taza design laayein')}</button>
        </div>
      )}

      {!d || !schema.data ? <Skeleton className="h-[640px] rounded-2xl" /> : (
        <div className="grid gap-3 lg:h-[calc(100dvh-15rem)] lg:min-h-[600px] lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <div className="border-b border-slate-100 p-3">
              <Select size="sm" value={template} aria-label={t('Kaun sa page')}
                options={TEMPLATE_ORDER.filter((k) => d.templates[k]).map((k) => ({ value: k, label: templateLabel(k) }))}
                onChange={(e) => { setTemplate(e.target.value as TemplateKey); setSel(null); setBlockId(null); }} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {sel?.kind === 'theme' ? (
                <ThemeTokensPanel tokens={d.tokens} themeId={d.themeId} themes={schema.data.themes} fonts={schema.data.fonts}
                  onChange={(tokens, tag) => doc.set((cur) => (cur ? { ...cur, tokens } : cur), tag)} onSwitch={(x) => void switchTheme(x)} onBack={() => setSel(null)} />
              ) : selectedSection ? (
                <SectionPanel key={selectedSection.sec.id} storeId={id} section={selectedSection.sec} urdu={urdu}
                  def={schema.data.sections.find((x) => x.type === selectedSection.sec.type)}
                  onChange={selectedSection.save} onBack={() => { setSel(null); setBlockId(null); }}
                  openBlockId={blockId} onOpenBlock={setBlockId} />
              ) : (
                <SectionTree schema={schema.data} global={d.global} sections={sections} fixed={fixed} selectedId={selectedId}
                  onSelect={(s) => { setSel(s); setBlockId(null); }}
                  onReorder={(next) => setSections(next)}
                  onToggle={(sid) => setSections(sections.map((x) => (x.id === sid ? { ...x, hidden: !x.hidden } : x)))}
                  onToggleGlobal={(k) => setGlobal(k, { ...d.global[k], hidden: !d.global[k].hidden })}
                  onRemove={(sid) => void remove(sid)}
                  onAdd={() => setAddOpen(true)} />
              )}
            </div>
          </aside>
          <div className="h-[70vh] min-h-0 lg:h-auto">
            <PreviewPane ref={preview} baseUrl={token.data?.url ?? null} path={path}
              selectedSectionId={sel?.kind === 'section' ? sel.id : sel?.kind === 'global' ? d.global[sel.key]?.id ?? null : null}
              onSelectSection={onPreviewSelect}
              error={token.error ? apiErrorMessage(token.error) : null} />
          </div>
        </div>
      )}

      {schema.data && (
        <AddSectionModal open={addOpen} onClose={() => setAddOpen(false)} schema={schema.data} template={template} current={sections}
          onPick={(def) => {
            const sec = newSection(def);
            setSections([...sections, sec]);
            setSel({ kind: 'section', id: sec.id });
          }} />
      )}
      <PublishModal open={publishOpen} onClose={() => setPublishOpen(false)} busy={publish.isPending} onPublish={(note) => publish.mutate(note)} />
      <VersionsModal open={historyOpen} onClose={() => setHistoryOpen(false)} versions={theme.data?.versions ?? []} busyId={rollbackBusy} onRollback={(v, live) => void rollback(v, live)} />

      {guide.isOpen && (
        <PageGuide
          title={t('Theme editor — aasaan tareeqa')}
          description={t('Website ka har hissa yahan se badlein. Customers ko tab dikhega jab Publish karein.')}
          onClose={guide.close}
          flow={[
            { label: t('Page chunein'), hint: t('Home, product, cart...'), icon: Layers, color: '#2563eb' },
            { label: t('Hissa badlein'), hint: t('Text, tasveer, rang'), icon: MousePointerClick, color: '#7c3aed' },
            { label: t('Preview dekhein'), hint: t('Computer aur mobile'), icon: Palette, color: '#0d9488' },
            { label: t('Publish'), hint: t('Customers ko nazar aaye'), icon: Rocket, color: '#16a34a' },
          ]}
          steps={[
            { icon: Layers, color: '#2563eb', title: t('Hisse ki jagah badlein'), text: t('Baayein list me hisse ko pakar kar upar neeche khenchein. Aankh ka nishan chhupata hai.') },
            { icon: MousePointerClick, color: '#7c3aed', title: t('Hissa kholein'), text: t('Naam par click karein, uski settings aur andar ke hisse (slides, sawal) khul jayenge.') },
            { icon: Undo2, color: '#ea580c', title: t('Ghalti? Undo'), text: t('Upar Undo dabayein ya Ctrl+Z. Har tabdeeli draft me khud save hoti hai.') },
            { icon: History, color: '#0d9488', title: t('Purana design'), text: t('History me har publish save hai. Ek click se wapas laayein.') },
          ]}
        />
      )}
    </>
  );
}
