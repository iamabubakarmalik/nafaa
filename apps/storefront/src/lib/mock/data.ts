/**
 * Sample shops for STOREFRONT_MOCK=1: one per theme, with real-looking
 * products, collections and home pages. Only for building and checking the
 * themes without a running API; never used in production builds that set
 * NAFAA_API_URL.
 */
import type { Availability, MenuItem, Section, ThemeDoc, ThemeId } from '../api';
import { THEMES } from '../theme/presets';
import { PRODUCT_BLOCKS } from '../theme/defaults';

export const img = (id: string, w = 1400) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

export interface MockProduct {
  t: string;
  price: number;
  was?: number;
  img: string[];
  cat: string;
  coll: string[];
  brand?: string;
  opts?: Array<{ name: string; values: Array<[string, string?]> }>;
  badges?: string[];
  avail?: Availability;
  lead?: string;
  desc: string;
  rating?: [number, number];
  stock?: number;
}

export interface MockStore {
  slug: string;
  name: string;
  themeId: ThemeId;
  tagline: string;
  whatsapp: string;
  email: string;
  address: string;
  collections: Array<{ handle: string; title: string; image: string; desc: string }>;
  products: MockProduct[];
  home: Section[];
  announcement: string[];
  footerAbout: string;
}

const sec = (id: string, type: string, settings: Record<string, unknown> = {}, blocks?: Section['blocks']): Section => ({ id, type, settings, blocks });
const blk = (id: string, type: string, settings: Record<string, unknown>) => ({ id, type, settings });

const SIZES: Array<[string]> = [['XS'], ['S'], ['M'], ['L'], ['XL']];

// ─── Libaas (fashion) ──────────────────────────────────────────────────────
const libaas: MockStore = {
  slug: 'libaas',
  name: 'Libaas',
  themeId: 'fashion',
  tagline: 'Pret, lawn and formals, made in Lahore',
  whatsapp: '03001234567',
  email: 'hello@libaas.pk',
  address: '14-C, MM Alam Road, Gulberg III, Lahore',
  announcement: ['Free delivery on orders above Rs 5,000', 'Cash on Delivery all over Pakistan', 'Eid Edit is live. Shop before it sells out'],
  footerAbout: 'Libaas makes easy, elegant clothes for everyday and occasion wear. Every piece is stitched in our Lahore studio.',
  collections: [
    { handle: 'new-arrivals', title: 'New Arrivals', image: img('1583391733956-3750e0ff4e8b', 900), desc: 'Fresh drops every Friday.' },
    { handle: 'eid-edit', title: 'Eid Edit', image: img('1617627143750-d86bc21e42bb', 900), desc: 'Formals and festive wear for the season.' },
    { handle: 'pret', title: 'Pret', image: img('1558769132-cb1aea458c5e', 900), desc: 'Ready to wear, ready to go.' },
    { handle: 'winter', title: 'Winter Wear', image: img('1485968579580-b6d095142e6e', 900), desc: 'Coats, shawls and knits.' },
    { handle: 'sale', title: 'Sale', image: img('1445205170230-053b83016050', 900), desc: 'Up to 40% off.' },
  ],
  products: [
    { t: 'Noor Embroidered Lawn 3-Piece', price: 6950, was: 8500, img: ['1583391733956-3750e0ff4e8b', '1490481651871-ab68de25d43d'], cat: 'Lawn', coll: ['new-arrivals', 'eid-edit', 'sale'], opts: [{ name: 'Colour', values: [['Ivory', '#F4EFE6'], ['Mint', '#BFD8C7'], ['Blush', '#E8C4C0']] }, { name: 'Size', values: SIZES }], badges: ['New'], desc: '<p>A soft lawn shirt with tonal thread embroidery on the neckline and sleeves, paired with a chiffon dupatta and straight cotton trousers.</p><ul><li>Shirt: embroidered lawn</li><li>Dupatta: printed chiffon, 2.5 m</li><li>Trousers: cambric cotton</li></ul>', rating: [4.8, 126], stock: 4 },
    { t: 'Zara Silk Saree', price: 14500, img: ['1610030469983-98e550d6193c'], cat: 'Formals', coll: ['eid-edit'], desc: '<p>Pure silk saree with a woven gold border and a ready-stitched blouse.</p>', rating: [4.9, 41] },
    { t: 'Gulnaar Bridal Lehenga', price: 48000, img: ['1617627143750-d86bc21e42bb'], cat: 'Bridal', coll: ['eid-edit', 'new-arrivals'], opts: [{ name: 'Size', values: [['S'], ['M'], ['L']] }], avail: 'backorder', lead: 'Made to order, ships in 10 to 12 days', badges: ['Made to order'], desc: '<p>Hand-finished zardozi on raw silk with a net dupatta. Stitched to your size.</p>', rating: [5, 18] },
    { t: 'Classic Cotton Kurta, Sage', price: 3450, img: ['1523381210434-271e8be1f52b'], cat: 'Men', coll: ['pret', 'new-arrivals'], opts: [{ name: 'Size', values: [['S'], ['M'], ['L'], ['XL']] }], desc: '<p>Breathable cotton kurta with a band collar and side pockets.</p>', rating: [4.6, 87] },
    { t: 'Pastel Jogger Trousers', price: 2650, was: 3200, img: ['1594633312681-425c7b97ccd1'], cat: 'Pret', coll: ['pret', 'sale'], opts: [{ name: 'Size', values: SIZES }], desc: '<p>Relaxed joggers in brushed cotton.</p>', rating: [4.5, 52] },
    { t: 'Knit Fringe Poncho', price: 3950, img: ['1434389677669-e08b4cac3105'], cat: 'Winter', coll: ['winter', 'new-arrivals'], desc: '<p>Chunky knit poncho with fringe hem. One size.</p>', rating: [4.7, 33] },
    { t: 'Tailored Wool Coat', price: 12900, img: ['1485968579580-b6d095142e6e'], cat: 'Winter', coll: ['winter'], opts: [{ name: 'Size', values: [['S'], ['M'], ['L']] }], desc: '<p>Double-breasted coat in a wool blend.</p>', rating: [4.8, 21] },
    { t: 'Sky Trench Coat', price: 11500, img: ['1539109136881-3be0616acf4b'], cat: 'Winter', coll: ['winter'], avail: 'out_of_stock', desc: '<p>Water-resistant trench with a tie belt.</p>' },
    { t: 'Linen Essentials Set', price: 5450, img: ['1558769132-cb1aea458c5e', '1523381210434-271e8be1f52b'], cat: 'Pret', coll: ['pret'], opts: [{ name: 'Size', values: SIZES }], desc: '<p>Two-piece linen set in natural tones.</p>', rating: [4.4, 19] },
    { t: 'Everyday Graphic Tee', price: 1850, was: 2200, img: ['1503342217505-b0a15ec3261c'], cat: 'Pret', coll: ['pret', 'sale'], opts: [{ name: 'Size', values: SIZES }], desc: '<p>Heavy cotton tee, boxy fit.</p>', rating: [4.3, 64] },
    { t: 'Sunshine Co-ord Set', price: 4250, img: ['1515886657613-9f3515b0c78f'], cat: 'Pret', coll: ['new-arrivals', 'pret'], opts: [{ name: 'Size', values: SIZES }], desc: '<p>Bright fleece co-ord for easy weekends.</p>', rating: [4.6, 28] },
  ],
  home: [
    sec('hero', 'hero', { image: img('1583391733956-3750e0ff4e8b', 2200), heading: 'The Eid Edit', text: 'Hand-embroidered lawn, silk and formals. Stitched in Lahore, delivered across Pakistan.', buttonLabel: 'Shop the edit', buttonLink: '/collections/eid-edit', secondaryLabel: 'New arrivals', secondaryLink: '/collections/new-arrivals', align: 'left', height: 'large', overlay: 35 }),
    sec('cats', 'collection_list', { heading: 'Shop by category', shape: 'portrait' }, [
      blk('c1', 'collection', { collection: 'new-arrivals' }),
      blk('c2', 'collection', { collection: 'eid-edit' }),
      blk('c3', 'collection', { collection: 'pret' }),
      blk('c4', 'collection', { collection: 'winter' }),
    ]),
    sec('fc', 'featured_collection', { heading: 'New this week', text: 'Fresh drops every Friday', collection: 'new-arrivals', limit: 8, columns: 4, showViewAll: true }),
    sec('iwt', 'image_with_text', { image: img('1490481651871-ab68de25d43d', 1400), heading: 'Made slowly, worn often', text: '<p>Every Libaas piece is cut and stitched in our own studio. We use breathable fabrics that feel right in a Pakistani summer and hold their colour wash after wash.</p>', buttonLabel: 'Our story', buttonLink: '/pages/about', imagePosition: 'left', background: 'surface' }),
    sec('cd', 'countdown', { heading: 'Eid sale ends soon', text: 'Up to 40% off selected pret and lawn.', endsAt: new Date(Date.now() + 3 * 86400000 + 5 * 3600000).toISOString(), buttonLabel: 'Shop sale', buttonLink: '/collections/sale', image: img('1445205170230-053b83016050', 2000) }),
    sec('pc', 'product_carousel', { heading: 'Winter wear', collection: 'winter', limit: 8 }),
    sec('tb', 'trust_badges', {}, [
      blk('t1', 'badge', { icon: 'cod', title: 'Cash on Delivery', text: 'Pay when it arrives' }),
      blk('t2', 'badge', { icon: 'truck', title: 'Delivery all over Pakistan', text: '2 to 4 working days' }),
      blk('t3', 'badge', { icon: 'returns', title: '7-day exchange', text: 'Wrong size? We swap it' }),
      blk('t4', 'badge', { icon: 'whatsapp', title: 'WhatsApp support', text: '10am to 10pm, every day' }),
    ]),
    sec('tm', 'testimonials', { heading: 'Loved across Pakistan' }, [
      blk('q1', 'testimonial', { quote: 'The embroidery is even better in person. Delivered to Multan in two days, and the rider was so polite.', author: 'Ayesha K.', city: 'Multan', rating: 5 }),
      blk('q2', 'testimonial', { quote: 'Ordered a size up by mistake and they exchanged it the same week. Will buy again for Eid.', author: 'Sana R.', city: 'Karachi', rating: 5 }),
      blk('q3', 'testimonial', { quote: 'Fabric quality is premium for the price. My mother loved the lawn suit.', author: 'Hira M.', city: 'Islamabad', rating: 5 }),
    ]),
    sec('gal', 'gallery', { heading: 'Worn by you', handle: '@libaas.pk', link: 'https://instagram.com' }, [
      blk('g1', 'image', { image: img('1515886657613-9f3515b0c78f', 700) }),
      blk('g2', 'image', { image: img('1529139574466-a303027c1d8b', 700) }),
      blk('g3', 'image', { image: img('1469334031218-e382a71b716b', 700) }),
      blk('g4', 'image', { image: img('1483985988355-763728e1935b', 700) }),
      blk('g5', 'image', { image: img('1539109136881-3be0616acf4b', 700) }),
      blk('g6', 'image', { image: img('1610030469983-98e550d6193c', 700) }),
    ]),
    sec('nl', 'newsletter', { heading: 'Be the first to know', text: 'New drops and private sales on WhatsApp. No spam.', collect: 'whatsapp' }),
  ],
};

// ─── Volt (electronics) ────────────────────────────────────────────────────
const volt: MockStore = {
  slug: 'volt',
  name: 'Volt Electronics',
  themeId: 'electronics',
  tagline: 'Original gadgets with warranty',
  whatsapp: '03211234567',
  email: 'support@volt.pk',
  address: 'Shop 22, Hafeez Centre, Gulberg, Lahore',
  announcement: ['PTA approved phones with 1-year warranty', 'Free delivery above Rs 10,000', 'Pay with JazzCash, Easypaisa or Cash on Delivery'],
  footerAbout: 'Volt sells 100% original phones, audio and laptops with official warranty. Every order is checked and sealed before dispatch.',
  collections: [
    { handle: 'audio', title: 'Audio', image: img('1505740420928-5e560c06d30e', 900), desc: 'Earbuds, headphones and speakers.' },
    { handle: 'wearables', title: 'Smart Watches', image: img('1546868871-7041f2a55e12', 900), desc: 'Fitness and smart watches.' },
    { handle: 'phones-tablets', title: 'Phones & Tablets', image: img('1511707171634-5f897ff02aa9', 900), desc: 'PTA approved.' },
    { handle: 'laptops', title: 'Laptops', image: img('1496181133206-80ce9b88a853', 900), desc: 'For work, study and play.' },
    { handle: 'deals', title: 'Deals', image: img('1593359677879-a4bb92f829d1', 900), desc: 'Limited time prices.' },
  ],
  products: [
    { t: 'Volt Pods Pro ANC Earbuds', price: 8999, was: 11999, img: ['1572569511254-d8f925fe2cbb', '1590658268037-6bf12165a8df'], cat: 'Earbuds', brand: 'Volt', coll: ['audio', 'deals'], opts: [{ name: 'Colour', values: [['White', '#F5F5F5'], ['Black', '#1F2937']] }], badges: ['Best seller'], desc: '<p>Active noise cancellation, 30 hours with the case and a low-latency game mode.</p><ul><li>Bluetooth 5.3</li><li>IPX4 sweat resistant</li><li>Type-C fast charging</li></ul>', rating: [4.7, 312], stock: 3 },
    { t: 'AirMax Over-Ear Headphones', price: 24500, img: ['1609081219090-a6d81d3085bf'], cat: 'Headphones', brand: 'Volt', coll: ['audio'], opts: [{ name: 'Colour', values: [['Silver', '#D1D5DB'], ['Space Grey', '#4B5563']] }], desc: '<p>Studio sound with spatial audio and 40-hour battery.</p>', rating: [4.8, 96] },
    { t: 'Bass X Wireless Headphones', price: 6499, was: 7999, img: ['1505740420928-5e560c06d30e'], cat: 'Headphones', brand: 'SoundCore', coll: ['audio', 'deals'], desc: '<p>Deep bass, foldable design, 50-hour playtime.</p>', rating: [4.5, 204] },
    { t: 'Studio Wired Headphones', price: 3299, img: ['1583394838336-acd977736f90'], cat: 'Headphones', brand: 'SoundCore', coll: ['audio'], desc: '<p>Closed-back monitors for music and calls.</p>', rating: [4.4, 71] },
    { t: 'Pulse Smart Watch S9', price: 9999, img: ['1546868871-7041f2a55e12'], cat: 'Smart watches', brand: 'Pulse', coll: ['wearables', 'deals'], opts: [{ name: 'Size', values: [['41 mm'], ['45 mm']] }], desc: '<p>AMOLED display, heart rate, SpO2, Bluetooth calling.</p>', rating: [4.6, 158] },
    { t: 'Minimal Smart Watch, White', price: 7499, img: ['1523275335684-37898b6baf30'], cat: 'Smart watches', brand: 'Pulse', coll: ['wearables'], desc: '<p>Slim smart watch with 10-day battery.</p>', rating: [4.3, 44] },
    { t: 'iPhone 15, PTA Approved', price: 289999, img: ['1511707171634-5f897ff02aa9'], cat: 'Phones', brand: 'Apple', coll: ['phones-tablets'], opts: [{ name: 'Storage', values: [['128 GB'], ['256 GB']] }], desc: '<p>PTA approved with official warranty.</p>', rating: [4.9, 37] },
    { t: 'MacBook Air M3, 13-inch', price: 379000, img: ['1496181133206-80ce9b88a853'], cat: 'Laptops', brand: 'Apple', coll: ['laptops'], avail: 'backorder', lead: 'Ships in 5 to 7 days', desc: '<p>8-core M3, 16 GB memory, 512 GB SSD.</p>', rating: [5, 12] },
    { t: 'ProBook 14 Business Laptop', price: 164999, img: ['1588872657578-7efd1f1555ed'], cat: 'Laptops', brand: 'HP', coll: ['laptops'], desc: '<p>Core i5 13th gen, 16 GB RAM, 512 GB SSD, backlit keyboard.</p>', rating: [4.5, 23] },
    { t: 'Tab 11 Pro with Pencil', price: 119999, img: ['1544244015-0df4b3ffc6b0'], cat: 'Tablets', brand: 'Volt', coll: ['phones-tablets'], desc: '<p>11-inch 120 Hz display and stylus included.</p>', rating: [4.6, 31] },
    { t: '55-inch 4K Smart Google TV', price: 139999, was: 159999, img: ['1593359677879-a4bb92f829d1'], cat: 'TVs', brand: 'Volt', coll: ['deals'], desc: '<p>4K HDR, Google TV, Dolby Audio.</p>', rating: [4.7, 58] },
    { t: 'Buds Neo True Wireless', price: 3999, img: ['1606220588913-b3aacb4d2f46'], cat: 'Earbuds', brand: 'Volt', coll: ['audio'], avail: 'out_of_stock', desc: '<p>Everyday earbuds with clear calls.</p>', rating: [4.2, 140] },
  ],
  home: [
    sec('ss', 'slideshow', { autoplay: true, speed: 6, height: 'medium' }, [
      blk('s1', 'slide', { image: img('1609081219090-a6d81d3085bf', 2200), heading: 'Hear every detail', text: 'AirMax over-ear with spatial audio. Rs 24,500 with 1-year warranty.', buttonLabel: 'Shop audio', buttonLink: '/collections/audio', align: 'left', overlay: 45 }),
      blk('s2', 'slide', { image: img('1593359677879-a4bb92f829d1', 2200), heading: 'Big screen deals', text: '55-inch 4K Google TV, now Rs 20,000 off.', buttonLabel: 'See deals', buttonLink: '/collections/deals', align: 'left', overlay: 50 }),
    ]),
    sec('tb', 'trust_badges', {}, [
      blk('t1', 'badge', { icon: 'original', title: '100% original', text: 'Official warranty' }),
      blk('t2', 'badge', { icon: 'cod', title: 'Cash on Delivery', text: 'Check, then pay' }),
      blk('t3', 'badge', { icon: 'truck', title: 'Fast delivery', text: 'Lahore next day' }),
      blk('t4', 'badge', { icon: 'shield', title: 'Secure payments', text: 'JazzCash, Easypaisa, cards' }),
    ]),
    sec('cats', 'collection_list', { heading: 'Shop by category', shape: 'circle' }, [
      blk('c1', 'collection', { collection: 'audio' }),
      blk('c2', 'collection', { collection: 'wearables' }),
      blk('c3', 'collection', { collection: 'phones-tablets' }),
      blk('c4', 'collection', { collection: 'laptops' }),
      blk('c5', 'collection', { collection: 'deals' }),
    ]),
    sec('fc', 'featured_collection', { heading: 'Today’s deals', collection: 'deals', limit: 4, columns: 4, showViewAll: true }),
    sec('ban', 'banner_cta', { image: img('1572569511254-d8f925fe2cbb', 2000), heading: 'Volt Pods Pro', text: 'Noise cancelling that costs less than a dinner out. Now Rs 8,999.', buttonLabel: 'Buy now', buttonLink: '/products/volt-pods-pro-anc-earbuds', align: 'left', height: 'medium', overlay: 40 }),
    sec('pc', 'product_carousel', { heading: 'Audio best sellers', collection: 'audio', limit: 8 }),
    sec('logos', 'brand_logos', { heading: 'Official brands' }, [
      blk('l1', 'logo', { name: 'Apple' }),
      blk('l2', 'logo', { name: 'Samsung' }),
      blk('l3', 'logo', { name: 'HP' }),
      blk('l4', 'logo', { name: 'Anker' }),
      blk('l5', 'logo', { name: 'Xiaomi' }),
      blk('l6', 'logo', { name: 'Lenovo' }),
    ]),
    sec('faq', 'faq', { heading: 'Questions before you buy' }, [
      blk('f1', 'question', { question: 'Are your products original?', answer: 'Yes. Every product is sourced from official distributors and comes with the brand warranty card.' }),
      blk('f2', 'question', { question: 'Can I check the parcel before paying?', answer: 'For Cash on Delivery orders you can check the outer box and seal with the rider before paying.' }),
      blk('f3', 'question', { question: 'How long does delivery take?', answer: 'Lahore next working day, other cities 2 to 4 working days.' }),
    ]),
  ],
};

// ─── Taza Bazaar (grocery) ─────────────────────────────────────────────────
const bazaar: MockStore = {
  slug: 'bazaar',
  name: 'Taza Bazaar',
  themeId: 'grocery',
  tagline: 'Fresh groceries at your door',
  whatsapp: '03331234567',
  email: 'orders@tazabazaar.pk',
  address: 'Plot 7, Block 13-D, Gulshan-e-Iqbal, Karachi',
  announcement: ['Same-day delivery in Karachi on orders before 2pm', 'Free delivery above Rs 3,000'],
  footerAbout: 'Taza Bazaar brings fresh fruit, vegetables and daily groceries from trusted farms and mills to your kitchen.',
  collections: [
    { handle: 'fruits-vegetables', title: 'Fruits & Vegetables', image: img('1610832958506-aa56368176cf', 700), desc: 'Picked this morning.' },
    { handle: 'rice-atta', title: 'Rice & Atta', image: img('1586201375761-83865001e31c', 700), desc: 'Basmati, sella and chakki atta.' },
    { handle: 'dairy-bakery', title: 'Dairy & Bakery', image: img('1550583724-b2692b85b150', 700), desc: 'Milk, bread and eggs.' },
    { handle: 'spices', title: 'Spices & Tea', image: img('1596040033229-a9821ebd058d', 700), desc: 'Whole and ground masala.' },
    { handle: 'oils', title: 'Oils & Ghee', image: img('1474979266404-7eaacbcd87c5', 700), desc: 'Cooking oil and desi ghee.' },
  ],
  products: [
    { t: 'Super Kernel Basmati Rice', price: 2150, was: 2400, img: ['1586201375761-83865001e31c'], cat: 'Rice', brand: 'Guard', coll: ['rice-atta'], opts: [{ name: 'Weight', values: [['1 kg'], ['5 kg'], ['10 kg']] }], badges: ['Best price'], desc: '<p>Aged extra-long grain basmati. Cooks fluffy and separate.</p>', rating: [4.8, 412] },
    { t: 'Fresh Seasonal Fruit Box, 3 kg', price: 1850, img: ['1610832958506-aa56368176cf'], cat: 'Fruit', coll: ['fruits-vegetables'], desc: '<p>A mix of the best fruit in season, hand picked.</p>', rating: [4.6, 89] },
    { t: 'Extra Virgin Olive Oil, 1 L', price: 3250, img: ['1474979266404-7eaacbcd87c5'], cat: 'Oil', brand: 'Sasso', coll: ['oils'], desc: '<p>Cold pressed, for salads and light cooking.</p>', rating: [4.7, 66] },
    { t: 'Farm Fresh Milk, 1 L', price: 230, img: ['1550583724-b2692b85b150'], cat: 'Dairy', coll: ['dairy-bakery'], desc: '<p>Pasteurised whole milk from local farms.</p>', rating: [4.5, 301] },
    { t: 'Desi Whole Wheat Bread', price: 280, img: ['1509440159596-0249088772ff'], cat: 'Bakery', coll: ['dairy-bakery'], badges: ['Baked today'], desc: '<p>Soft whole wheat loaf, no preservatives.</p>', rating: [4.4, 120] },
    { t: 'Whole Garam Masala Pack', price: 650, img: ['1596040033229-a9821ebd058d'], cat: 'Spices', brand: 'Shan', coll: ['spices'], desc: '<p>Cardamom, cloves, cinnamon, black pepper and bay leaf.</p>', rating: [4.8, 77] },
    { t: 'Watermelon, about 4 kg', price: 520, img: ['1587049352846-4a222e784d38'], cat: 'Fruit', coll: ['fruits-vegetables'], avail: 'out_of_stock', desc: '<p>Sweet and juicy, sold per piece.</p>' },
    { t: 'Mixed Vegetable Basket, 2 kg', price: 750, was: 900, img: ['1557844352-761f2565b576'], cat: 'Vegetables', coll: ['fruits-vegetables'], desc: '<p>Broccoli, beans, carrots, cucumbers and greens.</p>', rating: [4.5, 143] },
    { t: 'Herbal Green Tea, 100 g', price: 890, img: ['1615485500704-8e990f9900f7'], cat: 'Tea', brand: 'Tapal', coll: ['spices'], desc: '<p>Loose-leaf green tea with mint and lemongrass.</p>', rating: [4.3, 48] },
    { t: 'Organic Veggie Box, Large', price: 1450, img: ['1488459716781-31db52582fe9'], cat: 'Vegetables', coll: ['fruits-vegetables'], badges: ['Organic'], desc: '<p>Seasonal organic vegetables for a family of four, for one week.</p>', rating: [4.7, 62] },
  ],
  home: [
    sec('hero', 'hero', { image: img('1542838132-92c53300491e', 2200), heading: 'Fresh groceries, delivered today', text: 'Fruit, vegetables, rice and daily needs from trusted farms. Order before 2pm for same-day delivery in Karachi.', buttonLabel: 'Start shopping', buttonLink: '/collections/all', align: 'left', height: 'medium', overlay: 50 }),
    sec('cats', 'collection_list', { heading: 'Shop by aisle', shape: 'circle' }, [
      blk('c1', 'collection', { collection: 'fruits-vegetables' }),
      blk('c2', 'collection', { collection: 'rice-atta' }),
      blk('c3', 'collection', { collection: 'dairy-bakery' }),
      blk('c4', 'collection', { collection: 'spices' }),
      blk('c5', 'collection', { collection: 'oils' }),
    ]),
    sec('fc', 'featured_collection', { heading: 'Fresh today', collection: 'fruits-vegetables', limit: 5, columns: 5, showViewAll: true }),
    sec('ban', 'banner_cta', { image: img('1488459716781-31db52582fe9', 2000), heading: 'Weekly veggie box', text: 'Organic vegetables for the whole week. Rs 1,450, delivered every Saturday.', buttonLabel: 'Order the box', buttonLink: '/products/organic-veggie-box-large', align: 'left', height: 'small', overlay: 45 }),
    sec('fc2', 'featured_collection', { heading: 'Pantry essentials', collection: 'rice-atta', limit: 10, columns: 5, showViewAll: true }),
    sec('tb', 'trust_badges', {}, [
      blk('t1', 'badge', { icon: 'truck', title: 'Same-day delivery', text: 'Karachi, before 2pm' }),
      blk('t2', 'badge', { icon: 'cod', title: 'Cash on Delivery', text: 'Or pay with Easypaisa' }),
      blk('t3', 'badge', { icon: 'returns', title: 'Freshness promise', text: 'Not fresh? Free return' }),
      blk('t4', 'badge', { icon: 'whatsapp', title: 'Order on WhatsApp', text: 'Send your list' }),
    ]),
    sec('nl', 'newsletter', { heading: 'Weekly deals on WhatsApp', text: 'Get the Friday price list before anyone else.', collect: 'whatsapp' }),
  ],
};

// ─── Glow (beauty) ─────────────────────────────────────────────────────────
const glow: MockStore = {
  slug: 'glow',
  name: 'Glow Beauty',
  themeId: 'beauty',
  tagline: 'Skincare that works in Pakistani weather',
  whatsapp: '03451234567',
  email: 'care@glowbeauty.pk',
  address: 'F-7 Markaz, Islamabad',
  announcement: ['Free gift on orders above Rs 4,000', 'Cash on Delivery all over Pakistan'],
  footerAbout: 'Glow Beauty makes gentle, dermatologist-tested skincare for humid summers and dry winters. Cruelty free.',
  collections: [
    { handle: 'skincare', title: 'Skincare', image: img('1617897903246-719242758050', 900), desc: 'Serums, cleansers and moisturisers.' },
    { handle: 'makeup', title: 'Makeup', image: img('1596462502278-27bfdc403348', 900), desc: 'Everyday colour.' },
    { handle: 'hair-body', title: 'Hair & Body', image: img('1620916566398-39f1143ab7be', 900), desc: 'Masks, oils and lotions.' },
    { handle: 'bestsellers', title: 'Best Sellers', image: img('1612817288484-6f916006741a', 900), desc: 'Most loved.' },
    { handle: 'gift-sets', title: 'Gift Sets', image: img('1598440947619-2c35fc9aa908', 900), desc: 'Ready to gift.' },
  ],
  products: [
    { t: 'Hydra Glow Vitamin C Serum, 30 ml', price: 2450, was: 2950, img: ['1617897903246-719242758050', '1612817288484-6f916006741a'], cat: 'Serum', brand: 'Glow', coll: ['skincare', 'bestsellers'], badges: ['Best seller'], desc: '<p>15% vitamin C with hyaluronic acid for brighter, even skin. Light, non-sticky, made for humid weather.</p>', rating: [4.8, 534], stock: 6 },
    { t: 'Amber Botanical Face Oil', price: 2950, img: ['1612817288484-6f916006741a'], cat: 'Face oil', brand: 'Glow', coll: ['skincare'], desc: '<p>Rosehip and squalane for dry winter skin.</p>', rating: [4.7, 122] },
    { t: 'Everyday Makeup Kit', price: 4950, img: ['1596462502278-27bfdc403348'], cat: 'Makeup', brand: 'Glow', coll: ['makeup', 'gift-sets'], opts: [{ name: 'Shade', values: [['Fair', '#F1D3BC'], ['Medium', '#D6A47F'], ['Deep', '#9C6644']] }], desc: '<p>Blush, highlighter, lip tint and brushes in one pouch.</p>', rating: [4.6, 88] },
    { t: 'Gentle Foaming Cleanser, 150 ml', price: 1650, img: ['1631729371254-42c2892f0e6e'], cat: 'Cleanser', brand: 'Glow', coll: ['skincare', 'bestsellers'], desc: '<p>Low-pH cleanser that removes sunscreen without drying.</p>', rating: [4.7, 301] },
    { t: 'Restorative Hair Mask, 200 ml', price: 1950, img: ['1608248543803-ba4f8c70ae0b'], cat: 'Hair', coll: ['hair-body'], desc: '<p>Weekly mask for frizz and heat damage.</p>', rating: [4.5, 76] },
    { t: 'Daily Body Lotion, 250 ml', price: 1450, img: ['1620916566398-39f1143ab7be'], cat: 'Body', coll: ['hair-body'], desc: '<p>Fast-absorbing lotion with shea and niacinamide.</p>', rating: [4.4, 95] },
    { t: 'Clear Skin Night Cream', price: 2250, img: ['1571781926291-c477ebfd024b'], cat: 'Moisturiser', coll: ['skincare'], avail: 'backorder', lead: 'New batch ships in 4 days', desc: '<p>Retinol night cream for clearer skin.</p>', rating: [4.6, 64] },
    { t: 'Barrier Repair Moisturiser', price: 2750, img: ['1556228578-8c89e6adf883'], cat: 'Moisturiser', coll: ['skincare', 'bestsellers'], desc: '<p>Ceramides and panthenol for a calm, strong skin barrier.</p>', rating: [4.8, 210] },
    { t: 'Skincare Discovery Set', price: 5950, was: 7200, img: ['1598440947619-2c35fc9aa908'], cat: 'Gift set', coll: ['gift-sets'], badges: ['Gift ready'], desc: '<p>Travel sizes of our five best sellers in a gift box.</p>', rating: [4.9, 57] },
  ],
  home: [
    sec('hero', 'hero', { image: img('1596462502278-27bfdc403348', 2200), heading: 'Your skin, but glowing', text: 'Gentle skincare made for Pakistani summers. Dermatologist tested, cruelty free.', buttonLabel: 'Shop best sellers', buttonLink: '/collections/bestsellers', align: 'left', height: 'large', overlay: 20, textColor: 'dark' }),
    sec('tb', 'trust_badges', {}, [
      blk('t1', 'badge', { icon: 'cod', title: 'Cash on Delivery', text: 'All over Pakistan' }),
      blk('t2', 'badge', { icon: 'original', title: 'Dermatologist tested', text: 'Safe for sensitive skin' }),
      blk('t3', 'badge', { icon: 'returns', title: 'Easy returns', text: 'Unopened, within 7 days' }),
    ]),
    sec('fc', 'featured_collection', { heading: 'Best sellers', text: 'The ones everyone comes back for', collection: 'bestsellers', limit: 4, columns: 4, showViewAll: true }),
    sec('iwt', 'image_with_text', { image: img('1617897903246-719242758050', 1400), heading: 'Vitamin C, done right', text: '<p>Our Hydra Glow serum pairs 15% vitamin C with hyaluronic acid in a water-light base that does not feel heavy in humid weather. Most customers see brighter skin in four weeks.</p>', buttonLabel: 'Shop the serum', buttonLink: '/products/hydra-glow-vitamin-c-serum-30-ml', imagePosition: 'right', background: 'surface' }),
    sec('cats', 'collection_list', { heading: 'Shop by concern', shape: 'portrait' }, [
      blk('c1', 'collection', { collection: 'skincare' }),
      blk('c2', 'collection', { collection: 'makeup' }),
      blk('c3', 'collection', { collection: 'hair-body' }),
      blk('c4', 'collection', { collection: 'gift-sets' }),
    ]),
    sec('tm', 'testimonials', { heading: 'Real results' }, [
      blk('q1', 'testimonial', { quote: 'My dark spots faded in a month. It does not pill under sunscreen either.', author: 'Mahnoor A.', city: 'Lahore', rating: 5 }),
      blk('q2', 'testimonial', { quote: 'The cleanser is so gentle. My sensitive skin finally feels calm.', author: 'Zainab S.', city: 'Peshawar', rating: 5 }),
      blk('q3', 'testimonial', { quote: 'Arrived in two days with a sweet handwritten note. Lovely packaging.', author: 'Fatima N.', city: 'Faisalabad', rating: 5 }),
    ]),
    sec('rt', 'rich_text', { heading: 'Clean, kind, made for you', text: '<p>No parabens, no harsh fragrance, never tested on animals. Every formula is checked by a dermatologist in Islamabad.</p>', align: 'center' }),
    sec('nl', 'newsletter', { heading: 'Get 10% off your first order', text: 'Join on WhatsApp for skincare tips and early access to new launches.', collect: 'whatsapp' }),
  ],
};

export const MOCK_STORES: MockStore[] = [libaas, volt, bazaar, glow];

export function mockMenus(store: MockStore): Record<string, MenuItem[]> {
  const m = (title: string, url: string, children: MenuItem[] = []): MenuItem => ({ id: `${title}-${url}`, title, type: 'url', ref: null, url, children });
  return {
    'main-menu': [
      m('Home', '/'),
      m('Shop', '/collections/all', store.collections.map((c) => m(c.title, `/collections/${c.handle}`))),
      ...store.collections.slice(0, 3).map((c) => m(c.title, `/collections/${c.handle}`)),
      m('About', '/pages/about'),
    ],
    footer: [
      m('Shop', '/collections/all', store.collections.map((c) => m(c.title, `/collections/${c.handle}`))),
      m('Help', '/pages/contact', [m('Contact us', '/pages/contact'), m('FAQ', '/pages/faq'), m('Track order', '/account/track'), m('About us', '/pages/about')]),
    ],
  };
}

export function mockTheme(store: MockStore): ThemeDoc {
  const preset = THEMES[store.themeId];
  return {
    themeId: store.themeId,
    tokens: preset.tokens,
    global: {
      announcement: sec('ann', 'announcement_bar', { autoplay: true, speed: 5 }, store.announcement.map((text, i) => blk(`m${i}`, 'message', { text }))),
      header: sec('header', 'header', { sticky: true, menu: 'main-menu', showSearch: true, showAccount: true }),
      footer: sec('footer', 'footer', { about: store.footerAbout, menu: 'footer', showNewsletter: true, showPayments: true, showSocial: true }),
    },
    templates: {
      home: { sections: store.home },
      product: {
        sections: [
          sec('main', 'main_product', { gallery: 'thumbs', zoom: true }, [
            ...PRODUCT_BLOCKS.slice(0, 10),
            { id: 'b-desc', type: 'description', settings: { open: true } },
            ...PRODUCT_BLOCKS.slice(10),
          ]),
          sec('together', 'bought_together', {}),
          sec('reviews', 'product_reviews', {}),
          sec('related', 'product_recommendations', { limit: 8 }),
        ],
      },
    },
  };
}
