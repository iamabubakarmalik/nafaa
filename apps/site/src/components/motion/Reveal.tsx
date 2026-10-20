/**
 * Reveal: marks content for the zero-JS scroll reveal (motion.css, part 1).
 * Server component. Never wrap the H1, the hero answer or the hero screenshot
 * (ARCH 4.4 hero rule).
 */
import type { ElementType, ReactNode } from 'react';

export type RevealVariant = 'fade-up' | 'fade' | 'scale' | 'stagger';

interface RevealProps {
  as?: ElementType;
  variant?: RevealVariant;
  className?: string;
  children: ReactNode;
}

export function Reveal({ as: Tag = 'div', variant = 'fade-up', className, children }: RevealProps) {
  return (
    <Tag data-reveal={variant} className={className}>
      {children}
    </Tag>
  );
}
