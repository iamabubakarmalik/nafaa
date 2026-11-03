/**
 * Widget gallery: widgets that are off, each with a small preview of what it
 * shows. Tapping Add puts it at the end of Home.
 */

import { Lock, Plus } from 'lucide-react-native';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { t } from '@/core/i18n';
import { Button, EmptyState, Icon, Sheet, Text, toast, useChartColors, useTheme, withAlpha } from '@/design';
import type { HomeWidget, PreviewKind } from '../layout/layout';
import { useHomeContext } from '../layout/useHomeLayout';
import { useMasked } from '../lib/privacy';

export function WidgetGallery({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const { widgets, addWidget } = useHomeContext();
  const { costHidden } = useMasked();
  const off = widgets.filter((i) => !i.visible).map((i) => i.widget);
  return (
    <Sheet open={open} onClose={onClose} title={t('Hisse add karein')} description={t('Jo hissa chahiye, Add dabayein — Home ke aakhir me lag jayega.')}>
      {off.length === 0 ? (
        <EmptyState icon={Plus} title={t('Sab hisse Home par hain')} />
      ) : (
        <View style={{ gap: th.space(2.5) }}>
          {off.map((w) => {
            const locked = !!w.sensitive && costHidden;
            return (
              <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), padding: th.space(3), borderRadius: th.radius('xl'), backgroundColor: th.colors.surface, borderWidth: 1, borderColor: th.colors.border }}>
                <WidgetPreview widget={w} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text size="sm" weight="semibold" numberOfLines={1}>{w.title}</Text>
                  <Text size="xs" tone="muted" numberOfLines={2}>{w.description}</Text>
                  {locked && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon icon={Lock} size={11} tone="subtle" />
                      <Text size="2xs" tone="subtle">{t('Cost lock')}</Text>
                    </View>
                  )}
                </View>
                <Button size="sm" variant="soft" icon={Plus} onPress={() => { addWidget(w.id); toast.success(t('{{title}} Home par lag gaya', { title: w.title })); }}>{t('Add')}</Button>
              </View>
            );
          })}
        </View>
      )}
    </Sheet>
  );
}

/** A small drawing of the widget's kind (not live data). */
export function WidgetPreview({ widget, size = 64 }: { widget: HomeWidget; size?: number }) {
  const th = useTheme();
  const cc = useChartColors();
  const w = size;
  const h = Math.round(size * 0.78);
  const ink = cc.brand;
  const soft = withAlpha(ink, th.isDark ? 0.28 : 0.16);
  const line = th.colors.borderStrong;
  return (
    <View style={{ width: w, height: h, borderRadius: th.radius('md'), backgroundColor: th.colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', direction: 'ltr' }}>
      <Drawing kind={widget.preview} w={w} h={h} ink={ink} soft={soft} line={line} accent={cc.series} widget={widget} />
    </View>
  );
}

function Drawing({ kind, w, h, ink, soft, line, accent, widget }: { kind: PreviewKind; w: number; h: number; ink: string; soft: string; line: string; accent: string[]; widget: HomeWidget }) {
  const p = 8;
  switch (kind) {
    case 'hero':
      return (
        <Svg width={w} height={h}>
          <Rect x={4} y={4} width={w - 8} height={h - 8} rx={8} fill={ink} />
          <Rect x={10} y={11} width={22} height={5} rx={2} fill="#ffffff" opacity={0.85} />
          <Path d={`M10 ${h - 14} L22 ${h - 20} L32 ${h - 17} L44 ${h - 28}`} stroke="#ffffff" strokeWidth={2} fill="none" />
          <Circle cx={w - 16} cy={h / 2} r={8} stroke="#ffffff" strokeOpacity={0.5} strokeWidth={3} fill="none" />
        </Svg>
      );
    case 'numbers':
      return (
        <Svg width={w} height={h}>
          {[0, 1].map((r) => [0, 1].map((c) => <Rect key={`${r}${c}`} x={p + c * ((w - p * 2) / 2 + 2)} y={p + r * ((h - p * 2) / 2 + 2)} width={(w - p * 2) / 2 - 2} height={(h - p * 2) / 2 - 2} rx={4} fill={c === r ? soft : line} opacity={c === r ? 1 : 0.5} />))}
        </Svg>
      );
    case 'line':
      return (
        <Svg width={w} height={h}>
          <Path d={`M${p} ${h - 12} L${w * 0.3} ${h * 0.55} L${w * 0.5} ${h * 0.65} L${w * 0.72} ${h * 0.3} L${w - p} ${h * 0.4} L${w - p} ${h - p} L${p} ${h - p} Z`} fill={soft} />
          <Path d={`M${p} ${h - 12} L${w * 0.3} ${h * 0.55} L${w * 0.5} ${h * 0.65} L${w * 0.72} ${h * 0.3} L${w - p} ${h * 0.4}`} stroke={ink} strokeWidth={2} fill="none" />
        </Svg>
      );
    case 'bars':
      return (
        <Svg width={w} height={h}>
          {[0.4, 0.7, 0.5, 0.95, 0.6, 0.35].map((v, i) => {
            const bw = (w - p * 2) / 6 - 3;
            const bh = (h - p * 2) * v;
            return <Rect key={i} x={p + i * (bw + 3)} y={h - p - bh} width={bw} height={bh} rx={2} fill={i === 3 ? ink : soft} />;
          })}
        </Svg>
      );
    case 'donut': {
      const r = h / 2 - 9;
      const c = 2 * Math.PI * r;
      const parts = [0.45, 0.3, 0.25];
      let off = 0;
      return (
        <Svg width={w} height={h}>
          {parts.map((v, i) => {
            const el = <Circle key={i} cx={w / 2} cy={h / 2} r={r} stroke={accent[i]} strokeWidth={7} fill="none" strokeDasharray={`${c * v - 2} ${c}`} strokeDashoffset={-off} />;
            off += c * v;
            return el;
          })}
        </Svg>
      );
    }
    case 'list':
    case 'rows':
    case 'alert':
    case 'report':
      return (
        <Svg width={w} height={h}>
          {[0, 1, 2].map((i) => {
            const y = p + i * ((h - p * 2) / 3) + 4;
            const dot = kind === 'alert' ? accent[[6, 3, 1][i]] : kind === 'rows' ? accent[i] : ink;
            return (
              <G key={i}>
                {kind !== 'report' && <Circle cx={p + 3} cy={y + 2} r={3} fill={dot} />}
                <Rect x={kind === 'report' ? p : p + 10} y={y} width={kind === 'rows' ? (w - p * 2 - 10) * [0.9, 0.65, 0.4][i] : w * 0.42} height={4} rx={2} fill={kind === 'rows' ? soft : line} />
                {kind !== 'rows' && <Rect x={w - p - 12} y={y} width={12} height={4} rx={2} fill={i === 2 && kind === 'report' ? ink : line} />}
              </G>
            );
          })}
        </Svg>
      );
    case 'grid':
      return (
        <Svg width={w} height={h}>
          {[0, 1].map((r) => [0, 1, 2, 3].map((c) => <Rect key={`${r}${c}`} x={p + c * ((w - p * 2) / 4)} y={p + 2 + r * ((h - p * 2) / 2)} width={(w - p * 2) / 4 - 4} height={(w - p * 2) / 4 - 4} rx={3} fill={accent[(r * 4 + c) % accent.length]} opacity={0.75} />))}
        </Svg>
      );
    default:
      return <Icon icon={widget.icon} size={24} color={ink} />;
  }
}
