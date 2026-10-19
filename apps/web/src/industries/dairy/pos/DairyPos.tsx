import { PosScreen } from '@modules/pos/engine';
import { dairyPos } from './config';

export default function DairyPos() {
  return <PosScreen config={dairyPos} />;
}
