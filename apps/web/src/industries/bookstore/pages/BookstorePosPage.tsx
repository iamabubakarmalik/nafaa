/**
 * Bookstore counter. Runs on the shared POS engine (units and dozens, udhaar,
 * split payment, receipts, offline queue); see ../pos/config.tsx for school
 * sets, ISBN search and book filters.
 */
import { PosScreen } from '@modules/pos/engine';
import { bookstorePos } from '../pos/config';

export default function BookstorePosPage() {
  return <PosScreen config={bookstorePos} />;
}
