import { PosScreen } from '@modules/pos/engine';
import { shoePos } from '../pos/config';

/** Shoe counter on the shared POS engine (PosGate opens this page). */
export default function ShoePosPage() {
  return <PosScreen config={shoePos} />;
}
