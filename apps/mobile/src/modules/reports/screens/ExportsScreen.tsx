/**
 * Exports: Excel (and sales PDF) files of the business records for any
 * period and the current branch, plus a history of who downloaded which
 * file. The file is downloaded on the phone and opened in the share sheet
 * (WhatsApp, email, Files). Needs internet.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ArrowLeftRight, BookOpen, Database, Download, FileSpreadsheet, FileText, History, Package, ShoppingCart, Truck, Users, Wallet, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { API_URL, apiClient } from '@/core/api/client';
import { SHOP_HEADER } from '@/core/auth/shopScope';
import { useAuthStore } from '@/core/auth/store';
import { formatDateTime } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, Card, EmptyState, ListRow, Screen, SkeletonRows, Tabs, Text, toast, useTheme } from '@/design';
import { PeriodBar } from '../components/PeriodBar';
import { CachedNote } from '../components/ui';
import { usePeriod } from '../lib/period';

type Kind = 'sales' | 'products' | 'customers' | 'suppliers' | 'expenses' | 'purchases' | 'ledger' | 'stock-movements';
interface FileCard { kind: Kind; title: string; text: string; icon: LucideIcon; permission: string; dated: boolean; pdf?: boolean }

const FILES: FileCard[] = [
  { kind: 'sales', title: t('Sale'), text: t('Har bill: customer, amount, discount, udhaar, return, payment aur cashier'), icon: ShoppingCart, permission: P.SALES_VIEW, dated: true, pdf: true },
  { kind: 'purchases', title: t('Purchase'), text: t('Supplier ke bill: maal, tax, payment aur return'), icon: Truck, permission: P.PURCHASES_VIEW, dated: true },
  { kind: 'expenses', title: t('Expenses'), text: t('Har expense: type, amount, tareeqa aur kis ne likha'), icon: Wallet, permission: P.EXPENSES_VIEW, dated: true },
  { kind: 'ledger', title: t('Khata'), text: t('Customers ka udhaar aur wasooli, har entry ke baad baqi'), icon: BookOpen, permission: P.KHATA_VIEW, dated: true },
  { kind: 'stock-movements', title: t('Stock ka aana jana'), text: t('Kharid, sale, return, kharab, transfer — har tabdeeli'), icon: ArrowLeftRight, permission: P.STOCK_MOVEMENTS_VIEW, dated: true },
  { kind: 'products', title: t('Maal (products)'), text: t('Saare products: qeemat, stock, barcode aur category'), icon: Package, permission: P.PRODUCTS_VIEW, dated: false },
  { kind: 'customers', title: t('Customers'), text: t('Naam, phone, udhaar, credit limit aur loyalty points'), icon: Users, permission: P.CUSTOMERS_VIEW, dated: false },
  { kind: 'suppliers', title: t('Suppliers'), text: t('Naam, phone, baqi aur bank details'), icon: Database, permission: P.SUPPLIERS_VIEW, dated: false },
];

interface HistoryRow { id: string; description: string; metadata?: { kind?: string; format?: string; rows?: number } | null; createdAt: string; user?: { fullName: string } | null }

export function ExportsScreen() {
  const th = useTheme();
  const can = usePermission();
  const online = useOnlineStatus();
  const period = usePeriod('month');
  const [tab, setTab] = useState<'files' | 'history'>('files');
  const [busy, setBusy] = useState('');
  const history = useQuery({ queryKey: ['report', 'exports-history'], queryFn: () => apiClient.get<HistoryRow[]>('/exports/history').then((r) => r.data), enabled: tab === 'history' });

  const download = async (c: FileCard, format: 'excel' | 'pdf') => {
    if (!online) { toast.warning(t('Yeh kaam internet par hota hai')); return; }
    const key = `${c.kind}-${format}`;
    setBusy(key);
    try {
      const { accessToken, currentShopId } = useAuthStore.getState();
      const qs = c.dated && period.period.from !== 'all' ? `?from=${period.period.from}&to=${period.period.to}` : '';
      const stamp = c.dated && period.period.from !== 'all' ? (period.period.from === period.period.to ? period.period.from : `${period.period.from}_${period.period.to}`) : new Date().toISOString().slice(0, 10);
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      const path = `${FileSystem.cacheDirectory}nafaa-${c.kind}-${stamp}.${ext}`;
      const res = await FileSystem.downloadAsync(`${API_URL}/exports/${c.kind}/${format}${qs}`, path, { headers: { Authorization: `Bearer ${accessToken}`, ...(currentShopId && currentShopId !== 'all' ? { [SHOP_HEADER]: currentShopId } : {}) } });
      if (res.status >= 400) throw new Error(String(res.status));
      await Sharing.shareAsync(res.uri, { mimeType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', UTI: format === 'pdf' ? 'com.adobe.pdf' : 'org.openxmlformats.spreadsheetml.sheet', dialogTitle: c.title });
    } catch {
      toast.error(t('File nahi bani — internet check karein'));
    } finally {
      setBusy('');
    }
  };

  const files = FILES.filter((f) => can(f.permission));
  return (
    <Screen title={t('Exports')} onRefresh={tab === 'history' ? () => void history.refetch() : undefined} refreshing={history.isRefetching}>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'files', label: t('Files'), icon: FileSpreadsheet }, { value: 'history', label: t('History'), icon: History }]} />
      {tab === 'files' ? (
        <>
          <PeriodBar state={period} allowAll />
          {files.length === 0 ? <EmptyState title={t('Aap ko yeh dekhne ki ijazat nahi')} /> : files.map((c) => (
            <Card key={c.kind}>
              <View style={{ flexDirection: 'row', gap: th.space(3), alignItems: 'center' }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: th.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}><c.icon size={22} color={th.colors.brand.text} /></View>
                <View style={{ flex: 1 }}>
                  <Text weight="bold">{c.title}</Text>
                  <Text size="xs" tone="muted">{c.text}</Text>
                  <Text size="2xs" tone="subtle">{c.dated ? period.label : t('Poori list')}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: th.space(2), marginTop: th.space(3) }}>
                <Button variant="soft" icon={Download} style={{ flex: 1 }} loading={busy === `${c.kind}-excel`} disabled={!!busy} onPress={() => void download(c, 'excel')}>{t('Excel')}</Button>
                {c.pdf && <Button variant="soft" icon={FileText} style={{ flex: 1 }} loading={busy === `${c.kind}-pdf`} disabled={!!busy} onPress={() => void download(c, 'pdf')}>{t('PDF')}</Button>}
              </View>
            </Card>
          ))}
        </>
      ) : history.isLoading ? <SkeletonRows count={5} /> : (history.data ?? []).length === 0 ? <EmptyState icon={History} title={t('Abhi koi file download nahi hui')} /> : (
        <>
          <CachedNote query={history} />
          <Card flush>{(history.data ?? []).map((h, i, a) => <ListRow key={h.id} dense divider={i < a.length - 1} icon={FileSpreadsheet} title={h.description} subtitle={`${h.user?.fullName ?? ''} · ${formatDateTime(h.createdAt)}`} trailing={h.metadata?.rows != null ? <Text size="xs" tone="muted" ltr>{`${h.metadata.rows} rows`}</Text> : undefined} />)}</Card>
        </>
      )}
    </Screen>
  );
}
