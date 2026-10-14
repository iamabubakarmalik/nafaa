/**
 * Excel / CSV import for every industry, in four steps:
 *   1. File — pick the mode (new products or price update), download the
 *      template made for this business, upload a file or paste cells.
 *   2. Columns — each file column is matched to a field (detected from the
 *      header, changeable); the branch for opening stock is chosen.
 *   3. Check — a dry run on the server: every line is judged (duplicates by
 *      name / SKU / barcode, bad prices, new categories) and nothing is saved.
 *   4. Import — lines go in chunks with a progress bar; it can be paused and
 *      resumed. The result lists every line and the ones to fix download as
 *      Excel with the reason next to each.
 *
 * Keys: G guide.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Boxes, CheckCircle2, ClipboardPaste, Columns3, Download, FileSpreadsheet, GraduationCap, Layers,
  Loader2, Package, PackagePlus, Pause, Play, RefreshCw, ShieldCheck, Store, Tag, Upload, XCircle,
} from 'lucide-react';
import {
  Button, KpiCard, KpiRow, Modal, PageHero, PageShell, Select, Textarea, ViewTabs, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { useBusinessFeatures } from '@core/hooks/useBusinessFeatures';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import {
  importApi, type CreateCheck, type ImportField, type ImportJob, type ImportRow, type PriceCheck, type PriceRowCheck, type RunChunk,
} from '../import/api';
import {
  chunkRows, detectMapping, downloadPriceSheet, downloadProblemRows, downloadTemplate, readFile, readPasted, toImportRows,
  type ImportMode, type Sheet,
} from '../import/columns';
import { ImportHistory } from '../import/ImportHistory';
import { MappingPanel } from '../import/MappingPanel';
import { RowsTable, type StatusMeta, type TableRow } from '../import/RowsTable';

type Step = 'file' | 'map' | 'check' | 'run';

const MAX_ROWS = 10_000;
const CHUNK = { create: 50, prices: 250 } as const;

const CHECK_STATUS: Record<ImportMode, Record<string, StatusMeta>> = {
  create: { new: { label: 'Naya banega', tone: 'green' }, skip: { label: 'Pehle se hai', tone: 'slate' }, error: { label: 'Ghalti', tone: 'red' } },
  prices: { change: { label: 'Badlegi', tone: 'blue' }, same: { label: 'Wesi hi', tone: 'slate' }, error: { label: 'Ghalti', tone: 'red' } },
};
const DONE_STATUS: Record<ImportMode, Record<string, StatusMeta>> = {
  create: { new: { label: 'Ban gaya', tone: 'green' }, skip: { label: 'Chhor diya', tone: 'slate' }, error: { label: 'Nahi bana', tone: 'red' } },
  prices: { change: { label: 'Badal gayi', tone: 'blue' }, same: { label: 'Wesi hi', tone: 'slate' }, error: { label: 'Nahi badli', tone: 'red' } },
};

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'file', label: 'File' }, { id: 'map', label: 'Columns' }, { id: 'check', label: 'Check (dry run)' }, { id: 'run', label: 'Import' },
];

interface RunState {
  chunks: ImportRow[][];
  next: number;
  jobId?: string;
  job?: ImportJob;
  results: TableRow[];
  running: boolean;
  finished: boolean;
  error?: string;
}

const apiMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() || fallback;

export default function ProductBulkImportPage() {
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const canCreate = usePermission(PERMISSIONS.PRODUCTS_CREATE);
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const { cost, costHidden } = useMasked();
  const { features, businessType, defaultUnit, template } = useBusinessFeatures();
  const user = useAuthStore((s) => s.user);
  const activeShop = useShopParam();
  const guide = usePageGuide();
  const fileRef = useRef<HTMLInputElement>(null);
  const pauseRef = useRef(false);

  const [mode, setMode] = useState<ImportMode>(() => ((params.get('mode') === 'prices' && canEdit) || !canCreate ? 'prices' : 'create'));
  const [step, setStep] = useState<Step>('file');
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mapping, setMapping] = useState<Array<ImportField | ''>>([]);
  const [shopId, setShopId] = useState('');
  const [createCheck, setCreateCheck] = useState<CreateCheck | null>(null);
  const [priceCheck, setPriceCheck] = useState<PriceCheck | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);

  // Staff tied to one branch book opening stock only there (the server checks the same).
  const lockedShop = user && user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN' ? user.shopId ?? null : null;
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000 });
  const shops = useMemo(() => (shopsQ.data ?? []).filter((s) => s.isActive), [shopsQ.data]);
  useEffect(() => {
    if (shopId || !shops.length) return;
    const preferred = lockedShop ?? (activeShop && shops.some((s) => s.id === activeShop) ? activeShop : null);
    setShopId(preferred ?? (shops.find((s) => s.isMain) ?? shops[0]).id);
  }, [shops, shopId, lockedShop, activeShop]);

  const running = !!run?.running;
  useEffect(() => {
    if (!running) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [running]);

  const rows = useMemo(() => (sheet ? toImportRows(sheet, mapping) : []), [sheet, mapping]);
  const mapped = new Set(mapping.filter(Boolean));
  const mappingProblem = !sheet ? 'File chunein'
    : mode === 'create'
      ? (!mapped.has('name') ? 'Name ka column chunein — ye zaroori hai' : null)
      : (!mapped.has('sku') && !mapped.has('barcode') && !mapped.has('name') ? 'SKU, Barcode ya Name me se ek column chunein — isi se product milta hai'
        : !mapped.has('price') && !mapped.has('costPrice') ? 'Price ya Cost Price ka column chunein' : null);

  const reset = (nextMode = mode) => {
    setMode(nextMode);
    setStep('file');
    setSheet(null);
    setMapping([]);
    setCreateCheck(null);
    setPriceCheck(null);
    setRun(null);
  };

  const loadSheet = (s: Sheet) => {
    if (!s.headers.length || !s.rows.length) {
      toast.error('File me pehli line column ke naam aur neeche maal ki lines honi chahiye');
      return;
    }
    if (s.rows.length > MAX_ROWS) {
      toast.error(`Ek dafa me ${MAX_ROWS.toLocaleString()} lines tak — file ke do hisse kar ke import karein`);
      return;
    }
    setSheet(s);
    setMapping(detectMapping(s.headers, mode));
    setCreateCheck(null);
    setPriceCheck(null);
    setStep('map');
    toast.success(`${s.rows.length} lines mili — columns check kar lein`);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(xlsx|xls|csv|txt)$/i.test(file.name)) {
      toast.error('Excel (.xlsx) ya CSV file chunein');
      return;
    }
    setReading(true);
    try {
      loadSheet(await readFile(file));
    } catch {
      toast.error('File parhi nahi ja saki — Excel me khol kar .xlsx ya .csv me dobara save karein');
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const getTemplate = async () => {
    setTemplateBusy(true);
    try {
      if (mode === 'create') {
        const ref = await importApi.categories().catch(() => ({ categories: [] }));
        await downloadTemplate({ features, businessType, unit: defaultUnit || 'pcs', categories: ref.categories.map((c) => c.name) });
        toast.success('Template download ho gaya — sample lines mita kar apna maal likhein');
      } else {
        const { rows: list } = await importApi.priceSheet();
        if (!list.length) { toast.error('Abhi koi product nahi'); return; }
        await downloadPriceSheet(list, !costHidden);
        toast.success(`${list.length} lines ki price list download hui — sirf Price / Cost badal kar wapas upload karein`);
      }
    } catch (e) {
      toast.error(apiMessage(e, 'Download nahi hua'));
    } finally {
      setTemplateBusy(false);
    }
  };

  const checkM = useMutation({
    mutationFn: async () => {
      if (mode === 'create') setCreateCheck(await importApi.check(rows, shopId || undefined));
      else setPriceCheck(await importApi.checkPrices(rows));
    },
    onSuccess: () => setStep('check'),
    onError: (e) => toast.error(apiMessage(e, 'Check nahi hua — dobara koshish karein')),
  });

  const totalRows = rows.length;
  const runFrom = async (state: RunState) => {
    pauseRef.current = false;
    let current: RunState = { ...state, running: true, error: undefined };
    setRun(current);
    for (let i = current.next; i < current.chunks.length; i++) {
      if (pauseRef.current) {
        current = { ...current, running: false };
        setRun(current);
        return;
      }
      const body: RunChunk = {
        rows: current.chunks[i], fileName: sheet?.fileName ?? 'import', totalRows, done: i === current.chunks.length - 1,
        jobId: current.jobId, ...(mode === 'create' && shopId && { shopId }),
      };
      try {
        const res = mode === 'create' ? await importApi.run(body) : await importApi.runPrices(body);
        current = {
          ...current, jobId: res.jobId, job: res.job, next: i + 1,
          results: [...current.results, ...res.results.map((r) => toTableRow(r, mode, cost))],
        };
        setRun(current);
      } catch (e) {
        current = { ...current, running: false, error: apiMessage(e, 'Internet ya server ka masla') };
        setRun(current);
        return;
      }
    }
    current = { ...current, running: false, finished: true };
    setRun(current);
    void qc.invalidateQueries({ predicate: (q) => /product|catalog|categor|brand|stock|pos|import/i.test(String(q.queryKey[0])) });
    const j = current.job;
    if (j) toast.success(mode === 'create' ? `${j.successCount} lines import ho gayin` : `${j.successCount} prices badal gayin`);
  };

  const startRun = () => {
    const chunks = chunkRows(rows, mode, CHUNK[mode]);
    setStep('run');
    void runFrom({ chunks, next: 0, results: [], running: true, finished: false });
  };

  const checkRows: TableRow[] = useMemo(() => {
    if (mode === 'create') return createCheck?.rows ?? [];
    return (priceCheck?.rows ?? []).map((r) => toTableRow(r, 'prices', cost));
  }, [mode, createCheck, priceCheck, cost]);

  const problemFile = async (list: TableRow[]) => {
    if (!sheet) return;
    const bad = new Map(list.filter((r) => r.status === 'error').map((r) => [r.row, r.errors.join(' · ')]));
    if (!bad.size) { toast.info('Koi ghalti wali line nahi'); return; }
    await downloadProblemRows(sheet, bad);
  };

  const ready = mode === 'create' ? createCheck?.summary.ready ?? 0 : priceCheck?.summary.change ?? 0;
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const shopName = shops.find((s) => s.id === shopId)?.name;

  return (
    <PageShell>
      {guide.isOpen && <ImportGuide mode={mode} onClose={guide.close} />}
      <Modal open={pasting} onClose={() => setPasting(false)} title="Cells paste karein" description="Excel ya Google Sheets me pehli line (column ke naam) samet cells copy kar ke yahan paste karein."
        footer={<>
          <Button variant="secondary" onClick={() => setPasting(false)}>Wapas</Button>
          <Button disabled={!pasteText.trim()} onClick={() => { setPasting(false); loadSheet(readPasted(pasteText)); setPasteText(''); }}>Aage</Button>
        </>}>
        <Textarea rows={10} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={'Name\tPrice\tStock\nSurf Excel 1kg\t650\t20'}
          hint="Tab se alag cells (Excel copy) ya comma se alag lines dono chalti hain" />
      </Modal>

      <PageHero
        title="Excel se import"
        chip={<>{mode === 'create' ? <PackagePlus /> : <Tag />}{mode === 'create' ? 'Naye products' : 'Price update'}</>}
        meta={`${template?.label ?? ''}${user?.assignedShop?.name ? ` · ${user.assignedShop.name}` : ''}`}
        actions={<>
          <button type="button" onClick={guide.open} title="Tareeqa (G)" className={heroButton}><GraduationCap className="h-4 w-4" /><span className="hidden sm:inline">Tareeqa</span></button>
          <button type="button" onClick={() => void getTemplate()} disabled={templateBusy || running} className={heroButton}>
            {templateBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="hidden sm:inline">{mode === 'create' ? 'Template' : 'Price list'}</span>
          </button>
          <Link to="/products" className={heroButton}><Package className="h-4 w-4" /><span className="hidden sm:inline">Products</span></Link>
        </>}
      />

      {/* Steps */}
      <ol className="flex flex-wrap items-center gap-2 text-[0.8125rem]">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <span className={cn('inline-flex h-8 items-center gap-2 rounded-full px-3 font-semibold ring-1',
              i < stepIndex ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : i === stepIndex ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-500 ring-slate-200')}>
              {i < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : <span className="tabular-nums">{i + 1}</span>}{s.label}
            </span>
            {i < STEPS.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-300" />}
          </li>
        ))}
      </ol>

      {step === 'file' && (
        <>
          {canCreate && canEdit && (
            <ViewTabs<ImportMode>
              tabs={[{ id: 'create', label: 'Naye products', icon: PackagePlus }, { id: 'prices', label: 'Price update', icon: Tag }]}
              value={mode} onChange={(m) => reset(m)}
              hint={mode === 'create' ? 'Naya maal products me daalein, opening stock ke saath' : 'Pehle se bane products ki sirf Price / Cost badlein'} />
          )}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); void onFile(e.dataTransfer.files[0]); }}
            className={cn('rounded-3xl border-2 border-dashed bg-white p-6 text-center shadow-sm transition sm:p-10',
              dragging ? 'border-brand-500 bg-brand-50/50' : 'border-slate-300')}>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              {reading ? <Loader2 className="h-7 w-7 animate-spin" /> : <FileSpreadsheet className="h-7 w-7" />}
            </span>
            <p className="mt-3 text-[1rem] font-semibold text-slate-900">Excel ya CSV file yahan chhorein</p>
            <p className="mt-1 text-[0.8125rem] text-slate-500">
              {mode === 'create'
                ? 'Pehli line me column ke naam hon (Name, Price, Stock…). Apni purani list bhi chalegi — columns agle qadam me mila sakte hain.'
                : 'Upar se "Price list" download karein, Price / Cost badlein aur yahan wapas daalein. SKU ya barcode se product milta hai.'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
              <Button leftIcon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()} loading={reading}>File chunein</Button>
              <Button variant="secondary" leftIcon={<ClipboardPaste className="h-4 w-4" />} onClick={() => setPasting(true)}>Cells paste karein</Button>
              <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={() => void getTemplate()} loading={templateBusy}>
                {mode === 'create' ? `${template?.label ?? 'Apna'} template` : 'Price list download'}
              </Button>
            </div>
            <p className="mt-3 text-[0.75rem] text-slate-400">.xlsx, .xls, .csv · {MAX_ROWS.toLocaleString()} lines tak</p>
          </div>
          <ImportHistory withCost={!costHidden} />
        </>
      )}

      {step === 'map' && sheet && (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
            <FileSpreadsheet className="h-4 w-4 text-brand-600" />
            <span className="font-semibold text-slate-900">{sheet.fileName}</span>
            <span className="text-slate-500">· {sheet.rows.length} lines · {sheet.headers.length} columns</span>
            <button type="button" onClick={() => reset()} className="ml-auto inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
              <RefreshCw className="h-3.5 w-3.5" />Doosri file
            </button>
          </div>
          <MappingPanel sheet={sheet} mode={mode} mapping={mapping} onChange={setMapping} />
          {mode === 'create' && mapped.has('stock') && (
            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
              <div className="max-w-md">
                <Select label="Opening stock kis branch me?" value={shopId} onChange={(e) => setShopId(e.target.value)} disabled={!!lockedShop || shops.length < 2}
                  options={shops.map((s) => ({ value: s.id, label: `${s.name}${s.isMain ? ' (main)' : ''}` }))}
                  hint={lockedShop ? 'Aap sirf apni branch me stock daal sakte hain' : 'Stock isi branch me opening stock ban kar jayega; baqi branches me product 0 stock se shuru hoga'} />
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => reset()}>Wapas</Button>
            <div className="flex flex-wrap items-center gap-3">
              {mappingProblem
                ? <p className="text-[0.8125rem] font-medium text-rose-600">{mappingProblem}</p>
                : <p className="text-[0.8125rem] text-slate-500">Check me kuch save nahi hota — sirf har line parkhi jati hai</p>}
              <Button rightIcon={<ShieldCheck className="h-4 w-4" />} disabled={!!mappingProblem} loading={checkM.isPending} onClick={() => checkM.mutate()}>
                Check karein ({rows.length})
              </Button>
            </div>
          </div>
        </>
      )}

      {step === 'check' && (
        <>
          {mode === 'create' && createCheck && <CreateSummary check={createCheck} costText={cost} />}
          {mode === 'prices' && priceCheck && (
            <KpiRow cols={3}>
              <KpiCard icon={Tag} color="#0284c7" label="Price badlegi" value={priceCheck.summary.change} hint="In lines ki price/cost badlegi" />
              <KpiCard icon={CheckCircle2} color="#64748b" label="Wesi hi" value={priceCheck.summary.same} hint="Nayi price purani jaisi hai" />
              <KpiCard icon={XCircle} color="#e11d48" label="Ghalti" value={priceCheck.summary.error} hint="Ye lines chhor di jayengi" />
            </KpiRow>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
            <Button variant="secondary" leftIcon={<Columns3 className="h-4 w-4" />} onClick={() => setStep('map')}>Columns / branch badlein</Button>
            <div className="flex flex-wrap items-center gap-2">
              {checkRows.some((r) => r.status === 'error') && (
                <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={() => void problemFile(checkRows)}>Ghalti wali lines</Button>
              )}
              <Button rightIcon={<Play className="h-4 w-4" />} disabled={!ready} onClick={startRun}>
                {mode === 'create' ? `Import karein (${ready} lines)` : `${ready} prices badlein`}
              </Button>
            </div>
          </div>
          {checkRows.some((r) => r.status === 'error') && (
            <p className="text-[0.8125rem] text-slate-600">Ghalti wali lines chhor di jayengi. Chahein to "Ghalti wali lines" download kar ke theek karein aur sirf wo file dobara daalein.</p>
          )}
          <RowsTable rows={checkRows} statuses={CHECK_STATUS[mode]} />
        </>
      )}

      {step === 'run' && run && (
        <RunPanel run={run} mode={mode} totalRows={totalRows} shopName={mode === 'create' ? shopName : undefined}
          onPause={() => { pauseRef.current = true; }}
          onResume={() => void runFrom(run)}
          onFixFile={() => void problemFile(run.results)}
          onNew={() => reset()} />
      )}
    </PageShell>
  );
}

/** Check result row for the table; price rows get their change written out. */
function toTableRow(r: TableRow | PriceRowCheck, mode: ImportMode, cost: (n: number) => string): TableRow {
  if (mode === 'create') return r;
  const p = r as PriceRowCheck;
  const parts: string[] = [];
  if (p.target && p.target.label !== p.name) parts.push(p.target.label);
  if (p.price) parts.push(`Price ${formatPKR(p.price.from)} → ${formatPKR(p.price.to)}`);
  if (p.costPrice) parts.push(`Cost ${cost(p.costPrice.from)} → ${cost(p.costPrice.to)}`);
  return { row: p.row, name: p.name, status: p.status, errors: p.errors, warnings: p.warnings, detail: parts.length ? parts.join(' · ') : undefined };
}

function CreateSummary({ check, costText }: { check: CreateCheck; costText: (n: number) => string }) {
  const s = check.summary;
  const items: ReactNode[] = [
    <><b>{s.products}</b> naye products{s.variants ? <> · <b>{s.variants}</b> variants</> : null}{s.packs ? <> · <b>{s.packs}</b> packs</> : null}</>,
    ...(s.newCategories.length ? [<>Nayi categories ({s.newCategories.length}): {s.newCategories.slice(0, 8).join(', ')}{s.newCategories.length > 8 ? '…' : ''}</>] : []),
    ...(s.newBrands.length ? [<>Naye brands ({s.newBrands.length}): {s.newBrands.slice(0, 8).join(', ')}{s.newBrands.length > 8 ? '…' : ''}</>] : []),
    ...(s.openingQty > 0
      ? [<>Opening stock <b>{s.openingQty.toLocaleString()}</b> {check.shop ? <>— <b>{check.shop.name}</b> me</> : null} · Sale value {formatPKR(s.saleValue)}{s.stockCost !== undefined ? <> · Cost {costText(s.stockCost)}</> : null}</>]
      : []),
  ];
  return (
    <>
      <KpiRow cols={4}>
        <KpiCard icon={CheckCircle2} color="#16a34a" label="Naye banenge" value={s.ready} hint={`${s.products} products`} />
        <KpiCard icon={Layers} color="#64748b" label="Pehle se hain" value={s.skip} hint="Ye lines chhor di jayengi" />
        <KpiCard icon={XCircle} color="#e11d48" label="Ghalti" value={s.error} hint="Theek kiye baghair nahi banengi" />
        <KpiCard icon={Boxes} color="#7c3aed" label="Opening stock" value={s.openingQty.toLocaleString()} hint={check.shop?.name ?? 'Stock nahi'} />
      </KpiRow>
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
        <h2 className="mb-2 flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><ShieldCheck className="h-4 w-4 text-brand-600" />Import par ye hoga</h2>
        <ul className="space-y-1 text-[0.8125rem] text-slate-700">
          {items.map((it, i) => <li key={i} className="flex gap-2"><span aria-hidden className="text-slate-400">•</span><span>{it}</span></li>)}
          <li className="flex gap-2"><span aria-hidden className="text-slate-400">•</span><span>Stock har line ka Stock Movement (Opening) ban kar jata hai — baad me stock report me dikhega.</span></li>
        </ul>
      </div>
    </>
  );
}

function RunPanel({ run, mode, totalRows, shopName, onPause, onResume, onFixFile, onNew }: {
  run: RunState; mode: ImportMode; totalRows: number; shopName?: string;
  onPause: () => void; onResume: () => void; onFixFile: () => void; onNew: () => void;
}) {
  const navigate = useNavigate();
  const done = run.results.length;
  const pct = totalRows ? Math.round((done / totalRows) * 100) : 0;
  const ok = run.results.filter((r) => r.status === (mode === 'create' ? 'new' : 'change')).length;
  const skip = run.results.filter((r) => r.status === (mode === 'create' ? 'skip' : 'same')).length;
  const bad = run.results.filter((r) => r.status === 'error').length;

  return (
    <>
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[0.9375rem] font-semibold text-slate-900">
              {run.finished ? 'Import mukammal' : run.running ? 'Import chal raha hai…' : run.error ? 'Import ruk gaya' : 'Import roka hua hai'}
            </p>
            <p className="text-[0.8125rem] text-slate-500">
              {done} / {totalRows} lines · hissa {Math.min(run.next + (run.running ? 1 : 0), run.chunks.length)} / {run.chunks.length}
              {shopName ? ` · stock: ${shopName}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {run.running && <Button variant="secondary" leftIcon={<Pause className="h-4 w-4" />} onClick={onPause}>Rokein</Button>}
            {!run.running && !run.finished && <Button leftIcon={<Play className="h-4 w-4" />} onClick={onResume}>Baqi chalayein</Button>}
            {run.finished && <>
              {bad > 0 && <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={onFixFile}>Ghalti wali lines</Button>}
              <Button variant="secondary" leftIcon={<Store className="h-4 w-4" />} onClick={() => navigate('/products')}>Products dekhein</Button>
              <Button leftIcon={<Upload className="h-4 w-4" />} onClick={onNew}>Naya import</Button>
            </>}
          </div>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={cn('h-full rounded-full transition-all', run.error ? 'bg-rose-500' : run.finished ? 'bg-emerald-500' : 'bg-brand-600')} style={{ width: `${pct}%` }} />
        </div>
        {run.error && (
          <p className="mt-2 text-[0.8125rem] text-rose-700">
            {run.error}. Jo lines ho chuki hain wo save hain — "Baqi chalayein" dabayein, pehle se bani lines dobara nahi banengi.
          </p>
        )}
        {run.running && <p className="mt-2 text-[0.75rem] text-slate-500">Ye page band na karein jab tak import mukammal na ho.</p>}
      </div>
      <KpiRow cols={3}>
        <KpiCard icon={CheckCircle2} color={mode === 'create' ? '#16a34a' : '#0284c7'} label={mode === 'create' ? 'Ban gaye' : 'Price badli'} value={ok} />
        <KpiCard icon={Layers} color="#64748b" label={mode === 'create' ? 'Pehle se the' : 'Wesi hi'} value={skip} />
        <KpiCard icon={XCircle} color="#e11d48" label="Ghalti" value={bad} />
      </KpiRow>
      {done > 0 && <RowsTable rows={run.results} statuses={DONE_STATUS[mode]} />}
    </>
  );
}

function ImportGuide({ mode, onClose }: { mode: ImportMode; onClose: () => void }) {
  return (
    <PageGuide
      title={mode === 'create' ? 'Excel se naye products' : 'Excel se price update'}
      onClose={onClose}
      steps={mode === 'create' ? [
        { icon: Download, color: '#2563eb', title: 'Template lein', text: 'Upar "Template" se apne kaam ke columns wali file lein. Apni purani list bhi chalti hai.' },
        { icon: Columns3, color: '#7c3aed', title: 'Columns milayein', text: 'Har column ke saamne chunein ke wo Name hai, Price hai ya Stock. Zyada tar khud mil jate hain.' },
        { icon: ShieldCheck, color: '#16a34a', title: 'Check (dry run)', text: 'Check me kuch save nahi hota. Har line ki ghalti aur pehle se maujood maal dikhta hai.' },
        { icon: Play, color: '#ea580c', title: 'Import', text: 'Lines hisson me jati hain. Internet jaye to "Baqi chalayein" — bani hui lines dobara nahi banti.' },
      ] : [
        { icon: Download, color: '#2563eb', title: 'Price list lein', text: 'Upar "Price list" se sab products ki file lein — SKU, barcode aur abhi ki price ke saath.' },
        { icon: Tag, color: '#7c3aed', title: 'Price badlein', text: 'Sirf Price ya Cost Price column badlein. Naam, SKU aur barcode ko na chherein.' },
        { icon: ShieldCheck, color: '#16a34a', title: 'Check (dry run)', text: 'Check purani aur nayi price saath dikhata hai. 50% se zyada badlaav par khabardar karta hai.' },
        { icon: Play, color: '#ea580c', title: 'Update', text: 'Sirf price aur cost badalti hai — stock, naam ya kuch aur nahi. Har badlaav import history me rehta hai.' },
      ]}
      tips={mode === 'create' ? [
        'Ek hi naam ki kai lines me Size / Color / Variant ho to ek product ke variants bante hain.',
        'Pack Name + Pack Qty (jaise Carton, 24) se pack bhi saath lag jata hai.',
        'Jo naam ya barcode pehle se hai wo line chhor di jati hai — dobara import se duplicate nahi bante.',
        'Nayi category aur brand khud ban jate hain.',
      ] : [
        'SKU ya barcode na ho to poora naam milaya jata hai — sirf jab us naam ki ek hi cheez ho.',
        'Variant ya pack ki price uski apni line (Variant / Pack Name column) se badalti hai.',
        'Price 0 nahi ho sakti; khali cell ka matlab "na badlein".',
      ]}
      shortcuts={[['G', 'Ye guide']]}
    />
  );
}
