/**
 * Customize mode (web CustomizeDialog, for touch): the shown widgets as a
 * list to drag into order, remove with one tap, set their width on tablets,
 * add more from the gallery, pick the numbers and the daily target, or go
 * back to the default. Every change applies and saves at once, for the web too.
 */

import { GripVertical, LayoutGrid, Lock, MinusCircle, Plus, RotateCcw, Target } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Card, Icon, PressableScale, Segmented, SortableList, Text, confirm, useLayout, useTabBarSpace, useTheme, withAlpha } from '@/design';
import { SIZE_ORDER, type ResolvedWidget, type WidgetSize } from '../layout/layout';
import { useHomeContext } from '../layout/useHomeLayout';
import { useMasked } from '../lib/privacy';
import { WidgetGallery, WidgetPreview } from './WidgetGallery';

const ROW = 76;
const SIZE_LABEL: Record<WidgetSize, string> = { third: 'S', half: 'M', wide: 'L', full: 'Full' };

export function CustomizeView({ onDone }: { onDone: () => void }) {
  const th = useTheme();
  const { isTablet } = useLayout();
  const barSpace = useTabBarSpace();
  const ctx = useHomeContext();
  const { costHidden } = useMasked();
  const [dragging, setDragging] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [gallery, setGallery] = useState(false);
  const shown = ctx.widgets.filter((i) => i.visible);
  const hiddenCount = ctx.widgets.length - shown.length;

  const reset = async () => {
    if (await confirm({ title: t('Sab pehle jaisa?'), message: t('Hisse, sort, chaurai aur numbers default par aa jayenge. Target wahi rahega.'), confirmLabel: t('Reset') })) ctx.reset();
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} scrollEnabled={!dragging} contentContainerStyle={{ paddingHorizontal: th.space(4), paddingTop: th.space(2), paddingBottom: barSpace + th.space(34), gap: th.space(4) }} showsVerticalScrollIndicator={false}>
        <View style={{ width: '100%', maxWidth: 760, alignSelf: 'center', gap: th.space(4) }}>
          <Card tone="brand">
            <Text size="md" weight="bold">{t('Dashboard apni marzi ka')}</Text>
            <Text size="xs" tone="secondary" style={{ marginTop: 2 }}>{t('Har tabdeeli foran lagti hai aur aap ke account me save hoti hai — phone aur computer dono par wahi.')}</Text>
            <View style={{ flexDirection: 'row', gap: th.space(2), marginTop: th.space(3) }}>
              <Button size="sm" variant="secondary" icon={LayoutGrid} style={{ flex: 1 }} onPress={ctx.openNumbers}>{t('Numbers')}</Button>
              <Button size="sm" variant="secondary" icon={Target} style={{ flex: 1 }} onPress={ctx.openTarget}>
                {ctx.target > 0 ? formatMoney(ctx.target, { compact: true }) : t('Target')}
              </Button>
            </View>
          </Card>

          <View style={{ gap: th.space(1) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text size="sm" weight="semibold" tone="secondary">{t('Home par hisse ({{count}})', { count: shown.length })}</Text>
              <Text size="2xs" tone="muted">{t('Daba kar rakhein aur ghaseetein')}</Text>
            </View>
            {shown.length === 0 ? (
              <Text size="sm" tone="muted" style={{ paddingVertical: th.space(4) }}>{t('Sab hisse chhupe hue hain.')}</Text>
            ) : (
              <SortableList data={shown} keyExtractor={(i) => i.widget.id} rowHeight={ROW} onDragging={setDragging} scrollRef={scrollRef}
                onReorder={ctx.reorderVisible}
                renderItem={(item) => <WidgetRow item={item} tablet={isTablet} locked={!!item.widget.sensitive && costHidden} />} />
            )}
          </View>

          <Button variant="soft" icon={Plus} size="lg" onPress={() => setGallery(true)}>
            {hiddenCount > 0 ? t('Hisse add karein ({{count}})', { count: hiddenCount }) : t('Hisse add karein')}
          </Button>
          <Button variant="ghost" icon={RotateCcw} onPress={reset} disabled={!ctx.isCustomized}>{t('Sab pehle jaisa')}</Button>
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', start: 0, end: 0, bottom: barSpace + th.space(2), alignItems: 'center', paddingHorizontal: th.space(4) }}>
        <Button size="lg" onPress={onDone} style={{ minWidth: 200, shadowColor: th.colors.brandScale[900], shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}>{t('Ho gaya')}</Button>
      </View>
      <WidgetGallery open={gallery} onClose={() => setGallery(false)} />
    </View>
  );
}

function WidgetRow({ item, tablet, locked }: { item: ResolvedWidget; tablet: boolean; locked: boolean }) {
  const th = useTheme();
  const { setVisible, setSize } = useHomeContext();
  const w = item.widget;
  const sizes = SIZE_ORDER.filter((s) => (w.sizes ?? [w.size]).includes(s));
  return (
    <View style={{ height: ROW - 8, flexDirection: 'row', alignItems: 'center', gap: th.space(2.5), paddingHorizontal: th.space(2.5), borderRadius: th.radius('xl'), backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
      <Icon icon={GripVertical} size={18} tone="subtle" />
      <WidgetPreview widget={w} size={52} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" weight="semibold" numberOfLines={1}>{w.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {locked && <Icon icon={Lock} size={11} tone="subtle" />}
          <Text size="2xs" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>{locked ? t('Cost lock me chhupa rahega') : w.description}</Text>
        </View>
      </View>
      {tablet && sizes.length > 1 && (
        <Segmented size="sm" value={item.size} onChange={(s) => setSize(w.id, s)} options={sizes.map((s) => ({ value: s, label: t(SIZE_LABEL[s]) }))} />
      )}
      <PressableScale onPress={() => setVisible(w.id, false)} haptic="tap" accessibilityLabel={t('{{title}} hatayein', { title: w.title })}
        style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: withAlpha(th.colors.danger.solid, 0.1) }}>
        <Icon icon={MinusCircle} size={20} color={th.colors.danger.solid} />
      </PressableScale>
    </View>
  );
}

