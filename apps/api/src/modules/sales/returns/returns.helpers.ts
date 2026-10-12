/** Small shared bits of the returns module. */

export const r2 = (n: number) => Math.round(n * 100) / 100;
export const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Activity log action written when the owner's PIN let a return through. */
export const PIN_APPROVAL_ACTION = 'REFUND_PIN_APPROVED';
