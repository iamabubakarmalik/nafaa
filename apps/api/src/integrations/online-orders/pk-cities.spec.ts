import { PK_CITIES, cityGroupKey, cityLabel, matchCity, sameCity } from './pk-cities';

const name = (s: string | null) => matchCity(s)?.name ?? null;

describe('pk cities: alias matching', () => {
  it('has about 150+ cities, each inside Pakistan', () => {
    expect(PK_CITIES.length).toBeGreaterThanOrEqual(150);
    for (const c of PK_CITIES) {
      expect(c.lat).toBeGreaterThan(23.5);
      expect(c.lat).toBeLessThan(37.2);
      expect(c.lng).toBeGreaterThan(60.8);
      expect(c.lng).toBeLessThan(77.9);
    }
  });

  it('reads short forms and courier station codes', () => {
    expect(name('Lhr')).toBe('Lahore');
    expect(name('LHE')).toBe('Lahore');
    expect(name('isb')).toBe('Islamabad');
    expect(name('RWP')).toBe('Rawalpindi');
    expect(name('Pindi')).toBe('Rawalpindi');
    expect(name('Khi')).toBe('Karachi');
    expect(name('FSD')).toBe('Faisalabad');
    expect(name('D.I. Khan')).toBe('Dera Ismail Khan');
    expect(name('DG Khan')).toBe('Dera Ghazi Khan');
    expect(name('RYK')).toBe('Rahim Yar Khan');
  });

  it('drops noise words and finds the city at the end of an address', () => {
    expect(name('Lahore Cantt')).toBe('Lahore');
    expect(name('KARACHI CITY')).toBe('Karachi');
    expect(name('House 12, Street 4, DHA Phase 5, Karachi')).toBe('Karachi');
    expect(name('Gulberg III - Lahore, Punjab')).toBe('Lahore');
    expect(name('Lahore Hub')).toBe('Lahore');
  });

  it('forgives one or two typos', () => {
    expect(name('Peshawer')).toBe('Peshawar');
    expect(name('faislabad')).toBe('Faisalabad');
    expect(name('Rawalpndi')).toBe('Rawalpindi');
    expect(name('Gujranwalla')).toBe('Gujranwala');
  });

  it('keeps look-alike cities apart', () => {
    expect(name('Mirpur Khas')).toBe('Mirpur Khas');
    expect(name('Mirpur AJK')).toBe('Mirpur');
    expect(name('Hyderabad')).toBe('Hyderabad');
    expect(name('Gujrat')).toBe('Gujrat');
    expect(name('Gujranwala')).toBe('Gujranwala');
  });

  it('does not take an everyday word for a city inside a longer address', () => {
    expect(name('Near water tank, Model Town')).toBeNull();
    expect(name('Tank')).toBe('Tank');
    expect(name('Shalimar Bagh')).toBeNull();
  });

  it('returns null for unknown or empty text', () => {
    expect(name('Xyzabad')).toBeNull();
    expect(name('')).toBeNull();
    expect(name(null)).toBeNull();
  });

  it('groups and compares by city', () => {
    expect(sameCity('Lhr', 'Lahore Cantt')).toBe(true);
    expect(sameCity('Karachi', 'Lahore')).toBe(false);
    expect(cityGroupKey('LHE')).toBe(cityGroupKey('lahore'));
    expect(cityLabel('  Some Village ')).toBe('Some Village');
    expect(cityLabel('isb')).toBe('Islamabad');
  });
});
