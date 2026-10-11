/**
 * A printable document described as data. Pages build a `PrintDoc`; the
 * print module turns it into an A4 page, a PDF file, a thermal slip
 * (80/58 mm) or ESC/POS bytes for a directly connected printer.
 */

/** a4 = browser print; pdf = file download; 80/58 = thermal slip. */
export type PrintFormat = 'a4' | 'pdf' | '80' | '58';

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

/** Everything a renderer needs besides the document itself. */
export interface RenderContext {
  biz: BusinessHeader;
  /** Hex accent for colour output. */
  accent: string;
  color: boolean;
  showLogo: boolean;
  showAddress: boolean;
  showPhone: boolean;
  footerNote: string;
  stamp?: string;
  thermalText: 'sm' | 'md' | 'lg';
}
