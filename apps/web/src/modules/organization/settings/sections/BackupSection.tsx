/**
 * Data download: how many records the store holds, and a download of the
 * chosen record types as one JSON file, one Excel workbook (a sheet per type)
 * or CSV files (one per type). The full backup and dated Excel exports have
 * their own pages; this one links to them.
 */

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Check, Database, DollarSign, Download, FileJson, FileSpreadsheet, FileText, History, Package, Settings as SettingsIcon,
  ShoppingCart, Tag, TrendingDown, Truck, Users,
} from 'lucide-react';
import { cn } from '@core/lib/cn';
import { downloadCsv, type CsvCell } from '@core/lib/csv';
import { Badge, Button, Skeleton } from '@/design-system/components';
import { settingsApi } from '../api/settings.api';
import { ChoiceGroup, Divider, Field, PageLink, SectionCard } from '../components/SettingsBlocks';
import { t } from '@core/i18n';

const ENTITIES: Array<{ key: string; label: string; icon: typeof Package; desc: string; counted?: boolean }> = [
  { key: 'products', label: t('Products'), icon: Package, desc: t('Sab items aur variants'), counted: true },
  { key: 'customers', label: t('Customers'), icon: Users, desc: t('Contact aur balance'), counted: true },
  { key: 'suppliers', label: t('Suppliers'), icon: Truck, desc: t('Suppliers ki list') },
  { key: 'sales', label: t('Sales'), icon: DollarSign, desc: t('Sab bills aur un ki lines'), counted: true },
  { key: 'purchases', label: t('Purchases'), icon: ShoppingCart, desc: t('Purchase aur un ki lines'), counted: true },
  { key: 'expenses', label: t('Expenses'), icon: TrendingDown, desc: t('Har Expense ka record'), counted: true },
  { key: 'categories', label: t('Categories'), icon: Tag, desc: t('Product categories') },
  { key: 'settings', label: t('Settings'), icon: SettingsIcon, desc: t('Store ki saari settings') },
];

type Format = 'json' | 'csv' | 'excel';
type Row = Record<string, unknown>;

/** Nested values (bill lines, settings objects) go into one cell as JSON. */
const cellOf = (v: unknown): CsvCell => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : (v as CsvCell));

function tableOf(value: unknown): Row[] {
  if (Array.isArray(value)) return value as Row[];
  return value && typeof value === 'object' ? [value as Row] : [];
}

function columnsOf(rows: Row[]) {
  const cols = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => cols.add(k)));
  return [...cols];
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

async function saveSnapshot(data: Record<string, unknown>, keys: string[], format: Format) {
  const day = new Date().toISOString().slice(0, 10);
  if (format === 'json') {
    saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `nafaa-data-${day}.json`);
    return;
  }
  if (format === 'csv') {
    keys.forEach((k) => {
      const rows = tableOf(data[k]);
      const cols = columnsOf(rows);
      downloadCsv(`nafaa-${k}-${day}.csv`, [cols, ...rows.map((r) => cols.map((c) => cellOf(r[c])))]);
    });
    return;
  }
  const XLSX = await import('xlsx');
  const book = XLSX.utils.book_new();
  keys.forEach((k) => {
    const rows = tableOf(data[k]).map((r) => Object.fromEntries(Object.entries(r).map(([c, v]) => [c, cellOf(v)])));
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows.length ? rows : [{ khaali: '' }]), k.slice(0, 31));
  });
  XLSX.writeFile(book, `nafaa-data-${day}.xlsx`);
}

export function BackupSection() {
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['backup-stats'], queryFn: settingsApi.backupStats, staleTime: 30_000 });
  const [selected, setSelected] = useState<string[]>(ENTITIES.map((e) => e.key));
  const [format, setFormat] = useState<Format>('excel');

  const exportMutation = useMutation({
    mutationFn: async () => {
      const data = await settingsApi.exportData(selected, format);
      await saveSnapshot(data ?? {}, selected, format);
    },
    onSuccess: () => toast.success(t('Download ho gaya ({{count}} cheezein)', { count: selected.length })),
    onError: () => toast.error(t('Download nahi hua — dobara koshish karein')),
  });

  const toggle = (key: string) => setSelected((s) => (s.includes(key) ? s.filter((x) => x !== key) : [...s, key]));
  const totalRecords = ENTITIES.reduce((sum, e) => sum + (e.counted ? Number(stats?.[e.key]) || 0 : 0), 0);

  return (
    <div className="space-y-4">
      <SectionCard title={t('Data ka khulasa')} desc={t('Store me kitna record hai')} icon={Database} color="blue"
        badge={!statsLoading ? <Badge size="xs" variant="success" className="tabular-nums">{t('{{totalRecords}} records', { totalRecords: totalRecords.toLocaleString() })}</Badge> : undefined}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {ENTITIES.filter((e) => e.counted).map((e) => (
            <div key={e.key} className="rounded-lg border border-slate-200 p-3">
              <e.icon className="h-4 w-4 text-slate-400" />
              {statsLoading
                ? <Skeleton className="mt-2 h-6 w-16" />
                : <p className="mt-1.5 text-xl font-bold tabular-nums leading-none text-slate-900">{(Number(stats?.[e.key]) || 0).toLocaleString()}</p>}
              <p className="mt-1 text-xs text-slate-500">{e.label}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t('Data download')} desc={t('Apna data file me lein — accountant ko bhejein ya mehfooz rakhein')} icon={Download} color="emerald">
        <Field label={t('File ki shakal')} hint={format === 'csv' ? t('CSV me har cheez ki alag file aati hai — browser poochhe to "Allow" dabayein.') : format === 'excel' ? t('Ek Excel file, har cheez ki alag sheet.') : t('Ek JSON file — developers aur doosre software ke liye.')}>
          <ChoiceGroup value={format} onChange={(v) => setFormat(v)} columns={3}
            options={[
              { value: 'excel', label: t('Excel'), desc: t('.xlsx — har cheez alag sheet'), icon: FileSpreadsheet },
              { value: 'csv', label: t('CSV'), desc: t('Har cheez ki alag file'), icon: FileText },
              { value: 'json', label: t('JSON'), desc: t('Developers ke liye'), icon: FileJson },
            ]} />
        </Field>

        <Divider label={t('Kya download karein')} />
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500"><span className="font-semibold text-slate-900">{selected.length}</span> {' '}{t('/ {{count}} chuni hain', { count: ENTITIES.length })}</p>
          <div className="flex gap-1.5">
            <Button size="xs" variant="secondary" onClick={() => setSelected(ENTITIES.map((e) => e.key))}>{t('Sab chunein')}</Button>
            <Button size="xs" variant="ghost" onClick={() => setSelected([])}>{t('Koi nahi')}</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ENTITIES.map((e) => {
            const on = selected.includes(e.key);
            return (
              <button key={e.key} type="button" onClick={() => toggle(e.key)} aria-pressed={on}
                className={cn('relative rounded-lg border p-3 text-start shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 active:scale-[0.99]',
                  on ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')}>
                {on && <span className="absolute end-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-brand-fg"><Check className="h-3 w-3" strokeWidth={3} /></span>}
                <e.icon className={cn('h-5 w-5', on ? 'text-brand-700' : 'text-slate-400')} />
                <p className="mt-2 text-sm font-semibold text-slate-900">{e.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{e.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={() => exportMutation.mutate()} loading={exportMutation.isPending} disabled={selected.length === 0}
            leftIcon={<Download className="h-4 w-4" />}>
            {t('{{count}} cheezein {{value}} me download karein', { count: selected.length, value: format === 'excel' ? t('Excel') : format.toUpperCase() })}
          </Button>
          <p className="text-xs text-slate-500">{t('Bari dukaan ka data aane me thora waqt lag sakta hai.')}</p>
        </div>
      </SectionCard>

      <SectionCard title={t('Backup aur exports')} desc={t('Poora backup aur period wali Excel files alag pages par')} icon={History} color="violet">
        <div className="grid gap-2 sm:grid-cols-2">
          <PageLink to="/backup" icon={Database} title={t('Backup')} desc={t('Poore store ki ek file — hafte me ek dafa lein')} />
          <PageLink to="/exports" icon={FileSpreadsheet} title={t('Exports')} desc={t('Kisi bhi period ki Excel files aur history')} />
        </div>
      </SectionCard>
    </div>
  );
}
