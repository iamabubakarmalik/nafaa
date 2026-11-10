import { checkKind, deriveProductKind, kindValuesFor, nearestKind } from './category-kind';

const rows = [
  { id: 'seeds', parentId: null, kind: 'SEEDS' },
  { id: 'wheat', parentId: 'seeds', kind: null },
  { id: 'hybrid', parentId: 'wheat', kind: null },
  { id: 'spray', parentId: null, kind: 'INSECTICIDE' },
  { id: 'misc', parentId: null, kind: null },
  { id: 'loopA', parentId: 'loopB', kind: null },
  { id: 'loopB', parentId: 'loopA', kind: null },
];

describe('category kind', () => {
  it('takes the nearest parent that has a kind', () => {
    expect(nearestKind(rows, 'hybrid')).toBe('SEEDS');
    expect(nearestKind(rows, 'spray')).toBe('INSECTICIDE');
  });

  it('is null when the chain has no kind, the category is unknown, or the tree loops', () => {
    expect(nearestKind(rows, 'misc')).toBeNull();
    expect(nearestKind(rows, 'nope')).toBeNull();
    expect(nearestKind(rows, null)).toBeNull();
    expect(nearestKind(rows, 'loopA')).toBeNull();
  });

  it('derives: category kind wins, else keeps the existing value, else falls back', () => {
    expect(deriveProductKind(rows, 'hybrid', 'FERTILIZER', 'OTHER')).toBe('SEEDS');
    expect(deriveProductKind(rows, 'misc', 'FERTILIZER', 'OTHER')).toBe('FERTILIZER');
    expect(deriveProductKind(rows, null, undefined, 'OTHER')).toBe('OTHER');
  });

  it('ignores a stored kind that is not in the allowed list', () => {
    expect(nearestKind([{ id: 'a', parentId: null, kind: 'BOGUS' }], 'a', ['SEEDS'])).toBeNull();
  });

  it('validates a kind against the industry list', () => {
    const agri = kindValuesFor('agri');
    expect(agri).toContain('SEEDS');
    expect(checkKind(agri, ' seeds ')).toEqual({ kind: 'SEEDS', invalid: false });
    expect(checkKind(agri, '')).toEqual({ kind: null, invalid: false });
    expect(checkKind(agri, 'BOGUS')).toEqual({ kind: null, invalid: true });
    expect(checkKind(kindValuesFor('GROCERY'), 'SEEDS')).toEqual({ kind: null, invalid: false });
  });
});
