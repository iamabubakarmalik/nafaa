export type BlogCategory =
  | 'guides'         // How-to guides
  | 'industry'       // Industry-specific insights
  | 'compliance'     // FBR, DRAP, tax
  | 'business'       // Growth, marketing, ops
  | 'product'        // Nafaa updates, features
  | 'case-study';    // Success stories

export interface BlogPost {
  slug: string;
  titleEn: string;
  titleUr: string;
  excerptEn: string;
  excerptUr: string;
  category: BlogCategory;
  industrySlug?: string;
  author: {
    name: string;
    role: string;
    avatarInitials: string;
    color: string;
  };
  publishedAt: string;      // ISO
  updatedAt?: string;
  readingTimeMin: number;
  featured: boolean;
  hero: {
    emoji: string;
    gradient: [string, string];
  };
  tags: string[];
  tocEn: Array<{ id: string; label: string }>;
  tocUr: Array<{ id: string; label: string }>;
  contentEn: string;         // Markdown
  contentUr: string;         // Markdown Urdu
  relatedSlugs: string[];
}

export const blogCategories: Record<BlogCategory, {
  labelEn: string;
  labelUr: string;
  descEn: string;
  descUr: string;
  emoji: string;
  color: string;
}> = {
  guides: {
    labelEn: 'How-to guides',
    labelUr: 'گائیڈز',
    descEn: 'Step-by-step tutorials for every business scenario',
    descUr: 'ہر کاروباری صورت حال کے لیے مرحلہ وار گائیڈز',
    emoji: '📖',
    color: '#3b82f6',
  },
  industry: {
    labelEn: 'Industry insights',
    labelUr: 'صنعتی معلومات',
    descEn: 'Deep dives into specific business types',
    descUr: 'مخصوص کاروباری اقسام کا مکمل جائزہ',
    emoji: '🏪',
    color: '#8b5cf6',
  },
  compliance: {
    labelEn: 'FBR & compliance',
    labelUr: 'ایف بی آر اور تعمیل',
    descEn: 'Tax, DRAP, e-invoicing, and legal requirements',
    descUr: 'ٹیکس، ڈریپ، ای-انوائسنگ، قانونی تقاضے',
    emoji: '⚖️',
    color: '#ef4444',
  },
  business: {
    labelEn: 'Business growth',
    labelUr: 'کاروباری ترقی',
    descEn: 'Marketing, operations, and scaling strategies',
    descUr: 'مارکیٹنگ، آپریشنز، اور توسیع',
    emoji: '📈',
    color: '#10b981',
  },
  product: {
    labelEn: 'Product updates',
    labelUr: 'پروڈکٹ اپڈیٹس',
    descEn: 'New features, releases, and improvements',
    descUr: 'نئے فیچرز، اپڈیٹس، بہتری',
    emoji: '⚡',
    color: '#f59e0b',
  },
  'case-study': {
    labelEn: 'Success stories',
    labelUr: 'کامیابی کی کہانیاں',
    descEn: 'Real Pakistani businesses growing with Nafaa',
    descUr: 'حقیقی پاکستانی کاروبار جو نفع کے ساتھ ترقی کر رہے ہیں',
    emoji: '⭐',
    color: '#ec4899',
  },
};

// Authors
export const authors: Record<string, BlogPost['author']> = {
  fatima: { name: 'Fatima Khan', role: 'Head of Product', avatarInitials: 'FK', color: '#8b5cf6' },
  ahmed: { name: 'Ahmed Malik', role: 'Small Business Advisor', avatarInitials: 'AM', color: '#10b981' },
  hassan: { name: 'Hassan Raza', role: 'Compliance Expert', avatarInitials: 'HR', color: '#ef4444' },
  zara: { name: 'Zara Ahmed', role: 'Industry Analyst', avatarInitials: 'ZA', color: '#ec4899' },
  bilal: { name: 'Bilal Sheikh', role: 'Growth Lead', avatarInitials: 'BS', color: '#3b82f6' },
};
