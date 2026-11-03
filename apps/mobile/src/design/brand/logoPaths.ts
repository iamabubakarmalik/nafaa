/**
 * The Nafaa logo (apps/web/public/logo.svg), 512 × 512: a green rounded tile,
 * a white cup/arc and an amber diamond.
 */

export const LOGO_VIEWBOX = 512;
export const LOGO_TILE_RADIUS = 114;
export const LOGO_ARC_PATH = 'M128 214L170.3 190V256A88 88 0 0 0 341.7 256H384A128 128 0 0 1 128 256Z';
export const LOGO_DIAMOND_PATH = 'M260 142L300 182L260 222L220 182Z';
/** Diamond bounds inside the 512 box. */
export const LOGO_DIAMOND_BOX = { x: 220, y: 142, size: 80 };
/**
 * Centre line of the arc, used to draw it in: a wide stroke along this path,
 * clipped to the arc shape, reveals the arc from the raised left end round to
 * the right.
 */
export const LOGO_ARC_CENTERLINE = 'M148.6 182L148.6 250A107.5 107.5 0 0 0 363.4 250L363.4 264';
export const LOGO_ARC_CENTERLINE_LENGTH = 432;
