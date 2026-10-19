import { PosScreen } from '@modules/pos/engine';
import { garmentsPos } from '../pos/config';

/** Garments counter on the shared POS engine (PosGate opens this page). */
export default function GarmentPosPage() {
  return <PosScreen config={garmentsPos} />;
}
