export function generateCustomerReferralCode(seed: string): string {
  const clean = seed.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 4) || 'USER';
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NB-${clean}${rand}`;
}
