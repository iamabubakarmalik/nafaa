import { PosScreen } from '@modules/pos/engine';
import { gymPos } from '../pos/config';

/** Gym counter: the shared POS engine with supplements, shakes and gym services. */
export default function GymPosPage() {
  return <PosScreen config={gymPos} />;
}
