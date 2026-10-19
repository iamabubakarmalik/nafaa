import { PosScreen } from '@modules/pos/engine';
import { clinicPos } from '../pos/config';

/** Clinic counter: the shared POS engine with clinic services, lab and medicines. */
export default function ClinicPosPage() {
  return <PosScreen config={clinicPos} />;
}
