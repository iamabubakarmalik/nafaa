'use client';

import { motion, type Variants } from 'framer-motion';
import { fadeUp, fadeIn, fadeLeft, fadeRight, scaleIn, blurIn, viewport } from '@/lib/motion/presets';
import type { ReactNode } from 'react';

type Preset = 'fadeUp' | 'fadeIn' | 'fadeLeft' | 'fadeRight' | 'scaleIn' | 'blurIn';

const presets: Record<Preset, Variants> = { fadeUp, fadeIn, fadeLeft, fadeRight, scaleIn, blurIn };

interface Props {
  children: ReactNode;
  preset?: Preset;
  delay?: number;
  className?: string;
  once?: boolean;
  as?: 'div' | 'section' | 'article' | 'span' | 'li';
}

export function Reveal({ children, preset = 'fadeUp', delay = 0, className, once = true, as = 'div' }: Props) {
  const Comp = motion[as] as any;
  const v = presets[preset];

  return (
    <Comp
      initial="hidden"
      whileInView="visible"
      viewport={{ ...viewport, once }}
      variants={v}
      transition={{ ...(v.visible as any)?.transition, delay }}
      className={className}
    >
      {children}
    </Comp>
  );
}
