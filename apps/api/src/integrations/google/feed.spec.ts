import { backorderDate, FeedItem, localInventoryTsv, metaCatalogCsv, productFeedXml, validGtin } from './feed';

describe('Google feed', () => {
  it('GTIN check digit', () => {
    expect(validGtin('4006381333931')).toBe('4006381333931'); // mashhoor sahi EAN-13
    expect(validGtin('4006381333932')).toBeNull();
    expect(validGtin('2000000000015')).toBeNull(); // andar ka barcode
    expect(validGtin('ABC123')).toBeNull();
  });

  it('XML: escape, PKR price, identifier_exists', () => {
    const xml = productFeedXml({ title: 'Ali & Sons', link: 'https://x.pk', items: [{
      id: 'p1', title: 'Chai <Tapal> 950g', description: '', link: 'https://x.pk/p1', image: 'https://x.pk/i.jpg', extraImages: [],
      price: 1250, inStock: true, brand: null, gtin: null, mpn: null,
    }] });
    expect(xml).toContain('<title>Ali &amp; Sons</title>');
    expect(xml).toContain('<g:title>Chai &lt;Tapal&gt; 950g</g:title>');
    expect(xml).toContain('<g:price>1250.00 PKR</g:price>');
    expect(xml).toContain('<g:identifier_exists>no</g:identifier_exists>');
    expect(xml).toContain('<g:availability>in_stock</g:availability>');
  });

  it('local inventory TSV', () => {
    expect(localInventoryTsv([{ storeCode: 'LHR-1', id: 'p1', quantity: 3.7, price: 99.5 }, { storeCode: 'LHR-1', id: 'p2', quantity: -2, price: 10 }]))
      .toBe('store_code\tid\tquantity\tprice\tavailability\nLHR-1\tp1\t3\t99.50 PKR\tin_stock\nLHR-1\tp2\t0\t10.00 PKR\tout_of_stock\n');
  });

  const item = (o: Partial<FeedItem> = {}): FeedItem => ({
    id: 'p1', title: 'Lawn suit', description: '', link: 'https://x.pk/p1', image: 'https://x.pk/i.jpg', extraImages: [] as string[],
    price: 3000, inStock: false, brand: 'Ali', gtin: null, mpn: 'L-1', ...o,
  });

  it('XML: backorder with its date, out of stock, sale price', () => {
    const xml = productFeedXml({ title: 'S', link: 'https://x.pk', items: [
      item({ availability: 'backorder', availabilityDate: '2026-11-16' }),
      item({ id: 'p2' }),
      item({ id: 'p3', inStock: true, salePrice: 2500 }),
      item({ id: 'p4', inStock: true, salePrice: 3500 }),
    ] });
    expect(xml).toContain('<g:availability>backorder</g:availability>');
    expect(xml).toContain('<g:availability_date>2026-11-16T00:00+05:00</g:availability_date>');
    expect(xml).toContain('<g:availability>out_of_stock</g:availability>');
    expect(xml).toContain('<g:sale_price>2500.00 PKR</g:sale_price>');
    expect(xml).not.toContain('3500.00 PKR');
  });

  it('backorder without a lead time gets a week', () => {
    expect(backorderDate({ availabilityDate: null }, new Date('2026-11-09T10:00:00Z'))).toBe('2026-11-16T00:00+05:00');
  });

  it('Meta CSV: header, availability words, quoting', () => {
    const csv = metaCatalogCsv([
      item({ title: 'Suit, 3 piece "new"', availability: 'backorder' }),
      item({ id: 'p2', inStock: true, salePrice: 2800, extraImages: ['https://x.pk/a.jpg', 'https://x.pk/b.jpg'] }),
      item({ id: 'p3' }),
    ]);
    const [head, a, b, c] = csv.trim().split('\n');
    expect(head.startsWith('id,title,description,availability,condition,price,sale_price,link,image_link')).toBe(true);
    expect(a).toContain('"Suit, 3 piece ""new"""');
    expect(a).toContain(',available for order,new,3000.00 PKR,,');
    expect(b).toContain(',in stock,new,3000.00 PKR,2800.00 PKR,');
    expect(b).toContain('"https://x.pk/a.jpg,https://x.pk/b.jpg"');
    expect(c).toContain(',out of stock,');
  });
});
