/**
 * Scene model shared by every diagram.
 *
 * A diagram kind (bespoke or data-driven) builds one Scene per orientation:
 * `h` for wide screens and `v` for phones. SceneSvg renders a Scene into an
 * inline SVG. Coordinates are SVG user units inside the scene's viewBox.
 */
import type { ReactNode } from 'react';

export type Orientation = 'h' | 'v';

/** Colour role of a node, edge, pill or packet. */
export type Tone = 'neutral' | 'brand' | 'info' | 'warn';

/**
 * Icon reference: a lucide icon name (kebab-case) or `nafaa` for the
 * code-drawn Nafaa mark.
 */
export type IconRef = string;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SceneNode extends Box {
  id: string;
  label: string;
  /** Optional second line in muted text (data-driven kinds only). */
  note?: string;
  icon?: IconRef;
  tone?: Tone;
  /** `row`: icon left of the text. `stack`: icon above centred text. */
  layout?: 'row' | 'stack';
  /** Small glyph shown above the node, for example a step number. */
  badge?: string;
  href?: string;
  /** Reveal order (0-9). Lower values appear first while scrolling in. */
  reveal?: number;
  /** Extra class from diagrams.module.css (bespoke choreography). */
  className?: string;
}

export interface ScenePacket {
  /** Delay step (0-19), 0.4 s each. */
  delay: number;
  tone?: Tone;
  /** Replaces the default packet keyframes (bespoke choreography). */
  className?: string;
}

export interface SceneEdge {
  id: string;
  d: string;
  tone?: Tone;
  arrow?: boolean;
  dashed?: boolean;
  reveal?: number;
  packets?: ScenePacket[];
}

export interface ScenePill {
  id: string;
  /** Centre point. */
  x: number;
  y: number;
  text: string;
  icon?: IconRef;
  tone?: Tone;
  reveal?: number;
  className?: string;
}

export interface ScenePing {
  /** Node id the ping outlines. */
  node: string;
  delay: number;
  className?: string;
}

export interface SceneFont {
  label: number;
  note: number;
  pill: number;
}

export interface Scene {
  w: number;
  h: number;
  font: SceneFont;
  nodes: SceneNode[];
  edges: SceneEdge[];
  pills?: ScenePill[];
  pings?: ScenePing[];
  /** Drawn after the background, before edges. */
  under?: ReactNode;
  /** Drawn after nodes and pills. */
  over?: ReactNode;
}

export interface BuiltDiagram {
  h: Scene;
  v: Scene;
  /** Plain-text reading of the diagram, used for the SVG <desc>. */
  summary: string;
  /** True when a node links somewhere (the SVG is then a group, not an image). */
  interactive: boolean;
}

export const FONT_H: SceneFont = { label: 16, note: 13, pill: 13 };
export const FONT_V: SceneFont = { label: 15, note: 12.5, pill: 12.5 };
