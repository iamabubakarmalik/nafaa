import { PosScreen } from '@modules/pos/engine';
import { floristPos } from '../pos/config';

/** Florist counter: the shared POS engine with the florist config. */
export default function FloristPosPage() {
  return <PosScreen config={floristPos} />;
}
