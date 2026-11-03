/**
 * Import products from Excel / CSV (same flow and API as the web):
 *  1. File: pick a file (document picker), paste cells, or start a blank
 *     sheet; download the industry template, a filled sample or the price
 *     list. Two modes: products + stock, or price update.
 *  2. Columns: each file column matched to a field (detected automatically),
 *     the branch for opening stock and what to do with products already there.
 *  3. Check: every line checked on the server (nothing saved yet); tap a line
 *     to fix it, delete lines, download the problem lines.
 *  4. Import: sent in chunks with progress, pause and resume; failed lines go
 *     back to the sheet. Past imports are listed with their errors.
 * Needs internet (the server checks and saves every line).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertTriangle, CheckCircle2, ClipboardPaste, Download, FileSpreadsheet, History, PackagePlus, Pause, Play, Plus, RefreshCw, Table2, Tag, Trash2, Upload, XCircle,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatDateTime, formatPKR } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { onlineNeededText } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Badge, Button, Card, Checkbox, ChipGroup, EmptyState, IconButton, Input, ListRow, ProgressBar, Row, Screen, Segmented, Select, Sheet, StatTile, Text, TextArea, confirm, toast, useTheme,
  type StatusTone,
} from '@/design';
import { BranchSelect, useCategories } from '../../components/Pickers';
import { qty, useCostMask, useOnline, useRefreshInventory } from '../../lib/shared';
import {
  importApi, type CreateCheck, type ExistingOptions, type ExistingStockMode, type ImportField, type ImportJob, type PriceCheck, type PriceRowCheck, type RowCheck,
} from '../api/import';
import {
  CREATE_FIELDS, chunkRows, detectMapping, downloadJobChanges, downloadJobErrors, downloadPriceSheet, downloadProblemRows, downloadSample, downloadTemplate, FIELDS,
  PRICE_FIELDS, readFile, readPasted, sheetToGridRows, toImportRows, type ImportMode, type Sheet as FileSheet,
} from '../lib/importColumns';

type Step = 'file' | 'map' | 'edit' | 'run';
type GridRow = { id: number; cells: Partial<Record<string, string>> };
type View_ = 'all' | 'error' | 'new' | 'update' | 'skip';
interface RunState { chunks: ReturnType<typeof chunkRows>; next: number; jobId?: string; job?: ImportJob; results: Array<RowCheck<string>>; running: boolean; finished: boolean; error?: string }

const MAX_ROWS = 10_000;
const CHUNK = { create: 50, prices: 250 } as const;
const STOCK_MODES: Array<{ id: ExistingStockMode; title: string; text: string }> = [
  { id: 'set', title: msg('Stock file wala kar dein'), text: msg('System me 10 hain, file me 24 → +14 ka adjustment. Dobara import karne se stock dugna nahi hota.') },
  { id: 'add', title: msg('Stock me jama karein'), text: msg('File ka stock maujooda stock me jur jata hai (opening stock). Naya maal aaya ho to.') },
  { id: 'skip', title: msg('Stock na chheren'), text: msg('Pehle se bane products ka stock wesa hi rahega.') },
];

function markOf(r: RowCheck<string> & Partial<Omit<PriceRowCheck, 'status'>>, mode: ImportMode, cost: (n: number) => string): { tone: StatusTone; label: string; messages: string[] } {
  const messages = [...r.errors, ...r.warnings];
  if (r.status === 'error') return { tone: 'danger', label: t('Ghalti'), messages };
  if (mode === 'prices') {
    const parts: string[] = [];
    if (r.target && r.target.label !== r.name) parts.push(r.target.label);
    if (r.price) parts.push(t('Price {{from}} → {{formatPKR}}', { from: formatPKR(r.price.from), formatPKR: formatPKR(r.price.to) }));
    if (r.costPrice) parts.push(t('Cost {{from}} → {{cost}}', { from: cost(r.costPrice.from), cost: cost(r.costPrice.to) }));
    return r.status === 'change' ? { tone: 'info', label: t('Badlegi'), messages: [parts.join(' · '), ...messages].filter(Boolean) } : { tone: 'neutral', label: t('Wesi hi'), messages };
  }
  const q = r.stockQty ?? 0;
  const stock = q ? ` ${q > 0 ? '+' : '−'}${qty(Math.abs(q))}` : '';
  if (r.status === 'new') return { tone: r.warnings.length ? 'warning' : 'success', label: t('Naya{{stock}}', { stock }), messages: messages.length ? messages : [q ? t('Naya product banega, stock {{qty}}', { qty: qty(q) }) : t('Naya product banega')] };
  if (r.status === 'update') {
    return { tone: 'info', label: t('Update{{stock}}', { stock }), messages: [q ? t('"{{name}}" update hoga · stock {{qty}}', { name: r.match ?? r.name, qty: `${q > 0 ? '+' : '−'}${qty(Math.abs(q))}` }) : t('"{{name}}" update hoga', { name: r.match ?? r.name }), ...messages] };
  }
  return { tone: 'neutral', label: t('Chhor dein'), messages };
}

export function BulkImportScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ start?: string; mode?: string; fix?: string }>();
  const blank = params.start === 'blank';
  const can = usePermission();
  const canCreate = can(P.PRODUCTS_CREATE);
  const canEdit = can(P.PRODUCTS_EDIT);
  const canStock = can(P.STOCK_ADJUSTMENTS_MANAGE);
  const online = useOnline();
  const refreshInv = useRefreshInventory();
  const { costHidden, cost } = useCostMask();
  const businessType = useAuthStore((s) => s.tenant?.businessType) ?? '';
  const activeShop = useAuthStore((s) => s.currentShopId);
  const categories = useCategories();
  const [mode, setMode] = useState<ImportMode>(() => (!blank && ((params.mode === 'prices' && canEdit) || !canCreate) ? 'prices' : 'create'));
  const [step, setStep] = useState<Step>('file');
  const [sheet, setSheet] = useState<FileSheet | null>(null);
  const [mapping, setMapping] = useState<Array<ImportField | ''>>([]);
  const [fields, setFields] = useState<ImportField[]>([]);
  const [rows, setRows] = useState<GridRow[]>([]);
  const [shopId, setShopId] = useState<string | null>(activeShop);
  const [existing, setExisting] = useState<ExistingOptions>({ stock: 'set', prices: false });
  const [view, setView] = useState<View_>('all');
  const [editing, setEditing] = useState<GridRow | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const pauseRef = useRef(false);
  const features = useQuery({ queryKey: ['business-config', 'features'], queryFn: importApi.businessFeatures, staleTime: 10 * 60_000 });
  const jobs = useQuery({ queryKey: ['inv', 'import-jobs'], queryFn: importApi.jobs, enabled: step === 'file' });

  const mapped = useMemo(() => new Set(mapping.filter(Boolean) as ImportField[]), [mapping]);
  const mappingProblem = !sheet ? t('File chunein')
    : mode === 'create' ? (!mapped.has('name') ? t('Name ka column chunein — ye zaroori hai') : null)
      : (!mapped.has('sku') && !mapped.has('barcode') && !mapped.has('name') ? t('SKU, Barcode ya Name me se ek column chunein — isi se product milta hai')
        : !mapped.has('price') && !mapped.has('costPrice') ? t('Price ya Cost Price ka column chunein') : null);

  const reset = (m: ImportMode = mode) => { setMode(m); setStep('file'); setSheet(null); setMapping([]); setRows([]); setFields([]); setRun(null); };
  const loadSheet = (s: FileSheet) => {
    if (!s.headers.length || !s.rows.length) { toast.error(t('File me column ke naam wali line aur neeche maal ki lines honi chahiye')); return; }
    if (s.rows.length > MAX_ROWS) { toast.error(t('Ek dafa me {{MAX_ROWS}} lines tak — file ke do hisse kar ke import karein', { MAX_ROWS: MAX_ROWS.toLocaleString() })); return; }
    const m = detectMapping(s.headers, mode);
    setSheet(s);
    setMapping(m);
    setStep('map');
    toast.success(t('{{count}} lines mili · {{count2}} columns khud mil gaye — check kar lein', { count: s.rows.length, count2: m.filter(Boolean).length }));
  };
  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '*/*'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    if (!/\.(xlsx|xls|csv|txt)$/i.test(a.name)) { toast.error(t('Excel (.xlsx) ya CSV file chunein')); return; }
    setBusy('read');
    try { loadSheet(await readFile({ uri: a.uri, name: a.name, mimeType: a.mimeType })); }
    catch { toast.error(t('File parhi nahi ja saki — Excel me khol kar .xlsx ya .csv me dobara save karein')); }
    finally { setBusy(null); }
  };
  const toSheet = () => {
    if (!sheet || mappingProblem) return;
    const f = [...new Set(mapping.filter(Boolean) as ImportField[])];
    setFields(f);
    setRows(sheetToGridRows(sheet, mapping));
    setStep('edit');
  };
  const openBlank = () => {
    setSheet({ fileName: t('Bulk products {{value}}', { value: new Date().toLocaleDateString('en-PK') }), headers: [], rows: [] });
    setFields(['name', 'price', 'costPrice', 'stock', 'unit', 'category', 'barcode']);
    setRows([]);
    setStep('edit');
  };
  useEffect(() => { if (blank && canCreate) openBlank(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Failed rows of an earlier import, opened from the history ("Theek karein").
  useEffect(() => {
    if (!params.fix) return;
    void importApi.job(params.fix).then((job) => {
      if (!job.failedRows.length) { toast.info(t('Is import ki ghalti wali lines mehfooz nahi — "Download" se file lein')); return; }
      const f = [...new Set(job.failedRows.flatMap((r) => Object.keys(r).filter((k) => k !== 'row' && k !== 'error')))] as ImportField[];
      setMode(job.jobType === 'PRICE_UPDATE' ? 'prices' : 'create');
      setSheet({ fileName: job.fileName, headers: [], rows: [] });
      setFields(f);
      setRows(job.failedRows.map((r) => ({ id: r.row, cells: Object.fromEntries(f.map((k) => [k, r[k] ?? ''])) })));
      setStep('edit');
      toast.info(t('{{count}} ghalti wali lines grid me — theek kar ke dobara import karein', { count: job.failedRows.length }));
    }).catch((e) => toast.error(apiErrorMessage(e, t('Import nahi mila'))));
  }, [params.fix]);

  // The server checks every line (nothing saved) a moment after the sheet changes.
  const importRows = useMemo(() => toImportRows(rows, fields), [rows, fields]);
  const [check, setCheck] = useState<{ create?: CreateCheck; prices?: PriceCheck } | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  useEffect(() => {
    if (step !== 'edit' || !importRows.length || !online) return;
    let live = true;
    const tm = setTimeout(async () => {
      setChecking(true);
      try {
        const res = mode === 'create' ? { create: await importApi.check(importRows, shopId ?? undefined, existing) } : { prices: await importApi.checkPrices(importRows) };
        if (live) { setCheck(res); setCheckError(null); }
      } catch (e) {
        if (live) setCheckError(apiErrorMessage(e, t('Check nahi hua — internet dekh lein')));
      } finally { if (live) setChecking(false); }
    }, 600);
    return () => { live = false; clearTimeout(tm); };
  }, [importRows, step, mode, shopId, existing, online]);
  const checkRows: Array<RowCheck<string> & Partial<Omit<PriceRowCheck, 'status'>>> = (check?.create?.rows ?? check?.prices?.rows ?? []) as never;
  const checkById = useMemo(() => new Map(checkRows.map((r) => [r.row, r])), [checkRows]);
  const statusOf = (id: number) => checkById.get(id)?.status;
  const counts = {
    all: rows.length,
    error: checkRows.filter((r) => r.status === 'error').length,
    new: checkRows.filter((r) => r.status === 'new').length,
    update: checkRows.filter((r) => r.status === 'update' || r.status === 'change').length,
    skip: checkRows.filter((r) => r.status === 'skip' || r.status === 'same').length,
  };
  const ready = mode === 'create' ? counts.new + counts.update : counts.update;
  const visible = rows.filter((r) => {
    const s = statusOf(r.id);
    return view === 'all' || (view === 'error' && s === 'error') || (view === 'new' && s === 'new') || (view === 'update' && (s === 'update' || s === 'change')) || (view === 'skip' && (s === 'skip' || s === 'same'));
  });
  const summary = check?.create?.summary;

  const runFrom = async (state: RunState) => {
    pauseRef.current = false;
    let cur: RunState = { ...state, running: true, error: undefined };
    setRun(cur);
    const total = cur.chunks.reduce((s, c) => s + c.length, 0);
    for (let i = cur.next; i < cur.chunks.length; i++) {
      if (pauseRef.current) { cur = { ...cur, running: false }; setRun(cur); return; }
      const body = { rows: cur.chunks[i], fileName: sheet?.fileName ?? 'import', totalRows: total, done: i === cur.chunks.length - 1, jobId: cur.jobId, ...(mode === 'create' && { ...(shopId && { shopId }), existing }) };
      try {
        const res = mode === 'create' ? await importApi.run(body) : await importApi.runPrices(body);
        cur = { ...cur, jobId: res.jobId, job: res.job, next: i + 1, results: [...cur.results, ...res.results] };
        setRun(cur);
      } catch (e) {
        cur = { ...cur, running: false, error: apiErrorMessage(e, t('Internet ya server ka masla')) };
        setRun(cur);
        return;
      }
    }
    cur = { ...cur, running: false, finished: true };
    setRun(cur);
    void refreshInv();
    void qc.invalidateQueries({ queryKey: ['inv', 'import-jobs'] });
    const failed = cur.results.filter((r) => r.status === 'error').length;
    toast.success(failed ? t('Import mukammal — {{failed}} lines reh gayin', { failed }) : t('Import mukammal'));
  };
  const startRun = async () => {
    if (!online) { toast.warning(onlineNeededText('settings')); return; }
    if (counts.error && !(await confirm({ title: t('{{error}} ghalti wali lines import nahi hongi', { error: counts.error }), confirmLabel: t('Aage') }))) return;
    const chunks = chunkRows(importRows, mode, CHUNK[mode]);
    setStep('run');
    void runFrom({ chunks, next: 0, results: [], running: true, finished: false });
  };
  const fixFailed = () => {
    if (!run) return;
    const failed = new Set(run.results.filter((r) => r.status === 'error').map((r) => r.row));
    setRows((list) => list.filter((r) => failed.has(r.id)));
    setRun(null);
    setStep('edit');
    toast.info(t('{{count}} lines grid me — theek kar ke dobara import karein', { count: failed.size }));
  };
  const download = useMutation({
    mutationFn: async (kind: 'template' | 'sample' | 'prices') => {
      const f = features.data ?? {};
      if (kind === 'sample') { await downloadSample({ features: f, businessType, unit: 'pcs' }); toast.success(t('Sample file download hui — isi ko upload kar ke dekh lein')); }
      else if (kind === 'template') { await downloadTemplate({ features: f, businessType, unit: 'pcs', categories: (categories.data ?? []).map((c) => c.name) }); toast.success(t('Template download ho gaya — sample lines mita kar apna maal likhein')); }
      else {
        const { rows: list } = await importApi.priceSheet();
        if (!list.length) { toast.error(t('Abhi koi product nahi')); return; }
        await downloadPriceSheet(list, !costHidden);
        toast.success(t('{{count}} lines ki price list download hui — sirf Price / Cost badal kar wapas upload karein', { count: list.length }));
      }
    },
  });
  const problems = () => void downloadProblemRows(fields, rows, new Map(checkRows.filter((r) => r.status === 'error').map((r) => [r.row, [...r.errors, ...r.warnings].join(' · ')])));

  const title = blank ? t('Bulk banayein') : t('Excel se import');
  return (
    <Screen title={title} subtitle={mode === 'create' ? t('Products + stock') : t('Price update')}
      footer={step === 'map' ? (
        <Row gap={2}>
          <Button variant="secondary" onPress={() => reset()}>{t('Wapas')}</Button>
          <Button style={{ flex: 1 }} icon={Table2} disabled={!!mappingProblem} onPress={toSheet}>{t('Sheet me dekhein ({{count}})', { count: sheet?.rows.length ?? 0 })}</Button>
        </Row>
      ) : step === 'edit' ? (
        <Button size="lg" disabled={!ready || checking || !!checkError} onPress={() => void startRun()}>
          {mode === 'create' ? (blank ? t('Sab save karein ({{ready}})', { ready }) : t('Import karein ({{ready}} lines)', { ready })) : t('{{ready}} prices badlein', { ready })}
        </Button>
      ) : undefined}>
      <View style={{ gap: th.space(4) }}>
        {!online && <Card tone="info"><Text size="sm">{onlineNeededText('settings')}</Text></Card>}

        {step === 'file' && (
          <>
            {canCreate && canEdit && (
              <Segmented value={mode} onChange={(m) => reset(m)} options={[{ value: 'create', label: t('Products + stock'), icon: PackagePlus }, { value: 'prices', label: t('Price update'), icon: Tag }]} />
            )}
            <Text size="sm" tone="muted">{mode === 'create' ? t('Naye products banayein, pehle se bane products ka stock / price update karein') : t('Pehle se bane products ki sirf Price / Cost badlein')}</Text>
            <Card>
              <View style={{ gap: th.space(3), alignItems: 'center' }}>
                <FileSpreadsheet size={36} color={th.colors.brand.solid} />
                <Text weight="semibold" align="center">{t('Excel ya CSV file chunein')}</Text>
                <Text size="xs" tone="muted" align="center">
                  {mode === 'create'
                    ? t('Apni purani list bhi chalegi — "Item Name", "Qty", "Maujooda", "Sale Rate" jaise column khud pehchane jate hain. Upar shop ka naam ya khaali lines hon to bhi koi baat nahi.')
                    : t('Upar se "Price list" download karein, Price / Cost badlein aur yahan wapas daalein. SKU ya barcode se product milta hai.')}
                </Text>
                <Button fullWidth icon={Upload} loading={busy === 'read'} onPress={() => void pickFile()}>{t('File chunein')}</Button>
                <Button fullWidth variant="secondary" icon={ClipboardPaste} onPress={() => setPasting(true)}>{t('Cells paste karein')}</Button>
                {mode === 'create' && <Button fullWidth variant="secondary" icon={Table2} onPress={openBlank}>{t('Khaali sheet me likhein')}</Button>}
                <Row gap={2} wrap justify="center">
                  {mode === 'create' ? (
                    <>
                      <Button size="sm" variant="ghost" icon={Download} loading={download.isPending && download.variables === 'template'} onPress={() => download.mutate('template')}>{t('Template')}</Button>
                      <Button size="sm" variant="ghost" icon={FileSpreadsheet} loading={download.isPending && download.variables === 'sample'} onPress={() => download.mutate('sample')}>{t('Sample file (bhari hui)')}</Button>
                    </>
                  ) : <Button size="sm" variant="ghost" icon={Download} loading={download.isPending} onPress={() => download.mutate('prices')}>{t('Price list download')}</Button>}
                </Row>
                <Text size="2xs" tone="subtle">{t('.xlsx, .xls, .csv · {{MAX_ROWS}} lines tak', { MAX_ROWS: MAX_ROWS.toLocaleString() })}</Text>
              </View>
            </Card>
            <JobsCard jobs={jobs.data ?? []} costHidden={costHidden} onFix={(id) => router.setParams({ fix: id })} onEdit={(id) => router.push(`/products/bulk-edit?jobId=${id}` as never)} />
          </>
        )}

        {step === 'map' && sheet && (
          <>
            <Card tone="muted"><Text size="sm" weight="semibold">{sheet.fileName}</Text><Text size="xs" tone="muted">{t('· {{count}} lines · {{count2}} columns', { count: sheet.rows.length, count2: sheet.headers.length })}</Text></Card>
            {mode === 'create' && !mapped.has('stock') && (
              <Card tone="warning" title={t('Stock ka column nahi mila')}>
                <Text size="sm">{t('Is tarah stock nahi aayega. Neeche jis column me maal ki ginti hai (Qty, Maujooda, Stock…) uske saamne Stock chunein. Sirf products banane hain to aise hi aage chalein.')}</Text>
              </Card>
            )}
            {sheet.headers.map((h, i) => (
              <Select key={`${h}${i}`} label={h} value={mapping[i] ?? ''} hint={sheet.rows.slice(0, 3).map((r) => r.cells[i]).filter(Boolean).join(' · ') || undefined}
                onChange={(v) => setMapping((m) => m.map((x, j) => (j === i ? (v as ImportField | '') : x === v && v ? '' : x)))}
                options={[{ value: '', label: t('Na lein') }, ...(mode === 'create' ? CREATE_FIELDS : PRICE_FIELDS).map((f) => ({ value: f, label: t(FIELDS[f].label), description: t(FIELDS[f].hint) }))]} />
            ))}
            {mode === 'create' && (
              <Card title={t('Stock kis branch me?')}>
                <View style={{ gap: th.space(3) }}>
                  {activeShop ? <Text size="sm" tone="muted">{t('Har line ka stock isi branch me jata hai; baqi branches me 0 se shuru')}</Text>
                    : <BranchSelect value={shopId} onChange={setShopId} hint={t('Har line ka stock isi branch me jata hai; baqi branches me 0 se shuru')} />}
                  <Text size="sm" weight="semibold">{t('Jo products pehle se hain (same naam, SKU ya barcode) unka stock:')}</Text>
                  {!canStock && <Text size="xs" tone="warning">{t('Aap ke paas Stock adjustment ki ijazat nahi — pehle se bane products ka stock nahi badlega.')}</Text>}
                  {STOCK_MODES.map((m) => (
                    <ListRow key={m.id} dense title={t(m.title)} subtitle={t(m.text)} selected={existing.stock === m.id} disabled={!canStock && m.id !== 'skip'}
                      trailing={existing.stock === m.id ? <CheckCircle2 size={18} color={th.colors.brand.solid} /> : undefined} onPress={() => setExisting((x) => ({ ...x, stock: m.id }))} />
                  ))}
                  <Checkbox label={t('Price / Cost bhi file wali kar dein')} value={existing.prices} disabled={!canEdit} onChange={(v) => setExisting((x) => ({ ...x, prices: v }))}
                    description={canEdit ? t('Khaali cell ka matlab: wesi hi rahe') : t('Products edit ki ijazat chahiye')} />
                </View>
              </Card>
            )}
            {mappingProblem && <Text size="sm" tone="danger">{mappingProblem}</Text>}
          </>
        )}

        {step === 'edit' && (
          <>
            {mode === 'create' ? (
              <Row gap={2} wrap>
                <StatTile style={{ flex: 1, minWidth: 140 }} icon={PackagePlus} tone="success" label={t('Naye banenge')} value={<Text size="xl" weight="bold">{counts.new}</Text>} />
                <StatTile style={{ flex: 1, minWidth: 140 }} icon={RefreshCw} tone="info" label={t('Update honge')} value={<Text size="xl" weight="bold">{counts.update}</Text>} />
                <StatTile style={{ flex: 1, minWidth: 140 }} icon={XCircle} tone="danger" label={t('Ghalti')} value={<Text size="xl" weight="bold">{counts.error}</Text>} hint={counts.error ? t('Laal cells theek karein') : undefined} />
                <StatTile style={{ flex: 1, minWidth: 140 }} label={t('Stock aayega')} value={<Text size="xl" weight="bold" ltr>{summary ? `+${qty(summary.stockUp)}` : '…'}</Text>} hint={summary?.stockDown ? `−${qty(summary.stockDown)}` : undefined} />
              </Row>
            ) : (
              <Row gap={2}>
                <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Tag} tone="info" label={t('Price badlegi')} value={<Text size="xl" weight="bold">{counts.update}</Text>} />
                <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CheckCircle2} label={t('Wesi hi')} value={<Text size="xl" weight="bold">{counts.skip}</Text>} />
                <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={XCircle} tone="danger" label={t('Ghalti')} value={<Text size="xl" weight="bold">{counts.error}</Text>} />
              </Row>
            )}
            <Text size="xs" tone={checkError ? 'danger' : 'muted'}>{checkError ?? (checking ? t('Check ho raha hai…') : t('Check ho gaya — abhi kuch save nahi hua'))}</Text>
            {summary && (summary.newCategories.length > 0 || summary.newBrands.length > 0) && (
              <Text size="xs" tone="muted">
                {summary.newCategories.length > 0 ? `${t('Nayi categories banengi:')} ${summary.newCategories.slice(0, 8).join(', ')}. ` : ''}
                {summary.newBrands.length > 0 ? `${t('Naye brands:')} ${summary.newBrands.slice(0, 8).join(', ')}.` : ''}
              </Text>
            )}
            <ChipGroup value={view} onChange={setView} style={{ marginHorizontal: -th.space(4) }} options={[
              { value: 'all', label: t('Sab'), count: counts.all },
              ...(counts.error ? [{ value: 'error' as const, label: t('Ghalti'), count: counts.error }] : []),
              ...(counts.new ? [{ value: 'new' as const, label: t('Naye'), count: counts.new }] : []),
              ...(counts.update ? [{ value: 'update' as const, label: mode === 'create' ? t('Update') : t('Badlegi'), count: counts.update }] : []),
              ...(counts.skip ? [{ value: 'skip' as const, label: mode === 'create' ? t('Chhor diye') : t('Wesi hi'), count: counts.skip }] : []),
            ]} />
            <Row gap={2} wrap>
              <Button size="sm" variant="secondary" icon={Plus} onPress={() => { const id = Math.max(0, ...rows.map((r) => r.id)) + 1; const r = { id, cells: {} }; setRows((l) => [...l, r]); setEditing(r); }}>{t('Line jodein')}</Button>
              {counts.error > 0 && <Button size="sm" variant="secondary" icon={Download} onPress={problems}>{t('Download')}</Button>}
              {!blank && sheet?.headers.length ? <Button size="sm" variant="ghost" onPress={() => setStep('map')}>{t('Columns')}</Button> : null}
            </Row>
            {!visible.length ? <EmptyState compact icon={Table2} title={view === 'all' ? t('Koi line nahi — "Line jodein" ya Excel se paste karein') : t('Is filter me koi line nahi')} /> : visible.slice(0, 300).map((r) => {
              const c = checkById.get(r.id);
              const mark = c ? markOf(c, mode, cost) : null;
              return (
                <ListRow key={r.id} dense title={r.cells.name || r.cells.sku || r.cells.barcode || t('naam likhein')}
                  subtitle={[fields.filter((f) => f !== 'name').slice(0, 4).map((f) => r.cells[f]).filter(Boolean).join(' · '), mark?.messages[0]].filter(Boolean).join('\n')}
                  trailing={mark ? <Badge tone={mark.tone}>{mark.label}</Badge> : <Text size="xs" tone="muted">#{r.id}</Text>}
                  onPress={() => setEditing(r)} />
              );
            })}
            {visible.length > 300 && <Text size="xs" tone="muted">{t('aur {{value}}…', { value: visible.length - 300 })}</Text>}
          </>
        )}

        {step === 'run' && run && <RunView run={run} mode={mode} onPause={() => { pauseRef.current = true; }} onResume={() => void runFrom(run)} onFix={fixFailed}
          onNew={() => reset()} onEdit={run.jobId ? () => router.push(`/products/bulk-edit?jobId=${run.jobId}` as never) : undefined} />}
      </View>

      <Sheet open={pasting} onClose={() => setPasting(false)} title={t('Cells paste karein')} description={t('Excel ya Google Sheets me pehli line (column ke naam) samet cells copy kar ke yahan paste karein')}
        footer={<Row gap={2}>
          <Button variant="secondary" style={{ flex: 1 }} onPress={() => setPasting(false)}>{t('Wapas')}</Button>
          <Button style={{ flex: 1 }} disabled={!pasteText.trim()} onPress={() => { setPasting(false); loadSheet(readPasted(pasteText)); setPasteText(''); }}>{t('Aage')}</Button>
        </Row>}>
        <TextArea value={pasteText} onChangeText={setPasteText} placeholder={'Name\tPrice\tStock\nSurf Excel 1kg\t650\t20'} hint={t('Tab se alag cells (Excel copy) ya comma se alag lines dono chalti hain')} ltr />
      </Sheet>
      {editing && (
        <RowSheet row={editing} fields={fields} mode={mode} check={checkById.get(editing.id)} onClose={() => setEditing(null)}
          onAddField={(f) => setFields((x) => (x.includes(f) ? x : [...x, f]))}
          onSave={(cells) => { setRows((l) => l.map((r) => (r.id === editing.id ? { ...r, cells } : r))); setEditing(null); }}
          onDelete={() => { setRows((l) => l.filter((r) => r.id !== editing.id)); setEditing(null); }} />
      )}
    </Screen>
  );
}

function RowSheet({ row, fields, mode, check, onClose, onSave, onDelete, onAddField }: {
  row: GridRow; fields: ImportField[]; mode: ImportMode; check?: RowCheck<string>; onClose: () => void; onSave: (cells: GridRow['cells']) => void; onDelete: () => void; onAddField: (f: ImportField) => void;
}) {
  const th = useTheme();
  const [cells, setCells] = useState(row.cells);
  const more = (mode === 'create' ? CREATE_FIELDS : PRICE_FIELDS).filter((f) => !fields.includes(f));
  return (
    <Sheet open onClose={onClose} title={cells.name || t('Line {{n}}', { n: row.id })}
      footer={<Row gap={2}>
        <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" size="lg" onPress={onDelete} />
        <Button style={{ flex: 1 }} onPress={() => onSave(cells)}>{t('Save')}</Button>
      </Row>}>
      <View style={{ gap: th.space(3) }}>
        {check && [...check.errors, ...check.warnings].map((m) => <Text key={m} size="sm" tone={check.status === 'error' ? 'danger' : 'warning'}>{m}</Text>)}
        {fields.map((f) => (
          <Input key={f} label={t(FIELDS[f].label)} hint={t(FIELDS[f].hint)} value={cells[f] ?? ''} error={check?.fieldErrors?.[f]}
            ltr={['sku', 'barcode', 'packBarcode', 'imei', 'price', 'costPrice', 'wholesalePrice', 'creditPrice', 'stock', 'packQty', 'packPrice', 'lowStockAlert', 'taxRate'].includes(f)}
            keyboardType={['price', 'costPrice', 'wholesalePrice', 'creditPrice', 'stock', 'packQty', 'packPrice', 'lowStockAlert', 'taxRate'].includes(f) ? 'decimal-pad' : 'default'}
            onChangeText={(v) => setCells((c) => ({ ...c, [f]: v }))} />
        ))}
        {more.length > 0 && <Select label={t('+ Column jodein')} value="" onChange={(v) => { if (v) onAddField(v as ImportField); }} options={more.map((f) => ({ value: f, label: t(FIELDS[f].label) }))} />}
      </View>
    </Sheet>
  );
}

function RunView({ run, mode, onPause, onResume, onFix, onNew, onEdit }: { run: RunState; mode: ImportMode; onPause: () => void; onResume: () => void; onFix: () => void; onNew: () => void; onEdit?: () => void }) {
  const th = useTheme();
  const total = run.chunks.reduce((s, c) => s + c.length, 0);
  const done = run.chunks.slice(0, run.next).reduce((s, c) => s + c.length, 0);
  const res = run.results;
  const created = res.filter((r) => r.status === 'new').length;
  const updated = res.filter((r) => r.status === 'update' || r.status === 'change').length;
  const skip = res.filter((r) => r.status === 'skip' || r.status === 'same').length;
  const bad = res.filter((r) => r.status === 'error');
  const stockUp = res.reduce((s, r) => s + Math.max(0, r.stockQty ?? 0), 0);
  return (
    <View style={{ gap: th.space(3) }}>
      <Card>
        <Text weight="bold">{run.finished ? t('Import mukammal') : run.running ? t('Import chal raha hai…') : run.error ? t('Import ruk gaya') : t('Import roka hua hai')}</Text>
        <Text size="xs" tone="muted">{t('{{done}} / {{total}} lines · hissa {{value}} / {{count}}{{value2}}', { done, total, value: Math.min(run.next + (run.running ? 1 : 0), run.chunks.length), count: run.chunks.length, value2: '' })}</Text>
        <View style={{ marginTop: 8 }}><ProgressBar value={total ? done / total : 0} /></View>
        {run.error && <Text size="sm" tone="danger" style={{ marginTop: 8 }}>{t('{{error}}. Jo lines ho chuki hain wo save hain — "Baqi chalayein" dabayein, pehle se bani lines dobara nahi banengi.', { error: run.error })}</Text>}
        {run.running && <Text size="xs" tone="muted" style={{ marginTop: 8 }}>{t('Ye page band na karein jab tak import mukammal na ho.')}</Text>}
        <Row gap={2} wrap style={{ marginTop: 10 }}>
          {run.running && <Button variant="secondary" icon={Pause} onPress={onPause}>{t('Rokein')}</Button>}
          {!run.running && !run.finished && <Button icon={Play} onPress={onResume}>{t('Baqi chalayein')}</Button>}
          {run.finished && onEdit && created + updated > 0 && <Button variant="secondary" onPress={onEdit}>{t('Imported products ko edit karein')}</Button>}
          {run.finished && <Button variant="secondary" onPress={() => router.push('/products' as never)}>{t('Products dekhein')}</Button>}
          {run.finished && <Button icon={Upload} onPress={onNew}>{t('Naya import')}</Button>}
        </Row>
      </Card>
      <Row gap={2} wrap>
        {mode === 'create' ? (
          <>
            <StatTile style={{ flex: 1, minWidth: 140 }} tone="success" label={t('Ban gaye')} value={<Text size="xl" weight="bold">{created}</Text>} />
            <StatTile style={{ flex: 1, minWidth: 140 }} tone="info" label={t('Update hue')} value={<Text size="xl" weight="bold">{updated}</Text>} />
            <StatTile style={{ flex: 1, minWidth: 140 }} label={t('Stock aaya')} value={<Text size="xl" weight="bold" ltr>{`+${qty(stockUp)}`}</Text>} />
            <StatTile style={{ flex: 1, minWidth: 140 }} tone="danger" label={t('Nahi hue')} value={<Text size="xl" weight="bold">{bad.length}</Text>} hint={skip ? `${t('Chhor diye')}: ${skip}` : undefined} />
          </>
        ) : (
          <>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="info" label={t('Price badli')} value={<Text size="xl" weight="bold">{updated}</Text>} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Wesi hi')} value={<Text size="xl" weight="bold">{skip}</Text>} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="danger" label={t('Nahi badli')} value={<Text size="xl" weight="bold">{bad.length}</Text>} />
          </>
        )}
      </Row>
      {run.finished && bad.length > 0 && (
        <Card tone="danger" title={t('{{count}} lines nahi huin', { count: bad.length })} action={<Button size="sm" icon={Table2} onPress={onFix}>{t('Grid me theek karein')}</Button>}>
          {bad.slice(0, 10).map((r) => <Text key={r.row} size="xs">{`#${r.row} ${r.name}: ${r.errors.join(' · ')}`}</Text>)}
        </Card>
      )}
    </View>
  );
}

const JOB_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  COMPLETED: { label: msg('Mukammal'), tone: 'success' }, PARTIAL: { label: msg('Kuch lines reh gayin'), tone: 'warning' }, FAILED: { label: msg('Fail'), tone: 'danger' },
  PROCESSING: { label: msg('Chal raha hai'), tone: 'info' }, PENDING: { label: msg('Intezar'), tone: 'neutral' },
};

function JobsCard({ jobs, costHidden, onFix, onEdit }: { jobs: ImportJob[]; costHidden: boolean; onFix: (id: string) => void; onEdit: (id: string) => void }) {
  const [all, setAll] = useState(false);
  if (!jobs.length) return null;
  const download = async (j: ImportJob) => {
    try {
      const d = await importApi.job(j.id);
      if (j.jobType === 'PRICE_UPDATE' && d.changes.length) await downloadJobChanges(j.fileName, d.changes, !costHidden);
      else if (d.errors.length) await downloadJobErrors(j.fileName, d.errors);
      else toast.info(t('Is import me download ke liye kuch nahi'));
    } catch { toast.error(t('Download nahi hua')); }
  };
  return (
    <Card title={t('Import history')} description={t('"Edit" se us import ke products grid me khulte hain · "Theek karein" se ghalti wali lines dobara')} flush>
      {(all ? jobs : jobs.slice(0, 5)).map((j) => {
        const st = JOB_STATUS[j.status] ?? JOB_STATUS.PENDING;
        return (
          <View key={j.id}>
            <ListRow icon={History} dense title={`${j.jobType === 'PRICE_UPDATE' ? t('Price update') : t('Products + stock')} · ${j.fileName}`}
              subtitle={t('{{createdAt}} · {{totalRows}} lines{{value}}', { createdAt: formatDateTime(j.createdAt), totalRows: j.totalRows, value: j.userName ? ` · ${j.userName}` : '' })
                + (j.errorCount ? ` · ${j.errorCount} ${t('ghalti')}` : '')}
              trailing={<Badge tone={st.tone}>{t(st.label)}</Badge>} />
            <Row gap={1} wrap style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
              {j.jobType === 'PRODUCTS' && (j.created ?? 0) + (j.updated ?? 0) > 0 && <Button size="sm" variant="ghost" onPress={() => onEdit(j.id)}>{t('Edit')}</Button>}
              {(j.failedSaved ?? 0) > 0 && <Button size="sm" variant="ghost" icon={AlertTriangle} onPress={() => onFix(j.id)}>{t('Theek karein ({{failedSaved}})', { failedSaved: j.failedSaved })}</Button>}
              <Button size="sm" variant="ghost" icon={Download} onPress={() => void download(j)}>{t('Download')}</Button>
            </Row>
          </View>
        );
      })}
      {jobs.length > 5 && <Button variant="ghost" onPress={() => setAll((v) => !v)}>{all ? t('Kam dikhayein') : t('Sab {{count}} dikhayein', { count: jobs.length })}</Button>}
    </Card>
  );
}

