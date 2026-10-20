import { PosScreen } from '@modules/pos/engine';
import { gamingPos } from '../pos/config';

/** Gaming counter: the shared POS engine with the gaming config (stations, cards, games, snacks). */
export default function GamingPosPage() {
  return <PosScreen config={gamingPos} />;
}
