/**
 * Theme sections: what each section and block can hold. One list serves the
 * merchant editor (settings forms) and the storefront (rendering), and the
 * API checks every saved theme against it.
 */

export type FieldType = 'text' | 'textarea' | 'richtext' | 'image' | 'color' | 'select' | 'range' | 'checkbox' | 'url' | 'collection' | 'product' | 'products' | 'video' | 'date' | 'number';

export interface SettingField {
  key: string;
  type: FieldType;
  label: string;
  default?: unknown;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  help?: string;
  translatable?: boolean;
}

export type TemplateKey = 'home' | 'product' | 'collection' | 'search' | 'cart' | 'page' | 'blog' | 'article' | 'account' | 'not_found';
export const TEMPLATE_KEYS: TemplateKey[] = ['home', 'product', 'collection', 'search', 'cart', 'page', 'blog', 'article', 'account', 'not_found'];

export interface BlockSchema { type: string; label: string; settings: SettingField[]; limit?: number }
export interface SectionSchema {
  type: string;
  label: string;
  icon: string;
  category: 'header' | 'content' | 'products' | 'trust' | 'media' | 'footer' | 'main';
  settings: SettingField[];
  blocks: BlockSchema[];
  maxBlocks: number;
  templates: TemplateKey[] | 'all';
  /** At most one per template. */
  singleton?: boolean;
  /** Global section (announcement, header, footer): lives in doc.global, not in templates. */
  global?: boolean;
}

// ─── field helpers ───────────────────────────────────────────

const text = (key: string, label: string, def = '', extra: Partial<SettingField> = {}): SettingField => ({ key, type: 'text', label, default: def, translatable: true, ...extra });
const area = (key: string, label: string, def = ''): SettingField => ({ key, type: 'textarea', label, default: def, translatable: true });
const rich = (key: string, label: string, def = ''): SettingField => ({ key, type: 'richtext', label, default: def, translatable: true });
const image = (key: string, label: string): SettingField => ({ key, type: 'image', label, default: null });
const url = (key: string, label: string, def = ''): SettingField => ({ key, type: 'url', label, default: def });
const check = (key: string, label: string, def = false): SettingField => ({ key, type: 'checkbox', label, default: def });
const color = (key: string, label: string, def: string | null = null): SettingField => ({ key, type: 'color', label, default: def });
const range = (key: string, label: string, min: number, max: number, def: number, step = 1, unit?: string): SettingField => ({ key, type: 'range', label, min, max, default: def, step, ...(unit && { unit }) });
const select = (key: string, label: string, opts: Array<[string, string]>, def?: string): SettingField => ({ key, type: 'select', label, options: opts.map(([value, l]) => ({ value, label: l })), default: def ?? opts[0][0] });
const collection = (key = 'collection', label = 'Collection'): SettingField => ({ key, type: 'collection', label, default: null });
const product = (key = 'product', label = 'Product'): SettingField => ({ key, type: 'product', label, default: null });

const heading = (def = '') => text('heading', 'Heading', def);
const subheading = (def = '') => area('subheading', 'Text', def);
const button = (labelDef = 'Shop now', linkDef = '/collections/all') => [text('buttonLabel', 'Button label', labelDef), url('buttonLink', 'Button link', linkDef)];
const colorScheme = select('colorScheme', 'Colours', [['default', 'Default'], ['inverse', 'Dark'], ['accent', 'Brand colour'], ['muted', 'Soft']]);
const padding = select('padding', 'Space above and below', [['normal', 'Normal'], ['small', 'Small'], ['large', 'Large'], ['none', 'None']]);
const width = select('width', 'Width', [['page', 'Page width'], ['full', 'Full width']]);
const align = select('align', 'Text position', [['center', 'Centre'], ['left', 'Left'], ['right', 'Right']]);
const common = [colorScheme, padding];

// ─── sections ────────────────────────────────────────────────

export const SECTIONS: SectionSchema[] = [
  {
    type: 'announcement_bar', label: 'Announcement bar', icon: 'megaphone', category: 'header', templates: 'all', global: true, singleton: true, maxBlocks: 5,
    settings: [colorScheme, check('autoplay', 'Rotate messages', true), range('speed', 'Change every', 3, 10, 5, 1, 's')],
    blocks: [{ type: 'message', label: 'Message', settings: [text('text', 'Message', 'Cash on delivery all over Pakistan'), url('link', 'Link')] }],
  },
  {
    type: 'header', label: 'Header', icon: 'layout-top', category: 'header', templates: 'all', global: true, singleton: true, maxBlocks: 0,
    settings: [
      select('layout', 'Layout', [['logo_left', 'Logo left, menu centre'], ['logo_center', 'Logo centre'], ['logo_left_menu_left', 'Logo and menu left']]),
      { key: 'menu', type: 'select', label: 'Menu', options: [{ value: 'main-menu', label: 'Main menu' }], default: 'main-menu' },
      check('sticky', 'Stay on top while scrolling', true), check('showSearch', 'Search', true), check('showAccount', 'Account icon', true),
      check('transparentOnHome', 'See-through on the home page', false), colorScheme,
    ],
    blocks: [],
  },
  {
    type: 'hero', label: 'Hero banner', icon: 'image', category: 'content', templates: ['home', 'collection', 'page'], maxBlocks: 0,
    settings: [image('image', 'Image'), image('mobileImage', 'Mobile image'), heading('New collection is here'), subheading('Fresh styles, delivered all over Pakistan'), ...button(),
      align, select('height', 'Height', [['medium', 'Medium'], ['small', 'Small'], ['large', 'Large'], ['full', 'Full screen']]), range('overlay', 'Image darkness', 0, 80, 20, 5, '%'), colorScheme],
    blocks: [],
  },
  {
    type: 'slideshow', label: 'Slideshow', icon: 'images', category: 'content', templates: ['home', 'collection', 'page'], maxBlocks: 8,
    settings: [check('autoplay', 'Change slides by itself', true), range('speed', 'Change every', 3, 10, 5, 1, 's'), select('height', 'Height', [['medium', 'Medium'], ['small', 'Small'], ['large', 'Large']]), width],
    blocks: [{ type: 'slide', label: 'Slide', settings: [image('image', 'Image'), image('mobileImage', 'Mobile image'), heading(''), subheading(''), ...button(), align, range('overlay', 'Image darkness', 0, 80, 20, 5, '%')] }],
  },
  {
    type: 'featured_collection', label: 'Featured collection', icon: 'grid', category: 'products', templates: 'all', maxBlocks: 0,
    settings: [heading('Best sellers'), subheading(''), collection(), range('limit', 'Products to show', 2, 24, 8), range('columns', 'Products per row (desktop)', 2, 6, 4), range('mobileColumns', 'Products per row (mobile)', 1, 2, 2),
      check('showViewAll', '"View all" button', true), check('quickAdd', 'Quick add to cart', true), ...common],
    blocks: [],
  },
  {
    type: 'product_carousel', label: 'Product slider', icon: 'arrows-horizontal', category: 'products', templates: 'all', maxBlocks: 0,
    settings: [heading('New arrivals'), select('source', 'Products from', [['collection', 'A collection'], ['newest', 'Newest'], ['best_selling', 'Best selling'], ['on_sale', 'On sale'], ['manual', 'Pick products']]),
      collection(), { key: 'products', type: 'products', label: 'Products', default: [] }, range('limit', 'Products to show', 4, 24, 12), ...common],
    blocks: [],
  },
  {
    type: 'collection_list', label: 'Collection list', icon: 'squares', category: 'products', templates: ['home', 'page', 'collection'], maxBlocks: 12,
    settings: [heading('Shop by category'), range('columns', 'Per row (desktop)', 2, 6, 4), select('shape', 'Image shape', [['square', 'Square'], ['circle', 'Circle'], ['portrait', 'Tall']]), ...common],
    blocks: [{ type: 'collection', label: 'Collection', settings: [collection(), image('image', 'Image (optional)'), text('title', 'Title (optional)')] }],
  },
  {
    type: 'image_with_text', label: 'Image with text', icon: 'layout-split', category: 'content', templates: 'all', maxBlocks: 0,
    settings: [image('image', 'Image'), select('imagePosition', 'Image on', [['left', 'Left'], ['right', 'Right']]), heading('Made for you'), rich('text', 'Text', '<p>Tell your customers what makes your products special.</p>'), ...button('Learn more', '/pages/about'), ...common],
    blocks: [],
  },
  {
    type: 'banner_cta', label: 'Banner with button', icon: 'rectangle', category: 'content', templates: 'all', maxBlocks: 0,
    settings: [image('image', 'Background image'), heading('Free delivery on orders over Rs 3,000'), subheading(''), ...button(), align, ...common],
    blocks: [],
  },
  {
    type: 'testimonials', label: 'Customer reviews', icon: 'quote', category: 'trust', templates: 'all', maxBlocks: 12,
    settings: [heading('What our customers say'), check('fromNafaa', 'Also show real ratings from Nafaa orders', true), ...common],
    blocks: [{ type: 'testimonial', label: 'Review', settings: [area('quote', 'Review', 'Great quality and fast delivery!'), text('author', 'Name', 'Ayesha, Lahore'), range('rating', 'Stars', 1, 5, 5), image('image', 'Photo')] }],
  },
  {
    type: 'faq', label: 'Questions and answers', icon: 'help', category: 'content', templates: 'all', maxBlocks: 30,
    settings: [heading('Questions'), ...common],
    blocks: [{ type: 'question', label: 'Question', settings: [text('question', 'Question', 'Do you offer cash on delivery?'), rich('answer', 'Answer', '<p>Yes, all over Pakistan.</p>')] }],
  },
  {
    type: 'trust_badges', label: 'Trust badges', icon: 'shield', category: 'trust', templates: 'all', maxBlocks: 6,
    settings: [...common],
    blocks: [{ type: 'badge', label: 'Badge', settings: [
      select('icon', 'Icon', [['cod', 'Cash on delivery'], ['truck', 'Delivery'], ['return', 'Easy returns'], ['shield', 'Secure'], ['star', 'Quality'], ['support', 'Support'], ['custom', 'Own image']]),
      image('image', 'Own icon'), text('title', 'Title', 'Cash on delivery'), text('text', 'Text', 'Pay when you receive')] }],
  },
  {
    type: 'video', label: 'Video', icon: 'play', category: 'media', templates: 'all', maxBlocks: 0,
    settings: [heading(''), { key: 'videoUrl', type: 'video', label: 'YouTube or Vimeo link', default: '' }, image('cover', 'Cover image'), check('autoplay', 'Play without sound by itself', false), width, ...common],
    blocks: [],
  },
  {
    type: 'newsletter', label: 'Join our list', icon: 'mail', category: 'content', templates: 'all', maxBlocks: 0,
    settings: [heading('Get offers first'), subheading('Join our WhatsApp list for new arrivals and sales.'), select('collect', 'Ask for', [['whatsapp', 'WhatsApp number'], ['email', 'Email'], ['both', 'Either']]), text('buttonLabel', 'Button label', 'Join'), ...common],
    blocks: [],
  },
  {
    type: 'gallery', label: 'Photo gallery', icon: 'photo', category: 'media', templates: 'all', maxBlocks: 24,
    settings: [heading('Follow us on Instagram'), url('link', 'Link (e.g. your Instagram)'), range('columns', 'Per row (desktop)', 3, 8, 6), ...common],
    blocks: [{ type: 'image', label: 'Photo', settings: [image('image', 'Image'), url('link', 'Link'), product('product', 'Tag a product')] }],
  },
  {
    type: 'brand_logos', label: 'Brand logos', icon: 'badge', category: 'trust', templates: 'all', maxBlocks: 20,
    settings: [heading('Brands we carry'), check('grayscale', 'Grey logos', true), ...common],
    blocks: [{ type: 'logo', label: 'Logo', settings: [image('image', 'Logo'), text('name', 'Name'), url('link', 'Link')] }],
  },
  {
    type: 'countdown', label: 'Sale countdown', icon: 'clock', category: 'content', templates: 'all', maxBlocks: 0,
    settings: [heading('Sale ends in'), subheading('Up to 50% off'), { key: 'endsAt', type: 'date', label: 'Ends at', default: null }, ...button('Shop the sale', '/collections/sale'),
      check('hideWhenOver', 'Hide when the time is over', true), image('image', 'Background image'), ...common],
    blocks: [],
  },
  {
    type: 'rich_text', label: 'Text', icon: 'text', category: 'content', templates: 'all', maxBlocks: 0,
    settings: [heading(''), rich('text', 'Text', '<p>Share your story.</p>'), ...button('', ''), align, ...common],
    blocks: [],
  },
  // ─── template main sections ───
  {
    type: 'main_product', label: 'Product', icon: 'tag', category: 'main', templates: ['product'], singleton: true, maxBlocks: 20,
    settings: [select('galleryLayout', 'Pictures', [['thumbnails', 'Big picture with thumbnails'], ['grid', 'Grid'], ['slider', 'Slider']]), check('zoom', 'Zoom on click', true), check('stickyInfo', 'Keep details in view while scrolling', true),
      select('variantStyle', 'Size/colour picker', [['buttons', 'Buttons'], ['dropdown', 'Dropdown'], ['swatches', 'Colour swatches']])],
    blocks: [
      { type: 'title', label: 'Title', settings: [], limit: 1 },
      { type: 'price', label: 'Price', settings: [check('showSaving', 'Show "You save Rs …"', true)], limit: 1 },
      { type: 'badges', label: 'Badges', settings: [], limit: 1 },
      { type: 'variant_picker', label: 'Size / colour', settings: [], limit: 1 },
      { type: 'quantity', label: 'Quantity', settings: [], limit: 1 },
      { type: 'buy_buttons', label: 'Buy buttons', settings: [check('showBuyNow', '"Buy now" button', true)], limit: 1 },
      { type: 'whatsapp_order', label: 'Order on WhatsApp', settings: [text('label', 'Button label', 'Order on WhatsApp')], limit: 1 },
      { type: 'stock_message', label: 'Stock message', settings: [range('lowStock', 'Show "only few left" below', 0, 20, 5)], limit: 1 },
      { type: 'delivery_eta', label: 'Delivery estimate', settings: [check('askCity', 'Ask the city', true)], limit: 1 },
      { type: 'description', label: 'Description', settings: [check('collapsed', 'Folded', false)], limit: 1 },
      { type: 'tabs', label: 'Tabs', settings: [], limit: 1 },
      { type: 'size_chart', label: 'Size chart', settings: [text('label', 'Link text', 'Size chart')], limit: 1 },
      { type: 'share', label: 'Share', settings: [], limit: 1 },
      { type: 'trust_icons', label: 'Trust icons', settings: [check('cod', 'Cash on delivery', true), check('delivery', 'Delivery all over Pakistan', true), check('returns', 'Easy returns', true)], limit: 1 },
      { type: 'custom_text', label: 'Text', settings: [rich('text', 'Text', '')] },
    ],
  },
  {
    type: 'product_recommendations', label: 'You may also like', icon: 'sparkles', category: 'products', templates: ['product', 'cart'], maxBlocks: 0,
    settings: [heading('You may also like'), range('limit', 'Products', 2, 12, 4), ...common],
    blocks: [],
  },
  {
    type: 'bought_together', label: 'Bought together', icon: 'link', category: 'products', templates: ['product', 'cart'], maxBlocks: 0,
    settings: [heading('Customers also bought'), range('limit', 'Products', 2, 8, 4), ...common],
    blocks: [],
  },
  {
    type: 'product_reviews', label: 'Product reviews', icon: 'star', category: 'trust', templates: ['product'], singleton: true, maxBlocks: 0,
    settings: [heading('Reviews'), check('hideWhenEmpty', 'Hide when there are no reviews', true), ...common],
    blocks: [],
  },
  {
    type: 'main_collection', label: 'Product list', icon: 'grid', category: 'main', templates: ['collection'], singleton: true, maxBlocks: 0,
    settings: [range('perPage', 'Products per page', 8, 48, 24, 4), range('columns', 'Per row (desktop)', 2, 5, 4), range('mobileColumns', 'Per row (mobile)', 1, 2, 2),
      check('filters', 'Filters', true), check('sort', 'Sorting', true), check('showBanner', 'Collection picture and text on top', true), check('quickAdd', 'Quick add to cart', true)],
    blocks: [],
  },
  {
    type: 'main_search', label: 'Search results', icon: 'search', category: 'main', templates: ['search'], singleton: true, maxBlocks: 0,
    settings: [range('perPage', 'Products per page', 8, 48, 24, 4), check('filters', 'Filters', true)],
    blocks: [],
  },
  {
    type: 'main_cart', label: 'Cart', icon: 'cart', category: 'main', templates: ['cart'], singleton: true, maxBlocks: 0,
    settings: [check('notes', 'Order note', true), check('freeShippingBar', 'Free delivery progress bar', true), check('coupon', 'Discount code box', true)],
    blocks: [],
  },
  { type: 'main_page', label: 'Page content', icon: 'file', category: 'main', templates: ['page'], singleton: true, maxBlocks: 0, settings: [select('width', 'Text width', [['narrow', 'Narrow'], ['wide', 'Wide']])], blocks: [] },
  { type: 'main_blog', label: 'Blog posts', icon: 'news', category: 'main', templates: ['blog'], singleton: true, maxBlocks: 0, settings: [range('perPage', 'Posts per page', 4, 24, 9), check('showImage', 'Pictures', true)], blocks: [] },
  { type: 'main_article', label: 'Blog post', icon: 'file-text', category: 'main', templates: ['article'], singleton: true, maxBlocks: 0, settings: [check('showImage', 'Picture on top', true), check('showDate', 'Date', true), check('showAuthor', 'Writer', true)], blocks: [] },
  { type: 'main_account', label: 'Account', icon: 'user', category: 'main', templates: ['account'], singleton: true, maxBlocks: 0, settings: [], blocks: [] },
  { type: 'not_found', label: 'Page not found', icon: 'alert', category: 'main', templates: ['not_found'], singleton: true, maxBlocks: 0, settings: [heading('Page not found'), subheading('The page you are looking for does not exist.'), ...button('Continue shopping', '/collections/all')], blocks: [] },
  {
    type: 'footer', label: 'Footer', icon: 'layout-bottom', category: 'footer', templates: 'all', global: true, singleton: true, maxBlocks: 6,
    settings: [check('showPayments', 'Payment icons', true), check('showSocial', 'Social links', true), check('showPolicies', 'Policy links', true), area('copyright', 'Bottom line', ''), colorScheme],
    blocks: [
      { type: 'menu', label: 'Menu', settings: [text('heading', 'Heading', 'Shop'), { key: 'menu', type: 'select', label: 'Menu', options: [{ value: 'footer', label: 'Footer menu' }], default: 'footer' }] },
      { type: 'text', label: 'Text', settings: [text('heading', 'Heading', 'About us'), rich('text', 'Text', '<p>Quality products, delivered all over Pakistan.</p>')] },
      { type: 'contact', label: 'Contact', settings: [text('heading', 'Heading', 'Contact')] },
      { type: 'newsletter', label: 'Join our list', settings: [text('heading', 'Heading', 'Get offers first')] },
    ],
  },
];

export const SECTION_BY_TYPE = new Map(SECTIONS.map((s) => [s.type, s]));
export const GLOBAL_SECTION_TYPES = ['announcement_bar', 'header', 'footer'] as const;

/** Main section every template must keep (cannot be removed, only configured). */
export const FIXED_SECTION: Partial<Record<TemplateKey, string>> = {
  product: 'main_product', collection: 'main_collection', search: 'main_search', cart: 'main_cart', page: 'main_page',
  blog: 'main_blog', article: 'main_article', account: 'main_account', not_found: 'not_found',
};

export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  home: 'Home page', product: 'Product page', collection: 'Collection page', search: 'Search', cart: 'Cart', page: 'Pages',
  blog: 'Blog', article: 'Blog post', account: 'Account', not_found: 'Page not found',
};

export const allowedIn = (s: SectionSchema, t: TemplateKey) => !s.global && (s.templates === 'all' ? s.category !== 'main' : s.templates.includes(t));

/** Google fonts the themes may use. */
export const FONTS = [
  'Inter', 'Poppins', 'Montserrat', 'Lato', 'Open Sans', 'Roboto', 'Nunito', 'Work Sans', 'DM Sans', 'Manrope', 'Outfit', 'Jost',
  'Playfair Display', 'Cormorant Garamond', 'Lora', 'Libre Baskerville', 'Marcellus', 'Bebas Neue', 'Oswald', 'Raleway',
  'Noto Nastaliq Urdu', 'Noto Naskh Arabic',
];

/** Default values of a section's settings (and of a block's). */
export function defaultsOf(fields: SettingField[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) if (f.default !== undefined) out[f.key] = f.default;
  return out;
}
