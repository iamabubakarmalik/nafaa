/**
 * Opening animation, shown once per cold start over the already-mounted app.
 *
 *   0 ms     the native splash (solid logo green) hands over seamlessly: the
 *            whole screen is the tile, scaled up
 *   ~0–480   the green collapses into the rounded logo tile
 *   ~380–860 the white arc draws itself from the raised end round the cup
 *   ~720     the amber diamond drops in and clicks into place (bounce + haptic)
 *   ~920     "Nafaa" fades up
 *   ~1260    everything lifts away into the app (~1.55 s total)
 *
 * Runs on the UI thread (Reanimated). Tap to skip. With reduced motion (OS
 * setting or Appearance → Animations off) it is skipped.
 *
 * It can never hold the app: if layout never fires it starts anyway, and a
 * JS timer removes the overlay after HARD_TIMEOUT_MS whatever the animation
 * thread is doing.
 */

import { useEffect, useRef } from 'react';
import { perfMark } from '@/core/perf';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing, runOnJS, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import Svg, { ClipPath, Defs, G, Path } from 'react-native-svg';
import { t } from '@/core/i18n';
import { haptic } from '@/core/device/haptics';
import { useTheme } from '../theme/ThemeProvider';
import { LOGO_AMBER, LOGO_GREEN } from '../tokens/presets';
import { SPRING } from '../tokens/motion';
import { Text } from '../components/Text';
import {
  LOGO_ARC_CENTERLINE, LOGO_ARC_CENTERLINE_LENGTH, LOGO_ARC_PATH, LOGO_DIAMOND_BOX, LOGO_DIAMOND_PATH, LOGO_TILE_RADIUS, LOGO_VIEWBOX,
} from './logoPaths';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const TILE = 128;
/** Start without a layout event after this long. */
const START_FALLBACK_MS = 400;
/** The overlay is removed after this long, no matter what. */
export const HARD_TIMEOUT_MS = 3000;
const scaleOf = (v: number) => (v / LOGO_VIEWBOX) * TILE;

export interface AppIntroProps {
  /** Called once the overlay is fully gone. */
  onDone: () => void;
  /** Called when the overlay mounts: hide the native splash here. */
  onReady?: () => void;
}

export function AppIntro({ onDone, onReady }: AppIntroProps) {
  const th = useTheme();
  perfMark('intro-render');
  const { width, height } = useWindowDimensions();
  const cover = (Math.sqrt(width * width + height * height) / TILE) * 1.08;

  const tileScale = useSharedValue(cover);
  const squash = useSharedValue(1);
  const draw = useSharedValue(LOGO_ARC_CENTERLINE_LENGTH);
  const dropY = useSharedValue(-TILE * 1.1);
  const dropO = useSharedValue(0);
  const dropR = useSharedValue(-90);
  const word = useSharedValue(0);
  const exit = useSharedValue(0);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  };
  const click = () => haptic('impact');

  const leave = (fast: boolean, delay = 0) => {
    exit.value = withDelay(delay, withTiming(1, { duration: fast ? 180 : 300, easing: Easing.out(Easing.cubic) }, (done) => {
      if (done) runOnJS(finish)();
    }));
    // Backup in case the animation callback is lost (a cancelled timing).
    setTimeout(finish, delay + (fast ? 180 : 300) + 400);
  };

  // Starts once the overlay is laid out (values set before the view is mounted
  // are lost). Everything is then scheduled on the UI thread at once, so a busy
  // JS thread (the app loading underneath) cannot stretch or skip it.
  const started = useRef(false);
  const start = () => {
    if (started.current) return;
    started.current = true;
    onReady?.();
    if (!th.motion) {
      tileScale.value = 1;
      draw.value = 0;
      dropY.value = 0;
      dropO.value = 1;
      dropR.value = 0;
      word.value = 1;
      leave(true, 250);
      return;
    }
    const base = 120; // the native splash fades out first
    tileScale.value = withDelay(base, withTiming(1, { duration: 480, easing: Easing.bezier(0.65, 0, 0.25, 1) }));
    draw.value = withDelay(base + 380, withTiming(0, { duration: 480, easing: Easing.bezier(0.33, 0, 0.2, 1) }));
    dropO.value = withDelay(base + 720, withTiming(1, { duration: 120 }));
    dropR.value = withDelay(base + 720, withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) }));
    dropY.value = withDelay(base + 720, withSpring(0, SPRING.bounce));
    squash.value = withDelay(base + 860, withSequence(
      withTiming(0.955, { duration: 70 }, (done) => {
        if (done) runOnJS(click)();
      }),
      withSpring(1, SPRING.bounce),
    ));
    word.value = withDelay(base + 920, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
    leave(false, base + 1260);
  };

  useEffect(() => {
    const kick = setTimeout(start, START_FALLBACK_MS);
    const hard = setTimeout(() => {
      onReady?.();
      finish();
    }, HARD_TIMEOUT_MS);
    return () => {
      clearTimeout(kick);
      clearTimeout(hard);
    };
    // Mount only: both timers are one-shot guards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overlay = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const logoGroup = useAnimatedStyle(() => ({ transform: [{ scale: 1 + exit.value * 0.08 }, { translateY: -exit.value * 10 }] }));
  const tileRadius = scaleOf(LOGO_TILE_RADIUS);
  const tile = useAnimatedStyle(() => ({
    transform: [{ scale: tileScale.value * squash.value }],
    borderRadius: tileRadius,
  }));
  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: draw.value }));
  const diamond = useAnimatedStyle(() => ({
    opacity: dropO.value,
    transform: [{ translateY: dropY.value }, { rotate: `${dropR.value}deg` }],
  }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: (1 - word.value) * 14 }] }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: th.colors.canvas, zIndex: 1000 }, overlay]}
      onLayout={start}
      accessibilityLabel="Nafaa"
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={() => leave(true)} accessibilityRole="button" accessibilityLabel={t('Skip')}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ alignItems: 'center' }, logoGroup]}>
            <View style={{ width: TILE, height: TILE }}>
              <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: LOGO_GREEN }, tile]} />
              <Svg width={TILE} height={TILE} viewBox={`0 0 ${LOGO_VIEWBOX} ${LOGO_VIEWBOX}`} style={StyleSheet.absoluteFill}>
                <Defs>
                  <ClipPath id="arc-clip">
                    <Path d={LOGO_ARC_PATH} />
                  </ClipPath>
                </Defs>
                <G clipPath="url(#arc-clip)">
                  <AnimatedPath
                    d={LOGO_ARC_CENTERLINE}
                    stroke="#ffffff"
                    strokeWidth={76}
                    fill="none"
                    strokeDasharray={`${LOGO_ARC_CENTERLINE_LENGTH} ${LOGO_ARC_CENTERLINE_LENGTH}`}
                    animatedProps={arcProps}
                  />
                </G>
              </Svg>
              <Animated.View
                style={[{
                  position: 'absolute', left: scaleOf(LOGO_DIAMOND_BOX.x), top: scaleOf(LOGO_DIAMOND_BOX.y),
                  width: scaleOf(LOGO_DIAMOND_BOX.size), height: scaleOf(LOGO_DIAMOND_BOX.size),
                }, diamond]}
              >
                <Svg width="100%" height="100%" viewBox={`${LOGO_DIAMOND_BOX.x} ${LOGO_DIAMOND_BOX.y} ${LOGO_DIAMOND_BOX.size} ${LOGO_DIAMOND_BOX.size}`}>
                  <Path d={LOGO_DIAMOND_PATH} fill={LOGO_AMBER} />
                </Svg>
              </Animated.View>
            </View>
            <Animated.View style={[{ marginTop: 22 }, wordStyle]}>
              <Text weight="heavy" ltr color={th.colors.text} style={{ fontSize: 40, lineHeight: 48, letterSpacing: -1 }}>Nafaa</Text>
            </Animated.View>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
