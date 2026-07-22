import { useState } from 'react';
import {
  Download, FileSpreadsheet, FileText, ShoppingCart, Package, Users,
  Truck, Wallet, BookOpen, Receipt, Loader2, CheckCircle2, Sparkles,
  Database, Tag, RotateCcw, BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

interface ExportCard {
  title: string;
  description: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  formats: Array<{
    label: string;
    icon: any;
    path: string;
    filename: (date: number) => string;
  }>;
}

const EXPORT_CARDS: ExportCard[] = [
  {
    title: 'Sales Report',
    description: 'Sab sales — sale number, customer, items, payment, totals',
    icon: ShoppingCart,
    iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
    iconColor: 'shadow-emerald-500/30',
    formats: [
      {
        label: 'Excel',
        icon: FileSpreadsheet,
        path: '/exports/sales/excel',
        filename: (d) => `nafaa-sales-${d}.xlsx`,
      },
      {
        label: 'PDF',
        icon: FileText,
        path: '/exports/sales/pdf',
        filename: (d) => `nafaa-sales-${d}.pdf`,
      },
    ],
  },
  {
    title: 'Products Inventory',
    description: 'Saare products with stock levels, prices, categories',
    icon: Package,
    iconBg: 'bg-gradient-to-br from-violet-500 to-violet-700',
    iconColor: 'shadow-violet-500/30',
    formats: [
      {
        label: 'Excel',
        icon: FileSpreadsheet,
        path: '/exports/products/excel',
        filename: (d) => `nafaa-products-${d}.xlsx`,
      },
    ],
  },
  {
    title: 'Customer List',
    description: 'Customers with balances, contact info, loyalty points',
    icon: Users,
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-700',
    iconColor: 'shadow-blue-500/30',
    formats: [
      {
        label: 'Excel',
        icon: FileSpreadsheet,
        path: '/exports/customers/excel',
        filename: (d) => `nafaa-customers-${d}.xlsx`,
      },
    ],
  },
  {
    title: 'Supplier List',
    description: 'Suppliers with bank details, payment terms, dues',
    icon: Truck,
    iconBg: 'bg-gradient-to-br from-orange-500 to-orange-700',
    iconColor: 'shadow-orange-500/30',
    formats: [
      {
        label: 'Excel',
        icon: FileSpreadsheet,
        path: '/exports/suppliers/excel',
        filename: (d) => `nafaa-suppliers-${d}.xlsx`,
      },
    ],
  },
  {
    title: 'Expenses Report',
    description: 'Sab expenses — categories, amounts, payment methods',
    icon: Wallet,
    iconBg: 'bg-gradient-to-br from-rose-500 to-rose-700',
    iconColor: 'shadow-rose-500/30',
    formats: [
      {
        label: 'Excel',
        icon: FileSpreadsheet,
        path: '/exports/expenses/excel',
        filename: (d) => `nafaa-expenses-${d}.xlsx`,
      },
    ],
  },
  {
    title: 'Purchases Report',
    description: 'Supplier-wise purchases, items, payment status',
    icon: ShoppingCart,
    iconBg: 'bg-gradient-to-br from-amber-500 to-amber-700',
    iconColor: 'shadow-amber-500/30',
    formats: [
      {
        label: 'Excel',
        icon: FileSpreadsheet,
        path: '/exports/purchases/excel',
        filename: (d) => `nafaa-purchases-${d}.xlsx`,
      },
    ],
  },
  {
    title: 'Khata / Ledger',
    description: 'Customer credits, payments received, balance history',
    icon: BookOpen,
    iconBg: 'bg-gradient-to-br from-cyan-500 to-cyan-700',
    iconColor: 'shadow-cyan-500/30',
    formats: [
      {
        label: 'Excel',
        icon: FileSpreadsheet,
        path: '/exports/ledger/excel',
        filename: (d) => `nafaa-khata-${d}.xlsx`,
      },
    ],
  },
  {
    title: 'Stock Movements',
    description: 'Sab stock IN/OUT — audit trail for inventory',
    icon: BarChart3,
    iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-700',
    iconColor: 'shadow-indigo-500/30',
    formats: [
      {
        label: 'Excel',
        icon: FileSpreadsheet,
        path: '/exports/stock-movements/excel',
        filename: (d) => `nafaa-stock-${d}.xlsx`,
      },
    ],
  },
];

export default function ExportsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const handleDownload = async (path: string, filename: string) => {
    const key = path;
    setLoadingKey(key);
    try {
      toast.info('Download starting...');
      const res = await fetch(`${API_URL}${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Downloaded successfully', { description: filename });
    } catch (e: any) {
      toast.error(e?.message || 'Download fail ho gaya');
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Download className="h-3.5 w-3.5 text-amber-300" /> Data Exports
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Export Reports</h2>
            <p className="mt-2 text-sm text-white/80">
              Apna business data Excel ya PDF format mein download karein — accountant, audit, ya safekeeping ke liye.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur px-5 py-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Reports Available</div>
            <div className="mt-1 text-3xl font-extrabold">{EXPORT_CARDS.length}</div>
          </div>
        </div>
      </section>

      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200 p-4 flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="text-sm text-slate-700">
          <strong className="font-bold text-amber-900">Tip:</strong> Excel files Microsoft Excel, Google Sheets, aur LibreOffice mein open hote hain. PDF print-ready hai. Sensitive data — file safe rakhein!
        </div>
      </div>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {EXPORT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className={`h-12 w-12 rounded-2xl ${card.iconBg} text-white flex items-center justify-center shadow-lg ${card.iconColor}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex gap-1">
                  {card.formats.map((f) => {
                    const FormatIcon = f.icon;
                    return (
                      <span key={f.label} className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-bold">
                        <FormatIcon className="h-2.5 w-2.5" />
                        {f.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <h3 className="text-lg font-extrabold text-slate-900">{card.title}</h3>
              <p className="mt-1 text-sm text-slate-500 line-clamp-2">{card.description}</p>

              <div className="mt-4 flex gap-2">
                {card.formats.map((f) => {
                  const FormatIcon = f.icon;
                  const isLoading = loadingKey === f.path;
                  return (
                    <Button
                      key={f.label}
                      onClick={() => handleDownload(f.path, f.filename(Date.now()))}
                      loading={isLoading}
                      className={card.formats.length > 1 ? 'flex-1' : 'w-full'}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FormatIcon className="h-4 w-4" />
                      )}
                      {f.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center shadow">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Export Tips</h3>
            <p className="text-sm text-slate-500">Better data management practices</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: CheckCircle2, color: 'text-emerald-600', title: 'Monthly Routine', text: 'Har mahine ke akhir mein sab exports ek baar download karein' },
            { icon: CheckCircle2, color: 'text-blue-600', title: 'Tax Time Ready', text: 'Sales, Purchases, aur Expenses files accountant ko de sakte hain' },
            { icon: CheckCircle2, color: 'text-violet-600', title: 'Cloud Backup', text: 'Google Drive ya Dropbox pe save karein — multiple copies' },
            { icon: CheckCircle2, color: 'text-rose-600', title: 'Sensitive Data', text: 'Customer/supplier data confidential — password protected folder' },
          ].map((t, i) => {
            const Icon = t.icon;
            return (
              <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <Icon className={`h-4 w-4 ${t.color} shrink-0 mt-0.5`} />
                <div>
                  <div className="text-sm font-bold text-slate-900">{t.title}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{t.text}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
