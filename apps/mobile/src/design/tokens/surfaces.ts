/**
 * Page background (canvas) tones, same ids and values as the web
 * (design-system/tokens/surfaces.ts). "tinted" mixes in the accent.
 */

import { msg } from '@/core/i18n';

export interface CanvasToneDef {
  label: string;
  description: string;
  light: { canvas: string; sidebar: string };
  dark: { canvas: string; sidebar: string };
}

export const CANVAS_TONES = {
  soft: { label: msg('Soft grey'), description: msg('Calm and neutral'), light: { canvas: '#f6f7f9', sidebar: '#eef0f3' }, dark: { canvas: '#090d18', sidebar: '#060a14' } },
  white: { label: msg('Clean white'), description: msg('Bright, minimal'), light: { canvas: '#ffffff', sidebar: '#f8fafc' }, dark: { canvas: '#0d121f', sidebar: '#090d18' } },
  warm: { label: msg('Warm'), description: msg('Paper-like, easy on the eyes'), light: { canvas: '#faf8f4', sidebar: '#f3f0ea' }, dark: { canvas: '#110f0d', sidebar: '#0c0b09' } },
  cool: { label: msg('Cool'), description: msg('Crisp blue-grey'), light: { canvas: '#f3f6fb', sidebar: '#e9eef6' }, dark: { canvas: '#080d1b', sidebar: '#050915' } },
  tinted: { label: msg('Brand tint'), description: msg('A hint of your color'), light: { canvas: '#f6f7f9', sidebar: '#eef0f3' }, dark: { canvas: '#090d18', sidebar: '#060a14' } },
} satisfies Record<string, CanvasToneDef>;

export type CanvasToneId = keyof typeof CANVAS_TONES;
