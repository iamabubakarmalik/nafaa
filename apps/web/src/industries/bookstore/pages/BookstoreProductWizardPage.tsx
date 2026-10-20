/**
 * Bookstore item editor on the shared product editor. A book carries its
 * ISBN, authors, publisher, edition and (for textbooks) class, subject and
 * board; stationery and art carry their type and brand. Loose and pack sale
 * (piece and dozen) come from the shared Price step, sizes from variants.
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, Building2, GraduationCap, Palette, Pencil, Plus, ScanLine, Timer, Users } from 'lucide-react';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Toggle, inputClass } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, Errors, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { bookProfilesApi } from '../api/book-profiles.api';
import { stationeryProfilesApi } from '../api/stationery-profiles.api';
import { artSupplyProfilesApi } from '../api/art-supply-profiles.api';
import { authorsApi } from '../api/authors.api';
import { publishersApi } from '../api/publishers.api';
import {
  ART_CATEGORIES, BINDINGS, BOARDS, BOOK_CATEGORIES, CONDITIONS, GRADES, KEYS, KINDS, LANGUAGES, STATIONERY_CATEGORIES, SUBJECTS,
  apiError, type ItemKind,
} from '../lib/meta';

export interface BookExtra {
  kind: ItemKind;
  isbn13: string; isbn10: string; authorIds: string[]; publisherId: string; edition: string; publishYear: number | null;
  language: string; category: string; binding: string; condition: string;
  isTextbook: boolean; grade: string; subject: string; board: string;
  isRentable: boolean; rentalPricePerWeek: number | null; rentalDeposit: number | null;
  typeCategory: string; brand: string; color: string; size: string; isSchoolItem: boolean;
}

const initial: BookExtra = {
  kind: 'BOOK', isbn13: '', isbn10: '', authorIds: [], publisherId: '', edition: '', publishYear: null, language: 'English',
  category: 'TEXTBOOK', binding: 'PAPERBACK', condition: 'NEW', isTextbook: true, grade: '', subject: '', board: '',
  isRentable: false, rentalPricePerWeek: null, rentalDeposit: null,
  typeCategory: '', brand: '', color: '', size: '', isSchoolItem: true,
};

const opt = (v: string) => v.trim() || undefined;
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);
const isbnDigits = (v: string) => v.replace(/[^\dXx]/g, '').toUpperCase();

/** ISBN-13 or ISBN-10 check digit. */
function isbnValid(v: string): boolean {
  const s = isbnDigits(v);
  if (s.length === 13 && /^\d{13}$/.test(s)) {
    const sum = s.split('').reduce((t, c, i) => t + Number(c) * (i % 2 ? 3 : 1), 0);
    return sum % 10 === 0;
  }
  if (s.length === 10 && /^\d{9}[\dX]$/.test(s)) {
    const sum = s.split('').reduce((t, c, i) => t + (c === 'X' ? 10 : Number(c)) * (10 - i), 0);
    return sum % 11 === 0;
  }
  return false;
}

/* ── Basic step addition: what the item is ── */
function Kind({ ctx }: { ctx: StepContext<BookExtra> }) {
  const x = ctx.draft.extra;
  return (
    <div>
      <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Ye kya hai?</span>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {KINDS.map((k) => (
          <button key={k.value} type="button" aria-pressed={x.kind === k.value} onClick={() => ctx.setExtra({ kind: k.value, typeCategory: '' })}
            className={`rounded-xl px-3 py-2 text-left ring-1 transition ${x.kind === k.value ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'}`}>
            <span className="block text-[0.875rem] font-semibold">{k.label}</span>
            <span className={`block text-[0.6875rem] ${x.kind === k.value ? 'text-white/80' : 'text-slate-500'}`}>{k.hint}</span>
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[0.75rem] text-slate-500">Isi se agla step ISBN aur author poochta hai, ya stationery ka type aur brand.</p>
    </div>
  );
}

/* ── Details step ── */
function Details({ ctx }: { ctx: StepContext<BookExtra> }) {
  const x = ctx.draft.extra;
  if (x.kind === 'BOOK') return <BookDetails ctx={ctx} />;
  if (x.kind === 'OTHER') {
    return (
      <Section icon={Pencil} title="Aur maal" hint="Uniform, bag, gift item — size ya rang alag ho to Stock step me variant banayein">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Brand / banane wala" value={x.brand} onChange={(brand) => ctx.setExtra({ brand })} placeholder="Jaise: school ka naam" />
        </div>
      </Section>
    );
  }
  const list = x.kind === 'STATIONERY' ? STATIONERY_CATEGORIES : ART_CATEGORIES;
  return (
    <Section icon={x.kind === 'ART' ? Palette : Pencil} title={x.kind === 'ART' ? 'Art ka saman' : 'Stationery'} hint="Type aur brand se products page aur POS par dhoondna aasaan hai">
      <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Type</span>
      <div className="flex flex-wrap gap-1.5">
        {list.map(([v, l]) => <Chip key={v} on={x.typeCategory === v} onClick={() => ctx.setExtra({ typeCategory: x.typeCategory === v ? '' : v })}>{l}</Chip>)}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <TextField label="Brand" value={x.brand} onChange={(brand) => ctx.setExtra({ brand })} placeholder={x.kind === 'ART' ? 'Pelikan, Faber-Castell' : 'Dollar, Piano, Oxford'} />
        <TextField label="Rang" value={x.color} onChange={(color) => ctx.setExtra({ color })} placeholder="Blue, Black" />
        <TextField label="Size" value={x.size} onChange={(size) => ctx.setExtra({ size })} placeholder="A4, 200 pages, 12 colors" />
      </div>
      {x.kind === 'STATIONERY' && (
        <div className="mt-3"><Toggle on={x.isSchoolItem} onChange={(isSchoolItem) => ctx.setExtra({ isSchoolItem })} icon={GraduationCap} title="School ka saman" hint="School list banate waqt upar aata hai" /></div>
      )}
    </Section>
  );
}

function BookDetails({ ctx }: { ctx: StepContext<BookExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const qc = useQueryClient();
  const authorsQ = useQuery({ queryKey: [KEYS.authors, 'active'], queryFn: () => authorsApi.list({ active: 'true' }), staleTime: 60_000 });
  const pubsQ = useQuery({ queryKey: [KEYS.publishers, 'active'], queryFn: () => publishersApi.list({ active: true }), staleTime: 60_000 });
  const [authorQ, setAuthorQ] = useState('');
  const [adding, setAdding] = useState<'author' | 'publisher' | null>(null);
  const authors = authorsQ.data ?? [];
  const shown = authors.filter((a) => x.authorIds.includes(a.id) || (authorQ && a.name.toLowerCase().includes(authorQ.toLowerCase()))).slice(0, 12);
  const exact = authors.some((a) => a.name.toLowerCase() === authorQ.trim().toLowerCase());

  const addAuthor = async () => {
    const name = authorQ.trim();
    if (!name) return;
    setAdding('author');
    try {
      const a = await authorsApi.create({ name });
      await qc.invalidateQueries({ queryKey: [KEYS.authors] });
      set({ authorIds: [...x.authorIds, a.id] });
      setAuthorQ('');
    } catch (e) { toast.error(apiError(e, 'Author nahi bana')); } finally { setAdding(null); }
  };
  const [pubName, setPubName] = useState('');
  const addPublisher = async () => {
    const name = pubName.trim();
    if (!name) return;
    setAdding('publisher');
    try {
      const p = await publishersApi.create({ name });
      await qc.invalidateQueries({ queryKey: [KEYS.publishers] });
      set({ publisherId: p.id });
      setPubName('');
    } catch (e) { toast.error(apiError(e, 'Publisher nahi bana')); } finally { setAdding(null); }
  };

  return (
    <div className="space-y-4">
      <Section icon={ScanLine} title="ISBN" hint="Kitab ki pusht par barcode ke neeche likha number — scan karne se yahi kitab milti hai">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="ISBN-13" value={x.isbn13} onChange={(v) => set({ isbn13: isbnDigits(v).slice(0, 13) })} onBlur={() => ctx.touch('isbn')} error={ctx.errors.isbn} placeholder="978…" />
          <TextField label="ISBN-10 (purani kitab)" value={x.isbn10} onChange={(v) => set({ isbn10: isbnDigits(v).slice(0, 10) })} onBlur={() => ctx.touch('isbn')} placeholder="Marzi hai" />
        </div>
      </Section>

      <Section icon={Users} title="Author aur publisher" hint="Customer aksar author ya publisher ke naam se maangta hai">
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Author</span>
        <div className="flex gap-2">
          <input value={authorQ} onChange={(e) => setAuthorQ(e.target.value)} placeholder="Naam likh kar chunein ya naya banayein" className={inputClass}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (!exact) void addAuthor(); } }} />
          {authorQ.trim() && !exact && (
            <button type="button" onClick={() => void addAuthor()} disabled={adding === 'author'} className="inline-flex h-11 shrink-0 items-center gap-1 rounded-xl px-3 text-[0.8125rem] font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50">
              <Plus className="h-4 w-4" />Naya
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {shown.map((a) => (
            <Chip key={a.id} on={x.authorIds.includes(a.id)} onClick={() => set({ authorIds: x.authorIds.includes(a.id) ? x.authorIds.filter((i) => i !== a.id) : [...x.authorIds, a.id] })}>{a.name}</Chip>
          ))}
          {!shown.length && <span className="text-[0.75rem] text-slate-500">{authors.length ? 'Naam likhein — milte-julte author yahan aayenge' : 'Abhi koi author nahi — naam likh kar "Naya" dabayein'}</span>}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Publisher</span>
            <select value={x.publisherId} onChange={(e) => set({ publisherId: e.target.value })} className={inputClass}>
              <option value="">{pubsQ.isLoading ? 'Load ho raha…' : 'Chunein'}</option>
              {(pubsQ.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}{p.city ? ` — ${p.city}` : ''}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <input value={pubName} onChange={(e) => setPubName(e.target.value)} placeholder="Naya publisher" className={`${inputClass} sm:w-48`} />
            <button type="button" onClick={() => void addPublisher()} disabled={!pubName.trim() || adding === 'publisher'} aria-label="Publisher banayein"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50 disabled:opacity-40"><Building2 className="h-4 w-4" /></button>
          </div>
        </div>
      </Section>

      <Section icon={BookOpen} title="Edition aur zubaan" hint="Naya edition aaye to purana alag item rakhein — rate aur stock alag rehta hai">
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Edition" value={x.edition} onChange={(edition) => set({ edition })} placeholder="3rd, 2026" />
          <NumberField label="Saal" allowEmpty value={x.publishYear} onChange={(publishYear) => set({ publishYear: publishYear == null ? null : Math.round(publishYear) })} placeholder="2026" error={ctx.errors.year} />
          <label className="block">
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Zubaan</span>
            <select value={x.language} onChange={(e) => set({ language: e.target.value })} className={inputClass}>{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</select>
          </label>
        </div>
        <span className="mb-1.5 mt-3 block text-[0.8125rem] font-medium text-slate-700">Kitab ki type</span>
        <div className="flex flex-wrap gap-1.5">
          {BOOK_CATEGORIES.map(([v, l]) => <Chip key={v} on={x.category === v} onClick={() => set({ category: v, isTextbook: ['TEXTBOOK', 'GUIDE', 'WORKBOOK', 'EXAM_PREP'].includes(v) ? true : x.isTextbook })}>{l}</Chip>)}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {BINDINGS.map(([v, l]) => <Chip key={v} on={x.binding === v} onClick={() => set({ binding: v })}>{l}</Chip>)}
          <span className="mx-1 w-px bg-slate-200" />
          {CONDITIONS.map(([v, l]) => <Chip key={v} on={x.condition === v} onClick={() => set({ condition: v })}>{l}</Chip>)}
        </div>
      </Section>

      <Section icon={GraduationCap} title="School ki kitab" hint="Class aur subject se School list me khud milti hai">
        <Toggle on={x.isTextbook} onChange={(isTextbook) => set({ isTextbook })} icon={GraduationCap} title="Ye school / college ki kitab hai" hint="Textbook, guide, workbook" />
        {x.isTextbook && (
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField label="Class" value={x.grade} onChange={(grade) => set({ grade })} placeholder="Class 5" error={ctx.errors.grade} />
              <TextField label="Subject" value={x.subject} onChange={(subject) => set({ subject })} placeholder="English" />
              <TextField label="Board" value={x.board} onChange={(board) => set({ board })} placeholder="Punjab Board" />
            </div>
            <div className="flex flex-wrap gap-1.5">{GRADES.map((g) => <Chip key={g} on={x.grade === g} onClick={() => set({ grade: x.grade === g ? '' : g })}>{g}</Chip>)}</div>
            <div className="flex flex-wrap gap-1.5">{SUBJECTS.map((g) => <Chip key={g} on={x.subject === g} onClick={() => set({ subject: x.subject === g ? '' : g })}>{g}</Chip>)}</div>
            <div className="flex flex-wrap gap-1.5">{BOARDS.map((g) => <Chip key={g} on={x.board === g} onClick={() => set({ board: x.board === g ? '' : g })}>{g}</Chip>)}</div>
          </div>
        )}
      </Section>
    </div>
  );
}

/* ── Price step addition: rental terms ── */
function Rental({ ctx }: { ctx: StepContext<BookExtra> }) {
  const x = ctx.draft.extra;
  if (x.kind !== 'BOOK') return null;
  return (
    <Section icon={Timer} title="Kiraye par" hint="Novel aur reference kitab kiraye par dene wali dukaan ke liye">
      <Toggle on={x.isRentable} onChange={(isRentable) => ctx.setExtra({ isRentable })} icon={Timer} title="Ye kitab kiraye par bhi di jati hai" />
      {x.isRentable && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <NumberField label="Kiraya (ek hafta)" prefix="Rs" allowEmpty value={x.rentalPricePerWeek} onChange={(rentalPricePerWeek) => ctx.setExtra({ rentalPricePerWeek })} error={ctx.errors.rental} />
          <NumberField label="Deposit (wapas hota hai)" prefix="Rs" allowEmpty value={x.rentalDeposit} onChange={(rentalDeposit) => ctx.setExtra({ rentalDeposit })} hint="Kitab wapas aane par lauta diya jata hai" />
        </div>
      )}
    </Section>
  );
}

const core: CoreOptions = {
  units: [
    { value: 'pcs', label: 'Piece / kitab' }, { value: 'set', label: 'Set' }, { value: 'pack', label: 'Pack' },
    { value: 'dozen', label: 'Dozen' }, { value: 'box', label: 'Box' }, { value: 'ream', label: 'Ream' },
  ],
  skuPrefix: 'BK',
  packs: true,
  variants: { presets: [
    { group: 'Uniform size', values: ['20', '22', '24', '26', '28', '30', '32', '34', 'S', 'M', 'L', 'XL'] },
    { group: 'Rang', values: ['Blue', 'Black', 'Red', 'Green'] },
    { group: 'Pages', values: ['80 pages', '100 pages', '200 pages', '300 pages'] },
  ] },
  batches: false,
  markups: [10, 15, 20, 25],
};

const detailsStep: StepDef<BookExtra> = {
  id: 'details', title: 'Tafseel', hint: 'ISBN, author, class', icon: BookOpen,
  render: (ctx) => <Details ctx={ctx} />,
  validate: (d) => {
    const x = d.extra;
    const e: Errors = {};
    if (x.kind !== 'BOOK') return e;
    if (x.isbn13 && !isbnValid(x.isbn13)) e.isbn = 'ISBN-13 ke 13 number sahi nahi — dobara dekhein';
    else if (x.isbn10 && !isbnValid(x.isbn10)) e.isbn = 'ISBN-10 sahi nahi';
    if (x.publishYear != null && (x.publishYear < 1800 || x.publishYear > new Date().getFullYear() + 1)) e.year = 'Saal sahi likhein';
    if (x.isTextbook && !x.grade.trim()) e.grade = 'Class likhein (jaise Class 5)';
    return e;
  },
};

const config: EditorConfig<BookExtra> = {
  label: 'Bookstore',
  draftKey: 'nafaa.product-editor.bookstore',
  paths: { list: '/products', detail: (id) => `/bookstore-products/${id}`, create: '/bookstore-products/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const [b, s, a] = await Promise.all([
        bookProfilesApi.byProduct(productId).catch(() => null),
        stationeryProfilesApi.byProduct(productId).catch(() => null),
        artSupplyProfilesApi.byProduct(productId).catch(() => null),
      ]);
      if (b) return {
        kind: 'BOOK', isbn13: b.isbn13 ?? '', isbn10: b.isbn10 ?? '', authorIds: (b.bookAuthors ?? []).map((x: { authorId: string }) => x.authorId),
        publisherId: b.publisherId ?? '', edition: b.edition ?? '', publishYear: b.publishYear ?? null, language: b.language || 'English',
        category: b.category, binding: b.binding, condition: b.condition, isTextbook: b.isTextbook, grade: b.grade ?? '', subject: b.subject ?? '',
        board: b.board ?? '', isRentable: b.isRentable, rentalPricePerWeek: b.rentalPricePerWeek || null, rentalDeposit: b.rentalDeposit || null,
      };
      if (s) return { kind: 'STATIONERY', typeCategory: s.category, brand: s.brand ?? '', color: s.color ?? '', size: s.size ?? '', isSchoolItem: s.isSchoolItem };
      if (a) return { kind: 'ART', typeCategory: a.category, brand: a.brand ?? '', color: a.color ?? '', size: a.size ?? '' };
      return { kind: 'OTHER' };
    },
    // A book with no barcode of its own sells by its ISBN.
    product: (d, payload) => (d.extra.kind === 'BOOK' && !String(payload.barcode ?? '').trim() && (d.extra.isbn13 || d.extra.isbn10)
      ? { ...payload, barcode: d.extra.isbn13 || d.extra.isbn10 } : payload),
    save: async (productId, d) => {
      const x = d.extra;
      if (x.kind === 'BOOK') {
        const body = {
          productId, title: d.core.name.trim(), isbn13: opt(x.isbn13), isbn10: opt(x.isbn10), publisherId: opt(x.publisherId),
          edition: opt(x.edition), publishYear: num(x.publishYear), language: x.language, category: x.category, binding: x.binding, condition: x.condition,
          isTextbook: x.isTextbook, grade: x.isTextbook ? opt(x.grade) : undefined, subject: x.isTextbook ? opt(x.subject) : undefined,
          board: x.isTextbook ? opt(x.board) : undefined, isRentable: x.isRentable,
          rentalPricePerWeek: x.isRentable ? num(x.rentalPricePerWeek) ?? 0 : 0, rentalDeposit: x.isRentable ? num(x.rentalDeposit) ?? 0 : 0,
          mrp: num(d.core.price), authors: x.authorIds.map((authorId, i) => ({ authorId, displayOrder: i })),
        };
        await bookProfilesApi.upsert(Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)));
      } else if (x.kind === 'STATIONERY') {
        await stationeryProfilesApi.upsert({ productId, category: x.typeCategory || 'OTHER', brand: opt(x.brand), color: opt(x.color), size: opt(x.size), isSchoolItem: x.isSchoolItem });
      } else if (x.kind === 'ART') {
        await artSupplyProfilesApi.upsert({ productId, category: x.typeCategory || 'OTHER', brand: opt(x.brand), color: opt(x.color), size: opt(x.size) });
      }
    },
  },
  steps: [
    basicStep<BookExtra>(core, {
      extra: (ctx) => <Kind ctx={ctx} />,
      namePlaceholder: 'Jaise: Oxford English Class 5 ya Dollar Ball Pen',
      categorySuggestions: ['Textbooks', 'Guides', 'Novels', 'Islamic', 'Stationery', 'Copies', 'Art', 'Uniform', 'Bags'],
    }),
    detailsStep,
    priceStep<BookExtra>(core, { extra: (ctx) => <Rental ctx={ctx} /> }),
    stockStep<BookExtra>(core, { quick: [5, 10, 25, 50, 100, 500] }),
  ].map((s): StepDef<BookExtra> => (s.id === 'price' ? { ...s, validate: (d, e) => ({ ...s.validate?.(d, e), ...rentalErrors(d.extra) }) } : s)),
  summary: (d) => {
    const x = d.extra;
    const facts = x.kind === 'BOOK'
      ? [x.isbn13 || x.isbn10, x.edition && `${x.edition} ed`, x.isTextbook && [x.grade, x.subject].filter(Boolean).join(' '), x.isRentable && 'Kiraye par']
      : [KINDS.find((k) => k.value === x.kind)?.label, x.brand, x.size];
    const line = facts.filter(Boolean).join(' · ');
    return line ? <p className="mt-3 border-t border-slate-100 pt-3 text-[0.8125rem] text-slate-700">{line}</p> : null;
  },
  refresh: [KEYS.facts, KEYS.books, 'bookstore-product-detail'],
  guide: [
    { icon: ScanLine, color: '#0891b2', title: 'ISBN', text: 'ISBN likhein ya scan karein. Kitab ka apna barcode na ho to ISBN hi barcode ban jata hai.' },
    { icon: GraduationCap, color: '#7c3aed', title: 'Class aur subject', text: 'Textbook par class aur subject likhein — School list me kitab dhoondna aur set banana aasaan hota hai.' },
    { icon: Pencil, color: '#16a34a', title: 'Dozen aur pack', text: 'Copy aur pencil piece me rakhein; Price step me Dozen (12) ya Pack jorein. Stock piece me ginta hai.' },
  ],
};

function rentalErrors(x: BookExtra): Errors {
  if (x.kind !== 'BOOK' || !x.isRentable) return {};
  if (!(Number(x.rentalPricePerWeek) > 0)) return { rental: 'Hafte ka kiraya likhein' };
  return {};
}

export default function BookstoreProductEditor() {
  return <ProductEditorPage config={config} />;
}
