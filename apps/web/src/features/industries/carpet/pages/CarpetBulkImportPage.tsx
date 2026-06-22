import { useState, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { productsApi } from '@/api/products.api';
import { productVariantsApi } from '@/api/product-variants.api';
import {
  Upload, FileSpreadsheet, Download, ArrowLeft, CheckCircle2,
  AlertTriangle, X, Sparkles, Layers, FileWarning, RefreshCw,
  ArrowRight, Trash2, Edit3, MousePointerClick,
} from 'lucide-react';
import { ManualEntryTable, type ManualRow } from '../components/ManualEntryTable';
import { Button } from '@/components/ui/Button';
import { formatPKRFull } from '@/lib/format';
import { toast } from 'sonner';
import {
  carpetRollsApi,
  type BulkImportPreviewResponse,
  type BulkImportApplyResponse,
} from '../api/carpet-rolls.api';
import { useAuthStore } from '@/store/auth.store';

type ImportStep = 'upload' | 'preview' | 'result';
type InputMode = 'excel' | 'manual';

// Expected column headers in Excel/CSV
const SAMPLE_HEADERS = [
  'productName',
  'variantName',
  'rollNumber',
  'designCode',
  'widthFt',
  'widthInch',
  'lengthFt',
  'costPerSqft',
  'salePricePerSqft',
  'rackNumber',
  'quality',
  'pile',
  'notes',
];

const SAMPLE_DATA = [
  {
    productName: 'Sun Flower',
    variantName: 'Cream',
    rollNumber: 'R-001',
    designCode: 'SF-001',
    widthFt: 12,
    widthInch: 0,
    lengthFt: 100,
    costPerSqft: 72,
    salePricePerSqft: 90,
    rackNumber: 'Wall-1',
    quality: 'Premium',
    pile: 'Wool',
    notes: 'New stock from supplier',
  },
  {
    productName: 'Sun Flower',
    variantName: 'Red',
    rollNumber: 'R-002',
    widthFt: 12,
    widthInch: 0,
    lengthFt: 80,
    costPerSqft: 72,
    salePricePerSqft: 90,
    rackNumber: 'Wall-1',
  },
];

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

  // ─── Fetch user's products with variants (for smart template) ───
  const { data: productsData } = useQuery({
    queryKey: ['products-for-bulk-import'],
    queryFn: () => productsApi.list({ limit: 500 }),
  });

  // Filter only carpet-unit products (sqft/sqm/sqyd)
  const carpetProducts = useMemo(() => {
    const items = productsData?.items ?? [];
    return items.filter((p: any) =>
      ['sqft', 'sqm', 'sqyd'].includes((p.unit || '').toLowerCase()),
    );
  }, [productsData]);

  // Fetch variants for each carpet product (same API as product edit page)
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
      for (const r of results) {
        map.set(r.productId, r.variants);
      }
      return map;
    },
    enabled: carpetProductIds.length > 0,
  });

  // Build flat list of product + variant combinations
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

  // ─── Smart pre-filled template download ────────────────────
  const downloadTemplate = () => {
    if (carpetProducts.length === 0) {
      // Fallback to blank template if no carpet products yet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(SAMPLE_DATA, { header: SAMPLE_HEADERS });
      XLSX.utils.book_append_sheet(wb, ws, 'Carpet Rolls');
      XLSX.writeFile(wb, 'carpet_rolls_template.xlsx');
      toast.success('Blank template downloaded — pehle carpet products add karein for smart template');
      return;
    }

    const wb = XLSX.utils.book_new();

    // ═══════════════════════════════════════════════════════════
    // SHEET 1: Main "Carpet Rolls" sheet with pre-filled products
    // ═══════════════════════════════════════════════════════════
    const mainHeaders = [
      'productName',
      'variantName',
      'rollNumber',
      'designCode',
      'widthFt',
      'widthInch',
      'lengthFt',
      'costPerSqft',
      'salePricePerSqft',
      'rackNumber',
      'quality',
      'pile',
      'notes',
    ];

    // Pre-fill rows with user's products (1 row per product+variant combo)
    const prefilledRows = productVariantRows.map((pv) => ({
      productName: pv.productName,
      variantName: pv.variantName || '',
      rollNumber: '', // user will fill
      designCode: '',
      widthFt: '', // user will fill
      widthInch: 0,
      lengthFt: '', // user will fill
      costPerSqft: pv.defaultCost || '',
      salePricePerSqft: pv.defaultPrice || '',
      rackNumber: '',
      quality: '',
      pile: '',
      notes: '',
    }));

    // Add 20 extra blank rows for new entries
    for (let i = 0; i < 20; i++) {
      prefilledRows.push({
        productName: '',
        variantName: '',
        rollNumber: '',
        designCode: '',
        widthFt: '',
        widthInch: 0,
        lengthFt: '',
        costPerSqft: '',
        salePricePerSqft: '',
        rackNumber: '',
        quality: '',
        pile: '',
        notes: '',
      } as any);
    }

    const ws = XLSX.utils.json_to_sheet(prefilledRows, { header: mainHeaders });

    // Set column widths
    ws['!cols'] = [
      { wch: 22 }, // productName
      { wch: 16 }, // variantName
      { wch: 14 }, // rollNumber
      { wch: 14 }, // designCode
      { wch: 10 }, // widthFt
      { wch: 10 }, // widthInch
      { wch: 10 }, // lengthFt
      { wch: 14 }, // costPerSqft
      { wch: 16 }, // salePricePerSqft
      { wch: 14 }, // rackNumber
      { wch: 12 }, // quality
      { wch: 12 }, // pile
      { wch: 30 }, // notes
    ];

    // Style header row (cell formatting via XLSX is limited but we can set comments)
    const headerComments: Record<string, string> = {
      A1: 'REQUIRED — Use exact product name from your inventory (dropdown in this column)',
      B1: 'Variant name if product has variants (Cream, Red, etc)',
      C1: 'Leave EMPTY for auto-generation, or set your own (e.g. R-001)',
      D1: 'Supplier design code (optional)',
      E1: 'REQUIRED — Width in feet (e.g. 12)',
      F1: 'Extra inches 0-11 (e.g. 6 for 12ft 6in)',
      G1: 'REQUIRED — Length in feet (e.g. 100)',
      H1: 'Cost price per sqft in Rs',
      I1: 'Sale price per sqft in Rs',
      J1: 'Storage location (e.g. Wall-1, Rack-A)',
      K1: 'Premium / Standard / Economy',
      L1: 'Wool / Synthetic / Mixed',
      M1: 'Any additional notes',
    };

    for (const [cell, comment] of Object.entries(headerComments)) {
      if (ws[cell]) {
        ws[cell].c = [{ a: 'Nafaa POS', t: comment, T: true }];
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Carpet Rolls');

    // ═══════════════════════════════════════════════════════════
    // SHEET 2: Products Reference (dropdown source)
    // ═══════════════════════════════════════════════════════════
    const productsList = productVariantRows.map((pv, idx) => ({
      '#': idx + 1,
      'Product Name': pv.productName,
      'Variant Name': pv.variantName || '(no variants)',
      'Product SKU': pv.productSku || '',
      'Default Cost/sqft': pv.defaultCost || '',
      'Default Price/sqft': pv.defaultPrice || '',
    }));

    const wsRef = XLSX.utils.json_to_sheet(productsList);
    wsRef['!cols'] = [
      { wch: 5 },
      { wch: 25 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsRef, 'Products Reference');

    // ═══════════════════════════════════════════════════════════
    // SHEET 3: Instructions
    // ═══════════════════════════════════════════════════════════
    const instructions = [
      ['CARPET ROLLS BULK IMPORT — INSTRUCTIONS'],
      [''],
      ['📋 HOW TO USE THIS TEMPLATE'],
      [''],
      ['1.', 'Go to "Carpet Rolls" sheet (first tab)'],
      ['2.', `Aap ke ${productVariantRows.length} product+variant combos already pre-filled hain`],
      ['3.', 'Sirf khali columns fill karein: rollNumber (optional), widthFt, lengthFt, etc.'],
      ['4.', 'Niche 20 extra blank rows hain — naye products bhi add kar saktay ho'],
      ['5.', 'Save file aur is page par drag/drop karein'],
      [''],
      ['📊 COLUMN GUIDE'],
      [''],
      ['Column', 'Required?', 'Description', 'Example'],
      ['productName', 'YES', 'Aap ke inventory ka exact product name', 'Sun Flower'],
      ['variantName', 'No', 'Variant name agar product mein variants hain', 'Cream'],
      ['rollNumber', 'No', 'Khali chhorein → auto-generate hoga', 'R-001'],
      ['designCode', 'No', 'Supplier ka design code', 'SF-001'],
      ['widthFt', 'YES', 'Roll ki width feet mein', '12'],
      ['widthInch', 'No', 'Extra inches (0-11)', '6'],
      ['lengthFt', 'YES', 'Roll ki length feet mein', '100'],
      ['costPerSqft', 'No', 'Cost price per square foot', '72'],
      ['salePricePerSqft', 'No', 'Sale price per square foot', '90'],
      ['rackNumber', 'No', 'Storage location', 'Wall-1'],
      ['quality', 'No', 'Premium / Standard / Economy', 'Premium'],
      ['pile', 'No', 'Wool / Synthetic / Mixed', 'Wool'],
      ['notes', 'No', 'Koi additional notes', 'New stock'],
      [''],
      ['💡 TIPS'],
      [''],
      ['• "Products Reference" tab dekh kar exact product names use karein'],
      ['• Roll number khali chhor dein agar aap chahtay ho system khud generate kare'],
      ['• Width = full roll width (e.g. 12ft), length = how much remaining stock hai'],
      ['• Cost aur sale price already pre-filled hain product defaults se — change kar sakte hain'],
      ['• 1 row = 1 physical roll (na ke 1 product type)'],
      [''],
      ['⚠️ COMMON MISTAKES'],
      [''],
      ['❌ Product name spelling galat — use copy-paste from Products Reference'],
      ['❌ Variant name miss kar dena agar product mein variants hain'],
      ['❌ Width ya length 0 ya negative — kabhi nahi'],
      ['❌ Same roll number 2 rows mein — duplicates fail honge'],
      [''],
      ['✅ Sab kuch fill karne ke baad upload karein aur preview check karein'],
    ];

    const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
    wsInstr['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 40 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');

    // Save with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `carpet_rolls_template_${timestamp}.xlsx`);
    toast.success(`Smart template downloaded — ${productVariantRows.length} products pre-filled`, {
      description: '3 sheets: Carpet Rolls (data), Products Reference, Instructions',
    });
  };

  // ─── File parsing ──────────────────────────────────────────
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

        // Normalize keys (handle case variants like "Product Name" → "productName")
        const normalized = rows.map((row) => {
          const out: any = {};
          for (const k of Object.keys(row)) {
            const cleaned = k.trim().replace(/\s+/g, '');
            const camel = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
            out[camel] = row[k];
          }
          // Coerce numbers
          ['widthFt', 'widthInch', 'lengthFt', 'costPerSqft', 'salePricePerSqft'].forEach((field) => {
            if (out[field] !== undefined && out[field] !== '') {
              out[field] = Number(out[field]);
            }
          });
          return out;
        });

        setParsedRows(normalized);
        toast.success(`${normalized.length} rows parsed`);
      } catch (err: any) {
        toast.error('File parse fail ho gayi: ' + (err?.message || 'Unknown error'));
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  // ─── Preview mutation ──────────────────────────────────────
  const previewMutation = useMutation({
    mutationFn: () => carpetRollsApi.bulkImportPreview(parsedRows, currentShopId ?? undefined),
    onSuccess: (data) => {
      setPreview(data);
      setStep('preview');
      toast.success(`${data.validCount} valid, ${data.invalidCount} invalid`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Preview failed'),
  });

  // ─── Apply mutation ────────────────────────────────────────
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
      toast.success(`${data.successCount} rolls imported successfully`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Import failed'),
  });

  // ─── Manual entry: convert rows to parser format and validate ───
  const handleManualSubmit = () => {
    // Filter only non-empty rows
    const nonEmpty = manualRows.filter(
      (r) => r.productName || r.widthFt || r.lengthFt || r.rollNumber,
    );

    if (nonEmpty.length === 0) {
      toast.error('Koi row fill nahi ki — pehle rows add karein');
      return;
    }

    // Validate locally before sending
    const invalid = nonEmpty.filter(
      (r) =>
        !r.productName ||
        !r.widthFt ||
        Number(r.widthFt) <= 0 ||
        !r.lengthFt ||
        Number(r.lengthFt) <= 0,
    );

    if (invalid.length > 0) {
      toast.error(`${invalid.length} rows mein issues hain — product, width, length zaroori hain`);
      return;
    }

    // Convert to API format
    const apiRows = nonEmpty.map((r) => ({
      productName: r.productName.trim(),
      variantName: r.variantName?.trim() || undefined,
      rollNumber: r.rollNumber?.trim() || undefined,
      designCode: r.designCode?.trim() || undefined,
      widthFt: Number(r.widthFt),
      widthInch: Number(r.widthInch || 0),
      lengthFt: Number(r.lengthFt),
      costPerSqft: r.costPerSqft !== '' ? Number(r.costPerSqft) : undefined,
      salePricePerSqft: r.salePricePerSqft !== '' ? Number(r.salePricePerSqft) : undefined,
      rackNumber: r.rackNumber?.trim() || undefined,
      quality: r.quality?.trim() || undefined,
      pile: r.pile?.trim() || undefined,
      notes: r.notes?.trim() || undefined,
    }));

    setParsedRows(apiRows);
    toast.success(`${apiRows.length} rows ready — validating...`);

    // Trigger preview
    setTimeout(() => {
      previewMutation.mutate();
    }, 100);
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
      <Link to="/carpet-rolls" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" /> Back to Carpet Rolls
      </Link>

      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-brand-900 via-emerald-800 to-emerald-700 text-white p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Bulk Operations
            </div>
            <h1 className="mt-3 text-3xl font-bold">Bulk Roll Import</h1>
            <p className="mt-2 text-sm text-white/80">
              Excel ya CSV file se 100+ rolls ek saath import karein — perfect for shop onboarding
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

      {/* ════════════ STEP 1: UPLOAD or MANUAL ENTRY ════════════ */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* MODE SWITCHER */}
          <div className="rounded-3xl bg-white border-2 border-slate-200 p-2 inline-flex w-full max-w-md mx-auto shadow-sm">
            <button
              onClick={() => setInputMode('excel')}
              className={`flex-1 px-4 py-3 rounded-2xl text-sm font-extrabold transition inline-flex items-center justify-center gap-2 ${
                inputMode === 'excel'
                  ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel Upload
            </button>
            <button
              onClick={() => setInputMode('manual')}
              className={`flex-1 px-4 py-3 rounded-2xl text-sm font-extrabold transition inline-flex items-center justify-center gap-2 ${
                inputMode === 'manual'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Edit3 className="h-4 w-4" />
              Manual Entry
            </button>
          </div>

          {/* ═══════════ MANUAL ENTRY MODE ═══════════ */}
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
                      Excel ki zaroorat nahi — yahin table mein product dropdown se select karein
                      aur rows add karein. Cost/sale price auto-fill ho jate hain product defaults se.
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
              <p className="text-sm text-slate-600 mt-2">
                Click karein ya file drag karein
              </p>
              <p className="text-xs text-slate-500 mt-3">
                Supported: .xlsx, .xls, .csv
              </p>
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
          )}

          {inputMode === 'excel' && parsedRows.length > 0 && (
            <div className="rounded-2xl bg-white border-2 border-emerald-200 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <div>
                  <div className="font-bold text-slate-900">{parsedRows.length} rows parsed</div>
                  <div className="text-xs text-slate-500">Ready to validate against your products</div>
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

          {/* Help section — Excel mode only */}
          {inputMode === 'excel' && (
          <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-5">
            <h3 className="font-bold text-blue-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Excel Format Guide
            </h3>
            <p className="text-sm text-blue-800 mt-2">
              Aap ke Excel mein ye columns hone chahiye (case-insensitive):
            </p>
            <div className="grid sm:grid-cols-2 gap-2 mt-3 text-xs">
              {[
                { name: 'productName', required: true, desc: 'Product ka exact name' },
                { name: 'variantName', required: false, desc: 'Variant name (e.g. Cream)' },
                { name: 'rollNumber', required: false, desc: 'Optional — auto-generate hoga' },
                { name: 'widthFt', required: true, desc: 'Width in feet (e.g. 12)' },
                { name: 'widthInch', required: false, desc: 'Extra inches (0-11)' },
                { name: 'lengthFt', required: true, desc: 'Length in feet' },
                { name: 'costPerSqft', required: false, desc: 'Cost price per sqft' },
                { name: 'salePricePerSqft', required: false, desc: 'Sale price per sqft' },
                { name: 'rackNumber', required: false, desc: 'Storage location' },
                { name: 'designCode', required: false, desc: 'Supplier design code' },
                { name: 'quality', required: false, desc: 'Premium/Standard/Economy' },
                { name: 'pile', required: false, desc: 'Wool/Synthetic/Mixed' },
              ].map((col) => (
                <div key={col.name} className="rounded-lg bg-white border border-blue-200 p-2">
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-bold text-blue-900">{col.name}</span>
                    {col.required && (
                      <span className="text-[9px] font-bold text-rose-600 bg-rose-100 px-1 rounded">REQUIRED</span>
                    )}
                  </div>
                  <div className="text-blue-700 mt-0.5">{col.desc}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900">
                  <div className="font-extrabold mb-1">✨ Smart Template Available!</div>
                  {carpetProducts.length > 0 ? (
                    <>
                      Aap ke <strong>{carpetProducts.length} carpet products</strong>{' '}
                      ({productVariantRows.length} product+variant combos) already pre-filled hain template mein.
                      Sirf <strong>width, length aur roll number</strong> fill karein!
                    </>
                  ) : (
                    <>
                      Pehle <Link to="/products/new" className="font-bold underline">carpet products add karein</Link>{' '}
                      (with sqft/sqm/sqyd unit) — phir smart template auto-fill ho jayega
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          )}

        </div>
      )}

      {/* ════════════ STEP 2: PREVIEW ════════════ */}
      {step === 'preview' && preview && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid sm:grid-cols-4 gap-3">
            <SummaryCard label="Total Rows" value={String(preview.totalRows)} color="slate" icon={FileSpreadsheet} />
            <SummaryCard label="Valid" value={String(preview.validCount)} color="emerald" icon={CheckCircle2} />
            <SummaryCard label="Invalid" value={String(preview.invalidCount)} color="rose" icon={FileWarning} />
            <SummaryCard label="Total Stock" value={`${preview.totalSqftToImport.toFixed(0)} sqft`} color="violet" icon={Layers} />
          </div>

          {/* Value summary */}
          {preview.validCount > 0 && (
            <div className="grid sm:grid-cols-3 gap-3">
              <ValueCard label="Total Cost" value={formatPKRFull(preview.totalCostToImport)} color="blue" />
              <ValueCard label="Total Sale Value" value={formatPKRFull(preview.totalSaleValueToImport)} color="emerald" />
              <ValueCard label="Potential Profit" value={formatPKRFull(preview.totalSaleValueToImport - preview.totalCostToImport)} color="amber" />
            </div>
          )}

          {/* Rows table */}
          <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Detailed Preview</h3>
              <div className="text-xs text-slate-500">
                Sirf valid rows import hongi
              </div>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-700">#</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-700">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-700">Product</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-700">Roll #</th>
                    <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-700">Size</th>
                    <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-700">Cost</th>
                    <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-700">Sale</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-700">Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.rows.map((row) => (
                    <tr
                      key={row.index}
                      className={`hover:bg-slate-50 ${!row.valid ? 'bg-rose-50/30' : ''}`}
                    >
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
                      <td className="px-3 py-2">
                        <div className="font-bold text-slate-900 text-xs">{row.productName}</div>
                        {row.variantName && (
                          <div className="text-[10px] text-violet-700 font-bold">— {row.variantName}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs font-mono font-bold text-slate-700">{row.rollNumber}</td>
                      <td className="px-3 py-2 text-right text-xs">
                        <div className="font-bold text-slate-900">
                          {row.widthFt}ft × {row.lengthFt}ft
                        </div>
                        <div className="text-[10px] text-emerald-700 font-bold">{row.totalSqft.toFixed(2)} sqft</div>
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-bold text-slate-700">
                        {row.costPerSqft > 0 ? formatPKRFull(row.costPerSqft) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-bold text-emerald-700">
                        {row.salePricePerSqft > 0 ? formatPKRFull(row.salePricePerSqft) : '—'}
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

          {/* Action buttons */}
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
              Import {preview.validCount} Valid Rolls
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {preview.invalidCount > 0 && (
            <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-amber-900">{preview.invalidCount} rows mein issues hain</div>
                <div className="text-amber-800 mt-0.5">
                  Sirf valid rows import hongi. Invalid rows ko Excel mein fix karke phir try karein.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════ STEP 3: RESULT ════════════ */}
      {step === 'result' && result && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 p-8 text-center">
            <div className="h-20 w-20 rounded-3xl bg-emerald-600 text-white mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-3xl font-extrabold text-emerald-900">
              Import Complete!
            </h2>
            <p className="text-emerald-800 mt-2">
              {result.successCount} rolls successfully created
            </p>

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
          </div>

          {/* Failures list */}
          {result.failureCount > 0 && (
            <div className="rounded-2xl bg-white border-2 border-rose-200 overflow-hidden">
              <div className="p-3 bg-rose-50 border-b border-rose-200">
                <h3 className="font-bold text-rose-900 text-sm">Failed Imports</h3>
              </div>
              <div className="divide-y divide-rose-100 max-h-60 overflow-y-auto">
                {result.results
                  .filter((r) => !r.success)
                  .map((r) => (
                    <div key={r.index} className="p-2 flex items-center gap-2 text-xs">
                      <span className="font-mono text-slate-500">#{r.index}</span>
                      <span className="text-rose-700 flex-1">{r.error}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Button variant="secondary" onClick={resetFlow}>
              <RefreshCw className="h-4 w-4" /> Import More
            </Button>
            <Button onClick={() => navigate('/carpet-rolls')}>
              <Layers className="h-4 w-4" /> View All Rolls
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper components ───────────────────────────────────────

function StepIndicator({
  num, label, active, done,
}: { num: number; label: string; active?: boolean; done?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm transition ${
        done
          ? 'bg-emerald-600 text-white'
          : active
            ? 'bg-brand-600 text-white shadow-lg'
            : 'bg-slate-200 text-slate-500'
      }`}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : num}
      </div>
      <span className={`text-sm font-bold ${active || done ? 'text-slate-900' : 'text-slate-500'}`}>
        {label}
      </span>
    </div>
  );
}

function SummaryCard({
  label, value, color, icon: Icon,
}: { label: string; value: string; color: string; icon: any }) {
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

function ValueCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
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
