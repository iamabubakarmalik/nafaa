/**
 * Small pieces shared by the Marketing workspace pages: number format,
 * the lightbulb guide button, temperature badge, whole-list CSV export and a
 * themed trend chart.
 */

import { useEffect, useMemo, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Button, Input, Modal, type BadgeVariant, heroButton } from '@/design-system/components';
import { useAppearanceStore } from '@/design-system';
import { apiClient } from '@/api/client';
import { downloadCsv, fetchAllPages, type CsvColumn } from '@/ui';


/** Lightbulb button that opens the page guide. */
export function GuideButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={heroButton} onClick={onClick} aria-label="How this page works (G)">
      <Lightbulb className="h-4 w-4" />
    </button>
  );
}

const TEMP: Record<string, { variant: BadgeVariant; label: string }> = {
  COLD: { variant: 'info', label: 'Cold' },
  WARM: { variant: 'warning', label: 'Warm' },
  HOT: { variant: 'accent', label: 'Hot' },
  FIRE: { variant: 'danger', label: 'Fire' },
};

export function TemperatureBadge({ value }: { value: string }) {
  const t = TEMP[value] ?? TEMP.COLD;
  return <Badge variant={t.variant}>{t.label}</Badge>;
}

/** Exports every page of a server-side list (up to 10,000 rows) as CSV. */
export async function exportList<T>(
  name: string,
  fetchPage: (page: number) => Promise<{ items: T[]; meta: { totalPages: number } }>,
  columns: CsvColumn<T>[],
  setBusy: (busy: boolean) => void,
) {
  setBusy(true);
  try {
    const all = await fetchAllPages(fetchPage);
    downloadCsv(name, all, columns);
    toast.success(`${num(all.length)} rows exported`);
  } catch {
    toast.error('Export failed. Try again.');
  } finally {
    setBusy(false);
  }
}

import { useChartColors } from '@/ui/chart';
import { num } from '@/lib/format';

export { useChartColors };

const shortDate = (key: string) => (/^\d{4}-\d{2}-\d{2}/.test(key) ? new Date(`${key.slice(0, 10)}T00:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : key);

/** Area or bar chart over a list of rows, themed like the platform dashboard. */
export function TrendChart({ data, xKey, yKey, label, bar, height = 256 }: {
  data: any[]; xKey: string; yKey: string; label: string; bar?: boolean; height?: number;
}) {
  const c = useChartColors();
  const axis = { stroke: c.text, fontSize: 11, tickLine: false, axisLine: false } as const;
  const tip = <Tooltip cursor={{ fill: 'rgba(100,116,139,0.08)' }} contentStyle={{ borderRadius: 12, border: `1px solid ${c.grid}`, fontSize: 12 }} labelFormatter={(l) => shortDate(String(l))} formatter={(v) => [Number(v).toLocaleString('en-PK'), label]} />;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {bar ? (
          <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tickFormatter={shortDate} minTickGap={24} {...axis} />
            <YAxis width={44} allowDecimals={false} {...axis} />
            {tip}
            <Bar dataKey={yKey} fill={c.line} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="mkt-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.line} stopOpacity={0.28} />
                <stop offset="100%" stopColor={c.line} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tickFormatter={shortDate} minTickGap={24} {...axis} />
            <YAxis width={44} allowDecimals={false} {...axis} />
            {tip}
            <Area type="monotone" dataKey={yKey} stroke={c.line} strokeWidth={2} fill="url(#mkt-fill)" />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/** Small dialog that asks for one line of text (a reason, a tag name…). */
export function PromptModal({ open, title, label, placeholder, confirmLabel = 'Save', danger, onSubmit, onClose }: {
  open: boolean; title: string; label: string; placeholder?: string; confirmLabel?: string; danger?: boolean;
  onSubmit: (value: string) => void; onClose: () => void;
}) {
  const [value, setValue] = useState('');
  useEffect(() => { if (open) setValue(''); }, [open]);
  const submit = () => { if (value.trim()) { onSubmit(value.trim()); onClose(); } };
  return (
    <Modal open={open} onClose={onClose} size="sm" title={title}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} disabled={!value.trim()} onClick={submit}>{confirmLabel}</Button>
      </>}>
      <Input label={label} value={value} placeholder={placeholder} autoFocus onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
    </Modal>
  );
}

/** Downloads a CSV the API builds itself (used by the Exports page). */
export async function downloadServerCsv(url: string, filename: string) {
  try {
    const res = await apiClient.get(url, { responseType: 'blob' });
    const href = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    toast.success('Download started');
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? 'Download failed. Try again.');
  }
}

export { num };
