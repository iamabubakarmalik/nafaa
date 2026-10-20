import { PosScreen } from '@modules/pos/engine';
import { agriPos } from '../pos/config';

/** Agri counter (PosGate entry): the shared POS engine with the agri config. */
export default function AgriPosPage() {
  return <PosScreen config={agriPos} />;
}
