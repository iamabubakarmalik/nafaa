/**
 * Import ads spend from a Meta, TikTok or Google ads manager export (CSV or
 * Excel). Columns are found by their header; a column that is not found can
 * be picked by hand. The preview shows each day and campaign as new, already
 * there, or changed, and only new and changed rows are saved.
 */

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { BrandLogo, brandForChannel } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { useIsAllShops } from '@core/stores/auth.store';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import {
  ADS_AFFECTED_KEYS, AD_PLATFORMS, adsApi, apiError, type AdColumnMap, type AdField, type AdImportPreview, type AdPlatform, type AdsSetup,
} from '../api/growth.api';
import { PLATFORM, dayLabel, rs } from './meta';

const FIELD: Record<AdField, string> = { date: 'Date / Day', spend: 'Kharcha (Amount spent / Cost)', campaign: 'Campaign', orders: 'Orders (Purchases / Conversions)' };
const STATUS = {
  new: { label: 'Naya', cls: 'bg-success-50 text-success-800' },
  changed: { label: 'Badla', cls: 'bg-amber-50 text-amber-800' },
  same: { label: 'Pehle se', cls: 'bg-slate-100 text-slate-500' },
  future: { label: 'Aage ki date', cls: 'bg-rose-50 text-rose-700' },
  manual: { label: 'Haath wali entry badlegi', cls: 'bg-sky-50 text-sky-800' },
} as const;

/** First sheet; the header is the first row with at least two filled cells. */
async function readFile(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const wb = XLSX.read(await file.arrayBuffer());
  const all = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false }) as unknown[][];
  const filled = (r: unknown[]) => r.filter((c) => String(c ?? '').trim() !== '').length;
  const h = all.findIndex((r) => filled(r) >= 2);
  if (h < 0) throw new Error('File me column wali row nahi mili');
  return {
    headers: all[h].map((c) => String(c ?? '').trim()),
    rows: all.slice(h + 1).filter((r) => filled(r) > 0).map((r) => r.map((c) => String(c ?? '').trim())),
  };
}

export function AdsImportModal({ setup, onClose }: { setup: AdsSetup | undefined; onClose: () => void }) {
  const qc = useQueryClient();
  const allShops = useIsAllShops();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; headers: string[]; rows: string[][] } | null>(null);
  const [platform, setPlatform] = useState<AdPlatform | null>(null);
  const [mapping, setMapping] = useState<AdColumnMap>({});
  const [preview, setPreview] = useState<AdImportPreview | null>(null);
  const [channelId, setChannelId] = useState('');
  const [shopId, setShopId] = useState('');
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000, enabled: allShops });
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive);

  const read = useMutation({
    mutationFn: (v: { file: NonNullable<typeof file>; platform: AdPlatform | null; mapping: AdColumnMap }) =>
      adsApi.importPreview({ headers: v.file.headers, rows: v.file.rows, ...(v.platform && { platform: v.platform }), mapping: v.mapping }),
    onSuccess: (p) => { setPreview(p); setMapping(p.map); },
    onError: (e) => toast.error(apiError(e, 'File nahi parhi gayi')),
  });
  const save = useMutation({
    mutationFn: () => adsApi.importApply({
      platform: preview!.platform, rows: preview!.rows.filter((r) => r.status === 'new' || r.status === 'changed' || r.status === 'manual'),
      integrationId: channelId || null, ...(allShops && (shopId || shops[0]?.id) && { shopId: shopId || (shops.find((s) => s.isMain) ?? shops[0]).id }),
    }),
    onSuccess: (r) => {
      toast.success(`${r.added} nayi, ${r.changed} badli entries${r.expenses ? ` · ${r.expenses} din Expenses me gaye` : ''}`);
      ADS_AFFECTED_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Import nahi hua')),
  });

  const onFile = async (f: File) => {
    try {
      const parsed = await readFile(f);
      if (!parsed.rows.length) throw new Error('File me koi row nahi');
      const next = { name: f.name, ...parsed };
      setFile(next);
      setMapping({});
      setPreview(null);
      // Platform is guessed from the headers the first time.
      read.mutate({ file: next, platform, mapping: {} });
    } catch (e) {
      toast.error((e as Error).message || 'File nahi parhi gayi');
    }
  };
  const again = (p: AdPlatform | null, m: AdColumnMap) => { if (file) read.mutate({ file, platform: p, mapping: m }); };
  const toSave = preview?.rows.filter((r) => r.status === 'new' || r.status === 'changed' || r.status === 'manual') ?? [];

  return (
    <Modal open onClose={onClose} size="xl" closeOnBackdrop={false} title="Ads ka kharcha import karein"
      description="Meta (Facebook/Instagram), TikTok ya Google ads manager se report download karein (CSV ya Excel), din ke hisaab se"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!toSave.length}>{toSave.length ? `${toSave.length} rows import karein` : 'Import karein'}</Button>
      </>}>
      <div className="space-y-4">
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ''; }} />
        <button type="button" onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void onFile(f); }}
          className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-left transition hover:border-brand-400 hover:bg-brand-50/40">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 ring-1 ring-slate-200">{file ? <FileSpreadsheet className="h-5 w-5" /> : <Upload className="h-5 w-5" />}</span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-slate-900">{file ? file.name : 'File chunein ya yahan chhorein'}</span>
            <span className="block text-[0.75rem] text-slate-500">{file ? `${file.rows.length} rows · ${file.headers.length} columns` : 'Report me "Day" ka breakdown rakhein taake har din ka kharcha alag aaye'}</span>
          </span>
        </button>

        {preview && (<>
          <div>
            <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Platform</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {AD_PLATFORMS.map((p) => (
                <button key={p} type="button" onClick={() => { setPlatform(p); again(p, mapping); }} aria-pressed={preview.platform === p}
                  className={cn('flex h-10 items-center gap-2 rounded-xl px-2.5 text-[0.8125rem] font-semibold ring-1',
                    preview.platform === p ? 'bg-brand-50 text-brand-900 ring-2 ring-brand-500' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                  <BrandLogo name={PLATFORM[p].brand} size={20} /><span className="truncate">{PLATFORM[p].short}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={cn('rounded-2xl p-3 ring-1', preview.needs.length ? 'bg-amber-50 ring-amber-200' : 'bg-slate-50 ring-slate-200')}>
            <p className="text-[0.8125rem] font-semibold text-slate-900">{preview.needs.length ? 'Ye columns khud chunein' : 'Columns mil gaye'}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(Object.keys(FIELD) as AdField[]).map((f) => (
                <label key={f} className="text-[0.75rem] font-medium text-slate-600">
                  {FIELD[f]}{(f === 'date' || f === 'spend') && <span className="text-rose-600"> *</span>}
                  <select value={mapping[f] ?? ''} onChange={(e) => { const m = { ...mapping, [f]: e.target.value === '' ? undefined : Number(e.target.value) }; setMapping(m); again(preview.platform, m); }}
                    className={cn('mt-1 h-9 w-full rounded-lg border bg-white px-2 text-[0.8125rem] text-slate-900', preview.needs.includes(f) ? 'border-amber-400' : 'border-slate-200')}>
                    <option value="">— nahi —</option>
                    {preview.headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </div>

          {(setup?.channels.length ?? 0) > 0 && (
            <div>
              <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Ye ads kis channel ke liye the? (agar ek hi ho)</p>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setChannelId('')} className={cn('h-9 rounded-xl px-3 text-[0.8125rem] font-semibold ring-1', !channelId ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>Sab</button>
                {setup!.channels.map((c) => (
                  <button key={c.id} type="button" onClick={() => setChannelId(c.id)}
                    className={cn('inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[0.8125rem] font-semibold ring-1', channelId === c.id ? 'bg-brand-50 text-brand-900 ring-2 ring-brand-500' : 'bg-white text-slate-700 ring-slate-200')}>
                    <BrandLogo name={brandForChannel(c.type, { platform: c.platform })} size={18} />{c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {allShops && shops.length > 1 && (
            <label className="block text-[0.8125rem] font-medium text-slate-700">Branch
              <select value={shopId || (shops.find((s) => s.isMain) ?? shops[0]).id} onChange={(e) => setShopId(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          )}

          {preview.rows.length > 0 && (
            <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
              <div className="flex flex-wrap gap-x-4 gap-y-1 bg-slate-50 px-3 py-2 text-[0.8125rem]">
                <span className="font-semibold text-slate-900">{preview.rows.length} rows · {rs(preview.total)}</span>
                {preview.skipped > 0 && <span className="text-slate-500">{preview.skipped} rows chhor di (total ya khali)</span>}
              </div>
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-[0.8125rem]">
                  <thead className="sticky top-0 bg-white text-left text-[0.75rem] text-slate-500 shadow-[0_1px_0_#e2e8f0]">
                    <tr><th className="px-3 py-2 font-medium">Date</th><th className="px-2 py-2 font-medium">Campaign</th><th className="px-2 py-2 text-right font-medium">Kharcha</th><th className="px-2 py-2 text-right font-medium">Orders</th><th className="px-3 py-2 font-medium" /></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.rows.slice(0, 300).map((r) => (
                      <tr key={r.importKey}>
                        <td className="whitespace-nowrap px-3 py-1.5 text-slate-700">{dayLabel(r.day)}</td>
                        <td className="max-w-[14rem] truncate px-2 py-1.5 text-slate-600">{r.campaign ?? '—'}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-slate-900">{rs(r.amount)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">{r.orders ?? '—'}</td>
                        <td className="px-3 py-1.5 text-right"><span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', STATUS[r.status ?? 'new'].cls)}>{STATUS[r.status ?? 'new'].label}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <p className="text-[0.75rem] text-slate-500">
            {setup?.postExpenses ? 'Nayi entries "Ads / marketing" Expense me bhi jayengi (har din aur platform ka ek Expense).' : 'Setting band hai — ye kharcha Expenses me nahi jayega, sirf ROAS ke liye.'}
            {' '}Wohi file dobara import karne se kuch double nahi hota.
          </p>
        </>)}
      </div>
    </Modal>
  );
}
