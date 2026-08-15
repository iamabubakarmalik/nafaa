import { useState, useRef, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, FileSpreadsheet, Download, CheckCircle2, XCircle,
  AlertTriangle, Clock, Sparkles, X, RefreshCw,
  Eye, Wand2, Zap, ArrowRight, Info, Barcode as BarcodeIcon,
  Copy, Trash2, GraduationCap, FileUp, MousePointerClick,
} from 'lucide-react';
import { bulkImportApi, type BulkImportJob, type BulkImportRow } from '../api/bulk-import.api';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════
   NAFAA BULK IMPORT — FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🎓 Teacher modal — "Bulk import kaise karte hain"
   🧭 4-step guide — Template → File Daalo → Check Karo → Import
   🖱️ Drag & drop file zone (drag-over highlight)
   📋 CSV + Excel (.xlsx lazy-load) + Google Sheets paste (TSV)
   🧠 Auto column detect (English + Roman Urdu aliases)
   ⚡ Auto-barcode generate + duplicate SKU/barcode warnings
   ✏️  Inline row editing + row delete before import
   🌙 Dark mode perfect, 📱→4K responsive
   ═════════════════════════════════════════════════════════════ */

// Column aliases (English + Urdu Roman)
const COLUMN_ALIASES: Record<string, string[]> = {
  name: ['name', 'product', 'product name', 'item', 'item name', 'title', 'naam', 'product naam'],
  sku: ['sku', 'code', 'product code', 'item code', 'ref'],
  barcode: ['barcode', 'ean', 'upc', 'bar code', 'bar_code', 'code128'],
  category: ['category', 'cat', 'department', 'section', 'group'],
  brand: ['brand', 'company', 'manufacturer', 'brand name', 'maker'],
  unit: ['unit', 'uom', 'measure', 'per', 'unit of measure'],
  price: ['price', 'sale price', 'saleprice', 'sale_price', 'selling price', 'sell price', 'mrp', 'rate', 'sale rate', 'retail'],
  costPrice: ['cost', 'cost price', 'costprice', 'cost_price', 'purchase', 'purchase price', 'buy price', 'buyprice', 'wholesale cost', 'purchase rate', 'kharid'],
  wholesalePrice: ['wholesale', 'wholesale price', 'wholesaleprice', 'wholesale_price', 'b2b', 'trade price'],
  mrpPrice: ['mrp price', 'mrpprice', 'mrp_price', 'printed price', 'max price'],
  stock: ['stock', 'qty', 'quantity', 'in stock', 'available', 'inventory', 'on hand', 'current stock'],
  lowStockAlert: ['low stock', 'lowstock', 'low_stock', 'reorder', 'reorder point', 'alert', 'min stock', 'minimum'],
  taxRate: ['tax', 'tax rate', 'taxrate', 'tax_rate', 'gst', 'vat'],
};

const UNIT_ALIASES: Record<string, string> = {
  'piece': 'pcs', 'pc': 'pcs', 'pieces': 'pcs', 'pieces (each)': 'pcs', 'each': 'pcs',
  'kilo': 'kg', 'kilos': 'kg', 'kgs': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',
  'gram': 'gram', 'grams': 'gram', 'gm': 'gram', 'gms': 'gram', 'g': 'gram',
  'liter': 'liter', 'litre': 'liter', 'liters': 'liter', 'litres': 'liter', 'l': 'liter',
  'milliliter': 'ml', 'millilitre': 'ml', 'ml': 'ml',
  'packet': 'packet', 'pack': 'packet', 'packets': 'packet',
  'bottle': 'bottle', 'btl': 'bottle', 'bottles': 'bottle',
  'dozen': 'dozen', 'dz': 'dozen',
  'box': 'box', 'boxes': 'box',
  'carton': 'carton', 'ctn': 'carton',
  'bag': 'bag', 'bags': 'bag',
  'meter': 'meter', 'metre': 'meter', 'm': 'meter',
};

export default function BulkImportPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<BulkImportRow[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [selectedJob, setSelectedJob] = useState<BulkImportJob | null>(null);
  const [autoBarcodes, setAutoBarcodes] = useState(true);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showTeacher, setShowTeacher] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { data: jobs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bulk-import-jobs'],
    queryFn: () => bulkImportApi.listJobs(),
    refetchInterval: (data: any) => {
      const arr = Array.isArray(data) ? data : data?.state?.data ?? [];
      return arr.some((j: BulkImportJob) => j.status === 'PROCESSING' || j.status === 'PENDING') ? 3000 : false;
    },
  });

  const importMutation = useMutation({
    mutationFn: (rows: BulkImportRow[]) =>
      bulkImportApi.importProducts({
        jobType: 'PRODUCTS' as any,
        fileName,
        rows,
      }),
    onSuccess: (job: BulkImportJob) => {
      toast.success(`Import complete: ${job.successCount} add, ${job.errorCount} fail`);
      setPreview(null);
      setFileName('');
      setRawHeaders([]);
      setColumnMap({});
      queryClient.invalidateQueries({ queryKey: ['bulk-import-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['retail-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Import fail hua'),
  });

  /* ─── Column auto-detect ─── */
  const detectColumnMapping = (headers: string[]): Record<string, string> => {
    const map: Record<string, string> = {};
    const normalized = headers.map((h) => h.trim().toLowerCase());

    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      const idx = normalized.findIndex((h) => aliases.some((a) => h === a || h.replace(/[_\-\s]/g, '') === a.replace(/[_\-\s]/g, '')));
      if (idx >= 0) map[headers[idx]] = field;
    }
    return map;
  };

  /* ─── Row builder from mapping ─── */
  const buildRow = (rawRow: Record<string, string>, map: Record<string, string>): BulkImportRow | null => {
    const get = (field: string): string => {
      const header = Object.entries(map).find(([, f]) => f === field)?.[0];
      return header ? (rawRow[header] || '').trim() : '';
    };

    const name = get('name');
    if (!name) return null;

    const rawUnit = get('unit').toLowerCase();
    const unit = UNIT_ALIASES[rawUnit] || rawUnit || 'pcs';

    const num = (v: string) => {
      if (!v) return undefined;
      const cleaned = v.replace(/[^\d.-]/g, '');
      const n = Number(cleaned);
      return isNaN(n) ? undefined : n;
    };

    return {
      name,
      sku: get('sku') || undefined,
      barcode: get('barcode') || undefined,
      category: get('category') || undefined,
      brand: get('brand') || undefined,
      unit,
      price: num(get('price')) ?? 0,
      costPrice: num(get('costPrice')) ?? 0,
      wholesalePrice: num(get('wholesalePrice')),
      stock: num(get('stock')) ?? 0,
      lowStockAlert: num(get('lowStockAlert')) ?? 5,
    };
  };

  /* ─── Parse CSV/TSV text ─── */
  const parseText = (text: string, delimiter: string): { headers: string[]; rows: Record<string, string>[] } => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };

    const parseLine = (line: string): string[] => {
      const out: string[] = [];
      let cur = '';
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = !inQ;
        } else if (ch === delimiter && !inQ) {
          out.push(cur.trim()); cur = '';
        } else cur += ch;
      }
      out.push(cur.trim());
      return out;
    };

    const headers = parseLine(lines[0]);
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
      rows.push(row);
    }
    return { headers, rows };
  };

  const applyParse = (headers: string[], rawRows: Record<string, string>[], name: string) => {
    const map = detectColumnMapping(headers);
    const built: BulkImportRow[] = [];
    for (const raw of rawRows) {
      const row = buildRow(raw, map);
      if (row) built.push(row);
    }
    if (built.length === 0) {
      toast.error('Koi valid row nahi mili — column headers check karo (name column zaroori hai)');
      return;
    }
    setFileName(name);
    setRawHeaders(headers);
    setColumnMap(map);
    setPreview(built);
    toast.success(`${built.length} rows detected — column mapping check karo`);
  };

  const parseCSV = async (file: File) => {
    const text = await file.text();
    const { headers, rows } = parseText(text, ',');
    applyParse(headers, rows, file.name);
  };

  const parseExcel = async (file: File) => {
    try {
      const XLSX = await import('xlsx').catch(() => null);
      if (!XLSX) {
        toast.error('Excel support nahi hai — CSV export karo Excel se');
        return;
      }
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const csv = XLSX.utils.sheet_to_csv(ws);
      const { headers, rows } = parseText(csv, ',');
      applyParse(headers, rows, file.name);
    } catch (e: any) {
      toast.error('Excel read nahi hui — CSV try karo');
    }
  };

  const handleFile = (file: File) => {
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext === 'csv' || file.type === 'text/csv') return parseCSV(file);
    if (ext === 'xlsx' || ext === 'xls') return parseExcel(file);
    toast.error('CSV ya Excel file chahiye');
  };

  const parsePaste = () => {
    if (!pasteText.trim()) return toast.error('Kuch paste karo');
    const delimiter = pasteText.includes('\t') ? '\t' : ',';
    const { headers, rows } = parseText(pasteText, delimiter);
    if (headers.length === 0) return toast.error('Data parse nahi hua');
    applyParse(headers, rows, 'Pasted data');
    setPasteMode(false);
    setPasteText('');
  };

  const downloadTemplate = () => {
    const headers = ['name', 'sku', 'barcode', 'category', 'brand', 'unit', 'price', 'costPrice', 'wholesalePrice', 'stock', 'lowStockAlert'];
    const sample = [
      ['Colgate Toothpaste 100g', 'COLG-100', '8901234567890', 'Personal Care', 'Colgate', 'piece', '150', '120', '135', '50', '10'],
      ['Lipton Tea 250g', 'LIPT-250', '8901234567891', 'Beverages', 'Lipton', 'piece', '450', '380', '420', '30', '5'],
      ['Milk Pak 1L', 'MP-1L', '', 'Dairy', 'Milkpak', 'liter', '270', '240', '', '25', '5'],
      ['Sugar 1kg', 'SGR-1KG', '', 'Grocery', '', 'kg', '180', '160', '170', '100', '20'],
      ['Rice Basmati 5kg', 'RICE-5', '', 'Grocery', 'Falak', 'bag', '2500', '2200', '2400', '15', '3'],
      ['Cooking Oil 1L', 'OIL-1L', '', 'Grocery', 'Habib', 'liter', '620', '560', '600', '40', '8'],
      ['Nestle Water 1.5L', 'WTR-15', '8901234567892', 'Beverages', 'Nestle', 'bottle', '80', '65', '75', '60', '12'],
      ['Egg Tray (30)', 'EGG-30', '', 'Dairy', '', 'packet', '480', '420', '460', '20', '4'],
      ['Vermicelli 400g', 'VRM-400', '', 'Grocery', 'National', 'packet', '160', '130', '150', '40', '8'],
      ['Tapal Danedar 190g', 'TPL-190', '8901234567893', 'Beverages', 'Tapal', 'packet', '320', '280', '310', '35', '7'],
    ];
    const csv = [headers.join(','), ...sample.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template download ho gaya');
  };

  const enrichWithAutoBarcodes = (rows: BulkImportRow[]): BulkImportRow[] => {
    let counter = Date.now() % 100000;
    return rows.map((r) => {
      if (r.barcode) return r;
      const seed = String(counter++).padStart(6, '0');
      const prefix = '299'; // internal use prefix
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return { ...r, barcode: `${prefix}${seed}${random}`.slice(0, 13) };
    });
  };

  /* ─── Validation stats ─── */
  const stats = useMemo(() => {
    if (!preview) return null;
    const noName = preview.filter((r) => !r.name?.trim()).length;
    const noPrice = preview.filter((r) => !r.price || r.price <= 0).length;
    const noBarcode = preview.filter((r) => !r.barcode).length;
    const noSku = preview.filter((r) => !r.sku).length;
    const skuDupes: Record<string, number> = {};
    const barcodeDupes: Record<string, number> = {};
    preview.forEach((r) => {
      if (r.sku) skuDupes[r.sku] = (skuDupes[r.sku] || 0) + 1;
      if (r.barcode) barcodeDupes[r.barcode] = (barcodeDupes[r.barcode] || 0) + 1;
    });
    const skuDupeCount = Object.values(skuDupes).filter((c) => c > 1).length;
    const barcodeDupeCount = Object.values(barcodeDupes).filter((c) => c > 1).length;

    return { noName, noPrice, noBarcode, noSku, skuDupeCount, barcodeDupeCount };
  }, [preview]);

  /* ─── 4-step guide progress ─── */
  const setupStep = jobs.length === 0 && !preview ? 1
    : preview ? 3
    : jobs.length > 0 ? 4
    : 2;

  const updateRow = (index: number, patch: Partial<BulkImportRow>) => {
    if (!preview) return;
    setPreview(preview.map((r, i) => i === index ? { ...r, ...patch } : r));
  };

  const removeRow = (index: number) => {
    if (!preview) return;
    setPreview(preview.filter((_, i) => i !== index));
  };

  const startImport = () => {
    if (!preview) return;
    let rows = preview.filter((r) => r.name?.trim() && r.price && r.price > 0);
    if (rows.length === 0) return toast.error('Koi valid row nahi hai (name aur price required)');
    if (autoBarcodes) rows = enrichWithAutoBarcodes(rows);
    importMutation.mutate(rows);
  };

  /* ─── Escape key ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showTeacher) setShowTeacher(false);
      else if (selectedJob) setSelectedJob(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, selectedJob]);

  /* ─── Drag & drop handlers ─── */
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-8">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 dark:from-slate-950 dark:via-blue-950 dark:to-cyan-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Bulk Import
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
              📊 Bulk Product Import
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              Excel, CSV, ya Google Sheet — ek saath hazaron products daalo
              {jobs.length > 0 && (
                <>
                  <span className="opacity-50 mx-1.5">•</span>
                  <strong className="text-cyan-200">{jobs.length}</strong> imports ho chuke
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
              title="Kaise kaam karta hai?"
            >
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Kaise Kaam Karta Hai?</span>
              <span className="sm:hidden">?</span>
            </button>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold shadow-2xl" onClick={downloadTemplate}>
              <Download className="h-4 w-4" /> Template
            </Button>
          </div>
        </div>

        {/* 4-step guide */}
        <div className="relative mt-4 flex items-center gap-2 sm:gap-3 flex-wrap">
          <StepPill n={1} label="Template Lo" state={setupStep > 1 ? 'done' : setupStep === 1 ? 'active' : 'todo'} />
          <ArrowRight className="h-4 w-4 text-white/40 shrink-0" />
          <StepPill n={2} label="File Daalo" state={setupStep > 2 ? 'done' : setupStep === 2 ? 'active' : 'todo'} />
          <ArrowRight className="h-4 w-4 text-white/40 shrink-0" />
          <StepPill n={3} label="Check Karo" state={setupStep > 3 ? 'done' : setupStep === 3 ? 'active' : 'todo'} />
          <ArrowRight className="h-4 w-4 text-white/40 shrink-0" />
          <StepPill n={4} label="Import!" state={setupStep === 4 ? 'done' : 'todo'} />
        </div>
      </section>

      {/* ═══ TEACHER MODAL ═══ */}
      {showTeacher && (
        <BulkImportTeacher
          hasJobs={jobs.length > 0}
          onClose={() => setShowTeacher(false)}
          onDownloadTemplate={() => { downloadTemplate(); }}
        />
      )}

      {/* ═══ UPLOAD ZONE ═══ */}
      {!preview && (
        <section
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={[
            'rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-dashed shadow-sm p-6 sm:p-8 space-y-4 transition',
            dragOver
              ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-500/10 scale-[1.01]'
              : 'border-blue-300 dark:border-blue-500/40',
          ].join(' ')}
        >
          <div className="text-center">
            <div className={[
              'h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-blue-500/40 transition-transform',
              dragOver ? 'scale-110' : '',
            ].join(' ')}>
              {dragOver ? <FileUp className="h-10 w-10" /> : <Upload className="h-10 w-10" />}
            </div>
            <h3 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">
              {dragOver ? '👇 Yahan Chhor Do!' : 'File Upload Karo'}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-semibold">
              CSV, Excel (.xlsx) <strong className="text-blue-700 dark:text-blue-300">drag & drop</strong> karo, ya Google Sheet se copy-paste
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = '';
              }}
            />

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 font-extrabold shadow-lg shadow-blue-500/40"
                size="lg"
              >
                <FileSpreadsheet className="h-4 w-4" /> CSV / Excel Choose
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setPasteMode(true)}>
                <Copy className="h-4 w-4" /> Google Sheet Paste
              </Button>
              <Button variant="secondary" size="lg" onClick={downloadTemplate}>
                <Download className="h-4 w-4" /> Template
              </Button>
            </div>
          </div>

          {pasteMode && (
            <div className="rounded-2xl border-2 border-blue-300 dark:border-blue-500/40 bg-blue-50/50 dark:bg-blue-500/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-blue-900 dark:text-blue-200">Google Sheet ya Excel se Paste Karo</h4>
                  <p className="text-xs text-blue-800 dark:text-blue-300 font-semibold">Rows select karo (heading ke sath) → Ctrl+C → yahan Ctrl+V</p>
                </div>
                <button onClick={() => { setPasteMode(false); setPasteText(''); }} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
                  <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </button>
              </div>
              <textarea
                autoFocus
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="name	sku	price	stock&#10;Milk 1L	MLK-1L	270	50&#10;Sugar 1kg	SGR	180	100"
                rows={8}
                className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 transition"
              />
              <Button
                onClick={parsePaste}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 font-extrabold"
                disabled={!pasteText.trim()}
              >
                <Wand2 className="h-4 w-4" /> Parse Karo
              </Button>
            </div>
          )}

          <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-4 max-w-3xl mx-auto">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-700 dark:text-blue-300 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-extrabold text-blue-900 dark:text-blue-200 mb-1">📋 CSV Column Names — Smart Detection</div>
                <p className="text-xs text-blue-800 dark:text-blue-300 font-semibold leading-relaxed">
                  Hum column headers automatic pehchan lete hain. Aap likh sakte ho:{' '}
                  <strong>name / product / naam</strong>, <strong>price / rate / sale rate</strong>,{' '}
                  <strong>cost / kharid / purchase price</strong>, <strong>stock / qty / quantity</strong> —
                  system samajh jayega. English, Urdu Roman, dono kaam karte hain.
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-300 font-semibold mt-1.5">
                  <strong>Sirf 1 column zaroori hai:</strong> <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">name</code>. Aur:{' '}
                  <span className="text-emerald-700 dark:text-emerald-400">✓ Auto-barcode jinke pass nahi</span> •{' '}
                  <span className="text-emerald-700 dark:text-emerald-400">✓ Auto-create categories/brands</span>
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ PREVIEW + EDIT ═══ */}
      {preview && stats && (
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/90 dark:backdrop-blur-sm border-2 border-blue-300 dark:border-blue-500/40 shadow-lg overflow-hidden">
          <div className="px-5 py-3 border-b-2 border-blue-100 dark:border-blue-500/20 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/15 dark:to-cyan-500/15 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-900 dark:text-white truncate">📄 {fileName}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                {preview.length} rows detected • Column mapping aur data check karo
              </p>
            </div>
            <button
              onClick={() => { setPreview(null); setFileName(''); setRawHeaders([]); setColumnMap({}); }}
              className="h-9 w-9 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition"
            >
              <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>

          {/* Validation summary */}
          <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <ValidCell label="Valid" value={preview.length - stats.noName - stats.noPrice} tone="emerald" icon={CheckCircle2} />
            <ValidCell label="Bina Price" value={stats.noPrice} tone="rose" icon={XCircle} />
            <ValidCell label="Bina Barcode" value={stats.noBarcode} tone="amber" icon={BarcodeIcon}
              hint={autoBarcodes ? 'Auto banega' : undefined} />
            <ValidCell label="Duplicate SKU" value={stats.skuDupeCount + stats.barcodeDupeCount} tone="orange" icon={AlertTriangle} />
          </div>

          {/* Auto-barcode toggle */}
          {stats.noBarcode > 0 && (
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-500/10">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBarcodes}
                  onChange={(e) => setAutoBarcodes(e.target.checked)}
                  className="h-5 w-5 rounded accent-amber-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                    <Zap className="h-4 w-4" />
                    {stats.noBarcode} products ka barcode nahi hai — auto-generate karo
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                    Har product ko unique 13-digit code milega (299-prefix, internal use)
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Column mapping */}
          {rawHeaders.length > 0 && (
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-300 mb-2">
                🔗 Column Mapping (auto-detected)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {rawHeaders.map((h) => {
                  const field = columnMap[h];
                  return (
                    <div
                      key={h}
                      className={[
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 text-[11px] font-extrabold',
                        field
                          ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                      ].join(' ')}
                    >
                      <span className="font-mono">{h}</span>
                      {field ? (
                        <>
                          <ArrowRight className="h-3 w-3" />
                          <span>{field}</span>
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        </>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">— ignored</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Editable table */}
          <div className="max-h-[400px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10">
                <tr>
                  <Th>#</Th><Th>Name *</Th><Th>SKU</Th><Th>Barcode</Th><Th>Cat</Th>
                  <Th>Brand</Th><Th>Unit</Th><Th className="text-right">Cost</Th>
                  <Th className="text-right">Sale *</Th><Th className="text-right">Stock</Th><Th></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {preview.slice(0, 200).map((row, i) => {
                  const hasError = !row.name?.trim() || !row.price || row.price <= 0;
                  return (
                    <tr key={i} className={`hover:bg-blue-50/40 dark:hover:bg-blue-500/5 ${hasError ? 'bg-rose-50/40 dark:bg-rose-500/10' : ''}`}>
                      <td className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400 font-mono">{i + 1}</td>
                      <TdInput value={row.name} onChange={(v: string) => updateRow(i, { name: v })} required error={!row.name?.trim()} />
                      <TdInput value={row.sku || ''} onChange={(v: string) => updateRow(i, { sku: v })} mono />
                      <TdInput value={row.barcode || ''} onChange={(v: string) => updateRow(i, { barcode: v })} mono placeholder={autoBarcodes ? 'auto' : ''} />
                      <TdInput value={row.category || ''} onChange={(v: string) => updateRow(i, { category: v })} />
                      <TdInput value={row.brand || ''} onChange={(v: string) => updateRow(i, { brand: v })} />
                      <TdInput value={row.unit || 'pcs'} onChange={(v: string) => updateRow(i, { unit: v })} />
                      <TdNumber value={row.costPrice} onChange={(v: number | undefined) => updateRow(i, { costPrice: v })} />
                      <TdNumber value={row.price} onChange={(v: number | undefined) => updateRow(i, { price: v })} error={!row.price || row.price <= 0} tone="emerald" />
                      <TdNumber value={row.stock} onChange={(v: number | undefined) => updateRow(i, { stock: v })} />
                      <td className="px-2 py-1">
                        <button
                          onClick={() => removeRow(i)}
                          className="h-7 w-7 rounded-md bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center transition"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {preview.length > 200 && (
                  <tr>
                    <td colSpan={11} className="px-3 py-2 text-xs text-center font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60">
                      +{preview.length - 200} rows aur bhi... (import mein sab ayenge)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
              <strong className="text-emerald-700 dark:text-emerald-400 tabular-nums">{preview.length}</strong> rows tayyar
              {stats.noName > 0 && <span className="text-rose-700 dark:text-rose-400 ml-2">• {stats.noName} bina naam skip honge</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => { setPreview(null); setFileName(''); setRawHeaders([]); setColumnMap({}); }}>
                Cancel
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 font-extrabold shadow-lg shadow-blue-500/40"
                onClick={startImport}
                loading={importMutation.isPending}
              >
                <Upload className="h-4 w-4" />
                Import {preview.filter((r) => r.name?.trim() && r.price && r.price > 0).length} Products
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ═══ HISTORY ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <h3 className="font-extrabold text-slate-900 dark:text-white">📜 Import History</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Purani import jobs ka record</p>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="h-14 w-14 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="font-extrabold text-slate-700 dark:text-slate-200">Abhi tak koi import nahi</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">Pehla CSV upload karo</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {jobs.map((job) => <JobRow key={job.id} job={job} onView={() => setSelectedJob(job)} />)}
          </div>
        )}
      </section>

      {selectedJob && <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   BULK IMPORT TEACHER — "Bulk import kaise karte hain"
   ═════════════════════════════════════════════════════════════ */
function BulkImportTeacher({ hasJobs, onClose, onDownloadTemplate }: {
  hasJobs: boolean;
  onClose: () => void;
  onDownloadTemplate: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-blue-200 dark:border-blue-500/30 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/15 dark:to-cyan-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Bulk Import Kaise Karte Hain?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            100-500 products <strong>ek-ek karke daalne mein ghanton</strong> lagte hain.
            Bulk Import se aap <strong>Excel file se sab kuch 1 minute mein</strong> daal sakte ho.
            Purani dukan ka data ho ya supplier ki list — sab chalega.
          </p>

          {/* Live misal */}
          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-blue-700 dark:text-blue-300">
              📊 Misal: Supplier ki Rate List
            </div>
            <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 p-2 font-mono text-[10px] leading-relaxed">
                naam, kharid, rate, qty<br />
                Milk 1L, 240, 270, 50<br />
                Sugar 1kg, 160, 180, 100
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400">→</span>
                <span className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-extrabold">
                  ✅ "kharid"=cost, "rate"=price, "qty"=stock — khud samajh gaya!
                </span>
              </div>
            </div>
          </div>

          {/* 4 steps */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <TeacherStep emoji="📥" title="Template" desc="Sample file download karo" />
            <TeacherStep emoji="📤" title="Upload" desc="File daalo ya paste karo" />
            <TeacherStep emoji="🔍" title="Check" desc="Mapping + errors dekho" />
            <TeacherStep emoji="🚀" title="Import" desc="1 click — sab add!" />
          </div>

          {/* Tips */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Sirf "name" zaroori hai</strong> — baqi sab optional, baad mein bhi edit ho sakta hai</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Roman Urdu chalta hai</strong> — "kharid", "rate", "naam" sab pehchan leta hai</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Barcode nahi hai? <strong>⚡ Auto-generate</strong> ON rakho — har product ko code milega</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Preview mein <strong>galat row delete ya edit</strong> karo import se pehle</span>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 font-extrabold shadow-lg shadow-blue-500/40 h-12"
            onClick={() => { onDownloadTemplate(); onClose(); toast.success('Template download — Excel mein kholo, apne products likho, wapis upload karo'); }}
          >
            <Download className="h-4 w-4" />
            {hasJobs ? 'Samajh Gaya — Template Phir Se Lo!' : 'Samajh Gaya — Template Download Karo!'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TeacherStep({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2.5">
      <div className="text-xl">{emoji}</div>
      <div className="text-[11px] font-extrabold text-slate-900 dark:text-white mt-1">{title}</div>
      <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{desc}</div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   STEP PILL
   ═════════════════════════════════════════════════════════════ */
function StepPill({ n, label, state }: { n: number; label: string; state: 'done' | 'active' | 'todo' }) {
  return (
    <div className={[
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold border backdrop-blur-md transition',
      state === 'done'
        ? 'bg-emerald-400/25 border-emerald-300/50 text-emerald-200'
        : state === 'active'
        ? 'bg-amber-400/90 border-amber-300 text-slate-900 shadow-lg shadow-amber-400/30 animate-pulse'
        : 'bg-white/10 border-white/20 text-white/50',
    ].join(' ')}>
      {state === 'done' ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <span className={[
          'h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-black',
          state === 'active' ? 'bg-slate-900 text-amber-300' : 'bg-white/20 text-white/60',
        ].join(' ')}>
          {n}
        </span>
      )}
      {label}
    </div>
  );
}

/* ══════════ Helpers ══════════ */

function ValidCell({ label, value, tone, icon: Icon, hint }: any) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40',
    rose: 'bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40',
    amber: 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
    orange: 'bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-500/40',
  };
  return (
    <div className={`rounded-lg border-2 p-2 ${tones[tone]}`}>
      <div className="flex items-center gap-1 text-[10px] uppercase font-extrabold">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-lg font-extrabold tabular-nums">{value}</div>
      {hint && <div className="text-[9px] font-bold opacity-80">{hint}</div>}
    </div>
  );
}

function Th({ children, className = '' }: any) {
  return (
    <th className={`px-2 py-2 text-left text-[10px] uppercase font-extrabold text-slate-700 dark:text-slate-300 whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

function TdInput({ value, onChange, mono, required, error, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  required?: boolean;
  error?: boolean;
  placeholder?: string;
}) {
  return (
    <td className="px-1 py-1">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={[
          'w-full h-8 px-2 rounded border text-xs',
          'bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500',
          mono ? 'font-mono' : 'font-bold',
          error ? 'border-rose-400 dark:border-rose-500/60 bg-rose-50 dark:bg-rose-500/10 focus:border-rose-600'
            : required ? 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
              : 'border-slate-100 dark:border-slate-700/60 focus:border-blue-400',
          'focus:outline-none',
        ].join(' ')}
      />
    </td>
  );
}

function TdNumber({ value, onChange, error, tone }: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  error?: boolean;
  tone?: string;
}) {
  const tones: Record<string, string> = {
    emerald: 'border-emerald-200 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 focus:border-emerald-500',
  };
  return (
    <td className="px-1 py-1">
      <input
        type="number"
        step="0.01"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className={[
          'w-full h-8 px-2 rounded border text-xs font-extrabold tabular-nums text-right focus:outline-none',
          'bg-white dark:bg-slate-800 text-slate-900 dark:text-white',
          error ? 'border-rose-400 dark:border-rose-500/60 bg-rose-50 dark:bg-rose-500/10' : tone ? tones[tone] : 'border-slate-100 dark:border-slate-700/60 focus:border-blue-400',
        ].join(' ')}
      />
    </td>
  );
}

function JobRow({ job, onView }: { job: BulkImportJob; onView: () => void }) {
  const cfg: any = {
    PENDING: { label: 'Pending', color: 'bg-slate-500', icon: Clock },
    PROCESSING: { label: 'Processing', color: 'bg-blue-500', icon: RefreshCw },
    COMPLETED: { label: 'Complete', color: 'bg-emerald-500', icon: CheckCircle2 },
    FAILED: { label: 'Failed', color: 'bg-rose-500', icon: XCircle },
    PARTIAL: { label: 'Partial', color: 'bg-amber-500', icon: AlertTriangle },
  };
  const c = cfg[job.status] || cfg.PENDING;
  const Icon = c.icon;

  return (
    <div className="px-6 py-3 hover:bg-blue-50/40 dark:hover:bg-blue-500/5 transition flex items-center gap-4">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-700 text-white flex items-center justify-center shadow shrink-0">
        <FileSpreadsheet className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{job.fileName || 'Untitled'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 text-white ${c.color}`}>
            <Icon className={`h-2.5 w-2.5 ${job.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
            {c.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 font-bold flex-wrap">
          <span>Rows: <strong className="text-slate-700 dark:text-slate-200 tabular-nums">{job.totalRows}</strong></span>
          <span>•</span>
          <span className="text-emerald-700 dark:text-emerald-400">✓ {job.successCount}</span>
          {job.errorCount > 0 && <span className="text-rose-700 dark:text-rose-400">✗ {job.errorCount}</span>}
          {job.skipCount > 0 && <span className="text-amber-700 dark:text-amber-400">⊘ {job.skipCount}</span>}
          <span>•</span>
          <span>{new Date(job.createdAt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>
      </div>
      <button
        onClick={onView}
        className="h-9 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 transition shrink-0"
      >
        <Eye className="h-3.5 w-3.5" /> Dekho
      </button>
    </div>
  );
}

function JobDetailModal({ job, onClose }: { job: BulkImportJob; onClose: () => void }) {
  const errors = Array.isArray(job.errors) ? job.errors : [];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">{job.fileName}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Import job ki tafseel</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="Success" value={job.successCount} tone="emerald" />
            <StatBox label="Errors" value={job.errorCount} tone="rose" />
            <StatBox label="Skip" value={job.skipCount} tone="amber" />
          </div>

          {errors.length > 0 && (
            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mb-2">Errors ({errors.length})</h4>
              <div className="rounded-xl border-2 border-rose-200 dark:border-rose-500/30 divide-y divide-rose-100 dark:divide-rose-500/20 max-h-72 overflow-y-auto">
                {errors.map((err: any, i: number) => (
                  <div key={i} className="p-2.5 flex items-start gap-2 text-xs">
                    <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-700 dark:text-slate-200">
                        Row {err.row}: <span className="font-mono text-slate-900 dark:text-white">{err.name}</span>
                      </div>
                      <div className="text-rose-700 dark:text-rose-400 font-semibold">{err.error}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40',
    rose: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/40',
    amber: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/40',
  };
  return (
    <div className={`rounded-xl border-2 p-3 text-center ${tones[tone]}`}>
      <div className="text-[10px] uppercase tracking-wider font-extrabold opacity-75">{label}</div>
      <div className="text-2xl font-extrabold tabular-nums mt-1">{value}</div>
    </div>
  );
}
