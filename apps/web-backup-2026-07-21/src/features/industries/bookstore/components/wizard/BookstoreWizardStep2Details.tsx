import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, Palette, Sparkles, AlertCircle, Search, X, User,
  Hash, Calendar, Info, Plus, Check, Tag, Layers, Globe,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { publishersApi } from '../../api/publishers.api';
import { authorsApi } from '../../api/authors.api';
import type {
  BookstoreWizardBookDetails, BookstoreWizardStationeryDetails,
  BookstoreWizardArtDetails, ProductType,
} from '../../hooks/useBookstoreWizard';
import type { BookCategory, BookBinding, BookCondition } from '../../api/book-profiles.api';
import type { StationeryCategory } from '../../api/stationery-profiles.api';
import type { ArtSupplyCategory } from '../../api/art-supply-profiles.api';

interface Props {
  productType: ProductType;
  book: BookstoreWizardBookDetails;
  stationery: BookstoreWizardStationeryDetails;
  art: BookstoreWizardArtDetails;
  onBookChange: (patch: Partial<BookstoreWizardBookDetails>) => void;
  onStationeryChange: (patch: Partial<BookstoreWizardStationeryDetails>) => void;
  onArtChange: (patch: Partial<BookstoreWizardArtDetails>) => void;
  onToggleAuthor: (id: string) => void;
  errors: string[];
}

const BOOK_CATEGORIES: BookCategory[] = [
  'TEXTBOOK', 'REFERENCE', 'GUIDE', 'WORKBOOK', 'EXAM_PREP',
  'DICTIONARY', 'ATLAS', 'ENCYCLOPEDIA', 'NOVEL', 'SHORT_STORY',
  'POETRY', 'DRAMA', 'FANTASY', 'MYSTERY', 'ROMANCE', 'THRILLER',
  'SCIENCE_FICTION', 'BIOGRAPHY', 'HISTORY', 'PHILOSOPHY', 'RELIGION',
  'SELF_HELP', 'BUSINESS', 'ECONOMICS', 'SCIENCE', 'TECHNOLOGY',
  'COOKING', 'TRAVEL', 'CHILDREN', 'STORYBOOK', 'COMICS', 'QURAN',
  'HADITH', 'SEERAH', 'FIQH', 'ISLAMIC_HISTORY', 'ISLAMIC_STUDIES',
  'DUA_BOOK', 'URDU', 'ENGLISH_LANGUAGE', 'ARABIC', 'OTHER',
];

const BINDINGS: { value: BookBinding; label: string; emoji: string }[] = [
  { value: 'PAPERBACK', label: 'Paperback', emoji: '📖' },
  { value: 'HARDCOVER', label: 'Hardcover', emoji: '📚' },
  { value: 'SPIRAL', label: 'Spiral', emoji: '🌀' },
  { value: 'STAPLED', label: 'Stapled', emoji: '📎' },
  { value: 'LEATHER', label: 'Leather', emoji: '🎨' },
  { value: 'EBOOK', label: 'eBook', emoji: '💻' },
];

const CONDITIONS: { value: BookCondition; label: string; color: string }[] = [
  { value: 'NEW', label: 'New', color: 'emerald' },
  { value: 'USED_LIKE_NEW', label: 'Used - Like New', color: 'blue' },
  { value: 'USED_GOOD', label: 'Used - Good', color: 'amber' },
  { value: 'USED_ACCEPTABLE', label: 'Used - OK', color: 'orange' },
  { value: 'OLD_STOCK', label: 'Old Stock', color: 'slate' },
];

const LANGUAGES = ['Urdu', 'English', 'Arabic', 'Sindhi', 'Punjabi', 'Pashto', 'Balochi', 'Persian', 'Other'];

const STATIONERY_CATEGORIES: { value: StationeryCategory; label: string; emoji: string }[] = [
  { value: 'PEN_BALLPOINT', label: 'Ballpoint Pen', emoji: '🖊️' },
  { value: 'PEN_GEL', label: 'Gel Pen', emoji: '🖊️' },
  { value: 'PEN_FOUNTAIN', label: 'Fountain Pen', emoji: '🖋️' },
  { value: 'PENCIL_HB', label: 'HB Pencil', emoji: '✏️' },
  { value: 'PENCIL_COLOR', label: 'Color Pencil', emoji: '🖍️' },
  { value: 'PENCIL_MECHANICAL', label: 'Mechanical Pencil', emoji: '✏️' },
  { value: 'HIGHLIGHTER', label: 'Highlighter', emoji: '🖍️' },
  { value: 'MARKER_PERMANENT', label: 'Marker', emoji: '🖊️' },
  { value: 'NOTEBOOK', label: 'Notebook', emoji: '📓' },
  { value: 'REGISTER', label: 'Register', emoji: '📔' },
  { value: 'DIARY', label: 'Diary', emoji: '📔' },
  { value: 'CHART_PAPER', label: 'Chart Paper', emoji: '📄' },
  { value: 'ERASER', label: 'Eraser', emoji: '🔲' },
  { value: 'SHARPENER', label: 'Sharpener', emoji: '📐' },
  { value: 'RULER', label: 'Ruler', emoji: '📏' },
  { value: 'GEOMETRY_BOX', label: 'Geometry Box', emoji: '📐' },
  { value: 'CALCULATOR', label: 'Calculator', emoji: '🔢' },
  { value: 'SCISSORS', label: 'Scissors', emoji: '✂️' },
  { value: 'STAPLER', label: 'Stapler', emoji: '📎' },
  { value: 'GLUE', label: 'Glue', emoji: '🧴' },
  { value: 'TAPE', label: 'Tape', emoji: '📼' },
  { value: 'FILE_FOLDER', label: 'File / Folder', emoji: '📁' },
  { value: 'SCHOOL_BAG', label: 'School Bag', emoji: '🎒' },
  { value: 'LUNCH_BOX', label: 'Lunch Box', emoji: '🍱' },
  { value: 'WATER_BOTTLE', label: 'Water Bottle', emoji: '💧' },
  { value: 'PENCIL_POUCH', label: 'Pencil Pouch', emoji: '👝' },
  { value: 'OTHER', label: 'Other', emoji: '📦' },
];

const ART_CATEGORIES: { value: ArtSupplyCategory; label: string; emoji: string }[] = [
  { value: 'ACRYLIC_PAINT', label: 'Acrylic Paint', emoji: '🎨' },
  { value: 'OIL_PAINT', label: 'Oil Paint', emoji: '🎨' },
  { value: 'WATERCOLOR_PAINT', label: 'Watercolor', emoji: '💧' },
  { value: 'POSTER_PAINT', label: 'Poster Paint', emoji: '🎨' },
  { value: 'FABRIC_PAINT', label: 'Fabric Paint', emoji: '🎨' },
  { value: 'SPRAY_PAINT', label: 'Spray Paint', emoji: '🎨' },
  { value: 'BRUSH_ROUND', label: 'Round Brush', emoji: '🖌️' },
  { value: 'BRUSH_FLAT', label: 'Flat Brush', emoji: '🖌️' },
  { value: 'BRUSH_SET', label: 'Brush Set', emoji: '🖌️' },
  { value: 'CANVAS_ROLL', label: 'Canvas Roll', emoji: '🎨' },
  { value: 'CANVAS_STRETCHED', label: 'Stretched Canvas', emoji: '🖼️' },
  { value: 'DRAWING_PAPER', label: 'Drawing Paper', emoji: '📄' },
  { value: 'WATERCOLOR_PAPER', label: 'Watercolor Paper', emoji: '📄' },
  { value: 'CHARCOAL', label: 'Charcoal', emoji: '⬛' },
  { value: 'PASTEL_OIL', label: 'Oil Pastel', emoji: '🖍️' },
  { value: 'PASTEL_SOFT', label: 'Soft Pastel', emoji: '🖍️' },
  { value: 'GRAPHITE', label: 'Graphite', emoji: '✏️' },
  { value: 'CALLIGRAPHY_PEN', label: 'Calligraphy Pen', emoji: '🖋️' },
  { value: 'QALAM', label: 'Qalam', emoji: '🖋️' },
  { value: 'DAWAT', label: 'Dawat (Ink pot)', emoji: '🖋️' },
  { value: 'CLAY', label: 'Clay', emoji: '🧱' },
  { value: 'MODELING_CLAY', label: 'Modeling Clay', emoji: '🧱' },
  { value: 'EASEL', label: 'Easel', emoji: '🖼️' },
  { value: 'PALETTE', label: 'Palette', emoji: '🎨' },
  { value: 'GESSO', label: 'Gesso', emoji: '🎨' },
  { value: 'VARNISH', label: 'Varnish', emoji: '🎨' },
  { value: 'GLITTER', label: 'Glitter', emoji: '✨' },
  { value: 'ORIGAMI_PAPER', label: 'Origami Paper', emoji: '📄' },
  { value: 'OTHER', label: 'Other', emoji: '🎨' },
];

const ART_SUITABLE_FOR = [
  'Beginners', 'Students', 'Professionals', 'Kids', 'Adults',
  'Fine Art', 'Poster Making', 'Fabric Painting', 'Wall Art',
  'Calligraphy', 'Sketching', 'Watercolor Techniques', 'Oil Painting',
  'Acrylic Painting', 'Crafts', 'DIY Projects',
];

export function BookstoreWizardStep2Details({
  productType, book, stationery, art,
  onBookChange, onStationeryChange, onArtChange, onToggleAuthor, errors,
}: Props) {
  const [authorSearch, setAuthorSearch] = useState('');
  const [showAuthorPicker, setShowAuthorPicker] = useState(false);

  const { data: publishers = [] } = useQuery({
    queryKey: ['bookstore-publishers'],
    queryFn: () => publishersApi.list({ active: true }),
    enabled: productType === 'BOOK',
  });

  const { data: authors = [] } = useQuery({
    queryKey: ['bookstore-authors', authorSearch],
    queryFn: () => authorsApi.list({ search: authorSearch || undefined, active: true }),
    enabled: productType === 'BOOK' && showAuthorPicker,
  });

  const { data: selectedAuthorsData = [] } = useQuery({
    queryKey: ['bookstore-authors-selected', book.authorIds.join(',')],
    queryFn: () => authorsApi.list({}),
    enabled: productType === 'BOOK' && book.authorIds.length > 0,
  });

  const selectedAuthors = selectedAuthorsData.filter((a: any) => book.authorIds.includes(a.id));

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix before Next:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* ═══════════ BOOK DETAILS ═══════════ */}
      {productType === 'BOOK' && (
        <>
          {/* ISBN & Codes */}
          <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
            <SectionHeader icon={Hash} title="Book Identity" desc="ISBN aur publisher codes" tone="amber" />

            <div className="grid sm:grid-cols-3 gap-4">
              <Input
                label="ISBN-13"
                value={book.isbn13}
                onChange={(e) => onBookChange({ isbn13: e.target.value })}
                placeholder="9780123456789"
                hint="Modern ISBN (13 digits)"
              />
              <Input
                label="ISBN-10"
                value={book.isbn10}
                onChange={(e) => onBookChange({ isbn10: e.target.value })}
                placeholder="0123456789"
                hint="Legacy ISBN (10 digits)"
              />
              <Input
                label="Publisher Code"
                value={book.publisherBookCode}
                onChange={(e) => onBookChange({ publisherBookCode: e.target.value })}
                placeholder="STB-XI-PHY-01"
                hint="Publisher's book code"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Book Title *"
                value={book.title}
                onChange={(e) => onBookChange({ title: e.target.value })}
                placeholder="Physics for Class XI"
              />
              <Input
                label="Subtitle"
                value={book.subtitle}
                onChange={(e) => onBookChange({ subtitle: e.target.value })}
                placeholder="Comprehensive Study Guide"
              />
            </div>

            <Input
              label="Original Title (if translation)"
              value={book.originalTitle}
              onChange={(e) => onBookChange({ originalTitle: e.target.value })}
              placeholder="e.g. Original English title if this is Urdu translation"
            />
          </section>

          {/* Publisher & Authors */}
          <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
            <SectionHeader icon={User} title="Publisher & Authors" desc="Kis ne likha, kis ne publish kiya" tone="blue" />

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Publisher</label>
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-blue-500"
                value={book.publisherId}
                onChange={(e) => onBookChange({ publisherId: e.target.value })}
              >
                <option value="">Select publisher</option>
                {publishers.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.country ? `(${p.country})` : ''}
                  </option>
                ))}
              </select>
              {publishers.length === 0 && (
                <div className="mt-1 text-[10px] text-blue-700 font-semibold">
                  No publishers yet.{' '}
                  <a href="/bookstore/publishers" target="_blank" className="underline font-extrabold">
                    Add publishers →
                  </a>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-700">Authors ({selectedAuthors.length} selected)</label>
                <button
                  type="button"
                  onClick={() => setShowAuthorPicker(!showAuthorPicker)}
                  className="text-xs font-extrabold text-blue-700 hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  {showAuthorPicker ? 'Hide' : 'Add Author'}
                </button>
              </div>

              {selectedAuthors.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {selectedAuthors.map((a: any) => (
                    <span key={a.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 border-2 border-blue-300 text-blue-800 text-xs font-extrabold">
                      <User className="h-3 w-3" />
                      {a.name}
                      {a.penName && <span className="text-blue-600">({a.penName})</span>}
                      <button
                        type="button"
                        onClick={() => onToggleAuthor(a.id)}
                        className="ml-1 hover:text-rose-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {showAuthorPicker && (
                <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-3 space-y-2">
                  <div className="relative">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      autoFocus
                      value={authorSearch}
                      onChange={(e) => setAuthorSearch(e.target.value)}
                      placeholder="Search authors..."
                      className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto rounded-lg bg-white border border-blue-200">
                    {authors.length === 0 ? (
                      <div className="p-4 text-xs text-slate-500 font-semibold italic text-center">
                        No authors found.{' '}
                        <a href="/bookstore/authors" target="_blank" className="text-blue-700 underline font-extrabold">
                          Add author →
                        </a>
                      </div>
                    ) : (
                      authors.map((a: any) => {
                        const selected = book.authorIds.includes(a.id);
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => onToggleAuthor(a.id)}
                            className={[
                              'w-full px-3 py-2 flex items-center gap-3 transition text-left border-b border-slate-100 last:border-0',
                              selected ? 'bg-blue-100 hover:bg-blue-200' : 'hover:bg-blue-50',
                            ].join(' ')}
                          >
                            {a.photoUrl ? (
                              <img src={a.photoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-extrabold">
                                {a.name.charAt(0)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-extrabold text-sm truncate text-slate-900">
                                {a.name}
                                {a.penName && <span className="text-slate-500 font-semibold ml-1">"{a.penName}"</span>}
                              </div>
                              {a.nationality && (
                                <div className="text-[10px] text-slate-500 font-semibold">{a.nationality}</div>
                              )}
                            </div>
                            {selected && <Check className="h-4 w-4 text-blue-600" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Category & Binding */}
          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHeader icon={BookOpen} title="Category & Format" desc="Book type aur binding style" />

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Book Category</label>
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-amber-500"
                value={book.category}
                onChange={(e) => onBookChange({ category: e.target.value as BookCategory })}
              >
                {BOOK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Binding</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {BINDINGS.map((b) => {
                  const active = book.binding === b.value;
                  return (
                    <button
                      key={b.value} type="button"
                      onClick={() => onBookChange({ binding: b.value })}
                      className={[
                        'p-2 rounded-xl border-2 text-center transition',
                        active ? 'border-amber-600 bg-amber-600 text-white shadow'
                          : 'border-slate-200 bg-white hover:border-amber-400',
                      ].join(' ')}
                    >
                      <div className="text-2xl mb-1">{b.emoji}</div>
                      <div className="text-[10px] font-extrabold">{b.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Condition</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {CONDITIONS.map((c) => {
                  const active = book.condition === c.value;
                  return (
                    <button
                      key={c.value} type="button"
                      onClick={() => onBookChange({ condition: c.value })}
                      className={[
                        'py-2 rounded-lg text-xs font-extrabold transition border-2',
                        active ? `bg-${c.color}-600 text-white border-${c.color}-600 shadow`
                          : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300',
                      ].join(' ')}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Edition & Publication */}
          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHeader icon={Calendar} title="Edition & Publication" desc="Which edition, year, pages" />

            <div className="grid sm:grid-cols-4 gap-4">
              <Input
                label="Edition Name"
                value={book.edition}
                onChange={(e) => onBookChange({ edition: e.target.value })}
                placeholder="First / 2024 Ed."
              />
              <Input
                label="Edition #"
                type="number"
                value={book.editionNumber}
                onChange={(e) => onBookChange({ editionNumber: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="1"
              />
              <Input
                label="Publish Year"
                type="number"
                value={book.publishYear}
                onChange={(e) => onBookChange({ publishYear: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="2024"
              />
              <Input
                label="Reprint Year"
                type="number"
                value={book.reprintYear}
                onChange={(e) => onBookChange({ reprintYear: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="Optional"
              />
            </div>

            <div className="grid sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Language</label>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-amber-500"
                  value={book.language}
                  onChange={(e) => onBookChange({ language: e.target.value })}
                >
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <Input
                label="Page Count"
                type="number"
                value={book.pageCount}
                onChange={(e) => onBookChange({ pageCount: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="200"
              />
              <Input
                label="Weight (grams)"
                type="number"
                value={book.weightGrams}
                onChange={(e) => onBookChange({ weightGrams: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="500"
              />
              <Input
                label="Dimensions"
                value={book.dimensions}
                onChange={(e) => onBookChange({ dimensions: e.target.value })}
                placeholder="9x6 inch"
              />
            </div>

            <Input
              label="Paper Quality"
              value={book.paperQuality}
              onChange={(e) => onBookChange({ paperQuality: e.target.value })}
              placeholder="Art paper / Book paper / Newsprint"
            />
          </section>

          {/* Synopsis */}
          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
            <SectionHeader icon={Info} title="Book Content" desc="Synopsis aur table of contents" />

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Synopsis / Brief Description</label>
              <textarea
                rows={3}
                value={book.synopsis}
                onChange={(e) => onBookChange({ synopsis: e.target.value })}
                placeholder="Kya hai is kitaab mein, kis ke liye hai..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Table of Contents</label>
              <textarea
                rows={4}
                value={book.tableOfContents}
                onChange={(e) => onBookChange({ tableOfContents: e.target.value })}
                placeholder="Chapter 1: Introduction&#10;Chapter 2: ..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500"
              />
            </div>
          </section>
        </>
      )}

      {/* ═══════════ STATIONERY DETAILS ═══════════ */}
      {productType === 'STATIONERY' && (
        <>
          <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
            <SectionHeader icon={Sparkles} title="Stationery Category" desc="Kya type ki cheez hai" tone="blue" />

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Choose Category</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-h-96 overflow-y-auto pr-1">
                {STATIONERY_CATEGORIES.map((c) => {
                  const active = stationery.category === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => onStationeryChange({ category: c.value })}
                      className={[
                        'p-2 rounded-xl border-2 text-center transition',
                        active ? 'border-blue-600 bg-blue-600 text-white shadow'
                          : 'border-slate-200 bg-white hover:border-blue-400',
                      ].join(' ')}
                    >
                      <div className="text-2xl">{c.emoji}</div>
                      <div className="text-[10px] font-extrabold mt-0.5 leading-tight">{c.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Sub-Category"
                value={stationery.subCategory}
                onChange={(e) => onStationeryChange({ subCategory: e.target.value })}
                placeholder="More specific type"
              />
              <Input
                label="Brand"
                value={stationery.brand}
                onChange={(e) => onStationeryChange({ brand: e.target.value })}
                placeholder="Dollar, Piano, Faber-Castell"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Color"
                value={stationery.color}
                onChange={(e) => onStationeryChange({ color: e.target.value })}
                placeholder="Blue / Black / Red"
              />
              <Input
                label="Size"
                value={stationery.size}
                onChange={(e) => onStationeryChange({ size: e.target.value })}
                placeholder="A4 / Small / Large"
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <Input
                label="Material"
                value={stationery.material}
                onChange={(e) => onStationeryChange({ material: e.target.value })}
                placeholder="Plastic / Metal / Paper"
              />
              <Input
                label="Weight (g)"
                type="number"
                value={stationery.weight}
                onChange={(e) => onStationeryChange({ weight: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="Optional"
              />
              <Input
                label="Dimensions"
                value={stationery.dimensions}
                onChange={(e) => onStationeryChange({ dimensions: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </section>

          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHeader icon={Layers} title="Pack Details" desc="Agar pack mein aata hai" />

            <div className="grid sm:grid-cols-3 gap-4">
              <Input
                label="Pack Size"
                type="number"
                value={stationery.packSize}
                onChange={(e) => onStationeryChange({ packSize: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="10 pens / pack"
              />
              <Input
                label="Pack Unit"
                value={stationery.packUnit}
                onChange={(e) => onStationeryChange({ packUnit: e.target.value })}
                placeholder="pcs / boxes"
              />
              <Input
                label="Items per Pack"
                type="number"
                value={stationery.itemsPerPack}
                onChange={(e) => onStationeryChange({ itemsPerPack: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="Total units"
              />
            </div>

            <Input
              label="Reorder Level"
              type="number"
              value={stationery.reorderLevel}
              onChange={(e) => onStationeryChange({ reorderLevel: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="10"
              hint="Auto-reorder threshold"
            />
          </section>
        </>
      )}

      {/* ═══════════ ART SUPPLY DETAILS ═══════════ */}
      {productType === 'ART_SUPPLY' && (
        <>
          <section className="rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-white p-5 space-y-4">
            <SectionHeader icon={Palette} title="Art Supply Category" desc="Kis type ka art item hai" tone="pink" />

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Choose Category</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-h-96 overflow-y-auto pr-1">
                {ART_CATEGORIES.map((c) => {
                  const active = art.category === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => onArtChange({ category: c.value })}
                      className={[
                        'p-2 rounded-xl border-2 text-center transition',
                        active ? 'border-pink-600 bg-pink-600 text-white shadow'
                          : 'border-slate-200 bg-white hover:border-pink-400',
                      ].join(' ')}
                    >
                      <div className="text-2xl">{c.emoji}</div>
                      <div className="text-[10px] font-extrabold mt-0.5 leading-tight">{c.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Sub-Category"
                value={art.subCategory}
                onChange={(e) => onArtChange({ subCategory: e.target.value })}
                placeholder="More specific"
              />
              <Input
                label="Brand"
                value={art.brand}
                onChange={(e) => onArtChange({ brand: e.target.value })}
                placeholder="Camel / Faber-Castell / Camlin"
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <Input
                label="Color Name"
                value={art.color}
                onChange={(e) => onArtChange({ color: e.target.value })}
                placeholder="Cadmium Red"
              />
              <Input
                label="Color Code"
                value={art.colorCode}
                onChange={(e) => onArtChange({ colorCode: e.target.value })}
                placeholder="#FF0000 or Code"
              />
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Grade / Quality</label>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-pink-500"
                  value={art.grade}
                  onChange={(e) => onArtChange({ grade: e.target.value })}
                >
                  <option value="">Select grade</option>
                  <option value="Student">Student Grade</option>
                  <option value="Artist">Artist Grade</option>
                  <option value="Professional">Professional Grade</option>
                  <option value="Master">Master Grade</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <Input
                label="Size"
                value={art.size}
                onChange={(e) => onArtChange({ size: e.target.value })}
                placeholder="12x18 inch / #10"
              />
              <Input
                label="Volume"
                value={art.volume}
                onChange={(e) => onArtChange({ volume: e.target.value })}
                placeholder="100ml / 250g"
              />
              <Input
                label="Weight (g)"
                type="number"
                value={art.weight}
                onChange={(e) => onArtChange({ weight: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="Optional"
              />
            </div>

            <Input
              label="Dimensions"
              value={art.dimensions}
              onChange={(e) => onArtChange({ dimensions: e.target.value })}
              placeholder="Physical dimensions"
            />

            <Input
              label="Reorder Level"
              type="number"
              value={art.reorderLevel}
              onChange={(e) => onArtChange({ reorderLevel: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="5"
              hint="Auto-reorder threshold"
            />
          </section>
        </>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc, tone = 'slate' }: any) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-orange-700',
    blue: 'from-blue-500 to-blue-700',
    pink: 'from-pink-500 to-rose-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
      <div className={['h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-md bg-gradient-to-br',
        tones[tone] ?? tones.slate].join(' ')}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 text-base leading-tight">{title}</h3>
        <p className="text-xs text-slate-500 font-semibold">{desc}</p>
      </div>
    </div>
  );
}
