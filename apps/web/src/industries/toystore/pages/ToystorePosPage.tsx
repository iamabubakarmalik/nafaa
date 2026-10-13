/**
 * Toy shop counter. Runs on the shared POS engine (variants, udhaar,
 * receipts, offline queue); see ../pos/config.ts for age chips and gift packs.
 */
import { PosScreen } from '@modules/pos/engine';
import { toystorePos } from '../pos/config';

export default function ToystorePosPage() {
  return <PosScreen config={toystorePos} />;
}
