/** Meat counter (PosGate opens this page): the shared POS with the meat config. */

import { PosScreen } from '@modules/pos/engine';
import { meatPos } from '../pos/config';

export default function MeatPosPage() {
  return <PosScreen config={meatPos} />;
}
