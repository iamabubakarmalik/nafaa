import { PosScreen } from '@modules/pos/engine';
import { bakeryPos } from './config';

export default function BakeryPos() {
  return <PosScreen config={bakeryPos} />;
}
