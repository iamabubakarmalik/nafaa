/**
 * Permission boxes in plain groups. Every box does exactly what it says;
 * nothing is granted behind the scenes. A role preset fills the boxes once,
 * and the strip on top shows how the choice differs from that role. Warns
 * (without blocking) when the POS or the booker app lacks the reads it needs.
 */

import { AlertTriangle, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { BOOKER_REQUIRED_PERMISSIONS, POS_REQUIRED_PERMISSIONS, PERMISSIONS } from '@/core/permissions';
import { Button, Card, Checkbox, Chip, Icon, PressableScale, Row, SearchBar, Text, useTheme } from '@/design';
import type { AssignableRole } from '../api/organization';
import { ROLES, ASSIGNABLE } from '../lib/meta';
import { permText } from '../lib/permText';
import { useDistributionPresets, usePermissionGroups, useRoleDefaults } from '../lib/useTeam';

export function PermissionEditor({ value, onChange, role, readOnly }: {
  value: string[];
  onChange?: (next: string[]) => void;
  /** The person's role; its preset is the yardstick for the "differs" strip. */
  role: AssignableRole;
  readOnly?: boolean;
}) {
  const th = useTheme();
  const defaults = useRoleDefaults();
  const groups = usePermissionGroups();
  const dist = useDistributionPresets();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const set = new Set(value);
  const preset = new Set(defaults[role] ?? []);
  const visible = new Set(groups.flatMap((g) => g.permissions as string[]));
  const extra = value.filter((p) => !preset.has(p) && visible.has(p));
  const missing = [...preset].filter((p) => !set.has(p) && visible.has(p));
  const posGap = set.has(PERMISSIONS.POS_USE) ? POS_REQUIRED_PERMISSIONS.filter((p) => !set.has(p)) : [];
  const bookerGap = set.has(PERMISSIONS.DISTRIBUTION_ORDERS_BOOK) ? BOOKER_REQUIRED_PERMISSIONS.filter((p) => !set.has(p)) : [];
  const needle = q.trim().toLowerCase();
  const roleLabel = t(ROLES[role].label);

  const toggle = (p: string) => onChange?.(set.has(p) ? value.filter((x) => x !== p) : [...value, p]);
  const toggleGroup = (perms: string[]) => {
    const all = perms.every((p) => set.has(p));
    onChange?.(all ? value.filter((p) => !perms.includes(p)) : [...new Set([...value, ...perms])]);
  };
  const warn = (title: string, text: string, gap: string[]) => (
    <Card tone="warning">
      <View style={{ gap: th.space(2) }}>
        <Row gap={2}><Icon icon={AlertTriangle} size={18} tone="warning" /><Text weight="bold" style={{ flex: 1 }}>{title}</Text></Row>
        <Text size="sm">{text}</Text>
        {!readOnly && <Button size="sm" variant="secondary" onPress={() => onChange?.([...new Set([...value, ...gap])])}>{t('Yeh bhi de dein')}</Button>}
      </View>
    </Card>
  );

  return (
    <View style={{ gap: th.space(3) }}>
      {!readOnly && (
        <View style={{ gap: th.space(1.5) }}>
          <Text size="xs" weight="semibold" tone="muted">{t('Ek click me:')}</Text>
          <Row gap={2} wrap>
            {ASSIGNABLE.map((r) => (
              <Chip key={r} label={t('{{label}} wali ({{count}})', { label: t(ROLES[r].label), count: (defaults[r] ?? []).length })} onPress={() => onChange?.([...(defaults[r] ?? [])])} />
            ))}
            {dist.map((p) => <Chip key={p.key} label={p.label} onPress={() => onChange?.([...p.permissions])} />)}
            <Chip label={t('Sab hatayein')} onPress={() => onChange?.([])} />
          </Row>
        </View>
      )}

      <Card tone="muted">
        <View style={{ gap: th.space(1) }}>
          <Text size="sm" weight="bold">{t('{{count}} permissions', { count: value.length })}</Text>
          {extra.length === 0 && missing.length === 0
            ? <Text size="sm" tone="success">{t('Bilkul {{label}} jaisi', { label: roleLabel })}</Text>
            : (
              <>
                {extra.length > 0 && <Row gap={1}><Icon icon={Plus} size={13} tone="info" /><Text size="xs">{t('{{label}} se zyada: {{count}}', { label: roleLabel, count: extra.length })}</Text></Row>}
                {missing.length > 0 && <Row gap={1}><Icon icon={Minus} size={13} tone="warning" /><Text size="xs">{t('{{label}} se kam: {{count}}', { label: roleLabel, count: missing.length })}</Text></Row>}
              </>
            )}
          <Text size="xs" tone="muted">{t('Jo nishan laga hai sirf wohi milta hai — koi chhupi permission nahi.')}</Text>
        </View>
      </Card>

      {posGap.length > 0 && warn(
        t('POS counter theek se nahi chalega'),
        t('Counter ki permission hai magar yeh nahi: {{value}}. In ke baghair counter par maal nazar nahi aayega aur offline sync ruk jayegi.', { value: posGap.map((p) => permText(p)[0]).join(', ') }),
        posGap,
      )}
      {bookerGap.length > 0 && warn(
        t('Booker app theek se nahi chalegi'),
        t('Order book karne ki permission hai magar yeh nahi: {{value}}. In ke baghair booker ko customers ya maal nazar nahi aayega.', { value: bookerGap.map((p) => permText(p)[0]).join(', ') }),
        bookerGap,
      )}

      <SearchBar value={q} onChangeText={setQ} placeholder={t('Permission search — maslan: khata, void, expense')} />

      {groups.map((g) => {
        const perms = (g.permissions as string[]).filter((p) => !needle || `${p} ${permText(p).join(' ')}`.toLowerCase().includes(needle));
        if (!perms.length) return null;
        const all = g.permissions as string[];
        const on = all.filter((p) => set.has(p)).length;
        const isOpen = needle ? true : open[g.title] ?? on > 0;
        return (
          <View key={g.title} style={{ backgroundColor: th.colors.surface, borderRadius: th.radius('xl'), borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border, overflow: 'hidden' }}>
            <Row align="center" style={{ paddingHorizontal: th.space(3) }}>
              <PressableScale onPress={() => setOpen((o) => ({ ...o, [g.title]: !isOpen }))} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: th.space(2), minHeight: 48 }}>
                <Text>{g.emoji}</Text>
                <Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{g.title}</Text>
                <Text size="xs" weight="bold" tone={on ? 'brand' : 'muted'} ltr>{`${on}/${all.length}`}</Text>
                <Icon icon={isOpen ? ChevronUp : ChevronDown} size={16} tone="subtle" />
              </PressableScale>
              {!readOnly && <Button size="sm" variant="ghost" onPress={() => toggleGroup(all)}>{on === all.length ? t('Sab hatayein') : t('Sab dein')}</Button>}
            </Row>
            {isOpen && perms.map((p) => {
              const [label, hint] = permText(p);
              return (
                <View key={p} style={{ paddingHorizontal: th.space(3), borderTopWidth: 1, borderTopColor: th.colors.divider }}>
                  <Checkbox value={set.has(p)} disabled={readOnly} onChange={() => toggle(p)} label={label} description={hint || undefined} />
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
