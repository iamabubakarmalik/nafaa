import { PosScreen } from '@modules/pos/engine';
import { servicesBizPos } from '../pos/config';

/** Service-business counter: the shared POS engine with services, parts and ready jobs. */
export default function ServicesBizPosPage() {
  return <PosScreen config={servicesBizPos} />;
}
