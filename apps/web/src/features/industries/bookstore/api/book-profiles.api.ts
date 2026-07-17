import { apiClient } from '@/api/client';

export type BookCategory = 'TEXTBOOK' | 'REFERENCE' | 'GUIDE' | 'WORKBOOK' | 'EXAM_PREP'
  | 'DICTIONARY' | 'ATLAS' | 'ENCYCLOPEDIA' | 'NOVEL' | 'SHORT_STORY' | 'POETRY'
  | 'DRAMA' | 'FANTASY' | 'MYSTERY' | 'ROMANCE' | 'THRILLER' | 'SCIENCE_FICTION'
  | 'HISTORICAL_FICTION' | 'BIOGRAPHY' | 'AUTOBIOGRAPHY' | 'HISTORY' | 'PHILOSOPHY'
  | 'RELIGION' | 'SELF_HELP' | 'BUSINESS' | 'ECONOMICS' | 'SCIENCE' | 'TECHNOLOGY'
  | 'COOKING' | 'TRAVEL' | 'ART_BOOK' | 'MUSIC_BOOK' | 'CHILDREN' | 'PICTURE_BOOK'
  | 'ACTIVITY_BOOK' | 'COLORING_BOOK' | 'STORYBOOK' | 'COMICS' | 'MANGA' | 'QURAN'
  | 'HADITH' | 'SEERAH' | 'FIQH' | 'ISLAMIC_HISTORY' | 'ISLAMIC_STUDIES' | 'DUA_BOOK'
  | 'URDU' | 'ENGLISH_LANGUAGE' | 'ARABIC' | 'OTHER_LANGUAGE' | 'MAGAZINE' | 'NEWSPAPER'
  | 'JOURNAL' | 'OTHER';

export type BookBinding = 'HARDCOVER' | 'PAPERBACK' | 'SPIRAL' | 'RING' | 'STAPLED' | 'LEATHER' | 'EBOOK' | 'AUDIOBOOK';
export type BookCondition = 'NEW' | 'USED_LIKE_NEW' | 'USED_GOOD' | 'USED_ACCEPTABLE' | 'OLD_STOCK' | 'DAMAGED';

export interface BookProfile {
  id: string;
  productId: string;
  isbn10?: string;
  isbn13?: string;
  publisherBookCode?: string;
  barcode?: string;
  title: string;
  subtitle?: string;
  originalTitle?: string;
  category: BookCategory;
  subCategory?: string;
  binding: BookBinding;
  condition: BookCondition;
  publisherId?: string;
  edition?: string;
  editionNumber?: number;
  publishYear?: number;
  reprintYear?: number;
  language: string;
  pageCount?: number;
  weightGrams?: number;
  dimensions?: string;
  paperQuality?: string;
  description?: string;
  tableOfContents?: string;
  synopsis?: string;
  isTextbook: boolean;
  grade?: string;
  classLevel?: string;
  subject?: string;
  board?: string;
  curriculum?: string;
  mrp?: number;
  discountPct: number;
  reorderLevel: number;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isFeatured: boolean;
  isAwardWinner: boolean;
  awardName?: string;
  avgRating?: number;
  totalReviews: number;
  totalSold: number;
  totalRented: number;
  isRentable: boolean;
  rentalPricePerWeek: number;
  rentalDeposit: number;
  publisher?: any;
  bookAuthors?: any[];
  product?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const bookProfilesApi = {
  upsert: (data: any) => apiClient.post('/bookstore/book-profiles', data).then(unwrap<BookProfile>),
  list: (params?: any) => apiClient.get('/bookstore/book-profiles', { params }).then(unwrap<BookProfile[]>),
  byProduct: (productId: string) => apiClient.get('/bookstore/book-profiles/by-product/' + productId).then(unwrap<BookProfile | null>),
  byIsbn: (isbn: string) => apiClient.get('/bookstore/book-profiles/by-isbn/' + encodeURIComponent(isbn)).then(unwrap<BookProfile | null>),
  byAcademic: (params: { board?: string; grade?: string; subject?: string }) =>
    apiClient.get('/bookstore/book-profiles/by-academic', { params }).then(unwrap<BookProfile[]>),
  getOne: (id: string) => apiClient.get('/bookstore/book-profiles/' + id).then(unwrap<BookProfile>),
  remove: (id: string) => apiClient.delete('/bookstore/book-profiles/' + id).then(unwrap),
};
