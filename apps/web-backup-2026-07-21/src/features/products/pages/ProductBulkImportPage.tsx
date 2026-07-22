import { useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import {
  Upload, FileSpreadsheet, Download, ArrowLeft, CheckCircle2,
  AlertTriangle, X, Sparkles, Package, FileWarning, RefreshCw,
  ArrowRight, Trash2, Edit3, MousePointerClick, Layers,
  Database, Info, Zap, ChevronRight, TrendingUp, DollarSign,
  Tag as TagIcon, Building2, Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPKRFull, formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import {
  productsApi,
  type BulkImportPreviewResponse,
  type BulkImportApplyResponse,
} from '@/api/products.api';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import {
  ProductManualEntryTable,
  type ProductManualRow,
} from '../components/ProductManualEntryTable';

type ImportStep = 'upload' | 'preview' | 'result';
type InputMode = 'excel' | 'manual';

const SAMPLE_HEADERS = [
  'name', 'description', 'categoryName', 'brandName', 'tagNames',
  'sku', 'barcode', 'unit', 'price', 'costPrice', 'wholesalePrice',
  'stock', 'lowStockAlert', 'variantNames', 'imageUrls',
  'isActive', 'isFeatured',
];

export default function ProductBulkImportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { defaultUnit, template } = useBusinessFeatures();

  const [step, setStep] = useState<ImportStep>('upload');
  const [inputMode, setInputMode] = useState<InputMode>('excel');
  const [manualRows, setManualRows] = useState<ProductManualRow[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [preview, setPreview] = useState<BulkImportPreviewResponse | null>(null);
  const [result, setResult] = useState<BulkImportApplyResponse | null>(null);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'invalid'>('all');

  const { data: refData } = useQuery({
    queryKey: ['products-bulk-import-reference'],
    queryFn: productsApi.bulkImportReferenceData,
  });

  const referenceData = useMemo(
    () => refData ?? { categories: [], brands: [], tags: [] },
    [refData],
  );

  // ─── Smart template download ──────────────────────────
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    const sampleRow: any = {
      name: 'Sample Product 1',
      description: 'High quality product',
      categoryName: referenceData.categories[0]?.name || 'General',
      brandName: referenceData.brands[0]?.name || '',
      tagNames: 'new, popular',
      sku: 'SKU-001',
      barcode: '',
      unit: defaultUnit || 'pcs',
      price: 1000,
      costPrice: 700,
      wholesalePrice: 850,
      stock: 50,
      lowStockAlert: 5,
      variantNames: 'Red, Blue, Green',
      imageUrls: '',
      isActive: true,
      isFeatured: false,
    };

    const prefilledRows = [sampleRow];

    for (let i = 0; i < 30; i++) {
      prefilledRows.push({
        name: '', description: '', categoryName: '', brandName: '',
        tagNames: '', sku: '', barcode: '', unit: defaultUnit || 'pcs',
        price: '', costPrice: '', wholesalePrice: '', stock: '',
        lowStockAlert: '', variantNames: '', imageUrls: '',
        isActive: true, isFeatured: false,
      });
    }

    const ws = XLSX.utils.json_to_sheet(prefilledRows, { header: SAMPLE_HEADERS });
    ws['!cols'] = [
      { wch: 25 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
      { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 30 }, { wch: 30 },
      { wch: 10 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Products');

    // Reference sheet
    const refSheet: any[] = [
      ['REFERENCE DATA — Copy exact names from here'],
      [''],
      ['CATEGORIES'],
      ...referenceData.categories.map((c) => [c.name]),
      [''],
      ['BRANDS'],
      ...referenceData.brands.map((b) => [b.name]),
      [''],
      ['TAGS'],
      ...referenceData.tags.map((t) => [t.name]),
    ];
    const wsRef = XLSX.utils.aoa_to_sheet(refSheet);
    wsRef['!cols'] = [{ wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsRef, 'Reference Data');

    // Instructions
    const instructions = [
      ['PRODUCT BULK IMPORT — INSTRUCTIONS'],
      [''],
      ['📋 REQUIRED COLUMNS'],
      ['name', 'Product name (required)'],
      ['price', 'Sell price (required)'],
      [''],
      ['📋 OPTIONAL COLUMNS'],
      ['categoryName', 'Category — auto-create if not found'],
      ['brandName', 'Brand — auto-create if not found'],
      ['tagNames', 'Comma-separated tags (e.g. "new, sale")'],
      ['sku', 'Product SKU'],
      ['barcode', 'Barcode'],
      ['unit', 'pcs, kg, sqft, liter, etc.'],
      ['costPrice', 'Purchase cost per unit'],
      ['wholesalePrice', 'Wholesale price'],
      ['stock', 'Initial stock quantity'],
      ['variantNames', 'Comma-separated variants (e.g. "Red, Blue")'],
      ['imageUrls', 'Comma-separated image URLs'],
      [''],
      ['💡 TIPS'],
      ['• Categories/Brands/Tags auto-create if not found'],
      ['• Use "Reference Data" tab to copy exact existing names'],
      ['• Variants share same price/cost as parent product'],
      ['• Save file and drag/drop on import page'],
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
    wsInstr['!cols'] = [{ wch: 22 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');

    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `products_template_${timestamp}.xlsx`);
    toast.success('Template downloaded', {
      description: '3 sheets: Products, Reference Data, Instructions',
    });
  };

  // ─── File parsing ──────────────────────────────────
  const handleFileSelect = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
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
          ['price', 'costPrice', 'wholesalePrice', 'stock', 'lowStockAlert', 'taxRate', 'weight'].forEach((f) => {
            if (out[f] !== undefined && out[f] !== '') out[f] = Number(out[f]);
          });
          return out;
        });

        const nonEmpty = normalized.filter((r) => r.name || r.sku || r.barcode);
        setParsedRows(nonEmpty);
        toast.success(`${nonEmpty.length} rows parsed from ${file.name}`);
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

  // ─── Mutations ─────────────────────────────────────
  const previewMutation = useMutation({
    mutationFn: () => productsApi.bulkImportPreview(parsedRows),
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
      const applyRows = preview.rows
        .filter((r) => r.valid)
        .map((r) => ({
          name: r.name,
          description: r.description,
          shortDescription: r.shortDescription,
          categoryId: r.categoryId,
          newCategoryName: r.willCreateCategory ? r.categoryName : undefined,
          brandId: r.brandId,
          newBrandName: r.willCreateBrand ? r.brandName : undefined,
          tagIds: r.tagIds,
          newTagNames: r.willCreateTags,
          sku: r.sku,
          barcode: r.barcode,
          unit: r.unit,
          price: r.price,
          costPrice: r.costPrice,
          wholesalePrice: r.wholesalePrice,
          taxRate: r.taxRate,
          stock: r.stock,
          lowStockAlert: r.lowStockAlert,
          weight: r.weight,
          weightUnit: r.weightUnit,
          dimensions: r.dimensions,
          expiryTracked: r.expiryTracked,
          isActive: r.isActive,
          isFeatured: r.isFeatured,
          variantNames: r.variantNames,
          imageUrls: r.imageUrls,
        }));
      return productsApi.bulkImportApply(applyRows);
    },
    onSuccess: (data) => {
      setResult(data);
      setStep('result');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success(`${data.successCount} products imported successfully`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Import failed'),
  });

  const handleManualSubmit = () => {
    const nonEmpty = manualRows.filter(
      (r) => r.name || r.price !== '' || r.sku,
    );
    if (nonEmpty.length === 0) {
      toast.error('Koi row fill nahi ki');
      return;
    }

    const apiRows = nonEmpty.map((r) => ({
      name: r.name.trim(),
      description: r.description?.trim() || undefined,
      categoryName: r.categoryName?.trim() || undefined,
      brandName: r.brandName?.trim() || undefined,
      tagNames: r.tagNames?.trim() || undefined,
      sku: r.sku?.trim() || undefined,
      barcode: r.barcode?.trim() || undefined,
      unit: r.unit || 'pcs',
      price: r.price === '' ? 0 : Number(r.price),
      costPrice: r.costPrice === '' ? undefined : Number(r.costPrice),
      wholesalePrice: r.wholesalePrice === '' ? undefined : Number(r.wholesalePrice),
      stock: r.stock === '' ? 0 : Number(r.stock),
      lowStockAlert: r.lowStockAlert === '' ? 5 : Number(r.lowStockAlert),
      variantNames: r.variantNames?.trim() || undefined,
      imageUrls: r.imageUrls?.trim() || undefined,
      isActive: r.isActive,
      isFeatured: r.isFeatured,
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

  // ─── Filtered preview rows ──────────────────────────
  const filteredPreviewRows = useMemo(() => {
    if (!preview) return [];
    if (previewFilter === 'valid') return preview.rows.filter((r) => r.valid);
    if (previewFilter === 'invalid') return preview.rows.filter((r) => !r.valid);
    return preview.rows;
  }, [preview, previewFilter]);

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <Link to="/products" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600 font-bold transition">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      {/* ═══════════════ HERO HEADER ═══════════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Database className="h-3.5 w-3.5 text-amber-300" />
              Bulk Operations
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Bulk Product Import</h1>
            <p className="mt-2 text-sm text-white/80 max-w-xl">
              Excel/CSV se ya manually 100+ products ek saath add karein
              {template?.label && ` — ${template.label} optimized`}
            </p>
          </div>
          <Button variant="secondary" onClick={downloadTemplate} className="bg-white text-emerald-900 hover:bg-emerald-50 shadow-lg">
            <Download className="h-4 w-4" /> Download Template
          </Button>
        </div>

        {/* Smart template hint */}
        {(referenceData.categories.length > 0 || referenceData.brands.length > 0) && (
          <div className="relative mt-4 rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-400/30 backdrop-blur flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-amber-200" />
            </div>
            <div className="flex-1 text-sm">
              <span className="font-extrabold text-amber-200">Smart Template Ready!</span>
              <span className="text-white/80 ml-2">
                <strong>{referenceData.categories.length} categories</strong> • <strong>{referenceData.brands.length} brands</strong> • <strong>{referenceData.tags.length} tags</strong> available in reference sheet
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ═══════════════ STEP INDICATOR ═══════════════ */}
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
              <FileSpreadsheet className="h-4 w-4" /> Excel Upload
            </button>
            <button
              onClick={() => setInputMode('manual')}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-extrabold transition inline-flex items-center justify-center gap-2 ${
                inputMode === 'manual'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Edit3 className="h-4 w-4" /> Manual Entry
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
                    <h3 className="mt-4 text-xl font-extrabold text-emerald-900">📄 {fileName}</h3>
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
                    <p className="text-xs text-slate-500 mt-3 font-bold">Supported: .xlsx, .xls, .csv</p>
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

              {/* Feature cards */}
              <div className="grid sm:grid-cols-3 gap-3">
                <FeatureCard icon={Sparkles} title="Auto-create" desc="Categories, brands & tags auto-create if new" color="amber" />
                <FeatureCard icon={Zap} title="Validation" desc="Backend checks for duplicates & errors" color="emerald" />
                <FeatureCard icon={Database} title="Bulk Apply" desc="Import 100s of products in seconds" color="blue" />
              </div>

              {/* Excel format guide */}
              <details className="rounded-2xl bg-blue-50 border-2 border-blue-200 overflow-hidden">
                <summary className="cursor-pointer p-4 flex items-center gap-2 hover:bg-blue-100 transition">
                  <Info className="h-4 w-4 text-blue-700" />
                  <span className="font-extrabold text-blue-900 text-sm">Excel Format Guide — Click to expand</span>
                </summary>
                <div className="p-4 pt-0 border-t border-blue-200">
                  <p className="text-sm text-blue-800 mt-3 font-semibold">
                    Required columns: <code className="bg-white px-1 rounded font-mono text-xs">name</code>, <code className="bg-white px-1 rounded font-mono text-xs">price</code>
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2 mt-3 text-xs">
                    {[
                      { name: 'name', required: true, desc: 'Product name' },
                      { name: 'price', required: true, desc: 'Sell price' },
                      { name: 'categoryName', required: false, desc: 'Auto-create if new' },
                      { name: 'brandName', required: false, desc: 'Auto-create if new' },
                      { name: 'tagNames', required: false, desc: 'Comma-separated' },
                      { name: 'variantNames', required: false, desc: 'Red, Blue, Green' },
                      { name: 'sku', required: false, desc: 'Product SKU' },
                      { name: 'barcode', required: false, desc: 'Barcode' },
                      { name: 'unit', required: false, desc: 'pcs, kg, sqft, liter' },
                      { name: 'costPrice', required: false, desc: 'Purchase cost' },
                      { name: 'wholesalePrice', required: false, desc: 'B2B price' },
                      { name: 'stock', required: false, desc: 'Initial stock' },
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
                      Excel ki zaroorat nahi — yahin table mein products add karein.
                      Categories, brands aur tags auto-suggest honge (existing) ya naye auto-create honge.
                    </p>
                  </div>
                </div>
              </div>

              <ProductManualEntryTable
                rows={manualRows}
                onChange={setManualRows}
                referenceData={referenceData}
                defaultUnit={defaultUnit || 'pcs'}
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
            <PreviewKpi label="Variants" value={preview.totalVariantsToCreate} icon={Layers} tone="violet" />
          </div>

          {/* Auto-create notice */}
          {(preview.totalCategoriesToCreate + preview.totalBrandsToCreate + preview.totalTagsToCreate) > 0 && (
            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-4 flex items-center gap-3 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-md shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1 flex flex-wrap items-center gap-3 text-sm">
                <span className="font-extrabold text-blue-900">Will auto-create:</span>
                {preview.totalCategoriesToCreate > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-blue-300 text-xs font-extrabold text-blue-700">
                    <TagIcon className="h-3 w-3" /> {preview.totalCategoriesToCreate} categories
                  </span>
                )}
                {preview.totalBrandsToCreate > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-violet-300 text-xs font-extrabold text-violet-700">
                    <Building2 className="h-3 w-3" /> {preview.totalBrandsToCreate} brands
                  </span>
                )}
                {preview.totalTagsToCreate > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-amber-300 text-xs font-extrabold text-amber-700">
                    <Hash className="h-3 w-3" /> {preview.totalTagsToCreate} tags
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Value summary */}
          {preview.validCount > 0 && (
            <div className="grid sm:grid-cols-3 gap-3">
              <ValueCard label="Total Stock Value" value={formatPKRFull(preview.totalStockValue)} color="emerald" icon={Package} />
              <ValueCard label="Total Cost Value" value={formatPKRFull(preview.totalCostValue)} color="blue" icon={DollarSign} />
              <ValueCard label="Potential Profit" value={formatPKRFull(preview.totalStockValue - preview.totalCostValue)} color="amber" icon={TrendingUp} sub={`${(((preview.totalStockValue - preview.totalCostValue) / Math.max(preview.totalStockValue, 1)) * 100).toFixed(1)}% margin`} />
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
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition border ${
                previewFilter === 'valid'
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300 shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-transparent'
              }`}
            >
              <CheckCircle2 className="h-3 w-3" /> Valid <span className={`px-1.5 py-0.5 rounded text-[9px] ${previewFilter === 'valid' ? 'bg-white/30' : 'bg-emerald-200'}`}>{preview.validCount}</span>
            </button>
            <button
              onClick={() => setPreviewFilter('invalid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition border ${
                previewFilter === 'invalid'
                  ? 'bg-rose-100 text-rose-700 border-rose-300 shadow-sm'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-transparent'
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
                    <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Name</th>
                    <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Cat / Brand</th>
                    <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Price</th>
                    <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Stock</th>
                    <th className="px-3 py-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Variants</th>
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
                        <div className="font-bold text-slate-900 text-xs">{row.name}</div>
                        {row.sku && <div className="text-[10px] font-mono text-slate-500">{row.sku}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {row.categoryName && (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-700 font-semibold">{row.categoryName}</span>
                            {row.willCreateCategory && (
                              <span className="text-[9px] font-extrabold text-blue-700 bg-blue-100 px-1 rounded">NEW</span>
                            )}
                          </div>
                        )}
                        {row.brandName && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-violet-700 font-bold">{row.brandName}</span>
                            {row.willCreateBrand && (
                              <span className="text-[9px] font-extrabold text-blue-700 bg-blue-100 px-1 rounded">NEW</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-extrabold text-emerald-700 tabular-nums">
                        {formatPKR(row.price)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums">{row.stock}</td>
                      <td className="px-3 py-2.5 text-center">
                        {row.variantNames.length > 0 ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-extrabold">
                            <Layers className="h-2.5 w-2.5" /> {row.variantNames.length}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[10px]">
                        {row.errors.map((e: string, i: number) => (
                          <div key={`e-${i}`} className="text-rose-700 font-bold inline-flex items-center gap-1">
                            <X className="h-2.5 w-2.5" /> {e}
                          </div>
                        ))}
                        {row.warnings.map((w: string, i: number) => (
                          <div key={`w-${i}`} className="text-amber-700 font-semibold inline-flex items-center gap-1">
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
              Import {preview.validCount} Products
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {preview.invalidCount > 0 && (
            <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-extrabold text-amber-900">{preview.invalidCount} rows mein issues hain</div>
                <div className="text-amber-800 mt-0.5 font-semibold">
                  Sirf <strong>{preview.validCount} valid rows</strong> import hongi. Invalid rows ko fix karke phir try karein.
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
              {result.successCount} products successfully created
            </p>

            <div className="grid sm:grid-cols-3 gap-3 mt-6 max-w-2xl mx-auto">
              <ResultCard label="Submitted" value={result.totalSubmitted} icon={FileSpreadsheet} tone="slate" />
              <ResultCard label="Success" value={result.successCount} icon={CheckCircle2} tone="emerald" />
              <ResultCard label="Failed" value={result.failureCount} icon={FileWarning} tone="rose" />
            </div>

            <div className="mt-4 grid sm:grid-cols-4 gap-2 max-w-2xl mx-auto">
              <MiniResult label="New Categories" value={result.newCategoriesCreated} />
              <MiniResult label="New Brands" value={result.newBrandsCreated} />
              <MiniResult label="New Tags" value={result.newTagsCreated} />
              <MiniResult label="Variants" value={result.newVariantsCreated} />
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
                    <span className="font-bold text-slate-900 text-sm">{r.productName}</span>
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
            <Button onClick={() => navigate('/products')} className="bg-gradient-to-r from-emerald-700 to-emerald-600">
              <Package className="h-4 w-4" /> View All Products <ArrowRight className="h-4 w-4" />
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

function PreviewKpi({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: string }) {
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
      <div className="text-2xl font-extrabold tabular-nums mt-1 leading-none">{value}</div>
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

function MiniResult({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white border border-slate-200 p-2">
      <div className="text-[9px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className="font-extrabold text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}
