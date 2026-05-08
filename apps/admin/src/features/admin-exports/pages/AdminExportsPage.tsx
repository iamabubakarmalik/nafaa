import { Download, FileSpreadsheet, Building2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function AdminExportsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);

  const handleDownload = async (path: string, filename: string) => {
    try {
      toast.info('Downloading...');
      const res = await fetch(`${API_URL}${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success('Downloaded');
    } catch {
      toast.error('Download failed');
    }
  };

  const exports = [
    {
      title: 'All Tenants',
      description: 'Saare tenants with stats, plans, referrals — Excel format',
      icon: Building2,
      iconBg: 'bg-violet-100 text-violet-700',
      onClick: () => handleDownload('/admin/exports/tenants', `nafaa-admin-tenants-${Date.now()}.xlsx`),
    },
    {
      title: 'All Payments',
      description: 'Last 5000 payments with full details — Excel format',
      icon: CreditCard,
      iconBg: 'bg-emerald-100 text-emerald-700',
      onClick: () => handleDownload('/admin/exports/payments', `nafaa-admin-payments-${Date.now()}.xlsx`),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-cyan-900 to-cyan-700 text-white p-6 shadow-soft">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
          <Download className="h-3.5 w-3.5" /> Admin Exports
        </div>
        <h2 className="mt-3 text-3xl font-bold">Data Exports</h2>
        <p className="mt-2 text-sm text-white/80">Download platform-wide data as Excel</p>
      </section>

      <section className="grid sm:grid-cols-2 gap-6">
        {exports.map((e) => {
          const Icon = e.icon;
          return (
            <div key={e.title} className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-start justify-between gap-3">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${e.iconBg}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-bold">
                  <FileSpreadsheet className="h-3 w-3" /> Excel
                </span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{e.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{e.description}</p>
              <Button className="mt-5 w-full" onClick={e.onClick}>
                <Download className="h-4 w-4" /> Download
              </Button>
            </div>
          );
        })}
      </section>
    </div>
  );
}
