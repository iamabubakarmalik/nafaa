/** Bookstore labels, query keys and helpers (mirror of the web bookstore lib/meta.ts). Labels are source keys marked with msg(). */

import { queryClient } from '@/core/query/client';
import { msg, t } from '@/core/i18n';
import type { StatusTone } from '@/design';
import type { BookFact } from './api';

export const KEYS = {
  facts: 'bookstore-facts', schools: 'bookstore-schools', lists: 'bookstore-school-lists', posLists: 'bookstore-school-lists-pos', publishers: 'bookstore-publishers',
  authors: 'bookstore-authors', rentals: 'bookstore-rentals', books: 'bookstore-books', dashboard: 'bookstore-dashboard', stationery: 'bookstore-stationery', art: 'bookstore-art',
} as const;

const MONEY_KEYS = ['sales-history', 'customers-directory', 'customer', 'customer-ledger', 'cash-register', 'inv', 'offline'];
export function refreshBookstore(keys: string[], money = false) {
  [...keys, KEYS.dashboard, ...(money ? MONEY_KEYS : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

export type ItemKind = 'BOOK' | 'STATIONERY' | 'ART' | 'OTHER';
export const KINDS: Array<{ value: ItemKind; label: string; hint: string }> = [
  { value: 'BOOK', label: msg('Kitab'), hint: msg('ISBN, author, publisher, class') },
  { value: 'STATIONERY', label: msg('Stationery'), hint: msg('Copy, pen, register, geometry') },
  { value: 'ART', label: msg('Art'), hint: msg('Rang, brush, canvas') },
  { value: 'OTHER', label: msg('Aur'), hint: msg('Uniform, bag, gift') },
];

export const BOOK_CATEGORIES: Array<[string, string]> = [
  ['TEXTBOOK', msg('Textbook')], ['GUIDE', msg('Guide / key book')], ['WORKBOOK', msg('Workbook')], ['EXAM_PREP', msg('Test / past papers')], ['DICTIONARY', msg('Dictionary')],
  ['REFERENCE', msg('Reference')], ['NOVEL', msg('Novel')], ['STORYBOOK', msg('Kahani')], ['CHILDREN', msg('Bachon ki')], ['COLORING_BOOK', msg('Coloring')], ['ISLAMIC_STUDIES', msg('Islamiyat')],
  ['QURAN', msg('Quran')], ['URDU', msg('Urdu adab')], ['POETRY', msg('Shairi')], ['BIOGRAPHY', msg('Biography')], ['HISTORY', msg('Tareekh')], ['SELF_HELP', msg('Self help')],
  ['BUSINESS', msg('Business')], ['MAGAZINE', msg('Magazine')], ['OTHER', msg('Other')],
];
export const BINDINGS: Array<[string, string]> = [['PAPERBACK', msg('Paperback')], ['HARDCOVER', msg('Hardcover')], ['SPIRAL', msg('Spiral')], ['STAPLED', msg('Stapled')]];
export const CONDITIONS: Array<[string, string]> = [['NEW', msg('Nayi')], ['USED_LIKE_NEW', msg('Purani — achhi')], ['USED_GOOD', msg('Purani')], ['OLD_STOCK', msg('Purana edition')]];
export const LANGUAGES = ['English', 'Urdu', 'Arabic', 'Sindhi', 'Pashto', 'Punjabi'];
export const BOARDS = ['Punjab Board', 'Federal Board', 'Sindh Board', 'KPK Board', 'Cambridge (O/A Level)', 'Oxford', 'Single National Curriculum'];
export const GRADES = ['Play group', 'Nursery', 'Prep', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'O Level', 'A Level'];
export const SUBJECTS = ['English', 'Urdu', 'Maths', 'Science', 'Islamiyat', 'Social Studies', 'Computer', 'General Knowledge', 'Physics', 'Chemistry', 'Biology', 'Pak Studies', 'Arabic', 'Nazra'];

export const STATIONERY_CATEGORIES: Array<[string, string]> = [
  ['NOTEBOOK', msg('Copy / notebook')], ['REGISTER', msg('Register')], ['PEN_BALLPOINT', msg('Ball pen')], ['PEN_GEL', msg('Gel pen')], ['PENCIL_HB', msg('Pencil')], ['PENCIL_COLOR', msg('Color pencil')],
  ['ERASER', msg('Rubber')], ['SHARPENER', msg('Sharpener')], ['GEOMETRY_BOX', msg('Geometry box')], ['RULER', msg('Scale')], ['MARKER_PERMANENT', msg('Marker')], ['HIGHLIGHTER', msg('Highlighter')],
  ['CHART_PAPER', msg('Chart paper')], ['FILE_FOLDER', msg('File / folder')], ['GLUE', msg('Glue / gum')], ['TAPE', msg('Tape')], ['CALCULATOR', msg('Calculator')], ['SCHOOL_BAG', msg('School bag')],
  ['LUNCH_BOX', msg('Lunch box')], ['WATER_BOTTLE', msg('Bottle')], ['BOOK_COVER', msg('Book cover')], ['OTHER', msg('Other')],
];
export const ART_CATEGORIES: Array<[string, string]> = [
  ['WATERCOLOR_PAINT', msg('Water color')], ['POSTER_PAINT', msg('Poster color')], ['ACRYLIC_PAINT', msg('Acrylic')], ['OIL_PAINT', msg('Oil paint')], ['BRUSH_SET', msg('Brush set')],
  ['BRUSH_ROUND', msg('Brush')], ['CANVAS_STRETCHED', msg('Canvas')], ['SKETCH_PAPER', msg('Sketch paper')], ['CHARCOAL', msg('Charcoal')], ['PASTEL_OIL', msg('Oil pastel')], ['CLAY', msg('Clay')],
  ['CALLIGRAPHY_PEN', msg('Calligraphy pen')], ['QALAM', msg('Qalam')], ['DAWAT', msg('Dawat')], ['GLITTER', msg('Glitter')], ['FOAM_SHEET', msg('Foam sheet')], ['EASEL', msg('Easel')], ['OTHER', msg('Other')],
];
export const labelOf = (list: Array<[string, string]>, v?: string | null) => (v ? t(list.find(([k]) => k === v)?.[1] ?? v.replace(/_/g, ' ').toLowerCase()) : '');

export const SCHOOL_TYPES = ['School', 'College', 'Academy', 'Madrassa', 'University', 'Tuition centre'];
export const LIST_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  DRAFT: { label: msg('Draft'), tone: 'neutral' }, ACTIVE: { label: msg('Counter par'), tone: 'success' }, CLOSED: { label: msg('Band'), tone: 'warning' }, ARCHIVED: { label: msg('Purani'), tone: 'neutral' },
};
export const RENTAL_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: msg('Bahar hai'), tone: 'info' }, OVERDUE: { label: msg('Late'), tone: 'danger' }, RETURNED: { label: msg('Wapas'), tone: 'success' },
  LOST: { label: msg('Gum'), tone: 'neutral' }, DAMAGED: { label: msg('Kharab'), tone: 'warning' }, CANCELLED: { label: msg('Cancel'), tone: 'neutral' },
};

/** "Ali Raza · Oxford · 3rd ed" for a book; brand and type for stationery and art. */
export function factLine(f?: BookFact): string | undefined {
  if (!f) return undefined;
  if (f.kind === 'BOOK') {
    const parts = [f.authors.slice(0, 2).join(', '), f.publisher, f.edition ? `${f.edition} ed` : undefined, f.isTextbook ? [f.grade, f.subject].filter(Boolean).join(' ') : undefined];
    return parts.filter(Boolean).join(' · ') || undefined;
  }
  const list = f.kind === 'STATIONERY' ? STATIONERY_CATEGORIES : ART_CATEGORIES;
  return [labelOf(list, f.category), f.brand, f.color, f.size].filter(Boolean).join(' · ') || undefined;
}
export const isbnOf = (f?: BookFact) => (f?.kind === 'BOOK' ? f.isbn13 || f.isbn10 || undefined : undefined);
