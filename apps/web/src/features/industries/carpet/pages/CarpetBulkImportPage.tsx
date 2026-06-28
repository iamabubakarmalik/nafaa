import { useState, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import {
  Upload, FileSpreadsheet, Download, ArrowLeft, CheckCircle2,
  AlertTriangle, X, Sparkles, Layers, FileWarning, RefreshCw,
  ArrowRight, Trash2, Edit3, MousePointerClick, BarChart3,
  Package, DollarSign, TrendingUp, Eye, FileText, Database,
  Info, Zap, ChevronRight, Activity,
} from 'lucide-react';
import { productsApi } from '@/api/products.api';
import { productVariantsApi } from '@/api/product-variants.api';
import { ManualEntryTable, type ManualRow } from '../components/ManualEntryTable';
import { Button } from '@/components/ui/Button';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { toast } from 'sonner';
import {
  carpetRollsApi,
  type BulkImportPreviewResponse,
  type BulkImportApplyResponse,
} from '../api/carpet-rolls.api';
import { useAuthStore } from '@/store/auth.store';

type ImportStep = 'upload' | 'preview' | 'result';
type InputMode = 'excel' | 'manual';

export default function CarpetBulkImportPage() {
  const navigate = useNavigate();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>('upload');
  const [inputMode, setInputMode] = useState<InputMode>('excel');
  const [manualRows, setManualRows] = useState<ManualRow[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [preview, setPreview] = useState<BulkImportPreviewResponse | null>(null);
  const [result, setResult] = useState<BulkImportApplyResponse | null>(null);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'invalid'>('all');

  const { data: productsData } = useQuery({
    queryKey: ['products-for-bulk-import'],
    queryFn: () => productsApi.list({ limit: 500 }),
  });

  const carpetProducts = useMemo(() => {
    const items = productsData?.items ?? [];
    return items.filter((p: any) =>
      ['sqft', 'sqm', 'sqyd'].includes((p.unit || '').toLowerCase()),
    );
  }, [productsData]);

  const carpetProductIds = useMemo(
    () => carpetProducts.map((p: any) => p.id),
    [carpetProducts],
  );

  const { data: allVariantsData } = useQuery({
    queryKey: ['carpet-products-variants', carpetProductIds],
    queryFn: async () => {
      const results = await Promise.all(
        carpetProductIds.map(async (pid) => {
          try {
            const variants = await productVariantsApi.list(pid);
            return { productId: pid, variants };
          } catch {
            return { productId: pid, variants: [] };
          }
        }),
      );
      const map = new Map<string, any[]>();
      for (const r of results) map.set(r.productId, r.variants);
      return map;
    },
    enabled: carpetProductIds.length > 0,
  });

  const productVariantRows = useMemo(() => {
    const rows: Array<{
      productName: string;
      variantName: string;
      productSku?: string;
      variantSku?: string;
      defaultCost?: number;
      defaultPrice?: number;
    }> = [];

    for (const p of carpetProducts as any[]) {
      const variants = allVariantsData?.get(p.id) ?? [];
      if (variants.length > 0) {
        for (const v of variants) {
          rows.push({
            productName: p.name,
            variantName: v.name,
            productSku: p.sku ?? undefined,
            variantSku: v.sku ?? undefined,
            defaultCost: Number(v.costPrice ?? p.costPrice ?? 0),
            defaultPrice: Number(v.price ?? p.price ?? 0),
          });
        }
      } else {
        rows.push({
          productName: p.name,
          variantName: '',
          productSku: p.sku ?? undefined,
          defaultCost: Number(p.costPrice ?? 0),
          defaultPrice: Number(p.price ?? 0),
        });
      }
    }
    return rows;
  }, [carpetProducts, allVariantsData]);

  // ─── Smart template download ────────────────────────────
  const downloadTemplate = () => {
    if (carpetProducts.length === 0) {
      const wb = XLSX.utils.book_new();
      const sample = [{
        productName: 'Sun Flower', variantName: 'Cream', rollNumber: 'R-001',
        designCode: 'SF-001', widthFt: 12, widthInch: 0, lengthFt: 100, lengthInch: 0,
        costPerSqft: 72, salePricePerSqft: 90, rackNumber: 'Wall-1',
        quality: 'Premium', pile: 'Wool', notes: '',
      }];
      const ws = XLSX.utils.json_to_sheet(sample);
      XLSX.utils.book_append_sheet(wb, ws, 'Carpet Rolls');
      XLSX.writeFile(wb, 'carpet_rolls_template.xlsx');
      toast.success('Blank template downloaded — pehle carpet products add karein for smart template');
      return;
    }

    const wb = XLSX.utils.book_new();
    const mainHeaders = ['productName', 'variantName', 'rollNumber', 'designCode', 'widthFt', 'widthInch', 'lengthFt', 'lengthInch', 'costPerSqft', 'salePricePerSqft', 'rackNumber', 'quality', 'pile', 'notes'];

    const prefilledRows = productVariantRows.map((pv) => ({
      productName: pv.productName,
      variantName: pv.variantName || '',
      rollNumber: '', designCode: '',
      widthFt: '', widthInch: 0, lengthFt: '', lengthInch: 0,
      costPerSqft: pv.defaultCost || '', salePricePerSqft: pv.defaultPrice || '',
      rackNumber: '', quality: '', pile: '', notes: '',
    }));

    for (let i = 0; i < 20; i++) {
      prefilledRows.push({
        productName: '', variantName: '', rollNumber: '', designCode: '',
        widthFt: '', widthInch: 0, lengthFt: '', lengthInch: 0,
        costPerSqft: '', salePricePerSqft: '',
        rackNumber: '', quality: '', pile: '', notes: '',
      } as any);
    }

    const ws = XLSX.utils.json_to_sheet(prefilledRows, { header: mainHeaders });
    ws['!cols'] = [
      { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 30 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Carpet Rolls');

    const productsList = productVariantRows.map((pv, idx) => ({
      '#': idx + 1,
      'Product Name': pv.productName,
      'Variant Name': pv.variantName || '(no variants)',
      'Product SKU': pv.productSku || '',
      'Default Cost/sqft': pv.defaultCost || '',
      'Default Price/sqft': pv.defaultPrice || '',
    }));
    const wsRef = XLSX.utils.json_to_sheet(productsList);
    wsRef['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsRef, 'Products Reference');

    const instructions = [
      ['CARPET ROLLS BULK IMPORT — INSTRUCTIONS'],
      [''],
      ['📋 HOW TO USE'],
      [''],
      ['1.', 'Go to "Carpet Rolls" sheet (first tab)'],
      ['2.', `Your ${productVariantRows.length} product+variant combos already pre-filled`],
      ['3.', 'Fill empty columns: rollNumber (optional), widthFt, lengthFt, etc.'],
      ['4.', 'Save file and drag/drop on import page'],
      [''],
      ['📊 COLUMN GUIDE'],
      [''],
      ['Column', 'Required?', 'Description', 'Example'],
      ['productName', 'YES', 'Exact product name', 'Sun Flower'],
      ['variantName', 'No', 'Variant if product has variants', 'Cream'],
      ['rollNumber', 'No', 'Leave empty for auto-generate', 'R-001'],
      ['designCode', 'No', 'Supplier design code', 'SF-001'],
      ['widthFt', 'YES', 'Roll width (feet)', '12'],
      ['widthInch', 'No', 'Extra inches (0-11)', '6'],
      ['lengthFt', 'YES', 'Length (whole feet)', '29'],
      ['lengthInch', 'No', 'Extra inches (Pakistani: 29.6 = 29ft 6in)', '6'],
      ['costPerSqft', 'No', 'Cost per sqft', '72'],
      ['salePricePerSqft', 'No', 'Sale price per sqft', '90'],
      ['rackNumber', 'No', 'Storage location', 'Wall-1'],
      ['quality', 'No', 'Premium/Standard/Economy', 'Premium'],
      ['pile', 'No', 'Wool/Synthetic/Mixed', 'Wool'],
      ['notes', 'No', 'Additional notes', 'New stock'],
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
    wsInstr['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 40 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');

    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `carpet_rolls_template_${timestamp}.xlsx`);
    toast.success(`Smart template downloaded — ${productVariantRows.length} products pre-filled`, {
      description: '3 sheets: Carpet Rolls, Products Reference, Instructions',
    });
  };

  // ─── File parsing ───────────────────────────────────────
  const handleFileSelect = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(sheet, { raw: true });

        if (rows.length === 0) {
          toast.error('Excel file khaali hai');
          return;
        }

        const normalized = rows.map((row) => {
          const out: any = {};
          for (const k of Object.keys(row)) {
            const cleaned = k.trim().replace(/\s+/g, '');
            const camel = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
            out[camel] = row[k];
          }
          ['widthFt', 'widthInch', 'lengthFt', 'lengthInch', 'costPerSqft', 'salePricePerSqft'].forEach((field) => {
            if (out[field] !== undefined && out[field] !== '') {
              out[field] = Number(out[field]);
            }
          });
          return out;
        });

        setParsedRows(normalized);
        toast.success(`${normalized.length} rows parsed from ${file.name}`);
      } catch (err: any) {
        toast.error('File parse fail: ' + (err?.message || 'Unknown error'));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  // ─── Mutations ──────────────────────────────────────────
  const previewMutation = useMutation({
    mutationFn: () => carpetRollsApi.bulkImportPreview(parsedRows, currentShopId ?? undefined),
    onSuccess: (data) => {
      setPreview(data);
      setStep('preview');
      if (data.invalidCount > 0) {
        toast.warning(`${data.validCount} valid, ${data.invalidCount} invalid rows`);
      } else {
        toast.success(`All ${data.validCount} rows are valid!`);
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Preview failed'),
  });

  const applyMutation = useMutation({
    mutationFn: () => {
      if (!preview) throw new Error('No preview');
      const validRows = preview.rows
        .filter((r) => r.valid)
        .map((r) => ({
          productId: r.productId,
          variantId: r.variantId,
          rollNumber: r.rollNumber === '(auto-generated)' ? undefined : r.rollNumber,
          designCode: r.designCode,
          widthFt: r.widthFt,
          widthInch: r.widthInch,
          lengthFt: r.lengthFt,
          lengthInch: (r as any).lengthInch ?? 0,
          costPerSqft: r.costPerSqft,
          salePricePerSqft: r.salePricePerSqft,
          rackNumber: r.rackNumber,
          notes: r.notes,
          quality: r.quality,
          pile: r.pile,
        }));
      return carpetRollsApi.bulkImportApply(validRows, preview.shopId);
    },
    onSuccess: (data) => {
      setResult(data);
      setStep('result');
      toast.success(`${data.successCount} rolls imported successfully!`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Import failed'),
  });

  const handleManualSubmit = () => {
    const nonEmpty = manualRows.filter(
      (r) => r.productName || r.widthFt || r.lengthFt || r.rollNumber,
    );

    if (nonEmpty.length === 0) {
      toast.error('Koi row fill nahi ki');
      return;
    }

    const invalid = nonEmpty.filter(
      (r) => !r.productName || !r.widthFt || Number(r.widthFt) <= 0 || !r.lengthFt || Number(r.lengthFt) <= 0,
    );

    if (invalid.length > 0) {
      toast.error(`${invalid.length} rows mein issues — product, width, length zaroori hain`);
      return;
    }

    const apiRows = nonEmpty.map((r) => ({
      productName: r.productName.trim(),
      variantName: r.variantName?.trim() || undefined,
      rollNumber: r.rollNumber?.trim() || undefined,
      designCode: r.designCode?.trim() || undefined,
      widthFt: Number(r.widthFt),
      widthInch: Number(r.widthInch || 0),
      lengthFt: Number(r.lengthFt),
      lengthInch: Number(r.lengthInch || 0),
      costPerSqft: r.costPerSqft !== '' ? Number(r.costPerSqft) : undefined,
      salePricePerSqft: r.salePricePerSqft !== '' ? Number(r.salePricePerSqft) : undefined,
      rackNumber: r.rackNumber?.trim() || undefined,
      quality: r.quality?.trim() || undefined,
      pile: r.pile?.trim() || undefined,
      notes: r.notes?.trim() || undefined,
    }));

    setParsedRows(apiRows);
    toast.success(`${apiRows.length} rows ready — validating...`);
    setTimeout(() => previewMutation.mutate(), 100);
  };

  const resetFlow = () => {
    setStep('upload');
    setParsedRows([]);
    setManualRows([]);
    setPreview(null);
    setResult(null);
    setFileName('');
    setPreviewFilter('all');
  };

  // ─── Filtered preview rows ──────────────────────────────
  const filteredPreviewRows = useMemo(() => {
    if (!preview) return [];
    if (previewFilter === 'valid') return preview.rows.filter((r) => r.valid);
    if (previewFilter === 'invalid') return preview.rows.filter((r) => !r.valid);
    return preview.rows;
  }, [preview, previewFilter]);

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <Link to="/carpet-rolls" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600 font-bold transition">
        <ArrowLeft className="h-4 w-4" /> Back to Carpet Rolls
      </Link>

      {/* ═══ HERO HEADER ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Database className="h-3.5 w-3.5 text-amber-300" />
              Bulk Operations
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Bulk Roll Import</h1>
            <p className="mt-2 text-sm text-white/80 max-w-xl">
              Excel/CSV se 100+ rolls ek saath import karein — perfect for shop onboarding, supplier deliveries, ya stock-take
            </p>
          </div>
          <Button variant="secondary" onClick={downloadTemplate} className="bg-white text-emerald-900 hover:bg-emerald-50 shadow-lg">
            <Download className="h-4 w-4" /> Download Template
          </Button>
        </div>

        {/* Smart template hint */}
        {carpetProducts.length > 0 && (
          <div className="relative mt-4 rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-400/30 backdrop-blur flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-amber-200" />
            </div>
            <div className="flex-1 text-sm">
              <span className="font-extrabold text-amber-200">Smart Template Available!</span>
              <span className="text-white/80 ml-2">
                Aap ke <strong>{carpetProducts.length} carpet products</strong> ({productVariantRows.length} variants) already pre-filled hain
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ═══ STEP INDICATOR ═══ */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
        <StepIndicator num={1} label="Upload Data" desc="Excel or manual" active={step === 'upload'} done={step !== 'upload'} />
        <div className={`h-0.5 w-8 sm:w-16 transition ${step !== 'upload' ? 'bg-emerald-500' : 'bg-slate-200'}`} />
        <StepIndicator num={2} label="Preview & Validate" desc="Check before import" active={step === 'preview'} done={step === 'result'} />
        <div className={`h-0.5 w-8 sm:w-16 transition ${step === 'result' ? 'bg-emerald-500' : 'bg-slate-200'}`} />
        <StepIndicator num={3} label="Complete" desc="Import done" active={step === 'result'} />
      </div>

      {/* ════════════ STEP 1: UPLOAD ════════════ */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* MODE SWITCHER */}
          <div className="rounded-2xl bg-white border-2 border-slate-200 p-1.5 inline-flex w-full max-w-md mx-auto shadow-sm">
            <button
              onClick={() => setInputMode('excel')}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-extrabold transition inline-flex items-center justify-center gap-2 ${
                inputMode === 'excel'
                  ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-500/30'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel Upload
            </button>
            <button
              onClick={() => setInputMode('manual')}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-extrabold transition inline-flex items-center justify-center gap-2 ${
                inputMode === 'manual'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Edit3 className="h-4 w-4" />
              Manual Entry
            </button>
          </div>

          {/* ─── EXCEL MODE ─── */}
          {inputMode === 'excel' && (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-3xl border-4 border-dashed transition-all cursor-pointer p-12 text-center ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50 scale-[1.02] shadow-xl'
                    : fileName
                      ? 'border-emerald-400 bg-emerald-50/50'
                      : 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/60 hover:border-emerald-400'
                }`}
              >
                {fileName ? (
                  <>
                    <div className="h-20 w-20 rounded-3xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-inner">
                      <FileSpreadsheet className="h-10 w-10" />
                    </div>
                    <h3 className="mt-4 text-xl font-extrabold text-emerald-900">
                      📄 {fileName}
                    </h3>
                    <p className="text-sm text-emerald-700 font-semibold mt-1">
                      {parsedRows.length} rows parsed • Click "Validate" below to continue
                    </p>
                  </>
                ) : (
                  <>
                    <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white mx-auto flex items-center justify-center shadow-lg animate-pulse">
                      <Upload className="h-10 w-10" />
                    </div>
                    <h3 className="mt-4 text-xl font-extrabold text-slate-900">
                      {isDragging ? 'Drop file here!' : 'Drop Excel/CSV file here'}
                    </h3>
                    <p className="text-sm text-slate-600 mt-2">Click karein ya file drag karein</p>
                    <p className="text-xs text-slate-500 mt-3 font-bold">
                      Supported: .xlsx, .xls, .csv
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>

              {parsedRows.length > 0 && (
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-4 flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="font-extrabold text-emerald-900 text-base">{parsedRows.length} rows parsed</div>
                      <div className="text-xs text-emerald-700 font-bold">Click "Validate & Preview" to check data</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setParsedRows([]); setFileName(''); }}
                      className="px-3 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center gap-1 border-2 border-slate-200 transition"
                    >
                      <X className="h-3.5 w-3.5" /> Reset
                    </button>
                    <Button
                      onClick={() => previewMutation.mutate()}
                      loading={previewMutation.isPending}
                      className="bg-gradient-to-r from-emerald-700 to-emerald-600 shadow-lg shadow-emerald-500/30"
                    >
                      Validate & Preview <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Format guide */}
              <div className="grid sm:grid-cols-3 gap-3">
                <FeatureCard icon={Sparkles} title="Smart Template" desc={`${productVariantRows.length} products pre-filled — just enter dimensions`} color="amber" />
                <FeatureCard icon={Zap} title="Auto-validate" desc="Backend checks products, variants, duplicate rolls" color="emerald" />
                <FeatureCard icon={Database} title="Bulk Apply" desc="Import 100s of rolls in seconds" color="blue" />
              </div>

              {/* Excel format guide */}
              <details className="rounded-2xl bg-blue-50 border-2 border-blue-200 overflow-hidden">
                <summary className="cursor-pointer p-4 flex items-center gap-2 hover:bg-blue-100 transition">
                  <Info className="h-4 w-4 text-blue-700" />
                  <span className="font-extrabold text-blue-900 text-sm">Excel Format Guide — Click to expand</span>
                </summary>
                <div className="p-4 pt-0 border-t border-blue-200">
                  <p className="text-sm text-blue-800 mt-3 font-semibold">
                    Required columns: <code className="bg-white px-1 rounded font-mono text-xs">productName</code>, <code className="bg-white px-1 rounded font-mono text-xs">widthFt</code>, <code className="bg-white px-1 rounded font-mono text-xs">lengthFt</code>
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2 mt-3 text-xs">
                    {[
                      { name: 'productName', required: true, desc: 'Exact product name' },
                      { name: 'variantName', required: false, desc: 'Variant if applicable' },
                      { name: 'rollNumber', required: false, desc: 'Auto-generate if empty' },
                      { name: 'widthFt', required: true, desc: 'Roll width (feet)' },
                      { name: 'widthInch', required: false, desc: 'Extra inches (0-11)' },
                      { name: 'lengthFt', required: true, desc: 'Length (feet)' },
                      { name: 'lengthInch', required: false, desc: 'Extra inches' },
                      { name: 'costPerSqft', required: false, desc: 'Cost per sqft' },
                      { name: 'salePricePerSqft', required: false, desc: 'Sale price' },
                      { name: 'rackNumber', required: false, desc: 'Storage location' },
                      { name: 'quality', required: false, desc: 'Premium/Standard' },
                      { name: 'pile', required: false, desc: 'Wool/Synthetic' },
                    ].map((col) => (
                      <div key={col.name} className="rounded-lg bg-white border border-blue-200 p-2">
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-blue-900 text-xs">{col.name}</span>
                          {col.required && (
                            <span className="text-[9px] font-bold text-rose-600 bg-rose-100 px-1 rounded">REQ</span>
                          )}
                        </div>
                        <div className="text-blue-700 mt-0.5">{col.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* ─── MANUAL MODE ─── */}
          {inputMode === 'manual' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center shadow-md shrink-0">
                    <MousePointerClick className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-extrabold text-blue-900 text-base">Manual Entry Mode</h3>
                    <p className="text-sm text-blue-800 mt-1">
                      Excel ki zaroorat nahi — yahin table mein product dropdown se select karein aur rows add karein. Cost/sale price auto-fill ho jate hain product defaults se.
                    </p>
                  </div>
                </div>
              </div>

              <ManualEntryTable
                rows={manualRows}
                onChange={setManualRows}
                productOptions={productVariantRows}
              />

              {manualRows.length > 0 && (
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-4 flex items-center justify-between gap-3 flex-wrap shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="font-extrabold text-emerald-900 text-base">
                        {manualRows.length} row{manualRows.length !== 1 ? 's' : ''} prepared
                      </div>
                      <div className="text-xs text-emerald-700 font-bold">Click "Validate & Preview" to proceed</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setManualRows([])}
                      className="px-3 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold inline-flex items-center gap-1 border-2 border-rose-200 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Clear All
                    </button>
                    <Button
                      onClick={handleManualSubmit}
                      loading={previewMutation.isPending}
                      className="bg-gradient-to-r from-blue-700 to-blue-600 shadow-lg shadow-blue-500/30"
                    >
                      Validate & Preview <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════ STEP 2: PREVIEW ════════════ */}
      {step === 'preview' && preview && (
        <div className="space-y-4">
          {/* Stats KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <PreviewKpi label="Total Rows" value={preview.totalRows} icon={FileSpreadsheet} tone="slate" />
            <PreviewKpi label="Valid" value={preview.validCount} icon={CheckCircle2} tone="emerald" />
            <PreviewKpi label="Invalid" value={preview.invalidCount} icon={FileWarning} tone="rose" />
            <PreviewKpi label="Total Stock" value={`${preview.totalSqftToImport.toFixed(0)}`} unit="sqft" icon={Layers} tone="violet" />
          </div>

          {/* Value summary */}
          {preview.validCount > 0 && (
            <div className="grid sm:grid-cols-3 gap-3">
              <ValueCard label="Total Cost" value={formatPKRFull(preview.totalCostToImport)} color="blue" icon={Package} />
              <ValueCard label="Total Sale Value" value={formatPKRFull(preview.totalSaleValueToImport)} color="emerald" icon={DollarSign} />
              <ValueCard label="Potential Profit" value={formatPKRFull(preview.totalSaleValueToImport - preview.totalCostToImport)} color="amber" icon={TrendingUp} sub={`${(((preview.totalSaleValueToImport - preview.totalCostToImport) / Math.max(preview.totalSaleValueToImport, 1)) * 100).toFixed(1)}% margin`} />
            </div>
          )}

          {/* Filter chips */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setPreviewFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition ${
                previewFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All <span className={`px-1.5 py-0.5 rounded text-[9px] ${previewFilter === 'all' ? 'bg-white/20' : 'bg-slate-200'}`}>{preview.totalRows}</span>
            </button>
            <button
              onClick={() => setPreviewFilter('valid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition ${
                previewFilter === 'valid' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="h-3 w-3" /> Valid <span className={`px-1.5 py-0.5 rounded text-[9px] ${previewFilter === 'valid' ? 'bg-white/30' : 'bg-emerald-200'}`}>{preview.validCount}</span>
            </button>
            <button
              onClick={() => setPreviewFilter('invalid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition ${
                previewFilter === 'invalid' ? 'bg-rose-600 text-white shadow-sm' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <FileWarning className="h-3 w-3" /> Invalid <span className={`px-1.5 py-0.5 rounded text-[9px] ${previewFilter === 'invalid' ? 'bg-white/30' : 'bg-rose-200'}`}>{preview.invalidCount}</span>
            </button>
          </div>

          {/* Detailed table */}
          <div className="rounded-3xl bg-white border-2 border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b-2 border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-extrabold text-slate-900">Detailed Preview</h3>
                <p className="text-xs text-slate-500 font-semibold">{filteredPreviewRows.length} rows shown</p>
              </div>
              {preview.invalidCount > 0 && (
                <div className="text-[10px] text-amber-700 font-bold inline-flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                  <Info className="h-3 w-3" /> Only valid rows will be imported
                </div>
              )}
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b-2 border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">#</th>
                    <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Status</th>
                    <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Product</th>
                    <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Roll #</th>
                    <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Size</th>
                    <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Cost</th>
                    <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Sale</th>
                    <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPreviewRows.map((row) => (
                    <tr key={row.index} className={`transition ${row.valid ? 'hover:bg-emerald-50/30' : 'bg-rose-50/30 hover:bg-rose-50/50'}`}>
                      <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{row.index}</td>
                      <td className="px-3 py-2.5">
                        {row.valid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
                            <CheckCircle2 className="h-2.5 w-2.5" /> VALID
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                            <X className="h-2.5 w-2.5" /> INVALID
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-900 text-xs">{row.productName}</div>
                        {row.variantName && (
                          <div className="text-[10px] text-violet-700 font-bold">— {row.variantName}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono font-bold text-slate-700">{row.rollNumber}</td>
                      <td className="px-3 py-2.5 text-right text-xs">
                        <div className="font-bold text-slate-900">
                          {row.widthFt}ft{Number(row.widthInch || 0) > 0 ? ` ${row.widthInch}in` : ''} × {row.lengthFt}ft{Number((row as any).lengthInch || 0) > 0 ? ` ${(row as any).lengthInch}in` : ''}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-bold">{row.totalSqft.toFixed(2)} sqft</div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-700">
                        {row.costPerSqft > 0 ? formatPKRFull(row.costPerSqft) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-bold text-emerald-700">
                        {row.salePricePerSqft > 0 ? formatPKRFull(row.salePricePerSqft) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-[10px]">
                        {row.errors.map((e: string, i: number) => (
                          <div key={`e-${i}`} className="text-rose-700 font-bold inline-flex items-center gap-1">
                            <X className="h-2.5 w-2.5" /> {e}
                          </div>
                        ))}
                        {row.warnings.map((w: string, i: number) => (
                          <div key={`w-${i}`} className="text-amber-700 inline-flex items-center gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" /> {w}
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons */}
          <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 flex items-center justify-between gap-2 flex-wrap shadow-sm">
            <Button variant="secondary" onClick={resetFlow}>
              <ArrowLeft className="h-4 w-4" /> Start Over
            </Button>
            <Button
              onClick={() => applyMutation.mutate()}
              loading={applyMutation.isPending}
              disabled={preview.validCount === 0}
              className="bg-gradient-to-r from-emerald-700 to-emerald-600 shadow-lg shadow-emerald-500/30 disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none"
            >
              <CheckCircle2 className="h-4 w-4" />
              Import {preview.validCount} Valid Rolls
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {preview.invalidCount > 0 && (
            <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-extrabold text-amber-900">{preview.invalidCount} rows mein issues hain</div>
                <div className="text-amber-800 mt-0.5 font-semibold">
                  Sirf <strong>{preview.validCount} valid rows</strong> import hongi. Invalid rows ko Excel mein fix karke phir try karein.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════ STEP 3: RESULT ════════════ */}
      {step === 'result' && result && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 border-2 border-emerald-300 p-8 text-center shadow-lg">
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white mx-auto flex items-center justify-center shadow-xl mb-4">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <h2 className="text-3xl font-extrabold text-emerald-900">Import Complete! 🎉</h2>
            <p className="text-emerald-800 mt-2 text-base font-bold">
              {result.successCount} rolls successfully created
            </p>

            <div className="grid sm:grid-cols-3 gap-3 mt-6 max-w-2xl mx-auto">
              <ResultCard label="Submitted" value={result.totalSubmitted} icon={FileSpreadsheet} tone="slate" />
              <ResultCard label="Success" value={result.successCount} icon={CheckCircle2} tone="emerald" />
              <ResultCard label="Failed" value={result.failureCount} icon={FileWarning} tone="rose" />
            </div>
          </div>

          {result.failureCount > 0 && (
            <div className="rounded-3xl bg-white border-2 border-rose-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-gradient-to-r from-rose-50 to-orange-50 border-b-2 border-rose-200">
                <h3 className="font-extrabold text-rose-900 inline-flex items-center gap-2">
                  <FileWarning className="h-4 w-4" /> Failed Imports
                </h3>
                <p className="text-xs text-rose-700 font-semibold mt-0.5">Review these errors and retry</p>
              </div>
              <div className="divide-y divide-rose-100 max-h-60 overflow-y-auto">
                {result.results.filter((r) => !r.success).map((r) => (
                  <div key={r.index} className="p-3 flex items-center gap-3 hover:bg-rose-50/30">
                    <span className="font-mono text-xs text-slate-500 font-bold w-12">#{r.index}</span>
                    <span className="text-sm text-rose-700 flex-1 font-semibold">{r.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 flex items-center justify-center gap-2 flex-wrap shadow-sm">
            <Button variant="secondary" onClick={resetFlow}>
              <RefreshCw className="h-4 w-4" /> Import More
            </Button>
            <Button onClick={() => navigate('/carpet-rolls')} className="bg-gradient-to-r from-emerald-700 to-emerald-600">
              <Layers className="h-4 w-4" /> View All Rolls <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═════════════════════════════════════════════════════════════

function StepIndicator({
  num, label, desc, active, done,
}: { num: number; label: string; desc: string; active?: boolean; done?: boolean }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center font-extrabold text-sm transition shadow-md ${
        done
          ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white'
          : active
            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-100'
            : 'bg-slate-200 text-slate-500'
      }`}>
        {done ? <CheckCircle2 className="h-5 w-5" /> : num}
      </div>
      <div className="hidden sm:block">
        <div className={`text-sm font-extrabold ${active || done ? 'text-slate-900' : 'text-slate-500'}`}>
          {label}
        </div>
        <div className="text-[10px] text-slate-500 font-bold">{desc}</div>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, color }: { icon: any; title: string; desc: string; color: string }) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-50 to-green-50 border-emerald-200',
    blue: 'from-blue-50 to-indigo-50 border-blue-200',
    amber: 'from-amber-50 to-orange-50 border-amber-200',
  };
  const iconTones: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-700',
    blue: 'from-blue-500 to-blue-700',
    amber: 'from-amber-500 to-amber-700',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br border-2 p-4 ${tones[color]}`}>
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${iconTones[color]} text-white flex items-center justify-center shadow-md mb-2`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-extrabold text-slate-900 text-sm">{title}</div>
      <div className="text-xs text-slate-600 font-semibold mt-0.5">{desc}</div>
    </div>
  );
}

function PreviewKpi({ label, value, unit, icon: Icon, tone }: { label: string; value: string | number; unit?: string; icon: any; tone: string }) {
  const tones: Record<string, string> = {
    slate: 'from-slate-50 to-slate-100 border-slate-200 text-slate-900',
    emerald: 'from-emerald-50 to-green-50 border-emerald-200 text-emerald-900',
    rose: 'from-rose-50 to-pink-50 border-rose-200 text-rose-900',
    violet: 'from-violet-50 to-purple-50 border-violet-200 text-violet-900',
  };
  const iconTones: Record<string, string> = {
    slate: 'from-slate-600 to-slate-800',
    emerald: 'from-emerald-500 to-emerald-700',
    rose: 'from-rose-500 to-rose-700',
    violet: 'from-violet-500 to-violet-700',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br border-2 p-4 shadow-sm ${tones[tone]}`}>
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${iconTones[tone]} text-white flex items-center justify-center shadow-md mb-2`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-[10px] uppercase tracking-wider font-extrabold opacity-75">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <div className="text-2xl font-extrabold tabular-nums leading-none">{value}</div>
        {unit && <div className="text-xs font-extrabold opacity-70">{unit}</div>}
      </div>
    </div>
  );
}

function ValueCard({ label, value, color, icon: Icon, sub }: { label: string; value: string; color: string; icon: any; sub?: string }) {
  const tones: Record<string, string> = {
    blue: 'from-blue-50 to-indigo-50 border-blue-200 text-blue-900',
    emerald: 'from-emerald-50 to-green-50 border-emerald-200 text-emerald-900',
    amber: 'from-amber-50 to-orange-50 border-amber-200 text-amber-900',
  };
  const iconTones: Record<string, string> = {
    blue: 'from-blue-500 to-blue-700',
    emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-amber-700',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br border-2 p-4 shadow-sm ${tones[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${iconTones[color]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-[10px] uppercase tracking-wider font-extrabold opacity-75">{label}</div>
      </div>
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
      {sub && <div className="text-[10px] font-bold opacity-70 mt-1">{sub}</div>}
    </div>
  );
}

function ResultCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: string }) {
  const tones: Record<string, string> = {
    slate: 'bg-white border-slate-200 text-slate-900',
    emerald: 'bg-emerald-100 border-emerald-300 text-emerald-900',
    rose: 'bg-rose-50 border-rose-200 text-rose-900',
  };
  return (
    <div className={`rounded-2xl border-2 p-4 shadow-sm ${tones[tone]}`}>
      <Icon className="h-5 w-5 mx-auto mb-2 opacity-70" />
      <div className="text-[10px] uppercase tracking-wider font-extrabold opacity-75">{label}</div>
      <div className="text-3xl font-extrabold tabular-nums mt-1">{value}</div>
    </div>
  );
}
