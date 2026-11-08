/**
 * Excel tab: upload an .xlsx or .csv of orders, check the preview, and
 * create them as manual orders (up to 500 rows). Columns are found by their
 * header names; a sample file shows the expected layout.
 */

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from 'lucide-react';
import { Button, Card } from '@/design-system/components';
import { apiErrorMessage } from '../../../api/online-orders.api';
import { orderBoardApi, type ImportRow, type ImportRowResult } from '../../../api/order-board.api';
import { downloadCsv } from '../../../lib/orders';
import { useBoardRefresh } from '../useMoveOrder';
import { t } from '@core/i18n';

const MAX_ROWS = 500;
type Field = keyof ImportRow;

/** Header words for each field (lower case, spaces and symbols removed). */
const HEADERS: Record<Field, string[]> = {
  name: ['name', 'customer', 'customername', 'naam', 'consignee', 'consigneename'],
  phone: ['phone', 'mobile', 'contact', 'number', 'phoneno', 'cell', 'whatsapp', 'consigneephone'],
  address: ['address', 'shippingaddress', 'pata', 'consigneeaddress'],
  city: ['city', 'shehar', 'destination', 'destinationcity'],
  product: ['product', 'item', 'productname', 'itemname', 'cheez'],
  sku: ['sku', 'code', 'productcode', 'barcode'],
  qty: ['qty', 'quantity', 'pieces', 'pcs'],
  price: ['price', 'rate', 'unitprice'],
  cod: ['cod', 'codamount', 'amount', 'total', 'collect'],
  notes: ['notes', 'note', 'remarks', 'comment', 'instructions'],
};
const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z]/g, '');

function mapRows(all: unknown[][]): { rows: ImportRow[]; found: Field[] } {
  const head = (all[0] ?? []).map(norm);
  const col = Object.fromEntries((Object.keys(HEADERS) as Field[]).map((f) => [f, head.findIndex((h) => HEADERS[f].includes(h))])) as Record<Field, number>;
  const found = (Object.keys(col) as Field[]).filter((f) => col[f] >= 0);
  const text = (r: unknown[], f: Field) => (col[f] >= 0 ? String(r[col[f]] ?? '').trim() : '');
  const num = (r: unknown[], f: Field) => { const v = Number(text(r, f).replace(/[^0-9.]/g, '')); return Number.isFinite(v) && text(r, f) ? v : undefined; };
  const rows = all.slice(1)
    .map((r) => ({
      name: text(r, 'name'), phone: text(r, 'phone'), address: text(r, 'address') || undefined, city: text(r, 'city') || undefined,
      product: text(r, 'product') || undefined, sku: text(r, 'sku') || undefined, qty: num(r, 'qty'), price: num(r, 'price'), cod: num(r, 'cod'),
      notes: text(r, 'notes') || undefined,
    }))
    .filter((r) => r.name || r.phone);
  return { rows, found };
}

export function ExcelTab({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const refresh = useBoardRefresh();
  const [file, setFile] = useState<{ name: string; rows: ImportRow[]; found: Field[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ImportRowResult[] | null>(null);

  const onFile = async (f: File) => {
    try {
      const wb = XLSX.read(await f.arrayBuffer());
      const all = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false }) as unknown[][];
      const m = mapRows(all);
      if (!m.found.includes('name') || !m.found.includes('phone')) { toast.error(t('File me "Name" aur "Phone" ke columns chahiye')); return; }
      setFile({ name: f.name, ...m });
      setResults(null);
    } catch {
      toast.error(t('File nahi khuli — .xlsx ya .csv chunein'));
    }
  };
  const sample = () => downloadCsv('nafaa-orders-sample.csv', [
    ['Name', 'Phone', 'Address', 'City', 'Product', 'SKU', 'Qty', 'Price', 'COD', 'Notes'],
    ['Ali Raza', '03001234567', 'House 12, Street 4, Gulberg', 'Lahore', 'Black shirt', 'SH-BLK-M', 2, 1500, 3200, ''],
  ]);
  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const r = await orderBoardApi.importRows(file.rows.slice(0, MAX_ROWS));
      setResults(r.results);
      const ok = r.results.filter((x) => x.ok).length;
      if (ok) toast.success(t('{{count}} orders ban gaye', { count: ok }));
      if (ok < r.results.length) toast.error(t('{{count}} rows me masla — neeche dekhein', { count: r.results.length - ok }));
      refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const failed = results?.filter((x) => !x.ok) ?? [];
  return (
    <Card title={t('Excel se orders')} description={t('Har row ek order. Columns: Name, Phone, Address, City, Product ya SKU, Qty, Price, COD, Notes.')}>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ''; }} />
      <div className="flex flex-wrap gap-2">
        <Button leftIcon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>{file ? t('Doosri file') : t('File chunein')}</Button>
        <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={sample}>{t('Sample file')}</Button>
      </div>

      {file && (
        <div className="mt-4 space-y-3">
          <p className="flex items-center gap-2 text-[0.8125rem] text-slate-600">
            <FileSpreadsheet className="h-4 w-4 text-success-600" />
            {t('{{file}} · {{count}} orders', { file: file.name, count: file.rows.length })}
            {file.rows.length > MAX_ROWS && <span className="font-semibold text-rose-600">{t('· pehle {{max}} hi banenge', { max: MAX_ROWS })}</span>}
          </p>
          <div className="max-h-80 overflow-auto rounded-xl ring-1 ring-slate-200">
            <table className="w-full min-w-[40rem] text-[0.75rem]">
              <thead className="sticky top-0 bg-slate-50 text-start text-slate-500">
                <tr>{['#', t('Naam'), t('Phone'), t('Shehar'), t('Cheez'), t('Qty'), 'COD'].map((h) => <th key={h} className="px-2.5 py-2 text-start font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {file.rows.slice(0, 100).map((r, i) => {
                  const res = results?.find((x) => x.row === i);
                  return (
                    <tr key={i} className={res && !res.ok ? 'bg-rose-50/60' : undefined}>
                      <td className="px-2.5 py-1.5 text-slate-400">
                        {res ? (res.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-success-600" /> : <XCircle className="h-3.5 w-3.5 text-rose-600" />) : i + 2}
                      </td>
                      <td className="max-w-[10rem] truncate px-2.5 py-1.5 text-slate-800">{r.name}</td>
                      <td className="px-2.5 py-1.5 tabular-nums">{r.phone}</td>
                      <td className="px-2.5 py-1.5">{r.city}</td>
                      <td className="max-w-[12rem] truncate px-2.5 py-1.5">{r.product ?? r.sku}</td>
                      <td className="px-2.5 py-1.5 tabular-nums">{r.qty ?? 1}</td>
                      <td className="px-2.5 py-1.5 tabular-nums">{r.cod ?? ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {failed.length > 0 && (
            <ul className="space-y-0.5 text-[0.75rem] text-rose-700">
              {failed.slice(0, 10).map((f) => <li key={f.row}>{t('Row {{row}}: {{error}}', { row: f.row + 2, error: f.error ?? '' })}</li>)}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            {!results && <Button loading={busy} onClick={() => void run()}>{t('{{count}} orders banayein', { count: Math.min(file.rows.length, MAX_ROWS) })}</Button>}
            {results && <Button variant="secondary" onClick={onDone}>{t('Orders dekhein')}</Button>}
          </div>
        </div>
      )}
    </Card>
  );
}
