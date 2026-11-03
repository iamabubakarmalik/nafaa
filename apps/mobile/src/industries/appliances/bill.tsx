/**
 * Appliance bills on the shared Sales history and receipt (web AppliancesSalesPage):
 * serial units with warranty and fitting state, a link to the job behind a job
 * bill (installation, repair, AMC, delivery, warranty claim, old unit sold on),
 * print actions (warranty cards, installation slip), and on the receipt the
 * warranty box plus the bill's delivery and installation rows.
 */

import { FileSignature, HardHat, Printer, Recycle, Shield, Truck, Wrench } from 'lucide-react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@/core/format';
import { t } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { registerReceiptIndustry, useBillLanguage } from '@/core/receipt';
import { Button, Card, ListRow, Row, StatusPill, Text, toast } from '@/design';
import { useAuthStore } from '@/core/auth/store';
import { registerSalesExtras, type SaleLink } from '@/modules/sales/industry/registry';
import { jobRows } from '../_shared/trade/jobRows';
import { registerSaleJobs, type TradeJob } from '../_shared/trade/saleJobs';
import { applianceSerialApi, deliveriesApi, installationsApi } from './api';
import { installStatus } from './meta';
import { printInstallSlip, printWarrantyCards } from './slips';
import { serialReceipt } from '../electronics/bill';

/** Job behind a job bill, from its number (INST-2026-0001, SR-…, AMC-…, APDL-…, WC-…, ATI-… ; "-2" after a void). */
const JOBS: Array<{ re: RegExp; label: string; href: (n: string) => string; icon: typeof Wrench }> = [
  { re: /^INST-\d{4}-\d+/, label: 'Installation', href: (n) => `/appliances/installations?q=${n}`, icon: HardHat },
  { re: /^SR-\d{4}-\d+/, label: 'Repair', href: (n) => `/appliances/service-requests?q=${n}`, icon: Wrench },
  { re: /^AMC-\d{4}-\d+/, label: 'AMC', href: () => '/appliances/amc-contracts', icon: FileSignature },
  { re: /^APDL-\d{4}-\d+/, label: 'Delivery', href: (n) => `/appliances/deliveries?q=${n}`, icon: Truck },
  { re: /^WC-\d{4}-\d+/, label: 'Warranty claim', href: () => '/appliances/warranty-claims', icon: Shield },
  { re: /^ATI-\d{4}-\d+/, label: 'Old unit', href: (n) => `/appliances/trade-ins?q=${n}`, icon: Recycle },
];
const jobOf = (saleNumber: string) => JOBS.find((j) => j.re.test(saleNumber));

registerSaleJobs('appliances', async (saleId): Promise<TradeJob[]> => {
  const [d, i] = await Promise.all([
    deliveriesApi.list({ saleId }).catch(() => []),
    installationsApi.list({ saleId, limit: 20 }).then((p) => p.items).catch(() => []),
  ]);
  return [
    ...d.map((x): TradeJob => ({ kind: 'delivery', number: x.deliveryNumber, status: x.status, date: x.scheduledDate, who: x.driverName, charge: x.totalCharge, fitting: x.requiresInstallation })),
    ...i.map((x): TradeJob => ({ kind: 'installation', number: x.installationNumber, status: x.status, date: x.scheduledDate, who: x.technicianName, charge: x.totalCharge })),
  ];
});

function SerialsCard({ sale, raw }: { sale: { id: string; saleNumber: string }; raw: Record<string, any> | null }) {
  const online = isOnline();
  const lang = useBillLanguage();
  const shop = useAuthStore((s) => s.tenant?.name ?? '');
  const [busy, setBusy] = useState(false);
  const units = useQuery({ queryKey: ['appliance-serials', 'for-sale', sale.id], queryFn: () => applianceSerialApi.forSale(sale.id), enabled: online, staleTime: 60_000 });
  const list = units.data ?? [];
  if (!raw) return null;
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch { toast.error(t('Could not print. Check the printer and try again.')); } finally { setBusy(false); }
  };
  return (
    <Card flush title={t('Units on this bill')}>
      {list.map((u, i) => (
        <ListRow key={u.id} divider={i < list.length - 1} title={<Text ltr weight="semibold">{u.serialNumber}</Text>}
          subtitle={[u.warrantyEndDate ? t('Warranty till {{date}}', { date: formatDate(u.warrantyEndDate) }) : '', u.shopWarrantyEndDate ? t('Shop warranty till {{date}}', { date: formatDate(u.shopWarrantyEndDate) }) : ''].filter(Boolean).join(' · ') || undefined}
          trailing={u.installationStatus && u.installationStatus !== 'PENDING' ? <StatusPill tone={installStatus(u.installationStatus).tone}>{t(installStatus(u.installationStatus).label)}</StatusPill> : undefined} />
      ))}
      <Row gap={2} style={{ padding: 12 }}>
        <Button size="sm" variant="secondary" icon={Printer} style={{ flex: 1 }} disabled={!online || busy || !list.length} onPress={() => void run(() => printWarrantyCards(raw as never, list, shop, lang))}>{t('Warranty cards')}</Button>
        <Button size="sm" variant="secondary" icon={Printer} style={{ flex: 1 }} disabled={busy} onPress={() => void run(() => printInstallSlip(raw as never, shop, lang))}>{t('Installation slip')}</Button>
      </Row>
    </Card>
  );
}

registerSalesExtras('appliances', {
  rowChips: (s) => {
    const j = jobOf(s.saleNumber);
    return j ? [{ label: t(j.label), tone: 'info', icon: j.icon }] : [];
  },
  detailLinks: (s): SaleLink[] => {
    const j = jobOf(s.saleNumber);
    if (!j) return [];
    const n = j.re.exec(s.saleNumber)?.[0] ?? s.saleNumber;
    return [{ label: `${t(j.label)} ${n}`, href: j.href(n), icon: j.icon }];
  },
  DetailExtra: SerialsCard,
});

registerReceiptIndustry('appliances', (doc, ctx) => {
  const base = serialReceipt(doc, ctx);
  const rows = jobRows(ctx.sale, ctx.lang);
  if (!base && !rows.length) return null;
  return { ...(base ?? {}), infoRows: rows };
});

