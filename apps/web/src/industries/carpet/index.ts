import type { IndustryPlugin } from '@industries/_shared/types/section.types';

const CARPET_UNITS = ['sqft', 'sqm', 'sqyd'];

export const carpetPlugin: IndustryPlugin = {
  key: 'CARPET',
  label: 'Carpet',
  matches: ({ businessType, unit, features }) => {
    const type = (businessType ?? '').toUpperCase();
    const isCarpetBusiness =
      type === 'CARPET' ||
      type === 'FLOORING' ||
      features?.lengthWidthCalc === true;
    return isCarpetBusiness && CARPET_UNITS.includes(unit);
  },

};
export { CarpetPack } from './CarpetPack';
