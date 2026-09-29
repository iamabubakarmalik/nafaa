/**
 * Customer ka bharosa — isi dukaan ke pichhle online orders (phone se).
 * Pakistan me COD ka sab se bada nuqsan RTO (parcel wapas) hai: courier
 * ka kharcha dono taraf, maal phansa. Pehle se pata ho to call karke
 * confirm karein ya advance maangein.
 */
export type RiskLevel = 'NEW' | 'TRUSTED' | 'OK' | 'WATCH' | 'HIGH' | 'BLOCKED';

export interface CustomerHistory {
  total: number;
  delivered: number;
  returned: number;
  cancelled: number;
  open: number;
  spent: number;
}

export interface CustomerRisk extends CustomerHistory {
  level: RiskLevel;
  label: string;
  reason: string;
  /** Isi customer ke abhi khule (deliver/cancel nahi hue) doosre orders — dobara order? */
  duplicateOpen?: number;
}

/** Block list me ho to sab se upar */
export function blockedRisk(h: CustomerHistory, reason?: string | null): CustomerRisk {
  return { ...h, level: 'BLOCKED', label: 'Block kiya hua', reason: reason ? `Block: ${reason}` : 'Aap ne ye number block kiya hai — order accept na karein' };
}

/** 0300-1234567 / +92 300… / 3001234567 → "3001234567" (aakhri 10) */
export const phoneKey = (p?: string | null) => {
  const d = String(p ?? '').replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : null;
};

export function riskOf(h: CustomerHistory): CustomerRisk {
  const r = (level: RiskLevel, label: string, reason: string): CustomerRisk => ({ ...h, level, label, reason });
  if (h.total === 0) return r('NEW', 'Naya customer', 'Pehla order — COD ho to call karke confirm kar lein');
  if (h.returned >= 2 || (h.returned >= 1 && h.delivered === 0)) {
    return r('HIGH', 'RTO khatra', `${h.returned} parcel wapas kiye${h.delivered ? `, ${h.delivered} liye` : ', ek bhi nahi liya'} — advance ya call confirm`);
  }
  if (h.returned === 1) return r('WATCH', 'Dhyan se', `1 parcel wapas kiya, ${h.delivered} liye`);
  if (h.cancelled >= 3 && h.delivered === 0) return r('WATCH', 'Dhyan se', `${h.cancelled} order cancel, koi deliver nahi`);
  if (h.delivered >= 2) return r('TRUSTED', 'Bharosemand', `${h.delivered} order le chuka, koi wapas nahi`);
  return r('OK', 'Theek', `${h.delivered} order le chuka`);
}

export const emptyHistory = (): CustomerHistory => ({ total: 0, delivered: 0, returned: 0, cancelled: 0, open: 0, spent: 0 });
