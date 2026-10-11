import { PosScreen } from '@modules/pos/engine';
import { electronicsPos } from './config';

export default function ElectronicsPos() {
  return <PosScreen config={electronicsPos} />;
}
