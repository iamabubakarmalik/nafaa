import { PosScreen } from '@modules/pos/engine';
import { retailPos } from './config';

export default function RetailPos() {
  return <PosScreen config={retailPos} />;
}
