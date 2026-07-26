/**
 * Carpet POS extensions — public surface of everything the Carpet
 * industry pack exposes to the shared POS shell.
 *
 * The underlying component files still live at their historical paths
 * (src/features/pos/components/*) so no imports break. This barrel is
 * how the pack itself accesses them and how future refactors will find
 * the "canonical carpet POS pieces" in one place.
 */


// Modal / picker components — re-exported from their current locations.
// When we move them fully into the pack, only this barrel needs to change,
// PosPage.tsx keeps its imports.
export { CarpetRollPicker } from '@/industries/carpet/components/pos-extensions/CarpetRollPicker';
export { CarpetCutPiecePicker } from '@/industries/carpet/components/pos-extensions/CarpetCutPiecePicker';
export { LengthWidthCalculator } from '@/industries/carpet/components/pos-extensions/LengthWidthCalculator';
