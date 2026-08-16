/* Har device ka unique ID — 2 devices offline sale karein to clash nahi */
const DEVICE_KEY = 'nafaa-device-id';
const SEQ_KEY = 'nafaa-offline-sale-seq';

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      id = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch { return 'XXXX'; }
}

export function nextOfflineSaleNumber(): string {
  const deviceId = getDeviceId();
  let seq = 1;
  try {
    seq = (parseInt(localStorage.getItem(SEQ_KEY) || '0', 10) || 0) + 1;
    localStorage.setItem(SEQ_KEY, String(seq));
  } catch {}
  return `OFFLINE-${deviceId}-${String(seq).padStart(4, '0')}`;
}
