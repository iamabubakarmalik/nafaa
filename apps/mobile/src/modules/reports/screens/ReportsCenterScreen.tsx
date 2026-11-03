/**
 * Reports: sales, items, customers, purchases, expenses, profit, returns,
 * tax and the industry's own tab, for any period and branch. Summary cards
 * first, then charts, then lists. Share any section as PDF or CSV. Reports
 * need internet; the last numbers are kept on the phone.
 */

import { BarChart3, Boxes, FileText, Percent, RotateCcw, ShoppingBag, TrendingUp, Users, Wallet, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { isAllShops } from '@/core/auth/shopScope';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Chip, EmptyState, ErrorState, Screen, SkeletonRows, Text, useTheme } from '@/design';
import { ScrollView } from 'react-native';
import { useIndustry } from '@/modules/shell/hooks/useIndustry';
import { fetchSection, type SectionData, type SectionId } from '../api/center';
import { BranchBar, PeriodBar } from '../components/PeriodBar';
import { CustomersSection, ExpensesSection, IndustrySection, ItemsSection, ProfitSection, PurchasesSection, ReturnsSection, SalesSection, TaxSection } from '../components/sections';
import { CachedNote } from '../components/ui';
import { ExportButton } from '../components/ExportButton';
import { CENTER_CONFIG } from '../lib/centerConfig';
import type { ReportDoc } from '../lib/doc';
import { usePeriod } from '../lib/period';
import { useReport } from '../lib/useReport';

export function ReportsCenterScreen() {
  const th = useTheme();
  const can = usePermission();
  const { id: industry } = useIndustry();
  const cfg = (industry && CENTER_CONFIG[industry]) || {};
  const allShops = useAuthStore((s) => isAllShops(s.currentShopId));
  const period = usePeriod('month');
  const [section, setSection] = useState<SectionId>('sales');
  const [branch, setBranch] = useState('');

  const tabs = useMemo(() => {
    const l = cfg.labels ?? {};
    return [
      { id: 'sales' as SectionId, label: t('Sale'), icon: TrendingUp },
      { id: 'items' as SectionId, label: l.items ? t(l.items) : t('Maal'), icon: Boxes },
      { id: 'customers' as SectionId, label: t('Customers'), icon: Users },
      { id: 'purchases' as SectionId, label: t('Purchase'), icon: ShoppingBag },
      { id: 'expenses' as SectionId, label: t('Expenses'), icon: Wallet },
      ...(can(P.PROFIT_REPORT_VIEW) ? [{ id: 'profit' as SectionId, label: t('Profit'), icon: BarChart3 }] : []),
      { id: 'returns' as SectionId, label: t('Returns'), icon: RotateCcw },
      { id: 'tax' as SectionId, label: t('Tax'), icon: Percent },
      ...(cfg.industry ? [{ id: 'industry' as SectionId, label: t(cfg.industry.label), icon: Sparkles }] : []),
    ];
  }, [cfg, can]);
  useEffect(() => { if (!tabs.some((x) => x.id === section)) setSection('sales'); }, [tabs, section]);

  const range = { from: period.period.from, to: period.period.to };
  const q = useReport(`center-${section}`, { ...range, branch }, () => fetchSection(section, range, cfg.industry?.kind), {});
  const d = q.data as SectionData[SectionId] | undefined;

  const doc = (): ReportDoc | null => {
    if (!d) return null;
    const label = tabs.find((x) => x.id === section)?.label ?? section;
    const base: ReportDoc = { title: `${t('Reports')}: ${label}`, subtitle: period.label, fileName: `report-${section}-${range.from}-${range.to}` };
    if (section === 'sales') {
      const x = (d as SectionData['sales']).totals;
      return { ...base, summary: [[t('Net sale'), formatMoney(x.net)], [t('Bills'), String(x.bills)], [t('Ausat bill'), formatMoney(x.average)], [t('Paisa aaya'), formatMoney(x.cashIn)], [t('Udhaar diya'), formatMoney(x.credit)], ...(x.profit != null ? [[t('Profit'), formatMoney(x.profit)] as [string, string]] : [])], tables: [{ heading: t('Sale ka rujhan'), columns: [t('Din'), t('Sale'), t('Bills')], rows: (d as SectionData['sales']).trend.map((p) => [p.key, formatMoney(p.net), p.bills]) }] };
    }
    if (section === 'items') {
      const x = d as SectionData['items'];
      return { ...base, tables: [{ heading: t('Sab se zyada sale'), columns: [t('Product'), t('Quantity'), t('Sale')], rows: x.topRevenue.map((r) => [r.name, r.qty, formatMoney(r.revenue)]) }] };
    }
    if (section === 'expenses') {
      const x = d as SectionData['expenses'];
      return { ...base, summary: [[t('Kul expense'), formatMoney(x.totals.amount)]], tables: [{ heading: t('Category'), columns: [t('Category'), t('Amount')], rows: x.categories.map((c) => [c.name, formatMoney(c.amount)]) }] };
    }
    if (section === 'customers') {
      const x = d as SectionData['customers'];
      return { ...base, summary: [[t('Abhi baqi'), formatMoney(x.totals.outstanding)]], tables: [{ heading: t('Sab se zyada udhaar'), columns: [t('Naam'), t('Baqi')], rows: x.debtors.map((c) => [c.name, formatMoney(c.balance)]) }] };
    }
    if (section === 'purchases') {
      const x = d as SectionData['purchases'];
      return { ...base, summary: [[t('Purchase'), formatMoney(x.totals.value)]], tables: [{ heading: t('Suppliers'), columns: [t('Supplier'), t('Purchase')], rows: x.suppliers.map((s) => [s.name, formatMoney(s.value)]) }] };
    }
    if (section === 'profit') {
      const x = d as SectionData['profit'];
      return { ...base, summary: [[t('Net sale'), formatMoney(x.totals.sales - x.totals.refunds)], ...(x.totals.netProfit != null ? [[t('Net profit'), formatMoney(x.totals.netProfit)] as [string, string]] : [])], tables: [{ heading: t('Tafseel'), columns: [t('Din'), t('Sale'), t('Kharchay'), t('Net profit')], rows: x.rows.map((r) => [r.key, formatMoney(r.sales), formatMoney(r.expenses), r.netProfit != null ? formatMoney(r.netProfit) : '']) }] };
    }
    if (section === 'returns') {
      const x = d as SectionData['returns'];
      return { ...base, summary: [[t('Return'), formatMoney(x.totals.amount)]], tables: [{ heading: t('Wajah'), columns: [t('Wajah'), t('Amount')], rows: x.reasons.map((r) => [r.reason ?? '', formatMoney(r.amount)]) }] };
    }
    if (section === 'industry') {
      const x = d as SectionData['industry'];
      return { ...base, summary: x.kpis.map((k) => [k.label, String(k.value)] as [string, string]), tables: x.tables.map((tb) => ({ heading: tb.title, columns: tb.columns.map((c) => c.label), rows: tb.rows })) };
    }
    return base;
  };

  const body = !d ? (q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : <SkeletonRows count={6} />)
    : section === 'sales' ? <SalesSection d={d as SectionData['sales']} />
      : section === 'items' ? <ItemsSection d={d as SectionData['items']} />
        : section === 'customers' ? <CustomersSection d={d as SectionData['customers']} />
          : section === 'purchases' ? <PurchasesSection d={d as SectionData['purchases']} />
            : section === 'expenses' ? <ExpensesSection d={d as SectionData['expenses']} />
              : section === 'profit' ? <ProfitSection d={d as SectionData['profit']} />
                : section === 'returns' ? <ReturnsSection d={d as SectionData['returns']} />
                  : section === 'tax' ? <TaxSection d={d as SectionData['tax']} />
                    : <IndustrySection d={d as SectionData['industry']} />;

  return (
    <Screen title={t('Reports')} onRefresh={() => void q.refetch()} refreshing={q.isRefetching} actions={<ExportButton build={doc} disabled={!d} />}>
      {!can(P.REPORTS_VIEW) ? <EmptyState icon={FileText} title={t('Aap ko yeh dekhne ki ijazat nahi')} /> : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: th.space(2) }} style={{ marginHorizontal: -th.space(4) }} contentInset={{ left: th.space(4), right: th.space(4) }}>
            <View style={{ width: th.space(2) }} />
            {tabs.map((x) => <Chip key={x.id} icon={x.icon} label={x.label} selected={section === x.id} onPress={() => setSection(x.id)} />)}
            <View style={{ width: th.space(2) }} />
          </ScrollView>
          <PeriodBar state={period} allowAll />
          {allShops && <BranchBar value={branch} onChange={setBranch} />}
          <CachedNote query={q} />
          {body}
          {d && <Text size="2xs" tone="muted" align="center">{period.label}</Text>}
        </>
      )}
    </Screen>
  );
}
