/**
 * One person's month: totals, the rules that made the commission, targets,
 * the last months, sale by category and product, the bills and returns behind
 * it, and the actions (pay, take a payment back, share the statement).
 */

import { useQuery } from '@tanstack/react-query';
import { HandCoins, Share2, Undo2 } from 'lucide-react-native';
import { Share, View } from 'react-native';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Button, Card, DetailRow, ErrorState, ProgressBar, Sheet, SkeletonRows, StatusPill, Text, useTheme } from '@/design';
import { commissionApi, type CommissionDetail } from '../api/commission';
import { COMMISSION_KEY, PAY, day, periodLabel, qtyText, rateText, signed } from '../lib/meta';

export function statementText(d: CommissionDetail, period: string): string {
  const lines = [
    `${t('Commission')} — ${d.name} · ${periodLabel(period)}`,
    `${t('Asal sale')}: ${formatPKR(d.sale)} (${d.bills} ${t('Bill')})`,
    ...d.lines.map((l) => `${l.label}: ${signed(l.amount)}`),
    ...(d.bonus ? [`${t('Target bonus')}: ${formatPKR(d.bonus)}`] : []),
    `${t('Banti hai')}: ${signed(d.earned)}`,
    `${t('Ada hui')}: ${formatPKR(d.paidAmount ?? 0)}`,
    `${t('Baqi')}: ${formatPKR(d.due)}`,
  ];
  return lines.join('\n');
}

export function DetailSheet({ target, period, canManage, costHidden, online, busy, onClose, onPay, onUndo }: {
  target: { userId: string; name: string } | null; period: string; canManage: boolean; costHidden: boolean; online: boolean; busy: boolean;
  onClose: () => void; onPay: (d: CommissionDetail) => void; onUndo: (d: CommissionDetail) => void;
}) {
  const th = useTheme();
  const q = useQuery({ queryKey: [COMMISSION_KEY, 'detail', target?.userId, period], queryFn: () => commissionApi.detail(target!.userId, period), enabled: !!target });
  const d = q.data;
  const st = d ? PAY[d.payStatus] : null;

  return (
    <Sheet open={!!target} onClose={onClose} height={0.92} title={target?.name} description={periodLabel(period)}>
      {!d ? (q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : <SkeletonRows count={5} />) : (
        <View style={{ gap: 14, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text size="sm" tone="muted">{d.staff?.designation ?? ''}</Text>
            {st && <StatusPill tone={st.tone}>{t(st.label)}</StatusPill>}
          </View>
          <Card>
            <DetailRow label={t('Asal sale')} value={<Amount value={d.sale} />} />
            {d.returnSale > 0 && <DetailRow label={t('Return')} value={<Amount value={d.returnSale} />} />}
            <DetailRow label={t('Bill')} value={<Text ltr>{String(d.bills)}</Text>} />
            {d.profit != null && !costHidden && <DetailRow label={t('Profit')} value={<Amount value={d.profit} />} />}
            {d.bonus > 0 && <DetailRow label={t('Target bonus')} value={<Amount value={d.bonus} />} />}
            <DetailRow label={t('Banti hai')} value={<Text weight="bold" ltr>{signed(d.earned)}</Text>} />
            <DetailRow label={t('Ada hui')} value={<Amount value={d.paidAmount ?? 0} />} />
            <DetailRow label={t('Baqi')} value={<Amount value={d.due} weight="bold" tone={d.due > 0 ? 'warning' : undefined} />} last />
          </Card>
          {d.blockedByMin && <Text size="sm" tone="warning">{t('Kam se kam sale {{need}} chahiye, abhi {{short}} kam hai.', { need: formatPKR(d.blockedByMin.need), short: formatPKR(d.blockedByMin.short) })}</Text>}
          {d.paidInSalary && <Text size="sm" tone="info">{t('Ye commission tankhwah ke saath ada hui — badlav Payroll se karein.')}</Text>}

          {d.lines.length > 0 && (
            <Card title={t('Kis rule se kitni')}>
              {d.lines.map((l, i) => <DetailRow key={`${l.ruleId}${i}`} label={l.label} value={<Text weight="semibold" ltr>{signed(l.amount)}</Text>} last={i === d.lines.length - 1} />)}
            </Card>
          )}
          {d.targets.length > 0 && (
            <Card title={t('Target')}>
              {d.targets.map((x) => (
                <View key={x.ruleId} style={{ gap: 6 }}>
                  <ProgressBar value={Math.min(1, x.pct / 100)} />
                  <Text size="xs" tone="muted">{t('{{pct}}% — {{amount}} me se, bonus {{bonus}}', { pct: Math.round(x.pct), amount: formatPKR(x.amount), bonus: formatPKR(x.bonus) })}{x.reached ? ` · ${t('Poora')}` : ''}</Text>
                </View>
              ))}
            </Card>
          )}
          {d.rules.length > 0 && (
            <Card title={t('Rules')}>
              {d.rules.map((r, i) => <DetailRow key={r.id} label={r.label} value={<Text ltr>{rateText(r)}</Text>} last={i === d.rules.length - 1} />)}
            </Card>
          )}
          {d.history.length > 0 && (
            <Card title={t('Pichle mahine')}>
              {d.history.map((h, i) => <DetailRow key={h.period} label={periodLabel(h.period, true)} value={<Text ltr>{`${signed(h.earned)} · ${t('Sale')} ${formatPKR(h.sale)}`}</Text>} last={i === d.history.length - 1} />)}
            </Card>
          )}
          {d.byCategory.length > 0 && (
            <Card title={t('Category')}>
              {d.byCategory.map((c, i) => <DetailRow key={`${c.categoryId}${i}`} label={c.name} value={<Text ltr>{`${formatPKR(c.sale)} · ${signed(c.commission)}`}</Text>} last={i === d.byCategory.length - 1} />)}
            </Card>
          )}
          {d.byProduct.length > 0 && (
            <Card title={t('Products')}>
              {d.byProduct.slice(0, 12).map((p, i, a) => <DetailRow key={p.productId} label={`${p.name} · ${qtyText(p.qty)} ${p.unit}`} value={<Text ltr>{`${formatPKR(p.sale)} · ${signed(p.commission)}`}</Text>} last={i === a.length - 1} />)}
            </Card>
          )}
          {d.billList.length > 0 && (
            <Card title={t('Bills ({{count}})', { count: d.billCount })}>
              {d.billList.slice(0, 15).map((b, i, a) => <DetailRow key={b.id} label={`${b.saleNumber} · ${day(b.soldAt)}`} value={<Amount value={b.total} />} last={i === a.length - 1} />)}
            </Card>
          )}
          {d.returnList.length > 0 && (
            <Card title={t('Returns')}>
              {d.returnList.map((r, i) => <DetailRow key={r.id} label={`${r.returnNumber} · ${day(r.returnedAt)}`} value={<Amount value={r.value} />} last={i === d.returnList.length - 1} />)}
            </Card>
          )}

          <View style={{ gap: th.space(2) }}>
            <Button variant="secondary" icon={Share2} fullWidth onPress={() => void Share.share({ message: statementText(d, period) }).catch(() => undefined)}>{t('Statement')}</Button>
            {canManage && d.enrolled && d.due > 0 && !d.paidInSalary && <Button icon={HandCoins} fullWidth disabled={!online || busy} onPress={() => onPay(d)}>{t('Ada karein')}</Button>}
            {canManage && !!d.paidAmount && !d.paidInSalary && <Button variant="ghost" icon={Undo2} fullWidth disabled={!online || busy} onPress={() => onUndo(d)}>{t('Payment wapas')}</Button>}
          </View>
        </View>
      )}
    </Sheet>
  );
}
