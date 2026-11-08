import { findAmount, findCity, findPhone, parseItemLine, parseOrderText } from './order-parse';

describe('order text parser', () => {
  it('reads Pakistani phone formats', () => {
    expect(findPhone('call 0300-1234567')).toBe('03001234567');
    expect(findPhone('+92 321 1234567')).toBe('03211234567');
    expect(findPhone('923451234567')).toBe('03451234567');
    expect(findPhone('0092 333 123 4567')).toBe('03331234567');
    expect(findPhone('house 12 street 4')).toBeNull();
  });

  it('finds cities and short forms', () => {
    expect(findCity('Gulberg III, Lahore')).toBe('Lahore');
    expect(findCity('sector G-11 isb')).toBe('Islamabad');
    expect(findCity('Rahim Yar Khan')).toBe('Rahim Yar Khan');
    expect(findCity('Main road')).toBeNull();
  });

  it('reads money', () => {
    expect(findAmount('Rs 2,500')).toBe(2500);
    expect(findAmount('COD: 3200')).toBe(3200);
    expect(findAmount('1800/-')).toBe(1800);
    expect(findAmount('no money here')).toBeNull();
  });

  it('reads item lines with quantity', () => {
    expect(parseItemLine('2 x Black Shirt')).toEqual({ text: 'Black Shirt', quantity: 2 });
    expect(parseItemLine('Lawn suit x3')).toEqual({ text: 'Lawn suit', quantity: 3 });
    expect(parseItemLine('Perfume qty 2')).toEqual({ text: 'Perfume', quantity: 2 });
    expect(parseItemLine('Kurta - 2 pcs')).toEqual({ text: 'Kurta', quantity: 2 });
    expect(parseItemLine('Watch Rs 1500')).toEqual({ text: 'Watch', quantity: 1, price: 1500 });
    expect(parseItemLine('12345')).toBeNull();
  });

  it('parses a labelled WhatsApp message', () => {
    const r = parseOrderText([
      '*Name:* Ayesha Khan',
      'Phone: 0312 3456789',
      'Address: House 22, Street 5, Block C, Johar Town',
      'City: Lahore',
      'Product: 2 x Lawn Suit',
      'COD: Rs 4,500',
    ].join('\n'));
    expect(r).toEqual({
      customerName: 'Ayesha Khan',
      phone: '03123456789',
      address: 'House 22, Street 5, Block C, Johar Town',
      city: 'Lahore',
      items: [{ text: 'Lawn Suit', quantity: 2 }],
      codAmount: 4500,
    });
  });

  it('parses an unlabelled message', () => {
    const r = parseOrderText([
      'Ali Raza',
      '+92 300 1112233',
      'Flat 4, Gulshan Block 13, near Disco Bakery Karachi',
      '1 x Perfume Oud',
      'Shirt x2',
      'Total 3500/-',
    ].join('\n'));
    expect(r.customerName).toBe('Ali Raza');
    expect(r.phone).toBe('03001112233');
    expect(r.city).toBe('Karachi');
    expect(r.address).toContain('Gulshan Block 13');
    expect(r.items).toEqual([{ text: 'Perfume Oud', quantity: 1 }, { text: 'Shirt', quantity: 2 }]);
    expect(r.codAmount).toBe(3500);
  });

  it('takes the quantity from a separate qty line', () => {
    const r = parseOrderText('Item: Hair oil\nQty: 3\nCity: isb');
    expect(r.items).toEqual([{ text: 'Hair oil', quantity: 3 }]);
    expect(r.city).toBe('Islamabad');
  });
});
