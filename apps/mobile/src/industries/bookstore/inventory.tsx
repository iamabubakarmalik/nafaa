/**
 * Bookstore items through the shared products list, editor and detail (web
 * BookstoreProducts, BookstoreProductWizardPage, BookstoreProductDetailPage):
 * books with ISBN, authors, publisher, edition and class; stationery and art
 * by type and brand; rentable books with weekly rate and deposit. A scanned
 * ISBN that is only on a book's details still opens the book.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Building2, ClipboardList, GraduationCap, Plus, ScanLine, Timer, Pencil } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { isbnDigits, isbnValid } from '@nafaa/core/industries/bookstore';
import { msg, t } from '@/core/i18n';
import { ChipGroup, FormSection, IconButton, Input, MoneyInput, Select, Switch, Text, toast } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import type { Errors } from '@/modules/inventory/screens/editor/types';
import { errorText } from '../_shared/deskKit';
import { artApi, authorsApi, bookProfilesApi, publishersApi, stationeryApi, type BookFact } from './api';
import { ART_CATEGORIES, BINDINGS, BOARDS, BOOK_CATEGORIES, CONDITIONS, GRADES, KEYS, KINDS, LANGUAGES, STATIONERY_CATEGORIES, SUBJECTS, factLine, isbnOf, labelOf, type ItemKind } from './meta';

interface BookExtra {
  kind: ItemKind;
  isbn13: string; isbn10: string; authorIds: string[]; publisherId: string; edition: string; publishYear: number | null;
  language: string; category: string; binding: string; condition: string; isTextbook: boolean; grade: string; subject: string; board: string;
  isRentable: boolean; rentalPricePerWeek: number | null; rentalDeposit: number | null;
  typeCategory: string; brand: string; color: string; size: string; isSchoolItem: boolean;
}
const initial: BookExtra = {
  kind: 'BOOK', isbn13: '', isbn10: '', authorIds: [], publisherId: '', edition: '', publishYear: null, language: 'English', category: 'TEXTBOOK', binding: 'PAPERBACK', condition: 'NEW',
  isTextbook: true, grade: '', subject: '', board: '', isRentable: false, rentalPricePerWeek: null, rentalDeposit: null, typeCategory: '', brand: '', color: '', size: '', isSchoolItem: true,
};
const opt = (v: string) => v.trim() || undefined;
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);
const pick = (cur: string, v: string) => (cur === v ? '' : v);
const pairs = (list: Array<[string, string]>) => list.map(([value, label]) => ({ value, label: t(label) }));

function Kind({ ctx }: { ctx: StepContext<BookExtra> }) {
  const x = ctx.draft.extra;
  return (
    <FormSection title={t('Ye kya hai?')} description={t('Isi se agla step ISBN aur author poochta hai, ya stationery ka type aur brand.')}>
      <ChipGroup value={x.kind} onChange={(v) => ctx.setExtra({ kind: v as ItemKind, typeCategory: '' })} options={KINDS.map((k) => ({ value: k.value, label: `${t(k.label)}` }))} />
      <Text size="xs" tone="muted">{t(KINDS.find((k) => k.value === x.kind)?.hint ?? '')}</Text>
    </FormSection>
  );
}

function BookDetails({ ctx }: { ctx: StepContext<BookExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const qc = useQueryClient();
  const authors = useQuery({ queryKey: [KEYS.authors, 'active'], queryFn: () => authorsApi.list({ active: 'true' }), staleTime: 60_000 });
  const pubs = useQuery({ queryKey: [KEYS.publishers, 'active'], queryFn: () => publishersApi.list({ active: true }), staleTime: 60_000 });
  const [authorQ, setAuthorQ] = useState('');
  const [pubName, setPubName] = useState('');
  const all = authors.data ?? [];
  const shown = all.filter((a) => x.authorIds.includes(a.id) || (authorQ && a.name.toLowerCase().includes(authorQ.toLowerCase()))).slice(0, 12);
  const exact = all.some((a) => a.name.toLowerCase() === authorQ.trim().toLowerCase());
  const addAuthor = async () => {
    const name = authorQ.trim();
    if (!name) return;
    try { const a = await authorsApi.create({ name }); await qc.invalidateQueries({ queryKey: [KEYS.authors] }); set({ authorIds: [...x.authorIds, a.id] }); setAuthorQ(''); } catch (e) { toast.error(errorText(e, t('Author nahi bana'))); }
  };
  const addPublisher = async () => {
    const name = pubName.trim();
    if (!name) return;
    try { const p = await publishersApi.create({ name }); await qc.invalidateQueries({ queryKey: [KEYS.publishers] }); set({ publisherId: p.id }); setPubName(''); } catch (e) { toast.error(errorText(e, t('Publisher nahi bana'))); }
  };
  return (
    <View style={{ gap: 16 }}>
      <FormSection title={t('ISBN')} description={t('Kitab ki pusht par barcode ke neeche likha number — scan karne se yahi kitab milti hai')}>
        <Input label={t('ISBN-13')} ltr keyboardType="number-pad" value={x.isbn13} onChangeText={(v) => set({ isbn13: isbnDigits(v).slice(0, 13) })} error={ctx.errors.isbn} placeholder="978…" />
        <Input label={t('ISBN-10 (purani kitab)')} ltr value={x.isbn10} onChangeText={(v) => set({ isbn10: isbnDigits(v).slice(0, 10) })} placeholder={t('Marzi hai')} />
      </FormSection>
      <FormSection title={t('Author aur publisher')} description={t('Customer aksar author ya publisher ke naam se maangta hai')}>
        <Input label={t('Author')} value={authorQ} onChangeText={setAuthorQ} placeholder={t('Naam likh kar chunein ya naya banayein')}
          trailing={authorQ.trim() && !exact ? <IconButton icon={Plus} label={t('Naya')} size="sm" variant="soft" onPress={() => void addAuthor()} /> : undefined} />
        <ChipGroup wrap multiple value={x.authorIds} onChange={(authorIds) => set({ authorIds })} options={shown.map((a) => ({ value: a.id, label: a.name }))} />
        {!shown.length && <Text size="xs" tone="muted">{all.length ? t('Naam likhein — milte-julte author yahan aayenge') : t('Abhi koi author nahi — naam likh kar "Naya" dabayein')}</Text>}
        <Select label={t('Publisher')} value={x.publisherId || null} onChange={(v) => set({ publisherId: v })} placeholder={pubs.isLoading ? t('Load ho raha…') : t('Chunein')} searchable
          options={(pubs.data ?? []).map((p) => ({ value: p.id, label: `${p.name}${p.city ? ` — ${p.city}` : ''}` }))} />
        <Input label={t('Naya publisher')} value={pubName} onChangeText={setPubName} trailing={pubName.trim() ? <IconButton icon={Building2} label={t('Publisher banayein')} size="sm" variant="soft" onPress={() => void addPublisher()} /> : undefined} />
      </FormSection>
      <FormSection title={t('Edition aur zubaan')} description={t('Naya edition aaye to purana alag item rakhein — rate aur stock alag rehta hai')}>
        <Input label={t('Edition')} value={x.edition} onChangeText={(edition) => set({ edition })} placeholder={t('3rd, 2026')} />
        <NumberInput label={t('Saal')} integer value={x.publishYear} onChangeValue={(publishYear) => set({ publishYear })} placeholder="2026" error={ctx.errors.year} />
        <ChipGroup wrap value={x.language} onChange={(language) => set({ language })} options={LANGUAGES.map((l) => ({ value: l, label: l }))} />
        <Text size="sm" weight="medium" tone="secondary">{t('Kitab ki type')}</Text>
        <ChipGroup wrap value={x.category} onChange={(v) => set({ category: v, isTextbook: ['TEXTBOOK', 'GUIDE', 'WORKBOOK', 'EXAM_PREP'].includes(v) ? true : x.isTextbook })} options={pairs(BOOK_CATEGORIES)} />
        <ChipGroup wrap value={x.binding} onChange={(binding) => set({ binding })} options={pairs(BINDINGS)} />
        <ChipGroup wrap value={x.condition} onChange={(condition) => set({ condition })} options={pairs(CONDITIONS)} />
      </FormSection>
      <FormSection title={t('School ki kitab')} description={t('Class aur subject se School list me khud milti hai')}>
        <Switch value={x.isTextbook} onChange={(isTextbook) => set({ isTextbook })} label={t('Ye school / college ki kitab hai')} description={t('Textbook, guide, workbook')} />
        {x.isTextbook && (
          <>
            <Input label={t('Class')} value={x.grade} onChangeText={(grade) => set({ grade })} placeholder={t('Class 5')} error={ctx.errors.grade} />
            <ChipGroup wrap value={x.grade} onChange={(v) => set({ grade: pick(x.grade, v) })} options={GRADES.map((g) => ({ value: g, label: g }))} />
            <Input label={t('Subject')} value={x.subject} onChangeText={(subject) => set({ subject })} placeholder={t('English')} />
            <ChipGroup wrap value={x.subject} onChange={(v) => set({ subject: pick(x.subject, v) })} options={SUBJECTS.map((g) => ({ value: g, label: g }))} />
            <Input label={t('Board')} value={x.board} onChangeText={(board) => set({ board })} placeholder={t('Punjab Board')} />
            <ChipGroup wrap value={x.board} onChange={(v) => set({ board: pick(x.board, v) })} options={BOARDS.map((g) => ({ value: g, label: g }))} />
          </>
        )}
      </FormSection>
    </View>
  );
}

function Details({ ctx }: { ctx: StepContext<BookExtra> }) {
  const x = ctx.draft.extra;
  if (x.kind === 'BOOK') return <BookDetails ctx={ctx} />;
  if (x.kind === 'OTHER') {
    return (
      <FormSection title={t('Aur maal')} description={t('Uniform, bag, gift item — size ya rang alag ho to Stock step me variant banayein')}>
        <Input label={t('Brand / banane wala')} value={x.brand} onChangeText={(brand) => ctx.setExtra({ brand })} placeholder={t('Jaise: school ka naam')} />
      </FormSection>
    );
  }
  const list = x.kind === 'STATIONERY' ? STATIONERY_CATEGORIES : ART_CATEGORIES;
  return (
    <FormSection title={x.kind === 'ART' ? t('Art ka saman') : t('Stationery')} description={t('Type aur brand se products page aur POS par dhoondna aasaan hai')}>
      <Text size="sm" weight="medium" tone="secondary">{t('Type')}</Text>
      <ChipGroup wrap value={x.typeCategory} onChange={(v) => ctx.setExtra({ typeCategory: pick(x.typeCategory, v) })} options={pairs(list)} />
      <Input label={t('Brand')} value={x.brand} onChangeText={(brand) => ctx.setExtra({ brand })} placeholder={x.kind === 'ART' ? 'Pelikan, Faber-Castell' : 'Dollar, Piano, Oxford'} />
      <Input label={t('Rang')} value={x.color} onChangeText={(color) => ctx.setExtra({ color })} placeholder="Blue, Black" />
      <Input label={t('Size')} value={x.size} onChangeText={(size) => ctx.setExtra({ size })} placeholder="A4, 200 pages, 12 colors" />
      {x.kind === 'STATIONERY' && <Switch value={x.isSchoolItem} onChange={(isSchoolItem) => ctx.setExtra({ isSchoolItem })} label={t('School ka saman')} description={t('School list banate waqt upar aata hai')} />}
    </FormSection>
  );
}

const core: CoreOptions = {
  units: [{ value: 'pcs', label: msg('Piece / kitab') }, { value: 'set', label: msg('Set') }, { value: 'pack', label: msg('Pack') }, { value: 'dozen', label: msg('Dozen') }, { value: 'box', label: msg('Box') }, { value: 'ream', label: msg('Ream') }],
  skuPrefix: 'BK',
  packs: true,
  variants: { presets: [
    { group: msg('Uniform size'), values: ['20', '22', '24', '26', '28', '30', '32', '34', 'S', 'M', 'L', 'XL'] },
    { group: msg('Rang'), values: ['Blue', 'Black', 'Red', 'Green'] },
    { group: msg('Pages'), values: ['80 pages', '100 pages', '200 pages', '300 pages'] },
  ] },
  batches: false,
  markups: [10, 15, 20, 25],
};

const detailsStep: StepDef<BookExtra> = {
  id: 'details', title: msg('Tafseel'), icon: GraduationCap, render: (ctx) => <Details ctx={ctx} />,
  validate: (d) => {
    const x = d.extra;
    const e: Errors = {};
    if (x.kind !== 'BOOK') return e;
    if (x.isbn13 && !isbnValid(x.isbn13)) e.isbn = t('ISBN-13 ke 13 number sahi nahi — dobara dekhein');
    else if (x.isbn10 && !isbnValid(x.isbn10)) e.isbn = t('ISBN-10 sahi nahi');
    if (x.publishYear != null && (x.publishYear < 1800 || x.publishYear > new Date().getFullYear() + 1)) e.year = t('Saal sahi likhein');
    if (x.isTextbook && !x.grade.trim()) e.grade = t('Class likhein (jaise Class 5)');
    return e;
  },
};

function rentalErrors(x: BookExtra): Errors {
  if (x.kind !== 'BOOK' || !x.isRentable) return {};
  return Number(x.rentalPricePerWeek) > 0 ? {} : { rental: t('Hafte ka kiraya likhein') };
}

const priceBase = priceStep<BookExtra>(core, {
  extra: (ctx) => (ctx.draft.extra.kind !== 'BOOK' ? null : (
    <FormSection title={t('Kiraye par')} description={t('Novel aur reference kitab kiraye par dene wali dukaan ke liye')}>
      <Switch value={ctx.draft.extra.isRentable} onChange={(isRentable) => ctx.setExtra({ isRentable })} label={t('Ye kitab kiraye par bhi di jati hai')} />
      {ctx.draft.extra.isRentable && (
        <>
          <MoneyInput label={t('Kiraya (ek hafta)')} value={ctx.draft.extra.rentalPricePerWeek} onChangeValue={(rentalPricePerWeek) => ctx.setExtra({ rentalPricePerWeek })} error={ctx.errors.rental} />
          <MoneyInput label={t('Deposit (wapas hota hai)')} value={ctx.draft.extra.rentalDeposit} onChangeValue={(rentalDeposit) => ctx.setExtra({ rentalDeposit })} hint={t('Kitab wapas aane par lauta diya jata hai')} />
        </>
      )}
    </FormSection>
  )),
});

const editor: EditorConfig<BookExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const [b, s, a] = await Promise.all([bookProfilesApi.byProduct(productId).catch(() => null), stationeryApi.byProduct(productId).catch(() => null), artApi.byProduct(productId).catch(() => null)]);
      if (b) return {
        kind: 'BOOK', isbn13: b.isbn13 ?? '', isbn10: b.isbn10 ?? '', authorIds: (b.bookAuthors ?? []).map((x) => x.authorId), publisherId: b.publisherId ?? '', edition: b.edition ?? '', publishYear: b.publishYear ?? null,
        language: b.language || 'English', category: b.category, binding: b.binding, condition: b.condition, isTextbook: b.isTextbook, grade: b.grade ?? '', subject: b.subject ?? '', board: b.board ?? '',
        isRentable: b.isRentable, rentalPricePerWeek: b.rentalPricePerWeek || null, rentalDeposit: b.rentalDeposit || null,
      } as Partial<BookExtra>;
      if (s) return { kind: 'STATIONERY', typeCategory: s.category, brand: s.brand ?? '', color: s.color ?? '', size: s.size ?? '', isSchoolItem: !!s.isSchoolItem };
      if (a) return { kind: 'ART', typeCategory: a.category, brand: a.brand ?? '', color: a.color ?? '', size: a.size ?? '' };
      return { kind: 'OTHER' };
    },
    // A book with no barcode of its own sells by its ISBN.
    product: (d, payload) => (d.extra.kind === 'BOOK' && !String(payload.barcode ?? '').trim() && (d.extra.isbn13 || d.extra.isbn10) ? { ...payload, barcode: d.extra.isbn13 || d.extra.isbn10 } : payload),
    save: async (productId, d) => {
      const x = d.extra;
      if (x.kind === 'BOOK') {
        const body: Record<string, unknown> = {
          productId, title: d.core.name.trim(), isbn13: opt(x.isbn13), isbn10: opt(x.isbn10), publisherId: opt(x.publisherId), edition: opt(x.edition), publishYear: num(x.publishYear), language: x.language,
          category: x.category, binding: x.binding, condition: x.condition, isTextbook: x.isTextbook, grade: x.isTextbook ? opt(x.grade) : undefined, subject: x.isTextbook ? opt(x.subject) : undefined,
          board: x.isTextbook ? opt(x.board) : undefined, isRentable: x.isRentable, rentalPricePerWeek: x.isRentable ? num(x.rentalPricePerWeek) ?? 0 : 0, rentalDeposit: x.isRentable ? num(x.rentalDeposit) ?? 0 : 0,
          mrp: num(d.core.price), authors: x.authorIds.map((authorId, i) => ({ authorId, displayOrder: i })),
        };
        await bookProfilesApi.upsert(Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)));
      } else if (x.kind === 'STATIONERY') {
        await stationeryApi.upsert({ productId, category: x.typeCategory || 'OTHER', brand: opt(x.brand), color: opt(x.color), size: opt(x.size), isSchoolItem: x.isSchoolItem });
      } else if (x.kind === 'ART') {
        await artApi.upsert({ productId, category: x.typeCategory || 'OTHER', brand: opt(x.brand), color: opt(x.color), size: opt(x.size) });
      }
    },
  },
  steps: [
    basicStep<BookExtra>(core, { extra: (ctx) => <Kind ctx={ctx} />, namePlaceholder: msg('Jaise: Oxford English Class 5 ya Dollar Ball Pen') }),
    detailsStep,
    { ...priceBase, validate: (d, e) => ({ ...priceBase.validate?.(d, e), ...rentalErrors(d.extra) }) },
    stockStep<BookExtra>(core, { quick: [5, 10, 25, 50, 100, 500] }),
  ],
  summary: (d) => {
    const x = d.extra;
    const facts = x.kind === 'BOOK'
      ? [x.isbn13 || x.isbn10, x.edition && `${x.edition} ed`, x.isTextbook && [x.grade, x.subject].filter(Boolean).join(' '), x.isRentable && t('Kiraye par')]
      : [t(KINDS.find((k) => k.value === x.kind)?.label ?? ''), x.brand, x.size];
    const line = facts.filter(Boolean).join(' · ');
    return line ? [[t('Tafseel'), line]] : [];
  },
};

function useFacts() {
  const q = useQuery({ queryKey: [KEYS.facts], queryFn: () => bookProfilesApi.facts().catch(() => [] as BookFact[]), staleTime: 5 * 60_000 });
  return useMemo(() => new Map((q.data ?? []).map((f) => [f.productId, f])), [q.data]);
}

registerInventoryIndustry({
  id: 'bookstore',
  label: msg('Bookstore'),
  list: {
    noun: 'item',
    filters: ['tags'],
    useSource: useFacts,
    extras: (item, ctx) => {
      const f = (ctx.source as Map<string, BookFact> | undefined)?.get(item.id);
      if (!f) return {};
      const isbn = isbnOf(f);
      return {
        line: factLine(f),
        badges: f.kind === 'BOOK' && f.isRentable ? [{ label: t('Kiraya'), tone: 'warning' }] : [],
        chips: [
          ...(f.kind === 'BOOK' ? [f.isTextbook ? t('Textbook') : t('Kitab')] : []),
          ...(f.kind === 'BOOK' && f.isTextbook && f.board ? [f.board] : []),
          ...(isbn ? [isbn] : []),
          ...(f.kind === 'STATIONERY' && f.isSchoolItem ? [t('School')] : []),
        ],
      };
    },
    // A scanned ISBN that is only on a book's details (not its barcode) still opens the book.
    onScanMiss: async (code) => {
      const b = await bookProfilesApi.byIsbn(code).catch(() => null);
      if (!b) return false;
      router.push(`/products/${b.productId}` as never);
      return true;
    },
    actions: [
      { icon: ClipboardList, label: msg('School lists'), href: '/bookstore/school-lists' },
      { icon: Building2, label: msg('Publishers'), href: '/bookstore/publishers' },
    ],
    stockChips: () => [1, 10, 50, 100],
    guide: [
      { icon: ScanLine, title: msg('ISBN'), text: msg('Kitab ki pusht wala ISBN barcode scan karein — wohi kitab khul jati hai. Naye ISBN par nayi kitab banayein.') },
      { icon: GraduationCap, title: msg('Class aur subject'), text: msg('Textbook par class, subject aur board likha ho to School list banana aur POS par dhoondna aasaan hai.') },
      { icon: Pencil, title: msg('Dozen aur pack'), text: msg('Copy, pencil jaisi cheezein piece me rakhein aur Price step me Dozen ya Pack jorein — dono tarah bikti hain.') },
      { icon: Timer, title: msg('Kiraye wali kitab'), text: msg('Jis kitab par "Kiraya" laga hai wo Book rentals se kiraye par di ja sakti hai.') },
    ],
  },
  editor,
  detail: {
    extra: { key: 'bookstore-product-detail', load: (id) => bookProfilesApi.facts().then((all) => all.find((f) => f.productId === id) ?? null).catch(() => null) },
    badges: ({ extra }) => {
      const f = extra as BookFact | null | undefined;
      if (!f) return [];
      return [
        ...(f.kind === 'BOOK' ? [{ label: f.isTextbook ? t('Textbook') : t('Kitab'), tone: 'info' as const }] : []),
        ...(f.kind === 'BOOK' && f.isRentable ? [{ label: t('Kiraya'), tone: 'warning' as const }] : []),
        ...(f.kind === 'STATIONERY' && f.isSchoolItem ? [{ label: t('School'), tone: 'accent' as const }] : []),
      ];
    },
    facts: ({ extra }) => {
      const f = extra as BookFact | null | undefined;
      if (!f) return [];
      const rows: Array<[string, string | undefined]> = f.kind === 'BOOK' ? [
        [t('ISBN'), isbnOf(f)], [t('Author'), f.authors.join(', ')], [t('Publisher'), f.publisher ?? undefined], [t('Edition'), f.edition ?? undefined], [t('Saal'), f.publishYear ? String(f.publishYear) : undefined],
        [t('Zubaan'), f.language ?? undefined], [t('Type'), labelOf(BOOK_CATEGORIES, f.category)], [t('Class'), f.grade ?? undefined], [t('Subject'), f.subject ?? undefined], [t('Board'), f.board ?? undefined],
        [t('Kiraya'), f.isRentable ? `${f.rentalPricePerWeek} / ${t('hafta')} · ${t('Deposit')} ${f.rentalDeposit}` : undefined],
      ] : [
        [t('Type'), labelOf(f.kind === 'STATIONERY' ? STATIONERY_CATEGORIES : ART_CATEGORIES, f.category)], [t('Brand'), f.brand ?? undefined], [t('Rang'), f.color ?? undefined], [t('Size'), f.size ?? undefined],
      ];
      return rows.filter((r): r is [string, string] => !!r[1]);
    },
    stockChips: [1, 10, 50, 100],
  },
});

