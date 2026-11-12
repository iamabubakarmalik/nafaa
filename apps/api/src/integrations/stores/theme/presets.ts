/**
 * The four starting themes. Each is a complete theme document built from the
 * section schema; the merchant's edits start from one of these. A section
 * whose collection is empty shows all products (newest first) on the storefront.
 */
import { TEMPLATE_KEYS, TemplateKey } from './section-schema';
import { Section, ThemeDoc, ThemeId, ThemeTokens, newSection } from './theme-doc';

export interface PresetMeta { id: ThemeId; name: string; description: string; industries: string[]; tokens: ThemeTokens }

export const PRESETS: PresetMeta[] = [
  {
    id: 'fashion', name: 'Libas', description: 'Clean, image-first look for clothing, shoes and accessories.', industries: ['clothing', 'fashion', 'shoes', 'jewellery', 'boutique'],
    tokens: {
      colors: { primary: '#111111', secondary: '#c8a97e', background: '#ffffff', surface: '#f7f5f2', text: '#1a1a1a', muted: '#6b6b6b', accent: '#c8a97e', sale: '#c0392b', border: '#e7e2dc' },
      fonts: { heading: 'Playfair Display', body: 'Inter' }, radius: 'none', spacing: 'roomy', buttonStyle: 'solid', cardStyle: 'plain',
    },
  },
  {
    id: 'electronics', name: 'Volt', description: 'Sharp, detail-rich layout for mobiles, gadgets and appliances.', industries: ['electronics', 'mobile', 'computers', 'appliances'],
    tokens: {
      colors: { primary: '#2563eb', secondary: '#0f172a', background: '#ffffff', surface: '#f1f5f9', text: '#0f172a', muted: '#64748b', accent: '#f59e0b', sale: '#dc2626', border: '#e2e8f0' },
      fonts: { heading: 'Manrope', body: 'Inter' }, radius: 'md', spacing: 'compact', buttonStyle: 'solid', cardStyle: 'bordered',
    },
  },
  {
    id: 'grocery', name: 'Bazaar', description: 'Friendly, fast-to-shop layout for grocery, agri and general stores.', industries: ['grocery', 'general', 'agri', 'pharmacy', 'bakery'],
    tokens: {
      colors: { primary: '#15803d', secondary: '#facc15', background: '#ffffff', surface: '#f0fdf4', text: '#14281d', muted: '#5f6f65', accent: '#f97316', sale: '#dc2626', border: '#dcefe2' },
      fonts: { heading: 'Poppins', body: 'Nunito' }, radius: 'lg', spacing: 'compact', buttonStyle: 'pill', cardStyle: 'shadow',
    },
  },
  {
    id: 'beauty', name: 'Glow', description: 'Soft, elegant look for beauty, skincare and cosmetics.', industries: ['beauty', 'cosmetics', 'skincare', 'perfume', 'salon'],
    tokens: {
      colors: { primary: '#be185d', secondary: '#fce7f3', background: '#fffafb', surface: '#fdf2f8', text: '#3b0a24', muted: '#8a5a72', accent: '#d4a373', sale: '#e11d48', border: '#f5d0e3' },
      fonts: { heading: 'Cormorant Garamond', body: 'DM Sans' }, radius: 'full', spacing: 'normal', buttonStyle: 'pill', cardStyle: 'plain',
    },
  },
];

const trust = () => newSection('trust_badges', {}, [
  { type: 'badge', settings: { icon: 'cod', title: 'Cash on delivery', text: 'Pay when you receive' } },
  { type: 'badge', settings: { icon: 'truck', title: 'Delivery all over Pakistan', text: 'Fast and tracked' } },
  { type: 'badge', settings: { icon: 'return', title: 'Easy returns', text: 'Within 7 days' } },
]);

function homeFor(id: ThemeId): Section[] {
  switch (id) {
    case 'fashion':
      return [
        newSection('slideshow', { height: 'large', width: 'full' }, [
          { type: 'slide', settings: { heading: 'New season, new you', subheading: 'Fresh arrivals every week', buttonLabel: 'Shop new arrivals' } },
          { type: 'slide', settings: { heading: 'Eid collection', subheading: 'Made for celebrations', buttonLabel: 'Explore' } },
        ]),
        newSection('collection_list', { heading: 'Shop by category', shape: 'portrait' }),
        newSection('featured_collection', { heading: 'New arrivals', limit: 8 }),
        newSection('image_with_text', { heading: 'Crafted with care' }),
        newSection('product_carousel', { heading: 'Best sellers', source: 'best_selling' }),
        trust(),
        newSection('testimonials', {}, [{ type: 'testimonial' }, { type: 'testimonial', settings: { quote: 'Exactly like the pictures. Will order again.', author: 'Sana, Karachi' } }]),
        newSection('gallery', {}),
        newSection('newsletter', {}),
      ];
    case 'electronics':
      return [
        newSection('hero', { heading: 'Latest gadgets at the best prices', subheading: 'Official warranty · Cash on delivery', height: 'medium', align: 'left' }),
        trust(),
        newSection('collection_list', { heading: 'Shop by category', shape: 'square', columns: 6 }),
        newSection('countdown', { heading: 'Flash sale', subheading: 'Limited stock at sale prices' }),
        newSection('product_carousel', { heading: 'Deals of the week', source: 'on_sale' }),
        newSection('featured_collection', { heading: 'New arrivals', columns: 5, limit: 10 }),
        newSection('brand_logos', {}),
        newSection('faq', {}, [
          { type: 'question', settings: { question: 'Do products come with warranty?', answer: '<p>Yes, every product comes with the warranty mentioned on its page.</p>' } },
          { type: 'question' },
        ]),
        newSection('newsletter', { collect: 'whatsapp' }),
      ];
    case 'grocery':
      return [
        newSection('banner_cta', { heading: 'Fresh groceries at your door', subheading: 'Order before 2 pm for same-day delivery', buttonLabel: 'Start shopping' }),
        newSection('collection_list', { heading: 'Categories', shape: 'circle', columns: 6 }),
        newSection('product_carousel', { heading: 'Daily essentials', source: 'best_selling' }),
        newSection('featured_collection', { heading: 'On sale today', limit: 12, columns: 6 }),
        trust(),
        newSection('rich_text', { heading: 'Why shop with us', text: '<p>Fair prices, fresh stock and quick delivery from your local store.</p>' }),
        newSection('newsletter', { collect: 'whatsapp' }),
      ];
    case 'beauty':
      return [
        newSection('hero', { heading: 'Glow every day', subheading: 'Skincare and makeup you will love', height: 'large' }),
        newSection('featured_collection', { heading: 'Best sellers', limit: 8 }),
        newSection('image_with_text', { heading: 'Clean ingredients', imagePosition: 'right' }),
        newSection('collection_list', { heading: 'Shop by concern', shape: 'circle' }),
        newSection('testimonials', {}, [{ type: 'testimonial', settings: { quote: 'My skin has never felt better!', author: 'Hira, Islamabad' } }, { type: 'testimonial' }]),
        trust(),
        newSection('video', {}),
        newSection('newsletter', {}),
      ];
  }
}

function productTemplate(): Section[] {
  return [
    newSection('main_product', {}, [
      { type: 'badges' }, { type: 'title' }, { type: 'price' }, { type: 'stock_message' }, { type: 'variant_picker' }, { type: 'size_chart' },
      { type: 'quantity' }, { type: 'buy_buttons' }, { type: 'whatsapp_order' }, { type: 'delivery_eta' }, { type: 'trust_icons' }, { type: 'description' }, { type: 'tabs' }, { type: 'share' },
    ]),
    newSection('bought_together', {}),
    newSection('product_reviews', {}),
    newSection('product_recommendations', {}),
  ];
}

export function presetDoc(id: ThemeId): ThemeDoc {
  const meta = PRESETS.find((p) => p.id === id) ?? PRESETS[0];
  const templates = {} as Record<TemplateKey, { sections: Section[] }>;
  for (const key of TEMPLATE_KEYS) templates[key] = { sections: [] };
  templates.home.sections = homeFor(meta.id);
  templates.product.sections = productTemplate();
  templates.collection.sections = [newSection('main_collection', {})];
  templates.search.sections = [newSection('main_search', {})];
  templates.cart.sections = [newSection('main_cart', {}), newSection('product_recommendations', { heading: 'Add these too' })];
  templates.page.sections = [newSection('main_page', {})];
  templates.blog.sections = [newSection('main_blog', {})];
  templates.article.sections = [newSection('main_article', {})];
  templates.account.sections = [newSection('main_account', {})];
  templates.not_found.sections = [newSection('not_found', {}), newSection('featured_collection', { heading: 'Popular right now', limit: 4 })];
  return {
    themeId: meta.id,
    tokens: JSON.parse(JSON.stringify(meta.tokens)),
    global: {
      announcement: newSection('announcement_bar', {}, [{ type: 'message' }, { type: 'message', settings: { text: 'Easy returns within 7 days' } }]),
      header: newSection('header', { layout: meta.id === 'fashion' || meta.id === 'beauty' ? 'logo_center' : 'logo_left' }),
      footer: newSection('footer', {}, [{ type: 'text' }, { type: 'menu' }, { type: 'contact' }, { type: 'newsletter' }]),
    },
    templates,
  };
}
