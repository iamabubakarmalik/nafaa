import { Download, FileSpreadsheet, FileText, ShoppingCart, Package, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function ExportsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);

  const handleDownload = async (path: string, filename: string) => {
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
      toast.success('Downloaded');
    } catch {
      toast.error('Download fail ho gaya');
    }
  };

  const cards = [
    {
      title: 'Sales Report (Excel)',
      description: 'Saari sales ki tafseelat Excel mein',
      icon: ShoppingCart,
      iconBg: 'bg-emerald-100 text-emerald-700',
      format: 'Excel',
      formatIcon: FileSpreadsheet,
      onClick: () => handleDownload('/exports/sales/excel', `nafaa-sales-${Date.now()}.xlsx`),
    },
    {
      title: 'Sales Report (PDF)',
      description: 'Print-ready sales summary PDF',
      icon: ShoppingCart,
      iconBg: 'bg-emerald-100 text-emerald-700',
      format: 'PDF',
      formatIcon: FileText,
      onClick: () => handleDownload('/exports/sales/pdf', `nafaa-sales-${Date.now()}.pdf`),
    },
    {
      title: 'Products Inventory',
      description: 'Saare products with stock & prices',
      icon: Package,
      iconBg: 'bg-violet-100 text-violet-700',
      format: 'Excel',
      formatIcon: FileSpreadsheet,
      onClick: () => handleDownload('/exports/products/excel', `nafaa-products-${Date.now()}.xlsx`),
    },
    {
      title: 'Customer List',
      description: 'Customers with balances aur contact',
      icon: Users,
      iconBg: 'bg-blue-100 text-blue-700',
      format: 'Excel',
      formatIcon: FileSpreadsheet,
      onClick: () => handleDownload('/exports/customers/excel', `nafaa-customers-${Date.now()}.xlsx`),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 shadow-soft">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
            <Download className="h-3.5 w-3.5" />
            Data Exports
          </div>
          <h2 className="mt-3 text-3xl font-bold">Export Reports</h2>
          <p className="mt-2 text-sm text-white/80">
            Apna business data Excel ya PDF format mein download karein.
          </p>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          const FormatIcon = card.formatIcon;
          return (
            <div key={card.title} className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-start justify-between gap-3">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${card.iconBg}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-bold">
                  <FormatIcon className="h-3 w-3" />
                  {card.format}
                </span>
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">{card.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{card.description}</p>

              <Button className="mt-5 w-full" onClick={card.onClick}>
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          );
        })}
      </section>
    </div>
  );
}
