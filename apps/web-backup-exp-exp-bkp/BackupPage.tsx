import { useQuery } from '@tanstack/react-query';
import { Database, Download, ShieldCheck, Clock, HardDrive } from 'lucide-react';
import { backupApi } from '@/api/backup.api';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function BackupPage() {
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['backup-summary'],
    queryFn: backupApi.summary,
  });

  const handleDownload = async () => {
    try {
      toast.info('Backup taiyar ho rahi hai...');
      const res = await fetch(`${API_URL}/backup/download`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Backup failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nafaa-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded successfully');
    } catch {
      toast.error('Backup download fail');
    }
  };

  const stats = summary?.counts;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-purple-900 to-purple-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              Data Safety
            </div>
            <h2 className="mt-3 text-3xl font-bold">Backup & Restore</h2>
            <p className="mt-2 text-sm text-white/80">
              Apna saara data ek file mein safe karein.
            </p>
          </div>
          <Button size="lg" onClick={handleDownload} className="bg-white text-slate-900 hover:bg-slate-100">
            <Download className="h-4 w-4" />
            Download Backup
          </Button>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-8 text-center text-slate-500">
          Loading...
        </div>
      ) : (
        <>
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-11 w-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Aap ke Data ka Snapshot</h3>
                <p className="text-sm text-slate-500">
                  {summary?.meta?.tenantName} • Version {summary?.meta?.version}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Shops', value: stats?.shops ?? 0, color: 'bg-indigo-50 text-indigo-700' },
                { label: 'Categories', value: stats?.categories ?? 0, color: 'bg-emerald-50 text-emerald-700' },
                { label: 'Products', value: stats?.products ?? 0, color: 'bg-violet-50 text-violet-700' },
                { label: 'Customers', value: stats?.customers ?? 0, color: 'bg-blue-50 text-blue-700' },
                { label: 'Suppliers', value: stats?.suppliers ?? 0, color: 'bg-orange-50 text-orange-700' },
                { label: 'Sales', value: stats?.sales ?? 0, color: 'bg-emerald-50 text-emerald-700' },
                { label: 'Purchases', value: stats?.purchases ?? 0, color: 'bg-amber-50 text-amber-700' },
                { label: 'Expenses', value: stats?.expenses ?? 0, color: 'bg-rose-50 text-rose-700' },
                { label: 'Stock Moves', value: stats?.stockMovements ?? 0, color: 'bg-cyan-50 text-cyan-700' },
                { label: 'Cash Sessions', value: stats?.cashRegisters ?? 0, color: 'bg-emerald-50 text-emerald-700' },
                { label: 'Transfers', value: stats?.transfers ?? 0, color: 'bg-sky-50 text-sky-700' },
              ].map((s) => (
                <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
                  <div className="text-xs font-medium opacity-80">{s.label}</div>
                  <div className="mt-1 text-2xl font-bold">{s.value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Best Practice</h3>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  Har hafte ek backup zaroor download karein
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  Backup file ko Google Drive ya Dropbox pe rakhein
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  Mahine ke akhir mein full backup zaroori
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  Backup file mein aap ka saara data hota hai — ehtiyat se rakhein
                </li>
              </ul>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-white border border-amber-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <HardDrive className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Important Note</h3>
                </div>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                Yeh JSON backup file aap ke saare business data ka snapshot hai —
                products, sales, customers, expenses, sab kuch.
              </p>
              <p className="text-sm text-slate-700 mt-3 leading-relaxed">
                <strong>Restore feature:</strong> Coming soon. Filhal aap data download
                kar ke safe rakh sakte hain. Restore functionality next update mein add hogi.
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
