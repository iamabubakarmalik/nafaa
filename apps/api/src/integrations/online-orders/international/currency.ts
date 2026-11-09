/**
 * International storefront math without a database: manual exchange rates,
 * display prices in a customer's currency, country price lists and the
 * international shipping charge. Everything the shop books stays in PKR;
 * a currency is only how a price is shown (and a country price list is the
 * price the customer sees and pays, converted back to PKR at the same rate).
 */

export interface Currency {
  /** ISO 4217 code, upper case. */
  code: string;
  /** PKR for one unit of this currency (manual, set by the shop). */
  rate: number;
  /** Digits after the point when showing a price. */
  decimals: number;
}

export interface CountryRule {
  /** ISO 3166 alpha-2 code, upper case. */
  code: string;
  name: string;
  /** Currency code shown to customers of this country. */
  currency: string;
  /** International shipping charge in PKR. */
  shippingFee: number;
  /** Order value in PKR from which shipping is free; null = never. */
  freeAbove: number | null;
}

export interface InternationalConfig {
  enabled: boolean;
  currencies: Currency[];
  countries: CountryRule[];
  /** Country preselected on the form; null = Pakistan (PKR). */
  defaultCountry: string | null;
}

export const NO_INTERNATIONAL: InternationalConfig = { enabled: false, currencies: [], countries: [], defaultCountry: null };

/** Common currencies and the digits they use; others default to 2. */
export const CURRENCY_DECIMALS: Record<string, number> = { JPY: 0, KRW: 0, VND: 0, BHD: 3, KWD: 3, OMR: 3 };
export const MAX_CURRENCIES = 12;
export const MAX_COUNTRIES = 60;

const r2 = (v: number) => Math.round(v * 100) / 100;

export const decimalsOf = (code: string) => CURRENCY_DECIMALS[code] ?? 2;

export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

const cleanCode = (v: unknown, len: number) => {
  const s = String(v ?? '').trim().toUpperCase();
  return new RegExp(`^[A-Z]{${len}}$`).test(s) ? s : '';
};

/** Reads the saved settings; wrong rows are dropped, never thrown. */
export function readInternational(raw: unknown): InternationalConfig {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const seen = new Set<string>();
  const currencies: Currency[] = [];
  for (const c of Array.isArray(r.currencies) ? r.currencies : []) {
    const code = cleanCode(c?.code, 3);
    const rate = Number(c?.rate);
    if (!code || code === 'PKR' || seen.has(code) || !Number.isFinite(rate) || rate <= 0) continue;
    seen.add(code);
    currencies.push({ code, rate: roundTo(rate, 4), decimals: decimalsOf(code) });
    if (currencies.length >= MAX_CURRENCIES) break;
  }
  const codes = new Set<string>();
  const countries: CountryRule[] = [];
  for (const c of Array.isArray(r.countries) ? r.countries : []) {
    const code = cleanCode(c?.code, 2);
    const currency = String(c?.currency ?? '').trim().toUpperCase();
    if (!code || code === 'PK' || codes.has(code) || !seen.has(currency)) continue;
    codes.add(code);
    const free = Number(c?.freeAbove);
    countries.push({
      code,
      name: String(c?.name ?? code).trim().slice(0, 60) || code,
      currency,
      shippingFee: Math.max(0, r2(Number(c?.shippingFee) || 0)),
      freeAbove: Number.isFinite(free) && free > 0 ? r2(free) : null,
    });
    if (countries.length >= MAX_COUNTRIES) break;
  }
  const def = cleanCode(r.defaultCountry, 2);
  return { enabled: r.enabled === true && countries.length > 0, currencies, countries, defaultCountry: codes.has(def) ? def : null };
}

/** PKR to a display currency, rounded to the currency's digits. */
export function fromPkr(pkr: number, cur: Pick<Currency, 'rate' | 'decimals'>): number {
  if (!(cur.rate > 0)) return 0;
  return roundTo(pkr / cur.rate, cur.decimals);
}

/** A display amount back to PKR (2 digits), for the order the shop books. */
export function toPkr(amount: number, cur: Pick<Currency, 'rate'>): number {
  return r2(amount * cur.rate);
}

export interface ShownPrice {
  /** Price in the customer's currency. */
  amount: number;
  /** The same price in PKR (what the order books). */
  pkr: number;
  /** list = a country price list row; rate = the PKR price converted. */
  source: 'list' | 'rate';
}

/**
 * The price a customer of one country sees. A country price list row wins
 * and is the exact amount; otherwise the PKR price is converted at the
 * manual rate. Either way the booked PKR follows the shown amount, so the
 * customer pays what the page said.
 */
export function shownPrice(basePkr: number, listAmount: number | null | undefined, cur: Currency): ShownPrice {
  if (listAmount != null && Number.isFinite(listAmount) && listAmount > 0) {
    const amount = roundTo(listAmount, cur.decimals);
    return { amount, pkr: toPkr(amount, cur), source: 'list' };
  }
  const amount = fromPkr(basePkr, cur);
  return { amount, pkr: toPkr(amount, cur), source: 'rate' };
}

/** International shipping charge in PKR for an order of `subtotalPkr`. */
export function shippingFor(country: Pick<CountryRule, 'shippingFee' | 'freeAbove'>, subtotalPkr: number): number {
  if (country.freeAbove != null && subtotalPkr >= country.freeAbove) return 0;
  return country.shippingFee;
}

/** Plain text for the order note so the shop sees what the customer saw. */
export function internationalNote(country: CountryRule, cur: Currency, totalAmount: number): string {
  return `International order: ${country.name} (${country.code}), customer saw ${cur.code} ${totalAmount.toFixed(cur.decimals)} at ${cur.code} 1 = PKR ${cur.rate}`;
}
