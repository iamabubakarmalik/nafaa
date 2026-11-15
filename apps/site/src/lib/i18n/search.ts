/** Words for site search (the header dialog and /search). Plain data. */

export interface SearchStrings {
  metaTitle: string;
  metaDescription: string;
  heading: string;
  intro: string;
  label: string;
  placeholder: string;
  submit: string;
  clear: string;
  close: string;
  loading: string;
  /** "{n}" results for "{q}". */
  count: string;
  none: string;
  noneHelp: string;
  helpLink: string;
  contactLink: string;
  popular: string;
  hintMove: string;
  hintOpen: string;
  hintClose: string;
  seeAll: string;
}

const en: SearchStrings = {
  metaTitle: 'Search nafaa.pk',
  metaDescription: 'Search Nafaa pages, products, industries, help articles, guides, free tools and the glossary in one place.',
  heading: 'Search the site',
  intro: 'Products, industries, help articles, guides, free tools and the glossary.',
  label: 'Search the site',
  placeholder: 'Search pages, guides and help',
  submit: 'Search',
  clear: 'Clear',
  close: 'Close search',
  loading: 'Loading…',
  count: '{n} results for “{q}”',
  none: 'Nothing found for “{q}”.',
  noneHelp: 'Try a shorter word, or ask us directly.',
  helpLink: 'Help center',
  contactLink: 'Contact us',
  popular: 'Popular',
  hintMove: 'to move',
  hintOpen: 'to open',
  hintClose: 'to close',
  seeAll: 'See all results',
};

const ur: SearchStrings = {
  metaTitle: 'nafaa.pk میں تلاش',
  metaDescription: 'Nafaa کے صفحے، پروڈکٹس، کاروبار، ہیلپ آرٹیکلز، گائیڈز، مفت ٹولز اور اصطلاحات ایک جگہ تلاش کریں۔',
  heading: 'ویب سائٹ میں تلاش کریں',
  intro: 'پروڈکٹس، کاروبار، ہیلپ آرٹیکلز، گائیڈز، مفت ٹولز اور اصطلاحات۔',
  label: 'ویب سائٹ میں تلاش کریں',
  placeholder: 'صفحے، گائیڈز اور مدد تلاش کریں',
  submit: 'تلاش',
  clear: 'صاف کریں',
  close: 'تلاش بند کریں',
  loading: 'لوڈ ہو رہا ہے…',
  count: '“{q}” کے {n} نتیجے',
  none: '“{q}” کے لیے کچھ نہیں ملا۔',
  noneHelp: 'چھوٹا لفظ لکھ کر دیکھیں، یا ہم سے سیدھا پوچھ لیں۔',
  helpLink: 'اکثر پوچھے جانے والے سوال',
  contactLink: 'رابطہ کریں',
  popular: 'زیادہ دیکھے جانے والے',
  hintMove: 'اوپر نیچے',
  hintOpen: 'کھولیں',
  hintClose: 'بند کریں',
  seeAll: 'سارے نتیجے دیکھیں',
};

export function searchStrings(locale: string | undefined): SearchStrings {
  return locale === 'ur' ? ur : en;
}
