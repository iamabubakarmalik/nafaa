import { useMemo, useState } from 'react';
import {
  Smartphone, Trash2, Plus, ShieldCheck, Upload, Camera,
  AlertOctagon, AlertTriangle, Clock, Shield,
  ScanLine, X, Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PTA_STATUS_COLORS, PTA_STATUS_LABELS, type PtaStatus,
} from '../../api/imei.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import type { MobileWizardImeiLine, MobileWizardBasic } from '../../hooks/useMobileWizard';

interface Props {
  basic: MobileWizardBasic;
  bucketName: string;
  variantTempId: string | null;
  lines: MobileWizardImeiLine[];
  onAdd: () => void;
  onUpdate: (tempId: string, patch: Partial<MobileWizardImeiLine>) => void;
  onRemove: (tempId: string) => void;
  onBulkAdd: (imeis: string[]) => void;
}

const PTA_ICONS: Record<PtaStatus, any> = {
  APPROVED: ShieldCheck,
  NON_PTA: AlertOctagon,
  PATCH: AlertTriangle,
  PENDING: Clock,
  EXEMPT: Shield,
};

const PTA_OPTIONS: PtaStatus[] = ['APPROVED', 'NON_PTA', 'PATCH', 'PENDING', 'EXEMPT'];

export function MobileImeiTable({
  basic, bucketName, lines, onAdd, onUpdate, onRemove, onBulkAdd,
}: Props) {
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [scanningRow, setScanningRow] = useState<string | null>(null); // tempId

  /** Duplicate detection — same imei1 do dafa? */
  const duplicates = useMemo(() => {
    const seen = new Map<string, number>();
    lines.forEach((l) => {
      if (l.imei1?.length === 15) seen.set(l.imei1, (seen.get(l.imei1) ?? 0) + 1);
    });
    return new Set([...seen.entries()].filter(([, c]) => c > 1).map(([k]) => k));
  }, [lines]);

  const validCount = lines.filter((l) => l.imei1?.length === 15).length;
  const dupCount = duplicates.size;

  /** Bulk parse — lines/commas/spaces sab se, duplicates skip + report */
  const doBulkImport = () => {
    const list = bulkText
      .split(/[\n,;\t ]+/)
      .map((l) => l.replace(/\D/g, ''))
      .filter((l) => l.length > 0);
    if (list.length === 0) return;

    const existing = new Set(lines.map((l) => l.imei1).filter(Boolean));
    const batchSeen = new Set<string>();
    const clean: string[] = [];
    let skippedDup = 0, skippedLen = 0;
    for (const imei of list) {
      if (imei.length !== 15) { skippedLen++; continue; }
      if (existing.has(imei) || batchSeen.has(imei)) { skippedDup++; continue; }
      batchSeen.add(imei);
      clean.push(imei);
    }
    if (clean.length > 0) onBulkAdd(clean);
    if (skippedDup > 0) toast.warning(`${skippedDup} duplicate IMEI skip`);
    if (skippedLen > 0) toast.warning(`${skippedLen} invalid (15 digits nahi) skip`);
    if (clean.length > 0) toast.success(`✓ ${clean.length} IMEIs add ho gaye`);
    setBulkText('');
    setBulkMode(false);
  };

  /** Camera scan result — digits nikal ke 15 tak */
  const handleScan = (code: string) => {
    const digits = code.replace(/\D/g, '').slice(0, 15);
    setScanningRow(null);
    if (!scanningRow) return;
    if (digits.length !== 15) {
      toast.error(`Scanned ${digits.length} digits — IMEI 15 chahiye`);
      return;
    }
    onUpdate(scanningRow, { imei1: digits });
    toast.success('✓ IMEI scan ho gaya');
  };

  const lastImei = lines[lines.length - 1]?.imei1;

  return (
    <>
      {scanningRow && (
        <BarcodeScanner
          onDetected={handleScan}
          onClose={() => setScanningRow(null)}
          title="Scan IMEI"
          hint="Box ka IMEI barcode camera ke samne rakhein"
        />
      )}

      {bulkMode ? (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Bulk Paste IMEIs — {bucketName}
            </div>
            <button
              type="button"
              onClick={() => { setBulkMode(false); setBulkText(''); }}
              className="h-6 w-6 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition"
            >
              <X className="h-3 w-3 text-slate-500 dark:text-slate-400" />
            </button>
          </div>
          <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/40 p-2 text-[10px] text-amber-900 dark:text-amber-200 font-semibold">
            💡 Ek IMEI per line (ya comma/space se). 15 digits. Duplicates auto-skip.
          </div>
          <textarea
            rows={8}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`354895112345678\n354895112345679\n354895112345680`}
            className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={doBulkImport}
              disabled={!bulkText.trim()}
              className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 transition active:scale-[0.98]"
            >
              <ScanLine className="h-3.5 w-3.5" />
              Parse & Add {bulkText.split(/[\n,;\t ]+/).filter((l) => l.trim()).length} IMEIs
            </button>
            <button
              type="button"
              onClick={() => { setBulkMode(false); setBulkText(''); }}
              className="px-4 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-extrabold transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : lines.length === 0 ? (
        <div className="p-6 text-center">
          <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-500/15 mx-auto flex items-center justify-center mb-2">
            <Smartphone className="h-7 w-7 text-blue-400 dark:text-blue-300" />
          </div>
          <div className="text-sm font-extrabold text-slate-700 dark:text-slate-200">No IMEIs for {bucketName}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
            <strong>+ Add IMEI</strong> se ek-ek, <strong>Bulk Paste</strong> se list, ya camera se scan
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onAdd}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold inline-flex items-center gap-1 transition active:scale-95"
            >
              <Plus className="h-3 w-3" /> Add IMEI
            </button>
            <button
              type="button"
              onClick={() => setBulkMode(true)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border-2 border-blue-300 dark:border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-extrabold inline-flex items-center gap-1 transition active:scale-95"
            >
              <Upload className="h-3 w-3" /> Bulk Paste
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Duplicate warning banner */}
          {dupCount > 0 && (
            <div className="mx-3 mt-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-2 flex items-center gap-2 text-[11px] font-extrabold text-rose-800 dark:text-rose-300">
              <Copy className="h-3.5 w-3.5 shrink-0" />
              ⚠️ {dupCount} duplicate IMEI{dupCount > 1 ? 's' : ''} — red rows fix karo warna save fail hoga
            </div>
          )}

          <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <ColHead label="#" />
                  <ColHead label="IMEI 1 *" hint="15 digits • 📷 scan" icon={Smartphone} />
                  <ColHead label="IMEI 2" hint="dual-SIM" />
                  <ColHead label="Serial #" />
                  <ColHead label="Color" />
                  <ColHead label="PTA Status" icon={ShieldCheck} />
                  <ColHead label="Tax (PKR)" />
                  <ColHead label="" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lines.map((l, idx) => {
                  const isValid = l.imei1?.length === 15;
                  const isDup = isValid && duplicates.has(l.imei1);
                  const ptaColors = PTA_STATUS_COLORS[l.ptaStatus];
                  const showTax = l.ptaStatus === 'APPROVED' || l.ptaStatus === 'PATCH';

                  return (
                    <tr key={l.tempId} className={[
                      'hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition',
                      isDup ? 'bg-rose-50 dark:bg-rose-500/10' : isValid ? 'bg-emerald-50/20 dark:bg-emerald-500/5' : '',
                    ].join(' ')}>
                      <td className="px-2 py-1.5 text-center">
                        <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">{idx + 1}</div>
                        {isDup ? (
                          <Copy className="h-3 w-3 text-rose-600 dark:text-rose-400 mx-auto mt-0.5" />
                        ) : l.imei1 && !isValid ? (
                          <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400 mx-auto mt-0.5" />
                        ) : null}
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="relative">
                          <input
                            value={l.imei1}
                            onChange={(e) => onUpdate(l.tempId, { imei1: e.target.value.replace(/\D/g, '').slice(0, 15) })}
                            placeholder="15 digits"
                            maxLength={15}
                            className={[
                              'w-36 h-8 rounded-lg border-2 pl-2 pr-8 text-xs font-mono font-bold focus:outline-none transition',
                              isDup
                                ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-900 dark:text-rose-200 focus:border-rose-600'
                                : isValid
                                ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/10 text-slate-900 dark:text-white focus:border-emerald-500'
                                : l.imei1
                                ? 'border-rose-300 dark:border-rose-500/40 text-slate-900 dark:text-white focus:border-rose-500 bg-white dark:bg-slate-900'
                                : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 bg-white dark:bg-slate-900',
                            ].join(' ')}
                          />
                          <button
                            type="button"
                            onClick={() => setScanningRow(l.tempId)}
                            title="Camera se IMEI scan"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition active:scale-90"
                          >
                            <Camera className="h-3 w-3" />
                          </button>
                        </div>
                        {isDup && <div className="text-[9px] font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">DUPLICATE</div>}
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={l.imei2 ?? ''}
                          onChange={(e) => onUpdate(l.tempId, { imei2: e.target.value.replace(/\D/g, '').slice(0, 15) })}
                          placeholder="Optional"
                          maxLength={15}
                          className="w-28 h-8 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={l.serialNumber ?? ''}
                          onChange={(e) => onUpdate(l.tempId, { serialNumber: e.target.value })}
                          placeholder="SN"
                          className="w-24 h-8 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={l.color ?? ''}
                          onChange={(e) => onUpdate(l.tempId, { color: e.target.value })}
                          placeholder="Color"
                          className="w-20 h-8 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={l.ptaStatus}
                          onChange={(e) => onUpdate(l.tempId, { ptaStatus: e.target.value as PtaStatus })}
                          className={[
                            'h-8 rounded-lg border-2 px-1 text-[10px] font-extrabold focus:outline-none transition',
                            ptaColors.bg, ptaColors.text, ptaColors.border,
                          ].join(' ')}
                        >
                          {PTA_OPTIONS.map((s) => (
                            <option key={s} value={s}>{PTA_STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        {showTax ? (
                          <input
                            type="number"
                            step="0.01"
                            value={l.ptaTaxPaid ?? ''}
                            onChange={(e) => onUpdate(l.tempId, { ptaTaxPaid: e.target.value === '' ? undefined : Number(e.target.value) })}
                            placeholder="0"
                            className="w-16 h-8 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-bold tabular-nums text-right text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                          />
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => onRemove(l.tempId)}
                          className="h-7 w-7 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center transition active:scale-90"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-500/5 p-2 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3 text-[11px] font-extrabold text-blue-800 dark:text-blue-300 pl-1">
              <span>📱 {validCount}/{lines.length} valid</span>
              {dupCount > 0 && <span className="text-rose-600 dark:text-rose-400">• {dupCount} dup</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBulkMode(true)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border-2 border-blue-300 dark:border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[11px] font-extrabold inline-flex items-center gap-1 transition active:scale-95"
              >
                <Upload className="h-3 w-3" /> Bulk Paste
              </button>
              <button
                type="button"
                onClick={onAdd}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border-2 border-dashed border-blue-300 dark:border-blue-500/40 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[11px] font-extrabold inline-flex items-center gap-1 transition active:scale-95"
              >
                <Plus className="h-3 w-3" /> Add IMEI
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function ColHead({ label, hint, icon: Icon }: { label: string; hint?: string; icon?: any }) {
  return (
    <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-[9px]">
      <div className="flex items-center gap-0.5">
        {Icon && <Icon className="h-2.5 w-2.5" />}
        {label}
      </div>
      {hint && <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 normal-case">{hint}</div>}
    </th>
  );
}
