/** Industry cards: the most common shops first, the rest behind "Aur dekhein" with search. */

import { Check, ChevronDown } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, Icon, PressableScale, SearchBar, Text, useLayout, useTheme, withAlpha } from '@/design';
import { POPULAR_COUNT, type IndustryChoice } from '../lib/industry-choices';

export function IndustryPicker({ choices, value, onChange, error, label }: { choices: IndustryChoice[]; value: string; onChange: (v: string) => void; error?: string; label?: string }) {
  const th = useTheme();
  const c = th.colors;
  const { isTablet } = useLayout();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return choices.filter((x) => `${x.label} ${x.hint ?? ''} ${x.businessType}`.toLowerCase().includes(q));
    if (expanded) return choices;
    const top = choices.slice(0, POPULAR_COUNT);
    const picked = choices.find((x) => x.businessType === value);
    return picked && !top.includes(picked) ? [...top.slice(0, POPULAR_COUNT - 1), picked] : top;
  }, [choices, expanded, query, value]);

  return (
    <View style={{ gap: th.space(2) }}>
      <Text size="sm" weight="semibold" tone="secondary">{label ?? t('Aap ka kaam kya hai?')}</Text>
      {expanded && <SearchBar value={query} onChangeText={setQuery} placeholder={t('Search: pharmacy, kapre, mobile…')} />}
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
        {visible.map((x) => {
          const active = x.businessType === value;
          return (
            <PressableScale
              key={x.businessType}
              onPress={() => onChange(x.businessType)}
              haptic="select"
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={x.label}
              style={{
                width: isTablet ? '23.8%' : '48.6%', minHeight: 84, padding: th.space(3), gap: th.space(2), justifyContent: 'space-between', borderRadius: th.radius('xl'),
                borderWidth: active ? 1.5 : 1, borderColor: active ? c.brand.solid : c.border, backgroundColor: active ? c.brand.soft : c.surface,
              }}
            >
              <View style={{ width: 34, height: 34, borderRadius: th.radius('md'), backgroundColor: withAlpha(x.color, th.isDark ? 0.22 : 0.1), alignItems: 'center', justifyContent: 'center' }}>
                <Icon icon={x.icon} size={18} color={x.color} />
              </View>
              <Text size="sm" weight="bold" numberOfLines={2}>{x.label}</Text>
              {active && (
                <View style={{ position: 'absolute', top: th.space(2.5), end: th.space(2.5), width: 22, height: 22, borderRadius: 11, backgroundColor: c.brand.solid, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon icon={Check} size={14} color={c.brand.onSolid} strokeWidth={3} />
                </View>
              )}
            </PressableScale>
          );
        })}
        {visible.length === 0 && (
          <View style={{ width: '100%', padding: th.space(4), borderRadius: th.radius('lg'), backgroundColor: c.surfaceMuted }}>
            <Text size="sm" tone="muted" align="center">{t('"{{query}}" nahi mila. "Koi aur kaam" chun lein — baad me Settings se badal sakte hain.', { query })}</Text>
          </View>
        )}
      </View>
      {!expanded && choices.length > POPULAR_COUNT && (
        <Button variant="link" iconEnd={ChevronDown} onPress={() => setExpanded(true)} style={{ alignSelf: 'flex-start' }}>
          {t('Aur dekhein ({{value}})', { value: choices.length - POPULAR_COUNT })}
        </Button>
      )}
      {error ? <Text size="xs" weight="medium" tone="danger">{error}</Text> : null}
    </View>
  );
}
