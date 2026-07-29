/**
 * NAFAA MOTION PRESETS
 * Signature animations — every reveal, every hover, every transition.
 * Uses design tokens. Never hard-code duration/easing elsewhere.
 */
import type { Variants, Transition } from 'framer-motion';
import { motion as m } from '../design/tokens';

// ─── Base transitions ───────────────────────────────────────────
export const t = {
  spring:  m.spring.snappy as Transition,
  soft:    m.spring.soft as Transition,
  bouncy:  m.spring.bouncy as Transition,
  smooth:  { duration: m.duration.base, ease: m.ease.out } as Transition,
  fast:    { duration: m.duration.fast, ease: m.ease.out } as Transition,
  slow:    { duration: m.duration.slow, ease: m.ease.smooth } as Transition,
};

// ─── Reveal variants ────────────────────────────────────────────
export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: t.smooth },
};

export const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: t.spring },
};

export const fadeDown: Variants = {
  hidden:  { opacity: 0, y: -24 },
  visible: { opacity: 1, y: 0, transition: t.spring },
};

export const fadeLeft: Variants = {
  hidden:  { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: t.spring },
};

export const fadeRight: Variants = {
  hidden:  { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: t.spring },
};

export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: t.spring },
};

export const blurIn: Variants = {
  hidden:  { opacity: 0, filter: 'blur(12px)', y: 12 },
  visible: { opacity: 1, filter: 'blur(0px)', y: 0, transition: t.smooth },
};

// ─── Stagger containers ─────────────────────────────────────────
export const staggerContainer = (delay = 0.05, initial = 0): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: delay,
      delayChildren: initial,
    },
  },
});

// ─── Hover primitives ───────────────────────────────────────────
export const hoverLift = {
  whileHover: { y: -4, transition: t.spring },
  whileTap: { y: -1, transition: t.fast },
};

export const hoverGlow = {
  whileHover: { scale: 1.02, transition: t.spring },
  whileTap: { scale: 0.98, transition: t.fast },
};

export const hoverTilt = {
  whileHover: { rotateX: -4, rotateY: 4, transition: t.spring },
};

// ─── Marquee ────────────────────────────────────────────────────
export const marquee = (duration = 30) => ({
  animate: {
    x: ['0%', '-50%'],
    transition: {
      x: { repeat: Infinity, duration, ease: 'linear' as const },
    },
  },
});

// ─── Aurora float ───────────────────────────────────────────────
export const auroraFloat = {
  animate: {
    y: [0, -20, 0],
    x: [0, 10, 0],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: [0.45, 0, 0.55, 1] as const,
    },
  },
};

// ─── Text shimmer (for gradient text) ───────────────────────────
export const textShimmer = {
  animate: {
    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: 'linear' as const,
    },
  },
};

// ─── Viewport defaults ──────────────────────────────────────────
export const viewport = { once: true, margin: '-80px' as const };
