import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BookCategory, BookBinding, BookCondition } from '../api/book-profiles.api';
import type { StationeryCategory } from '../api/stationery-profiles.api';
import type { ArtSupplyCategory } from '../api/art-supply-profiles.api';

const DRAFT_KEY = 'nafaa.bookstore-wizard.draft';

export type WizardStep = 1 | 2 | 3 | 4;
export type ProductType = 'BOOK' | 'STATIONERY' | 'ART_SUPPLY';

export interface BookstoreWizardBasic {
  productType: ProductType;
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  sku: string;
  barcode: string;
  unit: string;
  costPrice: number | '';
  salePrice: number | '';
  wholesalePrice: number | '';
  mrp: number | '';
  taxRate: number | '';
  discountPct: number | '';
  stock: number | '';
  lowStockAlert: number | '';
  isFeatured: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
}

export interface BookstoreWizardBookDetails {
  isbn10: string;
  isbn13: string;
  publisherBookCode: string;
  title: string;
  subtitle: string;
  originalTitle: string;
  category: BookCategory;
  subCategory: string;
  binding: BookBinding;
  condition: BookCondition;
  publisherId: string;
  edition: string;
  editionNumber: number | '';
  publishYear: number | '';
  reprintYear: number | '';
  language: string;
  pageCount: number | '';
  weightGrams: number | '';
  dimensions: string;
  paperQuality: string;
  synopsis: string;
  tableOfContents: string;
  authorIds: string[];
  // Academic
  isTextbook: boolean;
  grade: string;
  classLevel: string;
  subject: string;
  board: string;
  curriculum: string;
  // Flags
  isBestSeller: boolean;
  isNewArrival: boolean;
  isAwardWinner: boolean;
  awardName: string;
  // Rental
  isRentable: boolean;
  rentalPricePerWeek: number | '';
  rentalDeposit: number | '';
}

export interface BookstoreWizardStationeryDetails {
  category: StationeryCategory;
  subCategory: string;
  brand: string;
  color: string;
  size: string;
  weight: number | '';
  dimensions: string;
  material: string;
  packSize: number | '';
  packUnit: string;
  itemsPerPack: number | '';
  isFastMoving: boolean;
  isSchoolItem: boolean;
  isOfficeItem: boolean;
  reorderLevel: number | '';
}

export interface BookstoreWizardArtDetails {
  category: ArtSupplyCategory;
  subCategory: string;
  brand: string;
  color: string;
  colorCode: string;
  size: string;
  grade: string;
  weight: number | '';
  volume: string;
  dimensions: string;
  suitableFor: string[];
  isProfessional: boolean;
  isBeginner: boolean;
  reorderLevel: number | '';
}

export interface BookstoreWizardDraft {
  step: WizardStep;
  basic: BookstoreWizardBasic;
  book: BookstoreWizardBookDetails;
  stationery: BookstoreWizardStationeryDetails;
  art: BookstoreWizardArtDetails;
  savedAt: number;
}

const emptyBasic = (): BookstoreWizardBasic => ({
  productType: 'BOOK',
  name: '', description: '', categoryId: '', brandId: '',
  sku: '', barcode: '', unit: 'pcs',
  costPrice: '', salePrice: '', wholesalePrice: '', mrp: '',
  taxRate: '', discountPct: '',
  stock: '', lowStockAlert: 5,
  isFeatured: false, isActive: true,
  imageUrls: [], tagIds: [],
});

const emptyBook = (): BookstoreWizardBookDetails => ({
  isbn10: '', isbn13: '', publisherBookCode: '',
  title: '', subtitle: '', originalTitle: '',
  category: 'TEXTBOOK', subCategory: '',
  binding: 'PAPERBACK', condition: 'NEW',
  publisherId: '', edition: '', editionNumber: '',
  publishYear: '', reprintYear: '',
  language: 'Urdu', pageCount: '', weightGrams: '',
  dimensions: '', paperQuality: '',
  synopsis: '', tableOfContents: '',
  authorIds: [],
  isTextbook: false, grade: '', classLevel: '', subject: '',
  board: '', curriculum: '',
  isBestSeller: false, isNewArrival: false,
  isAwardWinner: false, awardName: '',
  isRentable: false, rentalPricePerWeek: '', rentalDeposit: '',
});

const emptyStationery = (): BookstoreWizardStationeryDetails => ({
  category: 'PEN_BALLPOINT', subCategory: '',
  brand: '', color: '', size: '',
  weight: '', dimensions: '', material: '',
  packSize: '', packUnit: '', itemsPerPack: '',
  isFastMoving: false, isSchoolItem: true, isOfficeItem: false,
  reorderLevel: 10,
});

const emptyArt = (): BookstoreWizardArtDetails => ({
  category: 'ACRYLIC_PAINT', subCategory: '',
  brand: '', color: '', colorCode: '',
  size: '', grade: '',
  weight: '', volume: '', dimensions: '',
  suitableFor: [],
  isProfessional: false, isBeginner: false,
  reorderLevel: 5,
});

const emptyDraft = (): BookstoreWizardDraft => ({
  step: 1,
  basic: emptyBasic(),
  book: emptyBook(),
  stationery: emptyStationery(),
  art: emptyArt(),
  savedAt: Date.now(),
});

interface UseBookstoreWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function useBookstoreWizard(opts: UseBookstoreWizardOpts = {}) {
  const [draft, setDraft] = useState<BookstoreWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as BookstoreWizardDraft;
        if (parsed && parsed.basic) {
          const safe: BookstoreWizardDraft = {
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            book: { ...emptyBook(), ...parsed.book },
            stationery: { ...emptyStationery(), ...parsed.stationery },
            art: { ...emptyArt(), ...parsed.art },
          };
          setDraft(safe);
          setDraftRestored(true);
          opts.onDraftLoaded?.();
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [draft]);

  const goToStep = useCallback((step: WizardStep) => {
    setDraft((d) => ({ ...d, step }));
  }, []);
  const nextStep = useCallback(() => {
    setDraft((d) => ({ ...d, step: (d.step < 4 ? d.step + 1 : 4) as WizardStep }));
  }, []);
  const prevStep = useCallback(() => {
    setDraft((d) => ({ ...d, step: (d.step > 1 ? d.step - 1 : 1) as WizardStep }));
  }, []);

  const setProductType = useCallback((type: ProductType) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, productType: type } }));
  }, []);

  const updateBasic = useCallback((patch: Partial<BookstoreWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  const updateBook = useCallback((patch: Partial<BookstoreWizardBookDetails>) => {
    setDraft((d) => ({ ...d, book: { ...d.book, ...patch } }));
  }, []);

  const toggleAuthor = useCallback((authorId: string) => {
    setDraft((d) => ({
      ...d,
      book: {
        ...d.book,
        authorIds: d.book.authorIds.includes(authorId)
          ? d.book.authorIds.filter((id) => id !== authorId)
          : [...d.book.authorIds, authorId],
      },
    }));
  }, []);

  const updateStationery = useCallback((patch: Partial<BookstoreWizardStationeryDetails>) => {
    setDraft((d) => ({ ...d, stationery: { ...d.stationery, ...patch } }));
  }, []);

  const updateArt = useCallback((patch: Partial<BookstoreWizardArtDetails>) => {
    setDraft((d) => ({ ...d, art: { ...d.art, ...patch } }));
  }, []);

  const toggleSuitableFor = useCallback((item: string) => {
    setDraft((d) => ({
      ...d,
      art: {
        ...d.art,
        suitableFor: d.art.suitableFor.includes(item)
          ? d.art.suitableFor.filter((x) => x !== item)
          : [...d.art.suitableFor, item],
      },
    }));
  }, []);

  const reset = useCallback(() => {
    setDraft(emptyDraft());
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setDraftRestored(false);
  }, []);

  const validation = useMemo(() => {
    const step1Errors: string[] = [];
    if (!draft.basic.name.trim()) step1Errors.push('Product name required');
    if (!draft.basic.salePrice || Number(draft.basic.salePrice) <= 0) {
      step1Errors.push('Sale price required');
    }

    const step2Errors: string[] = [];
    if (draft.basic.productType === 'BOOK') {
      if (!draft.book.title.trim() && !draft.basic.name.trim()) step2Errors.push('Book title required');
    }
    // Stationery/Art category always has default, so no strict validation

    const step3Errors: string[] = [];
    if (draft.basic.productType === 'BOOK' && draft.book.isRentable) {
      if (!draft.book.rentalPricePerWeek || Number(draft.book.rentalPricePerWeek) <= 0) {
        step3Errors.push('Rental price per week required if rentable');
      }
    }

    const step4Errors: string[] = [];

    return {
      step1: { valid: step1Errors.length === 0, errors: step1Errors },
      step2: { valid: step2Errors.length === 0, errors: step2Errors },
      step3: { valid: step3Errors.length === 0, errors: step3Errors },
      step4: { valid: step4Errors.length === 0, errors: step4Errors },
      allValid: step1Errors.length === 0 && step2Errors.length === 0 && step3Errors.length === 0 && step4Errors.length === 0,
    };
  }, [draft]);

  const stats = useMemo(() => {
    const salePrice = Number(draft.basic.salePrice || 0);
    const costPrice = Number(draft.basic.costPrice || 0);
    const mrp = Number(draft.basic.mrp || 0);
    const profit = salePrice - costPrice;
    const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;
    const discount = mrp > 0 && salePrice > 0 ? ((mrp - salePrice) / mrp) * 100 : 0;
    const stock = Number(draft.basic.stock || 0);
    const stockValue = stock * salePrice;

    return {
      profit, margin, discount, stockValue,
      authorCount: draft.book.authorIds.length,
      suitableForCount: draft.art.suitableFor.length,
    };
  }, [draft]);

  return {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    setProductType,
    updateBasic, updateBook, updateStationery, updateArt,
    toggleAuthor, toggleSuitableFor,
    reset,
  };
}
