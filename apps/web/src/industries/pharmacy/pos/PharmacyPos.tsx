import { PosScreen } from '@modules/pos/engine';
import { pharmacyPos } from './config';

export default function PharmacyPos() {
  return <PosScreen config={pharmacyPos} />;
}
