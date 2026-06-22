import { useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import {
  Upload, FileSpreadsheet, Download, ArrowLeft, CheckCircle2,
  AlertTriangle, X, Sparkles, Package, FileWarning, RefreshCw,
  ArrowRight, Trash2, Edit3, MousePointerClick, Layers,
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
  const { defaultUnit, businessType, template } = useBusinessFeatures();

  const [step, setStep] = useState<ImportStep>('upload');
  const [inputMode, setInputMode] = useState<InputMode>('excel');
  const [manualRows, setManualRows] = useState<ProductManualRow[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [preview, setPreview] = useState<BulkImportPreviewResponse | null>(null);
  const [result, setResult] = useState<BulkImportApplyResponse | null>(null);
  const [fileName, setFileName] = useState('');

  // Fetch reference data
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

    // Build sample row based on business type
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

    // Add 30 empty rows
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

    // Instructions sheet
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
      ['• Categories/Brands/Tags auto-create if not found in inventory'],
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

        // Filter out completely empty rows
        const nonEmpty = normalized.filter((r) => r.name || r.sku || r.barcode);
        setParsedRows(nonEmpty);
        toast.success(`${nonEmpty.length} rows parsed`);
      } catch (err: any) {
        toast.error('File parse fail: ' + (err?.message || 'Unknown error'));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  // ─── Mutations ─────────────────────────────────────
  const previewMutation = useMutation({
    mutationFn: () => productsApi.bulkImportPreview(parsedRows),
    onSuccess: (data) => {
      setPreview(data);
      setStep('preview');
      toast.success(`${data.validCount} valid, ${data.invalidCount} invalid`);
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

  // ─── Manual submit ─────────────────────────────────
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
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Link to="/products" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-brand-900 via-emerald-800 to-emerald-700 text-white p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Bulk Operations
            </div>
            <h1 className="mt-3 text-3xl font-bold">Bulk Product Import</h1>
            <p className="mt-2 text-sm text-white/80">
              Excel se ya manually 100+ products ek saath add karein
              {template?.label && ` — ${template.label} optimized`}
            </p>
          </div>
          <Button variant="secondary" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Download Template
          </Button>
        </div>
      </section>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <StepIndicator num={1} label="Upload" active={step === 'upload'} done={step !== 'upload'} />
        <div className="h-0.5 w-12 bg-slate-200" />
        <StepIndicator num={2} label="Preview" active={step === 'preview'} done={step === 'result'} />
        <div className="h-0.5 w-12 bg-slate-200" />
        <StepIndicator num={3} label="Result" active={step === 'result'} />
      </div>

      {/* STEP 1: Upload or Manual */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* Mode switcher */}
          <div className="rounded-3xl bg-white border-2 border-slate-200 p-2 inline-flex w-full max-w-md mx-auto shadow-sm">
            <button
              onClick={() => setInputMode('excel')}
              className={`flex-1 px-4 py-3 rounded-2xl text-sm font-extrabold transition inline-flex items-center justify-center gap-2 ${
                inputMode === 'excel'
                  ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel Upload
            </button>
            <button
              onClick={() => setInputMode('manual')}
              className={`flex-1 px-4 py-3 rounded-2xl text-sm font-extrabold transition inline-flex items-center justify-center gap-2 ${
                inputMode === 'manual'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Edit3 className="h-4 w-4" /> Manual Entry
            </button>
          </div>

          {inputMode === 'manual' ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <MousePointerClick className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-extrabold text-blue-900">Manual Entry Mode</h3>
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
                <div className="rounded-2xl bg-white border-2 border-emerald-200 p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    <div>
                      <div className="font-bold text-slate-900">
                        {manualRows.length} row{manualRows.length !== 1 ? 's' : ''} prepared
                      </div>
                      <div className="text-xs text-slate-500">
                        Click "Validate & Preview" to proceed
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setManualRows([])}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold inline-flex items-center gap-1 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Clear All
                    </button>
                    <Button
                      onClick={handleManualSubmit}
                      loading={previewMutation.isPending}
                      className="bg-gradient-to-r from-blue-700 to-blue-600"
                    >
                      Validate & Preview <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-3xl border-2 border-dashed border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/60 hover:border-emerald-400 transition cursor-pointer p-12 text-center"
              >
                <Upload className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-extrabold text-slate-900">
                  {fileName ? `📄 ${fileName}` : 'Drop Excel/CSV file here'}
                </h3>
                <p className="text-sm text-slate-600 mt-2">Click karein ya file drag karein</p>
                <p className="text-xs text-slate-500 mt-3">Supported: .xlsx, .xls, .csv</p>
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
                <div className="rounded-2xl bg-white border-2 border-emerald-200 p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    <div>
                      <div className="font-bold text-slate-900">{parsedRows.length} rows parsed</div>
                      <div className="text-xs text-slate-500">Ready to validate</div>
                    </div>
                  </div>
                  <Button
                    onClick={() => previewMutation.mutate()}
                    loading={previewMutation.isPending}
                    className="bg-gradient-to-r from-emerald-700 to-emerald-600"
                  >
                    Validate & Preview <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Help section */}
              <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-5">
                <h3 className="font-bold text-blue-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Excel Format Guide
                </h3>
                <p className="text-sm text-blue-800 mt-2">Required columns:</p>
                <div className="grid sm:grid-cols-2 gap-2 mt-3 text-xs">
                  {[
                    { name: 'name', required: true, desc: 'Product name' },
                    { name: 'price', required: true, desc: 'Sell price' },
                    { name: 'categoryName', required: false, desc: 'Auto-create if new' },
                    { name: 'brandName', required: false, desc: 'Auto-create if new' },
                    { name: 'tagNames', required: false, desc: 'Comma-separated' },
                    { name: 'variantNames', required: false, desc: 'Red, Blue, Green' },
                    { name: 'sku', required: false, desc: 'Product SKU' },
                    { name: 'stock', required: false, desc: 'Initial stock' },
                  ].map((col) => (
                    <div key={col.name} className="rounded-lg bg-white border border-blue-200 p-2">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-blue-900">{col.name}</span>
                        {col.required && (
                          <span className="text-[9px] font-bold text-rose-600 bg-rose-100 px-1 rounded">
                            REQUIRED
                          </span>
                        )}
                      </div>
                      <div className="text-blue-700 mt-0.5">{col.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 2: PREVIEW */}
      {step === 'preview' && preview && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-4 gap-3">
            <SummaryCard label="Total Rows" value={String(preview.totalRows)} color="slate" icon={FileSpreadsheet} />
            <SummaryCard label="Valid" value={String(preview.validCount)} color="emerald" icon={CheckCircle2} />
            <SummaryCard label="Invalid" value={String(preview.invalidCount)} color="rose" icon={FileWarning} />
            <SummaryCard label="Variants" value={String(preview.totalVariantsToCreate)} color="violet" icon={Layers} />
          </div>

          {(preview.totalCategoriesToCreate + preview.totalBrandsToCreate + preview.totalTagsToCreate) > 0 && (
            <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900">
                <strong>Will auto-create:</strong>{' '}
                {preview.totalCategoriesToCreate > 0 && `${preview.totalCategoriesToCreate} categories`}
                {preview.totalCategoriesToCreate > 0 && (preview.totalBrandsToCreate > 0 || preview.totalTagsToCreate > 0) && ', '}
                {preview.totalBrandsToCreate > 0 && `${preview.totalBrandsToCreate} brands`}
                {preview.totalBrandsToCreate > 0 && preview.totalTagsToCreate > 0 && ', '}
                {preview.totalTagsToCreate > 0 && `${preview.totalTagsToCreate} tags`}
              </div>
            </div>
          )}

          {preview.validCount > 0 && (
            <div className="grid sm:grid-cols-2 gap-3">
              <ValueCard label="Total Stock Value" value={formatPKRFull(preview.totalStockValue)} color="emerald" />
              <ValueCard label="Total Cost Value" value={formatPKRFull(preview.totalCostValue)} color="amber" />
            </div>
          )}

          <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Detailed Preview</h3>
              <div className="text-xs text-slate-500">Sirf valid rows import hongi</div>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-700">#</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-700">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-700">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-700">Cat/Brand</th>
                    <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-700">Price</th>
                    <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-700">Stock</th>
                    <th className="px-3 py-2 text-center text-xs font-bold uppercase text-slate-700">Variants</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-700">Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.rows.map((row) => (
                    <tr key={row.index} className={`hover:bg-slate-50 ${!row.valid ? 'bg-rose-50/30' : ''}`}>
                      <td className="px-3 py-2 text-xs text-slate-500 font-mono">{row.index}</td>
                      <td className="px-3 py-2">
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
                      <td className="px-3 py-2 font-bold text-slate-900 text-xs">{row.name}</td>
                      <td className="px-3 py-2 text-xs">
                        {row.categoryName && (
                          <div className="flex items-center gap-1">
                            {row.categoryName}
                            {row.willCreateCategory && (
                              <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1 rounded">NEW</span>
                            )}
                          </div>
                        )}
                        {row.brandName && (
                          <div className="flex items-center gap-1 text-violet-700">
                            {row.brandName}
                            {row.willCreateBrand && (
                              <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1 rounded">NEW</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-bold text-emerald-700">
                        {formatPKR(row.price)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-bold">{row.stock}</td>
                      <td className="px-3 py-2 text-center">
                        {row.variantNames.length > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold">
                            {row.variantNames.length}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[10px]">
                        {row.errors.map((e, i) => (
                          <div key={`e-${i}`} className="text-rose-700 font-bold">❌ {e}</div>
                        ))}
                        {row.warnings.map((w, i) => (
                          <div key={`w-${i}`} className="text-amber-700">⚠️ {w}</div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Button variant="secondary" onClick={resetFlow}>
              <ArrowLeft className="h-4 w-4" /> Start Over
            </Button>
            <Button
              onClick={() => applyMutation.mutate()}
              loading={applyMutation.isPending}
              disabled={preview.validCount === 0}
              className="bg-gradient-to-r from-emerald-700 to-emerald-600"
            >
              <CheckCircle2 className="h-4 w-4" />
              Import {preview.validCount} Products
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: RESULT */}
      {step === 'result' && result && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 p-8 text-center">
            <div className="h-20 w-20 rounded-3xl bg-emerald-600 text-white mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-3xl font-extrabold text-emerald-900">Import Complete!</h2>
            <p className="text-emerald-800 mt-2">{result.successCount} products successfully created</p>

            <div className="grid sm:grid-cols-3 gap-3 mt-6 max-w-2xl mx-auto">
              <div className="rounded-xl bg-white border border-emerald-200 p-3">
                <div className="text-[10px] uppercase font-bold text-slate-500">Submitted</div>
                <div className="text-2xl font-extrabold text-slate-900">{result.totalSubmitted}</div>
              </div>
              <div className="rounded-xl bg-emerald-100 border border-emerald-300 p-3">
                <div className="text-[10px] uppercase font-bold text-emerald-700">Success</div>
                <div className="text-2xl font-extrabold text-emerald-900">{result.successCount}</div>
              </div>
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3">
                <div className="text-[10px] uppercase font-bold text-rose-700">Failed</div>
                <div className="text-2xl font-extrabold text-rose-900">{result.failureCount}</div>
              </div>
            </div>

            <div className="mt-4 grid sm:grid-cols-4 gap-2 max-w-2xl mx-auto text-xs">
              <div className="rounded-lg bg-white border border-slate-200 p-2">
                <div className="text-[9px] uppercase font-bold text-slate-500">New Categories</div>
                <div className="font-extrabold text-slate-900">{result.newCategoriesCreated}</div>
              </div>
              <div className="rounded-lg bg-white border border-slate-200 p-2">
                <div className="text-[9px] uppercase font-bold text-slate-500">New Brands</div>
                <div className="font-extrabold text-slate-900">{result.newBrandsCreated}</div>
              </div>
              <div className="rounded-lg bg-white border border-slate-200 p-2">
                <div className="text-[9px] uppercase font-bold text-slate-500">New Tags</div>
                <div className="font-extrabold text-slate-900">{result.newTagsCreated}</div>
              </div>
              <div className="rounded-lg bg-white border border-slate-200 p-2">
                <div className="text-[9px] uppercase font-bold text-slate-500">Variants</div>
                <div className="font-extrabold text-slate-900">{result.newVariantsCreated}</div>
              </div>
            </div>
          </div>

          {result.failureCount > 0 && (
            <div className="rounded-2xl bg-white border-2 border-rose-200 overflow-hidden">
              <div className="p-3 bg-rose-50 border-b border-rose-200">
                <h3 className="font-bold text-rose-900 text-sm">Failed Imports</h3>
              </div>
              <div className="divide-y divide-rose-100 max-h-60 overflow-y-auto">
                {result.results.filter((r) => !r.success).map((r) => (
                  <div key={r.index} className="p-2 flex items-center gap-2 text-xs">
                    <span className="font-mono text-slate-500">#{r.index}</span>
                    <span className="font-bold">{r.productName}</span>
                    <span className="text-rose-700 flex-1">{r.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Button variant="secondary" onClick={resetFlow}>
              <RefreshCw className="h-4 w-4" /> Import More
            </Button>
            <Button onClick={() => navigate('/products')}>
              <Package className="h-4 w-4" /> View All Products
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ num, label, active, done }: any) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm transition ${
        done ? 'bg-emerald-600 text-white' : active ? 'bg-brand-600 text-white shadow-lg' : 'bg-slate-200 text-slate-500'
      }`}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : num}
      </div>
      <span className={`text-sm font-bold ${active || done ? 'text-slate-900' : 'text-slate-500'}`}>{label}</span>
    </div>
  );
}

function SummaryCard({ label, value, color, icon: Icon }: any) {
  const colors: Record<string, string> = {
    slate: 'from-slate-50 to-slate-100 border-slate-200 text-slate-900',
    emerald: 'from-emerald-50 to-green-50 border-emerald-200 text-emerald-900',
    rose: 'from-rose-50 to-pink-50 border-rose-200 text-rose-900',
    violet: 'from-violet-50 to-purple-50 border-violet-200 text-violet-900',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br border-2 p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5" />
        <div className="text-[10px] uppercase tracking-wider font-bold opacity-80">{label}</div>
      </div>
      <div className="text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function ValueCard({ label, value, color }: any) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
  };
  return (
    <div className={`rounded-2xl border-2 p-4 ${colors[color]}`}>
      <div className="text-[10px] uppercase tracking-wider font-bold opacity-70">{label}</div>
      <div className="text-xl font-extrabold mt-1">{value}</div>
    </div>
  );
}
