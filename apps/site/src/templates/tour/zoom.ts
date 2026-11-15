/**
 * Phone zoom for a tour step: the scale and offset that bring the
 * highlighted box to the middle of the 4:3 phone stage, large enough to read
 * without pinching, while the capture still covers the whole stage.
 *
 * The shot is first fitted inside the stage ("contain"); `s` scales it about
 * its centre and `tx`/`ty` move it, in percent of the shot's own size (what
 * CSS `translate()` percentages mean), so `translate(tx, ty) scale(s)` works.
 */
import type { Box } from './steps';

const PHONE_STAGE = 4 / 3;
const MAX_SCALE = 3.2;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** `tagAbove`: leave room over the box for its label. */
export function phoneZoom(width: number, height: number, box: Box, tagAbove = false, stage = PHONE_STAGE): { s: number; tx: number; ty: number } {
  const aspect = width / height;
  // Shot size in stage units (stage width = stage height = 1 on its own axis).
  const shotW = aspect >= stage ? 1 : aspect / stage;
  const shotH = aspect >= stage ? stage / aspect : 1;
  const [x, y, w, h] = box.map((v) => v / 100) as [number, number, number, number];
  const cover = Math.max(1 / shotW, 1 / shotH);
  const fit = Math.min(0.9 / (w * shotW), (tagAbove ? 0.68 : 0.78) / (h * shotH), MAX_SCALE);
  const s = Math.max(cover, fit);
  // Box centre from the shot centre, in stage units.
  const px = (x + w / 2 - 0.5) * shotW;
  const py = (y + h / 2 - 0.5) * shotH;
  const limX = Math.max(0, (s * shotW) / 2 - 0.5);
  const limY = Math.max(0, (s * shotH) / 2 - 0.5);
  const tx = clamp(-s * px, -limX, limX) / shotW;
  const ty = clamp(-s * py + (tagAbove ? 0.06 : 0), -limY, limY) / shotH;
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return { s: round(s), tx: round(tx * 100), ty: round(ty * 100) };
}
