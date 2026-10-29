/**
 * Excel / CSV import into a price list. The file is read in the browser, the
 * columns are guessed from the headers (code or SKU, name, pack, rate, min
 * qty) and can be changed, the first rows are shown as a preview, and only
 * then are the rows sent. The answer lists rows that did not match an item.
 */

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { Alert, Button, Modal, Select, Table, TBody, THead, Td, Th, Tr } from '@/design-system/components';
import { downloadCsv } from '@core/lib/csv';
import { DIST_KEY, distError, distSetupApi, type PriceImportResult, type PriceImportRow, type PriceList } from '../../api/distribution.api';
import { rs } from '../../lib/meta';

type Field = 'code' | 'name' | 'unitName' | 'price' | 'minQty';
const FIELDS: Array<{ id: Field; label: string; guess: RegExp }> = [
  { id: 'code', label: 'Code / SKU / barcode', guess: /code|sku|barcode/i },
  { id: 'name', label: 'Item ka naam', guess: /name|naam|item|product/i },
  { id: 'unitName', label: 'Pack (Carton, Dozen)', guess: /pack|unit|carton/i },
  { id: 'price', label: 'Rate', guess: /price|rate|daam|qeemat/i },
  { id: 'minQty', label: 'Min qty', guess: /min|qty/i },
];
const PREVIEW = 30;

async function readFile(f: File): Promise<{ headers: string[]; rows: string[][] }> {
  const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const all = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, raw: false });
  const filled = (r: unknown[]) => r.filter((c) => String(c ?? '').trim()).length;
  const h = all.findIndex((r) => filled(r) >= 2);
  if (h < 0) throw new Error('File me headings wali line nahi mili');
  return {
    headers: all[h].map((c) => String(c ?? '').trim()),
    rows: all.slice(h + 1).filter((r) => filled(r) > 0).map((r) => r.map((c) => String(c ?? '').trim())),
  };
}

const toNum = (s: string | undefined) => {
  const n = Number(String(s ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : NaN;
};

export function PriceImportModal({ list, onClose }: { list: PriceList; onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; headers: string[]; rows: string[][] } | null>(null);
  const [map, setMap] = useState<Partial<Record<Field, number>>>({});
  const [result, setResult] = useState<PriceImportResult | null>(null);

  const onFile = async (f: File) => {
    try {
      const parsed = await readFile(f);
      if (!parsed.rows.length) throw new Error('File me koi row nahi');
      const guess: Partial<Record<Field, number>> = {};
      for (const fd of FIELDS) {
        const i = parsed.headers.findIndex((h, j) => fd.guess.test(h) && !Object.values(guess).includes(j));
        if (i >= 0) guess[fd.id] = i;
      }
      setFile({ name: f.name, ...parsed });
      setMap(guess);
      setResult(null);
    } catch (e) {
      toast.error((e as Error).message || 'File nahi parhi gayi');
    }
  };

  const rows = useMemo<Array<PriceImportRow & { ok: boolean }>>(() => {
    if (!file) return [];
    const at = (r: string[], f: Field) => (map[f] != null ? r[map[f]!] ?? '' : '');
    return file.rows.map((r) => {
      const price = toNum(at(r, 'price'));
      const mq = toNum(at(r, 'minQty'));
      const row: PriceImportRow = {
        ...(at(r, 'code') && { code: at(r, 'code') }),
        ...(at(r, 'name') && { name: at(r, 'name') }),
        ...(at(r, 'unitName') && { unitName: at(r, 'unitName') }),
        price: Number.isFinite(price) ? price : 0,
        ...(Number.isFinite(mq) && mq > 0 && { minQty: mq }),
      };
      return { ...row, ok: (!!row.code || !!row.name) && Number.isFinite(price) };
    });
  }, [file, map]);
  const good = rows.filter((r) => r.ok);
  const mapped = map.price != null && (map.code != null || map.name != null);

  const send = useMutation({
    mutationFn: () => distSetupApi.importPrices(list.id, good.map(({ ok: _ok, ...r }) => r)),
    onSuccess: (r) => {
      setResult(r);
      [['price-grid', list.id], ['price-items', list.id], ['price-lists']].forEach((k) => qc.invalidateQueries({ queryKey: [DIST_KEY, ...k] }));
      toast.success(`${r.saved} rates save hue`);
    },
    onError: (e) => toast.error(distError(e, 'Import nahi hua')),
  });

  const sample = () => downloadCsv(`${list.name}-rates.csv`, [
    ['Code', 'Naam', 'Pack', 'Rate', 'Min qty'],
    ['8964000123456', 'Banaspati Ghee 1kg', 'Carton', 11498, ''],
    ['', 'Banaspati Ghee 1kg', '', 494, ''],
    ['', 'Banaspati Ghee 1kg', 'Carton', 11300, 10],
  ]);

  return (
    <Modal open onClose={onClose} size="xl" closeOnBackdrop={false} title={`${list.name} — Excel se rates`}
      description="Har line: item (code, SKU, barcode ya poora naam), pack (khali = khula piece), rate. Rate 0 likhein to woh line rule par chali jati hai."
      footer={result ? <Button onClick={onClose}>Theek hai</Button> : <>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button data-save-action disabled={!mapped || !good.length} loading={send.isPending} onClick={() => send.mutate()}>
          {good.length ? `${good.length} rows import karein` : 'Import karein'}
        </Button>
      </>}>
      {result ? (
        <div className="space-y-3">
          <Alert tone={result.unmatched.length ? 'warning' : 'success'} icon={<CheckCircle2 className="h-4 w-4" />}
            title={`${result.saved} rate save · ${result.matched} rows mil gayin${result.removed ? ` · ${result.removed} rule par wapas` : ''}`}>
            {result.unmatched.length ? `${result.unmatched.length} rows nahi milin — neeche dekhein, file theek karke dobara import karein.` : 'Sab rows mil gayin.'}
          </Alert>
          {result.unmatched.length > 0 && (
            <ul className="max-h-72 divide-y divide-slate-100 overflow-auto rounded-xl ring-1 ring-slate-200">
              {result.unmatched.slice(0, 200).map((u) => (
                <li key={u.row} className="flex gap-3 px-3 py-2 text-[0.8125rem]">
                  <span className="w-16 shrink-0 font-semibold tabular-nums text-slate-500">Row {u.row}</span>
                  <span className="min-w-0 text-slate-800">{good[u.row - 1]?.code || good[u.row - 1]?.name || '—'} <span className="text-rose-700">— {u.reason}</span></span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ''; }} />
          <div className="flex flex-wrap items-stretch gap-2">
            <button type="button" onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void onFile(f); }}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-left transition hover:border-brand-400 hover:bg-brand-50/40">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 ring-1 ring-slate-200">{file ? <FileSpreadsheet className="h-5 w-5" /> : <Upload className="h-5 w-5" />}</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-slate-900">{file ? file.name : 'File chunein ya yahan chhorein'}</span>
                <span className="block text-[0.75rem] text-slate-500">{file ? `${file.rows.length} rows · ${file.headers.length} columns` : 'Excel (.xlsx) ya CSV'}</span>
              </span>
            </button>
            <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={sample} className="self-center">Sample file</Button>
          </div>

          {file && (<>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {FIELDS.map((fd) => (
                <Select key={fd.id} size="sm" label={fd.label} value={map[fd.id] != null ? String(map[fd.id]) : ''}
                  onChange={(e) => setMap((m) => ({ ...m, [fd.id]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                  options={[{ value: '', label: '— nahi —' }, ...file.headers.map((h, i) => ({ value: String(i), label: h || `Column ${i + 1}` }))]} />
              ))}
            </div>
            {!mapped && <Alert tone="warning">Rate aur (code ya naam) ka column chunein.</Alert>}
            {mapped && (
              <div>
                <p className="mb-1.5 text-[0.75rem] text-slate-500">Pehli {Math.min(PREVIEW, rows.length)} rows · {good.length} theek, {rows.length - good.length} adhoori (chhor di jayengi)</p>
                <div className="max-h-80 overflow-auto rounded-xl ring-1 ring-slate-200">
                  <Table minWidth="36rem">
                    <THead><Tr><Th>#</Th><Th>Code</Th><Th>Naam</Th><Th>Pack</Th><Th align="right">Rate</Th><Th align="right">Min qty</Th></Tr></THead>
                    <TBody>
                      {rows.slice(0, PREVIEW).map((r, i) => (
                        <Tr key={i} className={r.ok ? undefined : 'bg-rose-50/60'}>
                          <Td className="tabular-nums text-slate-400">{i + 1}</Td>
                          <Td className="font-mono text-[0.75rem]">{r.code ?? '—'}</Td>
                          <Td className="max-w-[16rem] truncate">{r.name ?? '—'}</Td>
                          <Td>{r.unitName ?? <span className="text-slate-400">khula</span>}</Td>
                          <Td align="right" className="tabular-nums font-semibold">{r.price > 0 ? rs(r.price) : <span className="text-amber-700">Rule par</span>}</Td>
                          <Td align="right" className="tabular-nums">{r.minQty ?? '—'}</Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
              </div>
            )}
          </>)}
        </div>
      )}
    </Modal>
  );
}
