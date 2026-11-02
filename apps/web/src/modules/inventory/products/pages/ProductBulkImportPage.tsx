/**
 * Excel / CSV import for every industry, in four steps:
 *   1. File — pick the mode (products or price update), download the template
 *      or a sample file made for this business, upload a file or paste cells.
 *   2. Columns — each file column is matched to a field (detected from
 *      English, Roman Urdu and Urdu headers, changeable). For products: the
 *      branch for the stock and what to do with products already in the shop.
 *   3. Sheet — every line in an editable grid. The server checks the lines as
 *      they change (nothing is saved): errors show in their cells, counts stay
 *      on top. Cells, rows, find / replace and paste from Excel all work here.
 *   4. Import — lines go in chunks with a progress bar; it can be paused and
 *      resumed. The result shows created, updated, stock added, skipped and
 *      failed; failed lines open again in the grid or download as Excel.
 *
 * "Bulk banayein" (/products/bulk-create) opens step 3 on an empty sheet:
 * products are typed row by row, a new row appears below the last one, and
 * "Sab save karein" runs the same import. `?fix=<job>` opens the failed rows
 * kept with an earlier import, to fix and import again.
 *
 * Keys: G guide (grid keys are listed in SheetGrid).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Boxes, CheckCircle2, ClipboardPaste, Columns3, Download, FileSpreadsheet, GraduationCap,
  Loader2, Package, PackagePlus, Pause, PencilLine, Play, RefreshCw, ShieldCheck, Smartphone, Table2, Tag, Upload, XCircle,
} from 'lucide-react';
import {
  Alert, Button, KpiCard, KpiRow, Modal, PageHero, PageShell, Select, Textarea, ViewTabs, confirmDialog, heroButton,
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
  importApi, type CreateCheck, type ExistingOptions, type ImportField, type ImportJob, type ImportRow, type PriceCheck,
  type PriceRowCheck, type RowCheck, type RunChunk,
} from '../import/api';
import {
  CREATE_FIELDS, FIELDS, PRICE_FIELDS, chunkRows, detectMapping, downloadPriceSheet, downloadProblemRows, downloadSample, downloadTemplate,
  readFile, readPasted, sheetToGridRows, templateFields, toImportRows, type ImportMode, type Sheet,
} from '../import/columns';
import { ImportHistory } from '../import/ImportHistory';
import { ImportOptions } from '../import/ImportOptions';
import { MappingPanel } from '../import/MappingPanel';
import { SheetGrid, type GridColumn, type RowMark, type SheetGridHandle } from '../import/grid/SheetGrid';
import { SheetTools } from '../import/grid/SheetTools';
import { useSheetRows, type GridRow } from '../import/grid/useSheetRows';
import { t as tr, Trans } from '@core/i18n';

type Step = 'file' | 'map' | 'edit' | 'run';
type View = 'all' | 'error' | 'new' | 'update' | 'skip' | 'warn';

const MAX_ROWS = 10_000;
const CHUNK = { create: 50, prices: 250 } as const;

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'file', label: tr('File') }, { id: 'map', label: tr('Columns') }, { id: 'edit', label: tr('Sheet (check)') }, { id: 'run', label: tr('Import') },
];

const WIDTH: Partial<Record<ImportField, number>> = {
  name: 240, description: 200, imei: 230, category: 140, brand: 130, sku: 130, barcode: 140, packBarcode: 140, variant: 130,
  expiryDate: 112, batchNumber: 110, unit: 80, size: 80, color: 90,
};
const NUMERIC = new Set<ImportField>(['price', 'costPrice', 'wholesalePrice', 'creditPrice', 'taxRate', 'stock', 'lowStockAlert', 'packQty', 'packPrice']);
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free size', '28', '30', '32', '34', '36', '38', '40', '41', '42', '43', '44', 'Unstitched'];
const COLORS = ['Black', 'White', 'Red', 'Blue', 'Navy', 'Green', 'Grey', 'Brown', 'Beige', 'Pink', 'Maroon', 'Yellow', 'Purple', 'Orange', 'Golden', 'Silver'];
/** Id of the empty row drawn under the last one; typing in it adds a real row. */
const GHOST = 0;
const UNITS = ['pcs', 'kg', 'gram', 'liter', 'ml', 'dozen', 'meter', 'packet', 'box', 'carton', 'bottle', 'strip', 'pair', 'bag'];

interface RunState {
  chunks: ImportRow[][];
  next: number;
  jobId?: string;
  job?: ImportJob;
  results: Array<RowCheck<string> & { stockQty?: number }>;
  running: boolean;
  finished: boolean;
  error?: string;
}

const apiMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() || fallback;

const qty = (n: number) => (Math.round(n * 100) / 100).toLocaleString();

export default function ProductBulkImportPage({ start }: { start?: 'blank' } = {}) {
  const blank = start === 'blank';
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const canCreate = usePermission(PERMISSIONS.PRODUCTS_CREATE);
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const canStock = usePermission(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE);
  const { cost, costHidden } = useMasked();
  const { features, businessType, defaultUnit, template, quickUnits } = useBusinessFeatures();
  const user = useAuthStore((s) => s.user);
  const activeShop = useShopParam();
  const guide = usePageGuide();
  const fileRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<SheetGridHandle>(null);
  const pauseRef = useRef(false);

  const [mode, setMode] = useState<ImportMode>(() => (!blank && ((params.get('mode') === 'prices' && canEdit) || !canCreate) ? 'prices' : 'create'));
  const [step, setStep] = useState<Step>('file');
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mapping, setMapping] = useState<Array<ImportField | ''>>([]);
  const [extraFields, setExtraFields] = useState<ImportField[]>([]);
  const [shopId, setShopId] = useState('');
  const [existing, setExisting] = useState<ExistingOptions>({ stock: 'set', prices: false });
  const grid = useSheetRows();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [view, setView] = useState<View>('all');
  const [check, setCheck] = useState<{ create?: CreateCheck; prices?: PriceCheck; rows?: GridRow[] } | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Staff tied to one branch book stock only there (the server checks the same).
  const lockedShop = user && user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN' ? user.shopId ?? null : null;
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000 });
  const shops = useMemo(() => (shopsQ.data ?? []).filter((s) => s.isActive), [shopsQ.data]);
  useEffect(() => {
    if (shopId || !shops.length) return;
    const preferred = lockedShop ?? (activeShop && shops.some((s) => s.id === activeShop) ? activeShop : null);
    setShopId(preferred ?? (shops.find((s) => s.isMain) ?? shops[0]).id);
  }, [shops, shopId, lockedShop, activeShop]);
  const refQ = useQuery({ queryKey: ['bulk-import-ref'], queryFn: importApi.categories, staleTime: 5 * 60_000, enabled: step !== 'file' });

  const running = !!run?.running;
  useEffect(() => {
    if (!running) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [running]);

  const mapped = useMemo(() => new Set(mapping.filter(Boolean) as ImportField[]), [mapping]);
  const mappingProblem = !sheet ? tr('File chunein')
    : mode === 'create'
      ? (!mapped.has('name') ? tr('Name ka column chunein — ye zaroori hai') : null)
      : (!mapped.has('sku') && !mapped.has('barcode') && !mapped.has('name') ? tr('SKU, Barcode ya Name me se ek column chunein — isi se product milta hai')
        : !mapped.has('price') && !mapped.has('costPrice') ? tr('Price ya Cost Price ka column chunein') : null);

  /** Grid columns: what the file has, plus the industry's template columns and any added by hand. */
  const fields = useMemo<ImportField[]>(() => {
    if (mode === 'prices') {
      const want = new Set<ImportField>([...mapped, ...extraFields, 'name', 'sku', 'barcode', 'price', ...(costHidden ? [] : ['costPrice' as const])]);
      return PRICE_FIELDS.filter((f) => want.has(f));
    }
    const want = new Set<ImportField>([...mapped, ...extraFields, ...templateFields(features), 'name', 'price', 'stock']);
    if (costHidden && !mapped.has('costPrice')) want.delete('costPrice');
    return CREATE_FIELDS.filter((f) => want.has(f));
  }, [mode, mapped, extraFields, features, costHidden]);

  const rowById = useMemo(() => new Map(grid.rows.map((r) => [r.id, r])), [grid.rows]);
  const categories = useMemo(() => (refQ.data?.categories ?? []).map((c) => c.name), [refQ.data]);
  const brands = useMemo(() => (refQ.data?.brands ?? []).map((b) => b.name), [refQ.data]);
  const columns = useMemo<GridColumn[]>(() => fields.map((f) => ({
    key: f,
    label: FIELDS[f].label,
    hint: FIELDS[f].hint,
    width: WIDTH[f] ?? 100,
    numeric: NUMERIC.has(f),
    options: f === 'category' ? categories : f === 'brand' ? brands : f === 'unit' ? [...new Set([...(quickUnits ?? []), ...UNITS])]
      : f === 'packName' ? ['Carton', 'Box', 'Dozen', 'Pack', 'Strip', 'Bag'] : f === 'size' ? SIZES : f === 'color' ? COLORS : undefined,
    placeholder: f === 'name' ? tr('naam likhein') : undefined,
    // A phone's stock is its IMEI count.
    lock: f === 'stock' && fields.includes('imei') ? (id: number) => (rowById.get(id)?.cells.imei?.trim() ? tr('Is phone ka stock IMEI ginti se banega') : null) : undefined,
  })), [fields, categories, brands, quickUnits, rowById]);

  // ─── Live check: the server judges the lines (nothing is saved) ───
  const checkSeq = useRef(0);
  useEffect(() => {
    if (step !== 'edit' || !grid.rows.length) return;
    const seq = ++checkSeq.current;
    const controller = new AbortController();
    const rowsNow = grid.rows;
    const wait = rowsNow.length > 3000 ? 1200 : 600;
    setChecking(true);
    const t = window.setTimeout(async () => {
      try {
        const payload = toImportRows(rowsNow, fields);
        if (mode === 'create') {
          const res = await importApi.check(payload, shopId || undefined, existing, controller.signal);
          if (seq === checkSeq.current) setCheck({ create: res, rows: rowsNow });
        } else {
          const res = await importApi.checkPrices(payload, controller.signal);
          if (seq === checkSeq.current) setCheck({ prices: res, rows: rowsNow });
        }
        if (seq === checkSeq.current) setCheckError(null);
      } catch (e) {
        if (controller.signal.aborted || (e as { code?: string })?.code === 'ERR_CANCELED') return;
        if (seq === checkSeq.current) setCheckError(apiMessage(e, tr('Check nahi hua — internet dekh lein')));
      } finally {
        if (seq === checkSeq.current) setChecking(false);
      }
    }, wait);
    return () => { window.clearTimeout(t); controller.abort(); };
  }, [step, grid.rows, fields, mode, shopId, existing]);

  const checkRows = useMemo(() => (mode === 'create' ? check?.create?.rows ?? [] : check?.prices?.rows ?? []) as Array<RowCheck<string> & Partial<Omit<PriceRowCheck, 'status'>>>, [check, mode]);
  const checkById = useMemo(() => new Map(checkRows.map((r) => [r.row, r])), [checkRows]);

  const marks = useMemo(() => {
    const out = new Map<number, RowMark>();
    for (const r of checkRows) out.set(r.row, markOf(r, mode, cost));
    return out;
  }, [checkRows, mode, cost]);

  const counts = useMemo(() => {
    const c = { all: grid.rows.length, error: 0, new: 0, update: 0, skip: 0, warn: 0 };
    for (const r of grid.rows) {
      const m = checkById.get(r.id);
      if (!m) continue;
      const s = m.status === 'change' ? 'update' : m.status === 'same' ? 'skip' : m.status;
      if (s in c) c[s as keyof typeof c]++;
      if (m.warnings.length && m.status !== 'error') c.warn++;
    }
    return c;
  }, [grid.rows, checkById]);

  const viewRows = useMemo(() => {
    if (view === 'all') return grid.rows;
    return grid.rows.filter((r) => {
      const m = checkById.get(r.id);
      if (!m) return false;
      if (view === 'warn') return m.warnings.length > 0 && m.status !== 'error';
      const s = m.status === 'change' ? 'update' : m.status === 'same' ? 'skip' : m.status;
      return s === view;
    });
  }, [grid.rows, view, checkById]);

  const stale = grid.rows.length > 0 && check?.rows !== grid.rows;
  const summary = check?.create?.summary;
  const ready = mode === 'create' ? (summary ? summary.ready + summary.update : 0) : check?.prices?.summary.change ?? 0;
  const shopName = shops.find((s) => s.id === shopId)?.name;

  // ─── Steps ───
  const reset = (nextMode = mode) => {
    setMode(nextMode);
    setStep('file');
    setSheet(null);
    setMapping([]);
    setExtraFields([]);
    grid.reset([]);
    setSelected(new Set());
    setCheck(null);
    setRun(null);
    setView('all');
  };

  const loadSheet = (s: Sheet) => {
    if (!s.headers.length || !s.rows.length) {
      toast.error(tr('File me column ke naam wali line aur neeche maal ki lines honi chahiye'));
      return;
    }
    if (s.rows.length > MAX_ROWS) {
      toast.error(tr('Ek dafa me {{MAX_ROWS}} lines tak — file ke do hisse kar ke import karein', { MAX_ROWS: MAX_ROWS.toLocaleString() }));
      return;
    }
    const m = detectMapping(s.headers, mode);
    setSheet(s);
    setMapping(m);
    setCheck(null);
    setStep('map');
    toast.success(tr('{{count}} lines mili · {{count2}} columns khud mil gaye — check kar lein', { count: s.rows.length, count2: m.filter(Boolean).length }));
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(xlsx|xls|csv|txt)$/i.test(file.name)) {
      toast.error(tr('Excel (.xlsx) ya CSV file chunein'));
      return;
    }
    setReading(true);
    try {
      loadSheet(await readFile(file));
    } catch {
      toast.error(tr('File parhi nahi ja saki — Excel me khol kar .xlsx ya .csv me dobara save karein'));
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const openSheet = () => {
    if (!sheet) return;
    grid.reset(sheetToGridRows(sheet, mapping));
    setSelected(new Set());
    setView('all');
    setCheck(null);
    setStep('edit');
  };

  /** An empty sheet to type or paste into, without a file. */
  const openBlank = () => {
    setMode('create');
    setRun(null);
    setSheet({ fileName: tr('Bulk products {{value}}', { value: new Date().toLocaleDateString('en-PK') }), headers: [], rows: [] });
    setMapping([]);
    // Wholesale and credit prices are optional; the columns are there so they can be filled while typing.
    setExtraFields(['wholesalePrice', 'creditPrice']);
    grid.reset(Array.from({ length: 10 }, (_, i) => ({ id: i + 1, cells: {} })));
    setSelected(new Set());
    setCheck(null);
    setStep('edit');
  };

  // "Bulk banayein": straight to an empty sheet.
  const started = useRef(false);
  useEffect(() => {
    if (!blank || started.current || !canCreate) return;
    started.current = true;
    openBlank();
  }, [blank, canCreate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ?fix=<job>: the failed rows of an earlier import, back in the grid.
  const fixJob = params.get('fix');
  const fixLoaded = useRef<string | null>(null);
  useEffect(() => {
    if (!fixJob || fixLoaded.current === fixJob) return;
    fixLoaded.current = fixJob;
    void (async () => {
      try {
        const job = await importApi.job(fixJob);
        if (!job.failedRows.length) { toast.info(tr('Is import ki ghalti wali lines mehfooz nahi — "Download" se file lein')); return; }
        const nextMode: ImportMode = job.jobType === 'PRICE_UPDATE' ? 'prices' : 'create';
        const keys = new Set<ImportField>();
        const rows = job.failedRows.map(({ row, error: _error, ...cells }) => {
          for (const k of Object.keys(cells)) keys.add(k as ImportField);
          return { id: row, cells: cells as Record<string, string> };
        });
        setMode(nextMode);
        setSheet({ fileName: job.fileName, headers: [], rows: [] });
        setMapping([]);
        setExtraFields([...keys]);
        grid.reset(rows);
        setSelected(new Set());
        setCheck(null);
        setView('all');
        setStep('edit');
        toast.info(tr('{{count}} ghalti wali lines grid me — theek kar ke dobara import karein', { count: rows.length }));
      } catch (e) {
        toast.error(apiMessage(e, tr('Import nahi mila')));
      }
    })();
  }, [fixJob]); // eslint-disable-line react-hooks/exhaustive-deps

  const backToColumns = async () => {
    if (!sheet?.headers.length) { reset(); return; }
    if (grid.canUndo && !(await confirmDialog({ title: tr('Columns dobara milayein?'), text: tr('Sheet me ki gayi tabdeeliyan mit jayengi aur file dobara parhi jayegi.'), yes: tr('Haan, columns') }))) return;
    setStep('map');
  };

  const download = async (kind: 'template' | 'sample') => {
    setBusy(kind);
    try {
      if (mode === 'create' || kind === 'sample') {
        if (kind === 'sample') {
          await downloadSample({ features, businessType, unit: defaultUnit || 'pcs' });
          toast.success(tr('Sample file download hui — isi ko upload kar ke dekh lein'));
        } else {
          const ref = await importApi.categories().catch(() => ({ categories: [] as Array<{ name: string }> }));
          await downloadTemplate({ features, businessType, unit: defaultUnit || 'pcs', categories: ref.categories.map((c) => c.name) });
          toast.success(tr('Template download ho gaya — sample lines mita kar apna maal likhein'));
        }
      } else {
        const { rows: list } = await importApi.priceSheet();
        if (!list.length) { toast.error(tr('Abhi koi product nahi')); return; }
        await downloadPriceSheet(list, !costHidden);
        toast.success(tr('{{count}} lines ki price list download hui — sirf Price / Cost badal kar wapas upload karein', { count: list.length }));
      }
    } catch (e) {
      toast.error(apiMessage(e, tr('Download nahi hua')));
    } finally {
      setBusy(null);
    }
  };

  // ─── Run ───
  const runFrom = async (state: RunState) => {
    pauseRef.current = false;
    let current: RunState = { ...state, running: true, error: undefined };
    setRun(current);
    const total = current.chunks.reduce((s, c) => s + c.length, 0);
    for (let i = current.next; i < current.chunks.length; i++) {
      if (pauseRef.current) {
        current = { ...current, running: false };
        setRun(current);
        return;
      }
      const body: RunChunk = {
        rows: current.chunks[i], fileName: sheet?.fileName ?? 'import', totalRows: total, done: i === current.chunks.length - 1,
        jobId: current.jobId, ...(mode === 'create' && { ...(shopId && { shopId }), existing }),
      };
      try {
        const res = mode === 'create' ? await importApi.run(body) : await importApi.runPrices(body);
        current = { ...current, jobId: res.jobId, job: res.job, next: i + 1, results: [...current.results, ...res.results] };
        setRun(current);
      } catch (e) {
        current = { ...current, running: false, error: apiMessage(e, tr('Internet ya server ka masla')) };
        setRun(current);
        return;
      }
    }
    current = { ...current, running: false, finished: true };
    setRun(current);
    void qc.invalidateQueries({ predicate: (q) => /product|catalog|categor|brand|stock|pos|import|imei/i.test(String(q.queryKey[0])) });
    const failed = current.results.filter((r) => r.status === 'error').length;
    toast.success(failed ? tr('Import mukammal — {{failed}} lines reh gayin', { failed }) : tr('Import mukammal'));
  };

  const startRun = () => {
    const chunks = chunkRows(toImportRows(grid.rows, fields), mode, CHUNK[mode]);
    setStep('run');
    void runFrom({ chunks, next: 0, results: [], running: true, finished: false });
  };

  /** Failed lines back into the grid, with what the server said about them. */
  const fixFailed = () => {
    if (!run) return;
    const failed = new Set(run.results.filter((r) => r.status === 'error').map((r) => r.row));
    const rows = grid.rows.filter((r) => failed.has(r.id));
    if (!rows.length) return;
    grid.reset(rows);
    setSelected(new Set());
    setView('all');
    setCheck(null);
    setRun(null);
    setStep('edit');
    toast.info(tr('{{count}} lines grid me — theek kar ke dobara import karein', { count: rows.length }));
  };

  const problemFile = async (list: Array<{ row: number; status: string; errors: string[] }>) => {
    const bad = new Map(list.filter((r) => r.status === 'error').map((r) => [r.row, r.errors.join(' · ')]));
    if (!bad.size) { toast.info(tr('Koi ghalti wali line nahi')); return; }
    await downloadProblemRows(fields, grid.rows, bad);
  };

  const addRow = () => {
    const [id] = grid.edit([], [{}]);
    setView('all');
    requestAnimationFrame(() => gridRef.current?.scrollToRow(id));
  };

  const deleteSelected = () => {
    grid.removeRows(selected);
    toast.success(tr('{{size}} lines hata di — Ctrl+Z se wapas', { size: selected.size }));
    setSelected(new Set());
  };

  const onGridEdit = useCallback((patches: Array<{ id: number; key: string; value: string }>, newRows: Array<Record<string, string>> = []) => {
    // Typing in the empty row under the last one makes it a real row.
    const ghost = patches.filter((p) => p.id === GHOST && p.value.trim());
    const rest = patches.filter((p) => p.id !== GHOST);
    const added = ghost.length ? [Object.fromEntries(ghost.map((p) => [p.key, p.value])), ...newRows] : newRows;
    grid.edit(rest, added);
  }, [grid]);

  const ghostOn = mode === 'create' && view === 'all';
  const gridRows = useMemo(() => (ghostOn ? [...viewRows, { id: GHOST, cells: {} }] : viewRows), [ghostOn, viewRows]);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const hasImei = fields.includes('imei');
  const stockMissing = mode === 'create' && step === 'map' && !!sheet && !mapped.has('stock') && !mapped.has('imei');

  return (
    <PageShell>
      {guide.isOpen && <ImportGuide mode={mode} imei={!!features.imei} onClose={guide.close} />}
      <Modal open={pasting} onClose={() => setPasting(false)} title={tr('Cells paste karein')} description={tr('Excel ya Google Sheets me pehli line (column ke naam) samet cells copy kar ke yahan paste karein.')}
        footer={<>
          <Button variant="secondary" onClick={() => setPasting(false)}>{tr('Wapas')}</Button>
          <Button disabled={!pasteText.trim()} onClick={() => { setPasting(false); loadSheet(readPasted(pasteText)); setPasteText(''); }}>{tr('Aage')}</Button>
        </>}>
        <Textarea rows={10} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={tr('Name	Price	Stock\nSurf Excel 1kg	650	20')}
          hint={tr('Tab se alag cells (Excel copy) ya comma se alag lines dono chalti hain')} />
      </Modal>

      <PageHero
        title={blank ? tr('Bulk banayein') : tr('Excel se import')}
        chip={<>{mode === 'create' ? <PackagePlus /> : <Tag />}{mode === 'create' ? tr('Products + stock') : tr('Price update')}</>}
        meta={`${template?.label ?? ''}${user?.assignedShop?.name ? ` · ${user.assignedShop.name}` : ''}`}
        actions={<>
          <button type="button" onClick={guide.open} title={tr('Tareeqa (G)')} className={heroButton}><GraduationCap className="h-4 w-4" /><span className="hidden sm:inline">{tr('Tareeqa')}</span></button>
          <button type="button" onClick={() => void download('template')} disabled={!!busy || running} className={heroButton}>
            {busy === 'template' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="hidden sm:inline">{mode === 'create' ? tr('Template') : tr('Price list')}</span>
          </button>
          {canEdit && <Link to="/products/bulk-edit" className={heroButton}><Table2 className="h-4 w-4" /><span className="hidden sm:inline">{tr('Bulk edit')}</span></Link>}
          <Link to="/products" className={heroButton}><Package className="h-4 w-4" /><span className="hidden sm:inline">{tr('Products')}</span></Link>
        </>}
      />

      <ol className="flex flex-wrap items-center gap-2 text-[0.8125rem]">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <span className={cn('inline-flex h-8 items-center gap-2 rounded-full px-3 font-semibold ring-1',
              i < stepIndex ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : i === stepIndex ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-500 ring-slate-200')}>
              {i < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : <span className="tabular-nums">{i + 1}</span>}{s.label}
            </span>
            {i < STEPS.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-300 rtl-flip" />}
          </li>
        ))}
      </ol>

      {step === 'file' && (
        <>
          {canCreate && canEdit && (
            <ViewTabs<ImportMode>
              tabs={[{ id: 'create', label: tr('Products + stock'), icon: PackagePlus }, { id: 'prices', label: tr('Price update'), icon: Tag }]}
              value={mode} onChange={(m) => reset(m)}
              hint={mode === 'create' ? tr('Naye products banayein, pehle se bane products ka stock / price update karein') : tr('Pehle se bane products ki sirf Price / Cost badlein')} />
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
            <p className="mt-3 text-[1rem] font-semibold text-slate-900">{tr('Excel ya CSV file yahan chhorein')}</p>
            <p className="mx-auto mt-1 max-w-2xl text-[0.8125rem] text-slate-500">
              {mode === 'create'
                ? tr('Apni purani list bhi chalegi — "Item Name", "Qty", "Maujooda", "Sale Rate" jaise column khud pehchane jate hain. Upar shop ka naam ya khaali lines hon to bhi koi baat nahi.')
                : tr('Upar se "Price list" download karein, Price / Cost badlein aur yahan wapas daalein. SKU ya barcode se product milta hai.')}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
              <Button leftIcon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()} loading={reading}>{tr('File chunein')}</Button>
              <Button variant="secondary" leftIcon={<ClipboardPaste className="h-4 w-4" />} onClick={() => setPasting(true)}>{tr('Cells paste karein')}</Button>
              {mode === 'create' && <Button variant="secondary" leftIcon={<Table2 className="h-4 w-4" />} onClick={openBlank}>{tr('Khaali sheet me likhein')}</Button>}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[0.8125rem]">
              <button type="button" onClick={() => void download('template')} disabled={!!busy} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
                {busy === 'template' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {mode === 'create' ? tr('{{value}} template', { value: template?.label ?? 'Apna' }) : tr('Price list download')}
              </button>
              {mode === 'create' && (
                <button type="button" onClick={() => void download('sample')} disabled={!!busy} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
                  {busy === 'sample' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}{tr('Sample file (bhari hui)')}
                </button>
              )}
            </div>
            <p className="mt-3 text-[0.75rem] text-slate-400">{tr('.xlsx, .xls, .csv · {{MAX_ROWS}} lines tak', { MAX_ROWS: MAX_ROWS.toLocaleString() })}</p>
          </div>
          <ImportHistory withCost={!costHidden} />
        </>
      )}

      {step === 'map' && sheet && (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
            <FileSpreadsheet className="h-4 w-4 text-brand-600" />
            <span className="font-semibold text-slate-900">{sheet.fileName}</span>
            <span className="text-slate-500">{tr('· {{count}} lines · {{count2}} columns', { count: sheet.rows.length, count2: sheet.headers.length })}</span>
            <button type="button" onClick={() => reset()} className="ms-auto inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
              <RefreshCw className="h-3.5 w-3.5" />{tr('Doosri file')}
            </button>
          </div>
          {stockMissing && (
            <Alert tone="warning" title={tr('Stock ka column nahi mila')}>
              <Trans text="Is tarah stock nahi aayega. Neeche jis column me maal ki ginti hai (Qty, Maujooda, Stock…) uske saamne {{stock}} chunein. Sirf products banane hain to aise hi aage chalein." values={{ stock: <b>{tr('Stock')}</b> }} />
            </Alert>
          )}
          <MappingPanel sheet={sheet} mode={mode} mapping={mapping} onChange={setMapping} />
          {mode === 'create' && (
            <ImportOptions shops={shops} shopId={shopId} onShop={setShopId} lockedShop={lockedShop} existing={existing} onExisting={setExisting}
              canStock={canStock} canPrices={canEdit} />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4 rtl-flip" />} onClick={() => reset()}>{tr('Wapas')}</Button>
            <div className="flex flex-wrap items-center gap-3">
              {mappingProblem
                ? <p className="text-[0.8125rem] font-medium text-rose-600">{mappingProblem}</p>
                : <p className="text-[0.8125rem] text-slate-500">{tr('Agle qadam me har line grid me dikhegi — wahin theek kar sakte hain')}</p>}
              <Button rightIcon={<ArrowRight className="h-4 w-4 rtl-flip" />} disabled={!!mappingProblem} onClick={openSheet}>
                {tr('Sheet me dekhein ({{count}})', { count: sheet.rows.length })}
              </Button>
            </div>
          </div>
        </>
      )}

      {step === 'edit' && (
        <>
          {mode === 'create' ? (
            <KpiRow cols={5}>
              <KpiCard icon={FileSpreadsheet} color="#475569" label={tr('Kul lines')} value={counts.all} active={view === 'all'} onClick={() => setView('all')} hint={sheet?.fileName} />
              <KpiCard icon={PackagePlus} color="#16a34a" label={tr('Naye banenge')} value={counts.new} active={view === 'new'} onClick={() => setView('new')} hint={summary ? tr('{{products}} products{{value}}', { products: summary.products, value: summary.variants ? tr(' · {{variants}} variants', { variants: summary.variants }) : '' }) : undefined} />
              <KpiCard icon={RefreshCw} color="#0284c7" label={tr('Update honge')} value={counts.update} active={view === 'update'} onClick={() => setView('update')} hint={counts.skip ? tr('{{skip}} chhor diye jayenge', { skip: counts.skip }) : tr('Pehle se bane products')} />
              <KpiCard icon={XCircle} color="#e11d48" label={tr('Ghalti')} value={counts.error} active={view === 'error'} onClick={() => setView('error')} hint={counts.error ? tr('Laal cells theek karein') : tr('Sab theek')} />
              <KpiCard icon={Boxes} color="#7c3aed" label={tr('Stock aayega')} value={summary ? `+${qty(summary.stockUp)}` : '…'}
                hint={summary ? `${shopName ?? check?.create?.shop?.name ?? ''}${summary.stockDown ? ` · −${qty(summary.stockDown)} kam` : ''}` : tr('Check ho raha hai')} />
            </KpiRow>
          ) : (
            <KpiRow cols={4}>
              <KpiCard icon={FileSpreadsheet} color="#475569" label={tr('Kul lines')} value={counts.all} active={view === 'all'} onClick={() => setView('all')} />
              <KpiCard icon={Tag} color="#0284c7" label={tr('Price badlegi')} value={counts.update} active={view === 'update'} onClick={() => setView('update')} />
              <KpiCard icon={CheckCircle2} color="#64748b" label={tr('Wesi hi')} value={counts.skip} active={view === 'skip'} onClick={() => setView('skip')} />
              <KpiCard icon={XCircle} color="#e11d48" label={tr('Ghalti')} value={counts.error} active={view === 'error'} onClick={() => setView('error')} />
            </KpiRow>
          )}

          {mode === 'create' && (
            <ImportOptions compact shops={shops} shopId={shopId} onShop={setShopId} lockedShop={lockedShop} existing={existing} onExisting={setExisting}
              canStock={canStock} canPrices={canEdit} />
          )}
          {mode === 'create' && hasImei && (
            <Alert tone="info" icon={<Smartphone className="h-4 w-4" />} title={tr('Mobile phone ka stock IMEI se')}>
              {tr('IMEI column me har phone ka 15 number wala IMEI likhein (kai phone ho to comma se alag). Stock usi ginti se banta hai — us line ka Stock cell band rehta hai. Charger, cover jaise accessories ka stock seedha Stock me likhein.')}
            </Alert>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <SheetTools columns={columns} rows={viewRows} selected={selected} onEdit={onGridEdit}
              canUndo={grid.canUndo} canRedo={grid.canRedo} onUndo={grid.undo} onRedo={grid.redo}
              onAddRow={addRow} onDelete={deleteSelected}
              extra={
                <Select aria-label={tr('Column jodein')} value="" className="h-8 w-40 text-[0.8125rem]"
                  onChange={(e) => { if (e.target.value) setExtraFields((x) => [...x, e.target.value as ImportField]); }}
                  options={[{ value: '', label: tr('+ Column jodein') }, ...(mode === 'create' ? CREATE_FIELDS : PRICE_FIELDS).filter((f) => !fields.includes(f)).map((f) => ({ value: f, label: FIELDS[f].label }))]} />
              } />
            <div className="flex items-center gap-2 text-[0.75rem]">
              {checkError && !checking
                ? <span className="inline-flex items-center gap-1 text-rose-700"><AlertTriangle className="h-3.5 w-3.5" />{checkError}</span>
                : checking || stale
                  ? <span className="inline-flex items-center gap-1 text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />{tr('Check ho raha hai…')}</span>
                  : <span className="inline-flex items-center gap-1 text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />{tr('Check ho gaya — abhi kuch save nahi hua')}</span>}
            </div>
          </div>

          <ViewTabs<View>
            tabs={[
              { id: 'all', label: tr('Sab'), count: counts.all },
              ...(counts.error ? [{ id: 'error' as const, label: tr('Ghalti'), count: counts.error }] : []),
              ...(counts.new ? [{ id: 'new' as const, label: tr('Naye'), count: counts.new }] : []),
              ...(counts.update ? [{ id: 'update' as const, label: mode === 'create' ? tr('Update') : tr('Badlegi'), count: counts.update }] : []),
              ...(counts.skip ? [{ id: 'skip' as const, label: mode === 'create' ? tr('Chhor diye') : tr('Wesi hi'), count: counts.skip }] : []),
              ...(counts.warn ? [{ id: 'warn' as const, label: tr('Dhyan dein'), count: counts.warn }] : []),
            ]}
            value={view} onChange={setView} />

          {mode === 'create' && summary && (summary.newCategories.length > 0 || summary.newBrands.length > 0) && (
            <p className="text-[0.8125rem] text-slate-600">
              {summary.newCategories.length > 0 && <>{tr('Nayi categories banengi:')}{' '} <b>{summary.newCategories.slice(0, 8).join(', ')}{summary.newCategories.length > 8 ? '…' : ''}</b>. </>}
              {summary.newBrands.length > 0 && <>{tr('Naye brands:')}{' '} <b>{summary.newBrands.slice(0, 8).join(', ')}{summary.newBrands.length > 8 ? '…' : ''}</b>.</>}
            </p>
          )}

          <SheetGrid ref={gridRef} rows={gridRows} columns={columns} marks={marks} selected={selected} onSelectedChange={setSelected}
            onEdit={onGridEdit} onUndo={grid.undo} onRedo={grid.redo}
            height={Math.max(360, Math.min(640, 36 + gridRows.length * 34 + 2))}
            emptyText={view === 'all' ? tr('Koi line nahi — "Line jodein" ya Excel se paste karein') : tr('Is filter me koi line nahi')} />

          <div className="sticky bottom-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg ring-1 ring-slate-200">
            {blank
              ? <Button variant="secondary" leftIcon={<Upload className="h-4 w-4" />} onClick={() => navigate('/products/bulk-import')}>{tr('Excel file se')}</Button>
              : <Button variant="secondary" leftIcon={<Columns3 className="h-4 w-4" />} onClick={() => void backToColumns()}>{tr('Columns')}</Button>}
            <div className="flex flex-wrap items-center gap-3">
              {counts.error > 0 && (
                <>
                  <span className="text-[0.8125rem] text-rose-700">{tr('{{error}} ghalti wali lines import nahi hongi', { error: counts.error })}</span>
                  <Button variant="secondary" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => void problemFile(checkRows)}>{tr('Download')}</Button>
                </>
              )}
              <Button rightIcon={<Play className="h-4 w-4" />} disabled={!ready || checking || stale || !!checkError} onClick={startRun}>
                {mode === 'create' ? (blank ? tr('Sab save karein ({{ready}})', { ready }) : tr('Import karein ({{ready}} lines)', { ready })) : tr('{{ready}} prices badlein', { ready })}
              </Button>
            </div>
          </div>
        </>
      )}

      {step === 'run' && run && (
        <RunPanel run={run} mode={mode} shopName={mode === 'create' ? shopName : undefined}
          onPause={() => { pauseRef.current = true; }}
          onResume={() => void runFrom(run)}
          onFixGrid={fixFailed}
          onFixFile={() => void problemFile(run.results)}
          onBulkEdit={run.jobId && canEdit && mode === 'create' ? () => navigate(`/products/bulk-edit?job=${run.jobId}`) : undefined}
          onNew={() => (blank ? openBlank() : reset())} />
      )}
    </PageShell>
  );
}

/** Grid status for a checked line. */
function markOf(r: RowCheck<string> & Partial<Omit<PriceRowCheck, 'status'>>, mode: ImportMode, cost: (n: number) => string): RowMark {
  const messages = [...r.errors, ...r.warnings];
  const cellErrors = r.fieldErrors as Partial<Record<string, string>> | undefined;
  if (r.status === 'error') return { tone: 'red', label: tr('Ghalti'), messages, cellErrors };
  if (mode === 'prices') {
    const parts: string[] = [];
    if (r.target && r.target.label !== r.name) parts.push(r.target.label);
    if (r.price) parts.push(tr('Price {{from}} → {{formatPKR}}', { from: formatPKR(r.price.from), formatPKR: formatPKR(r.price.to) }));
    if (r.costPrice) parts.push(tr('Cost {{from}} → {{cost}}', { from: cost(r.costPrice.from), cost: cost(r.costPrice.to) }));
    return r.status === 'change'
      ? { tone: 'blue', label: tr('Badlegi'), messages: [parts.join(' · '), ...messages].filter(Boolean) }
      : { tone: 'slate', label: tr('Wesi hi'), messages };
  }
  const q = r.stockQty ?? 0;
  const stock = q ? ` ${q > 0 ? '+' : '−'}${qty(Math.abs(q))}` : '';
  if (r.status === 'new') return { tone: r.warnings.length ? 'amber' : 'green', label: tr('Naya{{stock}}', { stock }), messages: messages.length ? messages : [q ? tr('Naya product banega, stock {{qty}}', { qty: qty(q) }) : tr('Naya product banega')] };
  if (r.status === 'update') {
    return { tone: 'blue', label: tr('Update{{stock}}', { stock }), messages: [q ? tr('"{{name}}" update hoga · stock {{qty}}', { name: r.match ?? r.name, qty: `${q > 0 ? '+' : '−'}${qty(Math.abs(q))}` }) : tr('"{{name}}" update hoga', { name: r.match ?? r.name }), ...messages] };
  }
  return { tone: 'slate', label: tr('Chhor dein'), messages };
}

function RunPanel({ run, mode, shopName, onPause, onResume, onFixGrid, onFixFile, onBulkEdit, onNew }: {
  run: RunState; mode: ImportMode; shopName?: string;
  onPause: () => void; onResume: () => void; onFixGrid: () => void; onFixFile: () => void; onBulkEdit?: () => void; onNew: () => void;
}) {
  const navigate = useNavigate();
  const total = run.chunks.reduce((s, c) => s + c.length, 0);
  const done = run.results.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const created = run.results.filter((r) => r.status === 'new').length;
  const updated = run.results.filter((r) => r.status === 'update' || r.status === 'change').length;
  const skip = run.results.filter((r) => r.status === 'skip' || r.status === 'same').length;
  const bad = run.results.filter((r) => r.status === 'error').length;
  const stockUp = run.results.reduce((s, r) => s + (r.status !== 'error' && (r.stockQty ?? 0) > 0 ? r.stockQty ?? 0 : 0), 0);
  const stockDown = run.results.reduce((s, r) => s + (r.status !== 'error' && (r.stockQty ?? 0) < 0 ? -(r.stockQty ?? 0) : 0), 0);
  const failed = run.results.filter((r) => r.status === 'error');

  return (
    <>
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[0.9375rem] font-semibold text-slate-900">
              {run.finished ? tr('Import mukammal') : run.running ? tr('Import chal raha hai…') : run.error ? tr('Import ruk gaya') : tr('Import roka hua hai')}
            </p>
            <p className="text-[0.8125rem] text-slate-500">
              {tr('{{done}} / {{total}} lines · hissa {{value}} / {{count}}{{value2}}', { done, total, value: Math.min(run.next + (run.running ? 1 : 0), run.chunks.length), count: run.chunks.length, value2: shopName ? tr(' · stock: {{shopName}}', { shopName }) : '' })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {run.running && <Button variant="secondary" leftIcon={<Pause className="h-4 w-4" />} onClick={onPause}>{tr('Rokein')}</Button>}
            {!run.running && !run.finished && <Button leftIcon={<Play className="h-4 w-4" />} onClick={onResume}>{tr('Baqi chalayein')}</Button>}
            {run.finished && <>
              {onBulkEdit && (created + updated) > 0 && <Button variant="secondary" leftIcon={<PencilLine className="h-4 w-4" />} onClick={onBulkEdit}>{tr('Imported products ko edit karein')}</Button>}
              <Button variant="secondary" leftIcon={<Package className="h-4 w-4" />} onClick={() => navigate('/products')}>{tr('Products dekhein')}</Button>
              <Button leftIcon={<Upload className="h-4 w-4" />} onClick={onNew}>{tr('Naya import')}</Button>
            </>}
          </div>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={cn('h-full rounded-full transition-all', run.error ? 'bg-rose-500' : run.finished ? 'bg-emerald-500' : 'bg-brand-600')} style={{ width: `${pct}%` }} />
        </div>
        {run.error && (
          <p className="mt-2 text-[0.8125rem] text-rose-700">
            {tr('{{error}}. Jo lines ho chuki hain wo save hain — "Baqi chalayein" dabayein, pehle se bani lines dobara nahi banengi.', { error: run.error })}
          </p>
        )}
        {run.running && <p className="mt-2 text-[0.75rem] text-slate-500">{tr('Ye page band na karein jab tak import mukammal na ho.')}</p>}
      </div>

      {mode === 'create' ? (
        <KpiRow cols={5}>
          <KpiCard icon={PackagePlus} color="#16a34a" label={tr('Ban gaye')} value={created} />
          <KpiCard icon={RefreshCw} color="#0284c7" label={tr('Update hue')} value={updated} />
          <KpiCard icon={Boxes} color="#7c3aed" label={tr('Stock aaya')} value={`+${qty(stockUp)}`} hint={stockDown ? tr('−{{stockDown}} kam hua', { stockDown: qty(stockDown) }) : shopName} />
          <KpiCard icon={CheckCircle2} color="#64748b" label={tr('Chhor diye')} value={skip} />
          <KpiCard icon={XCircle} color="#e11d48" label={tr('Nahi hue')} value={bad} />
        </KpiRow>
      ) : (
        <KpiRow cols={3}>
          <KpiCard icon={Tag} color="#0284c7" label={tr('Price badli')} value={updated} />
          <KpiCard icon={CheckCircle2} color="#64748b" label={tr('Wesi hi')} value={skip} />
          <KpiCard icon={XCircle} color="#e11d48" label={tr('Nahi badli')} value={bad} />
        </KpiRow>
      )}

      {run.finished && failed.length > 0 && (
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-rose-200 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-rose-800"><AlertTriangle className="h-4 w-4" />{tr('{{count}} lines nahi huin', { count: failed.length })}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" leftIcon={<Table2 className="h-4 w-4" />} onClick={onFixGrid}>{tr('Grid me theek karein')}</Button>
              <Button size="sm" variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={onFixFile}>{tr('Excel download')}</Button>
            </div>
          </div>
          <ul className="mt-2 max-h-64 divide-y divide-slate-100 overflow-auto text-[0.8125rem]">
            {failed.slice(0, 200).map((r) => (
              <li key={r.row} className="flex gap-3 py-1.5">
                <span className="w-14 shrink-0 font-mono text-[0.75rem] text-slate-500">#{r.row}</span>
                <span className="w-48 shrink-0 truncate font-semibold text-slate-800">{r.name || '—'}</span>
                <span className="min-w-0 text-rose-700">{r.errors.join(' · ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function ImportGuide({ mode, imei, onClose }: { mode: ImportMode; imei: boolean; onClose: () => void }) {
  return (
    <PageGuide
      title={mode === 'create' ? tr('Excel se products aur stock') : tr('Excel se price update')}
      onClose={onClose}
      steps={mode === 'create' ? [
        { icon: Download, color: '#2563eb', title: tr('File lein'), text: tr('Apni purani list chalti hai. Na ho to "Template" ya bhari hui "Sample file" lein.') },
        { icon: Columns3, color: '#7c3aed', title: tr('Columns aur branch'), text: tr('Zyada tar column khud mil jate hain. Stock wala column zaroor dekhein, aur branch chunein jahan stock jayega.') },
        { icon: Table2, color: '#16a34a', title: tr('Sheet me theek karein'), text: tr('Har line grid me. Laal cell me ghalti hai — click kar ke neeche wajah dekhein, likh kar theek karein. Excel se copy-paste bhi chalta hai.') },
        { icon: Play, color: '#ea580c', title: tr('Import'), text: tr('Naye products bante hain, pehle se bane products ka stock aap ke chunay tareeqe se badalta hai. Har stock ka Stock movement banta hai.') },
      ] : [
        { icon: Download, color: '#2563eb', title: tr('Price list lein'), text: tr('Upar "Price list" se sab products ki file lein — SKU, barcode aur abhi ki price ke saath.') },
        { icon: Tag, color: '#7c3aed', title: tr('Price badlein'), text: tr('Sirf Price ya Cost Price column badlein. Naam, SKU aur barcode ko na chherein.') },
        { icon: Table2, color: '#16a34a', title: tr('Sheet me dekhein'), text: tr('Har line ki purani aur nayi price dikhti hai. 50% se zyada badlaav par khabardar karta hai.') },
        { icon: Play, color: '#ea580c', title: tr('Update'), text: tr('Sirf price aur cost badalti hai — stock ya naam nahi. Har badlaav import history me rehta hai.') },
      ]}
      tips={mode === 'create' ? [
        tr('Pehle se bane products: "Stock file wala kar dein" (farq ka adjustment) — dobara import se stock dugna nahi hota. "Jama karein" naye maal ke liye.'),
        tr('Stock me "1,200", "Rs 1,250" ya "12.5 kg" — comma, Rs aur unit khud hat jate hain.'),
        tr('Ek hi naam ki kai lines me Size / Color / Variant ho to ek product ke variants bante hain; har line ka stock us variant ka.'),
        tr('Pack Name + Pack Qty (jaise Carton, 24) se pack lag jata hai. Stock khule (Unit) me likhein.'),
        ...(imei ? [tr('Mobile phone: IMEI column me IMEI likhein — stock IMEI ginti se banta hai. Accessories ka stock seedha.')] : []),
        tr('Grid: Enter/F2 edit, Tab aage, Ctrl+Z wapas, Shift+arrows se block chun kar Delete ya ek value paste.'),
      ] : [
        tr('SKU ya barcode na ho to poora naam milaya jata hai — sirf jab us naam ki ek hi cheez ho.'),
        tr('Variant ya pack ki price uski apni line (Variant / Pack Name column) se badalti hai.'),
        tr('Price 0 nahi ho sakti; khali cell ka matlab "na badlein".'),
      ]}
      shortcuts={[['G', tr('Ye guide')], ['Ctrl+Z', tr('Wapas')], ['F2', tr('Cell edit')]]}
    />
  );
}
