import { PosScreen } from '@modules/pos/engine';
import { mobilePos } from './config';

export default function MobilePos() {
  return <PosScreen config={mobilePos} />;
}
