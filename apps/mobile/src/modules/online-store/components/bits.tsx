/**
 * Small shared pieces of the online store screens: status and risk badges,
 * the risk card, a callout note and the "Connect on web" card. KpiStrip and
 * SavedDataNote now live in the kit (`@/design`).
 */

import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { ExternalLink, Monitor, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react-native';
import {
  RISK_TONE, STATUS_TONE, riskIcon, riskReasons, type CustomerRisk, type OnlineOrderStatus,
} from '@nafaa/core/online-store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Badge, Button, Card, Icon, Text, useTheme, type StatusTone } from '@/design';
import { RISK_LABEL, STATUS_LABEL } from '../lib/labels';
import { openOnWeb } from '../lib/device';

export function OrderStatusBadge({ status, long }: { status: OnlineOrderStatus; long?: boolean }) {
  const s = STATUS_LABEL[status] ?? STATUS_LABEL.PENDING;
  return <Badge tone={STATUS_TONE[status] as StatusTone} dot>{t(long ? s.label : s.short)}</Badge>;
}

/** List badge: only when there is something worth saying. */
export function RiskBadge({ risk }: { risk?: CustomerRisk | null }) {
  if (!risk) return null;
  const tone = RISK_TONE[risk.level];
  return (
    <>
      {risk.level !== 'OK' && (
        <Badge tone={tone === 'inverse' ? 'neutral' : tone as StatusTone} solid={risk.level === 'HIGH' || risk.level === 'BLOCKED'}>
          {t(RISK_LABEL[risk.level])}
        </Badge>
      )}
      {(risk.duplicateOpen ?? 0) > 0 && <Badge tone="accent">{t('Dobara order ({{duplicateOpen}})', { duplicateOpen: risk.duplicateOpen })}</Badge>}
    </>
  );
}

/** Order detail: the customer's record with the shop. */
export function RiskCard({ risk }: { risk?: CustomerRisk | null }) {
  const th = useTheme();
  if (!risk) return null;
  const tone = RISK_TONE[risk.level];
  const c = tone === 'inverse' ? { soft: th.colors.text, text: th.colors.textInverse } : th.colors[tone as StatusTone];
  const fg = tone === 'inverse' ? th.colors.textInverse : (c as { text: string }).text;
  const kind = riskIcon(risk.level);
  const icon: LucideIcon = kind === 'alert' ? ShieldAlert : kind === 'question' ? ShieldQuestion : ShieldCheck;
  const reasons = riskReasons(risk);
  return (
    <View style={{ backgroundColor: c.soft, borderRadius: th.radius('lg'), padding: th.space(3), gap: th.space(1) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
        <Icon icon={icon} size={16} color={fg} />
        <Text size="sm" weight="bold" color={fg}>{t(RISK_LABEL[risk.level])}</Text>
      </View>
      {reasons.map((r) => <Text key={r} size="xs" weight="medium" color={fg}>• {r}</Text>)}
      {(risk.duplicateOpen ?? 0) > 0 && (
        <Text size="xs" weight="bold" color={fg}>{t('Dhyan: isi customer ke {{duplicateOpen}} aur order abhi khule hain — dobara to nahi bheja?', { duplicateOpen: risk.duplicateOpen })}</Text>
      )}
      {risk.total > 0 && (
        <Text size="2xs" weight="semibold" color={fg} style={{ opacity: 0.85 }}>
          {[
            t('{{total}} pichhle order', { total: risk.total }),
            t('{{delivered}} liye', { delivered: risk.delivered }),
            risk.returned > 0 ? t('{{returned}} wapas', { returned: risk.returned }) : null,
            risk.cancelled > 0 ? t('{{cancelled}} cancel', { cancelled: risk.cancelled }) : null,
            risk.spent > 0 ? t('{{spent}} ka maal liya', { spent: formatMoney(risk.spent) }) : null,
          ].filter(Boolean).join(' · ')}
        </Text>
      )}
    </View>
  );
}

/** A coloured callout with an icon (warnings inside detail screens). */
export function Note({ tone = 'warning', icon, title, children, action }: {
  tone?: StatusTone; icon?: LucideIcon; title?: string; children?: ReactNode; action?: ReactNode;
}) {
  const th = useTheme();
  const c = th.colors[tone];
  return (
    <View style={{ flexDirection: 'row', gap: th.space(2.5), backgroundColor: c.soft, borderColor: c.border, borderWidth: 1, borderRadius: th.radius('lg'), padding: th.space(3) }}>
      {icon && <View style={{ paddingTop: 1 }}><Icon icon={icon} size={18} color={c.text} /></View>}
      <View style={{ flex: 1, gap: th.space(1) }}>
        {title && <Text size="sm" weight="bold" color={c.text}>{title}</Text>}
        {typeof children === 'string' ? <Text size="sm" weight="medium" color={c.text}>{children}</Text> : children}
        {action}
      </View>
    </View>
  );
}

/**
 * Under a screen showing saved data offline: "No internet · Last updated 5 min ago".
 * Nothing when the data is live.
 */
/** Connecting channels and payment gateways stays on the web (OAuth, keys, plugins). */
export function ConnectOnWebCard({ title, message, path = '/online-store/connect' }: { title?: string; message?: string; path?: string }) {
  const th = useTheme();
  return (
    <Card tone="info">
      <View style={{ flexDirection: 'row', gap: th.space(3), alignItems: 'center' }}>
        <View style={{ width: 44, height: 44, borderRadius: th.radius('lg'), backgroundColor: th.colors.info.solid, alignItems: 'center', justifyContent: 'center' }}>
          <Icon icon={Monitor} size={22} color={th.colors.info.onSolid} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text size="base" weight="bold">{title ?? t('Naya channel web par jorein')}</Text>
          <Text size="sm" tone="secondary">{message ?? t('Shopify, WooCommerce, Daraz aur website computer se ek dafa jorein — phir sab orders yahan app me chalayein.')}</Text>
        </View>
      </View>
      <Button variant="secondary" icon={ExternalLink} style={{ marginTop: th.space(3) }} onPress={() => openOnWeb(path)}>{t('Web par kholein')}</Button>
    </Card>
  );
}

// Moved to the kit; re-exported for existing imports.
export { KpiStrip, SavedDataNote } from '@/design';
