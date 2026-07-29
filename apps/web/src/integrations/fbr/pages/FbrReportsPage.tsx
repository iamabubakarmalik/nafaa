import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Download, Calendar, DollarSign } from 'lucide-react';
import { fbrApi } from '../api/fbr.api';
import { Button } from '@core/ui/Button';
import { SkeletonCard } from '@core/ui/Skeleton';
import { cn } from '@core/lib/cn';

export default function FbrReportsPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const { data, isLoading } = useQuery({
    queryKey: ['fbr-monthly', year, month],
    queryFn: () => fbrApi.monthlyReport(year, month),
  });

  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const downloadCSV = () => {
    if (!data) return;
    const rows = [
      ['Invoice #', 'FBR #', 'Date', 'Gross (Rs)', 'Tax (Rs)', 'Net (Rs)'].join(','),
      ...data.invoices.map((i) => [
        i.invoiceNumber,
        i.fbrInvoiceNumber ?? '',
        i.submittedAt ? new Date(i.submittedAt).toLocaleDateString('en-PK') : '',
        i.totalAmount.toFixed(2),
        i.taxAmount.toFixed(2),
        i.netAmount.toFixed(2),
      ].join(',')),
    ];
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fbr-report-${data.period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
            FBR Monthly Reports
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Sales tax filing ke liye ready format — CSV download karke FBR portal pe upload karo
          </p>
        </div>
        {data && data.invoices.length > 0 && (
          <Button variant="gradient" onClick={downloadCSV} leftIcon={<Download className="h-4 w-4" />}>
            Download CSV
          </Button>
        )}
      </div>

      {/* Period selector */}
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Calendar className="h-5 w-5 text-slate-400" />
          <select
            value={year}
            onChange={(e) => setYear(+e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-black"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(+e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-black"
          >
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : data && data.invoices.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Total Invoices" value={data.totalInvoices.toString()} color="blue" />
            <SummaryCard label="Gross Amount" value={`Rs ${data.totalGross.toLocaleString()}`} color="emerald" />
            <SummaryCard label="Net Amount" value={`Rs ${data.totalNet.toLocaleString()}`} color="cyan" />
            <SummaryCard label="Tax Collected" value={`Rs ${data.totalTax.toLocaleString()}`} color="amber" />
          </div>

          <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-neutral-800 border-b border-slate-200 dark:border-neutral-700 text-left">
                    <th className="px-4 py-3 font-black text-xs uppercase tracking-wider text-slate-600">Invoice #</th>
                    <th className="px-4 py-3 font-black text-xs uppercase tracking-wider text-slate-600">FBR #</th>
                    <th className="px-4 py-3 font-black text-xs uppercase tracking-wider text-slate-600">Date</th>
                    <th className="px-4 py-3 font-black text-xs uppercase tracking-wider text-slate-600 text-right">Gross</th>
                    <th className="px-4 py-3 font-black text-xs uppercase tracking-wider text-slate-600 text-right">Tax</th>
                    <th className="px-4 py-3 font-black text-xs uppercase tracking-wider text-slate-600 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((inv, i) => (
                    <tr key={inv.id} className={cn('border-b border-slate-100 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800/50', i % 2 === 1 && 'bg-slate-50/50 dark:bg-neutral-800/20')}>
                      <td className="px-4 py-2.5 font-mono text-xs font-bold">{inv.invoiceNumber}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{inv.fbrInvoiceNumber ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs">{inv.submittedAt ? new Date(inv.submittedAt).toLocaleDateString('en-PK') : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-bold">Rs {inv.totalAmount.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-blue-600 font-bold">Rs {inv.taxAmount.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-bold">Rs {inv.netAmount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 dark:bg-neutral-800 font-black">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 uppercase text-xs tracking-wider">Total</td>
                    <td className="px-4 py-3 text-right">Rs {data.totalGross.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-blue-600">Rs {data.totalTax.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">Rs {data.totalNet.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl bg-slate-50 dark:bg-neutral-900 p-12 text-center border border-dashed border-slate-300 dark:border-neutral-700">
          <DollarSign className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <div className="font-black text-slate-900 dark:text-white">No FBR invoices for {months[month - 1]} {year}</div>
          <p className="text-sm text-slate-500 mt-1">Is period mein koi submitted invoice nahi</p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: any) {
  const colors: any = {
    blue:    'from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/30 border-blue-200 dark:border-blue-800',
    emerald: 'from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30 border-emerald-200 dark:border-emerald-800',
    cyan:    'from-cyan-50 to-cyan-100 dark:from-cyan-950/40 dark:to-cyan-900/30 border-cyan-200 dark:border-cyan-800',
    amber:   'from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/30 border-amber-200 dark:border-amber-800',
  };
  return (
    <div className={cn('p-4 rounded-2xl border bg-gradient-to-br', colors[color])}>
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">{label}</div>
      <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{value}</div>
    </div>
  );
}
