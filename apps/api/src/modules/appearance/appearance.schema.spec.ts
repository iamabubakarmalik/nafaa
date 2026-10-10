import { sanitizeLayer } from './appearance.schema';

describe('sanitizeLayer', () => {
  it('keeps valid fields and normalises the color', () => {
    expect(sanitizeLayer({ mode: 'dark', brandColor: '#DB2777', density: 'compact', reduceMotion: true, latinFont: 'inter' }))
      .toEqual({ mode: 'dark', brandColor: '#db2777', density: 'compact', reduceMotion: true, latinFont: 'inter' });
  });

  it('drops unknown keys, bad values and nulls', () => {
    expect(sanitizeLayer({ mode: 'neon', brandColor: 'red', textScale: 'xxl', latinFont: '<script>', evil: 1, radius: null })).toEqual({});
  });

  it('accepts Google Font names and the contrast option', () => {
    expect(sanitizeLayer({ latinFont: 'gf:Open Sans', urduFont: 'gf:Amiri', contrast: 'high' }))
      .toEqual({ latinFont: 'gf:Open Sans', urduFont: 'gf:Amiri', contrast: 'high' });
    expect(sanitizeLayer({ latinFont: 'gf:Bad;Name' })).toEqual({});
  });

  it('handles non-objects', () => {
    expect(sanitizeLayer(null)).toEqual({});
    expect(sanitizeLayer('dark')).toEqual({});
  });
});
