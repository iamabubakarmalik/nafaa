/**
 * Scroll reveal attributes (motion.css, zero JS) for a block's content.
 * The first two blocks can sit in the first viewport, where a view()
 * timeline could start them part-faded, so they never reveal (ARCH 4.4:
 * nothing above the fold waits for motion).
 */
import type { RevealVariant } from '@/components/motion/Reveal';

export function reveal(index: number, variant: RevealVariant = 'fade-up'): { 'data-reveal'?: RevealVariant } {
  return index > 1 ? { 'data-reveal': variant } : {};
}
