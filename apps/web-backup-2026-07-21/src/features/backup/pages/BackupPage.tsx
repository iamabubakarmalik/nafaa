import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Database, Download, ShieldCheck, Clock, HardDrive, AlertTriangle,
  CheckCircle2, Cloud, Loader2, Calendar, Package, Users, Truck, Wallet,
  Receipt, BookOpen, ShoppingCart, BarChart3, Sparkles, Info, Building2,
  CalendarClock, FileText, FolderArchive, RotateCcw,
} from 'lucide-react';
import { backupApi } from '@/api/backup.api';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const STAT_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  shops: { label: 'Shops', icon: Building2, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  categories: { label: 'Categories', icon: FolderArchive, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  products: { label: 'Products', icon: Package, color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  customers: { label: 'Customers', icon: Users, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  suppliers: { label: 'Suppliers', icon: Truck, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  sales: { label: 'Sales', icon: Receipt, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  purchases: { label: 'Purchases', icon: ShoppingCart, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  expenses: { label: 'Expenses', icon: Wallet, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
  stockMovements: { label: 'Stock Moves', icon: BarChart3, color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
  cashRegisters: { label: 'Cash Sessions', icon: Wallet, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  transfers: { label: 'Transfers', icon: Truck, color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' },
};

export default function BackupPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [downloading, setDownloading] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem('nafaa.last-backup-at');
    } catch {
      return null;
    }
  });

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['backup-summary'],
    queryFn: backupApi.summary,
  });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      toast.info('Backup taiyar ho rahi hai...', { description: 'Yeh kuch seconds lega' });
      const res = await fetch(`${API_URL}/backup/download`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Backup failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nafaa-backup-${new Date().toISOString().slice(0, 10)}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      const now = new Date().toISOString();
      try { localStorage.setItem('nafaa.last-backup-at', now); } catch {}
      setLastBackupAt(now);

      const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
      toast.success('Backup downloaded successfully', { description: `Size: ${sizeMB} MB` });
    } catch (e: any) {
      toast.error(e?.message || 'Backup download fail');
    } finally {
      setDownloading(false);
    }
  };

  const stats = summary?.counts || {};
  const totalEntries = Object.values(stats).reduce((s: number, v: any) => s + (v || 0), 0);

  const daysSinceLastBackup = lastBackupAt
    ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const backupStatus = !lastBackupAt
    ? { status: 'none', label: 'Never backed up', color: 'rose', icon: AlertTriangle }
    : daysSinceLastBackup === 0
    ? { status: 'fresh', label: 'Backed up today', color: 'emerald', icon: CheckCircle2 }
    : daysSinceLastBackup! < 7
    ? { status: 'recent', label: `${daysSinceLastBackup} days ago`, color: 'blue', icon: Clock }
    : daysSinceLastBackup! < 30
    ? { status: 'old', label: `${daysSinceLastBackup} days ago`, color: 'amber', icon: AlertTriangle }
    : { status: 'critical', label: `${daysSinceLastBackup} days ago`, color: 'rose', icon: AlertTriangle };

  const StatusIcon = backupStatus.icon;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-purple-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-300" /> Data Safety
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Backup & Restore</h2>
            <p className="mt-2 text-sm text-white/80">
              Apna saara business data ek file mein safe karein — products, sales, customers, sab kuch.
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleDownload}
            loading={downloading}
            className="bg-white text-slate-900 hover:bg-slate-100"
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download Backup
              </>
            )}
          </Button>
        </div>
      </section>

      {/* Backup status banner */}
      <div className={`rounded-2xl border-2 p-4 flex items-center gap-3 ${
        backupStatus.color === 'emerald' ? 'bg-emerald-50 border-emerald-300' :
        backupStatus.color === 'blue' ? 'bg-blue-50 border-blue-300' :
        backupStatus.color === 'amber' ? 'bg-amber-50 border-amber-300' :
        'bg-rose-50 border-rose-300'
      }`}>
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
          backupStatus.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
          backupStatus.color === 'blue' ? 'bg-blue-100 text-blue-700' :
          backupStatus.color === 'amber' ? 'bg-amber-100 text-amber-700' :
          'bg-rose-100 text-rose-700'
        }`}>
          <StatusIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-extrabold ${
            backupStatus.color === 'emerald' ? 'text-emerald-900' :
            backupStatus.color === 'blue' ? 'text-blue-900' :
            backupStatus.color === 'amber' ? 'text-amber-900' :
            'text-rose-900'
          }`}>
            Last Backup: {backupStatus.label}
          </div>
          <div className="text-xs text-slate-600 mt-0.5">
            {!lastBackupAt
              ? '⚠️ Aap ne abhi tak koi backup nahi liya — abhi download karein!'
              : daysSinceLastBackup! < 7
              ? '✅ Aap ka data safe hai'
              : daysSinceLastBackup! < 30
              ? '⚠️ Naya backup leyne ka time hai'
              : '🚨 Bohot purana backup hai — abhi backup leyein!'}
          </div>
        </div>
        {lastBackupAt && (
          <div className="text-right shrink-0 text-xs">
            <div className="text-slate-500 font-semibold">Last backup at</div>
            <div className="font-bold text-slate-900">
              {new Date(lastBackupAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-12 text-center">
          <div className="inline-block h-10 w-10 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
        </div>
      ) : (
        <>
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 text-white flex items-center justify-center shadow-lg">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Aap ke Data ka Snapshot</h3>
                  <p className="text-sm text-slate-500">
                    {summary?.meta?.tenantName} • Version {summary?.meta?.version} • <strong>{totalEntries.toLocaleString()}</strong> total entries
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {Object.entries(stats).map(([key, value]: [string, any]) => {
                const cfg = STAT_CONFIG[key] || { label: key, icon: Database, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' };
                const Icon = cfg.icon;
                return (
                  <div key={key} className={`rounded-2xl border-2 p-4 ${cfg.bg}`}>
                    <Icon className={`h-5 w-5 ${cfg.color} mb-1`} />
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</div>
                    <div className={`mt-1 text-2xl font-extrabold ${cfg.color}`}>{(value || 0).toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Best Practices</h3>
                  <p className="text-xs text-slate-500">Apna data safe rakhne ka tareeqa</p>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-slate-700">
                {[
                  { icon: Calendar, text: 'Har hafte ek backup zaroor download karein', color: 'text-emerald-600' },
                  { icon: Cloud, text: 'Backup file Google Drive ya Dropbox pe rakhein', color: 'text-blue-600' },
                  { icon: CalendarClock, text: 'Mahine ke akhir mein full backup zaroori', color: 'text-violet-600' },
                  { icon: ShieldCheck, text: 'Backup file mein saara data hota hai — ehtiyat se rakhein', color: 'text-amber-600' },
                  { icon: HardDrive, text: 'Multiple copies banayein — local + cloud', color: 'text-rose-600' },
                ].map((tip, i) => {
                  const Icon = tip.icon;
                  return (
                    <li key={i} className="flex items-start gap-2">
                      <Icon className={`h-4 w-4 ${tip.color} shrink-0 mt-0.5`} />
                      <span className="font-semibold">{tip.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-amber-50 via-white to-orange-50 border-2 border-amber-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Important Note</h3>
                  <p className="text-xs text-slate-500">Restore feature & data sensitivity</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-slate-700">
                <div className="rounded-xl bg-white border border-amber-200 p-3">
                  <div className="font-bold text-amber-900 inline-flex items-center gap-1 mb-1">
                    <FileText className="h-3.5 w-3.5" /> Format
                  </div>
                  <p className="text-xs">JSON file format — Microsoft Excel mein open nahi hoti. Programming tools chahiye to read.</p>
                </div>
                <div className="rounded-xl bg-white border border-amber-200 p-3">
                  <div className="font-bold text-amber-900 inline-flex items-center gap-1 mb-1">
                    <RotateCcw className="h-3.5 w-3.5" /> Restore Feature
                  </div>
                  <p className="text-xs"><strong>Coming soon.</strong> Filhal aap data download kar ke safe rakh sakte hain. Restore functionality next update mein add hogi.</p>
                </div>
                <div className="rounded-xl bg-white border border-rose-200 p-3">
                  <div className="font-bold text-rose-900 inline-flex items-center gap-1 mb-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Security
                  </div>
                  <p className="text-xs">Backup mein <strong>customer phone numbers, balances, prices</strong> sab hota hai — kisi ko share na karein!</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-gradient-to-br from-slate-950 to-purple-900 text-white p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <Cloud className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Auto Cloud Backup</h3>
                  <p className="text-sm text-white/70">Coming soon — automatic daily cloud backup</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                <Sparkles className="h-3 w-3" />
                Roadmap
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
