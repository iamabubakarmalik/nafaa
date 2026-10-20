import { PosScreen } from '@modules/pos/engine';
import { opticalPos } from '../pos/config';

export default function OpticalPosPage() {
  return <PosScreen config={opticalPos} />;
}
