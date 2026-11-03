/**
 * Layout helpers with density-aware gaps.
 *
 *   <Stack gap={3}>…</Stack>                 vertical, 12pt gap at comfortable
 *   <Row gap={2} align="center" justify="between">…</Row>
 *   <Divider />  <Spacer size={4} />
 */

import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
type Justify = 'start' | 'center' | 'end' | 'between' | 'around';

const ALIGN: Record<Align, ViewStyle['alignItems']> = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch', baseline: 'baseline' };
const JUSTIFY: Record<Justify, ViewStyle['justifyContent']> = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between', around: 'space-around' };

interface BoxProps extends ViewProps {
  gap?: number;
  align?: Align;
  justify?: Justify;
  wrap?: boolean;
  flex?: number;
  /** Padding in grid units (4pt). */
  padding?: number;
  paddingX?: number;
  paddingY?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

function useBox(direction: 'row' | 'column', p: BoxProps): ViewStyle {
  const t = useTheme();
  return {
    flexDirection: direction,
    gap: p.gap !== undefined ? t.space(p.gap) : undefined,
    alignItems: p.align ? ALIGN[p.align] : direction === 'row' ? 'center' : undefined,
    justifyContent: p.justify ? JUSTIFY[p.justify] : undefined,
    flexWrap: p.wrap ? 'wrap' : undefined,
    flex: p.flex,
    padding: p.padding !== undefined ? t.space(p.padding) : undefined,
    paddingHorizontal: p.paddingX !== undefined ? t.space(p.paddingX) : undefined,
    paddingVertical: p.paddingY !== undefined ? t.space(p.paddingY) : undefined,
  };
}

export function Stack(props: BoxProps) {
  const { style, children, gap: _g, align: _a, justify: _j, wrap: _w, flex: _f, padding: _p, paddingX: _px, paddingY: _py, ...rest } = props;
  return <View {...rest} style={[useBox('column', props), style]}>{children}</View>;
}

export function Row(props: BoxProps) {
  const { style, children, gap: _g, align: _a, justify: _j, wrap: _w, flex: _f, padding: _p, paddingX: _px, paddingY: _py, ...rest } = props;
  return <View {...rest} style={[useBox('row', props), style]}>{children}</View>;
}

export function Spacer({ size, flex }: { size?: number; flex?: boolean }) {
  const t = useTheme();
  return <View style={flex ? { flex: 1 } : { height: t.space(size ?? 4), width: t.space(size ?? 4) }} />;
}

export function Divider({ inset = 0, vertical, style }: { inset?: number; vertical?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View
      style={[
        vertical
          ? { width: 1, alignSelf: 'stretch', backgroundColor: t.colors.divider }
          : { height: 1, backgroundColor: t.colors.divider, marginStart: t.space(inset) },
        style,
      ]}
    />
  );
}
