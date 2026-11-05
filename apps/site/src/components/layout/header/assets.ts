/**
 * Static header assets in public/menu (built by header/build-sprite.mjs and
 * the feature-image renderer). Bump SPRITE_VERSION after rebuilding the SVGs
 * so browsers fetch the new files.
 */
export const SPRITE_VERSION = 1;
export const ICON_SPRITE = `/menu/icons.svg?v=${SPRITE_VERSION}`;
export const LOGO_SPRITE = `/menu/logo.svg?v=${SPRITE_VERSION}#l`;
