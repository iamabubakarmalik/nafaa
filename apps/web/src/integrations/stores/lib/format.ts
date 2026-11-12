/** Small number formatters for the website pages. */

export const rs = (n: number | null | undefined) => `Rs ${Math.round(Number(n ?? 0)).toLocaleString('en-PK')}`;

export const pct = (n: number | null | undefined, digits = 1) => `${Number(n ?? 0).toFixed(digits)}%`;

/** Lowercase a-z 0-9 and dashes, as the API stores handles. */
export const toHandle = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);

export const shortDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
