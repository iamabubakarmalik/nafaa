import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Database, Download, HardDrive } from 'lucide-react';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { Button } from '@core/ui/Button';
import { SectionCard } from '../components/UI';

const ENTITIES = [
  { key: 'products', label: 'Products', emoji: '📦' },
  { key: 'customers', label: 'Customers', emoji: '👥' },
  { key: 'suppliers', label: 'Suppliers', emoji: '🚚' },
  { key: 'sales', label: 'Sales', emoji: '💰' },
  { key: 'purchases', label: 'Purchases', emoji: '🛒' },
  { key: 'expenses', label: 'Expenses', emoji: '📉' },
  { key: 'categories', label: 'Categories', emoji: '🏷️' },
  { key: 'settings', label: 'Settings', emoji: '⚙️' },
];

export default function BackupSection() {
  const { data: stats } = useQuery({ queryKey: ['backup-stats'], queryFn: settingsApi.backupStats });
  const [selected, setSelected] = useState<string[]>(ENTITIES.map((e) => e.key));

  const exportMutation = useMutation({
    mutationFn: () => settingsApi.exportData(selected, 'json'),
    onSuccess: (data: any) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nafaa-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup download ho gaya ✅');
    },
    onError: () => toast.error('Export fail'),
  });

  const toggle = (key: string) => {
    setSelected((s) => s.includes(key) ? s.filter((x) => x !== key) : [...s, key]);
  };

  return (
    <div className="space-y-5">
      <SectionCard title="Data Overview" desc="Aap ka data at a glance" icon={Database} color="blue">
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Products', value: stats.products, emoji: '📦' },
              { label: 'Customers', value: stats.customers, emoji: '👥' },
              { label: 'Sales', value: stats.sales, emoji: '💰' },
              { label: 'Purchases', value: stats.purchases, emoji: '🛒' },
              { label: 'Expenses', value: stats.expenses, emoji: '📉' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-slate-50 border-2 border-slate-100 p-3">
                <div className="text-2xl">{s.emoji}</div>
                <div className="text-2xl font-black text-slate-900 tabular-nums mt-1">{s.value}</div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Export Data" desc="Apna data JSON format mein download karein" icon={Download} color="blue">
        <div className="text-xs text-slate-600 font-medium mb-3">Konsa data export karna hai?</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {ENTITIES.map((e) => {
            const active = selected.includes(e.key);
            return (
              <button
                key={e.key}
                onClick={() => toggle(e.key)}
                className={`p-3 rounded-xl border-2 text-left transition ${
                  active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="text-xl">{e.emoji}</div>
                <div className={`text-xs font-black mt-1 ${active ? 'text-blue-700' : 'text-slate-700'}`}>{e.label}</div>
              </button>
            );
          })}
        </div>
        <Button
          onClick={() => exportMutation.mutate()}
          loading={exportMutation.isPending}
          disabled={selected.length === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          Export {selected.length} categor{selected.length === 1 ? 'y' : 'ies'}
        </Button>
      </SectionCard>

      <SectionCard title="Auto Backup" desc="Automatic daily backups (coming soon)" icon={HardDrive} color="blue">
        <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 text-xs text-amber-900 font-medium">
          🔜 Automatic daily backups to cloud storage — coming in next release
        </div>
      </SectionCard>
    </div>
  );
}
