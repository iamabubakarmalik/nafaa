/**
 * A printable document described as data. Pages build a `PrintDoc`; the
 * print module turns it into an A4 page, a thermal slip (80/58 mm) or
 * ESC/POS bytes for a directly connected printer.
 */

export type PrintFormat = 'a4' | '80' | '58';

export interface PrintRow {
  label: string;
  value: string;
  /** Totals line: bold with a rule above. */
  strong?: boolean;
  /** Indented detail line. */
  sub?: boolean;
}

export interface PrintColumn {
  label: string;
  align?: 'left' | 'right';
  /** Dropped on thermal slips to fit the narrow paper. */
  wideOnly?: boolean;
}

export type PrintSection =
  | { kind: 'rows'; title?: string; rows: PrintRow[] }
  | { kind: 'table'; title?: string; columns: PrintColumn[]; rows: string[][]; groupRows?: number[]; footer?: string[] }
  | { kind: 'text'; title?: string; text: string };

export interface PrintDoc {
  title: string;
  subtitle?: string;
  /** Short facts under the title: date, branch, printed by. */
  meta?: Array<[string, string]>;
  sections: PrintSection[];
  footer?: string;
}

export interface BusinessHeader {
  name: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
}
