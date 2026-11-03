/**
 * Motion tokens. Durations in ms; springs for Reanimated `withSpring`.
 * Everything honours the OS reduce-motion setting and the app's
 * "Animations" switch (see theme/useMotion).
 */

export const DURATION = { instant: 90, fast: 160, base: 220, slow: 320, intro: 1500 } as const;

export const SPRING = {
  /** Buttons, chips: quick and firm. */
  press: { damping: 18, stiffness: 420, mass: 0.6 },
  /** Sheets and panels. */
  sheet: { damping: 22, stiffness: 240, mass: 0.9 },
  /** Small playful settle (logo diamond, success ticks). */
  bounce: { damping: 9, stiffness: 260, mass: 0.7 },
} as const;

/** Scale a pressed control shrinks to. */
export const PRESS_SCALE = 0.97;
