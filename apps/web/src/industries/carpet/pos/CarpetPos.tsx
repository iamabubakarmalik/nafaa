import { PosScreen } from '@modules/pos/engine';
import { carpetPos } from './config';

export default function CarpetPos() {
  return <PosScreen config={carpetPos} />;
}
