/**
 * "Theme laayein": brings a design into the website from a file.
 *   Shopify tab: the theme file Shopify emails (Online Store → Themes → … →
 *     Download theme file). Colours, fonts, logo, banners, text and the
 *     order of sections come over onto the closest Nafaa design; Shopify's
 *     code does not. The result is a draft with a report of what came and
 *     what did not, then Preview / Live / Discard.
 *   Nafaa tab: download this website's design as a theme file (backup, or
 *     to use on another website) and load such a file back as a draft.
 * The live website never changes until the shop presses "Live karein".
 */

import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import {
  CheckCircle2, Download, Eye, FileArchive, FileJson, GraduationCap, Images, Layers, Loader2, Mail, MoreHorizontal, Palette, Rocket,
  ShieldCheck, Store, Trash2, Type, UploadCloud, XCircle,
} from 'lucide-react';
import { Badge, Button, Card, Input, PageShell, Skeleton, Tabs, confirmDialog, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { t } from '@core/i18n';
import { cn } from '@core/lib/cn';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { themeImportApi, type SkipCode, type ThemeImportReport } from '../api/theme-import.api';
import type { TemplateKey } from '../api/stores.api';
import { StoreGate, WebsiteHero, type StoreCtx } from '../components/StoreGate';
import { SK, useThemeSchema } from '../lib/hooks';
import { templateLabel } from '../lib/sections';

export default function ThemeImportPage() {
  return (
    <PageShell>
      <StoreGate title={t('Theme laayein')}>{(ctx) => <Importer ctx={ctx} />}</StoreGate>
    </PageShell>
  );
}

type Tab = 'shopify' | 'nafaa';
const stateKey = (id: string) => ['stores', id, 'theme-import'] as const;

function reasonText(code: SkipCode): string {
  switch (code) {
    case 'unknown_section': return t('Nafaa me is tarah ka hissa nahi hai');
    case 'app_section': return t('Ye Shopify app ka hissa hai, app Nafaa par nahi chalti');
    case 'custom_code': return t('Is me apna code likha tha, wo Nafaa par nahi chalta');
    case 'image_missing': return t('Tasveer nahi mili. Wahan khaali jagah hai, khud laga dein.');
    case 'collection_missing': return t('Ye collection Nafaa par nahi mili. Abhi wahan sab products dikhenge.');
    case 'product_ref': return t('Chuna hua product khud dobara chun lein');
    case 'cart_type': return t('Nafaa me cart side par bhi khulta hai aur alag page par bhi');
    case 'menu_links': return t('Menu ke links theme file me nahi hote. "Shopify se aayein" se menu laayein.');
    case 'file_broken': return t('Ye file parhi nahi ja saki');
    case 'too_many': return t('Had se zyada the, baqi chhor diye');
    case 'block_unknown': return t('Is hisse ka ye andar wala hissa Nafaa me nahi hai');
    case 'template_other': return t('Ye page Nafaa me apne design se banta hai');
    case 'video_host': return t('Sirf YouTube ya Vimeo ki video chalti hai');
    default: return '';
  }
}

/** "Home: image-banner" → "Home: Image banner". */
const nice = (s: string) => s.replace(/[-_]+/g, ' ').replace(/(^|:\s*)([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase());

function Importer({ ctx }: { ctx: StoreCtx }) {
  const id = ctx.store.id;
  const qc = useQueryClient();
  const guide = usePageGuide();
  const schema = useThemeSchema();
  const q = useQuery({ queryKey: stateKey(id), queryFn: () => themeImportApi.state(id) });
  const [tab, setTab] = useState<Tab>('shopify');
  const [fresh, setFresh] = useState<ThemeImportReport | null>(null);
  const report = fresh ?? q.data?.last ?? null;
  const shown = report && report.state !== 'discarded' ? report : null;

  const afterChange = (r: ThemeImportReport) => {
    setFresh(r);
    qc.setQueryData(stateKey(id), (old: typeof q.data) => (old ? { ...old, last: r } : old));
    // The theme editor keeps the draft in memory; make it load the new one.
    qc.removeQueries({ queryKey: SK.theme(id) });
  };

  const sectionCount = shown?.imported.sections.length ?? 0;
  return (
    <>
      <WebsiteHero ctx={ctx} back="/online-store/site/theme" backLabel={t('Theme editor')} title={t('Theme laayein')} loading={q.isLoading}
        meta={t('Design, rang, fonts, logo, banners, text aur sections ki tarteeb aa jayegi — hu-ba-hu code nahi.')}
        actions={<button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>}
        stats={[
          { label: t('Aakhri theme'), value: shown ? shown.themeName : '—' },
          { label: t('Hisse aaye'), value: shown ? String(sectionCount) : '—' },
          { label: t('Tasveerein'), value: shown ? String(shown.imported.images) : '—' },
          { label: t('Nahi aa sake'), value: shown ? String(shown.skipped.length) : '—' },
        ]} />

      <Tabs<Tab> value={tab} onChange={setTab} label={t('Kahan se')}
        items={[{ value: 'shopify', label: t('Shopify theme') }, { value: 'nafaa', label: t('Nafaa theme file') }]} />

      {q.isLoading ? <Skeleton className="h-80 rounded-2xl" /> : tab === 'shopify' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <HowTo />
          <div className="space-y-4">
            <DropCard
              title={t('Shopify ki theme file yahan daalein')}
              hint={t('.zip file, zyada se zyada {{n}} MB', { n: q.data?.limits.shopifyZipMb ?? 50 })}
              accept=".zip,application/zip,application/x-zip-compressed"
              icon={FileArchive}
              extra={(value, set) => !q.data?.shopify.connected && (
                <Input label={t('Shopify website ka address (agar ho)')} placeholder="www.apnidukaan.pk" value={value} onChange={(e) => set(e.target.value)}
                  hint={t('Banners aur logo ki tasveerein wahan se uthayenge')} />
              )}
              upload={(file, extra, onProgress) => themeImportApi.shopify(id, file, extra, onProgress)}
              onDone={(r) => { afterChange(r.report); toast.success(t('Theme aa gayi! Pehle preview dekh lein.')); }}
              maxMb={q.data?.limits.shopifyZipMb ?? 50} />
            {q.data?.shopify.connected && (
              <p className="flex items-start gap-2 rounded-xl bg-success-50 p-3 text-[0.8125rem] text-success-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{t('Shopify jura hai ({{shop}}). Tasveerein wahan se khud aa jayengi.', { shop: q.data.shopify.shop ?? '' })}
              </p>
            )}
          </div>
        </div>
      ) : (
        <NafaaFileTab storeId={id} slug={ctx.store.slug} maxMb={q.data?.limits.nafaaFileMb ?? 2} onImported={(r) => { afterChange(r); toast.success(t('Theme file aa gayi! Pehle preview dekh lein.')); }} />
      )}

      {shown && <ReportCard storeId={id} report={shown} presetName={schema.data?.themes.find((x) => x.id === shown.basePreset)?.name ?? shown.basePreset}
        sectionLabel={(type) => { const l = schema.data?.sections.find((s) => s.type === type)?.label; return l ? t(l) : nice(type); }}
        onChange={afterChange} />}

      {guide.isOpen && (
        <PageGuide title={t('Theme laana — aasaan tareeqa')} onClose={guide.close}
          description={t('Shopify ka design ek file me aata hai. Nafaa us se apna design bana deta hai, aap dekh kar Live karte hain.')}
          flow={[
            { label: t('Shopify se file'), hint: t('Download theme file'), icon: Mail, color: '#2563eb' },
            { label: t('Yahan daalein'), hint: t('.zip file'), icon: UploadCloud, color: '#7c3aed' },
            { label: t('Preview dekhein'), hint: t('Draft me'), icon: Eye, color: '#0d9488' },
            { label: t('Live karein'), hint: t('Jab pasand aaye'), icon: Rocket, color: '#16a34a' },
          ]}
          steps={[
            { icon: Palette, color: '#7c3aed', title: t('Kya aata hai'), text: t('Rang, fonts, logo, banners ki tasveerein, text aur hisson ki tarteeb.') },
            { icon: XCircle, color: '#e11d48', title: t('Kya nahi aata'), text: t('Shopify ka code, apps aur apna likha code. Report me har cheez wajah ke saath likhi hoti hai.') },
            { icon: ShieldCheck, color: '#16a34a', title: t('Live website mehfooz'), text: t('Theme pehle draft banti hai. "Chhor dein" dabane se pehle wala draft wapas aa jata hai.') },
            { icon: FileJson, color: '#ea580c', title: t('Nafaa theme file'), text: t('Apna design file me save karein aur doosri website par laga dein.') },
          ]} />
      )}
    </>
  );
}

// ─── how to get the file from Shopify ───

function HowTo() {
  const steps: Array<{ icon: typeof Store; title: string; text: ReactNode; picture: ReactNode }> = [
    {
      icon: Store, title: t('Shopify admin kholein'),
      text: <>{t('Baayein menu me jayein:')} <Path>Online Store → Themes</Path></>,
      picture: (
        <MiniWindow>
          <div className="flex gap-2">
            <div className="w-16 space-y-1">
              {['Home', 'Orders', 'Products', 'Online Store'].map((x) => <div key={x} className={cn('rounded px-1 py-0.5 text-[0.5625rem]', x === 'Online Store' ? 'bg-emerald-100 font-semibold text-emerald-800' : 'text-slate-500')}>{x}</div>)}
              <div className="ms-2 rounded bg-emerald-600 px-1 py-0.5 text-[0.5625rem] font-semibold text-white">Themes</div>
            </div>
            <div className="flex-1 rounded bg-slate-100" />
          </div>
        </MiniWindow>
      ),
    },
    {
      icon: MoreHorizontal, title: t('Theme ke saath teen nuqte'),
      text: <>{t('Current theme ke saath')} <Path>…</Path> {t('dabayein, phir')} <Path>Download theme file</Path></>,
      picture: (
        <MiniWindow>
          <div className="flex items-start gap-2">
            <div className="h-10 flex-1 rounded bg-slate-100" />
            <div className="space-y-1">
              <div className="flex justify-end"><span className="rounded border border-slate-300 px-1.5 text-[0.625rem] leading-4">…</span></div>
              <div className="rounded border border-slate-200 bg-white p-1 shadow-sm">
                <div className="px-1 text-[0.5625rem] text-slate-500">Rename</div>
                <div className="rounded bg-emerald-100 px-1 text-[0.5625rem] font-semibold text-emerald-800">Download theme file</div>
              </div>
            </div>
          </div>
        </MiniWindow>
      ),
    },
    {
      icon: Mail, title: t('Email se file lein'),
      text: t('Shopify kuch minute me email bhejta hai. Us me link se .zip file download karein aur yahan daal dein.'),
      picture: (
        <MiniWindow>
          <div className="flex items-center gap-2 rounded bg-slate-50 p-1.5">
            <Mail className="h-4 w-4 text-slate-500" />
            <div className="flex-1"><div className="text-[0.5625rem] font-semibold text-slate-700">Shopify</div><div className="text-[0.5625rem] text-slate-500">Your theme export is ready</div></div>
            <span className="inline-flex items-center gap-0.5 rounded bg-slate-900 px-1 text-[0.5625rem] text-white"><FileArchive className="h-2.5 w-2.5" />.zip</span>
          </div>
        </MiniWindow>
      ),
    },
  ];
  return (
    <Card title={t('Shopify se theme file kaise lein')} description={t('3 aasaan kaam. Shopify me kuch nahi badalta.')}>
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={s.title} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
            <div className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[0.8125rem] font-bold text-brand-700 ring-1 ring-brand-100">{i + 1}</span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[0.875rem] font-semibold text-slate-900"><s.icon className="h-4 w-4 text-slate-400" />{s.title}</p>
                <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-slate-600">{s.text}</p>
              </div>
            </div>
            {s.picture}
          </li>
        ))}
      </ol>
    </Card>
  );
}

const Path = ({ children }: { children: ReactNode }) => (
  <span dir="ltr" className="whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.75rem] text-slate-800 ring-1 ring-slate-200">{children}</span>
);

const MiniWindow = ({ children }: { children: ReactNode }) => (
  <div dir="ltr" aria-hidden className="rounded-lg bg-white p-2 shadow-sm ring-1 ring-slate-200">
    <div className="mb-1.5 flex gap-1">{['bg-rose-300', 'bg-amber-300', 'bg-emerald-300'].map((c) => <span key={c} className={cn('h-1.5 w-1.5 rounded-full', c)} />)}</div>
    {children}
  </div>
);

// ─── drop zone with upload progress ───

function DropCard<R>({ title, hint, accept, icon: Icon, extra, upload, onDone, maxMb }: {
  title: string; hint: string; accept: string; icon: typeof FileArchive; maxMb: number;
  extra?: (value: string, set: (v: string) => void) => ReactNode;
  upload: (file: File, extra: string, onProgress: (pct: number) => void) => Promise<R>;
  onDone: (r: R) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  const [pct, setPct] = useState(0);
  const [extraValue, setExtraValue] = useState('');
  const run = useMutation({
    mutationFn: (f: File) => upload(f, extraValue.trim(), setPct),
    onSuccess: (r) => { setFile(null); setPct(0); onDone(r); },
    onError: (e) => {
      setPct(0);
      toast.error(isAxiosError(e) && e.response?.status === 413 ? t('File bohat bari hai (zyada se zyada {{n}} MB)', { n: maxMb }) : apiErrorMessage(e));
    },
  });
  const pick = (f: File | undefined | null) => {
    if (!f) return;
    if (f.size > maxMb * 1024 * 1024) { toast.error(t('File bohat bari hai (zyada se zyada {{n}} MB)', { n: maxMb })); return; }
    setFile(f);
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); };
  const busy = run.isPending;
  const reading = busy && pct >= 100;
  return (
    <Card title={title}>
      <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
        className={cn('flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition',
          over ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50/60')}>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><Icon className="h-6 w-6 text-brand-600" /></span>
        {file ? (
          <p className="text-[0.875rem] font-semibold text-slate-900">{file.name} <span className="font-normal text-slate-500">· {(file.size / 1048576).toFixed(1)} MB</span></p>
        ) : (
          <p className="text-[0.875rem] font-semibold text-slate-800">{t('File yahan chhorein ya chunein')}</p>
        )}
        <p className="text-[0.75rem] text-slate-500">{hint}</p>
        <input ref={input} type="file" accept={accept} className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => input.current?.click()} leftIcon={<UploadCloud className="h-4 w-4" />}>{t('File chunein')}</Button>
      </div>
      {extra && <div className="mt-4">{extra(extraValue, setExtraValue)}</div>}
      {busy && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[0.75rem] text-slate-600">
            <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />{reading ? t('Theme parh rahe hain aur tasveerein utha rahe hain...') : t('File ja rahi hai...')}</span>
            {!reading && <span>{pct}%</span>}
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={cn('h-full rounded-full bg-brand-600 transition-all', reading && 'animate-pulse')} style={{ width: `${reading ? 100 : Math.max(4, pct)}%` }} />
          </div>
        </div>
      )}
      <Button className="mt-4 w-full" size="lg" disabled={!file || busy} loading={busy} onClick={() => file && run.mutate(file)} leftIcon={<Layers className="h-4 w-4" />}>
        {t('Theme laayein')}
      </Button>
      <p className="mt-3 flex items-start gap-2 text-[0.75rem] text-slate-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600" />{t('Live website nahi badalti. Pehle draft banta hai, aap dekh kar Live karte hain.')}</p>
    </Card>
  );
}

// ─── Nafaa theme file ───

function NafaaFileTab({ storeId, slug, maxMb, onImported }: { storeId: string; slug: string; maxMb: number; onImported: (r: ThemeImportReport) => void }) {
  const [busy, setBusy] = useState<'live' | 'draft' | null>(null);
  const download = async (which: 'live' | 'draft') => {
    setBusy(which);
    try {
      const r = await themeImportApi.exportFile(storeId, which);
      const blob = new Blob([JSON.stringify(r.file, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = r.fileName || `${slug}.nafaa-theme.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast.success(t('Theme file download ho gayi'));
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title={t('Apna design file me save karein')} description={t('Backup ke liye, ya doosri Nafaa website par yahi design lagane ke liye. Products aur orders is file me nahi hote.')}>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" disabled={!!busy} onClick={() => void download('live')}
            className="flex items-start gap-3 rounded-2xl p-4 text-start ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-50 text-success-700">{busy === 'live' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}</span>
            <span><span className="block text-[0.875rem] font-semibold text-slate-900">{t('Live design')}</span><span className="block text-[0.75rem] text-slate-500">{t('Jo customers abhi dekh rahe hain')}</span></span>
          </button>
          <button type="button" disabled={!!busy} onClick={() => void download('draft')}
            className="flex items-start gap-3 rounded-2xl p-4 text-start ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{busy === 'draft' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}</span>
            <span><span className="block text-[0.875rem] font-semibold text-slate-900">{t('Draft design')}</span><span className="block text-[0.75rem] text-slate-500">{t('Theme editor me jo abhi ban raha hai')}</span></span>
          </button>
        </div>
      </Card>
      <DropCard title={t('Nafaa theme file daalein')} hint={t('.nafaa-theme.json file, zyada se zyada {{n}} MB', { n: maxMb })} accept=".json,application/json" icon={FileJson} maxMb={maxMb}
        upload={(file, _extra, onProgress) => themeImportApi.nafaa(storeId, file, onProgress)}
        onDone={(r) => onImported(r.report)} />
    </div>
  );
}

// ─── report ───

function ReportCard({ storeId, report, presetName, sectionLabel, onChange }: {
  storeId: string; report: ThemeImportReport; presetName: string; sectionLabel: (type: string) => string; onChange: (r: ThemeImportReport) => void;
}) {
  const qc = useQueryClient();
  const publish = useMutation({
    mutationFn: () => themeImportApi.publish(storeId),
    onSuccess: (r) => {
      onChange(r.report);
      void qc.invalidateQueries({ queryKey: ['stores'] });
      toast.success(t('Naya design website par lag gaya'));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const discard = useMutation({
    mutationFn: () => themeImportApi.discard(storeId),
    onSuccess: (r) => { onChange(r.report); toast.success(t('Laayi hui theme chhor di. Pehle wala draft wapas aa gaya.')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const byTemplate = new Map<string, string[]>();
  for (const s of report.imported.sections) byTemplate.set(s.template, [...(byTemplate.get(s.template) ?? []), s.to]);
  const skippedByCode = new Map<SkipCode, string[]>();
  for (const s of report.skipped) skippedByCode.set(s.code, [...(skippedByCode.get(s.code) ?? []), s.what]);
  const pendingAny = report.pending.logo || report.pending.favicon || report.pending.social.length > 0;
  const isDraft = report.state === 'draft';
  const templateName = (k: string) => (k === 'global' ? t('Har page par (upar/neeche)') : templateLabel(k as TemplateKey));

  return (
    <Card
      title={<span className="flex flex-wrap items-center gap-2">{report.themeName}{report.themeVersion && <span className="text-[0.8125rem] font-normal text-slate-500">{report.themeVersion}</span>}
        <Badge size="xs" variant={isDraft ? 'warning' : 'success'}>{isDraft ? t('Draft — abhi live nahi') : t('Live hai')}</Badge></span>}
      description={t('{{date}} ko aayi · Nafaa design: {{preset}}', { date: new Date(report.importedAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }), preset: presetName })}
      actions={isDraft ? (
        <div className="flex flex-wrap gap-2">
          <Link to="/online-store/site/theme" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[0.8125rem] font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"><Eye className="h-4 w-4" />{t('Preview dekhein')}</Link>
          <Button size="sm" variant="ghost" loading={discard.isPending} leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={async () => { if (await confirmDialog({ title: t('Laayi hui theme chhor dein?'), text: t('Pehle wala draft wapas aa jayega. Live website par koi asar nahi.'), yes: t('Chhor dein'), danger: true })) discard.mutate(); }}>
            {t('Chhor dein')}
          </Button>
          <Button size="sm" loading={publish.isPending} leftIcon={<Rocket className="h-4 w-4" />}
            onClick={async () => { if (await confirmDialog({ title: t('Ye design live karein?'), text: pendingAny ? t('Customers ko naya design dikhega. Logo aur social links bhi file wale lag jayenge.') : t('Customers ko naya design dikhega. Purana design History me rahega.'), yes: t('Live karein') })) publish.mutate(); }}>
            {t('Live karein')}
          </Button>
        </div>
      ) : !report.settingsApplied && pendingAny ? (
        <Button size="sm" variant="secondary" loading={publish.isPending} onClick={() => publish.mutate()}>{t('Logo aur links bhi lagayein')}</Button>
      ) : null}>
      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-[0.875rem] font-semibold text-success-700"><CheckCircle2 className="h-4 w-4" />{t('Ye aa gaya')}</h3>
          <ul className="space-y-2.5 text-[0.8125rem] text-slate-700">
            <li className="flex gap-2"><Layers className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{t('{{n}} hisse', { n: report.imported.sections.length })}</p>
                {[...byTemplate].map(([k, types]) => (
                  <p key={k} className="text-slate-600"><span className="font-medium">{templateName(k)}:</span> {types.map(sectionLabel).join(' · ')}</p>
                ))}
              </div>
            </li>
            {report.imported.colours.length > 0 && (
              <li className="flex items-center gap-2"><Palette className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="font-semibold text-slate-900">{t('Rang')}</span>
                <span className="flex flex-wrap gap-1">{report.imported.colours.map((c) => <span key={c.token} title={c.token} className="h-5 w-5 rounded-md ring-1 ring-black/10" style={{ backgroundColor: c.value }} />)}</span>
              </li>
            )}
            {report.imported.fonts.length > 0 && (
              <li className="flex gap-2"><Type className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="font-semibold text-slate-900">{t('Fonts')}</p>
                  {report.imported.fonts.map((f) => (
                    <p key={f.role} className="text-slate-600">{f.role === 'heading' ? t('Heading') : t('Text')}: {f.exact ? f.to : t('{{from}} ki jagah {{to}} (milta julta)', { from: f.from, to: f.to })}</p>
                  ))}
                </div>
              </li>
            )}
            <li className="flex gap-2"><Images className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <p><span className="font-semibold text-slate-900">{t('{{n}} tasveerein', { n: report.imported.images })}</span> {report.imported.images > 0 && <span className="text-slate-500">{t('Nafaa me save, Shopify band ho to bhi rahengi')}</span>}</p>
            </li>
            {pendingAny && (
              <li className="flex gap-2"><Store className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <p>
                  <span className="font-semibold text-slate-900">{[report.pending.logo && t('Logo'), report.pending.favicon && t('Chhota icon'), report.pending.social.length > 0 && t('Social links')].filter(Boolean).join(', ')}</span>{' '}
                  <span className="text-slate-500">{report.settingsApplied ? t('Lag gaye') : t('"Live karein" par lagenge')}</span>
                </p>
              </li>
            )}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-[0.875rem] font-semibold text-rose-700"><XCircle className="h-4 w-4" />{t('Ye nahi aa saka aur kyun')}</h3>
          {!report.skipped.length ? (
            <p className="text-[0.8125rem] text-slate-500">{t('Sab kuch aa gaya.')}</p>
          ) : (
            <ul className="space-y-2.5">
              {[...skippedByCode].map(([code, whats]) => (
                <li key={code} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                  <p className="text-[0.8125rem] font-semibold text-slate-900">{reasonText(code) || report.skipped.find((s) => s.code === code)?.why}</p>
                  <p dir="ltr" className="mt-0.5 text-start text-[0.75rem] text-slate-500">{whats.slice(0, 8).map((w) => (code === 'image_missing' || code === 'collection_missing' ? w : nice(w))).join(' · ')}{whats.length > 8 ? ` +${whats.length - 8}` : ''}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Card>
  );
}
