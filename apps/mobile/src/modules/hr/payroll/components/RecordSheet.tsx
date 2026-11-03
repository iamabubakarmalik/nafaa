/**
 * One salary or advance: the breakdown, the advances cut from it (or the
 * instalments of an advance), every payment and refund with where the money
 * went, and the actions: share the payslip, pay the balance, cancel.
 */

import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Banknote, CircleSlash, Share2 } from 'lucide-react-native';
import { Share, View } from 'react-native';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Avatar, Button, DetailRow, ErrorState, ListGroup, ListRow, Sheet, SkeletonRows, StatusPill, Text, useTheme } from '@/design';
import { payrollApi, type RecordDetail } from '../api/payroll';
import { METHOD_LABEL, PAYROLL_KEY, SALARY_TYPE, STATUS, day, dayTime, hours, days } from '../lib/meta';

/** Plain-text payslip for the share sheet. */
export function payslipText(r: RecordDetail, business?: string): string {
  const adv = r.kind === 'advance';
  const lines = [
    business ?? '',
    `${adv ? t('Voucher') : t('Payslip')} ${r.paymentNumber} · ${r.monthLabel}`,
    `${r.staff.fullName} (${r.staff.designation})`,
    '',
  ];
  if (adv) {
    lines.push(`${t('Advance')}: ${formatPKR(r.netAmount)}`);
    if (r.note) lines.push(r.note);
  } else {
    lines.push(
      `${t('Tankhwah')}: ${formatPKR(r.baseSalary)}`,
      ...(r.overtimePay ? [`${t('+ Overtime')}: ${formatPKR(r.overtimePay)}`] : []),
      ...(r.commissionEarned ? [`${t('+ Commission')}: ${formatPKR(r.commissionEarned)}`] : []),
      ...r.adds.map((a) => `+ ${a.label}: ${formatPKR(a.amount)}`),
      `${t('Kul kamai')}: ${formatPKR(r.grossAmount)}`,
      ...(r.leaveDeduction ? [`${t('− Ghair hazri')}: ${formatPKR(r.leaveDeduction)}`] : []),
      ...(r.advances ? [`${t('− Advance')}: ${formatPKR(r.advances)}`] : []),
      ...r.cuts.map((c) => `− ${c.label}: ${formatPKR(c.amount)}`),
      `${t('Haath me (net)')}: ${formatPKR(r.netAmount)}`,
      `${t('Ada')}: ${formatPKR(r.paidAmount)}`,
      ...(r.balanceAmount > 0.5 ? [`${t('Baqi')}: ${formatPKR(r.balanceAmount)}`] : []),
    );
  }
  return lines.filter((l, i) => l || i > 0).join('\n');
}

export function RecordSheet({ recordId, canWrite, online, onPay, onCancel, onClose, business }: {
  recordId: string | null; canWrite: boolean; online: boolean; onPay: (r: RecordDetail) => void; onCancel: (r: RecordDetail) => void; onClose: () => void; business?: string;
}) {
  const th = useTheme();
  const q = useQuery({ queryKey: [PAYROLL_KEY, 'record', recordId], queryFn: () => payrollApi.record(recordId!), enabled: !!recordId });
  const r = q.data;
  const advance = r?.kind === 'advance';
  const live = r && r.status !== 'CANCELLED';
  const st = r ? STATUS[r.status] : null;

  return (
    <Sheet open={!!recordId} onClose={onClose} height={0.9}
      title={r ? `${r.paymentNumber} · ${r.monthLabel}` : t('Record')} description={r ? (advance ? t('Advance / qarz') : t('Tankhwah')) : undefined}>
      {!r ? (q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : <SkeletonRows count={4} />) : (
        <View style={{ gap: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={r.staff.fullName} url={r.staff.avatarUrl} size={44} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text weight="semibold" numberOfLines={1}>{r.staff.fullName}</Text>
              <Text size="xs" tone="muted" numberOfLines={1}>{`${r.staff.designation} · ${t(SALARY_TYPE[r.staff.salaryType].label)}${r.staff.shop?.name ? ` · ${r.staff.shop.name}` : ''}`}</Text>
            </View>
            {st && <StatusPill tone={st.tone}>{t(st.label)}</StatusPill>}
          </View>

          {advance ? (
            <View style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted, gap: 6 }}>
              <Text size="sm" weight="medium">{r.note ?? t('Advance')}</Text>
              {r.related.map((x) => (
                <View key={x.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text size="sm" tone={x.status === 'CANCELLED' ? 'subtle' : 'default'} style={{ flex: 1 }}>{t('{{paymentNumber}} · {{label}} ki tankhwah se', { paymentNumber: x.paymentNumber, label: x.label })}</Text>
                  <Amount value={x.paidAmount} weight="medium" />
                </View>
              ))}
            </View>
          ) : (
            <View style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
              <DetailRow label={r.staff.salaryType === 'HOURLY' ? t('Tankhwah ({{hoursWorked}})', { hoursWorked: hours(r.hoursWorked) }) : t('Tankhwah ({{daysWorked}} kaam)', { daysWorked: days(r.daysWorked) })} value={<Amount value={r.baseSalary} />} />
              <DetailRow label={t('+ Overtime')} value={<Amount value={r.overtimePay} />} />
              <DetailRow label={t('+ Commission')} value={<Amount value={r.commissionEarned} />} />
              {r.adds.map((a, i) => <DetailRow key={`a${i}`} label={`+ ${a.label}`} value={<Amount value={a.amount} />} />)}
              <DetailRow label={t('Kul kamai')} value={<Amount value={r.grossAmount} weight="bold" />} />
              <DetailRow label={t('− Ghair hazri')} value={<Amount value={r.leaveDeduction} />} />
              <DetailRow label={t('− Advance')} value={<Amount value={r.advances} />} />
              {r.cuts.map((c, i) => <DetailRow key={`c${i}`} label={`− ${c.label}`} value={<Amount value={c.amount} />} />)}
              <DetailRow label={t('Haath me (net)')} value={<Amount value={r.netAmount} weight="bold" />} />
              <DetailRow label={t('Ada')} value={<Amount value={r.paidAmount} />} />
              <DetailRow label={t('Baqi')} value={<Amount value={r.balanceAmount} weight="bold" />} last />
            </View>
          )}

          {!advance && r.related.length > 0 && <Text size="sm" tone="secondary">{t('Is tankhwah se kata advance: {{value}}', { value: r.related.map((x) => `${x.paymentNumber} (${formatPKR(x.paidAmount)})`).join(', ') })}</Text>}
          {!advance && !!r.note && <Text size="sm">{r.note}</Text>}

          <View style={{ gap: 8 }}>
            <Text weight="semibold">{t('Paisa kahan se gaya')}</Text>
            {!r.money.length ? (
              <Text size="sm" tone="muted">{r.paidAmount > 0 ? t('{{paidAmount}} {{value}} — purana record, galle / account me entry nahi bani thi', { paidAmount: formatPKR(r.paidAmount), value: t(METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod) }) : t('Abhi kuch ada nahi hua')}</Text>
            ) : (
              <ListGroup>
                {r.money.map((m) => (
                  <ListRow key={m.id} icon={m.back ? ArrowDownLeft : ArrowUpRight} iconTone={m.back ? 'success' : 'danger'}
                    title={`${m.from}${m.back ? t(' · wapas aaya') : ''}`} subtitle={`${dayTime(m.at)}${m.by ? ` · ${m.by}` : ''}`}
                    trailing={<Text weight="semibold" tone={m.back ? 'success' : 'default'} ltr>{`${m.back ? '+' : '−'}${formatPKR(m.amount)}`}</Text>} />
                ))}
              </ListGroup>
            )}
          </View>
          <Text size="xs" tone="muted">{t('Bana: {{createdAt}}{{value}}', { createdAt: day(r.createdAt), value: r.paidBy ? t(' · Diya: {{paidBy}}', { paidBy: r.paidBy }) : '' })}</Text>

          <View style={{ gap: 8 }}>
            <Button variant="secondary" icon={Share2} fullWidth onPress={() => void Share.share({ message: payslipText(r, business) }).catch(() => undefined)}>{advance ? t('Voucher') : t('Payslip')}</Button>
            {canWrite && live && !advance && r.balanceAmount > 0.5 && <Button icon={Banknote} fullWidth disabled={!online} onPress={() => onPay(r)}>{t('Baqi {{balanceAmount}} dein', { balanceAmount: formatPKR(r.balanceAmount) })}</Button>}
            {canWrite && live && <Button variant="ghost" icon={CircleSlash} fullWidth disabled={!online} onPress={() => onCancel(r)}>{t('Cancel')}</Button>}
          </View>
        </View>
      )}
    </Sheet>
  );
}
