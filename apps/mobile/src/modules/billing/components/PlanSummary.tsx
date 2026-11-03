/** Current plan: state, price, renewal, the open upgrade bill and the owner actions. */

import { router } from 'expo-router';
import { CalendarClock, CalendarDays, CreditCard, Layers, RefreshCw, Sparkles, Wrench, XCircle } from 'lucide-react-native';
import { View } from 'react-native';
import { formatDate } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Button, Card, Icon, Row, Skeleton, StatusPill, Text, confirm, useTheme } from '@/design';
import { INTERVAL, SUBSCRIPTION_STATUS, daysText } from '../lib/meta';
import type { BillingData } from '../lib/useBilling';

export function PlanSummary({ b, onPlans }: { b: BillingData; onPlans: () => void }) {
  const th = useTheme();
  const { sub, pending, daysLeft, needsRenewal, totals } = b;

  if (b.loading.sub) return <Skeleton height={200} radius={th.radius('xl')} />;
  if (!sub?.plan) {
    return (
      <Card>
        <View style={{ alignItems: 'center', gap: th.space(2), paddingVertical: th.space(4) }}>
          <Icon icon={Sparkles} size={28} tone="brand" />
          <Text weight="semibold">{t('Abhi koi plan nahi')}</Text>
          <Text size="sm" tone="muted" align="center">{t('Plan chunein — payment ke baad sab kuch khul jayega.')}</Text>
          {b.can.plans && <Button onPress={onPlans}>{t('Plans dekhein')}</Button>}
        </View>
      </Card>
    );
  }

  const st = SUBSCRIPTION_STATUS[sub.status];
  const trial = sub.status === 'TRIAL';
  const canStop = b.can.manage && (sub.status === 'ACTIVE' || trial);
  const cta = trial ? t('Plan lein') : needsRenewal ? t('Renew karein') : t('Plan badlein');

  const stop = async () => {
    const ok = await confirm({
      title: t('Plan band karein?'),
      message: `${t('Plan isi period ke aakhir tak chalta rahega. Data mehfooz rahega, kabhi bhi wapas chalu kar sakte hain.')}\n${t('Band hone ki date:')} ${formatDate(sub.currentPeriodEnd, { year: true })}`,
      tone: 'danger', confirmLabel: t('Haan, band karein'), cancelLabel: t('Nahi'),
    });
    if (ok) b.cancel.mutate();
  };

  return (
    <View style={{ gap: th.space(3) }}>
      <Card>
        <Row gap={3} align="start">
          <View style={{ width: 44, height: 44, borderRadius: th.radius('lg'), backgroundColor: th.colors[st.tone].soft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon={Layers} size={22} color={th.colors[st.tone].text} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text size="xs" tone="muted">{t('Aap ka plan')}</Text>
            <Row gap={2} wrap>
              <Text size="xl" weight="bold">{sub.plan.name}</Text>
              <StatusPill tone={st.tone} dot>{t(st.label)}</StatusPill>
            </Row>
            <Row gap={1} wrap>
              {sub.amount > 0 && <><Amount value={sub.amount} size="sm" weight="semibold" /><Text size="sm" tone="muted">/ {t(INTERVAL[sub.interval]?.per ?? sub.interval)} ·</Text></>}
              <Text size="sm" tone="muted">{t(st.hint)}</Text>
            </Row>
          </View>
        </Row>

        <View style={{ gap: th.space(2), marginTop: th.space(4) }}>
          <Tile icon={CalendarDays} label={t('Period shuru')} value={formatDate(sub.currentPeriodStart, { year: true })} />
          <Tile icon={CalendarClock} label={trial ? t('Trial khatam') : t('Plan khatam')} value={formatDate(b.endsAt!, { year: true })}
            hint={daysLeft != null ? daysText(daysLeft) : undefined} warn={daysLeft != null && daysLeft <= 7} />
          <Tile icon={RefreshCw} label={t('Renew')} value={t(INTERVAL[sub.interval]?.label ?? sub.interval)}
            hint={sub.cancelAtPeriodEnd ? t('Period ke aakhir par band hoga') : sub.autoRenew ? t('Khud renew hota hai') : t('Khud renew karna hoga')} />
        </View>

        {b.can.plans && <Button style={{ marginTop: th.space(4) }} variant={needsRenewal || trial ? 'primary' : 'secondary'} fullWidth onPress={onPlans}>{cta}</Button>}

        {canStop && (
          <View style={{ marginTop: th.space(3), gap: th.space(2) }}>
            <Text size="xs" tone="muted">
              {sub.cancelAtPeriodEnd
                ? t('Ye plan {{currentPeriodEnd}} ko band ho jayega — data mehfooz rahega.', { currentPeriodEnd: formatDate(sub.currentPeriodEnd, { year: true }) })
                : t('Kabhi bhi band kar sakte hain — period ke aakhir tak sab chalta rahega.')}
            </Text>
            {sub.cancelAtPeriodEnd
              ? <Button variant="soft" icon={RefreshCw} loading={b.reactivate.isPending} onPress={() => b.reactivate.mutate()}>{t('Wapas chalu karein')}</Button>
              : <Button variant="critical" icon={XCircle} loading={b.cancel.isPending} onPress={stop}>{t('Plan band karein')}</Button>}
          </View>
        )}
      </Card>

      {pending && (
        <Card tone="warning" title={t('{{name}} · {{value}} — payment baqi', { name: pending.subscription.plan.name, value: t(INTERVAL[pending.subscription.interval]?.label ?? '') })}>
          <Text size="sm">{t('Bill {{invoiceNumber}}. Payment approve hote hi naya plan chalu ho jayega — tab tak {{value}} chalta rahega.', { invoiceNumber: pending.invoice.invoiceNumber, value: trial ? t('trial') : t('purana plan') })}</Text>
          {b.can.manage && (
            <Button style={{ marginTop: th.space(3) }} icon={CreditCard} onPress={() => router.push(`/billing/invoice/${pending.invoice.id}/pay` as never)}>
              {t('{{amountDue}} ada karein', { amountDue: `Rs ${Math.round(pending.invoice.amountDue).toLocaleString('en-US')}` })}
            </Button>
          )}
        </Card>
      )}

      {needsRenewal && !trial && !pending && (
        <Card tone="danger" title={sub.status === 'ACTIVE' ? t('Renew {{value}} karna hai', { value: daysLeft && daysLeft > 0 ? t('{{daysLeft}} din me', { daysLeft }) : t('aaj') }) : t('Plan renew karna zaroori hai')}>
          <Text size="sm">{t('Payment khud nahi kat-ti — renew aap ko karna hai. Bache hue din waste nahi honge, naye period me jud jayenge.')}</Text>
          {b.can.plans && <Button style={{ marginTop: th.space(3) }} icon={RefreshCw} onPress={onPlans}>{t('Renew')}</Button>}
        </Card>
      )}

      {totals.open.length > 1 && b.can.manage && (
        <Card tone="info" title={t('{{count}} bill khule hain', { count: totals.open.length })}>
          <Text size="sm">{t('Ek bill rakha jayega, baqi faltu khule bill band ho jayenge. Jis bill ki payment check ho rahi ho, wo kabhi band nahi hota.')}</Text>
          <Button style={{ marginTop: th.space(3) }} variant="secondary" icon={Wrench} loading={b.cleanup.isPending} onPress={() => b.cleanup.mutate()}>{t('Faltu band karein')}</Button>
        </Card>
      )}
    </View>
  );
}

function Tile({ icon, label, value, hint, warn }: { icon: typeof CalendarDays; label: string; value: string; hint?: string; warn?: boolean }) {
  const th = useTheme();
  return (
    <Row gap={3} justify="between" style={{ backgroundColor: th.colors.surfaceMuted, borderRadius: th.radius('lg'), paddingHorizontal: th.space(3), paddingVertical: th.space(3) }}>
      <Row gap={2} style={{ flex: 1 }}>
        <Icon icon={icon} size={16} tone="muted" />
        <Text size="sm" tone="muted" style={{ flexShrink: 1 }}>{label}</Text>
      </Row>
      <View style={{ alignItems: 'flex-end' }}>
        <Text size="sm" weight="semibold">{value}</Text>
        {hint ? <Text size="xs" tone={warn ? 'warning' : 'muted'} weight={warn ? 'semibold' : 'regular'}>{hint}</Text> : null}
      </View>
    </Row>
  );
}
