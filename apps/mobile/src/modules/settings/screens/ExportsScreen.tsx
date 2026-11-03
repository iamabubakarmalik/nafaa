/**
 * Exports: Excel (and sales PDF) files of the business records for a chosen
 * period and the active branch, shared through the share sheet, plus a
 * history of who downloaded which file (web reports/exports). Each file shows
 * only to people who may see those records.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, ArrowLeftRight, FileSpreadsheet, FileText, Package, ShoppingCart, Truck, Users, Wallet, type LucideIcon } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { businessDayKey, formatDateTime } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { PERMISSIONS, usePermission, type PermissionKey } from '@/core/permissions';
import { Button, Card, ChipGroup, EmptyState, ListGroup, ListRow, Screen, SectionHeader, Skeleton, Text, toast, useTheme } from '@/design';
import { exportsApi, type ExportKind } from '../api/settings';
import { downloadAndShare } from '../lib/download';
import { OfflineNote } from '../components/SettingsParts';

interface FileCard { kind: ExportKind; title: string; text: string; icon: LucideIcon; permission: PermissionKey; dated: boolean; pdf?: boolean }

const FILES: FileCard[] = [
  { kind: 'sales', title: t('Sale'), text: t('Har bill: customer, amount, discount, udhaar, return, payment aur cashier'), icon: ShoppingCart, permission: PERMISSIONS.SALES_VIEW, dated: true, pdf: true },
  { kind: 'purchases', title: t('Purchase'), text: t('Supplier ke bill: maal, tax, payment aur return'), icon: Truck, permission: PERMISSIONS.PURCHASES_VIEW, dated: true },
  { kind: 'expenses', title: t('Expenses'), text: t('Har expense: type, amount, tareeqa aur kis ne likha'), icon: Wallet, permission: PERMISSIONS.EXPENSES_VIEW, dated: true },
  { kind: 'ledger', title: t('Khata'), text: t('Customers ka udhaar aur wasooli, har entry ke baad baqi'), icon: BookOpen, permission: PERMISSIONS.KHATA_VIEW, dated: true },
  { kind: 'stock-movements', title: t('Stock ka aana jana'), text: t('Kharid, sale, return, kharab, transfer — har tabdeeli'), icon: ArrowLeftRight, permission: PERMISSIONS.STOCK_MOVEMENTS_VIEW, dated: true },
  { kind: 'products', title: t('Maal (products)'), text: t('Saare products: qeemat, stock, barcode aur category'), icon: Package, permission: PERMISSIONS.PRODUCTS_VIEW, dated: false },
  { kind: 'customers', title: t('Customers'), text: t('Naam, phone, udhaar, credit limit aur loyalty points'), icon: Users, permission: PERMISSIONS.CUSTOMERS_VIEW, dated: false },
  { kind: 'suppliers', title: t('Suppliers'), text: t('Rabta, bank details, kul kharid aur baqi'), icon: Truck, permission: PERMISSIONS.SUPPLIERS_VIEW, dated: false },
];

type Period = 'today' | 'week' | 'month' | 'thisMonth' | 'all';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function ExportsScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const can = usePermission();
  const [period, setPeriod] = useState<Period>('thisMonth');
  const range = useMemo(() => {
    const today = businessDayKey();
    const back = (n: number) => businessDayKey(new Date(Date.now() - n * 86_400_000));
    if (period === 'today') return { from: today, to: today };
    if (period === 'week') return { from: back(6), to: today };
    if (period === 'month') return { from: back(29), to: today };
    if (period === 'thisMonth') return { from: `${today.slice(0, 8)}01`, to: today };
    return null;
  }, [period]);
  const history = useQuery({ queryKey: ['exports-history'], queryFn: exportsApi.history, enabled: online });
  const [busy, setBusy] = useState<string | null>(null);

  const get = useMutation({
    mutationFn: async (v: { f: FileCard; format: 'excel' | 'pdf' }) => {
      setBusy(`${v.f.kind}-${v.format}`);
      const qs = v.f.dated && range ? `?from=${range.from}&to=${range.to}` : '';
      const stamp = v.f.dated && range ? (range.from === range.to ? range.from : `${range.from}_${range.to}`) : new Date().toISOString().slice(0, 10);
      return downloadAndShare(`/exports/${v.f.kind}/${v.format}${qs}`, `nafaa-${v.f.kind}-${stamp}.${v.format === 'pdf' ? 'pdf' : 'xlsx'}`, v.format === 'pdf' ? 'application/pdf' : XLSX, v.f.title);
    },
    onSuccess: (_r, v) => { toast.success(t('{{title}} ki file download ho gayi', { title: v.f.title })); void qc.invalidateQueries({ queryKey: ['exports-history'] }); },
    onError: () => toast.error(t('File nahi bani — internet check karein')),
    onSettled: () => setBusy(null),
  });

  const files = FILES.filter((f) => can(f.permission));
  const log = history.data ?? [];

  return (
    <Screen title={t('Exports')} narrow onRefresh={() => void history.refetch()} refreshing={history.isRefetching}>
      {!online && <OfflineNote />}
      <ChipGroup value={period} onChange={setPeriod} options={[{ value: 'today', label: t('Aaj') }, { value: 'week', label: t('7 din') }, { value: 'month', label: t('30 din') }, { value: 'thisMonth', label: t('Is mahine') }, { value: 'all', label: t('Sab waqt') }]} />
      <Text size="xs" tone="muted">{t('Sale, purchase, expenses, khata aur stock ki files isi period ki banti hain. Baaqi hamesha poori list.')}</Text>
      {files.map((f) => (
        <Card key={f.kind} title={f.title} description={f.text} action={<f.icon size={20} color={th.colors.brand.text} />}>
          <View style={{ flexDirection: 'row', gap: th.space(2) }}>
            <Button icon={FileSpreadsheet} variant="soft" style={{ flex: 1 }} loading={busy === `${f.kind}-excel`} disabled={!online || !!busy} onPress={() => get.mutate({ f, format: 'excel' })}>{t('Excel')}</Button>
            {f.pdf && <Button icon={FileText} variant="secondary" style={{ flex: 1 }} loading={busy === `${f.kind}-pdf`} disabled={!online || !!busy} onPress={() => get.mutate({ f, format: 'pdf' })}>{t('PDF')}</Button>}
          </View>
        </Card>
      ))}
      <View style={{ gap: th.space(2) }}>
        <SectionHeader title={t('History')} />
        {history.isLoading ? <Skeleton height={120} /> : log.length === 0 ? <EmptyState compact title={t('Abhi koi file nahi nikaali')} /> : (
          <ListGroup>{log.slice(0, 30).map((h) => <ListRow key={h.id} icon={FileSpreadsheet} title={h.description} subtitle={`${formatDateTime(h.createdAt)} · ${h.user?.fullName ?? '—'}`} />)}</ListGroup>
        )}
      </View>
    </Screen>
  );
}
