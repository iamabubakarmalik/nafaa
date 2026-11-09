import { depths, descendantIds, pathNames, treeOrder, wouldLoop } from './category-tree';

const rows = [
  { id: 'a', parentId: null, name: 'Mashroobat', sortOrder: 1 },
  { id: 'b', parentId: 'a', name: 'Cold drinks', sortOrder: 0 },
  { id: 'c', parentId: 'b', name: '1.5 litre', sortOrder: 0 },
  { id: 'd', parentId: null, name: 'Bakery', sortOrder: 0 },
  { id: 'e', parentId: 'gone', name: 'Orphan', sortOrder: 2 },
];

describe('category tree', () => {
  it('finds a category and everything under it', () => {
    expect([...descendantIds(rows, 'a')].sort()).toEqual(['a', 'b', 'c']);
    expect([...descendantIds(rows, 'd')]).toEqual(['d']);
  });

  it('builds paths and depths', () => {
    expect(pathNames(rows).get('c')).toBe('Mashroobat › Cold drinks › 1.5 litre');
    expect(depths(rows).get('c')).toBe(2);
    expect(depths(rows).get('e')).toBe(0);
  });

  it('stops a move into its own sub-category', () => {
    expect(wouldLoop(rows, 'a', 'c')).toBe(true);
    expect(wouldLoop(rows, 'c', 'a')).toBe(false);
    expect(wouldLoop(rows, 'a', null)).toBe(false);
  });

  it('lists parents before children, siblings in order, orphans at top level', () => {
    expect(treeOrder(rows).map((r) => `${r.id}${r.depth}`)).toEqual(['d0', 'a0', 'b1', 'c2', 'e0']);
  });

  it('survives a loop in bad data', () => {
    const bad = [{ id: 'x', parentId: 'y', name: 'X' }, { id: 'y', parentId: 'x', name: 'Y' }];
    expect([...descendantIds(bad, 'x')].sort()).toEqual(['x', 'y']);
    expect(pathNames(bad).get('x')).toBe('Y › X');
  });
});
