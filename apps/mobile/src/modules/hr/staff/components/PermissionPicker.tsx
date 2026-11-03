/**
 * Permission boxes in plain groups. Every box does exactly what it says;
 * nothing is granted behind the scenes. A role preset fills the boxes once,
 * and the strip on top shows how the choice differs from that role. Warns
 * when the POS or the booker app is on without the reads it needs. With
 * distribution on, its presets fill the boxes the same way.
 */

import { AlertTriangle, ChevronDown, Minus, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { BOOKER_REQUIRED_PERMISSIONS, POS_REQUIRED_PERMISSIONS, PERMISSIONS, type PermissionGroup } from '@/core/permissions';
import { Button, Card, Checkbox, Chip, Icon, PressableScale, Row, SearchBar, StatusPill, Text, useTheme } from '@/design';
import { useDistributionPresets, usePermissionGroups, useRoleDefaults } from '../lib/hooks';
import { ASSIGNABLE, ROLES, permText, type AssignableRole } from '../lib/meta';

export function PermissionPicker({ value, onChange, role, readOnly }: {
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
  const set = useMemo(() => new Set(value), [value]);
  const preset = useMemo(() => new Set(defaults[role] ?? []), [defaults, role]);
  const visible = useMemo(() => new Set(groups.flatMap((g) => g.permissions as string[])), [groups]);
  const extra = value.filter((p) => !preset.has(p) && visible.has(p));
  const missing = [...preset].filter((p) => !set.has(p) && visible.has(p));
  const posGap = set.has('pos.use') ? POS_REQUIRED_PERMISSIONS.filter((p) => !set.has(p)) : [];
  const bookerGap = set.has(PERMISSIONS.DISTRIBUTION_ORDERS_BOOK) ? BOOKER_REQUIRED_PERMISSIONS.filter((p) => !set.has(p)) : [];
  const needle = q.trim().toLowerCase();
  const roleName = t(ROLES[role].label);

  const toggle = (p: string) => onChange?.(set.has(p) ? value.filter((x) => x !== p) : [...value, p]);
  const toggleGroup = (g: PermissionGroup) => {
    const all = g.permissions.every((p) => set.has(p));
    onChange?.(all ? value.filter((p) => !(g.permissions as string[]).includes(p)) : [...new Set([...value, ...g.permissions])]);
  };
  const samePreset = (perms: string[]) => value.length === perms.length && perms.every((x) => set.has(x));

  const gap = (title: string, list: string[]) => (
    <Card tone="warning">
      <Row gap={2} align="start">
        <Icon icon={AlertTriangle} size={18} tone="warning" />
        <View style={{ flex: 1, gap: th.space(1) }}>
          <Text size="sm" weight="semibold">{title}</Text>
          <Text size="xs" tone="secondary">{t('Yeh permission nahi: {{value}}. In ke baghair kaam poora nahi chalega.', { value: list.map((p) => permText(p)[0]).join(', ') })}</Text>
          {!readOnly && <Button size="sm" variant="soft" onPress={() => onChange?.([...new Set([...value, ...list])])}>{t('Yeh bhi de dein')}</Button>}
        </View>
      </Row>
    </Card>
  );

  return (
    <View style={{ gap: th.space(3) }}>
      {!readOnly && (
        <View style={{ gap: th.space(2) }}>
          <Text size="xs" weight="medium" tone="muted">{t('Ek click me:')}</Text>
          <Row gap={2} wrap>
            {ASSIGNABLE.map((r) => (
              <Chip key={r} label={t('{{label}} wali ({{count}})', { label: t(ROLES[r].label), count: (defaults[r] ?? []).length })}
                selected={samePreset(defaults[r] ?? [])} onPress={() => onChange?.([...(defaults[r] ?? [])])} />
            ))}
            {dist.map((p) => <Chip key={p.key} label={p.label} selected={samePreset(p.permissions)} onPress={() => onChange?.([...p.permissions])} />)}
            <Chip label={t('Sab hatayein')} onPress={() => onChange?.([])} />
          </Row>
        </View>
      )}

      <Card tone="muted">
        <Row gap={3} wrap>
          <Text size="sm" weight="semibold">{t('{{count}} permissions', { count: value.length })}</Text>
          {!extra.length && !missing.length
            ? <Text size="sm" tone="success">{t('Bilkul {{label}} jaisi', { label: roleName })}</Text>
            : (
              <>
                {extra.length > 0 && <Row gap={1}><Icon icon={Plus} size={12} tone="brand" /><Text size="xs" tone="brand">{t('{{label}} se zyada: {{count}}', { label: roleName, count: extra.length })}</Text></Row>}
                {missing.length > 0 && <Row gap={1}><Icon icon={Minus} size={12} tone="warning" /><Text size="xs" tone="warning">{t('{{label}} se kam: {{count}}', { label: roleName, count: missing.length })}</Text></Row>}
              </>
            )}
        </Row>
        <Text size="xs" tone="muted" style={{ marginTop: th.space(1) }}>{t('Jo nishan laga hai sirf wohi milta hai — koi chhupi permission nahi.')}</Text>
      </Card>

      {posGap.length > 0 && gap(t('POS counter theek se nahi chalega'), posGap)}
      {bookerGap.length > 0 && gap(t('Booker app theek se nahi chalegi'), bookerGap)}

      <SearchBar value={q} onChangeText={setQ} placeholder={t('Permission search — maslan: khata, void, expense')} />

      {groups.map((g) => {
        const perms = (g.permissions as string[]).filter((p) => !needle || `${p} ${permText(p).join(' ')}`.toLowerCase().includes(needle));
        if (!perms.length) return null;
        const on = g.permissions.filter((p) => set.has(p)).length;
        const isOpen = needle ? true : open[g.title] ?? on > 0;
        const all = on === g.permissions.length;
        return (
          <Card key={g.title} flush>
            <Row gap={2} style={{ paddingHorizontal: th.space(3) }}>
              <PressableScale onPress={() => setOpen((o) => ({ ...o, [g.title]: !isOpen }))} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: th.space(2), minHeight: 48 }}>
                <Text size="base">{g.emoji}</Text>
                <Text size="sm" weight="semibold" style={{ flexShrink: 1 }} numberOfLines={1}>{g.title}</Text>
                <StatusPill tone={on ? 'brand' : 'neutral'}>{`${on}/${g.permissions.length}`}</StatusPill>
                <View style={{ marginStart: 'auto', transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}><Icon icon={ChevronDown} size={16} tone="subtle" /></View>
              </PressableScale>
              {!readOnly && <Button size="sm" variant="ghost" onPress={() => toggleGroup(g)}>{all ? t('Sab hatayein') : t('Sab dein')}</Button>}
            </Row>
            {isOpen && perms.map((p) => {
              const [label, hint] = permText(p);
              const checked = set.has(p);
              const tag = preset.has(p) && !checked ? t('Hataya') : !preset.has(p) && checked ? t('Zyada') : null;
              return (
                <View key={p} style={{ borderTopWidth: 1, borderTopColor: th.colors.border, paddingHorizontal: th.space(3), paddingVertical: th.space(1) }}>
                  <Checkbox value={checked} onChange={() => toggle(p)} disabled={readOnly} label={tag ? `${label}  · ${tag}` : label} description={hint || undefined} />
                </View>
              );
            })}
          </Card>
        );
      })}
    </View>
  );
}
