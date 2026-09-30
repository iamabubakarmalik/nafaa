import { localInventoryTsv, productFeedXml, validGtin } from './feed';

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
});
