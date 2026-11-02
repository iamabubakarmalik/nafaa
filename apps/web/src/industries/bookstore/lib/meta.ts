/** Bookstore labels, query keys and small helpers shared by its pages. */

import { t } from '@core/i18n';
export const KEYS = {
  facts: 'bookstore-facts',
  schools: 'bookstore-schools',
  lists: 'bookstore-school-lists',
  posLists: 'bookstore-school-lists-pos',
  publishers: 'bookstore-publishers',
  authors: 'bookstore-authors',
  rentals: 'bookstore-rentals',
  books: 'bookstore-books',
} as const;

/** Server message from an API error, else the fallback. */
export function apiError(e: unknown, fallback: string): string {
  const d = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(d)) return String(d[0] ?? fallback);
  return typeof d === 'string' && d ? d : fallback;
}

/** Keeps digits and one dot, for money and percent inputs. */
export const decimal = (v: string) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
export const digits = (v: string) => v.replace(/\D/g, '');

export type ItemKind = 'BOOK' | 'STATIONERY' | 'ART' | 'OTHER';
export const KINDS: Array<{ value: ItemKind; label: string; hint: string }> = [
  { value: 'BOOK', label: t('Kitab'), hint: t('ISBN, author, publisher, class') },
  { value: 'STATIONERY', label: t('Stationery'), hint: t('Copy, pen, register, geometry') },
  { value: 'ART', label: t('Art'), hint: t('Rang, brush, canvas') },
  { value: 'OTHER', label: t('Aur'), hint: t('Uniform, bag, gift') },
];

/** Book types a Pakistani shop deals in most; the rest stay "Other". */
export const BOOK_CATEGORIES: Array<[string, string]> = [
  ['TEXTBOOK', t('Textbook')], ['GUIDE', t('Guide / key book')], ['WORKBOOK', t('Workbook')], ['EXAM_PREP', t('Test / past papers')],
  ['DICTIONARY', t('Dictionary')], ['REFERENCE', t('Reference')], ['NOVEL', t('Novel')], ['STORYBOOK', t('Kahani')],
  ['CHILDREN', t('Bachon ki')], ['COLORING_BOOK', t('Coloring')], ['ISLAMIC_STUDIES', t('Islamiyat')], ['QURAN', t('Quran')],
  ['URDU', t('Urdu adab')], ['POETRY', t('Shairi')], ['BIOGRAPHY', t('Biography')], ['HISTORY', t('Tareekh')],
  ['SELF_HELP', t('Self help')], ['BUSINESS', t('Business')], ['MAGAZINE', t('Magazine')], ['OTHER', t('Other')],
];
export const BINDINGS: Array<[string, string]> = [['PAPERBACK', t('Paperback')], ['HARDCOVER', t('Hardcover')], ['SPIRAL', t('Spiral')], ['STAPLED', t('Stapled')]];
export const CONDITIONS: Array<[string, string]> = [['NEW', t('Nayi')], ['USED_LIKE_NEW', t('Purani — achhi')], ['USED_GOOD', t('Purani')], ['OLD_STOCK', t('Purana edition')]];
export const LANGUAGES = ['English', 'Urdu', 'Arabic', 'Sindhi', 'Pashto', 'Punjabi'];
export const BOARDS = ['Punjab Board', 'Federal Board', 'Sindh Board', 'KPK Board', 'Cambridge (O/A Level)', 'Oxford', 'Single National Curriculum'];
export const GRADES = ['Play group', 'Nursery', 'Prep', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'O Level', 'A Level'];
export const SUBJECTS = ['English', 'Urdu', 'Maths', 'Science', 'Islamiyat', 'Social Studies', 'Computer', 'General Knowledge', 'Physics', 'Chemistry', 'Biology', 'Pak Studies', 'Arabic', 'Nazra'];

export const STATIONERY_CATEGORIES: Array<[string, string]> = [
  ['NOTEBOOK', t('Copy / notebook')], ['REGISTER', t('Register')], ['PEN_BALLPOINT', t('Ball pen')], ['PEN_GEL', t('Gel pen')],
  ['PENCIL_HB', t('Pencil')], ['PENCIL_COLOR', t('Color pencil')], ['ERASER', t('Rubber')], ['SHARPENER', t('Sharpener')],
  ['GEOMETRY_BOX', t('Geometry box')], ['RULER', t('Scale')], ['MARKER_PERMANENT', t('Marker')], ['HIGHLIGHTER', t('Highlighter')],
  ['CHART_PAPER', t('Chart paper')], ['FILE_FOLDER', t('File / folder')], ['GLUE', t('Glue / gum')], ['TAPE', t('Tape')],
  ['CALCULATOR', t('Calculator')], ['SCHOOL_BAG', t('School bag')], ['LUNCH_BOX', t('Lunch box')], ['WATER_BOTTLE', t('Bottle')],
  ['BOOK_COVER', t('Book cover')], ['OTHER', t('Other')],
];
export const ART_CATEGORIES: Array<[string, string]> = [
  ['WATERCOLOR_PAINT', t('Water color')], ['POSTER_PAINT', t('Poster color')], ['ACRYLIC_PAINT', t('Acrylic')], ['OIL_PAINT', t('Oil paint')],
  ['BRUSH_SET', t('Brush set')], ['BRUSH_ROUND', t('Brush')], ['CANVAS_STRETCHED', t('Canvas')], ['SKETCH_PAPER', t('Sketch paper')],
  ['CHARCOAL', t('Charcoal')], ['PASTEL_OIL', t('Oil pastel')], ['CLAY', t('Clay')], ['CALLIGRAPHY_PEN', t('Calligraphy pen')],
  ['QALAM', t('Qalam')], ['DAWAT', t('Dawat')], ['GLITTER', t('Glitter')], ['FOAM_SHEET', t('Foam sheet')], ['EASEL', t('Easel')], ['OTHER', t('Other')],
];

export const labelOf = (list: Array<[string, string]>, v?: string | null) => (v ? list.find(([k]) => k === v)?.[1] ?? v.replace(/_/g, ' ').toLowerCase() : '');

export const SCHOOL_TYPES = ['School', 'College', 'Academy', 'Madrassa', 'University', 'Tuition centre'];
export const LIST_STATUS: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: t('Draft'), tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  ACTIVE: { label: t('Counter par'), tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CLOSED: { label: t('Band'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  ARCHIVED: { label: t('Purani'), tone: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

/** Current school session, e.g. "2026-2027" (sessions start in spring). */
export function currentSession(now = new Date()): string {
  const y = now.getFullYear();
  return now.getMonth() >= 2 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}
