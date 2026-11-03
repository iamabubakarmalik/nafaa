/** Plans: pick the period, compare limits and features, start or renew a plan. */

import { router } from 'expo-router';
import { Check, Crown, Minus, Rocket, Sparkles, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t, Trans } from '@/core/i18n';
import { Amount, Badge, Button, Card, Icon, Row, Segmented, Sheet, Skeleton, Text, toast, useTheme } from '@/design';
import type { BillingInterval, Plan } from '../api/billing';
import { INTERVAL, PLAN_FEATURES, PLAN_LIMITS, limitText, priceFor, savingFor } from '../lib/meta';
import type { BillingData } from '../lib/useBilling';

const PLAN_ICON: Record<string, typeof Sparkles> = { 'free-trial': Sparkles, basic: Zap, pro: Rocket, enterprise: Crown };

interface Cta { label: string; disabled?: boolean; payInvoiceId?: string }

export function PlanCards({ b, interval, setInterval }: { b: BillingData; interval: BillingInterval; setInterval: (i: BillingInterval) => void }) {
  const th = useTheme();
  const [confirm, setConfirm] = useState<Plan | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const { sub, pending, needsRenewal, plans } = b;

  const ctaFor = (plan: Plan): Cta => {
    if (plan.priceMonthly === 0) {
      const onTrial = sub?.status === 'TRIAL' && sub.plan?.id === plan.id;
      return { label: onTrial ? t('Aap trial par hain') : t('Trial plan'), disabled: true };
    }
    if (pending && pending.subscription.plan.id === plan.id && pending.subscription.interval === interval) {
      return { label: t('Payment jari rakhein'), payInvoiceId: pending.invoice.id };
    }
    if (sub?.plan?.id === plan.id && ['ACTIVE', 'PAST_DUE', 'EXPIRED'].includes(sub.status)) {
      return sub.interval === interval
        ? { label: needsRenewal ? t('Renew karein') : t('{{label}} aage barhayein', { label: t(INTERVAL[interval].label) }) }
        : { label: t('{{label}} par jayein', { label: t(INTERVAL[interval].label) }) };
    }
    const currentMonthly = sub && sub.status !== 'TRIAL' ? sub.plan?.priceMonthly ?? 0 : 0;
    if (currentMonthly > 0 && plan.priceMonthly < currentMonthly) return { label: t('Chhota plan lein') };
    if (currentMonthly > 0 && plan.priceMonthly > currentMonthly) return { label: t('Upgrade karein') };
    return { label: t('Ye plan lein') };
  };

  const startPlan = () => {
    if (!confirm) return;
    b.start.mutate({ planId: confirm.id, interval }, {
      onSuccess: (data) => {
        if (data.repriced) toast.success(t('Bill update ho gaya'), { message: t('{{invoiceNumber}} ab {{amountDue}} ka hai — naya bill nahi bana', { invoiceNumber: data.invoice.invoiceNumber, amountDue: `Rs ${Math.round(data.invoice.amountDue).toLocaleString('en-US')}` }) });
        else if (data.reused) toast.success(t('Aap ke khule bill par le ja rahe hain'), { message: data.invoice.invoiceNumber });
        else toast.success(t('Plan chun liya — ab payment karein'));
        setConfirm(null);
        router.push(`/billing/invoice/${data.invoice.id}/pay` as never);
      },
    });
  };

  if (b.loading.plans) return <View style={{ gap: th.space(3) }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={220} radius={th.radius('xl')} />)}</View>;
  const best = plans.filter((p) => p.priceMonthly > 0).find((p) => p.slug === 'pro')?.id;

  return (
    <View style={{ gap: th.space(3) }}>
      <Segmented value={interval} onChange={setInterval} options={(['MONTHLY', 'QUARTERLY', 'YEARLY'] as const).map((i) => ({ value: i, label: t(INTERVAL[i].label) }))} />
      <Text size="xs" tone="muted">{t('Lambi period = kam qeemat.')}</Text>
      {!b.can.manage && <Card tone="info"><Text size="sm">{t('Plan lena ya badalna sirf malik (billing ki permission wala) kar sakta hai. Aap plans dekh sakte hain.')}</Text></Card>}

      {plans.map((plan) => {
        const PlanIcon = PLAN_ICON[plan.slug] ?? Sparkles;
        const price = priceFor(plan, interval);
        const saving = savingFor(plan, interval);
        const cta = ctaFor(plan);
        const current = sub?.plan?.id === plan.id;
        const expanded = open === plan.id;
        const features = PLAN_FEATURES.filter((f) => plan[f.planKey]);
        const shown = expanded ? PLAN_FEATURES : features.slice(0, 6);
        return (
          <Card key={plan.id} style={plan.id === best ? { borderColor: th.colors.brand.solid, borderWidth: 2 } : undefined}>
            <Row justify="between">
              <Row gap={2}><Icon icon={PlanIcon} size={20} tone="brand" /><Text size="lg" weight="bold">{plan.name}</Text></Row>
              {current ? <Badge tone="success" dot>{t('Aap ka plan')}</Badge> : plan.id === best ? <Badge tone="brand">{t('Zyada log yehi lete hain')}</Badge> : null}
            </Row>
            {plan.description ? <Text size="sm" tone="muted" style={{ marginTop: 2 }}>{plan.description}</Text> : null}
            <Row gap={1} style={{ marginTop: th.space(3) }} align="end">
              {plan.priceMonthly === 0 ? <Text size="2xl" weight="bold">{t('Free')}</Text> : <Amount value={price} size="2xl" weight="bold" />}
              {plan.priceMonthly > 0 && <Text size="sm" tone="muted">/ {t(INTERVAL[interval].per)}</Text>}
            </Row>
            <Text size="xs" tone="success" weight="semibold" style={{ minHeight: 18 }}>
              {saving ? t('{{amount}} bachat ({{percent}}%)', { amount: `Rs ${Math.round(saving.amount).toLocaleString('en-US')}`, percent: saving.percent }) : plan.trialDays ? t('{{trialDays}} din free', { trialDays: plan.trialDays }) : ''}
            </Text>

            <View style={{ gap: th.space(1.5), marginTop: th.space(2) }}>
              {PLAN_LIMITS.map((l) => (
                <Row key={l.key} gap={2}><Icon icon={l.icon} size={14} tone="subtle" /><Text size="sm"><Text size="sm" weight="bold" ltr>{limitText(plan[l.planKey], l.unlimitedAt)}</Text> {t(l.label)}</Text></Row>
              ))}
            </View>
            <View style={{ gap: th.space(1.5), marginTop: th.space(3), paddingTop: th.space(3), borderTopWidth: 1, borderTopColor: th.colors.divider }}>
              {shown.map((f) => {
                const has = !!plan[f.planKey];
                return <Row key={f.key} gap={2}><Icon icon={has ? Check : Minus} size={14} tone={has ? 'success' : 'subtle'} /><Text size="sm" tone={has ? 'default' : 'muted'}>{t(f.label)}</Text></Row>;
              })}
              {features.length > 6 && (
                <Button variant="link" size="sm" onPress={() => setOpen(expanded ? null : plan.id)}>
                  {expanded ? t('Kam dikhayein') : t('Sab dekhein')}
                </Button>
              )}
            </View>

            <Button style={{ marginTop: th.space(4) }} fullWidth variant={plan.id === best || cta.payInvoiceId ? 'primary' : 'secondary'}
              disabled={cta.disabled || !b.can.manage}
              onPress={() => (cta.payInvoiceId ? router.push(`/billing/invoice/${cta.payInvoiceId}/pay` as never) : setConfirm(plan))}>
              {cta.label}
            </Button>
          </Card>
        );
      })}

      <ConfirmPlan plan={confirm} interval={interval} b={b} onConfirm={startPlan} onClose={() => setConfirm(null)} />
    </View>
  );
}

function ConfirmPlan({ plan, interval, b, onConfirm, onClose }: { plan: Plan | null; interval: BillingInterval; b: BillingData; onConfirm: () => void; onClose: () => void }) {
  const th = useTheme();
  const pending = b.pending;
  const samePending = !!plan && !!pending && pending.subscription.plan.id === plan.id && pending.subscription.interval === interval;
  const renewal = !!plan && !pending && b.sub?.plan?.id === plan.id && ['ACTIVE', 'PAST_DUE', 'EXPIRED'].includes(b.sub.status);
  return (
    <Sheet open={!!plan} onClose={onClose} title={plan ? `${plan.name} · ${t(INTERVAL[interval].label)}` : ''}
      description={plan ? `Rs ${Math.round(priceFor(plan, interval)).toLocaleString('en-US')} / ${t(INTERVAL[interval].per)}` : undefined}
      footer={(
        <Row gap={3}>
          <Button variant="secondary" style={{ flex: 1 }} disabled={b.start.isPending} onPress={onClose}>{t('Wapas')}</Button>
          <Button style={{ flex: 1.4 }} loading={b.start.isPending} onPress={onConfirm}>
            {samePending ? t('Payment par jayein') : renewal ? t('Renew aur payment') : t('Haan, payment karein')}
          </Button>
        </Row>
      )}>
      {plan && (
        <View style={{ gap: th.space(3) }}>
          {samePending ? (
            <Card tone="info" title={t('Bill pehle se bana hua hai')}><Text size="sm">{t('Isi plan ka bill khula hai. Aap ko usi par le jayenge — naya bill nahi banega.')}</Text></Card>
          ) : pending ? (
            <Card tone="warning" title={t('Wohi bill update hoga')}>
              <Text size="sm">
                <Trans text="Khula bill {{invoiceNumber}} ({{name}} — {{amountDue}}) ab {{plan}} ke hisaab se {{price}} ka ho jayega. Naya bill nahi banega."
                  values={{ invoiceNumber: pending.invoice.invoiceNumber, name: pending.subscription.plan.name, amountDue: `Rs ${Math.round(pending.invoice.amountDue).toLocaleString('en-US')}`, plan: <Text size="sm" weight="bold">{plan.name}</Text>, price: <Text size="sm" weight="bold" ltr>{`Rs ${Math.round(priceFor(plan, interval)).toLocaleString('en-US')}`}</Text> }} />
              </Text>
            </Card>
          ) : renewal ? (
            <Card tone="info" title={t('Renew')}><Text size="sm">{t('Payment approve hote hi naya period shuru hoga. Bache hue din waste nahi honge, naye period me jud jayenge.')}</Text></Card>
          ) : (
            <Card tone="success" title={t('Bill banega')}><Text size="sm">{t('Bill banega aur aap payment ke safhe par chale jayenge. Payment approve hone tak maujooda trial/plan chalta rahega.')}</Text></Card>
          )}
          {PLAN_LIMITS.map((l) => (
            <Row key={l.key} gap={2}><Icon icon={Check} size={16} tone="success" /><Text size="sm"><Text size="sm" weight="bold" ltr>{limitText(plan[l.planKey], l.unlimitedAt)}</Text> {t(l.label)}</Text></Row>
          ))}
        </View>
      )}
    </Sheet>
  );
}
