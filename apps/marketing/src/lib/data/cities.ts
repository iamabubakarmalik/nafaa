export interface City {
  slug: string;
  nameEn: string;
  nameUr: string;
  province: string;
  lat: number;
  lng: number;
  activeShops: number;
  topIndustries: string[];
  featured?: boolean;
}

export const cities: City[] = [
  { slug: 'karachi', nameEn: 'Karachi', nameUr: 'کراچی', province: 'Sindh', lat: 24.8607, lng: 67.0011, activeShops: 8420, topIndustries: ['restaurant', 'garments', 'mobile-shop', 'kiryana'], featured: true },
  { slug: 'lahore', nameEn: 'Lahore', nameUr: 'لاہور', province: 'Punjab', lat: 31.5204, lng: 74.3587, activeShops: 7180, topIndustries: ['bakery', 'restaurant', 'garments', 'jewelry'], featured: true },
  { slug: 'islamabad', nameEn: 'Islamabad', nameUr: 'اسلام آباد', province: 'ICT', lat: 33.6844, lng: 73.0479, activeShops: 3240, topIndustries: ['restaurant', 'pharmacy', 'salon', 'gym'], featured: true },
  { slug: 'rawalpindi', nameEn: 'Rawalpindi', nameUr: 'راولپنڈی', province: 'Punjab', lat: 33.5651, lng: 73.0169, activeShops: 2890, topIndustries: ['kiryana', 'auto-parts', 'mobile-shop'] },
  { slug: 'faisalabad', nameEn: 'Faisalabad', nameUr: 'فیصل آباد', province: 'Punjab', lat: 31.4504, lng: 73.1350, activeShops: 3560, topIndustries: ['garments', 'kiryana', 'hardware'], featured: true },
  { slug: 'multan', nameEn: 'Multan', nameUr: 'ملتان', province: 'Punjab', lat: 30.1575, lng: 71.5249, activeShops: 2340, topIndustries: ['kiryana', 'bakery', 'auto-parts'] },
  { slug: 'peshawar', nameEn: 'Peshawar', nameUr: 'پشاور', province: 'KPK', lat: 34.0151, lng: 71.5249, activeShops: 1980, topIndustries: ['hardware', 'auto-parts', 'kiryana'] },
  { slug: 'quetta', nameEn: 'Quetta', nameUr: 'کوئٹہ', province: 'Balochistan', lat: 30.1798, lng: 66.9749, activeShops: 890, topIndustries: ['kiryana', 'auto-parts'] },
  { slug: 'gujranwala', nameEn: 'Gujranwala', nameUr: 'گوجرانوالہ', province: 'Punjab', lat: 32.1877, lng: 74.1945, activeShops: 1650, topIndustries: ['garments', 'hardware', 'kiryana'] },
  { slug: 'sialkot', nameEn: 'Sialkot', nameUr: 'سیالکوٹ', province: 'Punjab', lat: 32.4945, lng: 74.5229, activeShops: 1240, topIndustries: ['garments', 'sports-goods', 'hardware'] },
  { slug: 'hyderabad', nameEn: 'Hyderabad', nameUr: 'حیدرآباد', province: 'Sindh', lat: 25.3960, lng: 68.3578, activeShops: 1450, topIndustries: ['kiryana', 'bakery', 'garments'] },
  { slug: 'bahawalpur', nameEn: 'Bahawalpur', nameUr: 'بہاولپور', province: 'Punjab', lat: 29.3956, lng: 71.6836, activeShops: 780, topIndustries: ['kiryana', 'agri-store'] },
];

export const featuredCities = cities.filter((c) => c.featured);
export const getCity = (slug: string) => cities.find((c) => c.slug === slug);
export const totalActiveShops = () => cities.reduce((sum, c) => sum + c.activeShops, 0);
