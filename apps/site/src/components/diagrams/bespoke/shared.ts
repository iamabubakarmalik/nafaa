/**
 * Helpers for the bespoke (code-drawn) diagram kinds.
 */
import { DIAGRAM_LABEL_KEYS, type BespokeDiagramKind } from '../../../lib/cms/contract/cms-contract';
import type { Orientation, Scene, SceneNode } from '../lib/types';

export type Labels = Readonly<Record<string, string>>;

export interface BespokeDiagram {
  build(labels: Labels, orientation: Orientation): Scene;
  /** Plain-text reading for the SVG <desc>. */
  summary(labels: Labels): string;
  /** Extra class on the figure for kind-specific keyframes. */
  rootClass?: string;
}

/** Editor labels over the contract defaults. Blank values fall back too. */
export function resolveLabels(kind: BespokeDiagramKind, overrides?: Record<string, string>): Labels {
  const defaults = DIAGRAM_LABEL_KEYS[kind];
  const out: Record<string, string> = {};
  for (const key of Object.keys(defaults)) {
    const value = overrides?.[key]?.trim();
    out[key] = value ? value : (defaults[key] ?? key);
  }
  return out;
}

/** Reads a label that is known to exist for the kind. */
export const L = (labels: Labels, key: string): string => labels[key] ?? key;

export function node(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  extra: Partial<Omit<SceneNode, 'id' | 'x' | 'y' | 'w' | 'h' | 'label'>> = {},
): SceneNode {
  return { id, x, y, w, h, label, layout: 'row', ...extra };
}

export function byId(nodes: SceneNode[], id: string): SceneNode {
  const found = nodes.find((n) => n.id === id);
  if (!found) throw new Error(`Diagram node "${id}" is missing`);
  return found;
}
