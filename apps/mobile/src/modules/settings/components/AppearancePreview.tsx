/**
 * Live preview for Settings → Appearance: a small phone frame drawn with the
 * kit itself (hero, tiles, a list row, a button and the tab bar), so every
 * choice is visible before leaving the screen.
 */

import { BookOpen, Home, LayoutGrid, Package, Receipt, ShoppingCart, Wallet } from 'lucide-react-native';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Amount, Button, HeroAmount, Icon, ListRow, PageHero, StatTile, Text, useTheme } from '@/design';

export function AppearancePreview() {
  const th = useTheme();
  const c = th.colors;
  const tabBar = th.appearance.mobile.tabBar;
  const tabs = [Home, ShoppingCart, Receipt, Package, LayoutGrid];
  return (
    <View style={{ borderRadius: th.radius('3xl'), borderWidth: 6, borderColor: th.isDark ? '#1e293b' : '#0f172a', overflow: 'hidden', backgroundColor: c.canvas }}>
      <View style={{ padding: th.space(3), gap: th.space(3) }}>
        <PageHero
          title={t('Hi, {{firstName}}', { firstName: 'Ahmad' })}
          chip={t('Today')}
          stats={[
            { label: t('Aaj ki sale'), value: <HeroAmount value={48250} size="2xl" weight="heavy" /> },
            { label: t('Bill'), value: '36' },
            { label: t('Profit'), value: <HeroAmount value={9120} size="md" /> },
          ]}
        />
        <View style={{ flexDirection: 'row', gap: th.space(2) }}>
          <StatTile label={t('Galla (cash)')} icon={Wallet} tone="success" value={<Amount value={18400} size="lg" weight="bold" />} style={{ minWidth: 0 }} />
          <StatTile label={t('Udhaar baqi')} icon={BookOpen} tone="danger" value={<Amount value={6200} size="lg" weight="bold" />} style={{ minWidth: 0 }} />
        </View>
        <View style={{ borderRadius: th.radius('xl'), backgroundColor: c.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: c.border, overflow: 'hidden' }}>
          <ListRow dense icon={Package} iconTone="warning" title={t('Surf Excel 1kg')} subtitle={t('Kam stock')} trailing={<Amount value={420} />} />
        </View>
        <Button fullWidth icon={ShoppingCart}>{t('New sale')}</Button>
      </View>
      <View style={{
        flexDirection: 'row', justifyContent: 'space-around', paddingVertical: th.space(2),
        backgroundColor: c.surface, borderTopWidth: tabBar === 'floating' ? 0 : 1, borderTopColor: c.border,
        margin: tabBar === 'floating' ? th.space(2) : 0, borderRadius: tabBar === 'floating' ? 20 : 0,
        shadowColor: '#0f172a', shadowOpacity: tabBar === 'floating' ? 0.12 : 0, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
      }}>
        {tabs.map((icon, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 2 }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, backgroundColor: i === 0 && tabBar !== 'icons' ? c.brand.soft : 'transparent' }}>
              <Icon icon={icon} size={18} color={i === 0 ? c.brand.text : c.textMuted} />
            </View>
            {tabBar !== 'icons' ? <Text size="2xs" weight={i === 0 ? 'bold' : 'medium'} color={i === 0 ? c.brand.text : c.textMuted}>{[t('Home'), t('POS'), t('Sales'), t('Products'), t('More')][i]}</Text>
              : <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: i === 0 ? c.brand.solid : 'transparent' }} />}
          </View>
        ))}
      </View>
    </View>
  );
}
