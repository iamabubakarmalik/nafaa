import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Database, Download, HardDrive, Package, Users, Truck, DollarSign,
  ShoppingCart, TrendingDown, Tag, Settings as SettingsIcon, FileJson,
  FileSpreadsheet, FileText, Check, Loader2, CalendarClock,
} from 'lucide-react';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { Button } from '@core/ui/Button';
import { SectionCard, ChoiceGroup, Alert, Divider } from '../components/UI';

const ENTITIES: { key: string; label: string; icon: any; color: string; desc: string }[] = [
  { key: 'products',   label: 'Products',   icon: Package,        color: 'emerald', desc: 'Sab items + variants' },
  { key: 'customers',  label: 'Customers',  icon: Users,          color: 'blue',    desc: 'Contact + balance' },
  { key: 'suppliers',  label: 'Suppliers',  icon: Truck,          color: 'violet',  desc: 'Vendor list' },
  { key: 'sales',      label: 'Sales',      icon: DollarSign,     color: 'amber',   desc: 'Sab receipts' },
  { key: 'purchases',  label: 'Purchases',  icon: ShoppingCart,   color: 'sky',     desc: 'Purchase orders' },
  { key: 'expenses',   label: 'Expenses',   icon: TrendingDown,   color: 'rose',    desc: 'Kharch ka record' },
  { key: 'categories', label: 'Categories', icon: Tag,            color: 'pink',    desc: 'Product categories' },
  { key: 'settings',   label: 'Settings',   icon: SettingsIcon,   color: 'slate',   desc: 'Poori config' },
];

type Format = 'json' | 'csv' | 'excel';

export function BackupSection() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['backup-stats'],
    queryFn: settingsApi.backupStats,
    staleTime: 30_000,
  });

  const [selected, setSelected] = useState<string[]>(ENTITIES.map((e) => e.key));
  const [format, setFormat] = useState<Format>('json');

  const exportMutation = useMutation({
    mutationFn: () => settingsApi.exportData(selected, format),
    onSuccess: (data: any) => {
      let blob: Blob;
      let ext = format;
      const timestamp = new Date().toISOString().split('T')[0];

      if (format === 'json') {
        blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      } else if (format === 'csv') {
        // Backend zip return karta hai; agar string mila to as-is save karo
        const content = typeof data === 'string' ? data : JSON.stringify(data);
        blob = new Blob([content], { type: 'text/csv' });
      } else {
        blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        ext = 'xlsx' as any;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nafaa-backup-${timestamp}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Backup download ho gaya ✅ (${selected.length} categories)`);
    },
    onError: () => toast.error('Export fail — dobara try karein'),
  });

  const toggle = (key: string) =>
    setSelected((s) => (s.includes(key) ? s.filter((x) => x !== key) : [...s, key]));

  const selectAll = () => setSelected(ENTITIES.map((e) => e.key));
  const selectNone = () => setSelected([]);

  const totalRecords = stats
    ? (stats.products || 0) + (stats.customers || 0) + (stats.sales || 0) + (stats.purchases || 0) + (stats.expenses || 0)
    : 0;

  return (
    <div className="space-y-4">
      {/* Data overview */}
      <SectionCard
        title="Data Overview"
        desc="Aap ka poora data at a glance"
        icon={Database}
        color="blue"
      >
        {statsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 text-xs font-extrabold text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <Check className="h-3 w-3" /> Total {totalRecords.toLocaleString()} records
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ENTITIES.map((e) => {
                const value = (stats as any)?.[e.key] ?? 0;
                const Icon = e.icon;
                return (
                  <div
                    key={e.key}
                    className="rounded-2xl bg-white dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 hover:border-slate-300 dark:hover:border-slate-600 transition"
                  >
                    <div className={`h-9 w-9 rounded-xl bg-${e.color}-100 dark:bg-${e.color}-500/20 text-${e.color}-700 dark:text-${e.color}-300 flex items-center justify-center mb-2`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums leading-none">
                      {typeof value === 'number' ? value.toLocaleString() : value}
                    </div>
                    <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                      {e.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </SectionCard>

      {/* Export data */}
      <SectionCard
        title="Export Data"
        desc="Apna data download karein — accountant ko bhejo ya safe rakho"
        icon={Download}
        color="emerald"
      >
        {/* Format */}
        <div className="mb-4">
          <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-2 uppercase tracking-widest">
            File Format
          </div>
          <ChoiceGroup
            value={format}
            onChange={(v) => setFormat(v)}
            columns={3}
            options={[
              { value: 'json', label: 'JSON', desc: 'Developers ke liye', icon: FileJson },
              { value: 'csv', label: 'CSV', desc: 'Excel me kholain', icon: FileText },
              { value: 'excel', label: 'Excel', desc: '.xlsx spreadsheet', icon: FileSpreadsheet },
            ]}
          />
        </div>

        <Divider label="Select Data" />

        {/* Quick select */}
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="text-xs font-extrabold text-slate-600 dark:text-slate-400">
            <span className="text-emerald-700 dark:text-emerald-300">{selected.length}</span> / {ENTITIES.length} selected
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={selectAll}
              className="h-8 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold transition"
            >
              Select All
            </button>
            <button
              onClick={selectNone}
              className="h-8 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-extrabold transition"
            >
              None
            </button>
          </div>
        </div>

        {/* Entity picker */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ENTITIES.map((e) => {
            const active = selected.includes(e.key);
            const Icon = e.icon;
            return (
              <button
                key={e.key}
                onClick={() => toggle(e.key)}
                className={[
                  'relative p-3 rounded-2xl border-2 text-left transition-all active:scale-95',
                  active
                    ? 'border-emerald-500 dark:border-emerald-500/60 bg-emerald-50 dark:bg-emerald-500/15 shadow-md ring-2 ring-emerald-200 dark:ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600',
                ].join(' ')}
              >
                {active && (
                  <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </div>
                )}
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center mb-2 ${
                  active ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className={`text-sm font-extrabold ${active ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}>
                  {e.label}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">{e.desc}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <Button
            onClick={() => exportMutation.mutate()}
            loading={exportMutation.isPending}
            disabled={selected.length === 0 || exportMutation.isPending}
            className="w-full sm:w-auto h-12 px-6 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 font-extrabold shadow-lg shadow-emerald-500/30"
          >
            {exportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download {selected.length} categor{selected.length === 1 ? 'y' : 'ies'} as {format.toUpperCase()}
          </Button>
        </div>
      </SectionCard>

      {/* Auto backup */}
      <SectionCard
        title="Automatic Backups"
        desc="Daily cloud backups — coming soon"
        icon={HardDrive}
        color="violet"
      >
        <Alert tone="violet" icon={CalendarClock} title="🔜 Coming in next release">
          Automatic daily backups to Google Drive / Dropbox / AWS S3 — poora data safe, kabhi bhi restore.
          Abhi ke liye manual export use karein — hafta me ek dafa recommend hai.
        </Alert>
      </SectionCard>
    </div>
  );
}
