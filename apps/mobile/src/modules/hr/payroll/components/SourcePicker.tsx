/**
 * Where the money comes from: the branch's open drawer, a safe / bank /
 * wallet account, or (for a salary) "pay later". Shows what each holds and
 * warns when it is not enough.
 */

import type { LucideIcon } from 'lucide-react-native';
import { Clock } from 'lucide-react-native';
import { View } from 'react-native';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { ListGroup, ListRow, Switch, Text, useTheme } from '@/design';
import type { PaySource, Sources } from '../api/payroll';
import { ACCOUNT_ICON, DRAWER_ICON } from '../lib/meta';

export interface SourceValue { source: PaySource; accountId?: string; allowNegative: boolean }

export function SourcePicker({ sources, value, onChange, total, allowLater }: {
  sources: Sources; value: SourceValue; onChange: (v: SourceValue) => void; total: number; allowLater?: boolean;
}) {
  const th = useTheme();
  const drawerOk = sources.canDrawer && !!sources.drawer;
  const accounts = sources.canAccount ? sources.accounts : [];
  const held = value.source === 'DRAWER' ? sources.drawer?.cash ?? 0
    : value.source === 'ACCOUNT' ? accounts.find((a) => a.id === value.accountId)?.balance ?? 0 : Infinity;
  const short = value.source !== 'NONE' && total > held + 0.5;

  const option = (key: string, active: boolean, icon: LucideIcon, title: string, sub: string, onPress: () => void, disabled?: boolean) => (
    <ListRow key={key} icon={icon} iconTone={active ? 'brand' : 'neutral'} title={title} subtitle={sub} selected={active} disabled={disabled} onPress={onPress} />
  );

  return (
    <View style={{ gap: th.space(2) }}>
      <Text size="sm" weight="medium">{t('Paisa kahan se dena hai?')}</Text>
      <ListGroup>
        {sources.canDrawer && option('drawer', value.source === 'DRAWER', DRAWER_ICON, t('Galle se (cash)'),
          sources.drawer ? t('{{registerNumber}} · abhi {{cash}}', { registerNumber: sources.drawer.registerNumber, cash: formatPKR(sources.drawer.cash) }) : t('Galla band hai ya branch nahi chuni'),
          () => onChange({ ...value, source: 'DRAWER', accountId: undefined }), !drawerOk)}
        {accounts.map((a) => option(a.id, value.source === 'ACCOUNT' && value.accountId === a.id, ACCOUNT_ICON[a.kind], a.name,
          `${a.shopName ?? t('Poora karobar')} · ${formatPKR(a.balance)}`, () => onChange({ ...value, source: 'ACCOUNT', accountId: a.id })))}
        {allowLater && option('later', value.source === 'NONE', Clock, t('Abhi nahi — baad me dein'), t('Tankhwah ban jayegi, amount baqi rahegi'),
          () => onChange({ ...value, source: 'NONE', accountId: undefined }))}
      </ListGroup>
      <Text size="xs" tone="muted">{t('Galle se diya cash shift ke hisaab me "Cash out" likha jata hai; account se diya us account ki statement me. Dono ki permission Team settings me alag hai.')}</Text>
      {!sources.canDrawer && !accounts.length && !allowLater && <Text size="sm" tone="danger">{t('Aap ko galle ya account se paisa dene ki permission nahi.')}</Text>}
      {short && (
        <View style={{ gap: th.space(2), padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.warning.soft, borderWidth: 1, borderColor: th.colors.warning.border }}>
          <Text size="sm">{t('Yahan sirf {{held}} hain, dena {{total}} hai.', { held: formatPKR(held), total: formatPKR(total) })}</Text>
          <Switch value={value.allowNegative} onChange={(v) => onChange({ ...value, allowNegative: v })} label={t('Kam ho to bhi dein')}
            description={t('Hisaab minus me chala jayega — baad me paisa daal kar barabar karein')} />
        </View>
      )}
    </View>
  );
}

/** Ready to send: a source is chosen and, when short, the user agreed. */
export function sourceReady(sources: Sources | undefined, v: SourceValue, total: number) {
  if (!sources) return false;
  if (v.source === 'NONE') return true;
  if (v.source === 'DRAWER' && !(sources.canDrawer && sources.drawer)) return false;
  if (v.source === 'ACCOUNT' && !sources.accounts.some((a) => a.id === v.accountId)) return false;
  const held = v.source === 'DRAWER' ? sources.drawer?.cash ?? 0 : sources.accounts.find((a) => a.id === v.accountId)?.balance ?? 0;
  return total <= held + 0.5 || v.allowNegative;
}

/** First sensible choice: the drawer when open, else the first account, else later. */
export function defaultSource(sources: Sources | undefined, allowLater: boolean): SourceValue {
  if (sources?.canDrawer && sources.drawer) return { source: 'DRAWER', allowNegative: false };
  const a = sources?.canAccount ? sources.accounts[0] : undefined;
  if (a) return { source: 'ACCOUNT', accountId: a.id, allowNegative: false };
  return { source: allowLater ? 'NONE' : 'DRAWER', allowNegative: false };
}

