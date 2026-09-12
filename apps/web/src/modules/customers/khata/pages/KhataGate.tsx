// apps/web/src/modules/customers/khata/pages/KhataGate.tsx
import KhataPage from './KhataPage';

/**
 * KhataGate — ab har industry ek hi khata page use karti hai.
 *
 * Pehle retail, mobile aur electronics ke teen alag khata pages the
 * (~150KB). Jab dekha to retail aur electronics me ek bhi
 * industry-specific cheez nahi thi — bas rang aur alfaaz alag the.
 *
 * Ab sab ke liye wohi ek page: PIN lock, gender-aware WhatsApp
 * reminders, bulk reminder wizard, aging buckets, statement print,
 * aur naya "Purana Khata" (copy se software par) + bina sale ke udhaar.
 *
 * Purane industry pages disk par mojood hain lekin gate me se hata
 * diye gaye hain.
 */
export default function KhataGate() {
  return <KhataPage />;
}
