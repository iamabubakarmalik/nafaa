/**
 * Roll import for shops starting on Nafaa (web CarpetBulkImportPage): an Excel
 * / CSV file with one row per roll (carpet name, design, size, cost and rate
 * per sqft, rack). The server checks every row (product found, roll number
 * free, size given); only checked rows are created, as opening stock in this
 * branch. Products themselves come from the shared product import.
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Layers, Upload, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import * as XLSX from 'xlsx';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { Button, Card, DetailRow, ListRow, Screen, Text, toast, useTheme, Row } from '@/design';
import { useCostMask } from '@/modules/sales/lib/mask';
import { formatMoney } from '@/core/format';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { StatGrid } from '../../_shared/trade/kit';
import { carpetRollsApi, type BulkImportApplyResponse, type BulkImportPreviewResponse } from '../api';
import { refreshCarpet } from '../meta';

const COLUMNS = ['Carpet', 'Design', 'Roll number', 'Design code', 'Chaurai ft', 'Chaurai inch', 'Lambai ft', 'Lambai inch', 'Cost per sqft', 'Rate per sqft', 'Rack', 'Quality', 'Note'];
const KEYS: Record<string, string> = {
  carpet: 'productName', product: 'productName', 'product name': 'productName', design: 'variantName', variant: 'variantName', rang: 'variantName',
  'roll number': 'rollNumber', roll: 'rollNumber', 'design code': 'designCode', 'chaurai ft': 'widthFt', 'width ft': 'widthFt', 'chaurai inch': 'widthInch', 'width inch': 'widthInch',
  'lambai ft': 'lengthFt', 'length ft': 'lengthFt', 'lambai inch': 'lengthInch', 'length inch': 'lengthInch', 'cost per sqft': 'costPerSqft', cost: 'costPerSqft',
  'rate per sqft': 'salePricePerSqft', rate: 'salePricePerSqft', 'sale price': 'salePricePerSqft', rack: 'rackNumber', quality: 'quality', note: 'notes', notes: 'notes',
};
const NUMS = new Set(['widthFt', 'widthInch', 'lengthFt', 'lengthInch', 'costPerSqft', 'salePricePerSqft']);
const MAX_ROWS = 1000;
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

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

async function shareTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([COLUMNS, ['Turkish Shaggy', 'Maroon', '', 'TS-21', 12, 0, 100, 0, 150, 250, 'Godown-A', 'Premium', '']]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rolls');
  const path = `${FileSystem.cacheDirectory}carpet-rolls-template.xlsx`;
  await FileSystem.writeAsStringAsync(path, XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }), { encoding: FileSystem.EncodingType.Base64 });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType: XLSX_TYPE, UTI: 'org.openxmlformats.spreadsheetml.sheet' });
}

export function BulkImportScreen() {
  const th = useTheme();
  const { cost } = useCostMask();
  const { guard } = useDeskOnline('carpetDesk');
  const shopId = useAuthStore((s) => s.currentShopId) ?? undefined;
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<BulkImportPreviewResponse | null>(null);
  const [result, setResult] = useState<BulkImportApplyResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = () => guard(async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', XLSX_TYPE, '*/*'], copyToCacheDirectory: true });
    const f = res.canceled ? null : res.assets[0];
    if (!f) return;
    setFileName(f.name); setPreview(null); setResult(null); setBusy(true);
    try {
      const csv = /\.(csv|txt)$/i.test(f.name);
      const wb = XLSX.read(await FileSystem.readAsStringAsync(f.uri, { encoding: FileSystem.EncodingType.Base64 }), { type: 'base64', raw: csv });
      const rows = toRows(XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' }));
      if (!rows.length) { toast.error(t('File me koi roll nahi mila — template ke columns istemal karein')); return; }
      if (rows.length > MAX_ROWS) { toast.error(t('Ek dafa me {{MAX_ROWS}} rolls tak', { MAX_ROWS })); return; }
      setPreview(await carpetRollsApi.bulkImportPreview(rows, shopId));
    } catch { toast.error(t('File parhi nahi gayi ya check nahi hui')); } finally { setBusy(false); }
  });

  const apply = () => guard(async () => {
    if (!preview?.validCount) return;
    setBusy(true);
    try {
      const res = await carpetRollsApi.bulkImportApply(preview.rows.filter((r) => r.valid), shopId);
      setResult(res);
      refreshCarpet(['products']);
      if (res.failureCount) toast.error(t('{{successCount}} roll bane, {{failureCount}} nahi bane', { successCount: res.successCount, failureCount: res.failureCount }));
      else toast.success(t('{{successCount}} roll ban gaye', { successCount: res.successCount }));
    } catch (e) { toast.error(apiErrorMessage(e, t('Import nahi hua'))); } finally { setBusy(false); }
  });

  return (
    <Screen title={t('Rolls import')} subtitle={t('Pehle se pare rolls ek dafa me — opening stock')}>
      <View style={{ gap: th.space(3) }}>
        <OfflineNote feature="carpetDesk" />
        <Card>
          <View style={{ alignItems: 'center', gap: th.space(3), paddingVertical: th.space(4) }}>
            <FileSpreadsheet size={40} color={th.colors.brand.solid} />
            <Text weight="semibold" align="center">{fileName || t('Excel ya CSV file chunein')}</Text>
            <Text size="xs" tone="muted" align="center">{t('Columns: {{value}}', { value: COLUMNS.join(', ') })}</Text>
            <Row gap={2} wrap>
              <Button icon={Upload} loading={busy && !preview} onPress={pick}>{t('File chunein')}</Button>
              <Button variant="secondary" icon={Download} onPress={() => void shareTemplate()}>{t('Template')}</Button>
            </Row>
            <Button variant="link" icon={Layers} onPress={() => router.push('/products/bulk-import' as never)}>{t('Products import')}</Button>
          </View>
        </Card>

        {preview && (
          <>
            <StatGrid items={[
              { icon: CheckCircle2, tone: 'success', label: t('Sahi lines'), value: String(preview.validCount), hint: t('{{totalSqftToImport}} sqft', { totalSqftToImport: Math.round(preview.totalSqftToImport) }) },
              { icon: XCircle, tone: 'danger', label: t('Ghalat lines'), value: String(preview.invalidCount), hint: t('Import nahi hongi') },
              { icon: Layers, tone: 'info', label: t('Stock ki cost'), value: cost(preview.totalCostToImport) },
              { icon: Layers, tone: 'accent', label: t('Bechne par'), value: formatMoney(preview.totalSaleValueToImport) },
            ]} />
            <Card flush title={t('Check')} description={t('Laal lines theek kar ke file dobara chunein, ya sirf sahi lines import karein')}>
              {preview.rows.map((r, i) => {
                const done = result?.results.find((x) => x.index === preview.rows.filter((y) => y.valid).indexOf(r) + 1);
                return (
                  <ListRow key={r.index} divider={i < preview.rows.length - 1} icon={done ? (done.success ? CheckCircle2 : XCircle) : r.valid ? CheckCircle2 : AlertTriangle} iconTone={done ? (done.success ? 'success' : 'danger') : r.valid ? 'success' : 'danger'}
                    title={`${r.index}. ${r.productName}${r.variantName ? ` · ${r.variantName}` : ''}`}
                    subtitle={done ? (done.success ? `${t('Ban gaya')} · ${done.rollNumber ?? ''}` : done.error) : r.valid ? [t('{{widthFt}}ft{{value}} × {{lengthFt}}ft', { widthFt: r.widthFt, value: r.widthInch ? t(' {{widthInch}}in', { widthInch: r.widthInch }) : '', lengthFt: r.lengthFt }), `${r.totalSqft} sqft`, ...r.warnings].join(' · ') : r.errors.join(', ')}
                    trailing={<Text size="xs" tone="muted" ltr>{r.salePricePerSqft}/sqft</Text>} />
                );
              })}
            </Card>
            {result ? <Button size="lg" fullWidth onPress={() => router.replace('/carpet/rolls' as never)}>{t('Rolls dekhein')}</Button>
              : <Button size="lg" fullWidth loading={busy} disabled={!preview.validCount} onPress={apply}>{t('{{validCount}} roll import karein', { validCount: preview.validCount })}</Button>}
          </>
        )}
      </View>
    </Screen>
  );
}
