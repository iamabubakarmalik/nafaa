/**
 * Restaurant counter in the shared POS (web PosGate → RestaurantPosPage):
 * the POS tab shows the order composer in counter mode, with tables, the
 * kitchen and add-ons, instead of the retail counter.
 */

import { msg } from '@/core/i18n';
import { generalPos, registerPosIndustry } from '@/modules/pos/engine/industry';
import { CounterScreen } from './screens/ComposerScreen';

registerPosIndustry({
  ...generalPos,
  id: 'restaurant',
  searchHint: msg('Dish ka naam ya code…'),
  combos: false,
  quickKeys: false,
  Screen: CounterScreen,
});
