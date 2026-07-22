import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, FileSpreadsheet, Download, CheckCircle2, XCircle,
  AlertTriangle, Clock, Sparkles, X, RefreshCw, Package,
  ArrowRight, Trash2, Eye,
} from 'lucide-react';
import { bulkImportApi, type BulkImportJob, type BulkImportRow } from '../api/bulk-import.api';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export default function BulkImportPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<BulkImportRow[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [selectedJob, setSelectedJob] = useState<BulkImportJob | null>(null);

  const { data: jobs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bulk-import-jobs'],
    queryFn: () => bulkImportApi.listJobs(),
    refetchInterval: 5000,
  });

  const importMutation = useMutation({
    mutationFn: (rows: BulkImportRow[]) =>
      bulkImportApi.importProducts({
        jobType: 'PRODUCTS',
        fileName,
        rows,
      }),
    onSuccess: (job) => {
      toast.success('Import complete: ' + job.successCount + ' added, ' + job.errorCount + ' failed');
      setPreview(null);
      setFileName('');
      queryClient.invalidateQueries({ queryKey: ['bulk-import-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Import failed'),
  });

  const parseCSV = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      toast.error('CSV file mein at least header + 1 row hona chahiye');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
    const rows: BulkImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      if (!row.name) continue;

      rows.push({
        name: row.name,
        sku: row.sku || undefined,
        barcode: row.barcode || undefined,
        category: row.category || undefined,
        brand: row.brand || undefined,
        unit: row.unit || 'piece',
        price: Number(row.price) || 0,
        costPrice: Number(row.costprice || row.cost_price || row['cost price']) || 0,
        wholesalePrice: Number(row.wholesaleprice || row.wholesale_price || row['wholesale price']) || undefined,
        stock: Number(row.stock) || 0,
        lowStockAlert: Number(row.lowstockalert || row.low_stock_alert || row['low stock alert']) || 5,
      });
    }

    setFileName(file.name);
    setPreview(rows);
  };

  const downloadTemplate = () => {
    const headers = ['name', 'sku', 'barcode', 'category', 'brand', 'unit', 'price', 'costPrice', 'wholesalePrice', 'stock', 'lowStockAlert'];
    const sample = [
      ['Colgate 100g', 'COLG-100', '8901234567890', 'Personal Care', 'Colgate', 'piece', '150', '120', '135', '50', '10'],
      ['Lipton Tea 250g', 'LIPT-250', '8901234567891', 'Beverages', 'Lipton', 'piece', '450', '380', '420', '30', '5'],
    ];
    const csv = [headers.join(','), ...sample.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Bulk Import
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              📊 Bulk Product Import
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Excel/CSV se ek saath hazaron products import karo
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20"
            >
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button
              className="bg-white text-slate-900 hover:bg-slate-100"
              onClick={downloadTemplate}
            >
              <Download className="h-4 w-4" />
              Template
            </Button>
          </div>
        </div>
      </section>

      {/* UPLOAD ZONE */}
      {!preview && (
        <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-300 dark:border-neutral-700 shadow-sm p-8">
          <div className="text-center">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white mx-auto flex items-center justify-center shadow-lg">
              <Upload className="h-10 w-10" />
            </div>
            <h3 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">
              Upload CSV File
            </h3>
            <p className="mt-1 text-sm text-slate-500 font-semibold">
              Products ki list wali CSV file drag karo ya select karo
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) parseCSV(file);
              }}
            />

            <div className="mt-6 flex justify-center gap-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-gradient-to-r from-blue-600 to-cyan-700"
              >
                <FileSpreadsheet className="h-4 w-4" />
                CSV File Choose Karo
              </Button>
              <Button variant="secondary" onClick={downloadTemplate}>
                <Download className="h-4 w-4" />
                Template Download
              </Button>
            </div>

            <div className="mt-6 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 text-left max-w-2xl mx-auto">
              <div className="text-xs uppercase tracking-wider font-extrabold text-blue-700 dark:text-blue-400 mb-2">
                📋 CSV Format
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold font-mono">
                name, sku, barcode, category, brand, unit, price, costPrice, wholesalePrice, stock, lowStockAlert
              </div>
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                <strong>Required:</strong> name • <strong>Optional:</strong> baaki sab
              </div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Categories/brands jo aap batao ge — automatic ban jayen ge agar exist nahi karti
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PREVIEW */}
      {preview && (
        <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-blue-300 dark:border-blue-800 shadow-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white">
                Preview: {fileName}
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                {preview.length} rows detected • Confirm karo import karne se pehle
              </p>
            </div>
            <button
              onClick={() => { setPreview(null); setFileName(''); }}
              className="h-9 w-9 rounded-lg bg-white dark:bg-neutral-800 hover:bg-slate-100 flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-neutral-800/50 sticky top-0">
                <tr className="text-left">
                  <th className="px-3 py-2 text-[10px] uppercase font-extrabold text-slate-600">#</th>
                  <th className="px-3 py-2 text-[10px] uppercase font-extrabold text-slate-600">Name</th>
                  <th className="px-3 py-2 text-[10px] uppercase font-extrabold text-slate-600">SKU</th>
                  <th className="px-3 py-2 text-[10px] uppercase font-extrabold text-slate-600">Category</th>
                  <th className="px-3 py-2 text-[10px] uppercase font-extrabold text-slate-600">Price</th>
                  <th className="px-3 py-2 text-[10px] uppercase font-extrabold text-slate-600">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                {preview.slice(0, 100).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-neutral-800/50">
                    <td className="px-3 py-2 text-xs text-slate-500 font-mono">{i + 1}</td>
                    <td className="px-3 py-2 font-extrabold text-slate-900 dark:text-white">{row.name}</td>
                    <td className="px-3 py-2 text-xs font-mono text-slate-600">{row.sku || '—'}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {row.category || '—'}
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-emerald-700 tabular-nums">
                      Rs {row.price?.toLocaleString() || 0}
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-slate-700 tabular-nums">
                      {row.stock || 0}
                    </td>
                  </tr>
                ))}
                {preview.length > 100 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-2 text-xs text-center font-bold text-slate-500">
                      +{preview.length - 100} more rows...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => { setPreview(null); setFileName(''); }}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-600 to-cyan-700"
              onClick={() => importMutation.mutate(preview)}
              loading={importMutation.isPending}
            >
              <Upload className="h-4 w-4" />
              Import {preview.length} Products
            </Button>
          </div>
        </section>
      )}

      {/* HISTORY */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800">
          <h3 className="font-extrabold text-slate-900 dark:text-white">Import History</h3>
          <p className="text-xs text-slate-500 font-semibold">Purani import jobs ka record</p>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-neutral-800 mx-auto flex items-center justify-center">
              <FileSpreadsheet className="h-8 w-8 text-slate-400" />
            </div>
            <p className="mt-3 font-extrabold text-slate-700 dark:text-slate-300">No imports yet</p>
            <p className="text-xs text-slate-500 font-semibold">Pehla CSV upload karo</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {jobs.map((job) => <JobRow key={job.id} job={job} onView={() => setSelectedJob(job)} />)}
          </div>
        )}
      </section>

      {selectedJob && <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </div>
  );
}

function JobRow({ job, onView }: { job: BulkImportJob; onView: () => void }) {
  const statusCfg = {
    PENDING: { label: 'Pending', color: 'bg-slate-500', icon: Clock },
    PROCESSING: { label: 'Processing', color: 'bg-blue-500', icon: RefreshCw },
    COMPLETED: { label: 'Complete', color: 'bg-emerald-500', icon: CheckCircle2 },
    FAILED: { label: 'Failed', color: 'bg-rose-500', icon: XCircle },
    PARTIAL: { label: 'Partial', color: 'bg-amber-500', icon: AlertTriangle },
  }[job.status];
  const StatusIcon = statusCfg.icon;

  return (
    <div className="px-6 py-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition flex items-center gap-4">
      <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
        <FileSpreadsheet className="h-5 w-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{job.fileName}</span>
          <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 text-white ' + statusCfg.color}>
            <StatusIcon className={'h-2.5 w-2.5 ' + (job.status === 'PROCESSING' ? 'animate-spin' : '')} />
            {statusCfg.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-semibold flex-wrap">
          <span>Rows: <strong className="text-slate-700 tabular-nums">{job.totalRows}</strong></span>
          <span>•</span>
          <span className="text-emerald-700">✓ {job.successCount}</span>
          {job.errorCount > 0 && <span className="text-rose-700">✗ {job.errorCount}</span>}
          {job.skipCount > 0 && <span className="text-amber-700">⊘ {job.skipCount}</span>}
          <span>•</span>
          <span>{new Date(job.createdAt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>
      </div>
      <button
        onClick={onView}
        className="h-9 px-3 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-xs font-extrabold inline-flex items-center gap-1"
      >
        <Eye className="h-3.5 w-3.5" />
        View
      </button>
    </div>
  );
}

function JobDetailModal({ job, onClose }: { job: BulkImportJob; onClose: () => void }) {
  const errors = Array.isArray(job.errors) ? job.errors : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/50 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">{job.fileName}</h3>
            <p className="text-xs text-slate-500 font-semibold">Import job details</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-700 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="Success" value={job.successCount} color="emerald" />
            <StatBox label="Errors" value={job.errorCount} color="rose" />
            <StatBox label="Skipped" value={job.skipCount} color="amber" />
          </div>

          {errors.length > 0 && (
            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mb-2">Errors</h4>
              <div className="rounded-xl border border-rose-200 dark:border-rose-800 divide-y divide-rose-100 max-h-64 overflow-y-auto">
                {errors.map((err: any, i: number) => (
                  <div key={i} className="p-2 flex items-start gap-2 text-xs">
                    <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-700 dark:text-slate-300">
                        Row {err.row}: <span className="font-mono">{err.name}</span>
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

function StatBox({ label, value, color }: any) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200',
    rose: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200',
    amber: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200',
  };
  return (
    <div className={'rounded-xl border p-3 text-center ' + colors[color]}>
      <div className="text-[10px] uppercase tracking-wider font-extrabold opacity-75">{label}</div>
      <div className="text-2xl font-extrabold tabular-nums mt-1">{value}</div>
    </div>
  );
}
