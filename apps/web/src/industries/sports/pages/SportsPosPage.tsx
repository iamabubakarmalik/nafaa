/**
 * Sports shop counter. Runs on the shared POS engine (sizes, udhaar,
 * receipts, offline queue); see ../pos/config.ts for the sports parts.
 */
import { PosScreen } from '@modules/pos/engine';
import { sportsPos } from '../pos/config';

export default function SportsPosPage() {
  return <PosScreen config={sportsPos} />;
}
