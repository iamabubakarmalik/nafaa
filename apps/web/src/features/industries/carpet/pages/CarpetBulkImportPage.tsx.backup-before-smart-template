import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import {
  Upload, FileSpreadsheet, Download, ArrowLeft, CheckCircle2,
  AlertTriangle, X, Sparkles, Layers, FileWarning, RefreshCw,
  ArrowRight, Trash2,
} from 'lucide-react';
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
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [preview, setPreview] = useState<BulkImportPreviewResponse | null>(null);
  const [result, setResult] = useState<BulkImportApplyResponse | null>(null);
  const [fileName, setFileName] = useState('');

  // ─── Sample template download ──────────────────────────────
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(SAMPLE_DATA, { header: SAMPLE_HEADERS });
    XLSX.utils.book_append_sheet(wb, ws, 'Carpet Rolls');
    XLSX.writeFile(wb, 'carpet_rolls_template.xlsx');
    toast.success('Template downloaded');
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

  const resetFlow = () => {
    setStep('upload');
    setParsedRows([]);
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

      {/* ════════════ STEP 1: UPLOAD ════════════ */}
      {step === 'upload' && (
        <div className="space-y-4">
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

          {parsedRows.length > 0 && (
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

          {/* Help section */}
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
            <div className="mt-3 text-xs text-blue-700">
              💡 <strong>Tip:</strong> "Download Template" button click karein — sample Excel mil jayegi
            </div>
          </div>
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
