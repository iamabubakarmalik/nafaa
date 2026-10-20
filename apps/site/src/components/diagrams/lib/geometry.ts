/**
 * Path helpers for diagram edges. All functions return SVG path data in
 * user units, rounded to one decimal to keep the HTML small.
 */
import type { Box } from './types';

export interface Pt {
  x: number;
  y: number;
}

export type Side = 'l' | 'r' | 't' | 'b';

const f = (n: number): string => String(Math.round(n * 10) / 10);
const p = (pt: Pt): string => `${f(pt.x)} ${f(pt.y)}`;

export const pt = (x: number, y: number): Pt => ({ x, y });

/**
 * Point on a box side. `t` runs 0-1 along the side (left to right, top to
 * bottom); `gap` pushes the point outwards so arrowheads clear the box.
 */
export function anchor(box: Box, side: Side, t = 0.5, gap = 6): Pt {
  switch (side) {
    case 'l':
      return pt(box.x - gap, box.y + box.h * t);
    case 'r':
      return pt(box.x + box.w + gap, box.y + box.h * t);
    case 't':
      return pt(box.x + box.w * t, box.y - gap);
    case 'b':
      return pt(box.x + box.w * t, box.y + box.h + gap);
  }
}

export const center = (box: Box): Pt => pt(box.x + box.w / 2, box.y + box.h / 2);

export function line(a: Pt, b: Pt): string {
  return `M${p(a)}L${p(b)}`;
}

/** Smooth S-curve whose ends leave and enter along `axis`. */
export function curve(a: Pt, b: Pt, axis: 'h' | 'v' = 'h', tension = 0.55): string {
  if (axis === 'h') {
    const dx = (b.x - a.x) * tension;
    return `M${p(a)}C${p(pt(a.x + dx, a.y))} ${p(pt(b.x - dx, b.y))} ${p(b)}`;
  }
  const dy = (b.y - a.y) * tension;
  return `M${p(a)}C${p(pt(a.x, a.y + dy))} ${p(pt(b.x, b.y - dy))} ${p(b)}`;
}

/** Quarter curve: leaves `a` along `first`, enters `b` along the other axis. */
export function swing(a: Pt, b: Pt, first: 'h' | 'v', k = 0.6): string {
  if (first === 'h') return `M${p(a)}C${p(pt(a.x + (b.x - a.x) * k, a.y))} ${p(pt(b.x, b.y - (b.y - a.y) * k))} ${p(b)}`;
  return `M${p(a)}C${p(pt(a.x, a.y + (b.y - a.y) * k))} ${p(pt(b.x - (b.x - a.x) * k, b.y))} ${p(b)}`;
}

/** One rounded corner: along `first` axis, then the other. */
export function elbow(a: Pt, b: Pt, first: 'h' | 'v', r = 14): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) < 0.5 || Math.abs(dy) < 0.5) return line(a, b);
  const rr = Math.min(r, Math.abs(dx), Math.abs(dy));
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  if (first === 'h') {
    return `M${p(a)}L${p(pt(b.x - sx * rr, a.y))}Q${p(pt(b.x, a.y))} ${p(pt(b.x, a.y + sy * rr))}L${p(b)}`;
  }
  return `M${p(a)}L${p(pt(a.x, b.y - sy * rr))}Q${p(pt(a.x, b.y))} ${p(pt(a.x + sx * rr, b.y))}L${p(b)}`;
}

/**
 * Three-segment orthogonal route with rounded corners. With `axis` = 'h' it
 * runs horizontally to `mid` (an x value), vertically to b.y, then
 * horizontally to b. With 'v' the roles swap and `mid` is a y value.
 */
export function ortho(a: Pt, b: Pt, axis: 'h' | 'v', mid?: number, r = 14): string {
  if (axis === 'h') {
    if (Math.abs(a.y - b.y) < 0.5 && mid === undefined) return line(a, b);
    const m = mid ?? (a.x + b.x) / 2;
    const s1 = Math.sign(m - a.x) || 1;
    const s2 = Math.sign(b.x - m) || 1;
    const sy = Math.sign(b.y - a.y) || 1;
    const rr = Math.max(0, Math.min(r, Math.abs(b.y - a.y) / 2, Math.abs(m - a.x), Math.abs(b.x - m)));
    return (
      `M${p(a)}L${p(pt(m - s1 * rr, a.y))}Q${p(pt(m, a.y))} ${p(pt(m, a.y + sy * rr))}` +
      `L${p(pt(m, b.y - sy * rr))}Q${p(pt(m, b.y))} ${p(pt(m + s2 * rr, b.y))}L${p(b)}`
    );
  }
  if (Math.abs(a.x - b.x) < 0.5 && mid === undefined) return line(a, b);
  const m = mid ?? (a.y + b.y) / 2;
  const s1 = Math.sign(m - a.y) || 1;
  const s2 = Math.sign(b.y - m) || 1;
  const sx = Math.sign(b.x - a.x) || 1;
  const rr = Math.max(0, Math.min(r, Math.abs(b.x - a.x) / 2, Math.abs(m - a.y), Math.abs(b.y - m)));
  return (
    `M${p(a)}L${p(pt(a.x, m - s1 * rr))}Q${p(pt(a.x, m))} ${p(pt(a.x + sx * rr, m))}` +
    `L${p(pt(b.x - sx * rr, m))}Q${p(pt(b.x, m))} ${p(pt(b.x, m + s2 * rr))}L${p(b)}`
  );
}

/**
 * Where the ray from a box centre towards `toward` leaves the box, pushed
 * out by `gap`. Used for radial (hub) edges.
 */
export function boxExit(box: Box, toward: Pt, gap = 6): Pt {
  const c = center(box);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const tx = ux === 0 ? Infinity : box.w / 2 / Math.abs(ux);
  const ty = uy === 0 ? Infinity : box.h / 2 / Math.abs(uy);
  const t = Math.min(tx, ty) + gap;
  return pt(c.x + ux * t, c.y + uy * t);
}
