/**
 * Roll import for shops starting on Nafaa: an Excel / CSV file with one row
 * per roll (carpet name, design, size, cost and rate per sqft, rack). The
 * server checks every row (product found, roll number free, size given);
 * only checked rows are created, as opening stock in this branch.
 * Products themselves come from the shared product import.
 */

import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, GraduationCap, Layers, Upload, XCircle } from 'lucide-react';
import { Button, Card, KpiCard, KpiRow, PageHero, PageShell, Table, TBody, THead, Td, Th, Tr, heroButton, heroIconButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { useShopParam } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { carpetRollsApi, type BulkImportApplyResponse, type BulkImportPreviewResponse } from '../api/carpet-rolls.api';
import { PIECES_KEY, ROLLS_KEY, SUMMARY_KEY } from '../lib/meta';

const COLUMNS = ['Carpet', 'Design', 'Roll number', 'Design code', 'Chaurai ft', 'Chaurai inch', 'Lambai ft', 'Lambai inch', 'Cost per sqft', 'Rate per sqft', 'Rack', 'Quality', 'Note'];
const KEYS: Record<string, string> = {
  carpet: 'productName', product: 'productName', 'product name': 'productName', design: 'variantName', variant: 'variantName', rang: 'variantName',
  'roll number': 'rollNumber', roll: 'rollNumber', 'design code': 'designCode', 'chaurai ft': 'widthFt', 'width ft': 'widthFt', 'chaurai inch': 'widthInch', 'width inch': 'widthInch',
  'lambai ft': 'lengthFt', 'length ft': 'lengthFt', 'lambai inch': 'lengthInch', 'length inch': 'lengthInch', 'cost per sqft': 'costPerSqft', cost: 'costPerSqft',
  'rate per sqft': 'salePricePerSqft', rate: 'salePricePerSqft', 'sale price': 'salePricePerSqft', rack: 'rackNumber', quality: 'quality', note: 'notes', notes: 'notes',
};
const NUMS = new Set(['widthFt', 'widthInch', 'lengthFt', 'lengthInch', 'costPerSqft', 'salePricePerSqft']);
const MAX_ROWS = 1000;

function toRows(sheet: Array<Record<string, unknown>>) {
  return sheet.map((r) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      const key = KEYS[k.trim().toLowerCase()];
      if (!key || v === '' || v == null) continue;
      out[key] = NUMS.has(key) ? Number(String(v).replace(/[^\d.]/g, '')) || 0 : String(v).trim();
    }
    return out;
  }).filter((r) => r.productName);
}

export default function CarpetBulkImportPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const shopId = useShopParam();
  const guide = usePageGuide();
  const { cost, sales: money } = useMasked();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<BulkImportPreviewResponse | null>(null);
  const [result, setResult] = useState<BulkImportApplyResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const template = () => {
    const ws = XLSX.utils.aoa_to_sheet([COLUMNS, ['Turkish Shaggy', 'Maroon', '', 'TS-21', 12, 0, 100, 0, 150, 250, 'Godown-A', 'Premium', '']]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rolls');
    XLSX.writeFile(wb, 'carpet-rolls-template.xlsx');
  };

  const read = async (file: File) => {
    setFileName(file.name); setPreview(null); setResult(null); setBusy(true);
    try {
      const wb = XLSX.read(await file.arrayBuffer());
      const rows = toRows(XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' }));
      if (!rows.length) { toast.error('File me koi roll nahi mila — template ke columns istemal karein'); return; }
      if (rows.length > MAX_ROWS) { toast.error(`Ek dafa me ${MAX_ROWS} rolls tak`); return; }
      setPreview(await carpetRollsApi.bulkImportPreview(rows, shopId));
    } catch { toast.error('File parhi nahi gayi ya check nahi hui'); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const apply = async () => {
    if (!preview?.validCount) return;
    setBusy(true);
    try {
      const res = await carpetRollsApi.bulkImportApply(preview.rows.filter((r) => r.valid), shopId);
      setResult(res);
      for (const k of [ROLLS_KEY, PIECES_KEY, SUMMARY_KEY, 'products']) void qc.invalidateQueries({ queryKey: [k] });
      if (res.failureCount) toast.error(`${res.successCount} roll bane, ${res.failureCount} nahi bane`);
      else toast.success(`${res.successCount} roll ban gaye`);
    } catch { toast.error('Import nahi hua'); } finally { setBusy(false); }
  };

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Rolls import — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Download, color: '#0891b2', title: '1. Template', text: 'Template download karein — har line ek roll. Carpet ka naam bilkul product jaisa likhein; design ho to Design column me.' },
            { icon: Upload, color: '#7c3aed', title: '2. File chunein', text: 'Excel ya CSV chunein. Nafaa har line check karta hai — ghalat lines laal dikhti hain aur import nahi hotin.' },
            { icon: CheckCircle2, color: '#059669', title: '3. Import', text: 'Sahi lines opening stock ban kar is branch me aa jati hain. Supplier se naya roll Purchase se daalein.' },
          ]}
          shortcuts={[['G', 'guide']]} />
      )}
      <PageHero title="Rolls import" chip={<><FileSpreadsheet />Excel / CSV</>} meta="Pehle se pare rolls ek dafa me — opening stock"
        actions={<>
          <button type="button" onClick={template} className={heroButton}><Download className="h-4 w-4" />Template</button>
          <Link to="/products/bulk-import" className={heroButton}><Layers className="h-4 w-4" /><span className="hidden sm:inline">Products import</span></Link>
          <button type="button" onClick={guide.open} title="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>} />

      <Card className="rounded-3xl">
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 px-6 py-10 text-center">
          <FileSpreadsheet className="h-10 w-10 text-brand-600" />
          <p className="font-semibold text-slate-900">{fileName || 'Excel ya CSV file chunein'}</p>
          <p className="text-[0.8125rem] text-slate-500">Columns: {COLUMNS.join(', ')}</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void read(f); }} />
          <Button onClick={() => fileRef.current?.click()} loading={busy && !preview}><Upload className="h-4 w-4" />File chunein</Button>
        </div>
      </Card>

      {preview && (
        <>
          <KpiRow cols={4}>
            <KpiCard icon={CheckCircle2} color="#059669" label="Sahi lines" value={preview.validCount} hint={`${Math.round(preview.totalSqftToImport)} sqft`} />
            <KpiCard icon={XCircle} color="#e11d48" label="Ghalat lines" value={preview.invalidCount} hint="Import nahi hongi" />
            <KpiCard icon={Layers} color="#0891b2" label="Stock ki cost" value={cost(preview.totalCostToImport)} />
            <KpiCard icon={Layers} color="#7c3aed" label="Bechne par" value={money(preview.totalSaleValueToImport)} />
          </KpiRow>
          <Card className="rounded-3xl" flush title="Check" description="Laal lines theek kar ke file dobara chunein, ya sirf sahi lines import karein"
            actions={result ? <Button onClick={() => navigate('/carpet-rolls')}>Rolls dekhein</Button> : <Button onClick={() => void apply()} loading={busy} disabled={!preview.validCount}>{preview.validCount} roll import karein</Button>}>
            <div className="overflow-x-auto">
              <Table>
                <THead><Tr><Th>#</Th><Th>Carpet</Th><Th>Roll</Th><Th>Size</Th><Th align="right">Sqft</Th><Th align="right">Cost</Th><Th align="right">Rate</Th><Th>Check</Th></Tr></THead>
                <TBody>
                  {preview.rows.map((r) => {
                    const done = result?.results.find((x) => x.index === preview.rows.filter((y) => y.valid).indexOf(r) + 1);
                    return (
                      <Tr key={r.index} className={cn(!r.valid && 'bg-rose-50/60')}>
                        <Td>{r.index}</Td>
                        <Td>{r.productName}{r.variantName && <span className="text-slate-500"> · {r.variantName}</span>}</Td>
                        <Td className="font-mono text-[0.8125rem]">{done?.rollNumber ?? r.rollNumber}</Td>
                        <Td className="whitespace-nowrap">{r.widthFt}ft{r.widthInch ? ` ${r.widthInch}in` : ''} × {r.lengthFt}ft</Td>
                        <Td align="right" className="tabular-nums">{r.totalSqft}</Td>
                        <Td align="right" className="tabular-nums">{r.costPerSqft}</Td>
                        <Td align="right" className="tabular-nums">{r.salePricePerSqft}</Td>
                        <Td className="text-[0.8125rem]">
                          {done ? (done.success ? <span className="text-emerald-700">Ban gaya</span> : <span className="text-rose-700">{done.error}</span>)
                            : r.valid ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Theek{r.warnings.length ? ` · ${r.warnings.join(', ')}` : ''}</span>
                              : <span className="inline-flex items-center gap-1 text-rose-700"><AlertTriangle className="h-3.5 w-3.5" />{r.errors.join(', ')}</span>}
                        </Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          </Card>
        </>
      )}
    </PageShell>
  );
}
