import { PosScreen } from '@modules/pos/engine';
import { cosmeticsPos } from '../pos/config';

export default function CosmeticsPosPage() {
  return <PosScreen config={cosmeticsPos} />;
}
