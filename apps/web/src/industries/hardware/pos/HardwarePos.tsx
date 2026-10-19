import { PosScreen } from '@modules/pos/engine';
import { hardwarePos } from './config';

export default function HardwarePos() {
  return <PosScreen config={hardwarePos} />;
}
