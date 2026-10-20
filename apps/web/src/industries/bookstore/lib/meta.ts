/** Bookstore labels, query keys and small helpers shared by its pages. */

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
  { value: 'BOOK', label: 'Kitab', hint: 'ISBN, author, publisher, class' },
  { value: 'STATIONERY', label: 'Stationery', hint: 'Copy, pen, register, geometry' },
  { value: 'ART', label: 'Art', hint: 'Rang, brush, canvas' },
  { value: 'OTHER', label: 'Aur', hint: 'Uniform, bag, gift' },
];

/** Book types a Pakistani shop deals in most; the rest stay "Other". */
export const BOOK_CATEGORIES: Array<[string, string]> = [
  ['TEXTBOOK', 'Textbook'], ['GUIDE', 'Guide / key book'], ['WORKBOOK', 'Workbook'], ['EXAM_PREP', 'Test / past papers'],
  ['DICTIONARY', 'Dictionary'], ['REFERENCE', 'Reference'], ['NOVEL', 'Novel'], ['STORYBOOK', 'Kahani'],
  ['CHILDREN', 'Bachon ki'], ['COLORING_BOOK', 'Coloring'], ['ISLAMIC_STUDIES', 'Islamiyat'], ['QURAN', 'Quran'],
  ['URDU', 'Urdu adab'], ['POETRY', 'Shairi'], ['BIOGRAPHY', 'Biography'], ['HISTORY', 'Tareekh'],
  ['SELF_HELP', 'Self help'], ['BUSINESS', 'Business'], ['MAGAZINE', 'Magazine'], ['OTHER', 'Other'],
];
export const BINDINGS: Array<[string, string]> = [['PAPERBACK', 'Paperback'], ['HARDCOVER', 'Hardcover'], ['SPIRAL', 'Spiral'], ['STAPLED', 'Stapled']];
export const CONDITIONS: Array<[string, string]> = [['NEW', 'Nayi'], ['USED_LIKE_NEW', 'Purani — achhi'], ['USED_GOOD', 'Purani'], ['OLD_STOCK', 'Purana edition']];
export const LANGUAGES = ['English', 'Urdu', 'Arabic', 'Sindhi', 'Pashto', 'Punjabi'];
export const BOARDS = ['Punjab Board', 'Federal Board', 'Sindh Board', 'KPK Board', 'Cambridge (O/A Level)', 'Oxford', 'Single National Curriculum'];
export const GRADES = ['Play group', 'Nursery', 'Prep', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'O Level', 'A Level'];
export const SUBJECTS = ['English', 'Urdu', 'Maths', 'Science', 'Islamiyat', 'Social Studies', 'Computer', 'General Knowledge', 'Physics', 'Chemistry', 'Biology', 'Pak Studies', 'Arabic', 'Nazra'];

export const STATIONERY_CATEGORIES: Array<[string, string]> = [
  ['NOTEBOOK', 'Copy / notebook'], ['REGISTER', 'Register'], ['PEN_BALLPOINT', 'Ball pen'], ['PEN_GEL', 'Gel pen'],
  ['PENCIL_HB', 'Pencil'], ['PENCIL_COLOR', 'Color pencil'], ['ERASER', 'Rubber'], ['SHARPENER', 'Sharpener'],
  ['GEOMETRY_BOX', 'Geometry box'], ['RULER', 'Scale'], ['MARKER_PERMANENT', 'Marker'], ['HIGHLIGHTER', 'Highlighter'],
  ['CHART_PAPER', 'Chart paper'], ['FILE_FOLDER', 'File / folder'], ['GLUE', 'Glue / gum'], ['TAPE', 'Tape'],
  ['CALCULATOR', 'Calculator'], ['SCHOOL_BAG', 'School bag'], ['LUNCH_BOX', 'Lunch box'], ['WATER_BOTTLE', 'Bottle'],
  ['BOOK_COVER', 'Book cover'], ['OTHER', 'Other'],
];
export const ART_CATEGORIES: Array<[string, string]> = [
  ['WATERCOLOR_PAINT', 'Water color'], ['POSTER_PAINT', 'Poster color'], ['ACRYLIC_PAINT', 'Acrylic'], ['OIL_PAINT', 'Oil paint'],
  ['BRUSH_SET', 'Brush set'], ['BRUSH_ROUND', 'Brush'], ['CANVAS_STRETCHED', 'Canvas'], ['SKETCH_PAPER', 'Sketch paper'],
  ['CHARCOAL', 'Charcoal'], ['PASTEL_OIL', 'Oil pastel'], ['CLAY', 'Clay'], ['CALLIGRAPHY_PEN', 'Calligraphy pen'],
  ['QALAM', 'Qalam'], ['DAWAT', 'Dawat'], ['GLITTER', 'Glitter'], ['FOAM_SHEET', 'Foam sheet'], ['EASEL', 'Easel'], ['OTHER', 'Other'],
];

export const labelOf = (list: Array<[string, string]>, v?: string | null) => (v ? list.find(([k]) => k === v)?.[1] ?? v.replace(/_/g, ' ').toLowerCase() : '');

export const SCHOOL_TYPES = ['School', 'College', 'Academy', 'Madrassa', 'University', 'Tuition centre'];
export const LIST_STATUS: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: 'Draft', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  ACTIVE: { label: 'Counter par', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CLOSED: { label: 'Band', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  ARCHIVED: { label: 'Purani', tone: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

/** Current school session, e.g. "2026-2027" (sessions start in spring). */
export function currentSession(now = new Date()): string {
  const y = now.getFullYear();
  return now.getMonth() >= 2 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}
