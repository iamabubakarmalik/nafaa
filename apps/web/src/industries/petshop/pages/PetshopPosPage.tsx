import { PosScreen } from '@modules/pos/engine';
import { petshopPos } from '../pos/config';

/** Pet shop counter: the shared POS engine with the pet shop config. */
export default function PetshopPosPage() {
  return <PosScreen config={petshopPos} />;
}
