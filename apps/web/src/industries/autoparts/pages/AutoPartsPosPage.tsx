import { PosScreen } from '@modules/pos/engine';
import { autoPartsPos } from '../pos/config';

/** Auto parts counter on the shared POS engine (see pos/config). */
export default function AutoPartsPosPage() {
  return <PosScreen config={autoPartsPos} />;
}
